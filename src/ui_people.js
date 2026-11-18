/* Trang: chủ, danh sách, cây, hồ sơ, form, lịch sử một hồ sơ. */
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, S = GP.store, t = U.t, esc = U.esc, P = U.pages;
  var BO = { q: "", doi: "", chi: "", tt: "", gt: "", chac: "", vai: "", tc: "", sx: "doi" };

  function viewTabs() { return ""; } // menu nhóm đã nằm ở thanh trên cùng
  U.viewTabs = viewTabs;
  function childrenOf(id) { return U.view().list.filter(function (c) { return c.cha_id === id || (!c.cha_id && c.me_id === id); }); }
  U.childrenOf = childrenOf;
  // Tất cả con ruột (kể cả khi cha đã được ghi): dùng cho hồ sơ của mẹ
  function childrenAll(id) { return U.view().list.filter(function (c) { return c.cha_id === id || c.me_id === id; }); }
  U.childrenAll = childrenAll;
  // Khóa vai vế: trưởng/thứ của cha mẹ trước, rồi đến mình (không theo năm sinh trừ khi thiếu thứ tự)
  function ord(p) { return p.thu_tu_con != null ? p.thu_tu_con * 1000 : 500000 + ((p.sinh && p.sinh.nam) || 0); }
  function pad(n) { n = Math.max(0, Math.round(n)); return ("00000000" + n).slice(-8); }
  var skCache = null, skView = null;
  function seniorKey(p, depth) {
    var V = U.view(); if (skView !== V) { skView = V; skCache = {}; }
    if (skCache[p.id]) return skCache[p.id];
    depth = depth || 0; var key, par = null;
    if (depth < 40) {
      if (!U.isInlaw(p) && p.cha_id && V.by[p.cha_id]) par = V.by[p.cha_id]; else if (!U.isInlaw(p) && p.me_id && V.by[p.me_id]) par = V.by[p.me_id];
      else { var sp = S.S.data.spouses.filter(function (s) { return !s.da_an && s.spouse_person_id === p.id && V.by[s.person_id]; })[0] || S.S.data.spouses.filter(function (s) { return !s.da_an && s.person_id === p.id && s.spouse_person_id && V.by[s.spouse_person_id]; })[0];
        if (sp) { var o = V.by[sp.person_id === p.id ? sp.spouse_person_id : sp.person_id]; if (o && o.id !== p.id) return (skCache[p.id] = seniorKey(o, depth + 1) + "9" + pad(sp.thu_tu || 1)); } }
    }
    key = (par ? seniorKey(par, depth + 1) : "") + "." + pad(ord(p));
    return (skCache[p.id] = key);
  }
  U.seniorKey = seniorKey;
  // Ghi chú "cùng cha khác mẹ" chỉ khi thật sự có hai mẹ (hoặc cha có từ hai vợ)
  function halfNote(p, q) {
    var sf = p.cha_id && q.cha_id === p.cha_id, sm = p.me_id && q.me_id === p.me_id;
    if (sf && !sm) return ((p.me_id && q.me_id) || U.spousesOf(p.cha_id).length > 1) ? t("note.cung_cha_khac_me") : "";
    if (sm && !sf) return ((p.cha_id && q.cha_id) || U.spousesOf(p.me_id).length > 1) ? t("note.cung_me_khac_cha") : "";
    return "";
  }
  U.halfNote = halfNote;
  function kidsMixed(kids, id) {
    var seen = {}, n = 0; kids.forEach(function (c) { var o = c.cha_id === id ? (c.me_id || c.me_ten || "") : (c.cha_id || ""); if (o && !seen[o]) { seen[o] = 1; n++; } });
    return n > 1 || U.spousesOf(id).length > 1;
  }
  U.kidsMixed = kidsMixed;
  // Vợ/chồng của một người, tính cả hai chiều (hồ sơ vợ cũng thấy chồng, dù dòng được nhập từ phía chồng)
  function spousesOf(id) {
    var rows = S.S.data.spouses.filter(function (s) { return !s.da_an; }), out = [], seen = {};
    rows.forEach(function (s) { if (s.person_id === id) { out.push(s); if (s.spouse_person_id) seen[s.spouse_person_id] = 1; } });
    rows.forEach(function (s) { if (s.spouse_person_id === id && s.person_id !== id && !seen[s.person_id]) { seen[s.person_id] = 1; out.push(Object.assign({}, s, { person_id: id, spouse_person_id: s.person_id, ten: "", _rev: true })); } });
    return out.sort(function (a, b) { return (a.thu_tu || 0) - (b.thu_tu || 0); });
  }
  U.spousesOf = spousesOf;
  // Con cháu theo GIA ĐÌNH: con của người này + con của (các) vợ/chồng. Nhờ vậy con của con gái nằm chung nhà với con rể.
  function famKids(id) {
    var V = U.view(), ids = [id], out = [], seen = {};
    spousesOf(id).forEach(function (s) { if (s.spouse_person_id && V.by[s.spouse_person_id] && ids.indexOf(s.spouse_person_id) < 0) ids.push(s.spouse_person_id); });
    seen[id] = 1; ids.forEach(function (i) { seen[i] = 1; });
    ids.forEach(function (i) { childrenAll(i).forEach(function (c) { if (!seen[c.id]) { seen[c.id] = 1; out.push(c); } }); });
    return out;
  }
  U.famKids = famKids;
  // Mọi hậu duệ (kèm vợ/chồng của từng người) của một người — dùng để dời đời khi Quản trị sửa đời
  U.descIds = function (id) {
    var out = [], seen = {}; seen[id] = 1;
    (function walk(i) {
      famKids(i).forEach(function (c) { if (seen[c.id]) return; seen[c.id] = 1; out.push(c.id); spousesOf(c.id).forEach(function (sp) { var q = sp.spouse_person_id; if (q && !seen[q]) { seen[q] = 1; out.push(q); } }); walk(c.id); });
    })(id);
    return out;
  };
  // Đời của một người; dâu/rể chưa ghi đời thì lấy đời của chồng/vợ để luôn đứng cạnh nhau
  // Thứ tự ưu tiên: đời ghi trong hồ sơ → (người trong họ) đời cha/mẹ + 1 → (dâu/rể) đời vợ/chồng. Nhờ vậy nhập Excel thiếu cột Đời vẫn nối được các đời.
  var genCache = null, genView = null;
  function gen(p, depth) {
    if (!p) return 0;
    if (p.the_thu) return p.the_thu;
    var V = U.view(); if (genView !== V) { genView = V; genCache = {}; }
    if (p.id in genCache) return genCache[p.id];
    depth = depth || 0; if (depth > 60) return 0; genCache[p.id] = 0; // chặn vòng lặp
    var g = 0, byPar = function () { var par = (p.cha_id && V.by[p.cha_id]) || (p.me_id && V.by[p.me_id]); if (par) { var pg = gen(par, depth + 1); if (pg) g = pg + 1; } },
      bySp = function () { spousesOf(p.id).forEach(function (s) { var q = s.spouse_person_id && V.by[s.spouse_person_id]; if (q && !g) { var qg = gen(q, depth + 1); if (qg) g = qg; } }); };
    if (p.vai === "dau_re" || (p.vai !== "ruot" && isInlaw(p))) { bySp(); if (!g) byPar(); } else { byPar(); if (!g) bySp(); }
    return (genCache[p.id] = g);
  }
  U.gen = gen;
  // Nội tộc: người mang dòng họ (con trai, con gái trong họ và cháu nội). Ngoại tộc: dâu, rể, thông gia, cháu ngoại (con của con gái/ dâu rể).
  var noiCache = null, noiView = null;
  function isNoi(p, depth) {
    var V = U.view(); if (noiView !== V) { noiView = V; noiCache = {}; }
    if (p.id in noiCache) return noiCache[p.id];
    depth = depth || 0; var r;
    if (p.vai === "ruot") r = true; else if (p.vai === "dau_re" || p.vai === "thong_gia") r = false;
    else if (isInlaw(p) || isTG(p)) r = false;
    else if (depth > 40) r = true;
    else if (p.cha_id && V.by[p.cha_id]) r = isNoi(V.by[p.cha_id], depth + 1);
    else if (p.me_id && V.by[p.me_id]) {
      var m = V.by[p.me_id], hus = spousesOf(m.id).map(function (s) { return V.by[s.spouse_person_id]; }).filter(function (q) { return q && q.gioi_tinh === "nam"; })[0];
      r = hus ? isNoi(hus, depth + 1) && !isInlaw(hus) : false;
    } else { tpInit(); r = !(tpTop[p.id] && tpTop[p.id] !== tpMain && tpTied[tpTop[p.id]]); }
    return (noiCache[p.id] = r);
  }
  U.isNoi = isNoi;
  // ---------- Vai trò trong họ: ruột / dâu–rể / thông gia ----------
  function parentInfo(p) {
    var V = U.view(); var par = function (i) { return i && !(V.by[i] && V.by[i].vai === "thong_gia"); };
    return !!(par(p.cha_id) || par(p.me_id) || p.me_ten);
  }
  // Gốc của dòng họ = tổ tiên cao nhất có nhiều con cháu nhất; dâu/rể = người có vợ/chồng thuộc dòng họ nhưng tổ tiên của mình ở nơi khác
  var tpView = null, tpTop = null, tpMain = null, tpTied = null;
  function tpInit() {
    var V = U.view(); if (tpView === V) return; tpView = V; tpTop = {}; tpTied = {};
    var kids = {}; V.list.forEach(function (p) { [p.cha_id, p.me_id].forEach(function (a) { if (a && V.by[a]) (kids[a] = kids[a] || []).push(p.id); }); });
    function top(id, d) { if (tpTop[id]) return tpTop[id]; var p = V.by[id], up = p && ((p.cha_id && V.by[p.cha_id]) ? p.cha_id : (p.me_id && V.by[p.me_id]) ? p.me_id : null); return (tpTop[id] = (!up || d > 60) ? id : top(up, (d || 0) + 1)); }
    V.list.forEach(function (p) { top(p.id, 0); });
    var cnt = {}; V.list.forEach(function (p) { cnt[tpTop[p.id]] = (cnt[tpTop[p.id]] || 0) + 1; });
    tpMain = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a] || (a < b ? -1 : 1); })[0] || null;
    V.list.forEach(function (p) { if (tpTop[p.id] === tpMain) return; spousesOf(p.id).forEach(function (s) { if (s.spouse_person_id && tpTop[s.spouse_person_id] === tpMain) tpTied[tpTop[p.id]] = true; }); });
  }
  function isInlaw(p) {
    if (p.vai === "dau_re") return true; if (p.vai === "ruot" || p.vai === "thong_gia") return false;
    tpInit(); if (tpTop[p.id] && tpTop[p.id] !== tpMain && spousesOf(p.id).some(function (s) { return s.spouse_person_id && tpTop[s.spouse_person_id] === tpMain; })) return true;
    if (parentInfo(p)) return false;
    var V = U.view(), sps = spousesOf(p.id).filter(function (s) { return s.spouse_person_id && V.by[s.spouse_person_id]; });
    return sps.length > 0 && sps.every(function (s) { return parentInfo(V.by[s.spouse_person_id]); });
  }
  function isTG(p) { return p.vai === "thong_gia"; }
  U.isInlaw = isInlaw; U.isTG = isTG;
  // thứ hạng của người trong anh chị em cùng giới (trưởng / thứ n / út)
  function rankAmong(p) {
    var V = U.view(), sibs = V.list.filter(function (q) { return q.gioi_tinh === p.gioi_tinh && ((p.cha_id && q.cha_id === p.cha_id) || (p.me_id && q.me_id === p.me_id)) && !isInlaw(q); });
    if (sibs.indexOf(p) < 0) sibs.push(p);
    sibs.sort(function (a, b) { return (a.thu_tu_con != null ? a.thu_tu_con : 999) - (b.thu_tu_con != null ? b.thu_tu_con : 999) || ((a.sinh && a.sinh.nam) || 9999) - ((b.sinh && b.sinh.nam) || 9999); });
    return { r: sibs.indexOf(p) + 1, n: sibs.length };
  }
  // Nhãn vai trò: "Dâu trưởng", "Rể út", "Bố vợ của …", "Mẹ chồng của …"
  function roleInfo(p) {
    var V = U.view();
    if (isInlaw(p)) {
      var sp = spousesOf(p.id).map(function (s) { return V.by[s.spouse_person_id]; }).filter(Boolean)[0], dau = p.gioi_tinh === "nu", base = dau ? t("vai.dau") : t("vai.re");
      if (!sp) return { kind: dau ? "dau" : "re", label: base };
      var rk = rankAmong(sp), lab = rk.n < 2 ? base : rk.r === 1 ? base + " " + t("vai.truong") : rk.r === rk.n ? base + " " + t("vai.ut") : base + " " + t("vai.thu", { n: rk.r });
      return { kind: dau ? "dau" : "re", label: lab };
    }
    if (isTG(p)) {
      var kids = U.childrenAll(p.id).filter(isInlaw), c = kids[0], who = c && spousesOf(c.id).map(function (s) { return V.by[s.spouse_person_id]; }).filter(Boolean)[0];
      if (!c || !who) return { kind: "tg", label: t("vai.thong_gia") };
      var lab2 = (p.gioi_tinh === "nam" ? t("vai.bo") : t("vai.me")) + " " + (c.gioi_tinh === "nu" ? t("vai.vo") : t("vai.chong"));
      return { kind: "tg", label: lab2, of: who, group: t("vai.thong_gia") };
    }
    return null;
  }
  U.roleInfo = roleInfo;
  function spouseName(s) { return s.spouse_person_id ? U.nameOf(s.spouse_person_id) : (s.ten || t("p.chua_ro")); }
  U.spouseName = spouseName;
  function sortNum(x) { return x == null ? 99999 : x; }

  // ---------- Trang chủ ----------
  P["trang-chu"] = function () {
    var V = U.view(), st = GP.io.stats(V.list, V.spouses, V.year), td = U.today(), end = GP.lunar.jdToDate(GP.lunar.jdFromDate(td[0], td[1], td[2]) + 30);
    var up = GP.io.upcoming(V.list, td, end, { gioThieu: S.S.data.settings.gio_thang_thieu }).filter(function (x) { return x.loai !== "le" || ["tet1", "mung1", "ram", "gio_to", "vu_lan", "trung_thu", "giao_thua"].indexOf(x.khoa) >= 0; }).slice(0, 8);
    var doi = Object.keys(st.theoDoi).filter(function (k) { return +k > 0; }).length;
    var html = '<section class="hero"><img class="hero-logo" src="' + GP.IMG.tam + '" width="512" height="279" alt="' + esc(t("site.logo_alt")) + '"><div><h1>' + esc(t("home.tieu_de")) + "</h1><p>" + esc(t("home.mo_ta")) + "</p>" +
      '<form class="row" data-submit="home-go"><div class="grow">' + U.picker("home", null, { label: t("home.tim") }) + '</div><button class="btn primary" type="submit">' + esc(t("home.mo_ho_so")) + "</button></form></div></section>" +
      '<section class="tiles" aria-label="' + esc(t("stat.tong_quan")) + '"><div class="tile"><b>' + st.tong + "</b><span>" + esc(t("stat.so_nguoi")) + '</span></div><div class="tile"><b>' + doi + "</b><span>" + esc(t("stat.so_doi")) + '</span></div><div class="tile"><b>' + st.song + "</b><span>" + esc(t("p.con_song")) + '</span></div><div class="tile"><b>' + st.an + "</b><span>" + esc(t("stat.ho_so_an")) + "</span></div></section>" +
      '<section class="card"><h2>' + esc(t("home.sap_toi")) + "</h2>" + eventList(up) + '<p><a class="btn" href="#lich">' + esc(t("nav.lich")) + "</a></p></section>" +
      '<section class="grid2"><a class="card linkcard" href="#so-do"><h3>' + esc(t("nav.so_do")) + "</h3><p>" + esc(t("home.sodo_mo_ta")) + '</p></a><a class="card linkcard" href="#danh-xung"><h3>' + esc(t("nav.danh_xung")) + "</h3><p>" + esc(t("home.dx_mo_ta")) + "</p></a></section>";
    return { title: "", html: html, after: function () { U.pk.home.cb = null; } };
  };
  U.ons["home-go"] = function () { var id = U.pkVal("home"); if (id) location.hash = "#nguoi-" + id; else U.toast(t("home.chon_truoc"), true); };

  function eventList(items) {
    if (!items.length) return '<p class="muted">' + esc(t("lich.khong_co")) + "</p>";
    return '<ul class="evl">' + items.map(function (x) { return "<li>" + eventLine(x) + "</li>"; }).join("") + "</ul>";
  }
  function countdown(x) {
    var td = U.today(), n = GP.lunar.jdFromDate(x.ngay[0], x.ngay[1], x.ngay[2]) - GP.lunar.jdFromDate(td[0], td[1], td[2]);
    return n === 0 ? t("lich.hom_nay") : n < 0 ? "" : n < 14 ? t("lich.con_ngay", { n: n }) : n < 60 ? t("lich.con_tuan", { n: Math.round(n / 7) }) : t("lich.con_thang", { n: Math.round(n / 30) });
  }
  U.countdown = countdown;
  function eventLine(x) {
    var cd = countdown(x), ico = x.loai === "gio" ? "🕯️" : x.loai === "sinh" ? "🎂" : "🏮", wd = ["wdl.cn", "wdl.t2", "wdl.t3", "wdl.t4", "wdl.t5", "wdl.t6", "wdl.t7"][(GP.lunar.jdFromDate(x.ngay[0], x.ngay[1], x.ngay[2]) + 1) % 7];
    var who = x.loai === "le" ? esc(t("le." + x.khoa)) : U.link(x.id);
    var sub = (x.loai === "gio" ? esc(U.lunarTxt(x.lunar)) + (x.dieuChinh ? "; " + esc(t("lich.thang_thieu")) : "") + (x.suyRa ? "; " + esc(t("lich.suy_ra")) : "") : x.loai === "sinh" ? (x.tuoi ? esc(t("lich.tuoi", { n: x.tuoi })) : "") : x.lunar ? esc(U.lunarTxt(x.lunar)) : "");
    return '<span class="evc ' + x.loai + '"><span class="evi" aria-hidden="true">' + ico + '</span><span class="evb"><b>' + who + "</b> " + U.badge(t(x.loai === "gio" ? "lich.gio" : x.loai === "sinh" ? "lich.sinh" : "lich.le"), x.loai) + '<br><time class="evd">' + esc(t(wd) + ", " + U.dmy(x.ngay)) + "</time>" + (sub ? ' <span class="muted">· ' + sub + "</span>" : "") + "</span>" + (cd ? '<span class="cdn">⏱ ' + esc(cd) + "</span>" : "") + "</span>";
  }
  function eventLineOld(x) {
    var d = '<time class="evd">' + esc(U.dmy(x.ngay)) + "</time> ", body;
    if (x.loai === "gio") body = U.badge(t("lich.gio"), "gio") + " " + U.link(x.id) + ' <span class="muted">(' + esc(U.lunarTxt(x.lunar)) + (x.dieuChinh ? "; " + esc(t("lich.thang_thieu")) : "") + (x.suyRa ? "; " + esc(t("lich.suy_ra")) : "") + ")</span>";
    else if (x.loai === "sinh") body = U.badge(t("lich.sinh"), "sinh") + " " + U.link(x.id) + (x.tuoi ? ' <span class="muted">(' + esc(t("lich.tuoi", { n: x.tuoi })) + ")</span>" : "");
    else body = U.badge(t("lich.le"), "le") + " " + esc(t("le." + x.khoa)) + (x.lunar ? ' <span class="muted">(' + esc(U.lunarTxt(x.lunar)) + ")</span>" : "");
    return d + body;
  }
  U.eventLine = eventLine; U.eventList = eventList; U.pp = { row: row, srcBadge: srcBadge, gioBlock: gioBlock, sortNum: sortNum, historyList: function (id) { return historyList(id); }, avatarImg: function (p) { return avatar(p); } };

  // ---------- Danh sách ----------
  function filtered() {
    var V = U.view(), q = GP.checks.norm(BO.q.trim());
    var ds = V.list.filter(function (p) {
      if (q && (p.level === "hidden" || GP.checks.norm(U.fullName(p) + " " + (p.ten_thuong_goi || "") + " " + (p.ten_huy || "")).indexOf(q) < 0)) return false;
      if (BO.doi && String(gen(p) || "") !== BO.doi) return false;
      if (BO.tc && (p.level === "hidden" ? false : (isNoi(p) ? "noi" : "ngoai") !== BO.tc)) return false;
      if (BO.tt === "song" && p.con_song === false) return false;
      if (BO.tt === "mat" && p.con_song !== false) return false;
      if (BO.gt && p.gioi_tinh !== BO.gt) return false;
      if (BO.chac && p.muc_chac_chan !== BO.chac) return false;
      if (BO.vai) { var inl = isInlaw(p), tg = isTG(p); if (BO.vai === "ruot" ? (inl || tg) : BO.vai === "dau" ? !(inl && p.gioi_tinh === "nu") : BO.vai === "re" ? !(inl && p.gioi_tinh === "nam") : !tg) return false; }
      return true;
    });
    var by = GP.checks.norm;
    ds.sort(function (a, b) {
      if (a.level === "hidden" || b.level === "hidden") return (a.level === "hidden" ? 1 : 0) - (b.level === "hidden" ? 1 : 0);
      if (BO.sx === "ten") return by(a.ten).localeCompare(by(b.ten)) || sortNum(a.the_thu) - sortNum(b.the_thu);
      if (BO.sx === "sinh") return sortNum(a.sinh && a.sinh.nam) - sortNum(b.sinh && b.sinh.nam);
      if (BO.sx === "mat") return sortNum(a.mat && a.mat.nam) - sortNum(b.mat && b.mat.nam);
      var ka = seniorKey(a), kb = seniorKey(b);
      return sortNum(gen(a)) - sortNum(gen(b)) || (ka < kb ? -1 : ka > kb ? 1 : 0);
    });
    return ds;
  }
  U.listFiltered = filtered;
  // Khóa gia đình: con ruột theo cha (hoặc mẹ); dâu/rể theo nhà vợ/chồng; thông gia riêng
  function famKey(p) {
    var V = U.view(); if (isTG(p)) return "tg"; var q = p;
    if (isInlaw(p)) { var sp = spousesOf(p.id).map(function (s) { return V.by[s.spouse_person_id]; }).filter(Boolean)[0]; if (sp) q = sp; }
    var f = q.cha_id && V.by[q.cha_id] ? q.cha_id : "", m = q.me_id && V.by[q.me_id] ? q.me_id : "";
    return f || m || "root";
  }
  function famHead(k, n) {
    var V = U.view(), add = "", title;
    if (k === "tg") title = t("vai.thong_gia"); else if (k === "root") title = t("l.goc_chua_cha_me");
    else { var sp = spousesOf(k).map(spouseName).filter(Boolean); title = t("l.gia_dinh") + " " + U.nameOf(k) + (sp.length ? " — " + sp.join(", ") : ""); }
    if (U.canWrite()) add = k === "tg" || k === "root" ? '<a class="btn small" href="#them" data-act="new-blank">+ ' + esc(t("l.them_tv")) + "</a>" : '<a class="btn small" href="#them" data-act="add-child" data-id="' + esc(k) + '">+ ' + esc(t("l.them_tv")) + "</a>";
    return '<li class="gfam"><span class="gft">' + esc(title) + ' <span class="muted">· ' + n + "</span></span>" + add + "</li>";
  }
  function personRow(p) {
    if (p.level === "hidden") return '<li><a class="prow hid" href="#nguoi-' + esc(p.id) + '"><span class="pn">' + esc(t("p.da_an_ten")) + "</span></a></li>";
    var meta = [U.span(p)].filter(Boolean).join(" · ");
    var ri = U.roleInfo(p);
    return '<li><a class="prow" href="#nguoi-' + esc(p.id) + '">' + U.av(p) + '<span class="pbody"><span class="pn">' + esc(U.fullName(p)) + U.nickTag(p) + (p.da_an ? " " + U.badge(t("p.da_an"), "warn") : "") + '</span><span class="muted pm">' + esc(meta) + '</span><span class="chips">' +
      (ri ? U.badge(ri.label, ri.kind === "tg" ? "con" : "dau") : "") + (gen(p) ? U.badge(t("p.doi") + " " + gen(p), "doi") : "") + (p.thu_tu_con ? U.badge(p.thu_tu_con === 1 && p.gioi_tinh === "nam" ? t("p.con_truong") : t("p.con_thu", { n: p.thu_tu_con }), "con") : "") +
      (p.con_song === false ? U.badge(t("p.da_mat"), "mat") : U.badge(t("p.con_song"), "ok")) + (p.level === "basic" ? U.badge(t("p.co_ban"), "") : "") + "</span></span></a>" + (U.isAdmin() ? '<button type="button" class="rowdel" data-act="row-del" data-id="' + esc(p.id) + '" aria-label="' + esc(t("c.xoa") + " " + U.fullName(p)) + '" title="' + esc(t("c.xoa")) + '">🗑</button>' : "") + "</li>";
  }
  // Đưa vợ/chồng đứng ngay sau người bạn đời của họ (cùng nhóm), giữ nguyên thứ tự trưởng/thứ
  function coupled(rows) {
    var in_ = {}, done = {}, out = []; rows.forEach(function (p) { in_[p.id] = p; });
    rows.forEach(function (p) {
      if (done[p.id]) return; done[p.id] = 1; out.push(p);
      spousesOf(p.id).forEach(function (s) { var q = s.spouse_person_id && in_[s.spouse_person_id]; if (q && !done[q.id]) { done[q.id] = 1; out.push(q); } });
    });
    return out;
  }
  function drawGroup(rows, grp) {
    var out = "", cnt = {}, byD = [], idx = {};
    rows.forEach(function (p) { var d = grp && p.level !== "hidden" ? String(gen(p) || 0) : "x"; if (!(d in idx)) { idx[d] = byD.length; byD.push({ d: d, rows: [] }); } byD[idx[d]].rows.push(p); });
    byD.forEach(function (g) {
      if (grp && g.d !== "x") out += '<li class="gdiv"><span>' + esc(g.d !== "0" ? t("p.doi") + " " + g.d : t("sach.chua_doi")) + "</span></li>";
      var fam = {}, order = []; g.rows.forEach(function (p) { var k = grp && g.d !== "x" ? famKey(p) : "_"; if (!fam[k]) { fam[k] = []; order.push(k); } fam[k].push(p); });
      order.forEach(function (k) { var rs = grp ? coupled(fam[k]) : fam[k]; if (k !== "_") out += famHead(k, rs.length); rs.forEach(function (p) { out += personRow(p); }); });
    });
    return out;
  }
  function secHead(k, n) { return '<li class="gsec ' + k + '"><span>' + esc(t(k === "noi" ? "l.noi_toc" : "l.ngoai_toc")) + ' <b>· ' + n + "</b></span><small>" + esc(t(k === "noi" ? "l.noi_toc_mo_ta" : "l.ngoai_toc_mo_ta")) + "</small></li>"; }
  function drawList() {
    var ds = filtered(); $("#kq-t").textContent = t("l.ket_qua", { n: ds.length });
    var V = U.view(); U.hasSpouse = {}; V.spouses.forEach(function (s) { U.hasSpouse[s.person_id] = 1; if (s.spouse_person_id) U.hasSpouse[s.spouse_person_id] = 1; });
    var grp = BO.sx === "doi", out = "";
    if (grp) {
      var vis = ds.filter(function (p) { return p.level !== "hidden"; }), hid = ds.filter(function (p) { return p.level === "hidden"; });
      var noi = vis.filter(function (p) { return isNoi(p); }), ngo = vis.filter(function (p) { return !isNoi(p); });
      if (!BO.tc) out += drawGroup(vis, true); // Tất cả: xếp theo đời và gia đình, không tách nội/ngoại
      else {
        if (noi.length) out += secHead("noi", noi.length) + drawGroup(noi, true);
        if (ngo.length) out += secHead("ngoai", ngo.length) + drawGroup(ngo, true);
      }
      if (hid.length) out += drawGroup(hid, false);
    } else out = drawGroup(ds, false);
    $("#kq").innerHTML = ds.length ? out : "<li class=\"muted\">" + esc(t("l.khong_thay")) + "</li>";
  }
  function $(s) { return document.querySelector(s); }
  function opt(v, label, sel) { return '<option value="' + esc(v) + '"' + (String(sel) === String(v) ? " selected" : "") + ">" + esc(label) + "</option>"; }
  P["danh-sach"] = function () {
    var V = U.view(), doi = Array.from(new Set(V.list.map(function (p) { return gen(p); }).filter(Boolean))).sort(function (a, b) { return a - b; });
    var sel = function (id, lab, opts) { return '<div><label class="lab" for="' + id + '">' + esc(lab) + '</label><select id="' + id + '" data-on="lf">' + opts + "</select></div>"; };
    var all = opt("", t("l.tat_ca"), ""), nAct = ["doi", "tt", "gt", "vai"].filter(function (k) { return BO[k]; }).length;
    var lv = V.list.filter(function (p) { return p.level !== "hidden"; }), nn = lv.length, cn = function (f) { return lv.filter(f).length; };
    var html = "<h1>" + esc(t("l.tieu_de")) + "</h1>" + viewTabs("danh-sach") + (function () {
      var F = { "l:all": function () { return true; }, "l:nam": function (p) { return p.gioi_tinh === "nam"; }, "l:nu": function (p) { return p.gioi_tinh === "nu"; }, "l:song": function (p) { return p.con_song !== false; }, "l:mat": function (p) { return p.con_song === false; } };
      U.stGroups = {}; Object.keys(F).forEach(function (k) { U.stGroups[k] = lv.filter(F[k]); });
      U.stTitles = { "l:all": t("stat.tong_tv"), "l:nam": t("p.nam"), "l:nu": t("p.nu"), "l:song": t("p.con_song"), "l:mat": t("p.da_mat") };
      var pc = function (k) { return nn ? U.stGroups[k].length / nn * 100 : 0; };
      return U.sumTiles([{ ico: "👥", n: nn, label: t("stat.tong_tv"), pct: 100, c: 8, k: "l:all" }, { ico: "♂", n: U.stGroups["l:nam"].length, label: t("p.nam"), pct: pc("l:nam"), c: 1, k: "l:nam" }, { ico: "♀", n: U.stGroups["l:nu"].length, label: t("p.nu"), pct: pc("l:nu"), c: 2, k: "l:nu" }, { ico: "🌱", n: U.stGroups["l:song"].length, label: t("p.con_song"), pct: pc("l:song"), c: 5, k: "l:song" }, { ico: "🕯️", n: U.stGroups["l:mat"].length, label: t("p.da_mat"), pct: pc("l:mat"), c: 7, k: "l:mat" }], "compact");
    })() + '<div class="card"><label class="lab" for="o-tim">' + esc(t("l.tim")) + '</label><input class="inp" id="o-tim" type="search" autocomplete="off" placeholder="' + esc(t("l.tim_mau")) + '" value="' + esc(BO.q) + '" data-oninput="lq">' +
      '<div class="lrow"><div class="seg" role="group" aria-label="' + esc(t("l.noi_ngoai")) + '">' + [["", "l.tat_ca"], ["noi", "l.noi_toc"], ["ngoai", "l.ngoai_toc"]].map(function (x) { return '<button type="button" class="segb' + (BO.tc === x[0] ? " on" : "") + '" data-act="tc" data-k="' + x[0] + '" aria-pressed="' + (BO.tc === x[0]) + '">' + esc(t(x[1])) + "</button>"; }).join("") + "</div>" +
      sel("f-sx", t("l.sap_xep"), opt("doi", t("p.doi"), BO.sx) + opt("ten", t("l.ten"), BO.sx) + opt("sinh", t("l.nam_sinh"), BO.sx) + opt("mat", t("l.nam_mat"), BO.sx)) + "</div>" +
      '<details class="morefl"' + (nAct ? " open" : "") + "><summary>" + esc(t("l.bo_loc")) + (nAct ? ' <span class="nbadge" id="fl-n">' + nAct + "</span>" : "") + '</summary><div class="filters">' + sel("f-doi", t("p.doi"), all + doi.map(function (d) { return opt(d, t("p.doi") + " " + d, BO.doi); }).join("")) +
      sel("f-tt", t("l.tinh_trang"), all + opt("song", t("p.con_song"), BO.tt) + opt("mat", t("p.da_mat"), BO.tt)) + sel("f-gt", t("p.gioi_tinh"), all + opt("nam", t("p.nam"), BO.gt) + opt("nu", t("p.nu"), BO.gt)) + sel("f-vai", t("vai.vai_tro"), all + opt("ruot", t("vai.ruot"), BO.vai) + opt("dau", t("vai.dau"), BO.vai) + opt("re", t("vai.re"), BO.vai) + opt("tg", t("vai.thong_gia"), BO.vai)) +
      '</div><p><button type="button" class="btn small ghost" data-act="lf-reset">' + esc(t("flt.bo_loc")) + "</button></p></details></div>" +
      (U.canWrite() ? '<p><a class="btn primary" href="#them" data-act="new-blank">+ ' + esc(t("f.them_nguoi")) + "</a></p>" : "") + '<h2 id="kq-t"></h2><ul class="plist" id="kq" aria-labelledby="kq-t"></ul>';
    return { title: t("l.tieu_de"), html: html, after: drawList };
  };
  U.ons.lq = function (el) { BO.q = el.value; drawList(); };
  U.ons.lf = function (el) { var m = { "f-tc": "tc", "f-doi": "doi", "f-tt": "tt", "f-gt": "gt", "f-vai": "vai", "f-chac": "chac", "f-sx": "sx" }; BO[m[el.id]] = el.value; drawList(); var n = ["doi", "tt", "gt", "vai"].filter(function (k) { return BO[k]; }).length, sm = document.querySelector(".morefl summary"), bd = document.getElementById("fl-n"); if (sm) { if (!bd && n) { bd = document.createElement("span"); bd.className = "nbadge"; bd.id = "fl-n"; sm.appendChild(bd); } if (bd) { if (n) bd.textContent = n; else bd.remove(); } } };
  U.acts["new-blank"] = function () { U.prefill = null; };
  U.acts.tc = function (el) { BO.tc = el.getAttribute("data-k") || ""; U.$$(".segb").forEach(function (b) { var on = (b.getAttribute("data-k") || "") === BO.tc; b.classList.toggle("on", on); b.setAttribute("aria-pressed", on); }); drawList(); };
  U.acts["lf-reset"] = function () { ["doi", "tt", "gt", "vai"].forEach(function (k) { BO[k] = ""; }); U.rerender(); };

  // ---------- Cây thu gọn ----------
  function rootsOf() {
    var V = U.view(), isChild = {};
    V.list.forEach(function (p) { if (p.cha_id && V.by[p.cha_id]) isChild[p.id] = 1; else if (!p.cha_id && p.me_id && V.by[p.me_id]) isChild[p.id] = 1; });
    var married = {}; V.spouses.forEach(function (s) { if (s.spouse_person_id) married[s.spouse_person_id] = 1; });
    return V.list.filter(function (p) { return !isChild[p.id] && p.level !== "hidden" && !isTG(p) && !(isInlaw(p) && spousesOf(p.id).some(function (s) { return s.spouse_person_id && V.by[s.spouse_person_id]; })) && !(married[p.id] && p.gioi_tinh === "nu" && !famKids(p.id).length) && (famKids(p.id).length || !married[p.id]) && !(married[p.id] && p.gioi_tinh === "nu"); })
      .sort(function (a, b) { return sortNum(a.the_thu) - sortNum(b.the_thu) || sortNum(a.sinh && a.sinh.nam) - sortNum(b.sinh && b.sinh.nam); });
  }
  U.rootsOf = rootsOf;
  function treeNode(p, seen, depth) {
    if (seen[p.id]) return ""; seen[p.id] = 1; depth = depth || 0; var F = U.FL;
    spousesOf(p.id).forEach(function (s) { if (s.spouse_person_id) seen[s.spouse_person_id] = 1; });
    var kids = famKids(p.id).filter(function (k) { return !seen[k.id] && !U.fltHide(k, depth + 1); }).sort(function (a, b) { return sortNum(a.thu_tu_con) - sortNum(b.thu_tu_con) || sortNum(a.sinh && a.sinh.nam) - sortNum(b.sinh && b.sinh.nam); });
    var sp = F.min ? [] : spousesOf(p.id).filter(function (s) { return !U.fltSpouse(s.spouse_person_id && U.view().by[s.spouse_person_id], p); }).map(spouseName).filter(Boolean), nm = p.level === "hidden" ? t("p.da_an_ten") : U.fullName(p);
    var lbl = '<a href="#nguoi-' + esc(p.id) + '">' + esc(nm) + "</a>" + (!F.min && p.level === "full" && U.span(p) ? ' <span class="muted">' + esc(U.span(p)) + "</span>" : "") + (sp.length ? ' <span class="muted">(' + esc(t("cay.vc")) + ": " + esc(sp.join(", ")) + ")</span>" : "");
    if (!kids.length) return '<li><div class="leaf">' + lbl + "</div></li>";
    var inner = "<ul>" + kids.map(function (k) { return treeNode(k, seen, depth + 1); }).join("") + "</ul>";
    if (F.nobtn) return '<li><div class="leaf">' + lbl + "</div>" + inner + "</li>";
    return "<li><details open><summary>" + lbl + ' <span class="muted">· ' + kids.length + "</span></summary>" + inner + "</details></li>";
  }
  P.cay = function () {
    var seen = {}, rs = rootsOf();
    var html = "<h1>" + esc(t("cay.tieu_de")) + "</h1>" + viewTabs("cay") + "<p>" + esc(t("cay.mo_ta")) + "</p>" + U.fltBar("tree") + '<div class="row">' + (U.FL.nobtn ? "" : '<button type="button" class="btn" data-act="tree-open">' + esc(t("cay.mo_het")) + '</button><button type="button" class="btn" data-act="tree-close">' + esc(t("cay.thu_het")) + "</button>") + '<a class="btn" href="#sach">' + esc(t("sach.tieu_de")) + '</a></div><div class="card"><ul class="tree">' + (rs.length ? rs.map(function (r) { return treeNode(r, seen, 0); }).join("") : '<li class="muted">' + esc(t("l.khong_thay")) + "</li>") + "</ul></div>";
    return { title: t("cay.tieu_de"), html: html };
  };
  U.acts["tree-open"] = function () { U.$$("#main details").forEach(function (d) { d.open = true; }); };
  U.acts["tree-close"] = function () { U.$$("#main details").forEach(function (d) { d.open = false; }); };

  // ---------- Hồ sơ ----------
  function row(k, v) { return v == null || v === "" ? "" : "<dt>" + esc(k) + "</dt><dd>" + v + "</dd>"; }
  function srcBadge() { return ""; } // đã bỏ hiển thị "nguồn" theo yêu cầu
  function gioBlock(p) {
    var g = GP.io.gioInfo(p); if (!g) return p.con_song === false ? '<p class="muted">' + esc(t("p.chua_co_gio")) + "</p>" : "";
    var set = S.S.data.settings, td = U.today(), out = [];
    for (var y = td[2]; y <= td[2] + 2 && out.length < 3; y++) {
      if (g.namAm && y <= g.namAm) continue;
      var a = GP.lunar.anniversary(g.ngay, g.thang, y, { leap: g.nhuan, rule: set.gio_thang_thieu });
      if (a && a.solar) out.push("<li>" + esc(t("p.nam") + " " + y) + ": <b>" + esc(U.dmy(a.solar)) + "</b> <span class=\"muted\">(" + esc(U.lunarTxt(a.lunar)) + (a.adjusted ? "; " + t("lich.thang_thieu") : "") + ")</span></li>");
    }
    return "<p>" + esc(t("p.gio_am")) + ": <b>" + esc(g.ngay + "/" + g.thang + (g.nhuan ? " " + t("d.nhuan") : "")) + "</b>" + (g.suyRa ? ' <span class="muted">(' + esc(t("lich.suy_ra")) + ")</span>" : "") + '</p><ul class="evl">' + out.join("") + "</ul>";
  }
  function avatar(p) {
    var m = p.anh_dai_dien && S.S.data.media.filter(function (x) { return x.id === p.anh_dai_dien; })[0];
    return m && m.duong_dan_hien_thi ? '<img class="avatar" src="' + esc(m.duong_dan_hien_thi) + '" alt="' + esc(m.tieu_de || U.fullName(p)) + '" width="120" height="120">' : "";
  }
  P.nguoi = function (id) {
    var V = U.view(), p = V.by[id], back = '<p><a class="btn" href="#danh-sach">← ' + esc(t("p.ve_ds")) + "</a></p>";
    if (!p) return { title: t("p.khong_co"), html: back + '<div class="card center"><h1>' + esc(t("p.khong_co")) + "</h1></div>" };
    if (p.level === "hidden") return { title: t("p.da_an_ten"), html: back + '<div class="card center"><div class="big" aria-hidden="true">🔒</div><h1>' + esc(t("p.da_an_ten")) + "</h1><p>" + esc(t(p.da_an ? "p.da_an_mo_ta" : "p.rieng_mo_ta")) + "</p></div>" };
    var basic = p.level === "basic", raw = S.byId(id), can = raw && GP.privacy.canEdit(raw, S.S.viewer), kids = childrenOf(id);
    var meId = V.ctx && S.S.viewer.person_id;
    var sibs = V.list.filter(function (q) { return q.id !== id && q.level !== "hidden" && ((p.cha_id && q.cha_id === p.cha_id) || (p.me_id && q.me_id === p.me_id)); }).sort(function (a, b) { return sortNum(a.thu_tu_con) - sortNum(b.thu_tu_con); });
    var rows = "";
    rows += row(t("p.ten_thuong_goi"), esc(p.ten_thuong_goi)) + row(t("p.ten_huy"), esc(p.ten_huy)) + row(t("p.ten_thuy"), esc(p.ten_thuy)) + row(t("p.ten_han_nom"), esc(p.ten_han_nom)) + row(t("p.dao_hieu"), esc(p.dao_hieu));
    rows += row(t("p.gioi_tinh"), esc(p.gioi_tinh === "nam" ? t("p.nam") : p.gioi_tinh === "nu" ? t("p.nu") : ""));
    if (!basic) {
      rows += row(t("p.sinh"), (esc(U.dateTxt(p.sinh)) || esc(t("p.chua_ro"))) + srcBadge(p, "sinh"));
      rows += row(t("p.mat"), p.con_song === false ? (esc(U.dateTxt(p.mat)) || esc(t("p.chua_ro"))) + srcBadge(p, "mat") : esc(t("p.con_song")));
      rows += row(t("p.nghe"), esc(p.nghe)) + row(t("p.noi_sinh"), esc(p.noi_sinh)) + row(t("p.noi_an_tang"), esc(p.noi_an_tang));
    }
    rows += row(t("p.doi"), esc(gen(p) || "")) + row(t("p.thu_tu_con"), esc(p.thu_tu_con));
    rows += row(t("p.cha"), (p.cha_id ? U.link(p.cha_id) : esc(t("p.chua_ro"))) + srcBadge(p, "cha_me"));
    rows += row(t("p.me"), p.me_id ? U.link(p.me_id) : esc(p.me_ten || t("p.chua_ro")));
    var sps = spousesOf(id);
    rows += row(t("p.vo_chong"), sps.length ? '<ul class="plain">' + sps.map(function (s) {
      return "<li>" + esc(t("p.thu") + " " + s.thu_tu) + ": " + (s.spouse_person_id ? U.link(s.spouse_person_id) : esc(spouseName(s))) + " " + U.badge(t("tt." + (s.tinh_trang || "dang_o")), s.tinh_trang === "ly_hon" ? "warn" : "") + (s.ghi_chu ? ' <span class="muted">' + esc(s.ghi_chu) + "</span>" : "") +
        (can ? ' <button type="button" class="btn small ghost" data-act="sp-edit" data-id="' + esc(s.id) + '">' + esc(t("c.sua")) + '</button><button type="button" class="btn small ghost" data-act="sp-hide" data-id="' + esc(s.id) + '">' + esc(t("c.an")) + "</button>" : "") + "</li>";
    }).join("") + "</ul>" : esc(t("p.chua_co_thong_tin")));
    var meSet = {}; kids.forEach(function (c) { meSet[c.me_id || ""] = 1; }); var mixed = Object.keys(meSet).length > 1;
    rows += row(t("p.con"), kids.length ? '<ul class="plain">' + kids.sort(function (a, b) { return sortNum(a.me_id === b.me_id ? 0 : 1) - 0 || sortNum(a.thu_tu_con) - sortNum(b.thu_tu_con); }).map(function (c) {
      return "<li>" + U.link(c.id) + (mixed ? ' <span class="badge">' + esc(t("p.me") + ": " + (c.me_id && p.cha_id !== c.me_id && c.cha_id === id ? U.nameOf(c.me_id) : c.me_id && c.cha_id !== id ? U.nameOf(c.cha_id) : (c.me_ten || t("p.chua_ro")))) + "</span>" : "") + "</li>";
    }).join("") + "</ul>" : esc(t("p.chua_co_thong_tin")));
    rows += row(t("p.anh_chi_em"), sibs.length ? '<ul class="plain">' + sibs.map(function (q) {
      var half = (p.cha_id && q.cha_id === p.cha_id) !== (p.me_id && q.me_id === p.me_id) ? (p.cha_id && q.cha_id === p.cha_id ? t("note.cung_cha_khac_me") : t("note.cung_me_khac_cha")) : "";
      return "<li>" + U.link(q.id) + (half ? " " + U.badge(half, "") : "") + "</li>";
    }).join("") + "</ul>" : "");
    var html = back + '<div class="card"><div class="phead">' + (basic ? "" : avatar(p)) + "<div><h1>" + esc(U.fullName(p)) + U.nickTag(p) + "</h1><p>" + (p.da_an ? U.badge(t("p.da_an"), "warn") + " " : "") + (p.con_song !== false ? U.badge(t("p.con_song"), "ok") : U.badge(t("p.da_mat"), "")) + (basic ? " " + U.badge(t("p.co_ban"), "") : "") + "</p></div></div>" +
      (basic ? '<p class="note">' + esc(t("p.chi_co_ban")) + "</p>" : "") + '<dl class="kv">' + rows + "</dl></div>";
    if (!basic) {
      html += (p.con_song === false ? '<div class="card"><h2>' + esc(t("p.ngay_gio")) + "</h2>" + gioBlock(p) + "</div>" : "") + '<div class="card"><h2>' + esc(t("p.tieu_su")) + "</h2><p>" + esc(p.tieu_su || t("p.chua_co_thong_tin")).replace(/\n/g, "<br>") + '</p><dl class="kv">' + row(t("p.nguon"), esc(p.nguon || t("p.chua_ro"))) + row(t("p.muc_chac"), U.badge(t("chac." + (p.muc_chac_chan || "chua_chac")), "")) + row(t("p.muc_hien_thi"), U.badge(t("hien." + (p.muc_hien_thi || "rieng_tu")), "")) + (p.con_song !== false || U.view().year - ((p.sinh && p.sinh.nam) || 0) < 18 ? row(t("p.dong_y"), esc(p.da_dong_y_tre_em ? t("c.co") : t("c.chua"))) : "") + "</dl></div>";
    }
    html += '<div class="row">' + (meId && meId !== id ? '<a class="btn" href="#danh-xung" data-act="kin-with" data-id="' + esc(id) + '">' + esc(t("p.xung_voi_toi")) + "</a>" : "") + '<a class="btn" href="#danh-xung" data-act="kin-pick" data-id="' + esc(id) + '">' + esc(t("p.tra_danh_xung")) + "</a>" +
      (U.isAdmin() ? '<button type="button" class="btn danger" data-act="row-del" data-id="' + esc(id) + '">🗑 ' + esc(t("c.xoa")) + "</button>" : "") + (can ? '<a class="btn primary" href="#sua-' + esc(id) + '">' + esc(t("c.sua")) + '</a><a class="btn" href="#them" data-act="add-child" data-id="' + esc(id) + '">+ ' + esc(t("p.them_con")) + '</a><button type="button" class="btn" data-act="sp-new" data-id="' + esc(id) + '">+ ' + esc(t("p.them_vc")) + '</button><button type="button" class="btn" data-act="hide-person" data-id="' + esc(id) + '">' + esc(raw.da_an ? t("c.khoi_phuc") : t("c.an")) + "</button>" : "") +
      '<button type="button" class="btn" data-act="print">' + esc(t("c.in")) + "</button></div>";
    html += '<div id="sp-form"></div>';
    if (can) html += '<details class="hist-fold"><summary>' + esc(t("p.lich_su")) + "</summary>" + historyList(id) + "</details>";
    return { title: U.fullName(p), html: html };
  };
  U.acts.print = function () { try { window.print(); } catch (e) {} U.toast(t("c.in_ghi_chu")); };
  U.acts["kin-with"] = function (el) { U.kinPre = { a: S.S.viewer.person_id, b: el.getAttribute("data-id") }; };
  U.acts["kin-pick"] = function (el) { U.kinPre = { a: el.getAttribute("data-id"), b: null }; };
  U.acts["hide-person"] = function (el) {
    var id = el.getAttribute("data-id"), was = !!S.byId(id).da_an, r = U.attempt(function () { return S.setHidden(id, !was); });
    if (r.ok) { U.toast(was ? t("p.da_khoi_phuc") : t("p.da_an_xong")); U.rerender(); }
  };
  U.acts["add-child"] = function (el) {
    var id = el.getAttribute("data-id"), p = S.byId(id), sp = spousesOf(id).filter(function (s) { return s.spouse_person_id; })[0];
    var father = p.gioi_tinh === "nu" ? (sp && sp.spouse_person_id) : id, mother = p.gioi_tinh === "nu" ? id : (sp && sp.spouse_person_id);
    var sibs = S.S.data.persons.filter(function (q) { return q.cha_id === id || q.me_id === id; });
    U.prefill = { ho: p.gioi_tinh === "nu" ? "" : p.ho, cha_id: father || null, me_id: mother || null, the_thu: p.the_thu ? p.the_thu + 1 : null, thu_tu_con: sibs.length + 1, con_song: true };
  };
  // Thêm con: chọn người đã có trong cây (thay vì tạo mới)
  function ancestorsOf(id) { var o = {}, q = [id], by = S.S.data.persons.reduce(function (m, x) { m[x.id] = x; return m; }, {}); while (q.length) { var p = by[q.pop()]; if (!p) continue; [p.cha_id, p.me_id].forEach(function (a) { if (a && !o[a]) { o[a] = 1; q.push(a); } }); } return o; }
  function childCands(pid, term) {
    var p = S.byId(pid), anc = ancestorsOf(pid), slot = p.gioi_tinh === "nu" ? "me_id" : "cha_id", tt = GP.checks.norm(term || "");
    return U.view().list.filter(function (q) { return q.id !== pid && q.level !== "hidden" && !anc[q.id] && !q[slot] && (!tt || GP.checks.norm(U.fullName(q)).indexOf(tt) >= 0); })
      .sort(function (a, b) { return (gen(a) || 99) - (gen(b) || 99) || (U.fullName(a) < U.fullName(b) ? -1 : 1); }).slice(0, 80);
  }
  function childOpts(pid, term) { var xs = childCands(pid, term); return xs.length ? xs.map(function (q) { return '<option value="' + esc(q.id) + '">' + esc(U.fullName(q) + (gen(q) ? " · " + t("p.doi") + " " + gen(q) : "") + (q.sinh && q.sinh.nam ? " · " + q.sinh.nam : "")) + "</option>"; }).join("") : '<option value="" disabled>' + esc(t("l.khong_thay")) + "</option>"; }
  U.acts["child-pick"] = function (el) {
    var pid = el.getAttribute("data-id"), box = document.getElementById("sp-form"); if (!box) return;
    box.innerHTML = '<form class="card" data-submit="child-link"><h2>' + esc(t("p.chon_con_co_san")) + '</h2><p class="muted">' + esc(t("p.chon_con_mo_ta", { ten: U.fullName(S.byId(pid)) })) + '</p><input type="hidden" name="pid" value="' + esc(pid) + '"><label class="lab" for="cp-q">' + esc(t("c.tim")) + '</label><input class="inp" id="cp-q" type="search" data-oninput="cpfilter" data-id="' + esc(pid) + '" autocomplete="off"><label class="lab" for="cp-s">' + esc(t("p.con")) + '</label><select class="inp" id="cp-s" name="child" size="7">' + childOpts(pid, "") + '</select><div class="row"><button class="btn primary" type="submit">' + esc(t("c.luu")) + '</button><a class="btn" href="#nguoi-' + esc(pid) + '">' + esc(t("c.huy")) + "</a></div></form>";
    var q = document.getElementById("cp-q"); if (q) q.focus();
  };
  U.ons.cpfilter = function (el) { var s = document.getElementById("cp-s"); if (s) s.innerHTML = childOpts(el.getAttribute("data-id"), el.value); };
  U.ons["child-link"] = function (f) {
    var d = new FormData(f), pid = d.get("pid"), cid = d.get("child"); if (!cid) { U.toast(t("p.chon_con_truoc"), true); return; }
    var p = S.byId(pid), c = S.byId(cid), sp = spousesOf(pid).filter(function (s) { return s.spouse_person_id; }), other = sp.length === 1 ? sp[0].spouse_person_id : null, ch = {};
    if (p.gioi_tinh === "nu") { ch.me_id = pid; if (other && !c.cha_id) ch.cha_id = other; } else { ch.cha_id = pid; if (other && !c.me_id) ch.me_id = other; }
    if (!c.the_thu && gen(p)) ch.the_thu = gen(p) + 1;
    var r = U.attempt(function () { return S.updatePerson(cid, ch); });
    if (r.ok) { U.toast(t("p.da_noi_con", { ten: U.fullName(c) })); U.autoToast(); U.rerender(); }
  };
  // Báo cho người dùng biết hệ thống vừa tự nối thêm quan hệ nào
  U.autoToast = function () { var a = S.S.lastAuto; S.S.lastAuto = null; if (a && (a.vo_chong || a.cha_me)) U.toast(t("lk.tu_noi", { vc: a.vo_chong, cm: a.cha_me })); };
  // vợ chồng
  U.acts["sp-new"] = function (el) { spForm(el.getAttribute("data-id"), null); };
  U.acts["sp-edit"] = function (el) { var s = S.S.data.spouses.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0]; spForm(s.person_id, s); };
  U.acts["sp-hide"] = function (el) { var r = U.attempt(function () { S.hideSpouse(el.getAttribute("data-id"), true); }); if (r.ok) U.rerender(); };
  function spForm(pid, s) {
    var box = document.getElementById("sp-form"); s = s || { thu_tu: spousesOf(pid).length + 1, tinh_trang: "dang_o", ten: "", ghi_chu: "" };
    box.innerHTML = '<form class="card" data-submit="sp-save"><h2>' + esc(s.id ? t("c.sua") : t("p.them_vc")) + '</h2><input type="hidden" name="id" value="' + esc(s.id || "") + '"><input type="hidden" name="person_id" value="' + esc(pid) + '">' +
      '<label class="lab">' + esc(t("p.vo_chong")) + "</label>" + U.picker("spp", s.spouse_person_id, { filter: function (q) { return q.id !== pid; } }) +
      '<label class="lab" for="sp-ten">' + esc(t("f.vc_ten_khi_khong_co")) + '</label><input class="inp" id="sp-ten" name="ten" value="' + esc(s.ten) + '">' +
      '<div class="filters"><div><label class="lab" for="sp-tt">' + esc(t("p.thu")) + '</label><input class="inp" id="sp-tt" name="thu_tu" type="number" min="1" value="' + esc(s.thu_tu) + '"></div><div><label class="lab" for="sp-st">' + esc(t("f.tinh_trang")) + '</label><select id="sp-st" name="tinh_trang">' + ["dang_o", "da_mat", "ly_hon"].map(function (k) { return opt(k, t("tt." + k), s.tinh_trang); }).join("") + "</select></div></div>" +
      '<label class="lab" for="sp-gc">' + esc(t("f.ghi_chu")) + '</label><input class="inp" id="sp-gc" name="ghi_chu" value="' + esc(s.ghi_chu) + '"><div class="row"><button class="btn primary" type="submit">' + esc(t("c.luu")) + "</button></div></form>";
    box.scrollIntoView({ block: "center" });
  }
  U.ons["sp-save"] = function (f) {
    var d = new FormData(f), row = { person_id: d.get("person_id"), spouse_person_id: U.pkVal("spp") || null, ten: d.get("ten"), thu_tu: +d.get("thu_tu") || 1, tinh_trang: d.get("tinh_trang"), ghi_chu: d.get("ghi_chu") };
    if (d.get("id")) row.id = d.get("id");
    if (!row.spouse_person_id && !row.ten) { U.toast(t("f.can_vc"), true); return; }
    var r = U.attempt(function () {
      S.saveSpouse(row);
      // Ghi hai chiều để người kia cũng thấy quan hệ (nếu chưa có)
      if (row.spouse_person_id && !S.S.data.spouses.some(function (x) { return x.person_id === row.spouse_person_id && x.spouse_person_id === row.person_id && !x.da_an; })) {
        var other = S.byId(row.spouse_person_id); if (other && GP.privacy.canEdit(other, S.S.viewer)) S.saveSpouse({ person_id: row.spouse_person_id, spouse_person_id: row.person_id, thu_tu: 1, tinh_trang: row.tinh_trang });
      }
    });
    if (r.ok) { U.toast(t("c.da_luu")); U.rerender(); }
  };

  // ---------- Lịch sử một hồ sơ ----------
  function diffTxt(h) {
    var cu = h.thay_doi.cu || {}, moi = h.thay_doi.moi || {}, keys = Object.keys(moi).length ? Object.keys(moi) : Object.keys(cu), f = function (v) { return typeof v === "object" ? JSON.stringify(v) : String(v == null ? "" : v); };
    if (h.hanh_dong === "them") return "";
    return '<ul class="plain diff">' + keys.slice(0, 12).map(function (k) { return "<li><code>" + esc(k) + '</code>: <del>' + esc(f(cu[k])) + "</del> → <ins>" + esc(f(moi[k])) + "</ins></li>"; }).join("") + "</ul>";
  }
  function historyList(id) {
    var hs = S.S.data.edit_history.filter(function (h) { return h.ban_ghi_id === id; }).reverse();
    if (!hs.length) return '<p class="muted">' + esc(t("ls.chua_co")) + "</p>";
    return '<ul class="plain hist">' + hs.map(function (h) { return "<li><b>" + esc(t("ls." + h.hanh_dong)) + '</b> · <time>' + esc(new Date(h.luc).toLocaleString(U.lang === "zh" ? "zh-CN" : U.lang === "en" ? "en-GB" : "vi-VN")) + "</time> · " + esc(h.ai) + diffTxt(h) + "</li>"; }).join("") + "</ul>";
  }
  U.historyList = historyList; U.diffTxt = diffTxt;

  // ---------- Form thêm/sửa ----------
  function dateFields(pre, d, label, withLich) {
    d = d || {};
    return '<fieldset class="fs"><legend>' + esc(label) + '</legend><div class="filters d3">' +
      '<div><label class="lab" for="' + pre + '-ngay">' + esc(t("d.ngay")) + '</label><input class="inp" id="' + pre + '-ngay" name="' + pre + '_ngay" type="number" inputmode="numeric" min="1" max="31" value="' + esc(d.ngay || "") + '"></div>' +
      '<div><label class="lab" for="' + pre + '-thang">' + esc(t("d.thang")) + '</label><input class="inp" id="' + pre + '-thang" name="' + pre + '_thang" type="number" inputmode="numeric" min="1" max="12" value="' + esc(d.thang || "") + '"></div>' +
      '<div><label class="lab" for="' + pre + '-nam">' + esc(t("d.nam")) + '</label><input class="inp" id="' + pre + '-nam" name="' + pre + '_nam" type="number" inputmode="numeric" min="1" max="2100" value="' + esc(d.nam || "") + '"' + (pre === "sinh" ? ' data-oninput="sinh-nam"' : "") + '></div></div>' +
      '<div class="row"><label class="chk"><input type="checkbox" name="' + pre + '_xx"' + (d.xap_xi ? " checked" : "") + "> " + esc(t("d.khoang")) + "</label>" +
      '<label class="chk"><input type="radio" name="' + pre + '_lich" value="duong"' + (d.lich !== "am" ? " checked" : "") + "> " + esc(t("d.duong")) + '</label><label class="chk"><input type="radio" name="' + pre + '_lich" value="am"' + (d.lich === "am" ? " checked" : "") + "> " + esc(t("d.am")) + '</label><label class="chk"><input type="checkbox" name="' + pre + '_nhuan"' + (d.nhuan ? " checked" : "") + "> " + esc(t("d.nhuan")) + "</label></div>" + '<p class="dconv muted" id="dc-' + pre + '" aria-live="polite"></p></fieldset>';
  }
  function readDate(f, pre) {
    var g = function (n) { var v = f.elements[pre + "_" + n]; return v ? v.value : ""; };
    if (!g("nam") && !g("thang") && !g("ngay")) return null;
    var d = {}; if (g("nam")) d.nam = +g("nam"); if (g("thang")) d.thang = +g("thang"); if (g("ngay")) d.ngay = +g("ngay");
    if (f.elements[pre + "_xx"].checked) d.xap_xi = true;
    var lich = f.querySelector('input[name="' + pre + '_lich"]:checked'); if (lich && lich.value === "am") d.lich = "am";
    if (f.elements[pre + "_nhuan"].checked) d.nhuan = true; return d;
  }
  function srcBlock(key, label, cc) {
    var c = (cc && cc[key]) || {};
    return '<div class="srcb"><span class="lab">' + esc(label) + '</span><div class="filters"><div><label class="lab" for="cc-' + key + '-n">' + esc(t("p.nguon")) + '</label><input class="inp" id="cc-' + key + '-n" name="cc_' + key + '_nguon" value="' + esc(c.nguon || "") + '"></div><div><label class="lab" for="cc-' + key + '-m">' + esc(t("p.muc_chac")) + '</label><select id="cc-' + key + '-m" name="cc_' + key + '_muc">' + opt("", "—", c.muc || "") + ["da_xac_minh", "chua_chac", "truyen_mieng"].map(function (k) { return opt(k, t("chac." + k), c.muc); }).join("") + "</select></div></div></div>";
  }
  function inp(name, label, val, extra) { return '<div><label class="lab" for="f-' + name + '">' + esc(label) + '</label><input class="inp" id="f-' + name + '" name="' + name + '" value="' + esc(val == null ? "" : val) + '"' + (extra || "") + "></div>"; }
  function splitName(full) {
    var w = String(full || "").trim().split(/\s+/).filter(Boolean); if (!w.length) return null;
    return { ho: w.length > 1 ? w[0] : "", ten_dem: w.length > 2 ? w.slice(1, -1).join(" ") : "", ten: w[w.length - 1] };
  }
  U.splitName = splitName;
  // Khi một người có cả cha lẫn mẹ có hồ sơ mà hai người chưa nối vợ/chồng: tự nối
  U.ensureCouple = function (pid) {
    var c = S.byId(pid); if (!c || !c.cha_id || !c.me_id || !S.byId(c.cha_id) || !S.byId(c.me_id)) return;
    if (!S.S.data.spouses.some(function (x) { return !x.da_an && ((x.person_id === c.cha_id && x.spouse_person_id === c.me_id) || (x.person_id === c.me_id && x.spouse_person_id === c.cha_id)); })) S.saveSpouse({ person_id: c.cha_id, spouse_person_id: c.me_id, tinh_trang: "dang_o" });
  };
  // Thêm con / anh chị em từ các dòng trong form sửa
  U.addRelatives = function (f, pid) {
    var box = document.getElementById("rel-box"), on = document.getElementById("rel-on"); if (!box || !on || !on.checked) return 0;
    var me = S.byId(pid); if (!me) return 0, added = 0; var added = 0;
    [].forEach.call(box.querySelectorAll(".relrow"), function (row) {
      var nm = U.splitName(row.querySelector("[name=rel_ten]").value); if (!nm) return;
      var loai = row.querySelector("[name=rel_loai]").value, gt = row.querySelector("[name=rel_gt]").value, yr = +row.querySelector("[name=rel_nam]").value || 0, d = { gioi_tinh: gt, con_song: true, muc_hien_thi: "rieng_tu", chi: me.chi };
      if (yr) d.sinh = { nam: yr };
      Object.assign(d, nm);
      var all = S.S.data.persons;
      if (loai === "con") {
        var sps = U.spousesOf(pid), sp = sps.length === 1 ? sps[0] : null;
        if (me.gioi_tinh === "nam") { d.cha_id = pid; if (sp && sp.spouse_person_id) d.me_id = sp.spouse_person_id; else if (sp && sp.ten) d.me_ten = sp.ten; if (!d.ho) d.ho = me.ho; }
        else { d.me_id = pid; if (sp && sp.spouse_person_id) d.cha_id = sp.spouse_person_id; if (!d.ho && d.cha_id && S.byId(d.cha_id)) d.ho = S.byId(d.cha_id).ho; }
        d.the_thu = me.the_thu ? me.the_thu + 1 : null;
        d.thu_tu_con = all.filter(function (q) { return q.cha_id === pid || q.me_id === pid; }).reduce(function (m, q) { return Math.max(m, q.thu_tu_con || 0); }, 0) + 1;
      } else {
        d.cha_id = me.cha_id; d.me_id = me.me_id; d.me_ten = me.me_ten || ""; d.the_thu = me.the_thu; if (!d.ho && me.cha_id) d.ho = me.ho;
        d.thu_tu_con = all.filter(function (q) { return (me.cha_id && q.cha_id === me.cha_id) || (me.me_id && q.me_id === me.me_id); }).reduce(function (m, q) { return Math.max(m, q.thu_tu_con || 0); }, 0) + 1;
      }
      var r = U.attempt(function () { var np = S.addPerson(d); U.ensureCouple(np.id); return np; }); if (r.ok) added++;
    });
    return added;
  };
  U.acts["rel-add"] = function () {
    var rows = document.getElementById("rel-rows"); if (!rows) return;
    var d = document.createElement("div"); d.className = "relrow filters";
    d.innerHTML = '<div><label class="lab">' + esc(t("f.rel_la")) + '</label><select name="rel_loai"><option value="con">' + esc(t("f.rel_con")) + '</option><option value="anh">' + esc(t("f.rel_anh")) + '</option></select></div><div><label class="lab">' + esc(t("f.rel_ten")) + '</label><input class="inp" name="rel_ten" autocomplete="off"></div><div><label class="lab">' + esc(t("p.gioi_tinh")) + '</label><select name="rel_gt"><option value="nam">' + esc(t("p.nam")) + '</option><option value="nu">' + esc(t("p.nu")) + '</option></select></div><div><label class="lab">' + esc(t("f.rel_nam_sinh")) + '</label><input class="inp" name="rel_nam" type="number" inputmode="numeric" min="1" max="2100"></div><div class="relx"><button type="button" class="btn small ghost" data-act="rel-del" aria-label="' + esc(t("c.xoa_dong")) + '">✕</button></div>';
    rows.appendChild(d); d.querySelector("[name=rel_ten]").focus();
  };
  U.acts["rel-del"] = function (el) { var r = el.closest(".relrow"); if (r) r.remove(); };
  U.ons["rel-toggle"] = function (el) { var b = document.getElementById("rel-box"); if (b) { b.hidden = !el.checked; if (el.checked && !b.querySelector(".relrow")) U.acts["rel-add"](); } };
  // Xoá / gộp hồ sơ trùng (Quản trị)
  U.acts["del-open"] = function () { var b = document.getElementById("del-box"); if (!b) return; b.hidden = !b.hidden; if (!b.hidden) { var id = document.querySelector('[name=id]').value, V = S.S.data, n = V.persons.filter(function (c) { return c.cha_id === id || c.me_id === id; }).length, v = V.spouses.filter(function (s) { return s.person_id === id || s.spouse_person_id === id; }).length; document.getElementById("del-info").textContent = t("f.xoa_anh_huong", { con: n, vc: v }); } };
  U.acts["del-do"] = function (el) {
    var id = el.getAttribute("data-id"), into = U.pkVal("gop") || null, nm = U.nameOf(id);
    var r = U.attempt(function () { return S.deletePerson(id, into); });
    if (r.ok) { U.toast(t("f.da_xoa", { ten: nm })); location.hash = "#danh-sach"; }
  };
  // Hộp xác nhận xoá ngay trong trang (không dùng hộp thoại của trình duyệt)
  U.askDelete = function (id) {
    var p = S.byId(id); if (!p || !U.isAdmin()) return; closeAsk();
    var V = S.S.data, n = V.persons.filter(function (c) { return c.cha_id === id || c.me_id === id; }).length, v = V.spouses.filter(function (s) { return !s.da_an && (s.person_id === id || s.spouse_person_id === id); }).length;
    var bg = document.createElement("div"); bg.id = "ask-bg"; bg.className = "sheet-bg ask"; bg.setAttribute("role", "alertdialog"); bg.setAttribute("aria-modal", "true");
    bg.innerHTML = '<div class="sheet askbox"><h3>' + esc(t("c.xoa") + ": " + U.fullName(p)) + '</h3><p class="muted">' + esc(t("f.xoa_anh_huong", { con: n, vc: v })) + "</p><p>" + esc(t("c.xoa_hoi")) + '</p><div class="row"><button type="button" class="btn danger" data-act="ask-ok" data-id="' + esc(id) + '">🗑 ' + esc(t("f.xoa_dong_y")) + '</button><a class="btn" data-act="ask-no" href="#sua-' + esc(id) + '">' + esc(t("c.xoa_gop")) + '</a><button type="button" class="btn ghost" data-act="ask-no" id="ask-cancel">' + esc(t("c.huy")) + "</button></div></div>";
    document.body.appendChild(bg); var c = bg.querySelector("#ask-cancel"); if (c) c.focus();
    bg.addEventListener("keydown", function (e) { if (e.key === "Escape") { e.stopPropagation(); closeAsk(); } });
  };
  function closeAsk() { var b = document.getElementById("ask-bg"); if (b) b.remove(); }
  U.acts["row-del"] = function (el) { U.askDelete(el.getAttribute("data-id")); };
  U.acts["ask-no"] = function () { closeAsk(); };
  U.acts["ask-ok"] = function (el) {
    var id = el.getAttribute("data-id"), nm = U.nameOf(id), r = U.attempt(function () { return S.deletePerson(id, null); });
    closeAsk(); if (r.ok) { if (U.closeSheet) U.closeSheet(); U.toast(t("f.da_xoa", { ten: nm })); if (/^#nguoi-/.test(location.hash)) location.hash = "#danh-sach"; else U.rerender(); }
  };
  function modern(sinh) { return !!(sinh && sinh.nam && sinh.nam >= 1900); }
  U.modern = modern;
  U.ons["sinh-nam"] = function (el) { var b = document.getElementById("old-names"); if (b) b.hidden = !!(el.value && +el.value >= 1900); };
  U.ons["tt-song"] = function (el) { var b = document.getElementById("dead-box"); if (b) b.hidden = el.value === "1"; };
  function formPage(id) {
    var raw = id ? S.byId(id) : null, isNew = !raw;
    if (!isNew && !(GP.privacy.canEdit(raw, S.S.viewer))) return { title: t("err.khong_du_quyen"), html: '<div class="card"><h1>' + esc(t("err.khong_du_quyen")) + '</h1><p><a class="btn" href="#danh-sach">← ' + esc(t("p.ve_ds")) + "</a></p></div>" };
    if (isNew && !U.canWrite()) return { title: t("err.khong_du_quyen"), html: '<div class="card"><h1>' + esc(t("err.khong_du_quyen")) + "</h1></div>" };
    var p = raw || Object.assign(S.blank(), U.prefill || {});
    var cc = p.chung_cu || {}, editorLock = S.S.viewer.role === "editor";
    var html = "<h1>" + esc(isNew ? t("f.them_nguoi") : t("f.sua_nguoi")) + '</h1><div id="f-err" role="alert"></div><form data-submit="person-save" id="pform" novalidate data-l-cha="' + esc(p.cha_id || "") + '" data-l-me="' + esc(p.me_id || "") + '"><input type="hidden" name="id" value="' + esc(p.id || "") + '">' +
      '<fieldset class="fs"><legend>' + esc(t("f.ten")) + '</legend><div class="filters">' + inp("ho", t("p.ho"), p.ho) + inp("ten_dem", t("p.ten_dem"), p.ten_dem) + inp("ten", t("p.ten") + " *", p.ten, " required aria-required=\"true\"") + inp("ten_thuong_goi", t("p.ten_thuong_goi"), p.ten_thuong_goi) + "</div><details class=\"old-names\" id=\"old-names\"" + (modern(p.sinh) ? " hidden" : "") + ((p.ten_huy || p.ten_thuy || p.ten_han_nom || p.dao_hieu) ? " open" : "") + "><summary>" + esc(t("f.old_names")) + "</summary><div class=\"filters\">" + inp("ten_huy", t("p.ten_huy"), p.ten_huy) + inp("ten_thuy", t("p.ten_thuy"), p.ten_thuy) + inp("ten_han_nom", t("p.ten_han_nom"), p.ten_han_nom, ' lang="zh"') + inp("dao_hieu", t("p.dao_hieu"), p.dao_hieu) + "</div></details></fieldset>" +
      '<fieldset class="fs"><legend>' + esc(t("f.co_ban")) + '</legend><div class="filters"><div><label class="lab" for="f-gioi_tinh">' + esc(t("p.gioi_tinh")) + '</label><select id="f-gioi_tinh" name="gioi_tinh">' + opt("nam", t("p.nam"), p.gioi_tinh) + opt("nu", t("p.nu"), p.gioi_tinh) + '</select></div><div><label class="lab" for="f-con_song">' + esc(t("l.tinh_trang")) + '</label><select id="f-con_song" name="con_song" data-on="tt-song">' + opt("1", t("p.con_song"), p.con_song !== false ? "1" : "0") + opt("0", t("p.da_mat"), p.con_song !== false ? "1" : "0") + '</select></div>' +
      '<div><label class="lab" for="f-vai">' + esc(t("vai.nhan")) + '</label><select id="f-vai" name="vai">' + opt("", t("vai.tu_dong"), p.vai || "") + opt("ruot", t("vai.ruot"), p.vai || "") + opt("dau_re", t("vai.dau_re"), p.vai || "") + opt("thong_gia", t("vai.tg_opt"), p.vai || "") + '</select></div>' + inp("the_thu", t("p.doi"), p.the_thu, ' type="number" min="1"' + (!isNew && gen(p) ? ' placeholder="' + gen(p) + '"' : "")) + inp("thu_tu_con", t("p.thu_tu_con"), p.thu_tu_con, ' type="number" min="1"') + '</div><p class="auto-note" id="tt-note" hidden></p><p class="muted">' + esc(t("f.doi_chi_ghi")) + "</p>" + (!isNew && U.isAdmin() ? '<p class="muted">🔗 ' + esc(t("f.doi_cascade")) + "</p>" : "") + "</fieldset>" +
      dateFields("sinh", p.sinh, t("p.sinh")) + '<div id="dead-box"' + (p.con_song !== false ? " hidden" : "") + ">" + dateFields("mat", p.mat, t("p.mat")) +
      '<fieldset class="fs"><legend>' + esc(t("p.gio_am")) + '</legend><div class="filters">' + inp("gio_ngay_am", t("d.ngay"), p.gio_ngay_am, ' type="number" min="1" max="30"') + inp("gio_thang_am", t("d.thang"), p.gio_thang_am, ' type="number" min="1" max="12"') + '</div><label class="chk"><input type="checkbox" name="gio_nhuan"' + (p.gio_nhuan ? " checked" : "") + "> " + esc(t("d.nhuan")) + '</label><p class="muted">' + esc(t("f.gio_ghi_chu")) + '</p><p class="auto-note" id="gio-note" hidden></p></fieldset><fieldset class="fs"><div class="filters">' + inp("noi_an_tang", t("p.noi_an_tang"), p.noi_an_tang) + "</div></fieldset></div>" +
      '<fieldset class="fs"><legend>' + esc(t("f.quan_he")) + "</legend><label class=\"lab\">" + esc(t("p.cha")) + "</label>" + U.picker("cha", p.cha_id, { filter: function (q) { return q.id !== p.id; }, cb: function (v) { U.formLink("cha", v); } }) + '<label class="lab">' + esc(t("p.me")) + "</label>" + U.picker("me", p.me_id, { text: p.me_ten, filter: function (q) { return q.id !== p.id; }, cb: function (v) { U.formLink("me", v); } }) + '<p class="auto-note" id="link-note" hidden></p><p class="muted">' + esc(t("f.goi_y_cha_me")) + "</p></fieldset>" +
      '<fieldset class="fs"><legend>' + esc(t("f.khac")) + '</legend><div class="filters">' + inp("nghe", t("p.nghe"), p.nghe) + inp("noi_sinh", t("p.noi_sinh"), p.noi_sinh) + '</div><label class="lab" for="f-tieu_su">' + esc(t("p.tieu_su")) + '</label><textarea class="inp" id="f-tieu_su" name="tieu_su" rows="5">' + esc(p.tieu_su) + "</textarea>" +
      '<div class="filters"><div><label class="lab" for="f-muc_hien_thi">' + esc(t("p.muc_hien_thi")) + '</label><select id="f-muc_hien_thi" name="muc_hien_thi">' + ["rieng_tu", "gia_dinh_nho", "dai_gia_dinh", "gia_toc", "cong_khai"].map(function (k) { return opt(k, t("hien." + k), p.muc_hien_thi); }).join("") + "</select></div></div>" +
      '<div id="consent-box"' + (p.con_song !== false && p.sinh && p.sinh.nam && U.view().year - p.sinh.nam < 18 ? "" : " hidden") + '><label class="chk"><input type="checkbox" name="da_dong_y_tre_em"' + (p.da_dong_y_tre_em ? " checked" : "") + "> " + esc(t("f.dong_y")) + '</label><p class="muted">' + esc(t("f.dong_y_ghi_chu")) + "</p></div>" + (U.isAdmin() ? '<label class="chk"><input type="checkbox" name="hien_khach"' + (p.hien_khach ? " checked" : "") + "> " + esc(t("f.hien_khach")) + '</label><p class="muted">' + esc(t("f.hien_khach_mo_ta")) + "</p>" : "") + "</fieldset>" +
      '<fieldset class="fs" id="rel-fs"><legend>' + esc(t("f.them_nguoi_than")) + '</legend><label class="chk"><input type="checkbox" id="rel-on" data-on="rel-toggle"> ' + esc(t("f.them_con_anh")) + '</label><div id="rel-box" hidden><div id="rel-rows"></div><button type="button" class="btn" data-act="rel-add">+ ' + esc(t("f.them_dong")) + '</button><p class="muted">' + esc(t("f.them_ghi_chu")) + "</p></div></fieldset>" +
      '<div class="row"><button class="btn primary" type="submit">' + esc(t("c.luu")) + '</button><a class="btn" href="#' + (isNew ? "danh-sach" : "nguoi-" + esc(id)) + '">' + esc(t("c.huy")) + "</a>" + (isNew ? "" : U.isAdmin() ? '<button type="button" class="btn danger delbtn" data-act="row-del" data-id="' + esc(id) + '">🗑 ' + esc(t("c.xoa")) + "</button>" : '<button type="button" class="btn delbtn" data-act="hide-person" data-id="' + esc(id) + '" title="' + esc(t("f.an_thay_xoa")) + '">' + esc(t("c.an")) + "</button>") + "</div></form>" +
      (!isNew && S.S.viewer.role === "admin" ? '<section class="card warnb" id="del-sec"><h3>' + esc(t("f.xoa_tieu_de")) + '</h3><p class="muted">' + esc(t("f.xoa_mo_ta")) + '</p><button type="button" class="btn" data-act="del-open">🗑️ ' + esc(t("f.xoa_mo")) + '</button><div id="del-box" hidden><label class="lab">' + esc(t("f.xoa_gop")) + "</label>" + U.picker("gop", null, { filter: function (q) { return q.id !== p.id; } }) + '<p id="del-info" class="muted"></p><div class="row"><button type="button" class="btn danger" data-act="del-do" data-id="' + esc(id) + '">' + esc(t("f.xoa_dong_y")) + '</button><button type="button" class="btn ghost" data-act="del-open">' + esc(t("c.huy")) + "</button></div></div></section>" : "");
    return { title: isNew ? t("f.them_nguoi") : t("f.sua_nguoi"), html: html, after: function () { var f = document.getElementById("pform"); if (f && U.dconvAll) U.dconvAll(f); } };
  }
  P.them = function () { return formPage(null); };
  P.sua = function (id) { return formPage(id); };
  U.ons["person-save"] = function (f) {
    var g = function (n) { return f.elements[n] ? f.elements[n].value.trim() : ""; }, num = function (n) { return g(n) ? +g(n) : null; };
        var d = { ho: g("ho"), ten_dem: g("ten_dem"), ten: g("ten"), ten_thuong_goi: g("ten_thuong_goi"), ten_huy: g("ten_huy"), ten_thuy: g("ten_thuy"), ten_han_nom: g("ten_han_nom"), dao_hieu: g("dao_hieu"), gioi_tinh: g("gioi_tinh"),
      con_song: g("con_song") === "1", the_thu: num("the_thu"), thu_tu_con: num("thu_tu_con"), sinh: readDate(f, "sinh"), mat: g("con_song") === "1" ? null : readDate(f, "mat"), gio_ngay_am: num("gio_ngay_am"), gio_thang_am: num("gio_thang_am"), gio_nhuan: f.elements.gio_nhuan.checked,
      cha_id: U.pkVal("cha") || null, me_id: U.pkVal("me") || null, me_ten: "", vai: g("vai"), nghe: g("nghe"), noi_sinh: g("noi_sinh"), noi_an_tang: g("noi_an_tang"), tieu_su: f.elements.tieu_su.value, muc_hien_thi: g("muc_hien_thi"),
      da_dong_y_tre_em: f.elements.da_dong_y_tre_em.checked };
    if (f.elements.hien_khach) d.hien_khach = f.elements.hien_khach.checked;
    if (/\s/.test(d.ten)) { // gõ cả họ tên vào ô "Tên": tự tách họ / tên đệm / tên
      var w = d.ten.split(/\s+/), last = w.pop(); d.ten = last;
      if (!d.ho && !d.ten_dem) { d.ho = w.length > 1 ? w.shift() : (w.shift() || ""); d.ten_dem = w.join(" "); } else d.ten_dem = (d.ten_dem + " " + w.join(" ")).trim();
    }
    var id = g("id"), cand = Object.assign(S.blank(), d, { id: id || "__moi__" }), v = S.validate(cand, !id), err = document.getElementById("f-err");
    if (v.errors.length) { err.innerHTML = '<div class="card bad"><ul class="plain">' + v.errors.map(function (e) { return "<li>" + esc(t("val." + e.code)) + "</li>"; }).join("") + "</ul></div>"; err.scrollIntoView({ block: "center" }); return; }
    if (v.warnings.length && !f.getAttribute("data-ok")) {
      err.innerHTML = '<div class="card warnb"><p><b>' + esc(t("val.hoi_lai")) + '</b></p><ul class="plain">' + v.warnings.map(function (w) { return "<li>" + esc(t("val." + w.code)) + (w.ids ? " " + w.ids.map(function (i) { return U.link(i); }).join(", ") : w.id ? " " + U.link(w.id) : "") + "</li>"; }).join("") + '</ul><p>' + esc(t("val.bam_luu_lai")) + "</p></div>";
      f.setAttribute("data-ok", "1"); err.scrollIntoView({ block: "center" }); return;
    }
    var chaText = !d.cha_id ? U.pkText("cha") : "", meText = !d.me_id ? U.pkText("me") : "", made = 0;
    var tg = d.vai === "dau_re" || (!d.vai && id && U.isInlaw(S.byId(id)));
    var r = U.attempt(function () {
      // Tên cha/mẹ chưa có hồ sơ: tự tạo hồ sơ mới (riêng tư) và liên kết
      var mk = function (text, gt) { var nm = U.splitName(text); if (!nm) return null; made++; return S.addPerson(Object.assign({ gioi_tinh: gt, con_song: true, muc_hien_thi: "rieng_tu", vai: tg ? "thong_gia" : "", chi: "", the_thu: tg || !d.the_thu ? null : d.the_thu - 1 }, nm)).id; };
      if (chaText) d.cha_id = mk(chaText, "nam"); if (meText) d.me_id = mk(meText, "nu");
      var prev = id ? S.byId(id) : null, oldGen = prev ? gen(prev) : 0, shifted = [];
      U.shiftN = 0;
      if (prev && U.isAdmin() && d.the_thu && oldGen && d.the_thu !== oldGen) shifted = U.descIds(id); // Quản trị sửa đời → các đời sau tự dời theo
      var np = id ? S.updatePerson(id, d) : S.addPerson(d);
      if (shifted.length) { var dl = d.the_thu - oldGen; shifted.forEach(function (x) { var q = S.byId(x); if (q && q.the_thu) S.updatePerson(x, { the_thu: Math.max(1, q.the_thu + dl) }); }); U.shiftN = shifted.length; }
      U.ensureCouple(np.id || id); return np;
    });
    if (r.ok) {
      var pid = id || r.v.id, add = U.addRelatives(f, pid);
      U.prefill = null; U.autoToast(); U.toast(t("c.da_luu") + (U.shiftN ? " · " + t("f.doi_doi_theo", { n: U.shiftN }) : "") + (made ? " · " + t("f.da_tao_cha_me", { n: made }) : "") + (add ? " · " + t("f.da_them_nguoi", { n: add }) : "")); location.hash = "#nguoi-" + pid;
    }
  };
})(typeof window !== "undefined" ? window : globalThis);
