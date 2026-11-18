/* Trang: danh xưng, lịch, thống kê, phòng ảnh, dòng thời gian, di tích, bài viết, ủng hộ. */
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, S = GP.store, t = U.t, esc = U.esc, P = U.pages;
  function opt(v, label, sel) { return '<option value="' + esc(v) + '"' + (String(sel) === String(v) ? " selected" : "") + ">" + esc(label) + "</option>"; }
  function admin() { return S.S.viewer.role === "admin"; }
  function nonEmpty(s) { return s && String(s).trim(); }
  function evVisible(e) {
    var r = S.S.viewer.role; if (r === "admin" || r === "editor") return !e.da_an || r === "admin";
    if (e.da_an) return false; return r === "khach" ? e.muc_hien_thi === "cong_khai" : e.muc_hien_thi === "cong_khai" || e.muc_hien_thi === "gia_toc";
  }

  // ---------- Danh xưng ----------
  var kin = { a: null, b: null };
  function quyUoc() { return U.lsGet("gp.quyuoc") || S.S.data.settings.quy_uoc_danh_xung || "bac"; }
  function kinResult() {
    var out = document.getElementById("kin-out"); if (!out) return;
    var a = U.pkVal("ka"), b = U.pkVal("kb");
    if (!a || !b) { out.innerHTML = '<p class="muted">' + esc(t("kin.chon_hai")) + "</p>"; return; }
    var V = U.view(), K = GP.kinship.create(V.list, V.spouses.map(function (s) { return { person_id: s.person_id, spouse_person_id: s.spouse_person_id }; }), { quyUoc: quyUoc() }), r = K.relate(a, b), h = "";
    function notes(x) { return (x.notes || []).map(function (n) { return "<li>" + esc(t(n)) + "</li>"; }).join(""); }
    function hints(x) { return (x.hints || []).map(function (hn) { return '<li class="warnb">' + esc(t("hint." + hn.code)) + " " + hn.ids.map(function (i) { return U.link(i); }).join(", ") + "</li>"; }).join(""); }
    if (r.kind === "self") h = "<p>" + esc(t("kin.chinh_nguoi")) + "</p>";
    else if (r.kind === "none") h = '<div class="card warnb"><p>' + esc(t("kin.khong_quan_he")) + "</p><p class=\"muted\">" + esc(t("kin.khong_hon_nhan")) + "</p></div>";
    else {
      var viaTxt = r.kind === "affinal" && (r.via || []).length ? '<p class="muted">' + esc(t("kin.qua")) + ": " + r.via.map(function (i) { return U.link(i); }).join(" · ") + "</p>" : "";
      var path = viaTxt + (r.kind === "blood" ? '<p class="muted">' + esc(t("kin.to_chung")) + ": <b>" + esc(U.nameOf(r.lca)) + "</b> · " + esc(t("kin.cach", { a: r.up, b: r.down })) + "</p>" : "");
      var anyHidden = r.kind === "blood" && [a, b, r.lca].some(function (i) { return V.by[i] && V.by[i].level === "hidden"; });
      var allN = (r.ab.notes || []).concat(r.ba.notes || []).filter(function (n, i, arr) { return arr.indexOf(n) === i; });
      h = '<div class="card kinres"><p class="kline"><span>' + U.link(a) + " " + esc(t("kin.goi")) + " " + U.link(b) + ' ' + esc(t("kin.la")) + "</span><b class=\"term\">" + esc(r.ab.term) + '</b></p><p class="kline"><span>' + U.link(b) + " " + esc(t("kin.goi")) + " " + U.link(a) + ' ' + esc(t("kin.la")) + "</span><b class=\"term\">" + esc(r.ba.term) + "</b></p>" + path +
        ((r.ab.hints || []).concat(r.ba.hints || []).length ? "<ul class=\"plain\">" + hints({ hints: (r.ab.hints || []).filter(function (x, i, arr) { return arr.findIndex(function (y) { return y.ids.join() === x.ids.join(); }) === i; }) }) + "</ul>" : "") +
        (allN.length ? '<ul class="plain notes">' + allN.map(function (n) { return "<li>" + esc(t(n)) + "</li>"; }).join("") + "</ul>" : "") + (anyHidden ? '<p class="note">' + esc(t("kin.co_an")) + "</p>" : "") + "</div>";
    }
    out.innerHTML = h;
  }
  P["danh-xung"] = function () {
    var pre = U.kinPre || {}; U.kinPre = null;
    var a = pre.a || kin.a || S.S.viewer.person_id || null, b = pre.b || kin.b || null;
    var html = "<h1>" + esc(t("kin.tieu_de")) + "</h1><p>" + esc(t("kin.mo_ta")) + '</p><div class="card"><div class="filters2"><div><label class="lab">' + esc(t("kin.nguoi_a")) + "</label>" + U.picker("ka", a, { cb: function (v) { kin.a = v; kinResult(); }, label: t("kin.nguoi_a") }) + '</div><div><label class="lab">' + esc(t("kin.nguoi_b")) + "</label>" + U.picker("kb", b, { cb: function (v) { kin.b = v; kinResult(); }, label: t("kin.nguoi_b") }) + "</div></div>" +
      '<div class="row"><button type="button" class="btn" data-act="kin-swap">⇄ ' + esc(t("kin.doi_cho")) + '</button><div><label class="lab" for="kin-qu">' + esc(t("kin.quy_uoc")) + '</label><select id="kin-qu" data-on="kinqu">' + opt("bac", t("kin.qu_bac"), quyUoc()) + opt("di", t("kin.qu_di"), quyUoc()) + opt("trung", t("kin.qu_trung"), quyUoc()) + "</select></div></div></div>" + '<div id="kin-out" aria-live="polite"></div>' +
      '<details class="card"><summary>' + esc(t("kin.quy_tac")) + "</summary><p>" + esc(t("kin.quy_tac_nd")) + "</p></details>";
    return { title: t("kin.tieu_de"), html: html, after: function () { U.pk.ka.cb = function (v) { kin.a = v; kinResult(); }; U.pk.kb.cb = function (v) { kin.b = v; kinResult(); }; kinResult(); } };
  };
  U.acts["kin-swap"] = function () { var a = U.pkVal("ka"), b = U.pkVal("kb"); kin.a = b; kin.b = a; U.rerender(); };
  U.ons.kinqu = function (el) { U.lsSet("gp.quyuoc", el.value); kinResult(); };

  // ---------- Lịch ----------
  var cal = null, WD = ["wd.t2", "wd.t3", "wd.t4", "wd.t5", "wd.t6", "wd.t7", "wd.cn"];
  function calMonth() {
    var td = U.today(); if (!cal) cal = { m: td[1], y: td[2], sel: null };
    var L = GP.lunar, first = [1, cal.m, cal.y], last = L.jdToDate(L.jdFromDate(1, cal.m === 12 ? 1 : cal.m + 1, cal.m === 12 ? cal.y + 1 : cal.y) - 1);
    var V = U.view(), ev = GP.io.upcoming(V.list, first, last, { gioThieu: S.S.data.settings.gio_thang_thieu }), byDay = {};
    ev.forEach(function (e) { (byDay[e.ngay[0]] = byDay[e.ngay[0]] || []).push(e); });
    var jd1 = L.jdFromDate(1, cal.m, cal.y), dow = (jd1 + 1) % 7, lead = (dow + 6) % 7, cells = "";
    for (var i = 0; i < lead; i++) cells += '<div class="cd empty"></div>';
    for (var d = 1; d <= last[0]; d++) {
      var l = L.solarToLunar(d, cal.m, cal.y), es = byDay[d] || [], isT = d === td[0] && cal.m === td[1] && cal.y === td[2], k = L.holidayKey(l);
      var lt = l.day === 1 ? l.day + "/" + l.month + (l.leap ? "n" : "") : String(l.day);
      var hasG = es.some(function (e) { return e.loai === "gio"; }), hasS = es.some(function (e) { return e.loai === "sinh"; }), hasL = es.some(function (e) { return e.loai === "le"; }) || l.day === 1 || l.day === 15 || k;
      var chips = es.filter(function (e) { return e.loai !== "le" || k; }).slice(0, 2).map(function (e) { return '<span class="cch ' + e.loai + '">' + esc((e.loai === "gio" ? "🕯️ " : e.loai === "sinh" ? "🎂 " : "🏮 ") + (e.loai === "le" ? t("le." + e.khoa) : U.nameOf(e.id))) + "</span>"; }).join("");
      cells += '<button type="button" class="cd' + (isT ? " today" : "") + (cal.sel === d ? " sel" : "") + (k ? " le" : "") + (hasG ? " has-gio" : hasS ? " has-sinh" : (k || es.length) ? " has-le" : "") + '" data-act="cal-day" data-d="' + d + '"' + (isT ? ' aria-current="date" data-hn="' + esc(t("lich.hom_nay")) + '"' : "") + ' aria-label="' + esc(d + "/" + cal.m + " · " + U.lunarTxt(l) + (es.length ? " · " + es.length + " " + t("lich.n_su_kien_ngan") : "")) + '"><b class="sd">' + d + '</b><span class="lun">' + esc(lt) + '</span><span class="cchs">' + chips + '</span><span class="dots">' + (hasG ? '<i class="dot gio"></i>' : "") + (hasS ? '<i class="dot sinh"></i>' : "") + (hasL ? '<i class="dot le"></i>' : "") + "</span></button>";
    }
    var sel = "";
    if (cal.sel) { var sl = L.solarToLunar(cal.sel, cal.m, cal.y), wk = (L.jdFromDate(cal.sel, cal.m, cal.y) + 1) % 7, es2 = byDay[cal.sel] || [];
      var occ = U.occasionOf ? U.occasionOf(es2, L.holidayKey(sl)) : "def"; cal.es2 = es2; cal.occ = occ;
      sel = '<div class="calpop-bg" data-act="cal-close"><div class="calpop occ-' + occ + '" data-occ="' + occ + '" role="dialog" aria-modal="true" aria-label="' + esc(cal.sel + "/" + cal.m + "/" + cal.y) + '"><button type="button" class="pop-x" data-act="cal-close" aria-label="' + esc(t("c.dong")) + '">✕</button><div class="cp-h"><b class="cp-d">' + cal.sel + '</b><div><b>' + esc(t(["wdl.cn", "wdl.t2", "wdl.t3", "wdl.t4", "wdl.t5", "wdl.t6", "wdl.t7"][wk]) + ", " + cal.sel + "/" + cal.m + "/" + cal.y) + '</b><br><span class="badge gio">' + esc(U.lunarTxt(sl)) + '</span> <span class="badge">' + esc(t("lich.nam_am", { n: L.canChiYear(sl.year) })) + '</span><br><small class="muted">' + esc(t("lich.thang_ngay_cc", { t: L.canChiMonth ? L.canChiMonth(sl) : "", d: L.canChiDay ? L.canChiDay(cal.sel, cal.m, cal.y) : "" })) + "</small></div></div>" + (es2.length ? U.eventList(es2) : '<p class="muted">' + esc(t("lich.khong_su_kien")) + "</p>") + (U.calCards ? U.calCards(es2, [cal.sel, cal.m, cal.y], L.holidayKey(sl)) : "") + '<div class="row"><button type="button" class="btn" data-act="cal-close">' + esc(t("c.dong")) + "</button></div></div></div>"; }
    var mid = L.solarToLunar(15, cal.m, cal.y);
    var cn = function (k) { return ev.filter(function (e) { return e.loai === k; }).length; }, sumT = U.sumTiles([{ ico: "🕯️", n: cn("gio"), label: t("lich.gio"), c: 3, act: "cal-filt", k: "gio", on: cal.f === "gio" }, { ico: "🎂", n: cn("sinh"), label: t("lich.sinh"), c: 5, act: "cal-filt", k: "sinh", on: cal.f === "sinh" }, { ico: "🏮", n: cn("le"), label: t("lich.le"), c: 4, act: "cal-filt", k: "le", on: cal.f === "le" }], "compact");
    return '<div class="row between"><button type="button" class="btn" data-act="cal-prev" aria-label="' + esc(t("lich.thang_truoc")) + '">‹</button><h2 class="calt">' + esc(t("lich.thang") + " " + cal.m + " / " + cal.y) + ' <span class="muted">' + esc(L.canChiYear(mid.year)) + '</span></h2><button type="button" class="btn" data-act="cal-next" aria-label="' + esc(t("lich.thang_sau")) + '">›</button></div>' +
      '<div class="calgrid" role="group" aria-label="' + esc(t("nav.lich")) + '">' + WD.map(function (w) { return '<div class="wd">' + esc(t(w)) + "</div>"; }).join("") + cells + "</div>" +
      '<div class="legend"><span><i class="dot gio"></i>' + esc(t("lich.gio")) + '</span><span><i class="dot sinh"></i>' + esc(t("lich.sinh")) + '</span><span><i class="dot le"></i>' + esc(t("lich.le")) + '</span><span><i class="sw todaysw"></i>' + esc(t("lich.hom_nay")) + "</span></div>" + sel +
      sumT + '<div class="card" id="cal-list"><h3>' + esc(t("lich.trong_thang")) + (cal.f ? ' · <span class="chip">' + esc(t(cal.f === "gio" ? "lich.gio" : cal.f === "sinh" ? "lich.sinh" : "lich.le")) + "</span>" : "") + "</h3>" + monthTable(ev.filter(function (e) { return cal.f ? e.loai === cal.f : true; }).filter(function (e) { return e.loai !== "le" || cal.f === "le" || ["tet1", "tet2", "tet3", "giao_thua", "ram_gieng", "gio_to", "han_thuc", "doan_ngo", "vu_lan", "trung_thu", "ong_tao", "thanh_minh"].indexOf(e.khoa) >= 0; })) + "</div>";
  }
  /** Bảng các sự kiện trong tháng: ngày dương, thứ, âm lịch, loại, nội dung, ghi chú */
  function monthTable(list) {
    if (!list.length) return '<p class="muted">' + esc(t("lich.thang_trong")) + "</p>";
    var L = GP.lunar, WK = ["wdl.cn", "wdl.t2", "wdl.t3", "wdl.t4", "wdl.t5", "wdl.t6", "wdl.t7"];
    var rows = list.slice().sort(function (x, y) { return x.ngay[0] - y.ngay[0]; }).map(function (e) {
      var wd = WK[(L.jdFromDate(e.ngay[0], e.ngay[1], e.ngay[2]) + 1) % 7], lun = e.lunar || L.solarToLunar(e.ngay[0], e.ngay[1], e.ngay[2]);
      var note = e.loai === "gio" ? [(e.dieuChinh ? t("lich.thang_thieu") : ""), (e.suyRa ? t("lich.suy_ra") : "")].filter(Boolean).join("; ") : e.loai === "sinh" ? (e.tuoi ? t("lich.tuoi", { n: e.tuoi }) : "") : "";
      var cd = U.countdown ? U.countdown(e) : "";
      return '<tr class="ev-' + e.loai + '"><td data-l="' + esc(t("lich.cot_ngay")) + '"><b>' + e.ngay[0] + "/" + e.ngay[1] + '</b> <small class="muted">' + esc(t(wd)) + '</small></td><td data-l="' + esc(t("lich.cot_am")) + '">' + esc(U.lunarTxt(lun)) + '</td><td data-l="' + esc(t("lich.cot_loai")) + '">' + U.badge(t(e.loai === "gio" ? "lich.gio" : e.loai === "sinh" ? "lich.sinh" : "lich.le"), e.loai) + '</td><td data-l="' + esc(t("lich.cot_nd")) + '"><b>' + (e.loai === "le" ? esc(t("le." + e.khoa)) : U.link(e.id)) + '</b></td><td data-l="' + esc(t("lich.cot_ghi_chu")) + '" class="muted">' + esc([note, cd].filter(Boolean).join(" · ")) + "</td></tr>";
    }).join("");
    return '<div class="tblwrap"><table class="evtbl"><thead><tr><th>' + esc(t("lich.cot_ngay")) + "</th><th>" + esc(t("lich.cot_am")) + "</th><th>" + esc(t("lich.cot_loai")) + "</th><th>" + esc(t("lich.cot_nd")) + "</th><th>" + esc(t("lich.cot_ghi_chu")) + "</th></tr></thead><tbody>" + rows + "</tbody></table></div>";
  }
  P.lich = function () {
    if (cal) cal.sel = null;
    var html = "<h1>" + esc(t("lich.tieu_de")) + "</h1><p>" + esc(t("lich.mo_ta")) + '</p><div id="cal-body">' + calMonth() + '</div><div class="card"><h3>' + esc(t("lich.xuat")) + "</h3><p class=\"muted\">" + esc(t("lich.xuat_mo_ta")) + '</p><div class="row"><button type="button" class="btn" data-act="cal-today">' + esc(t("lich.hom_nay")) + '</button><button type="button" class="btn primary" data-act="ics">' + esc(t("lich.tai_ics")) + '</button></div><div id="xuat-box" class="card" hidden></div></div>';
    return { title: t("lich.tieu_de"), html: html };
  };
  function calDraw() { var y = window.scrollY; document.getElementById("cal-body").innerHTML = calMonth(); window.scrollTo(0, y); var c = document.querySelector(".calpop .pop-x"); if (c) c.focus({ preventScroll: true }); else { var b = document.querySelector(".cd.sel"); if (b) b.focus({ preventScroll: true }); } }
  U.acts["cal-close"] = function (el, e) { if (el.classList.contains("calpop-bg") && e && e.target && e.target.closest(".calpop")) return; cal.sel = null; calDraw(); };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && cal && cal.sel && !document.getElementById("sheet-bg")) { cal.sel = null; calDraw(); } });
  U.acts["cal-prev"] = function () { cal.sel = null; cal.m--; if (cal.m < 1) { cal.m = 12; cal.y--; } calDraw(); };
  U.acts["cal-next"] = function () { cal.sel = null; cal.m++; if (cal.m > 12) { cal.m = 1; cal.y++; } calDraw(); };
  U.acts["cal-today"] = function () { cal = null; calDraw(); };
  U.acts["cal-filt"] = function (el) { var k = el.getAttribute("data-k"); cal.sel = null; cal.f = cal.f === k ? null : k; calDraw(); };
  U.acts["cal-day"] = function (el) { cal.sel = +el.getAttribute("data-d"); calDraw(); };
  U.acts.ics = function () {
    var V = U.view(), td = U.today(), items = GP.io.upcoming(V.list, [1, 1, td[2]], [31, 12, td[2] + 1], { gioThieu: S.S.data.settings.gio_thang_thieu, leTet: false });
    var txt = GP.io.toIcs(items, function (i) { return (i.loai === "gio" ? t("lich.gio") : t("lich.sinh")) + ": " + U.nameOf(i.id); }, t("site.ten"), U.icsOpts ? U.icsOpts() : {});
    U.download("gia-pha-lich.ics", txt, "text/calendar");
  };

  // ---------- Thống kê ----------
  function bars(rows, fmt) {
    var max = Math.max.apply(null, rows.map(function (r) { return r[1]; }).concat([1]));
    return '<ul class="bars">' + rows.map(function (r) { return '<li><span class="bl">' + esc(r[0]) + '</span><span class="bt"><span class="bf" style="width:' + Math.round(r[1] / max * 100) + '%"></span></span><b class="bv">' + esc(fmt ? fmt(r[1]) : r[1]) + "</b></li>"; }).join("") + "</ul>";
  }
  P["thong-ke"] = function () {
    var V = U.view(), s = GP.io.stats(V.list, V.spouses, V.year);
    var dois = Object.keys(s.theoDoi).map(Number).sort(function (a, b) { return a - b; }), chis = Object.keys(s.theoChi).sort();
    var decs = Object.keys(s.theoThapNien).map(Number).sort(function (a, b) { return a - b; });
    var html = "<h1>" + esc(t("stat.tieu_de")) + '</h1><p class="note">' + esc(t("stat.chi_tinh")) + '</p><section class="tiles">' +
      [[s.tong, "stat.so_nguoi"], [s.song, "p.con_song"], [s.mat, "p.da_mat"], [s.tuoiTho.tb || "–", "stat.tuoi_tho_tb"], [s.nhieuVoChong, "stat.nhieu_vc"]].map(function (x) { return '<div class="tile"><b>' + esc(x[0]) + "</b><span>" + esc(t(x[1])) + "</span></div>"; }).join("") + "</section>" +
      '<div class="grid2"><div class="card"><h2>' + esc(t("stat.theo_doi")) + "</h2>" + bars(dois.map(function (d) { return [d ? t("p.doi") + " " + d : t("p.chua_ro"), s.theoDoi[d]]; })) + '</div><div class="card"><h2>' + esc(t("stat.theo_chi")) + "</h2>" + bars(chis.map(function (c) { return [c || t("p.chua_ro"), s.theoChi[c]]; })) + "</div>" +
      '<div class="card"><h2>' + esc(t("p.gioi_tinh")) + "</h2>" + bars([[t("p.nam"), s.nam], [t("p.nu"), s.nu]]) + '</div><div class="card"><h2>' + esc(t("p.muc_chac")) + "</h2>" + bars(["da_xac_minh", "chua_chac", "truyen_mieng"].map(function (k) { return [t("chac." + k), s.chacChan[k]]; })) + "</div>" +
      '<div class="card"><h2>' + esc(t("stat.tuoi_tho")) + "</h2>" + (decs.length ? bars(decs.map(function (d) { var a = s.theoThapNien[d]; return [d + "s", Math.round(a.reduce(function (x, y) { return x + y; }, 0) / a.length * 10) / 10]; })) : '<p class="muted">' + esc(t("stat.chua_du")) + "</p>") + '<p class="muted">' + esc(t("stat.tuoi_tho_ghi_chu", { n: s.tuoiTho.n })) + (s.tuoiTho.maxId ? " " + esc(t("stat.cao_nhat")) + ": " + U.link(s.tuoiTho.maxId) + " (" + s.tuoiTho.max + ")" : "") + "</p></div></div>";
    return { title: t("stat.tieu_de"), html: html };
  };

  // ---------- Ảnh: IndexedDB (bản hiển thị và bản gốc tách riêng) ----------
  var memImg = {}, dbp = null;
  function idb() { if (dbp) return dbp; dbp = new Promise(function (res) { try { var rq = indexedDB.open("gp-media", 1); rq.onupgradeneeded = function () { rq.result.createObjectStore("img"); }; rq.onsuccess = function () { res(rq.result); }; rq.onerror = function () { res(null); }; } catch (e) { res(null); } }); return dbp; }
  function idbPut(key, blob) { memImg[key] = blob; return idb().then(function (db) { return new Promise(function (res) { if (!db) return res(false); try { var tx = db.transaction("img", "readwrite"); tx.objectStore("img").put(blob, key); tx.oncomplete = function () { res(true); }; tx.onerror = function () { res(false); }; } catch (e) { res(false); } }); }); }
  function idbGet(key) { if (memImg[key]) return Promise.resolve(memImg[key]); return idb().then(function (db) { return new Promise(function (res) { if (!db) return res(null); try { var rq = db.transaction("img").objectStore("img").get(key); rq.onsuccess = function () { res(rq.result || null); }; rq.onerror = function () { res(null); }; } catch (e) { res(null); } }); }); }
  GP.img = { put: idbPut, get: idbGet };
  function loadImage(file) { return new Promise(function (res, rej) { var u = URL.createObjectURL(file), im = new Image(); im.onload = function () { res({ im: im, url: u }); }; im.onerror = function () { rej(new Error("anh_loi")); }; im.src = u; }); }
  function scaled(im, max, mark) {
    var k = Math.min(1, max / Math.max(im.naturalWidth, im.naturalHeight)), w = Math.round(im.naturalWidth * k), h = Math.round(im.naturalHeight * k), c = document.createElement("canvas"); c.width = w; c.height = h;
    var x = c.getContext("2d"); x.drawImage(im, 0, 0, w, h);
    if (mark) { var fs = Math.max(12, Math.round(w / 38)), txt = "© " + S.S.data.settings.tac_gia + " · " + t("site.ten"); x.font = "600 " + fs + "px sans-serif"; x.textAlign = "right"; x.lineWidth = Math.max(2, fs / 6); x.strokeStyle = "rgba(0,0,0,.55)"; x.fillStyle = "rgba(255,255,255,.85)"; x.strokeText(txt, w - fs * 0.6, h - fs * 0.7); x.fillText(txt, w - fs * 0.6, h - fs * 0.7); }
    return c;
  }
  function blobOf(c, q) { return new Promise(function (res) { c.toBlob(res, "image/jpeg", q); }); }
  var gal = { loai: "" };
  function mediaVisible(m) { return evVisible(m); }
  P["phong-anh"] = function () {
    var items = S.S.data.media.filter(mediaVisible).filter(function (m) { return !gal.loai || m.loai === gal.loai; });
    var cl = function (k) { return S.S.data.media.filter(function (m) { return mediaVisible(m) && m.loai === k; }).length; };
    var html = "<h1>" + esc(t("anh.tieu_de")) + '</h1><p>' + esc(t("anh.mo_ta")) + '</p>' + U.sumTiles([{ ico: "🖼️", n: cl("anh"), label: t("anh.l_anh"), c: 6 }, { ico: "📜", n: cl("gia_pha_co"), label: t("anh.l_gia_pha_co"), c: 4 }, { ico: "📄", n: cl("tu_lieu"), label: t("anh.l_tu_lieu"), c: 1 }], "compact") + '<div class="row"><div><label class="lab" for="g-loai">' + esc(t("anh.loai")) + '</label><select id="g-loai" data-on="gloai">' + opt("", t("l.tat_ca"), gal.loai) + ["anh", "tu_lieu", "gia_pha_co"].map(function (k) { return opt(k, t("anh.l_" + k), gal.loai); }).join("") + "</select></div>" + (U.canWrite() ? '<button type="button" class="btn primary" data-act="g-new">+ ' + esc(t("anh.them")) + "</button>" : "") + '</div><div id="g-form"></div><ul class="gal">' +
      (items.length ? items.map(function (m) { return '<li><button type="button" class="gitem" data-act="g-open" data-id="' + esc(m.id) + '"><img src="' + esc(m.thumb || m.duong_dan_hien_thi || "") + '" alt="' + esc(m.tieu_de + (m.nam ? ", " + m.nam : "")) + '" loading="lazy"><span class="gt">' + esc(m.tieu_de) + "</span></button></li>"; }).join("") : '<li class="muted">' + esc(t("l.khong_thay")) + "</li>") + '</ul><div id="g-view"></div>';
    return { title: t("anh.tieu_de"), html: html };
  };
  U.ons.gloai = function (el) { gal.loai = el.value; U.rerender(); };
  U.acts["g-new"] = function () {
    document.getElementById("g-form").innerHTML = '<form class="card" data-submit="g-save"><h2>' + esc(t("anh.them")) + '</h2><label class="lab" for="g-file">' + esc(t("anh.chon_tep")) + '</label><input class="inp" id="g-file" name="file" type="file" accept="image/*" required>' +
      '<p class="muted">' + esc(t("anh.ghi_chu_luu")) + '</p><div class="filters"><div><label class="lab" for="g-tt">' + esc(t("anh.tieu_de_anh")) + ' *</label><input class="inp" id="g-tt" name="tieu_de" required></div><div><label class="lab" for="g-ai">' + esc(t("anh.ai")) + '</label><input class="inp" id="g-ai" name="ai"></div><div><label class="lab" for="g-od">' + esc(t("anh.o_dau")) + '</label><input class="inp" id="g-od" name="o_dau"></div><div><label class="lab" for="g-nam">' + esc(t("anh.nam")) + '</label><input class="inp" id="g-nam" name="nam"></div>' +
      '<div><label class="lab" for="g-l">' + esc(t("anh.loai")) + '</label><select id="g-l" name="loai">' + ["anh", "tu_lieu", "gia_pha_co"].map(function (k) { return opt(k, t("anh.l_" + k), "anh"); }).join("") + '</select></div><div><label class="lab" for="g-m">' + esc(t("p.muc_hien_thi")) + '</label><select id="g-m" name="muc_hien_thi">' + ["rieng_tu", "gia_toc", "cong_khai"].map(function (k) { return opt(k, t("hien." + k), "rieng_tu"); }).join("") + '</select></div></div><div class="row"><button class="btn primary" type="submit">' + esc(t("c.luu")) + '</button></div><p id="g-st" class="muted" role="status"></p></form>';
  };
  U.ons["g-save"] = function (f) {
    var file = f.elements.file.files[0]; if (!file) return;
    if (file.size > 20 * 1024 * 1024) { U.toast(t("anh.qua_lon"), true); return; }
    var st = document.getElementById("g-st"); st.textContent = t("anh.dang_xu_ly");
    var id = S.uid("m"), d = new FormData(f);
    loadImage(file).then(function (r) {
      var disp = scaled(r.im, 1600, true), th = scaled(r.im, 320, true);
      return Promise.all([blobOf(disp, 0.82), Promise.resolve(th.toDataURL("image/jpeg", 0.75))]).then(function (x) {
        return idbPut(id + ":hien_thi", x[0]).then(function () { return idbPut(id + ":goc", file); }).then(function () {
          var r2 = U.attempt(function () { return S.addMedia({ id: id, tieu_de: d.get("tieu_de"), ai: d.get("ai"), o_dau: d.get("o_dau"), nam: d.get("nam"), nguon: d.get("nguon"), loai: d.get("loai"), muc_hien_thi: d.get("muc_hien_thi"), thumb: x[1], co_ban_goc: true, kich_thuoc_goc: file.size }); });
          if (r2.ok) { U.toast(t("c.da_luu")); U.rerender(); }
        });
      });
    }).catch(function () { st.textContent = ""; U.toast(t("anh.loi"), true); });
  };
  U.acts["g-open"] = function (el) {
    var m = S.S.data.media.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0], box = document.getElementById("g-view");
    var meta = [[t("anh.ai"), m.ai], [t("anh.o_dau"), m.o_dau], [t("anh.nam"), m.nam], [t("p.muc_hien_thi"), t("hien." + (m.muc_hien_thi || "rieng_tu"))]].filter(function (r) { return nonEmpty(r[1]); });
    box.innerHTML = '<div class="card lightbox"><img id="g-big" src="' + esc(m.duong_dan_hien_thi || m.thumb || "") + '" alt="' + esc(m.tieu_de) + '"><h2>' + esc(m.tieu_de) + '</h2><dl class="kv">' + meta.map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("") + '</dl><div class="row">' + (m.co_ban_goc && admin() ? '<button type="button" class="btn" data-act="g-goc" data-id="' + esc(m.id) + '">' + esc(t("anh.tai_goc")) + "</button>" : "") + (U.canWrite() ? '<button type="button" class="btn" data-act="g-hide" data-id="' + esc(m.id) + '">' + esc(t("c.an")) + "</button>" : "") + '<button type="button" class="btn" data-act="g-close">' + esc(t("c.dong")) + "</button></div></div>";
    box.scrollIntoView({ block: "center" });
    if (m.co_ban_goc) idbGet(m.id + ":hien_thi").then(function (b) { var im = document.getElementById("g-big"); if (b && im) im.src = URL.createObjectURL(b); });
  };
  U.acts["g-close"] = function () { document.getElementById("g-view").innerHTML = ""; };
  U.acts["g-hide"] = function (el) { var r = U.attempt(function () { S.hideRow("media", el.getAttribute("data-id"), true); }); if (r.ok) U.rerender(); };
  U.acts["g-goc"] = function (el) { var id = el.getAttribute("data-id"); idbGet(id + ":goc").then(function (b) { if (!b) { U.toast(t("anh.khong_goc"), true); return; } var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = id + ".jpg"; document.body.appendChild(a); a.click(); a.remove(); }); };

  // ---------- Dòng thời gian và di tích: bảng chung events/sites ----------
  function rowForm(table, fields, row, titleKey) {
    row = row || {};
    return '<form class="card" data-submit="row-save" data-table="' + table + '"><h2>' + esc(t(titleKey)) + '</h2><input type="hidden" name="id" value="' + esc(row.id || "") + '"><div class="filters">' + fields.map(function (f) {
      if (f[0] === "nguon" || f[0] === "muc_chac_chan") return '<input type="hidden" name="' + f[0] + '" value="' + esc(row[f[0]] || f[3] || "") + '">';
      if (f[1] === "area") return '<div class="full"><label class="lab" for="rf-' + f[0] + '">' + esc(t("rf." + f[0])) + '</label><textarea class="inp" id="rf-' + f[0] + '" name="' + f[0] + '" rows="4">' + esc(row[f[0]] || "") + "</textarea></div>";
      if (f[1] === "sel") return '<div><label class="lab" for="rf-' + f[0] + '">' + esc(t("rf." + f[0])) + '</label><select id="rf-' + f[0] + '" name="' + f[0] + '">' + f[2].map(function (o) { return opt(o[0], o[1], row[f[0]] || f[3]); }).join("") + "</select></div>";
      return '<div><label class="lab" for="rf-' + f[0] + '">' + esc(t("rf." + f[0])) + '</label><input class="inp" id="rf-' + f[0] + '" name="' + f[0] + '" value="' + esc(row[f[0]] == null ? "" : row[f[0]]) + '"' + (f[1] === "num" ? ' type="number" step="any"' : "") + "></div>";
    }).join("") + '</div><div class="row"><button class="btn primary" type="submit">' + esc(t("c.luu")) + "</button></div></form>";
  }
  var CHAC = ["da_xac_minh", "chua_chac", "truyen_mieng"].map(function (k) { return [k, t("chac." + k)]; });
  function chacSel() { return ["chac", "sel", ["da_xac_minh", "chua_chac", "truyen_mieng"].map(function (k) { return [k, t("chac." + k)]; }), "chua_chac"]; }
  function hienSel() { return ["muc_hien_thi", "sel", ["rieng_tu", "gia_toc", "cong_khai"].map(function (k) { return [k, t("hien." + k)]; }), "gia_toc"]; }
  function evFields() { return [["nam_hien_thi", "txt"], ["nam_sap_xep", "num"], ["tieu_de", "txt"], ["noi_dung", "area"], ["nguon", "txt"], ["muc_chac_chan", "sel", ["da_xac_minh", "chua_chac", "truyen_mieng"].map(function (k) { return [k, t("chac." + k)]; }), "chua_chac"], hienSel()]; }
  function siteFields() { return [["ten", "txt"], ["loai", "sel", ["nha_tho_to", "tu_duong", "nha_tho", "mo_to", "mo", "khu_lang_mo", "chua_dinh", "nha_cu", "khac"].map(function (k) { return [k, t("loai." + k)]; }), "tu_duong"], ["nam_xay", "txt"], ["dia_chi", "area"], ["duong_di", "area"], ["gio_tham_vieng", "txt"], ["lien_he", "txt"], ["tinh_thanh", "txt"], ["dien_tich", "txt"], ["so_mo", "txt"], ["so_cho_trong", "txt"], ["duy_tu", "area"], ["lien_he_ten", "txt"], ["lien_he_tuoi", "txt"], ["lien_he_sdt", "txt"], ["lien_he_qh", "txt"], ["gioi_thieu", "area"], ["nguon", "txt"], ["muc_chac_chan", "sel", ["da_xac_minh", "chua_chac", "truyen_mieng"].map(function (k) { return [k, t("chac." + k)]; }), "chua_chac"], hienSel()]; }
  var FIELDS_OF = { events: evFields, sites: siteFields };
  U.acts["row-new"] = function (el) { var tb = el.getAttribute("data-table"); document.getElementById("row-form").innerHTML = rowForm(tb, FIELDS_OF[tb](), null, tb === "events" ? "tl.them" : "dt.them"); };
  U.acts["row-edit"] = function (el) { var tb = el.getAttribute("data-table"), r = S.S.data[tb].filter(function (x) { return x.id === el.getAttribute("data-id"); })[0]; document.getElementById("row-form").innerHTML = rowForm(tb, FIELDS_OF[tb](), r, "c.sua"); document.getElementById("row-form").scrollIntoView({ block: "center" }); };
  U.acts["row-hide"] = function (el) { var r = U.attempt(function () { S.hideRow(el.getAttribute("data-table"), el.getAttribute("data-id"), el.getAttribute("data-h") === "1"); }); if (r.ok) U.rerender(); };
  U.ons["row-save"] = function (f) {
    var d = new FormData(f), tb = f.getAttribute("data-table"), row = {}; FIELDS_OF[tb]().forEach(function (x) { row[x[0] === "chac" ? "muc_chac_chan" : x[0]] = d.get(x[0]); });
    if (tb === "events") { row.nam_sap_xep = +row.nam_sap_xep || 0; if (!row.nam_hien_thi) row.nam_hien_thi = String(row.nam_sap_xep); }
    if (d.get("id")) row.id = d.get("id"); if (!(row.tieu_de || row.ten)) { U.toast(t("val.thieu_ten"), true); return; }
    var r = U.attempt(function () { return S.saveRow(tb, row); }); if (r.ok) { U.toast(t("c.da_luu")); U.rerender(); }
  };
  P["dong-thoi-gian"] = function () {
    var V = U.view(), custom = S.S.data.events.filter(evVisible).map(function (e) { return { y: e.nam_sap_xep, label: e.nam_hien_thi, title: e.tieu_de, body: e.noi_dung, src: e.nguon, chac: e.muc_chac_chan, e: e }; });
    var auto = []; V.list.forEach(function (p) { if (p.level === "full" && p.con_song === false && !p.da_an) { if (p.sinh && p.sinh.nam) auto.push({ y: p.sinh.nam, label: U.yearTxt(p.sinh), title: t("tl.sinh") + ": " + U.fullName(p), id: p.id, auto: true }); if (p.mat && p.mat.nam) auto.push({ y: p.mat.nam, label: U.yearTxt(p.mat), title: t("tl.mat") + ": " + U.fullName(p), id: p.id, auto: true }); } });
    var nat = tl.nation ? (GP.LICHSU || []).map(function (n) { return { y: n.y, label: String(n.y), title: n.title, body: n.body, nation: true }; }) : [];
    var all = custom.concat(document.getElementById ? (tl.auto ? auto : []) : []).concat(nat).sort(function (a, b) { return a.y - b.y; });
    var html = "<h1>" + esc(t("tl.tieu_de")) + '</h1><div class="row"><label class="chk"><input type="checkbox" data-on="tlauto"' + (tl.auto ? " checked" : "") + "> " + esc(t("tl.hien_sinh_mat")) + '</label><label class="chk"><input type="checkbox" data-on="tlnation"' + (tl.nation ? " checked" : "") + "> " + esc(t("tl.hien_ls")) + "</label>" + (admin() ? '<button type="button" class="btn primary" data-act="row-new" data-table="events">+ ' + esc(t("tl.them")) + "</button>" : "") + '</div><div id="row-form"></div><ol class="tl">' +
      all.map(function (x) { return '<li class="' + (x.auto ? "auto" : x.nation ? "nation" : "") + '"><time>' + esc(x.label) + "</time><div><b>" + (x.id ? U.link(x.id, x.title) : esc(x.title)) + "</b>" + (x.body ? "<p>" + esc(x.body) + "</p>" : "") + (x.e && admin() ? '<div class="row tight"><button type="button" class="btn small" data-act="row-edit" data-table="events" data-id="' + esc(x.e.id) + '">' + esc(t("c.sua")) + '</button><button type="button" class="btn small" data-act="row-hide" data-table="events" data-id="' + esc(x.e.id) + '" data-h="1">' + esc(t("c.an")) + "</button></div>" : "") + "</div></li>"; }).join("") + "</ol>";
    return { title: t("tl.tieu_de"), html: html };
  };
  var tl = { auto: true, nation: true };
  U.ons.tlnation = function (el) { tl.nation = el.checked; U.rerender(); };
  U.ons.tlauto = function (el) { tl.auto = el.checked; U.rerender(); };
  P["di-tich"] = function () {
    var items = S.S.data.sites.filter(evVisible);
    var html = "<h1>" + esc(t("dt.tieu_de")) + "</h1>" + (admin() ? '<p><button type="button" class="btn primary" data-act="row-new" data-table="sites">+ ' + esc(t("dt.them")) + "</button></p>" : "") + '<div id="row-form"></div>' +
      (items.length ? items.map(function (s) { return '<article class="card"><h2>' + esc(s.ten) + "</h2><p>" + U.badge(t("loai." + s.loai), "") + (s.nam_xay ? " " + esc(t("dt.nam_xay")) + ": " + esc(s.nam_xay) : "") + "</p>" + (s.dia_chi ? "<p>" + esc(t("rf.dia_chi")) + ": " + esc(s.dia_chi) + "</p>" : "") + "<p>" + esc(s.gioi_thieu) + '</p>' + (typeof s.vi_do === "number" ? '<p><a class="btn small" href="#ban-do" data-act="map-sel" data-id="' + esc(s.id) + '">🗺️ ' + esc(t("map.xem_ban_do")) + "</a></p>" : "") + (admin() ? '<div class="row tight"><button type="button" class="btn small" data-act="row-edit" data-table="sites" data-id="' + esc(s.id) + '">' + esc(t("c.sua")) + '</button><button type="button" class="btn small" data-act="row-hide" data-table="sites" data-id="' + esc(s.id) + '" data-h="1">' + esc(t("c.an")) + "</button></div>" : "") + "</article>"; }).join("") : '<p class="muted">' + esc(t("l.khong_thay")) + "</p>");
    return { title: t("dt.tieu_de"), html: html };
  };

  // ---------- Bài viết ----------
  // Văn bản có tiêu đề (## ), gạch đầu dòng (- ) và danh sách đánh số (1. ); đoạn thường giữ nguyên
  function inl(x) { return esc(x).replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/(^|[^*])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>"); }
  function paras(s) {
    var out = [], list = null, ord = false, tbl = null;
    function close() { if (list) { out.push((ord ? "<ol>" : "<ul>") + list.join("") + (ord ? "</ol>" : "</ul>")); list = null; } if (tbl) { out.push('<div class="tblw"><table class="dtab"><thead>' + tbl[0] + "</thead><tbody>" + tbl.slice(1).join("") + "</tbody></table></div>"); tbl = null; } }
    String(s || "").split("\n").forEach(function (ln) {
      var m;
      if ((m = /^(#{1,3})\s+(.*)$/.exec(ln))) { close(); var hl = Math.max(2, m[1].length); out.push("<h" + hl + ">" + inl(m[2]) + "</h" + hl + ">"); }
      else if ((m = /^\s*>\s?(.*)$/.exec(ln))) { close(); out.push('<p class="note">' + inl(m[1]) + "</p>"); }
      else if (/^\s*\|.*\|\s*$/.test(ln)) {
        var cells = ln.trim().replace(/^\||\|$/g, "").split("|");
        if (cells.every(function (c) { return /^\s*:?-{2,}:?\s*$/.test(c); })) return;
        if (list) close();
        var first = !tbl; if (!tbl) tbl = [];
        tbl.push("<tr>" + cells.map(function (c) { return (first ? "<th>" : "<td>") + inl(c.trim()) + (first ? "</th>" : "</td>"); }).join("") + "</tr>");
      }
      else if ((m = /^\s*-\s+(.*)$/.exec(ln))) { if (tbl) close(); if (!list || ord) { close(); list = []; ord = false; } list.push("<li>" + inl(m[1]) + "</li>"); }
      else if ((m = /^\s*\d+\.\s+(.*)$/.exec(ln))) { if (tbl) close(); if (!list || !ord) { close(); list = []; ord = true; } list.push("<li>" + inl(m[1]) + "</li>"); }
      else if (!ln.trim()) close();
      else { close(); out.push("<p>" + inl(ln) + "</p>"); }
    });
    close(); return out.join("");
  }
  /** Nạp sẵn các văn bản dòng họ (sưu tầm) vào Bài viết một lần; Quản trị xoá đi thì không nạp lại */
  function seedDocs() {
    var d = S.S.data, set = d.settings = d.settings || {}; if (!GP.VANBAN) return;
    var seen = set.vanban_ver || (set.vanban_v2 ? 2 : set.vanban_v1 ? 1 : 0), top = 4; if (seen >= top) return;
    d.articles = d.articles || []; var admin = S.S.viewer.role === "admin";
    GP.VANBAN.forEach(function (v) { if ((v.v || 1) <= seen || d.articles.some(function (x) { return x.id === v.id; })) return; var row = JSON.parse(JSON.stringify(v)); if (admin) S.saveRow("articles", row); else d.articles.push(row); });
    // v4: gộp bài trùng — lưu trữ (ẩn) các bản tóm lược/trùng nội dung nếu Quản trị chưa sửa; đổi tên bản chi tiết
    var OBS = { "vb-quy-uoc": 1875, "vb-quy-che": 1522, "vb-lich-sinh-hoat": 1275, "pl-viec-nen-lam": 1305 }, REN = { "vb-quy-uoc-ct": ["Quy ước dòng họ Tống — sườn chi tiết (dự thảo)", "Quy ước dòng họ Tống (dự thảo)"], "vb-quy-che-ct": ["Quy chế Hội đồng Gia tộc và Quỹ — sườn chi tiết (dự thảo)", "Quy chế Hội đồng Gia tộc và Quỹ (dự thảo)"] };
    if (seen < 4) d.articles.forEach(function (a) {
      var ch = null;
      if (OBS[a.id] && String(a.noi_dung || "").length === OBS[a.id] && a.trang_thai !== "luu_tru") ch = { id: a.id, trang_thai: "luu_tru" };
      else if (REN[a.id] && a.tieu_de === REN[a.id][0]) ch = { id: a.id, tieu_de: REN[a.id][1] };
      if (!ch) return; if (admin) S.saveRow("articles", ch); else Object.assign(a, ch);
    });
    if (admin) S.saveSettings({ vanban_v1: 1, vanban_v2: 1, vanban_ver: top });
  }
  /** Đoạn trích gọn: bỏ ký hiệu markdown, bỏ khung ghi chú đầu bài */
  function excerpt(a) {
    if (a.tom_tat) return a.tom_tat;
    var ls = String(a.noi_dung || "").split("\n").map(function (x) { return x.trim(); }).filter(function (x) { return x && !/^[>#|]/.test(x) && !/^-{3,}$/.test(x); });
    var tx = (ls[0] || String(a.noi_dung || "")).replace(/\*\*?/g, "").replace(/^[-\d.\s]+/, "").replace(/\s+/g, " ");
    return tx.length > 150 ? tx.slice(0, 147).replace(/\s\S*$/, "") + "…" : tx;
  }
  function srcNote(a) { return a.nguon ? '<p class="srcnote">📚 <b>' + esc(t("bv.nguon")) + ":</b> " + esc(a.nguon) + "</p>" : ""; }
  P["bai-viet"] = function () {
    seedDocs(); var role = S.S.viewer.role, items = S.S.data.articles.filter(function (a) { return a.nhom !== "phap_luat" && a.nhom !== "danh_nhan" && a.trang_thai !== "luu_tru" && (a.trang_thai === "da_duyet" || role === "admin" || role === "editor"); }).sort(function (a, b) { return (b.nhom === "van_ban") - (a.nhom === "van_ban") || (a.thu_tu || 99) - (b.thu_tu || 99); });
    var html = "<h1>" + esc(t("bv.tieu_de")) + "</h1>" + (U.canWrite() ? '<p><a class="btn primary" href="#bai-moi">+ ' + esc(t("bv.viet")) + "</a></p>" : "") + '<ul class="plain arts">' + items.map(function (a) { return '<li class="card"><h2><a href="#bai-' + esc(a.id) + '">' + esc(a.tieu_de) + "</a></h2>" + (a.nhom === "van_ban" ? U.badge(t("bv.van_ban"), "ok") + " " : "") + (a.nguon && /^Sưu tầm/.test(a.nguon) ? U.badge(t("bv.suu_tam"), "") : "") + (a.trang_thai !== "da_duyet" ? U.badge(t("bv.nhap"), "warn") : "") + "<p>" + esc(excerpt(a)) + "</p></li>"; }).join("") + "</ul>";
    return { title: t("bv.tieu_de"), html: html };
  };
  P.bai = function (id) {
    seedDocs(); var role = S.S.viewer.role;
    if (id === "moi") return articleForm(null);
    var a = S.S.data.articles.filter(function (x) { return x.id === id; })[0];
    if (!a || (a.nhom === "danh_nhan" && role !== "admin" && role !== "editor") || (a.trang_thai !== "da_duyet" && role !== "admin" && role !== "editor")) return { title: t("p.khong_co"), html: '<div class="card"><h1>' + esc(t("p.khong_co")) + '</h1><p><a class="btn" href="#bai-viet">←</a></p></div>' };
    var pl = a.nhom === "phap_luat", dn = a.nhom === "danh_nhan"; return { title: a.tieu_de, html: '<p><a class="btn" href="' + (pl ? "#phap-luat" : dn ? "#danh-nhan" : "#bai-viet") + '">← ' + esc(t(pl ? "pl.tieu_de" : dn ? "dn.tieu_de" : "bv.tieu_de")) + '</a></p><article class="card prose"><h1>' + esc(a.tieu_de) + "</h1>" + (a.trang_thai !== "da_duyet" ? U.badge(t("bv.nhap"), "warn") : U.badge(t("bv.da_duyet") + (a.nguoi_duyet ? ": " + a.nguoi_duyet : ""), "ok")) + srcNote(a) + paras(a.noi_dung) + (U.canWrite() ? '<div class="row"><button type="button" class="btn" data-act="art-edit" data-id="' + esc(a.id) + '">' + esc(t("c.sua")) + "</button>" + (admin() && a.trang_thai !== "da_duyet" ? '<button type="button" class="btn primary" data-act="art-ok" data-id="' + esc(a.id) + '">' + esc(t("bv.duyet")) + "</button>" : "") + "</div>" : "") + '</article><div id="art-form"></div>' };
  };
  P["phap-luat"] = function () {
    seedDocs(); var role = S.S.viewer.role, items = S.S.data.articles.filter(function (a) { return a.nhom === "phap_luat" && a.trang_thai !== "luu_tru" && (a.trang_thai === "da_duyet" || role === "admin" || role === "editor"); }).sort(function (a, b) { return (a.thu_tu || 99) - (b.thu_tu || 99); });
    var html = "<h1>⚖️ " + esc(t("pl.tieu_de")) + '</h1><p class="note">' + esc(t("pl.canh_bao")) + "</p><p>" + esc(t("pl.mo_ta")) + '</p><div class="plgrid">' + items.map(function (a, i) { return '<a class="card plc" href="#bai-' + esc(a.id) + '"><span class="pln">' + (i + 1) + "</span><h2>" + esc(a.tieu_de) + "</h2><p>" + esc(excerpt(a)) + "</p></a>"; }).join("") + "</div>" + (items.length ? "" : '<p class="muted">' + esc(t("pl.chua_co")) + "</p>");
    return { title: t("pl.tieu_de"), html: html };
  };
  function articleForm(a) {
    a = a || { tieu_de: "", noi_dung: "", trang_thai: "nhap" };
    return { title: t("bv.viet"), html: '<form class="card" data-submit="art-save"><h1>' + esc(t("bv.viet")) + '</h1><input type="hidden" name="id" value="' + esc(a.id || "") + '"><label class="lab" for="a-t">' + esc(t("bv.ten")) + '</label><input class="inp" id="a-t" name="tieu_de" required value="' + esc(a.tieu_de) + '"><label class="lab" for="a-n">' + esc(t("bv.noi_dung")) + '</label><textarea class="inp" id="a-n" name="noi_dung" rows="10">' + esc(a.noi_dung) + "</textarea>" + (admin() ? '<label class="lab" for="a-s">' + esc(t("bv.trang_thai")) + '</label><select id="a-s" name="trang_thai">' + opt("nhap", t("bv.nhap"), a.trang_thai) + opt("da_duyet", t("bv.da_duyet"), a.trang_thai) + "</select>" : '<p class="muted">' + esc(t("bv.cho_duyet")) + "</p>") + '<div class="row"><button class="btn primary" type="submit">' + esc(t("c.luu")) + '</button><a class="btn" href="#bai-viet">' + esc(t("c.huy")) + "</a></div></form>" };
  }
  U.acts["art-edit"] = function (el) { var a = S.S.data.articles.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0]; document.getElementById("art-form").innerHTML = articleForm(a).html; };
  U.acts["art-ok"] = function (el) { var a = S.S.data.articles.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0], r = U.attempt(function () { S.saveRow("articles", Object.assign({}, a, { trang_thai: "da_duyet" })); }); if (r.ok) { U.toast(t("bv.da_duyet")); U.rerender(); } };
  U.ons["art-save"] = function (f) {
    var d = new FormData(f), row = { tieu_de: d.get("tieu_de"), noi_dung: d.get("noi_dung"), trang_thai: d.get("trang_thai") || "nhap", nguoi_duyet: "" }; if (d.get("id")) row.id = d.get("id");
    var r = U.attempt(function () { return S.saveRow("articles", row); }); if (r.ok) { U.toast(t("c.da_luu")); location.hash = "#bai-viet"; }
  };

  // ---------- Ủng hộ và vinh danh ----------
  P["ung-ho"] = function () {
    var st = S.S.data.settings, don = S.S.data.donations.filter(function (d) { return !d.da_an; }), honor = don.filter(function (d) { return d.dong_y_hien_ten; });
    var html = "<h1>" + esc(t("uh.tieu_de")) + '</h1><p class="note">' + esc(t("uh.khong_thanh_toan")) + '</p><section class="card"><h2>' + esc(t("uh.thong_tin")) + "</h2><p>" + esc(st.ung_ho_thong_tin).replace(/\n/g, "<br>") + '</p></section><section class="card"><h2>' + esc(t("uh.vinh_danh")) + "</h2>" +
      (honor.length ? '<ul class="plain">' + honor.map(function (d) { return "<li><b>" + esc(d.ten) + "</b>" + (d.loi_nhan ? ' <span class="muted">— ' + esc(d.loi_nhan) + "</span>" : "") + (admin() ? ' <span class="muted">(' + esc(Number(d.so_tien).toLocaleString("vi-VN")) + " đ · " + esc(d.ngay) + ")</span>" : "") + "</li>"; }).join("") + "</ul>" : '<p class="muted">' + esc(t("uh.chua_co")) + "</p>") + '<p class="muted">' + esc(t("uh.chi_vinh_danh")) + "</p></section>";
    if (admin()) {
      html += '<section class="card"><h2>' + esc(t("uh.so_ghi")) + '</h2><div class="tblw"><table class="tbl"><thead><tr><th>' + esc(t("uh.ten")) + "</th><th>" + esc(t("uh.so_tien")) + "</th><th>" + esc(t("uh.ngay")) + "</th><th>" + esc(t("uh.hien_ten")) + '</th><th></th></tr></thead><tbody>' + don.map(function (d) { return "<tr><td>" + esc(d.ten) + "</td><td>" + esc(Number(d.so_tien).toLocaleString("vi-VN")) + "</td><td>" + esc(d.ngay) + "</td><td>" + esc(d.dong_y_hien_ten ? t("c.co") : t("c.chua")) + '</td><td><button type="button" class="btn small" data-act="don-hide" data-id="' + esc(d.id) + '">' + esc(t("c.an")) + "</button></td></tr>"; }).join("") + "</tbody></table></div>" +
        '<form data-submit="don-save"><h3>' + esc(t("uh.them")) + '</h3><div class="filters"><div><label class="lab" for="d-t">' + esc(t("uh.ten")) + '</label><input class="inp" id="d-t" name="ten" required></div><div><label class="lab" for="d-s">' + esc(t("uh.so_tien")) + '</label><input class="inp" id="d-s" name="so_tien" type="number" min="0"></div><div><label class="lab" for="d-n">' + esc(t("uh.ngay")) + '</label><input class="inp" id="d-n" name="ngay" type="date"></div><div><label class="lab" for="d-l">' + esc(t("uh.loi_nhan")) + '</label><input class="inp" id="d-l" name="loi_nhan"></div></div><label class="chk"><input type="checkbox" name="dong_y"> ' + esc(t("uh.dong_y")) + '</label><div class="row"><button class="btn primary" type="submit">' + esc(t("c.luu")) + "</button></div></form></section>";
    }
    return { title: t("uh.tieu_de"), html: html };
  };
  U.ons["don-save"] = function (f) { var d = new FormData(f), r = U.attempt(function () { return S.saveRow("donations", { ten: d.get("ten"), so_tien: +d.get("so_tien") || 0, ngay: d.get("ngay"), loi_nhan: d.get("loi_nhan"), dong_y_hien_ten: !!d.get("dong_y"), da_an: false }); }); if (r.ok) { U.toast(t("c.da_luu")); U.rerender(); } };
  U.acts["don-hide"] = function (el) { var r = U.attempt(function () { S.hideRow("donations", el.getAttribute("data-id"), true); }); if (r.ok) U.rerender(); };

  // ảnh mẫu (SVG nhúng, không có ảnh thật)
  GP.sampleMedia = function () {
    function svg(c1, c2, txt) { return "data:image/svg+xml;utf8," + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" width="640" height="420" viewBox="0 0 640 420"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="' + c1 + '"/><stop offset="1" stop-color="' + c2 + '"/></linearGradient></defs><rect width="640" height="420" fill="url(#g)"/><text x="320" y="215" font-family="sans-serif" font-size="44" fill="#fff" text-anchor="middle" opacity=".92">' + txt + '</text><text x="620" y="400" font-family="sans-serif" font-size="18" fill="#fff" text-anchor="end" opacity=".8">© Kent · Gia phả Họ Tống</text></svg>'); }
    return [
      { id: "m_mau1", tieu_de: "Ảnh mẫu: từ đường", ai: "(mẫu)", o_dau: "Địa điểm mẫu", nam: "1990", nguon: "Dữ liệu mẫu giả", loai: "anh", muc_hien_thi: "cong_khai", thumb: svg("#7a1f1f", "#b8893a", "ẢNH MẪU 1"), duong_dan_hien_thi: svg("#7a1f1f", "#b8893a", "ẢNH MẪU 1"), da_an: false },
      { id: "m_mau2", tieu_de: "Tư liệu mẫu: trang gia phả cổ", ai: "(mẫu)", o_dau: "", nam: "", nguon: "Dữ liệu mẫu giả", loai: "gia_pha_co", muc_hien_thi: "gia_toc", thumb: svg("#4a3a2a", "#8c6d3f", "TƯ LIỆU MẪU"), duong_dan_hien_thi: svg("#4a3a2a", "#8c6d3f", "TƯ LIỆU MẪU"), da_an: false },
      { id: "m_mau3", tieu_de: "Ảnh mẫu: họp họ", ai: "(mẫu)", o_dau: "Nhà mẫu", nam: "2010", nguon: "Dữ liệu mẫu giả", loai: "anh", muc_hien_thi: "gia_toc", thumb: svg("#2f4a3c", "#7a9a6c", "ẢNH MẪU 2"), duong_dan_hien_thi: svg("#2f4a3c", "#7a9a6c", "ẢNH MẪU 2"), da_an: false }
    ];
  };
})(typeof window !== "undefined" ? window : globalThis);
