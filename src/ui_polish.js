/* Giao diện kiểu "thẻ": Trang chủ có thẻ ngày + sự kiện + thẻ tính năng màu; Hồ sơ có thẻ Sinh/Mất, Hậu duệ, Gia đình; Lịch có bộ lọc sự kiện.
 * Học bố cục từ giapha-os (ý tưởng, không sao chép mã). */
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, S = GP.store, t = U.t, esc = U.esc, P = U.pages, L = GP.lunar, pp = U.pp;
  var WDL = ["wdl.cn", "wdl.t2", "wdl.t3", "wdl.t4", "wdl.t5", "wdl.t6", "wdl.t7"];
  function wdOf(d, m, y) { return WDL[(L.jdFromDate(d, m, y) + 1) % 7]; }
  function role() { return S.S.viewer.role; }

  // ---------- Trang chủ ----------
  var FEATS = [["cay-song", "🌳", 5, "nav.cay_song", "home.cs_mo_ta"], ["gia-huan", "📜", 4, "nav.gia_huan", "home.gh_mo_ta"], ["so-do", "🕸️", 6, "nav.so_do", "home.sodo_mo_ta"], ["danh-xung", "🔗", 1, "nav.danh_xung", "home.dx_mo_ta"], ["lich", "📅", 3, "nav.lich", "home.lich_mo_ta"], ["thong-ke", "📊", 6, "nav.thong_ke", "home.tk_mo_ta"],
    ["phong-anh", "🖼️", 2, "nav.phong_anh", "home.anh_mo_ta"], ["dong-thoi-gian", "⏳", 4, "nav.dong_thoi_gian", "home.tl_mo_ta"], ["danh-nhan", "🏅", 5, "nav.danh_nhan", "home.dn_mo_ta", "w"], ["di-tich", "🏛️", 7, "nav.di_tich", "home.dt_mo_ta"], ["ban-do", "🗺️", 1, "nav.ban_do", "home.bd_mo_ta"], ["bai-viet", "📰", 5, "nav.bai_viet", "home.bv_mo_ta"], ["ung-ho", "🤝", 3, "nav.ung_ho", "home.uh_mo_ta"], ["gioi-thieu", "ℹ️", 7, "nav.gioi_thieu", "home.gt_mo_ta"]];
  var ADM = [["kiem-tra", "🔍", 4, "nav.kiem_tra", "home.kt_mo_ta", "w"], ["du-lieu", "💾", 5, "nav.du_lieu", "home.dl_mo_ta"], ["quan-tri", "👥", 3, "nav.quan_tri", "home.qt_mo_ta", "a"], ["nhat-ky", "📜", 6, "nav.nhat_ky", "home.nk_mo_ta", "a"], ["sach", "📖", 8, "nav.sach", "home.sach_mo_ta"]];
  function feat(f, i) { return '<a class="feat c' + f[2] + '" href="#' + f[0] + '" style="--i:' + i + '"><span class="fi" aria-hidden="true">' + f[1] + "</span><b>" + esc(t(f[3])) + "</b><span>" + esc(t(f[4])) + "</span></a>"; }
  // 4 ô số liệu: bấm vào hiện danh sách người ngay trong trang
  function homeTiles(V, st, doi) {
    var byGen = V.list.slice().sort(function (a, b) { return (a.the_thu || 99) - (b.the_thu || 99); });
    U.stGroups = { "h:all": V.list, "h:doi": byGen.filter(function (p) { return p.the_thu; }), "h:song": V.list.filter(function (p) { return p.con_song !== false; }), "h:mat": V.list.filter(function (p) { return p.con_song === false; }) };
    U.stTitles = { "h:all": t("stat.so_nguoi"), "h:doi": t("stat.so_doi"), "h:song": t("p.con_song"), "h:mat": t("p.da_mat") };
    return U.sumTiles([{ ico: "👥", n: st.tong, label: t("stat.so_nguoi"), c: 8, k: "h:all" }, { ico: "👑", n: doi, label: t("stat.so_doi"), c: 4, k: "h:doi" }, { ico: "🌱", n: st.song, label: t("p.con_song"), c: 5, k: "h:song" }, { ico: "🕯️", n: st.mat, label: t("p.da_mat"), c: 7, k: "h:mat" }], "compact");
  }
  P["trang-chu"] = function () {
    var V = U.view(), st = GP.io.stats(V.list, V.spouses, V.year), td = U.today(), end = L.jdToDate(L.jdFromDate(td[0], td[1], td[2]) + 30), lu = L.solarToLunar(td[0], td[1], td[2]);
    var up = GP.io.upcoming(V.list, td, end, { gioThieu: S.S.data.settings.gio_thang_thieu }).filter(function (x) { return x.loai !== "le" || ["tet1", "ram", "gio_to", "vu_lan", "trung_thu", "giao_thua"].indexOf(x.khoa) >= 0; });
    var doi = Object.keys(st.theoDoi).filter(function (k) { return +k > 0; }).length, r = role();
    var chips = up.slice(0, 6).map(function (x) {
      var ico = x.loai === "gio" ? "🕯️" : x.loai === "sinh" ? "🎂" : "🏮", nm = x.loai === "le" ? t("le." + x.khoa) : U.nameOf(x.id);
      return '<a class="uchip ' + x.loai + '" href="' + (x.loai === "le" ? "#lich" : "#nguoi-" + esc(x.id)) + '"><span aria-hidden="true">' + ico + "</span><span><b>" + esc(nm) + "</b><br><small>" + esc(U.countdown(x) + " · " + x.ngay[0] + "/" + x.ngay[1]) + "</small></span></a>";
    }).join("");
    var html = '<section class="hero"><img class="hero-logo" src="' + GP.IMG.tam + '" width="512" height="279" alt="' + esc(t("site.logo_alt")) + '"><div><h1>' + esc(t("home.tieu_de")) + "</h1><p>" + esc(t("home.mo_ta")) + "</p>" +
      '<form class="row" data-submit="home-go"><div class="grow">' + U.picker("home", null, { label: t("home.tim") }) + '</div><button class="btn primary" type="submit">' + esc(t("home.mo_ho_so")) + "</button></form></div></section>" +
      '<section class="card datecard"><div class="dc-l"><span class="dc-ico" aria-hidden="true">📅</span><div><b class="dc-d">' + esc(t(wdOf(td[0], td[1], td[2])) + ", " + (U.lang === "vi" ? "ngày " + td[0] + " tháng " + td[1] + " năm " + td[2] : U.dmy(td))) + '</b><br><span class="badge gio">' + esc(t("d.am") + ": " + lu.day + " " + t("lich.thang").toLowerCase() + " " + lu.month + (lu.leap ? " " + t("d.nhuan") : "")) + '</span> <span class="muted">' + esc(t("home.nam_can_chi", { n: L.canChiYear(lu.year) })) + '</span></div></div><div class="dc-r"><h2><i class="dot gio" aria-hidden="true"></i> ' + esc(t("home.sk30", { n: up.length })) + "</h2>" + (chips ? '<div class="uchips">' + chips + "</div>" : '<p class="muted">' + esc(t("lich.khong_co")) + '</p>') + '<p><a class="btn small" href="#lich">' + esc(t("nav.lich")) + "</a></p></div></section>" +
      '<section class="feats">' + FEATS.filter(function (f) { return !f[5] || U.okItem([0, 0, f[5]]); }).map(feat).join("") + "</section>" + homeTiles(V, st, doi);
    var adm = ADM.filter(function (f) { return !f[5] || (f[5] === "w" && (r === "admin" || r === "editor")) || (f[5] === "a" && r === "admin"); });
    if (r !== "khach") html += '<h2 class="divl"><span>' + esc(r === "member" ? t("home.cua_toi") : t("home.quan_tri_vien")) + '</span></h2><section class="feats">' + (r !== "khach" && S.S.viewer.person_id && S.byId(S.S.viewer.person_id) ? [["nguoi-" + S.S.viewer.person_id, "🙍", 1, "home.ho_so_cua_toi", "home.tk_mo_ta2"]] : []).concat(adm).concat(r !== "khach" ? [["tai-khoan", "🙍", 1, "nav.tai_khoan", "home.tk_mo_ta2"]] : []).map(feat).join("") + "</section>";
    html += U.installCard ? U.installCard() : "";
    return { title: "", html: html, after: function () { U.pk.home.cb = null; } };
  };

  // ---------- Hồ sơ ----------
  function lunarChip(d) {
    if (!d || !d.nam || !d.thang || !d.ngay || d.xap_xi) return "";
    if (d.lich === "am") { var so = L.lunarToSolar(d.ngay, d.thang, d.nam, !!d.nhuan); return so ? '<span class="chip">' + esc(t("d.duong") + " " + so[0] + "/" + so[1] + "/" + so[2]) + "</span>" : ""; }
    var l = L.solarToLunar(d.ngay, d.thang, d.nam); return '<span class="chip">' + esc(t("d.am") + " " + l.day + "/" + l.month + "/" + l.year + (l.leap ? " " + t("d.nhuan") : "")) + "</span>";
  }
  // Quản trị: ngày tháng năm sinh/mất đủ cả dương lịch lẫn âm lịch (kèm can chi), lấy từ hồ sơ gốc kể cả khi hiển thị cơ bản
  function dualDate(d) {
    if (!d || !d.nam) return null;
    var out = { duong: "", am: "" }, full = d.thang && d.ngay && !d.xap_xi, l, so;
    if (d.lich === "am") { l = { day: d.ngay, month: d.thang, year: d.nam, leap: !!d.nhuan }; so = full ? L.lunarToSolar(d.ngay, d.thang, d.nam, !!d.nhuan) : null; out.duong = so ? so[0] + "/" + so[1] + "/" + so[2] : ""; }
    else { out.duong = [d.ngay, d.thang, d.nam].filter(Boolean).join("/"); l = full ? L.solarToLunar(d.ngay, d.thang, d.nam) : null; }
    if (l) out.am = l.day + "/" + l.month + "/" + l.year + (l.leap ? " (" + t("d.nhuan") + ")" : "") + " · " + L.canChiYear(l.year);
    else if (d.lich === "am") out.am = String(d.nam) + " · " + L.canChiYear(d.nam);
    else out.am = t("p.nam_am") + " " + L.canChiYear(d.nam);
    if (d.xap_xi) out.duong = t("d.khoang") + " " + out.duong;
    return out;
  }
  /** Bảng "Ngày tháng": dương lịch và âm lịch (kèm can chi, tháng nhuận) cạnh nhau, tự quy đổi từ ngày đã nhập */
  function dateTable(raw) {
    var a = dualDate(raw.sinh), b = raw.con_song === false ? dualDate(raw.mat) : null, g = raw.con_song === false && GP.io.gioInfo(raw);
    if (!a && !b && !g) return "";
    var tr = function (k, d) { return d ? "<tr><th scope=\"row\">" + esc(t(k)) + "</th><td>" + esc(d.duong || "—") + "</td><td>" + esc(d.am || "—") + "</td></tr>" : ""; };
    var gio = g ? "<tr><th scope=\"row\">" + esc(t("lich.gio")) + "</th><td>—</td><td>" + esc(g.ngay + "/" + g.thang + (g.nhuan ? " (" + t("d.nhuan") + ")" : "")) + "</td></tr>" : "";
    return '<section class="card sec c6"><h2><i aria-hidden="true">🗓️</i> ' + esc(t("p.ngay_thang")) + '</h2><div class="tblw"><table class="dtab"><thead><tr><th></th><th scope="col">' + esc(t("d.duong")) + '</th><th scope="col">' + esc(t("d.am")) + "</th></tr></thead><tbody>" + tr("p.sinh", a) + tr("p.mat", b) + gio + "</tbody></table></div></section>";
  }
  function lifeCard(kind, p) {
    var d = kind === "sinh" ? p.sinh : p.mat, dead = p.con_song === false, txt = d ? U.dateTxt(d) : "";
    if (kind === "mat") {
      // Thẻ "Trạng thái": còn sống, hoặc đã mất kèm ngày
      if (!dead) return '<div class="lc c5"><b><i class="ld"></i>' + esc(t("p.trang_thai")) + "</b><p>" + esc(t("p.con_song")) + "</p></div>";
      return '<div class="lc c7"><b><i class="ld"></i>' + esc(t("p.trang_thai")) + "</b><p>" + esc(t("p.da_mat")) + (txt ? " · " + esc(txt) : "") + "</p>" + lunarChip(d) + "</div>";
    }
    return '<div class="lc c5"><b><i class="ld"></i>' + esc(t("p.sinh")) + "</b><p>" + (txt ? esc(txt) : '<span class="muted">' + esc(t("p.chua_ro")) + "</span>") + "</p>" + lunarChip(d) + "</div>";
  }
  function famRow(id, extra) { var q = U.view().by[id]; if (!q) return ""; return '<a class="frow" href="#nguoi-' + esc(id) + '">' + (q.level === "hidden" ? '<span class="av n">?</span><span>' + esc(t("p.da_an_ten")) + "</span>" : U.av(q) + "<span><b>" + esc(U.fullName(q)) + "</b>" + (extra ? "<br><small>" + extra + "</small>" : "") + "</span>") + "</a>"; }
  function fam(title, body) { return '<div class="fam"><h3>' + esc(title) + "</h3>" + (body || '<p class="muted">' + esc(t("p.chua_co_thong_tin")) + "</p>") + "</div>"; }
  P.nguoi = function (id) {
    var V = U.view(), p = V.by[id], back = '<p><a class="btn" href="#danh-sach">← ' + esc(t("p.ve_ds")) + "</a></p>";
    if (!p) return { title: t("p.khong_co"), html: back + '<div class="card center"><h1>' + esc(t("p.khong_co")) + "</h1></div>" };
    if (p.level === "hidden") return { title: t("p.da_an_ten"), html: back + '<div class="card center"><div class="big" aria-hidden="true">🔒</div><h1>' + esc(t("p.da_an_ten")) + "</h1><p>" + esc(t(p.da_an ? "p.da_an_mo_ta" : "p.rieng_mo_ta")) + "</p></div>" };
    var basic = p.level === "basic", raw = S.byId(id), can = raw && GP.privacy.canEdit(raw, S.S.viewer), kids = U.childrenAll(id), meId = S.S.viewer.person_id;
    var sibs = V.list.filter(function (q) { return q.id !== id && q.level !== "hidden" && ((p.cha_id && q.cha_id === p.cha_id) || (p.me_id && q.me_id === p.me_id)); }).sort(function (a, b) { return pp.sortNum(a.thu_tu_con) - pp.sortNum(b.thu_tu_con); });
    var sps = U.spousesOf(id), gk = 0, boys = kids.filter(function (c) { return c.gioi_tinh === "nam"; }).length, girls = kids.filter(function (c) { return c.gioi_tinh === "nu"; }).length;
    kids.forEach(function (c) { gk += U.childrenAll(c.id).length; });
    var photo = basic ? "" : pp.avatarImg(p);
    var ri = U.roleInfo(p);
    var head = '<section class="card pcard ' + (p.gioi_tinh === "nam" ? "c1" : p.gioi_tinh === "nu" ? "c2" : "c8") + '"><div class="pbar"><a class="pill" href="#so-do"><span aria-hidden="true">🕸️</span> ' + esc(t("p.xem_tren_cay")) + '</a><a class="pill" href="#danh-xung" data-act="kin-pick" data-id="' + esc(id) + '"><span aria-hidden="true">🔗</span> ' + esc(t("p.tra_danh_xung")) + "</a>" +
      (meId && meId !== id ? '<a class="pill" href="#danh-xung" data-act="kin-with" data-id="' + esc(id) + '">' + esc(t("p.xung_voi_toi")) + "</a>" : "") + (meId && GP.cloud && GP.cloud.st && GP.cloud.st.user ? '<a class="pill" href="#de-xuat" data-act="dx-for" data-id="' + esc(id) + '"><span aria-hidden="true">💬</span> ' + esc(t("dx.nut")) + "</a>" : "") + (can ? '<a class="pill hot" href="#sua-' + esc(id) + '"><span aria-hidden="true">✏️</span> ' + esc(t("c.sua")) + "</a>" : "") + "</div>" +
      '<div class="phead">' + (photo || U.av(p, "xl")) + "<div><h1>" + esc(U.fullName(p)) + U.nickTag(p) + '</h1><p class="chips">' + (p.da_an ? U.badge(t("p.da_an"), "warn") : "") + (p.con_song !== false ? U.badge(t("p.con_song"), "ok") : U.badge(t("p.da_mat"), "mat")) + (ri ? U.badge(ri.label, ri.kind === "tg" ? "con" : "dau") : "") + (ri && ri.kind === "tg" ? U.badge(t("vai.thong_gia"), "") : "") + (ri && ri.of ? '<span class="muted">' + esc(t("vai.cua")) + ' <a href="#nguoi-' + esc(ri.of.id) + '">' + esc(U.fullName(ri.of)) + "</a></span>" : "") + (p.the_thu ? U.badge(t("p.doi") + " " + p.the_thu, "doi") : "") + (p.thu_tu_con ? U.badge(p.thu_tu_con === 1 && p.gioi_tinh === "nam" ? t("p.con_truong") : t("p.con_thu", { n: p.thu_tu_con }), "con") : "") + (p.chi ? U.badge(p.chi, "") : "") + (basic ? U.badge(t("p.co_ban"), "") : "") + "</p></div></div>" + (basic ? '<p class="note">' + esc(t("p.chi_co_ban")) + "</p>" : "") + "</section>";
    var html = back + head;
    if (!basic) {
      html += '<section class="lcs">' + lifeCard("sinh", p) + lifeCard("mat", p) + "</section>";
      html += '<section class="card sec c1"><h2><i aria-hidden="true">🌱</i> ' + esc(t("p.hau_due")) + '</h2><div class="kpis"><div class="kpi c1"><span>' + esc(t("p.con_ruot")) + "</span><b>" + kids.length + "</b><em>♂ " + boys + " · ♀ " + girls + '</em></div><div class="kpi c3"><span>' + esc(t("p.chau")) + "</span><b>" + gk + "</b></div></div></section>";
    }
    var names = [["p.ten_thuong_goi", p.ten_thuong_goi]].concat(U.modern(p.sinh) ? [] : [["p.ten_huy", p.ten_huy], ["p.ten_thuy", p.ten_thuy], ["p.ten_han_nom", p.ten_han_nom], ["p.dao_hieu", p.dao_hieu]]);
    function tgLine(s) {
      var q = s.spouse_person_id && U.view().by[s.spouse_person_id]; if (!q || q.level === "hidden") return "";
      var fem = q.gioi_tinh === "nu", out = [];
      [[q.cha_id, fem ? "vai.bo_vo_cua" : "vai.bo_chong_cua"], [q.me_id, fem ? "vai.me_vo_cua" : "vai.me_chong_cua"]].forEach(function (x) { var w = x[0] && U.view().by[x[0]]; if (w && w.level !== "hidden") out.push(esc(t(x[1])) + ': <a href="#nguoi-' + esc(w.id) + '">' + esc(U.fullName(w)) + "</a>"); });
      return out.length ? '<p class="tgl muted">' + out.join(" · ") + "</p>" : "";
    }
    var spHtml = sps.length ? sps.map(function (s) {
      return '<div class="fgrp">' + (s.spouse_person_id ? famRow(s.spouse_person_id, esc(t("p.thu") + " " + s.thu_tu) + " · " + esc(t("tt." + (s.tinh_trang || "dang_o")))) : '<span class="frow"><span class="av n">?</span><span><b>' + esc(U.spouseName(s)) + "</b><br><small>" + esc(t("p.thu") + " " + s.thu_tu + " · " + t("tt." + (s.tinh_trang || "dang_o"))) + "</small></span></span>") + (s.ghi_chu ? ' <span class="muted">' + esc(s.ghi_chu) + "</span>" : "") + tgLine(s) +
        (can ? (s.spouse_person_id ? ' <a class="btn small" href="#sua-' + esc(s.spouse_person_id) + '">✏️ ' + esc(t("p.sua_ho_so")) + "</a>" : ' <button type="button" class="btn small primary" data-act="sp-mk" data-id="' + esc(s.id) + '">➕ ' + esc(t("p.tao_ho_so")) + "</button>") + (s._rev ? "" : ' <button type="button" class="btn small ghost" data-act="sp-edit" data-id="' + esc(s.id) + '">' + esc(t("c.sua")) + '</button>') + '<button type="button" class="btn small ghost" data-act="sp-hide" data-id="' + esc(s.id) + '">' + esc(t("c.an")) + "</button>" : "") + "</div>";
    }).join("") : "";
    var mixed = U.kidsMixed(kids, id);
    var kidHtml = kids.slice().sort(function (a, b) { return pp.sortNum(a.thu_tu_con) - pp.sortNum(b.thu_tu_con); }).map(function (c) {
      var other = c.cha_id === id ? (c.me_id ? U.nameOf(c.me_id) : c.me_ten) : (c.cha_id ? U.nameOf(c.cha_id) : ""); return famRow(c.id, (c.thu_tu_con ? esc(t("p.con_thu", { n: c.thu_tu_con })) : "") + (mixed && other ? " · " + esc(other) : ""));
    }).join("");
    var inl = [], inlOf = {};
    kids.forEach(function (c) { U.spousesOf(c.id).forEach(function (s) { var q = s.spouse_person_id && V.by[s.spouse_person_id]; if (q && q.level !== "hidden" && U.isInlaw(q) && !inlOf[q.id]) { inlOf[q.id] = c; inl.push(q); } }); });
    var inlFam = (inl.length || kids.length) ? fam(t("p.dau_re"), inl.map(function (q) { var ri = U.roleInfo(q); return famRow(q.id, esc(ri ? ri.label : "") + " · " + esc(t("vai.cua")) + " " + esc(U.nameOf(inlOf[q.id].id))); }).join("")) : "";
    var sibHtml = sibs.map(function (q) { var half = U.halfNote(p, q); return famRow(q.id, esc(half)); }).join("");
    html += '<section class="card sec c8"><h2><i aria-hidden="true">👨‍👩‍👧</i> ' + esc(t("p.gia_dinh")) + "</h2>" + fam(t("p.cha") + " / " + t("p.me"), (p.cha_id ? famRow(p.cha_id) : "") + (p.me_id ? famRow(p.me_id) : (p.me_ten ? '<span class="frow"><span class="av f">' + esc(p.me_ten.charAt(0)) + "</span><span><b>" + esc(p.me_ten) + "</b>" + (can ? '<br><button type="button" class="btn small primary" data-act="mom-mk" data-id="' + esc(id) + '">➕ ' + esc(t("p.tao_ho_so_me")) + "</button>" : "") + "</span></span>" : "")) + pp.srcBadge(p, "cha_me")) +
      fam(t("p.vo_chong"), spHtml) + fam(t("p.con"), kidHtml) + inlFam + (sibHtml ? fam(t("p.anh_chi_em"), sibHtml) : "") +
      (can ? '<div class="addrow"><a class="dash" href="#them" data-act="add-child" data-id="' + esc(id) + '">+ ' + esc(t("p.them_con")) + '</a><button type="button" class="dash" data-act="child-pick" data-id="' + esc(id) + '">+ ' + esc(t("p.chon_con_co_san")) + '</button><button type="button" class="dash" data-act="sp-new" data-id="' + esc(id) + '">+ ' + esc(t("p.them_vc")) + "</button></div>" : "") + '<div id="sp-form"></div></section>';
    var kv = names.map(function (n) { return pp.row(t(n[0]), esc(n[1])); }).join("") + pp.row(t("p.gioi_tinh"), esc(p.gioi_tinh === "nam" ? t("p.nam") : p.gioi_tinh === "nu" ? t("p.nu") : ""));
    if (!basic) kv += pp.row(t("p.nghe"), esc(p.nghe)) + pp.row(t("p.noi_sinh"), esc(p.noi_sinh));
    kv += pp.row(t("p.doi"), esc(U.gen(p) || "")) + pp.row(t("p.thu_tu_con"), esc(p.thu_tu_con));
    if (kv) html += '<section class="card sec c6"><h2><i aria-hidden="true">🪪</i> ' + esc(t("p.thong_tin")) + '</h2><dl class="kv">' + kv + "</dl></section>";
    if (!basic) {
      if (raw) html += dateTable(raw);
      html += U.khoBlock ? U.khoBlock(p.id) : "";
      if (p.con_song === false) {
        html += (U.graveCard ? U.graveCard(p, can) : "");
        html += '<section class="card sec c3"><h2><i aria-hidden="true">🕯️</i> ' + esc(t("p.ngay_gio")) + "</h2>" + pp.gioBlock(p) + (GP.io.gioInfo(p) ? '<div class="row"><button type="button" class="btn" data-act="gio-ics" data-id="' + esc(p.id) + '">📅 ' + esc(t("map.nhac_gio")) + "</button></div>" : "") + "</section>";
      }
      html += '<section class="card sec c4 story"><h2><i aria-hidden="true">📖</i> ' + esc(t("p.cau_chuyen")) + "</h2><p>" + esc(p.tieu_su || t("p.chua_co_thong_tin")).replace(/\n/g, "<br>") + "</p>" + (p.con_song === false ? '<p><button type="button" class="btn small" data-act="th-open" data-k="nguoi" data-id="' + esc(id) + '">🖼️ ' + esc(t("p.tao_the")) + "</button></p>" : "") + '<dl class="kv">' + pp.row(t("p.muc_hien_thi"), U.badge(t("hien." + (p.muc_hien_thi || "rieng_tu")), "")) +
        (p.con_song !== false || V.year - ((p.sinh && p.sinh.nam) || 0) < 18 ? pp.row(t("p.dong_y"), esc(p.da_dong_y_tre_em ? t("c.co") : t("c.chua"))) : "") + "</dl></section>";
    }
    html += '<div class="row">' + (can ? '<button type="button" class="btn" data-act="hide-person" data-id="' + esc(id) + '">' + esc(raw.da_an ? t("c.khoi_phuc") : t("c.an")) + "</button>" : "") + '<button type="button" class="btn" data-act="print">' + esc(t("c.in")) + "</button></div>";
    if (can) html += '<details class="hist-fold"><summary>' + esc(t("p.lich_su")) + "</summary>" + pp.historyList(id) + "</details>";
    return { title: U.fullName(p), html: html };
  };

  // ---------- Lịch: bộ lọc sự kiện sắp tới ----------
  var evF = { k: "all", dead: false };
  function upcomingCard() {
    var V = U.view(), td = U.today(), end = L.jdToDate(L.jdFromDate(td[0], td[1], td[2]) + 120), all = GP.io.upcoming(V.list, td, end, { gioThieu: S.S.data.settings.gio_thang_thieu }).filter(function (x) { return x.loai !== "le" || ["tet1", "ram", "gio_to", "vu_lan", "trung_thu", "giao_thua", "doan_ngo"].indexOf(x.khoa) >= 0; });
    if (!evF.dead) all = all.filter(function (x) { if (x.loai !== "sinh") return true; var q = V.by[x.id]; return !q || q.con_song !== false; });
    var items = all.filter(function (x) { return evF.k === "all" || x.loai === evF.k; });
    var pill = function (k, lab) { return '<button type="button" class="fpill' + (evF.k === k ? " on" : "") + '" data-act="ev-f" data-k="' + k + '" aria-pressed="' + (evF.k === k) + '">' + esc(lab) + "</button>"; };
    return '<section class="card" id="evc"><h2>' + esc(t("lich.sap_toi_120")) + '</h2><div class="fpills">' + pill("all", t("l.tat_ca")) + pill("sinh", t("lich.sinh")) + pill("gio", t("lich.gio")) + pill("le", t("lich.le")) + '<span class="muted fcount">' + esc(t("lich.n_su_kien", { n: items.length })) + '</span></div><label class="chk"><input type="checkbox" data-on="ev-dead"' + (evF.dead ? " checked" : "") + "> " + esc(t("lich.sinh_nguoi_mat")) + '</label><ul class="evl">' + (items.length ? items.slice(0, 30).map(function (x) { return "<li>" + U.eventLine(x) + "</li>"; }).join("") : '<li class="muted">' + esc(t("lich.khong_co")) + "</li>") + "</ul></section>";
  }
  var lichOld = P.lich;
  P.lich = function () { var o = lichOld(); var mark = '<div class="card"><h3>' + esc(t("lich.xuat")); o.html = o.html.indexOf(mark) >= 0 ? o.html.replace(mark, upcomingCard() + mark) : o.html + upcomingCard(); return o; };
  U.acts["ev-f"] = function (el) { evF.k = el.getAttribute("data-k"); U.rerender(); };
  U.ons["ev-dead"] = function (el) { evF.dead = el.checked; U.rerender(); };
  // ---------- Tạo hồ sơ cho vợ/chồng hoặc mẹ đang chỉ có tên ----------
  function splitName(full) {
    var w = String(full || "").trim().split(/\s+/).filter(Boolean); if (!w.length) return null;
    return { ho: w.length > 1 ? w[0] : "", ten_dem: w.length > 2 ? w.slice(1, -1).join(" ") : "", ten: w[w.length - 1] };
  }
  function linkBoth(a, b, tt) {
    var d = S.S.data.spouses;
    if (!d.some(function (x) { return x.person_id === b && x.spouse_person_id === a && !x.da_an; })) S.saveSpouse({ person_id: b, spouse_person_id: a, ten: "", tinh_trang: tt || "dang_o" });
  }
  U.acts["sp-mk"] = function (el) {
    var sp = S.S.data.spouses.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0]; if (!sp) return;
    var nm = splitName(sp.ten); if (!nm) { U.toast(t("f.can_vc"), true); return; }
    var owner = S.byId(sp.person_id), g = owner && owner.gioi_tinh === "nam" ? "nu" : owner && owner.gioi_tinh === "nu" ? "nam" : "";
    var r = U.attempt(function () {
      var np = S.addPerson(Object.assign({ gioi_tinh: g, con_song: sp.tinh_trang === "da_mat" ? false : true, muc_hien_thi: "rieng_tu" }, nm));
      S.saveSpouse({ id: sp.id, person_id: sp.person_id, spouse_person_id: np.id, ten: "" }); linkBoth(sp.person_id, np.id, sp.tinh_trang); return np;
    });
    if (r.ok && r.v) { U.toast(t("p.da_tao_ho_so")); location.hash = "#sua-" + r.v.id; }
  };
  U.acts["mom-mk"] = function (el) {
    var c = S.byId(el.getAttribute("data-id")); if (!c || !c.me_ten) return; var nm = splitName(c.me_ten); if (!nm) return;
    var r = U.attempt(function () {
      var np = S.addPerson(Object.assign({ gioi_tinh: "nu", con_song: true, muc_hien_thi: "rieng_tu" }, nm));
      S.updatePerson(c.id, { me_id: np.id, me_ten: "" });
      if (c.cha_id && !S.S.data.spouses.some(function (x) { return x.person_id === c.cha_id && x.spouse_person_id === np.id && !x.da_an; })) {
        var named = S.S.data.spouses.filter(function (x) { return x.person_id === c.cha_id && !x.spouse_person_id && !x.da_an && x.ten === c.me_ten; })[0];
        if (named) S.saveSpouse({ id: named.id, person_id: c.cha_id, spouse_person_id: np.id, ten: "" }); else S.saveSpouse({ person_id: c.cha_id, spouse_person_id: np.id, ten: "" });
        linkBoth(c.cha_id, np.id);
      }
      return np;
    });
    if (r.ok && r.v) { U.toast(t("p.da_tao_ho_so")); location.hash = "#sua-" + r.v.id; }
  };
})(typeof window !== "undefined" ? window : globalThis);
