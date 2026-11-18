/* Giao diện: tiện ích chung, định tuyến, khung trang, ô chọn người, tải tệp. */
(function (root) {
  "use strict";
  var GP = root.GP = root.GP || {}, S = GP.store;
  var U = GP.ui = { pages: {}, acts: {}, ons: {}, V: null, lang: "vi", pk: {} };

  // ---------- Chữ ----------
  function t(key, vars) {
    var s = (GP.STR[U.lang] || {})[key];
    if (s === undefined) s = (GP.STR.vi || {})[key];
    if (s === undefined) { (GP.missing = GP.missing || {})[key] = 1; return key; }
    if (vars) Object.keys(vars).forEach(function (k) { s = s.split("{" + k + "}").join(vars[k]); });
    return s;
  }
  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]; }); }
  function $(sel, el) { return (el || document).querySelector(sel); }
  function $$(sel, el) { return Array.prototype.slice.call((el || document).querySelectorAll(sel)); }
  function lsGet(k) { try { return root.localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { root.localStorage.setItem(k, v); } catch (e) {} }
  var norm = GP.checks.norm;

  // ---------- Dữ liệu được phép thấy (mọi trang chỉ đọc từ đây) ----------
  var cache = null;
  function view() {
    if (cache) return cache;
    var ctx = S.ctx(), list = GP.privacy.visibleList(S.S.data.persons, ctx), by = {};
    list.forEach(function (p) { by[p.id] = p; });
    var ids = by, sp = S.S.data.spouses.filter(function (s) { return !s.da_an && by[s.person_id] && by[s.person_id].level !== "hidden" && (!s.spouse_person_id || by[s.spouse_person_id]); });
    cache = { ctx: ctx, list: list, by: by, spouses: sp, year: ctx.year };
    return cache;
  }
  function invalidate() { cache = null; }
  function fullName(p) { return [p.ho, p.ten_dem, p.ten].filter(Boolean).join(" ").normalize("NFC"); }
  function nickTag(p) { return p && p.level !== "hidden" && p.ten_thuong_goi ? ' <span class="nick">“' + esc(p.ten_thuong_goi) + "”</span>" : ""; }
  U.nickTag = nickTag;
  function nameOf(id) { var p = view().by[id]; if (!p) return t("p.chua_ro"); return p.level === "hidden" ? t("p.da_an_ten") : fullName(p); }
  function link(id, label) { return '<a href="#nguoi-' + esc(id) + '">' + esc(label == null ? nameOf(id) : label) + "</a>"; }
  function canWrite() { return S.S.viewer.role === "admin" || S.S.viewer.role === "editor"; }
  function isAdmin() { return S.S.viewer.role === "admin"; }

  // ---------- Định dạng ----------
  function dmy(d) { return d[0] + "/" + d[1] + "/" + d[2]; }
  function dateTxt(d) {
    if (!d || (!d.nam && !d.thang && !d.ngay)) return "";
    var s = [d.ngay, d.thang, d.nam].filter(Boolean).join("/");
    if (d.den_nam) s = d.nam + "–" + d.den_nam;
    if (d.xap_xi) s = t("d.khoang") + " " + s;
    if (d.lich === "am") s += " (" + t("d.am") + (d.nhuan ? ", " + t("d.nhuan") : "") + ")";
    return s;
  }
  function yearTxt(d) { return d && d.nam ? (d.xap_xi ? "~" : "") + d.nam : ""; }
  function span(p) {
    if (p.level !== "full") return "";
    var s = yearTxt(p.sinh), m = p.con_song === false ? yearTxt(p.mat) : "";
    if (!s && !m) return "";
    return (s || "?") + "–" + (p.con_song === false ? (m || "?") : "");
  }
  function lunarTxt(l) { return l.day + "/" + l.month + (l.leap ? " " + t("d.nhuan") : "") + " " + t("d.am"); }
  function badge(txt, cls) { return '<span class="badge ' + (cls || "") + '">' + esc(txt) + "</span>"; }
  function today() { var n = new Date(Date.now() + 7 * 3600 * 1000 + new Date().getTimezoneOffset() * 60000); return [n.getDate(), n.getMonth() + 1, n.getFullYear()]; } // giờ Việt Nam

  // ---------- Thông báo ----------
  function toast(msg, bad) {
    var el = $("#toast"); el.textContent = msg; el.className = "toast show" + (bad ? " bad" : ""); clearTimeout(toast.t); toast.t = setTimeout(function () { el.className = "toast"; }, 4200);
  }
  function errMsg(e) { return e && e.code ? t("err." + e.code) : String(e && e.message || e); }
  /** Chạy một thao tác ghi, báo lỗi quyền bằng lời thường */
  function attempt(fn) { try { var r = fn(); return { ok: true, v: r }; } catch (e) { toast(errMsg(e), true); return { ok: false, e: e }; } }

  // ---------- Tải tệp (trong khung của artifact việc tải có thể bị chặn nên luôn có khung sao chép) ----------
  function download(name, text, mime) {
    try {
      var blob = text instanceof Uint8Array ? new Blob([text], { type: mime }) : new Blob(["﻿" + text], { type: (mime || "text/plain") + ";charset=utf-8" }), a = document.createElement("a");
      a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
    } catch (e) {}
    return exportBox(name, text);
  }
  function exportBox(name, text) {
    var box = $("#xuat-box"); if (!box) { var mn = $("#main"); if (!mn) return; box = document.createElement("div"); box.id = "xuat-box"; box.className = "card"; mn.appendChild(box); }
    box.hidden = false;
    box.innerHTML = '<h3>' + esc(name) + '</h3><p class="muted">' + esc(t("du.khung_sao_chep")) + '</p><textarea id="xuat-text" readonly rows="8" aria-label="' + esc(name) + '"></textarea><button type="button" class="btn" data-act="copy">' + esc(t("c.sao_chep")) + "</button>";
    $("#xuat-text").value = text; box.scrollIntoView({ block: "nearest" });
  }
  U.acts.copy = function () {
    var ta = $("#xuat-text"); if (!ta) return; ta.select();
    var ok = function () { toast(t("c.da_chep")); };
    try { navigator.clipboard.writeText(ta.value).then(ok, function () { document.execCommand("copy"); ok(); }); } catch (e) { try { document.execCommand("copy"); ok(); } catch (e2) {} }
  };

  // ---------- Ô chọn người (không dấu, bàn phím) ----------
  function picker(id, selId, opts) {
    opts = opts || {};
    var cur = selId && view().by[selId] && view().by[selId].level !== "hidden" ? fullName(view().by[selId]) : (opts.text || "");
    U.pk[id] = { val: selId || null, filter: opts.filter || null, cb: opts.cb || null };
    return '<div class="pk" data-pk="' + esc(id) + '"><input type="search" class="pk-in" id="pk-' + esc(id) + '" autocomplete="off" role="combobox" aria-expanded="false" aria-controls="pkl-' + esc(id) + '" placeholder="' + esc(opts.placeholder || t("c.go_ten")) + '" value="' + esc(cur) + '" aria-label="' + esc(opts.label || t("c.chon_nguoi")) + '">' +
      '<ul class="pk-list" id="pkl-' + esc(id) + '" role="listbox" hidden></ul>' + (selId ? '<button type="button" class="btn small ghost" data-act="pk-clear" data-id="' + esc(id) + '" aria-label="' + esc(t("c.bo_chon")) + '">×</button>' : "") + "</div>";
  }
  function pkSearch(id, q) {
    var st = U.pk[id], nq = norm(q), out = [];
    view().list.forEach(function (p) {
      if (p.level === "hidden" || out.length >= 12) return;
      if (st.filter && !st.filter(p)) return;
      var s = norm(fullName(p) + " " + (p.ten_thuong_goi || ""));
      if (!nq || s.indexOf(nq) >= 0) out.push(p);
    });
    return out;
  }
  function pkChoose(id, pid) {
    var st = U.pk[id], inp = $("#pk-" + id); st.val = pid; var p = pid && view().by[pid];
    if (inp) inp.value = p ? fullName(p) : "";
    var ul = $("#pkl-" + id); if (ul) ul.hidden = true; if (inp) { inp.setAttribute("aria-expanded", "false"); inp.classList.remove("pk-warn"); var hh = inp.closest(".pk").querySelector(".pk-hint"); if (hh) hh.remove(); }
    if (st.cb) st.cb(pid);
  }
  document.addEventListener("input", function (e) {
    var inp = e.target.closest && e.target.closest(".pk-in"); if (!inp) return;
    var id = inp.closest(".pk").getAttribute("data-pk"), ul = $("#pkl-" + id), res = pkSearch(id, inp.value);
    U.pk[id].val = null;
    ul.innerHTML = res.length ? res.map(function (p, i) { return '<li role="option" tabindex="-1" data-act="pk-pick" data-id="' + esc(id) + '" data-pid="' + esc(p.id) + '">' + esc(fullName(p)) + ' <span class="muted">' + esc((p.the_thu ? t("p.doi") + " " + p.the_thu : "") + " " + span(p)) + "</span></li>"; }).join("") : '<li class="muted">' + esc(t("l.khong_thay")) + "</li>";
    ul.hidden = false; inp.setAttribute("aria-expanded", "true");
  });
  document.addEventListener("keydown", function (e) {
    var inp = e.target.closest && e.target.closest(".pk-in"), li = e.target.closest && e.target.closest(".pk-list li[role=option]");
    if (inp && e.key === "ArrowDown") { var f = $(".pk-list li[role=option]", inp.closest(".pk")); if (f) { f.focus(); e.preventDefault(); } }
    if (inp && e.key === "Escape") { $(".pk-list", inp.closest(".pk")).hidden = true; }
    if (li) {
      if (e.key === "ArrowDown" && li.nextElementSibling) { li.nextElementSibling.focus(); e.preventDefault(); }
      if (e.key === "ArrowUp") { (li.previousElementSibling || $(".pk-in", li.closest(".pk"))).focus(); e.preventDefault(); }
      if (e.key === "Enter") { li.click(); e.preventDefault(); }
      if (e.key === "Escape") { $(".pk-in", li.closest(".pk")).focus(); }
    }
  });
  U.acts["pk-pick"] = function (el) { pkChoose(el.getAttribute("data-id"), el.getAttribute("data-pid")); };
  U.acts["pk-clear"] = function (el) { var id = el.getAttribute("data-id"); pkChoose(id, null); el.remove(); };
  // Gõ tên rồi không bấm chọn: tự nhận nếu khớp đúng một người (không dấu), để không bị mất tên đã gõ.
  function pkText(id) { var i = $("#pk-" + id); return i ? i.value.trim() : ""; }
  function pkResolve(id) {
    var st = U.pk[id]; if (!st) return null; if (st.val) return st.val;
    var txt = pkText(id); if (!txt) return null;
    var nq = norm(txt), all = pkSearch(id, txt), exact = all.filter(function (p) { return norm(fullName(p)) === nq; });
    var hit = exact.length === 1 ? exact[0] : all.length === 1 ? all[0] : null;
    if (hit) { st.val = hit.id; var i = $("#pk-" + id); if (i) { i.value = fullName(hit); i.classList.remove("pk-warn"); } return hit.id; }
    return null;
  }
  function pkVal(id) { return U.pk[id] ? pkResolve(id) : null; }
  document.addEventListener("focusout", function (e) {
    var inp = e.target.closest && e.target.closest(".pk-in"); if (!inp) return;
    var id = inp.closest(".pk").getAttribute("data-pk");
    setTimeout(function () {
      if (!document.body.contains(inp)) return;
      var v = pkResolve(id), box = inp.closest(".pk"), h = box.querySelector(".pk-hint");
      if (!v && inp.value.trim()) { if (!h) { h = document.createElement("p"); h.className = "pk-hint muted"; box.appendChild(h); } h.textContent = t("f.se_tao_ho_so", { ten: inp.value.trim() }); }
      else { inp.classList.remove("pk-warn"); if (h) h.remove(); }
    }, 200);
  });

  // ---------- Khung trang và định tuyến ----------
  // Menu gọn: hàng trên là các nhóm; hàng dưới là các mục của nhóm đang xem (không lặp lại ở trong trang)
  var GROUPS = [
    ["trang-chu", "nav.trang_chu", [["trang-chu", "nav.trang_chu"]]],
    ["gia-pha", "nav.g_gia_pha", [["danh-sach", "vt.danh_sach"], ["so-do", "vt.so_do"], ["cay-song", "nav.cay_song"], ["mindmap", "vt.mindmap"], ["bong-bong", "vt.bong_bong"], ["danh-xung", "nav.danh_xung"], ["sach", "nav.sach"]]],
    ["lich", "nav.g_su_kien", [["lich", "nav.lich"], ["thong-ke", "nav.thong_ke"], ["thiep", "nav.thiep"]]],
    ["tu-lieu", "nav.g_tu_lieu", [["phong-anh", "nav.phong_anh"], ["kho", "nav.kho", "u"], ["dong-thoi-gian", "nav.dong_thoi_gian"], ["danh-nhan", "nav.danh_nhan", "w"], ["gia-huan", "nav.gia_huan"], ["bai-viet", "nav.bai_viet"], ["phap-luat", "nav.phap_luat"]]],
    ["noi-chon", "nav.g_noi_chon", [["di-tich", "nav.di_tich"], ["ban-do", "nav.ban_do"]]],
    ["ung-ho", "nav.ung_ho", [["ung-ho", "nav.ung_ho"]]],
    ["he-thong", "nav.g_he_thong", [["kiem-tra", "nav.kiem_tra", "w"], ["du-lieu", "nav.du_lieu"], ["quan-tri", "nav.quan_tri", "a"], ["de-xuat", "nav.de_xuat", "u"], ["tai-khoan", "nav.tai_khoan", "u"], ["gioi-thieu", "nav.gioi_thieu"]]]
  ];
  U.GROUPS = GROUPS;
  function okItem(n) { var role = S.S.viewer.role; return !n[2] || (n[2] === "w" && (role === "admin" || role === "editor")) || (n[2] === "a" && role === "admin") || (n[2] === "u" && role !== "khach"); }
  function groupOf(cur) { for (var i = 0; i < GROUPS.length; i++) if (GROUPS[i][2].some(function (n) { return n[0] === cur; })) return GROUPS[i]; return GROUPS[0]; }
  U.okItem = okItem; U.groupOf = groupOf;
  var NAV_ICO = { "trang-chu": "home", "gia-pha": "tree", lich: "calendar", "tu-lieu": "book", "noi-chon": "pin", "ung-ho": "heart", "he-thong": "gear" };
  U.NAV_ICO = NAV_ICO;
  function navHtml(cur) {
    var g0 = groupOf(cur);
    return GROUPS.map(function (g) { var items = g[2].filter(okItem); if (!items.length) return ""; return '<a href="#' + items[0][0] + '"' + (g === g0 ? ' aria-current="page"' : "") + ">" + GP.ico(NAV_ICO[g[0]] || "tree") + "<span>" + esc(t(g[1])) + "</span></a>"; }).join("");
  }
  // Điện thoại: thanh điều hướng cố định ở đáy (ngón cái với tới) + bảng "Menu" liệt kê mọi mục bằng nút lớn
  var BN = [["trang-chu", "nav.trang_chu"], ["gia-pha", "nav.g_gia_pha"], ["lich", "nav.lich"], ["tu-lieu", "nav.g_tu_lieu"], ["noi-chon", "nav.ban_do"]];
  function bnavHtml(cur) {
    var g0 = groupOf(cur)[0];
    return BN.map(function (b) {
      var g = GROUPS.filter(function (x) { return x[0] === b[0]; })[0], items = g[2].filter(okItem); if (!items.length) return "";
      return '<a href="#' + items[0][0] + '"' + (g[0] === g0 ? ' aria-current="page"' : "") + ">" + GP.ico(NAV_ICO[b[0]] || "tree") + "<span>" + esc(t(b[1])) + "</span></a>";
    }).join("") + '<button type="button" data-act="msheet" aria-haspopup="dialog" aria-controls="msheet">' + GP.ico("menu") + "<span>" + esc(t("nav.menu")) + "</span></button>";
  }
  function sheetHtml(cur) {
    var g0 = groupOf(cur)[0];
    return '<div class="ms-bg" data-act="msheet-x"></div><div class="ms-box" role="dialog" aria-modal="true" aria-label="' + esc(t("nav.menu")) + '"><div class="ms-h"><b>' + esc(t("nav.menu")) + '</b><button type="button" class="btn small" data-act="msheet-x">✕ ' + esc(t("nav.dong")) + "</button></div>" +
      GROUPS.map(function (g) {
        var items = g[2].filter(okItem); if (!items.length) return "";
        return '<section class="ms-g' + (g[0] === g0 ? " cur" : "") + '"><h3>' + GP.ico(NAV_ICO[g[0]] || "tree") + " " + esc(t(g[1])) + '</h3><div class="ms-l">' + items.map(function (n) { return '<a href="#' + n[0] + '"' + (cur === n[0] ? ' aria-current="page"' : "") + ">" + esc(t(n[1])) + "</a>"; }).join("") + "</div></section>";
      }).join("") +
      '<section class="ms-g ms-tools"><h3>' + GP.ico("gear") + " " + esc(t("nav.hien_thi")) + '</h3><div class="ms-l"><select id="sel-lang2" aria-label="' + esc(t("c.ngon_ngu")) + '" data-on="lang"><option value="vi"' + (U.lang === "vi" ? " selected" : "") + '>Tiếng Việt</option><option value="en"' + (U.lang === "en" ? " selected" : "") + '>English</option><option value="zh"' + (U.lang === "zh" ? " selected" : "") + '>中文</option></select>' +
      '<button type="button" class="btn" data-act="font-" aria-label="' + esc(t("c.chu_nho")) + '">A−</button><button type="button" class="btn" data-act="font+" aria-label="' + esc(t("c.chu_to")) + '">A+</button><button type="button" class="btn" data-act="theme">' + GP.ico("sun") + " " + esc(t("c.giao_dien_ngan")) + "</button></div></section></div>";
  }
  function subHtml(cur) {
    var g = groupOf(cur), items = g[2].filter(okItem); if (items.length < 2) return "";
    return '<div class="tabs" role="navigation" aria-label="' + esc(t(g[1])) + '">' + items.map(function (n) { return '<a href="#' + n[0] + '"' + (cur === n[0] ? ' aria-current="page"' : "") + ">" + esc(t(n[1])) + "</a>"; }).join("") + "</div>";
  }
  function parseHash() {
    var h = (location.hash || "").replace(/^#/, "");
    if (!h) return { name: "trang-chu", arg: null };
    if (U.pages[h]) return { name: h, arg: null }; // trang có tên đầy đủ (vd. bai-viet) ưu tiên hơn tiền tố
    var pre = ["nguoi-", "sua-", "bai-", "ban-sao-"];
    for (var i = 0; i < pre.length; i++) if (h.indexOf(pre[i]) === 0) return { name: pre[i].slice(0, -1), arg: decodeURIComponent(h.slice(pre[i].length)) };
    return { name: h, arg: null };
  }
  var navMap = { nguoi: "danh-sach", sua: "danh-sach", them: "danh-sach", bai: "bai-viet", sach: "so-do", "nhat-ky": "quan-tri", mindmap: "mindmap", "bong-bong": "bong-bong", "nhat-ky": "quan-tri" };
  U.scrollMem = {}; U.back = false; U.curKey = null;
  root.addEventListener("scroll", function () { if (U.curKey) U.scrollMem[U.curKey] = root.scrollY; }, { passive: true });
  root.addEventListener("popstate", function () { U.back = true; setTimeout(function () { U.back = false; }, 600); });
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("#nav-list a")) U.lastPerson = null; });
  // Logo + tên trên đầu trang luôn về Trang chủ (kể cả khi đang ở trang chủ hoặc trong hồ sơ một người)
  document.addEventListener("click", function (e) {
    var a = e.target.closest && e.target.closest("a.brand"); if (!a) return; e.preventDefault(); U.lastPerson = null;
    if (U.closeSheet) U.closeSheet();
    if ((location.hash || "#trang-chu") === "#trang-chu") { U.rerender(); window.scrollTo(0, 0); } else location.hash = "#trang-chu";
  });
  function route() {
    var r = parseHash();
    if (r.name === "cay") { history.replaceState(null, "", "#so-do"); r = parseHash(); } // giao diện "Cây" đã gộp vào Sơ đồ
    var main = $("#main"), fn = U.pages[r.name];
    invalidate();
    var cur = navMap[r.name] || r.name;
    $("#nav-list").innerHTML = navHtml(cur);
    var tb0 = document.querySelector("#subnav .tabs"), sl0 = tb0 ? tb0.scrollLeft : 0, sg0 = tb0 ? tb0.getAttribute("aria-label") : "";
    $("#subnav").innerHTML = subHtml(cur);
    (function () { // giữ vị trí cuộn ngang của danh mục con; cùng nhóm thì không nhảy về đầu, khác nhóm thì đưa mục hiện tại vào giữa
      var tb = document.querySelector("#subnav .tabs"); if (!tb) return;
      if (tb.getAttribute("aria-label") === sg0) tb.scrollLeft = sl0;
      var a = tb.querySelector("[aria-current=page]"); if (!a) return;
      var l = a.offsetLeft, r = l + a.offsetWidth;
      if (tb.getAttribute("aria-label") !== sg0 || l < tb.scrollLeft + 8 || r > tb.scrollLeft + tb.clientWidth - 8) tb.scrollLeft = Math.max(0, l - (tb.clientWidth - a.offsetWidth) / 2);
    })();
    if ($("#bnav")) { $("#bnav").innerHTML = bnavHtml(cur); $("#msheet").innerHTML = sheetHtml(cur); $("#msheet").hidden = true; document.body.classList.remove("ms-open"); }
    if (U.sideRender) U.sideRender(cur);
    try { document.body.setAttribute("data-fresh", "1"); clearTimeout(U._fr); U._fr = setTimeout(function () { document.body.removeAttribute("data-fresh"); }, 900); } catch (e) {}
    if (U.badges) U.badges();
    if (U.scene) U.scene(groupOf(cur)[0]);
    Array.prototype.forEach.call($("#nav-list").children, function (a, i) { a.style.setProperty("--k", i); });
    try {
      if (!fn) { r = { name: "trang-chu" }; fn = U.pages["trang-chu"]; }
      var out = fn(r.arg); main.innerHTML = out.html; document.title = (out.title ? out.title + " · " : "") + t("site.ten");
      if (out.after) out.after();
    } catch (e) { main.innerHTML = '<div class="card"><p>' + esc(t("err.chung")) + "</p></div>"; if (root.console) console.error(e); }
    var key = r.name + (r.arg ? "-" + r.arg : ""), listy = { "danh-sach": 1, cay: 1, "thong-ke": 1, lich: 1 };
    if ((r.name === "nguoi" || r.name === "sua") && r.arg) U.lastPerson = r.arg;
    var y0 = 0, hit = null;
    if (listy[r.name] && U.lastPerson) { var a = main.querySelector('a[href="#nguoi-' + U.lastPerson.replace(/"/g, "") + '"]'); if (a) { for (var n = a.parentElement; n && n !== main; n = n.parentElement) if (n.tagName === "DETAILS") n.open = true; hit = a.closest("li,.prow,.tn,summary") || a; } }
    if (hit && hit.scrollIntoView) { hit.scrollIntoView({ block: "center" }); hit.classList.add("flash"); setTimeout(function () { hit.classList.remove("flash"); }, 2200); }
    else { y0 = listy[r.name] && U.scrollMem[key] != null && U.back ? U.scrollMem[key] : 0; window.scrollTo(0, y0); }
    U.curKey = key; $("#nav-list").classList.remove("open"); $("#nav-btn").setAttribute("aria-expanded", "false");
    var h1 = $("h1", main); if (h1) { h1.setAttribute("tabindex", "-1"); }
    U.motion(main);
  }
  // Chuyển động nhỏ: xếp lớp lần lượt, đếm số. Tắt hẳn khi người dùng chọn "giảm chuyển động".
  var calm = root.matchMedia && root.matchMedia("(prefers-reduced-motion: reduce)").matches;
  U.motion = function (main) {
    if (calm) return;
    var kids = main.querySelectorAll(".card,.tile,.st,.prow,.gitem,.finding,.tabs a,.cd,.kline,.kinres,.hist li,.tl li,.bars li");
    for (var i = 0; i < kids.length && i < 60; i++) kids[i].style.setProperty("--i", String(i));
    Array.prototype.forEach.call(main.querySelectorAll(".tile b,.big,.st-n"), function (el) {
      var txt = el.textContent.trim(), n = parseFloat(txt); if (!/^[0-9]+(\.[0-9]+)?$/.test(txt)) return;
      var dec = txt.indexOf(".") >= 0 ? 1 : 0, t0 = null;
      function step(ts) { if (t0 === null) t0 = ts; var k = Math.min(1, (ts - t0) / 700), e = 1 - Math.pow(1 - k, 3); el.textContent = (n * e).toFixed(dec); if (k < 1) root.requestAnimationFrame(step); else el.textContent = txt; }
      root.requestAnimationFrame(step);
    });
  };
  function rerender() { var y = window.scrollY; route(); window.scrollTo(0, y); }

  // ---------- Khung ngoài ----------
  function viewerOptions() {
    var opts = '<option value="khach">' + esc(t("v.khach")) + "</option>";
    S.S.data.profiles.filter(function (p) { return !p.da_xoa; }).forEach(function (p) { opts += '<option value="' + esc(p.id) + '">' + esc(p.ten_hien_thi) + " · " + esc(t("role." + p.vai_tro)) + "</option>"; });
    return opts;
  }
  function setViewerFromId(id) {
    var pr = S.S.data.profiles.filter(function (p) { return p.id === id; })[0];
    S.setViewer(pr ? { role: pr.vai_tro, person_id: pr.person_id, chi: pr.nhanh_chi || [], ten: pr.ten_hien_thi, profileId: pr.id } : { role: "khach", ten: "Khách" });
    lsSet("gp.viewer", pr ? pr.id : "khach"); invalidate();
  }
  function shell() {
    var st = S.S.data.settings;
    var app = document.getElementById("app"); if (!app) { app = document.createElement("div"); app.id = "app"; document.body.appendChild(app); }
    app.innerHTML =
      '<a class="skip" href="#main">' + esc(t("nav.bo_qua")) + "</a>" +
      (cloudOn() && !S.S.data.mau ? "" : '<div class="banner' + (GP.PUBLIC ? " pub" : "") + '" role="note">' + esc(t(GP.PUBLIC ? (S.S.data.mau ? "banner.mau_cong_khai" : "banner.cong_khai") : "banner.thu")) + "</div>") +
      '<header class="top"><div class="wrap top-in"><a class="brand" href="#trang-chu"><img src="' + GP.IMG.vuong + '" width="64" height="64" alt=""><span class="brand-t"><span class="brand-n">' + esc(t("site.ten")) + '</span><span class="brand-s">' + esc(t("site.khau_hieu")) + "</span></span></a>" +
      '<div class="tools"><label class="sr" for="sel-lang">' + esc(t("c.ngon_ngu")) + '</label><select id="sel-lang" data-on="lang"><option value="vi">Tiếng Việt</option><option value="en">English</option><option value="zh">中文</option></select>' +
      '<div role="group" aria-label="' + esc(t("c.co_chu")) + '"><button type="button" class="btn small" data-act="font-" aria-label="' + esc(t("c.chu_nho")) + '">A−</button><button type="button" class="btn small" data-act="font+" aria-label="' + esc(t("c.chu_to")) + '">A+</button></div>' +
      '<button type="button" class="btn small" data-act="motion" aria-pressed="false" aria-label="' + esc(t("c.chuyen_dong")) + '">' + GP.ico("spark") + '</button><button type="button" class="btn small themebtn" data-act="theme" aria-label="' + esc(t("c.doi_giao_dien")) + '">' + GP.ico("sun", "i-sun") + GP.ico("moon", "i-moon") + '<span class="sr">' + esc(t("c.giao_dien_ngan")) + '</span></button></div></div>' +
      (GP.PUBLIC ? "" : cloudOn() ? U.cloudBar() : '<div class="wrap who"><label for="sel-viewer">' + esc(t("v.xem_voi")) + '</label><select id="sel-viewer" data-on="viewer">' + viewerOptions() + '</select><span class="muted who-n">' + esc(t("v.ghi_chu")) + "</span></div>") + "</header>" +
      '<nav class="nav" aria-label="' + esc(t("nav.chinh")) + '"><div class="wrap"><button type="button" id="nav-btn" class="btn nav-btn" data-act="nav" aria-expanded="false" aria-controls="nav-list">' + GP.ico("menu") + " " + esc(t("nav.menu")) + '</button><div id="nav-list" class="nav-list"></div></div></nav>' +
      '<aside id="side" class="side" aria-label="' + esc(t("nav.chinh")) + '"></aside><div id="subnav" class="wrap subnav"></div><main id="main" class="wrap" tabindex="-1"></main>' +
      '<footer class="foot"><div class="wrap"><p>© ' + esc(st.nam_ban_quyen) + " " + esc(st.tac_gia) + " · " + esc(t("foot.noi_dung")) + ": " + esc(st.giay_phep_noi_dung) + " · " + esc(t("foot.ma")) + ": " + esc(st.giay_phep_ma) + ' · v' + GP.VERSION + (GP.PUBLIC && S.S.data.xuat_luc ? " · " + esc(t("foot.cap_nhat")) + " " + esc(String(S.S.data.xuat_luc).slice(0, 10)) : "") + "</p></div></footer>" +
      '<nav id="bnav" class="bnav" aria-label="' + esc(t("nav.chinh")) + '"></nav><div id="msheet" class="msheet" hidden></div>' +
      '<div id="toast" class="toast" role="status" aria-live="polite"></div>';
    $("#sel-lang").value = U.lang;
    var v = lsGet("gp.viewer") || "khach"; if ($("#sel-viewer")) $("#sel-viewer").value = S.S.data.profiles.some(function (p) { return p.id === v; }) ? v : "khach";
  }
  U.acts.msheet = function () { var m = $("#msheet"); m.hidden = !m.hidden; document.body.classList.toggle("ms-open", !m.hidden); };
  U.acts["msheet-x"] = function () { $("#msheet").hidden = true; document.body.classList.remove("ms-open"); };
  document.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("#msheet a")) { $("#msheet").hidden = true; document.body.classList.remove("ms-open"); } });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && $("#msheet") && !$("#msheet").hidden) U.acts["msheet-x"](); });
  U.acts.nav = function () { var l = $("#nav-list"), o = l.classList.toggle("open"); $("#nav-btn").setAttribute("aria-expanded", String(o)); };
  var fs = parseInt(lsGet("gp.fs"), 10) || 18;
  function setFs(v) { fs = Math.max(16, Math.min(28, v)); document.documentElement.style.setProperty("--fs", fs + "px"); lsSet("gp.fs", String(fs)); }
  U.acts["font+"] = function () { setFs(fs + 2); }; U.acts["font-"] = function () { setFs(fs - 2); };
  function setMotion(on) { document.documentElement.classList.toggle("no-motion", !on); lsSet("gp.motion", on ? "1" : "0"); var b = document.querySelector('[data-act="motion"]'); if (b) b.setAttribute("aria-pressed", String(on)); }
  U.acts.motion = function () { var on = document.documentElement.classList.contains("no-motion"); setMotion(on); if (on) { U.toast(t("c.chuyen_dong_bat")); U.rerender(); } else U.toast(t("c.chuyen_dong_tat")); };
  U.acts.theme = function () {
    var r = document.documentElement, cur = r.getAttribute("data-theme") || (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
    var nx = cur === "dark" ? "light" : "dark"; r.setAttribute("data-theme", nx); lsSet("gp.theme", nx);
  };
  U.ons.lang = function (el) { U.lang = el.value; lsSet("gp.lang", U.lang); document.documentElement.lang = U.lang; shell(); route(); };
  U.ons.viewer = function (el) { setViewerFromId(el.value); route(); };

  document.addEventListener("click", function (e) {
    var el = e.target.closest("[data-act]"); if (!el) { $$(".pk-list").forEach(function (u) { if (!u.contains(e.target)) u.hidden = true; }); return; }
    var fn = U.acts[el.getAttribute("data-act")]; if (fn) { fn(el, e); }
  });
  document.addEventListener("change", function (e) { var el = e.target.closest("[data-on]"); if (el && U.ons[el.getAttribute("data-on")]) U.ons[el.getAttribute("data-on")](el, e); });
  document.addEventListener("input", function (e) { var el = e.target.closest("[data-oninput]"); if (el && U.ons[el.getAttribute("data-oninput")]) U.ons[el.getAttribute("data-oninput")](el, e); });
  document.addEventListener("submit", function (e) { var f = e.target.closest("form[data-submit]"); if (f) { e.preventDefault(); var fn = U.ons[f.getAttribute("data-submit")]; if (fn) fn(f, e); } });

  function cloudOn() { return !GP.PUBLIC && GP.cloud && GP.cloud.active(); }
  U.cloudOn = cloudOn;
  function start() {
    var l = lsGet("gp.lang"); if (l && GP.STR[l]) U.lang = l;
    var th = lsGet("gp.theme"); if (th) document.documentElement.setAttribute("data-theme", th);
    document.documentElement.lang = U.lang; setFs(fs);
    if (lsGet("gp.motion") === "0") document.documentElement.classList.add("no-motion");
    S.init();
    var vid = GP.PUBLIC ? "khach" : (lsGet("gp.viewer") || "khach"); if (cloudOn()) { S.setViewer({ role: "khach", ten: "Khách" }); invalidate(); } else setViewerFromId(vid);
    if (!S.S.data.media.length && S.S.data.mau && GP.sampleMedia) { S.S.data.media = GP.sampleMedia(); }
    shell(); window.addEventListener("hashchange", route); S.on(function () { invalidate(); }); route();
    if (cloudOn()) { GP.cloud.boot().then(function () { invalidate(); shell(); route(); }); S.on(function () { GP.cloud.schedule(); }); }
    if (GP.PUBLIC && root.fetch) { // dữ liệu mới nhất: tệp data.json nằm cạnh trang (nếu không tải được thì dùng bản nhúng sẵn)
      root.fetch("data.json?v=" + Date.now(), { cache: "no-store" }).then(function (r) { return r.ok ? r.text() : null; }).then(function (tx) {
        var d = tx ? JSON.parse(tx.replace(/^\uFEFF/, "")) : null;
        if (!d || !d.persons || !d.persons.length || !d.settings) return;
        d.chis = d.chis || []; d.media = d.media || []; d.edit_history = []; S.S.data = d; invalidate(); shell(); route();
      }).catch(function () {});
    }
  }
  /** Hình đại diện chữ cái (không dùng ảnh người thật mặc định): màu theo giới tính, mờ nếu đã mất */
  U.av = function (p, size) {
    var nm = String(p.ten || "?").trim(), ch = nm.charAt(0).toUpperCase() || "?", g = p.gioi_tinh === "nam" ? "m" : p.gioi_tinh === "nu" ? "f" : "n";
    return '<span class="av ' + g + (p.con_song === false ? " dead" : "") + (size ? " " + size : "") + '" aria-hidden="true">' + esc(ch) + '<i class="avg">' + (g === "m" ? "♂" : g === "f" ? "♀" : "") + "</i></span>";
  };
  Object.assign(U, { t: t, esc: esc, $: $, $$: $$, view: view, invalidate: invalidate, fullName: fullName, nameOf: nameOf, link: link, canWrite: canWrite, isAdmin: isAdmin, dmy: dmy, dateTxt: dateTxt, yearTxt: yearTxt, span: span, lunarTxt: lunarTxt,
    badge: badge, today: today, toast: toast, errMsg: errMsg, attempt: attempt, download: download, exportBox: exportBox, picker: picker, pkVal: pkVal, pkText: pkText, pkChoose: pkChoose, route: route, rerender: rerender, start: start, lsGet: lsGet, lsSet: lsSet, shell: shell, setViewerFromId: setViewerFromId });
})(typeof window !== "undefined" ? window : globalThis);
