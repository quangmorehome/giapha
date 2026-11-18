// v1.44: hồ sơ người dạng bài vị/thẻ gia phả, "Hôm nay trong dòng họ" mở rộng, giao diện "Đêm thắp hương"
(function (G) {
  "use strict";
  var GP = G.GP, U = GP.ui, S = GP.store, L = GP.lunar, P = U.pages, t = U.t, esc = U.esc;

  // ---------- Giao diện 3 chế độ: sáng → tối → đêm thắp hương ----------
  U.acts.theme = function () {
    var r = document.documentElement, cur = r.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var nx = cur === "light" ? "dark" : cur === "dark" ? "huong" : "light";
    r.setAttribute("data-theme", nx); U.lsSet("gp.theme", nx);
    U.toast(t(nx === "light" ? "c.gd_sang" : nx === "dark" ? "c.gd_toi" : "c.gd_huong"));
  };

  // ---------- Hồ sơ người: bài vị ----------
  function names(list, max) {
    if (!list.length) return '<span class="muted">' + esc(t("p.chua_co_thong_tin")) + "</span>";
    var o = list.slice(0, max).map(function (x) { return x.id ? '<a href="#nguoi-' + esc(x.id) + '">' + esc(x.name) + "</a>" : "<span>" + esc(x.name) + "</span>"; }).join("");
    return o + (list.length > max ? '<em class="bv-more">+' + (list.length - max) + "</em>" : "");
  }
  function block(title, body, n) { return '<div class="bv-b"><h3>' + esc(title) + (n != null ? " <small>" + n + "</small>" : "") + '</h3><div class="bv-l">' + body + "</div></div>"; }
  var old = P.nguoi;
  P.nguoi = function (id) {
    var o = old.apply(this, arguments), V = U.view(), p = V.by[id];
    if (!o || !o.html || !p || p.level === "hidden") return o;
    var m = /<section class="card pcard[^"]*">([\s\S]*?)<\/section>/.exec(o.html); if (!m) return o;
    var inner = m[1], pbar = (/<div class="pbar">[\s\S]*?<\/div>/.exec(inner) || [""])[0], ph = /<div class="phead">([\s\S]*?)<div><h1>/.exec(inner), h1 = /<h1>([\s\S]*?)<\/h1>/.exec(inner), chips = (/<p class="chips">[\s\S]*?<\/p>/.exec(inner) || [""])[0], note = (/<p class="note">[\s\S]*?<\/p>/.exec(inner) || [""])[0];
    if (!ph || !h1) return o;
    var xb = (/<\/h1>([\s\S]*?)<p class="chips">/.exec(inner) || [0, ""])[1];
    var basic = p.level === "basic", dead = p.con_song === false, raw = S.byId(id);
    var sub = [], g = U.gen(p);
    if (g) sub.push(t("p.doi") + " " + g);
    if (!basic) { var b = p.sinh && U.dateTxt(p.sinh), d = dead && p.mat && U.dateTxt(p.mat); if (b || d) sub.push((b || "?") + (dead ? " – " + (d || "?") : "")); }
    var sps = [], kids = U.childrenAll(id).filter(function (c) { return c.level !== "hidden"; }).sort(function (a, b2) { return (a.thu_tu_con || 99) - (b2.thu_tu_con || 99); }).map(function (c) { return { id: c.id, name: U.nameOf(c.id) }; });
    U.spousesOf(id).forEach(function (s) { var q = s.spouse_person_id && V.by[s.spouse_person_id]; if (q && q.level === "hidden") return; sps.push({ id: q ? q.id : "", name: q ? U.nameOf(q.id) : U.spouseName(s) }); });
    var par = []; [p.cha_id, p.me_id].forEach(function (x) { var q = x && V.by[x]; if (q && q.level !== "hidden") par.push({ id: q.id, name: U.nameOf(q.id) }); }); if (!par.length && p.me_ten) par.push({ id: "", name: p.me_ten });
    var cls = "card pcard bv " + (dead ? "bv-dead " : "bv-live ") + (p.gioi_tinh === "nu" ? "bv-f" : "bv-m");
    var head = '<section class="' + cls + '">' + pbar.replace(/(<a class="pill" href="#so-do"><span[^>]*>[^<]*<\/span> )[^<]*/, "$1" + esc(t("bv.so_do"))).replace('<div class="pbar">', '<div class="pbar"><button type="button" class="pill hot" data-act="cay-focus" data-id="' + esc(id) + '"><span aria-hidden="true">🌳</span> ' + esc(t("bv.cay")) + "</button>") +
      '<div class="bv-tab"><i class="bv-top" aria-hidden="true"></i><div class="bv-ph">' + ph[1] + '</div><h1>' + h1[1] + "</h1>" + (sub.length ? '<p class="bv-sub">' + sub.map(esc).join(" · ") + "</p>" : "") + '<i class="bv-line" aria-hidden="true"></i>' + chips + "</div>" + (xb ? '<div class="bv-x">' + xb + "</div>" : "") + note +
      (basic ? "" : '<div class="bv-fam">' + block(t("p.cha") + " / " + t("p.me"), names(par, 3)) + block(t("p.vo_chong"), names(sps, 3), sps.length) + block(t("p.con"), names(kids, 5), kids.length) + "</div>") + "</section>";
    o.html = o.html.replace(m[0], head);
    return o;
  };

  // ---------- Hôm nay trong dòng họ ----------
  var KEYS = ["tet1", "ram", "gio_to", "vu_lan", "trung_thu", "giao_thua", "thanh_minh"], danIdx = -1;
  function pickDan(j, add) { var a = U.giaHuanList ? U.giaHuanList() : []; if (!a.length) return ""; if (danIdx < 0) danIdx = ((j % a.length) + a.length) % a.length; else danIdx = (danIdx + add + a.length) % a.length; return a[danIdx]; }
  U.acts["hn-dan"] = function () { var td = U.today(), j = L.jdFromDate(td[0], td[1], td[2]), el = document.querySelector(".hn-q"); if (el) el.textContent = pickDan(j, 1 + Math.floor(Math.random() * 3)); };
  U.todayCard = function () {
    var V = U.view(), td = U.today(), j0 = L.jdFromDate(td[0], td[1], td[2]), lu = L.solarToLunar(td[0], td[1], td[2]), now = [], soon = [], old2 = [];
    var ev = GP.io.upcoming(V.list, td, L.jdToDate(j0 + 30), { gioThieu: S.S.data.settings.gio_thang_thieu });
    ev.forEach(function (x) {
      var dj = L.jdFromDate(x.ngay[0], x.ngay[1], x.ngay[2]) - j0, when = dj === 0 ? "" : dj === 1 ? t("hn.ngay_mai") : t("hn.con_ngay", { n: dj }) + " · " + x.ngay[0] + "/" + x.ngay[1];
      if (x.loai === "le") { if (KEYS.indexOf(x.khoa) < 0) return; (dj === 0 ? now : soon).push('<li><i>🏮</i><span><b>' + esc(t("le." + x.khoa)) + "</b>" + (when ? "<small>" + esc(when) + "</small>" : "") + "</span></li>"); return; }
      var gio = x.loai === "gio", h = '<li><i>' + (gio ? "🕯️" : "🎂") + "</i><span><b>" + esc(t(gio ? "lich.gio" : "lich.sinh")) + "</b> " + U.link(x.id) + (!gio && x.tuoi ? ' <span class="muted">(' + esc(x.tuoi + "") + ")</span>" : "") + (when ? "<small>" + esc(when) + "</small>" : "") + "</span></li>";
      (dj === 0 ? now : soon).push(h);
    });
    V.list.forEach(function (p) {
      if (p.level !== "full") return;
      [["sinh", "hn.sinh"], ["mat", "hn.mat"]].forEach(function (k) {
        var d = p[k[0]]; if (!d || !d.nam || d.xap_xi || d.lich === "am" || d.thang !== td[1] || d.ngay !== td[0] || d.nam >= td[2]) return;
        if (k[0] === "mat" && p.con_song !== false) return;
        old2.push({ y: d.nam, h: "<li><i>📜</i><span>" + esc(t("hn.nam_xua", { y: d.nam })) + " " + U.link(p.id) + " " + esc(t(k[1])) + "</span></li>" });
      });
    });
    old2.sort(function (a, b) { return a.y - b.y; });
    var col = function (title, items, empty) { return '<div class="hn-c"><h3>' + esc(title) + '</h3>' + (items.length ? '<ul class="plain hnl">' + items.join("") + "</ul>" : '<p class="muted">' + esc(empty) + "</p>") + "</div>"; };
    return '<section class="card hn"><div class="hn2"><h2>🌅 ' + esc(t("hn.tieu_de")) + '</h2><p class="hn-date">' + esc(U.dmy(td) + " · " + t("d.am") + " " + lu.day + "/" + lu.month + (lu.leap ? " " + t("d.nhuan") : "")) + '</p><div class="hn-cols">' +
      col(t("hn.hom_nay"), now.concat(old2.slice(0, 3).map(function (o) { return o.h; })), t("hn.khong_co")) + '<div class="hn-c hn-q2"><h3>' + esc(t("hn.loi_dan")) + '</h3><blockquote class="hn-dan"><span class="hn-q">' + esc(pickDan(j0, 0)) + '</span><button type="button" class="btn small ghost" data-act="hn-dan">↻ ' + esc(t("hn.loi_khac")) + '</button></blockquote></div></div><p><a class="btn small" href="#thiep">🖼️ ' + esc(t("nav.thiep")) + "</a></p></div></section>";
  };
})(typeof window !== "undefined" ? window : globalThis);
