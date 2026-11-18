/* Trang Thống kê kiểu bảng màu: ô số liệu có biểu tượng + phần trăm + thanh, phân bố đời, tuổi thọ, tỉ lệ giới tính, cung hoàng đạo, con giáp.
 * Chỉ tính trên dữ liệu người xem được phép thấy (V.list); ngày sinh chỉ dùng khi hồ sơ ở mức "full". */
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, t = U.t, esc = U.esc, L = GP.lunar;
  var ZOD = [["Ma Kết", 12, 22], ["Bảo Bình", 1, 20], ["Song Ngư", 2, 19], ["Bạch Dương", 3, 21], ["Kim Ngưu", 4, 20], ["Song Tử", 5, 21], ["Cự Giải", 6, 21], ["Sư Tử", 7, 23], ["Xử Nữ", 8, 23], ["Thiên Bình", 9, 23], ["Bọ Cạp", 10, 23], ["Nhân Mã", 11, 22]];
  var ZODL = { "Ma Kết": "♑", "Bảo Bình": "♒", "Song Ngư": "♓", "Bạch Dương": "♈", "Kim Ngưu": "♉", "Song Tử": "♊", "Cự Giải": "♋", "Sư Tử": "♌", "Xử Nữ": "♍", "Thiên Bình": "♎", "Bọ Cạp": "♏", "Nhân Mã": "♐" };
  var ANI = { "Tý": "🐭", "Sửu": "🐮", "Dần": "🐯", "Mão": "🐱", "Thìn": "🐲", "Tỵ": "🐍", "Ngọ": "🐴", "Mùi": "🐐", "Thân": "🐵", "Dậu": "🐔", "Tuất": "🐶", "Hợi": "🐷" };

  /** Ô số liệu có màu. items: [{ico, n, label, pct (0-100, tùy chọn), c (1..8)}] */
  U.sumTiles = function (items, cls) {
    return '<section class="stiles ' + (cls || "") + '">' + items.map(function (x, i) {
      var tag = x.k || x.act ? "button" : "div";
      return "<" + tag + (x.act ? ' type="button" data-act="' + esc(x.act) + '" data-k="' + esc(x.k || "") + '" aria-pressed="' + (x.on ? "true" : "false") + '"' : x.k ? ' type="button" data-act="st-list" data-k="' + esc(x.k) + '"' : "") + ' class="st c' + (x.c || (i % 8) + 1) + (x.k ? " clk" : "") + '"><div class="st-top"><span class="st-ico" aria-hidden="true">' + x.ico + "</span>" + (x.pct != null ? '<span class="st-pct">' + Math.round(x.pct) + "%</span>" : "") + '</div><b class="st-n">' + esc(x.n) + '</b><span class="st-l">' + esc(x.label) + "</span>" + (x.pct != null ? '<span class="st-bar"><i style="width:' + Math.max(2, Math.min(100, x.pct)) + '%"></i></span>' : "") + "</" + tag + ">";
    }).join("") + "</section>";
  };
  function pct(a, b) { return b ? a / b * 100 : 0; }
  function bar(rows, c, fmt) {
    var max = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([1]));
    return '<ul class="bars c' + c + '">' + rows.map(function (r) { return '<li' + (r[3] ? ' class="clk"' : "") + '>' + (r[3] ? '<button type="button" class="bar-hit" data-act="st-list" data-k="' + esc(r[3]) + '" aria-label="' + esc(r[0] + ": " + r[1]) + '"></button>' : "") + '<span class="bl">' + (r[2] ? '<i aria-hidden="true">' + r[2] + "</i> " : "") + esc(r[0]) + '</span><span class="bt"><span class="bf" style="width:' + Math.round(r[1] / max * 100) + '%"></span></span><b class="bv">' + esc(fmt ? fmt(r[1]) : r[1]) + "</b></li>"; }).join("") + "</ul>";
  }
  function sec(ico, title, c, body, cls) { return '<section class="card sec c' + c + (cls ? " " + cls : "") + '"><h2><i aria-hidden="true">' + ico + "</i> " + esc(title) + "</h2>" + body + "</section>"; }
  function zodiac(m, d) { var best = "Ma Kết"; ZOD.forEach(function (r) { if (m > r[1] || (m === r[1] && d >= r[2])) best = r[0]; }); if (m === 12 && d >= 22) return "Ma Kết"; return best; }

  U.pages["thong-ke"] = function () {
    var V = U.view(), list = V.list.filter(function (p) { return p.level !== "hidden"; }), N = list.length, year = V.year;
    var S = GP.io.stats(V.list, V.spouses, V.year), by = V.by;
    var hasSp = {}, kids = {}, dau = 0, re = 0;
    V.spouses.forEach(function (s) { hasSp[s.person_id] = 1; if (s.spouse_person_id) hasSp[s.spouse_person_id] = 1; });
    list.forEach(function (p) { if (p.cha_id && by[p.cha_id]) kids[p.cha_id] = 1; if (p.me_id && by[p.me_id]) kids[p.me_id] = 1; });
    list.forEach(function (p) { if (U.isInlaw(p)) { if (p.gioi_tinh === "nu") dau++; else if (p.gioi_tinh === "nam") re++; } });
    var married = list.filter(function (p) { return hasSp[p.id]; }).length, parents = Object.keys(kids).length;
    var maxDoi = Math.max.apply(null, list.map(function (p) { return p.the_thu || 0; }).concat([0]));
    var GR = {}; U.stGroups = GR;
    GR.all = list; GR.nam = list.filter(function (p) { return p.gioi_tinh === "nam"; }); GR.nu = list.filter(function (p) { return p.gioi_tinh === "nu"; });
    GR.dau = list.filter(function (p) { return U.isInlaw(p) && p.gioi_tinh === "nu"; }); GR.re = list.filter(function (p) { return U.isInlaw(p) && p.gioi_tinh === "nam"; });
    GR.married = list.filter(function (p) { return hasSp[p.id]; }); GR.single = list.filter(function (p) { return !hasSp[p.id]; }); GR.mat = list.filter(function (p) { return p.con_song === false; }); GR.parents = list.filter(function (p) { return kids[p.id]; });
    var TL = { all: t("stat.tong_tv"), nam: t("p.nam"), nu: t("p.nu"), dau: t("stat.dau"), re: t("stat.re"), married: t("stat.da_ket_hon"), single: t("stat.chua_ket_hon"), mat: t("p.da_mat"), parents: t("stat.co_con") };
    U.stTitles = TL;
    var tiles = [
      { ico: "👥", n: N, label: t("stat.tong_tv"), pct: 100, c: 8, k: "all" }, { ico: "♂", n: S.nam, label: t("p.nam"), pct: pct(S.nam, N), c: 1, k: "nam" }, { ico: "♀", n: S.nu, label: t("p.nu"), pct: pct(S.nu, N), c: 2, k: "nu" },
      { ico: "🌸", n: dau, label: t("stat.dau"), pct: pct(dau, N), c: 3, k: "dau" }, { ico: "🌿", n: re, label: t("stat.re"), pct: pct(re, N), c: 5, k: "re" }, { ico: "💍", n: married, label: t("stat.da_ket_hon"), pct: pct(married, N), c: 4, k: "married" },
      { ico: "🏡", n: N - married, label: t("stat.chua_ket_hon"), pct: pct(N - married, N), c: 6, k: "single" }, { ico: "🕯️", n: S.mat, label: t("p.da_mat"), pct: pct(S.mat, N), c: 7, k: "mat" }, { ico: "👶", n: parents, label: t("stat.co_con"), pct: pct(parents, N), c: 3, k: "parents" }, { ico: "👑", n: maxDoi || "–", label: t("stat.doi_cao_nhat"), c: 8 }
    ];
    var dois = Object.keys(S.theoDoi).map(Number).sort(function (a, b) { return a - b; }), chis = Object.keys(S.theoChi).sort();
    var decs = Object.keys(S.theoThapNien).map(Number).sort(function (a, b) { return a - b; });
    // tuổi thọ, người sống lâu nhất, người sống cao tuổi nhất, cung hoàng đạo, con giáp
    var oldest = null, zod = {}, ani = {}, nZ = 0, nA = 0, approx = 0;
    list.forEach(function (p) {
      if (p.level !== "full" || !p.sinh || !p.sinh.nam) return;
      if (p.con_song !== false && !p.sinh.xap_xi) { var a = year - p.sinh.nam; if (a <= 110 && (!oldest || a > oldest.a)) oldest = { a: a, p: p }; }
      var s = p.sinh, lunarY = null, sm = null, sd = null;
      if (s.thang && s.ngay) {
        if (s.lich === "am") { lunarY = s.nam; var so = L.lunarToSolar(s.ngay, s.thang, s.nam, !!s.nhuan); if (so) { sm = so[1]; sd = so[0]; } }
        else { sm = s.thang; sd = s.ngay; var l = L.solarToLunar(s.ngay, s.thang, s.nam); lunarY = l.year; }
      }
      if (lunarY == null) { lunarY = s.nam; approx++; }
      var chi = L.canChiYear(lunarY).split(" ")[1]; ani[chi] = (ani[chi] || 0) + 1; nA++; (GR["ani:" + chi] = GR["ani:" + chi] || []).push(p); TL["ani:" + chi] = t("stat.con_giap") + ": " + chi;
      if (sm && sd) { var z = zodiac(sm, sd); zod[z] = (zod[z] || 0) + 1; nZ++; (GR["zod:" + z] = GR["zod:" + z] || []).push(p); TL["zod:" + z] = t("stat.cung_hd") + ": " + z; }
    });
    var avg = S.tuoiTho.tb, maxP = S.tuoiTho.maxId && by[S.tuoiTho.maxId];
    var kpi = function (lab, val, sub, c) { return '<div class="kpi c' + c + '"><span>' + esc(lab) + "</span><b>" + val + "</b>" + (sub ? "<em>" + sub + "</em>" : "") + "</div>"; };
    var life = S.tuoiTho.n ? '<div class="kpis">' + kpi(t("stat.tb"), esc(avg) + " " + esc(t("stat.tuoi")), "", 1) + kpi(t("stat.tho_nhat"), maxP ? U.link(maxP.id) : "–", esc(S.tuoiTho.max) + " " + esc(t("stat.tuoi")), 4) + kpi(t("stat.song_cao_nhat"), oldest ? U.link(oldest.p.id) : "–", oldest ? esc(oldest.a) + " " + esc(t("stat.tuoi")) : "", 5) + "</div>" +
      (decs.length ? "<h3>" + esc(t("stat.tb_thap_nien")) + "</h3>" + bar(decs.map(function (d) { var a = S.theoThapNien[d]; return [d + "s", Math.round(a.reduce(function (x, y) { return x + y; }, 0) / a.length * 10) / 10]; }), 5, function (v) { return v + " " + t("stat.tuoi"); }) : "") : '<p class="muted">' + esc(t("stat.chua_du")) + "</p>";
    var split = '<div class="split" role="img" aria-label="' + esc(t("p.nam") + " " + S.nam + ", " + t("p.nu") + " " + S.nu) + '"><span class="sm" style="flex:' + (S.nam || 0.001) + '"></span><span class="sf" style="flex:' + (S.nu || 0.001) + '"></span></div><p class="legend"><span><i class="sw m2"></i>' + esc(t("p.nam")) + " — " + S.nam + " (" + Math.round(pct(S.nam, N)) + "%)</span><span><i class=\"sw f2\"></i>" + esc(t("p.nu")) + " — " + S.nu + " (" + Math.round(pct(S.nu, N)) + "%)</span></p>";
    var html = "<h1>" + esc(t("stat.tieu_de")) + '</h1><p class="note">' + esc(t("stat.mo_ta_moi")) + "</p>" + U.sumTiles(tiles) +
      sec("👑", t("stat.phan_bo_doi"), 8, bar(dois.map(function (d) { GR["doi:" + d] = list.filter(function (p) { return (p.the_thu || 0) === d; }); TL["doi:" + d] = d ? t("p.doi") + " " + d : t("p.chua_ro"); return [d ? t("p.doi") + " " + d : t("p.chua_ro"), S.theoDoi[d], "", "doi:" + d]; }), 8) + '<p class="muted">' + esc(t("stat.chi_doi_da_gan")) + "</p>") +
      sec("⏳", t("stat.tuoi_tho"), 5, life + '<p class="muted">' + esc(t("stat.tuoi_tho_ghi_chu", { n: S.tuoiTho.n })) + "</p>") +
      sec("⚖️", t("stat.ti_le_gt"), 1, split) +
      '<div class="grid2">' +
      sec("🌿", t("l.noi_ngoai"), 3, (function () { var vis = list.filter(function (p) { return p.level !== "hidden"; }), nn = vis.filter(function (p) { return U.isNoi(p); }); GR["noi"] = nn; GR["ngoai"] = vis.filter(function (p) { return !U.isNoi(p); }); TL["noi"] = t("l.noi_toc"); TL["ngoai"] = t("l.ngoai_toc"); return bar([[t("l.noi_toc"), GR["noi"].length, "", "noi"], [t("l.ngoai_toc"), GR["ngoai"].length, "", "ngoai"]], 3); })()) +
      sec("✨", t("stat.cung_hd"), 2, nZ ? bar(Object.keys(zod).sort(function (a, b) { return zod[b] - zod[a]; }).map(function (k) { return [k, zod[k], ZODL[k], "zod:" + k]; }), 2) + '<p class="muted">' + esc(t("stat.chi_ngay_day_du", { n: nZ })) + "</p>" : '<p class="muted">' + esc(t("stat.chua_du")) + "</p>") +
      sec("🐾", t("stat.con_giap"), 4, nA ? bar(Object.keys(ani).sort(function (a, b) { return ani[b] - ani[a]; }).map(function (k) { return [k, ani[k], ANI[k], "ani:" + k]; }), 4) + '<p class="muted">' + esc(t("stat.con_giap_ghi_chu", { n: approx })) + "</p>" : '<p class="muted">' + esc(t("stat.chua_du")) + "</p>") +
      "</div>";
    return { title: t("stat.tieu_de"), html: html };
  };

  // Bấm vào ô/cột thống kê: hiện danh sách người ngay trong trang (cửa sổ nhỏ), bấm tên để xem hồ sơ
  U.acts["st-list"] = function (el) {
    var k = el.getAttribute("data-k"), ppl = (U.stGroups && U.stGroups[k]) || [], old = document.getElementById("st-pop"); if (old) old.remove();
    var rows = ppl.slice().sort(function (a, b) { var x = U.seniorKey(a), y = U.seniorKey(b); return (a.the_thu || 99) - (b.the_thu || 99) || (x < y ? -1 : x > y ? 1 : 0); }).map(function (p) { return '<li><a class="frow" href="#nguoi-' + esc(p.id) + '">' + U.av(p) + "<span><b>" + esc(U.fullName(p)) + "</b><br><small>" + esc((p.the_thu ? t("p.doi") + " " + p.the_thu + " · " : "") + U.span(p)) + "</small></span></a></li>"; }).join("");
    var d = document.createElement("div"); d.id = "st-pop"; d.className = "calpop-bg"; d.setAttribute("data-act", "st-close");
    d.innerHTML = '<div class="calpop" role="dialog" aria-modal="true" aria-label="' + esc((U.stTitles || {})[k] || "") + '"><button type="button" class="pop-x" data-act="st-close" aria-label="' + esc(t("c.dong")) + '">✕</button><h3 class="cp-t">' + esc((U.stTitles || {})[k] || "") + ' <span class="muted">(' + ppl.length + ")</span></h3>" + (rows ? '<ul class="plain stl">' + rows + "</ul>" : '<p class="muted">' + esc(t("l.khong_thay")) + "</p>") + "</div>";
    document.body.appendChild(d); var c = d.querySelector(".pop-x"); if (c) c.focus();
  };
  U.acts["st-close"] = function (el, e) { if (el.id === "st-pop" && e && e.target && e.target.closest(".calpop")) return; var d = document.getElementById("st-pop"); if (d) d.remove(); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !document.getElementById("sheet-bg")) { var d = document.getElementById("st-pop"); if (d) d.remove(); } });
  window.addEventListener("hashchange", function () { var d = document.getElementById("st-pop"); if (d) d.remove(); });
})(typeof window !== "undefined" ? window : globalThis);
