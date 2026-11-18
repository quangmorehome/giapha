/* v1.9 — Biểu mẫu thông minh: nhập MỘT ô thì các ô liên quan tự điền (chỉ điền ô còn trống hoặc ô do máy điền trước đó; không bao giờ ghi đè điều bạn đã gõ). */
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, S = GP.store, t = U.t, esc = U.esc, depth = 0, acc = [];
  function F() { return document.getElementById("pform"); }
  function mark(el) { el.classList.add("auto"); }
  function unmark(el) { el.classList.remove("auto"); delete el.dataset.auto; }
  /** Ô chữ/số: điền khi trống hoặc khi do máy điền trước đó */
  function setAuto(f, name, val) {
    var el = f.elements[name]; if (!el || val == null || val === "" || el.readOnly) return false;
    if (el.type === "checkbox") { if (el.dataset.manual === "1" || el.checked === !!val) return false; if (el.dataset.auto !== "1" && el.checked) return false; el.checked = !!val; el.dataset.auto = "1"; mark(el); return true; }
    if (String(el.value) !== "" && el.dataset.auto !== "1") return false; if (String(el.value) === String(val)) return false;
    el.value = val; el.dataset.auto = "1"; mark(el); return true;
  }
  /** Ô chọn có giá trị mặc định: đổi nếu người dùng chưa tự chọn */
  function setSel(f, name, val) { var el = f.elements[name]; if (!el || el.dataset.manual === "1" || el.value === val) return false; el.value = val; el.dataset.auto = "1"; mark(el); return true; }
  function note(id, txt) { var n = document.getElementById(id); if (!n) return; n.hidden = !txt; n.textContent = txt || ""; }
  function ndone(f) { return !f.elements.id.value; } // hồ sơ mới

  // ---- Chọn cha / mẹ → họ, đời, thứ tự con, người kia ----
  U.formLink = function (which, pid) {
    var f = F(); if (!f || !pid) return; var q = S.byId(pid); if (!q) return; f.setAttribute("data-l-" + which, pid);
    if (!depth) acc = []; depth++;
    try {
      var add = function (ok, lbl) { if (ok) acc.push(lbl); };
      if (which === "cha") add(setAuto(f, "ho", q.ho), t("p.ho"));
      if (which === "cha" && q.the_thu) add(setAuto(f, "the_thu", q.the_thu + 1), t("p.doi"));
      var other = which === "cha" ? "me" : "cha";
      if (!U.pkVal(other) && !U.pkText(other)) { // cha chỉ có một vợ (hoặc mẹ chỉ có một chồng) có hồ sơ → điền luôn người kia
        var V = U.view(), sps = U.spousesOf(pid).filter(function (s) { var b = s.spouse_person_id && V.by[s.spouse_person_id]; return b && b.level !== "hidden"; });
        if (sps.length === 1) { U.pkChoose(other, sps[0].spouse_person_id); add(true, t("p." + other)); }
      }
      // thứ tự con kế tiếp: tính theo mẹ nếu đã chọn mẹ (con của vợ khác tính riêng), nếu không thì theo cha
      var mid = U.pkVal("me"), cid = U.pkVal("cha"), me = f.elements.id.value, mx = 0;
      S.S.data.persons.forEach(function (c) { if (c.da_an || c.id === me) return; if (mid ? c.me_id === mid : (cid && c.cha_id === cid)) mx = Math.max(mx, c.thu_tu_con || 0); });
      add(setAuto(f, "thu_tu_con", mx + 1), t("p.thu_tu_con"));
    } finally { depth--; }
    if (!depth) { var seen = {}, ds = acc.filter(function (x) { return seen[x] ? false : (seen[x] = 1); }); note("link-note", ds.length ? t("f.da_tu_dien", { ds: ds.join(", ") }) : ""); }
  };
  // gõ tên rồi bấm ra ngoài (không bấm chọn trong danh sách) vẫn liên kết nếu khớp đúng một người
  document.addEventListener("focusout", function (e) {
    var inp = e.target.closest && e.target.closest(".pk-in"), f = F(); if (!inp || !f) return;
    var id = inp.closest(".pk").getAttribute("data-pk"); if (id !== "cha" && id !== "me") return;
    setTimeout(function () { var v = F() && U.pkVal(id); if (v && f.getAttribute("data-l-" + id) !== v) U.formLink(id, v); }, 160);
  });

  // ---- Ngày mất → giỗ âm lịch ----
  function gioCalc(f) {
    var g = function (n) { var e = f.elements[n]; return e ? +e.value || 0 : 0; }, d = g("mat_ngay"), m = g("mat_thang"), y = g("mat_nam");
    if (!(d && m && y >= 1800 && y <= 2100)) return;
    var am = f.elements.mat_lich.value === "am", ld, lm, leap;
    try { var dl = am ? { day: d, month: m, year: y, leap: f.elements.mat_nhuan.checked } : GP.lunar.solarToLunar(d, m, y), l = GP.lunar.lunarBefore(dl.day, dl.month, dl.year, dl.leap, GP.io.gioTruoc()); ld = l.day; lm = l.month; leap = l.leap; } catch (e) { return; }
    var a = setAuto(f, "gio_ngay_am", ld), b = setAuto(f, "gio_thang_am", lm), c = setAuto(f, "gio_nhuan", leap);
    if (a || b || c || f.elements.gio_ngay_am.dataset.auto === "1") note("gio-note", t("f.gio_tu_tinh"));
  }
  // ---- Tự quy đổi dương lịch ⇄ âm lịch ngay khi nhập (kể cả tháng nhuận, can chi) ----
  function dconv(f, pre) {
    var box = document.getElementById("dc-" + pre); if (!box) return;
    var g = function (n) { var e = f.elements[pre + "_" + n]; return e ? +e.value || 0 : 0; }, d = g("ngay"), m = g("thang"), y = g("nam"), L = GP.lunar, t = U.t;
    var am = (f.querySelector('input[name="' + pre + '_lich"]:checked') || {}).value === "am", nh = f.elements[pre + "_nhuan"];
    if (!(d && m && y >= 1800 && y <= 2100)) { box.textContent = ""; return; }
    var msg = "";
    try {
      if (am) {
        var leapM = 0; for (var k = 1; k <= 12; k++) if (L.lunarToSolar(1, k, y, true)) leapM = k;
        if (leapM === m && nh && !nh.checked && !nh.dataset.manual) { nh.checked = true; nh.dataset.auto = "1"; }
        var so = L.lunarToSolar(d, m, y, !!(nh && nh.checked)), back = so && L.solarToLunar(so[0], so[1], so[2]);
        if (!so || back.day !== d || back.month !== m) msg = "⚠ " + t("f.am_khong_co");
        else msg = "→ " + t("d.duong") + ": " + so[0] + "/" + so[1] + "/" + so[2] + " · " + L.canChiYear(y) + (leapM ? " · " + t("f.nam_nhuan", { m: leapM }) : "");
      } else {
        var l = L.solarToLunar(d, m, y); if (nh) { nh.checked = false; }
        msg = "→ " + t("d.am") + ": " + l.day + "/" + l.month + (l.leap ? " (" + t("d.nhuan") + ")" : "") + "/" + l.year + " · " + L.canChiYear(l.year);
      }
    } catch (e) { msg = ""; }
    box.textContent = msg;
  }
  function dconvAll(f) { dconv(f, "sinh"); dconv(f, "mat"); }
  document.addEventListener("input", function (e) { var f = e.target.closest && e.target.closest("#pform"); if (f && /^(sinh|mat)_/.test(e.target.name || "")) dconvAll(f); });
  document.addEventListener("change", function (e) { var f = e.target.closest && e.target.closest("#pform"); if (!f) return; if (/_nhuan$/.test(e.target.name || "")) e.target.dataset.manual = "1"; if (/^(sinh|mat)_/.test(e.target.name || "")) dconvAll(f); });
  U.dconvAll = dconvAll;
  // ---- Trạng thái → mức hiển thị mặc định, ô đồng ý trẻ em ----
  function consent(f) {
    var box = document.getElementById("consent-box"); if (!box) return;
    var y = +(f.elements.sinh_nam || {}).value || 0, alive = f.elements.con_song.value === "1", yr = U.view().year;
    box.hidden = !(alive && y && yr - y < 18);
  }
  function muc(f) { if (ndone(f)) setSel(f, "muc_hien_thi", f.elements.con_song.value === "0" ? "gia_toc" : "rieng_tu"); }
  var base = U.ons["tt-song"];
  U.ons["tt-song"] = function (el, e) { if (base) base(el, e); var f = F(); if (f) { muc(f); consent(f); } };
  function guess(f) {
    if (!ndone(f)) return; var s = " " + (f.elements.ten_dem.value + " " + f.elements.ho.value).toLowerCase() + " ";
    if (/\sthị\s/.test(s)) setSel(f, "gioi_tinh", "nu"); else if (/\svăn\s/.test(s)) setSel(f, "gioi_tinh", "nam");
  }
  document.addEventListener("input", function (e) {
    var f = e.target.closest && e.target.closest("#pform"); if (!f) return; var n = e.target.name || "";
    if (e.target.dataset && e.target.dataset.auto) unmark(e.target);
    if (n === "sinh_nam") {
      consent(f); var y = +e.target.value, cs = f.elements.con_song;
      if (y >= 1000 && y <= U.view().year - 100 && cs.value === "1" && cs.dataset.manual !== "1") { cs.value = "0"; cs.dataset.auto = "1"; mark(cs); U.ons["tt-song"](cs); note("tt-note", t("f.tu_chon_mat")); }
    }
    if (/^mat_/.test(n)) gioCalc(f);
    if (n === "ten_dem" || n === "ho") guess(f);
  });
  document.addEventListener("change", function (e) {
    var f = e.target.closest && e.target.closest("#pform"); if (!f) return; var el = e.target;
    if (el.tagName === "SELECT" || el.type === "checkbox" || el.type === "radio") { el.dataset.manual = "1"; unmark(el); }
    if (el.name === "con_song") note("tt-note", "");
    if (el.name === "mat_lich" || el.name === "mat_nhuan") gioCalc(f);
  });
})(typeof window !== "undefined" ? window : globalThis);
