/* Nhắc nhở của tôi: chọn loại sự kiện + nhắc trước mấy ngày; nhắc ngay trên trang chủ khi mở web, thông báo (nếu cho phép) và lịch .ics có báo thức. Lưu trên máy từng người. */
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, S = GP.store, L = GP.lunar, t = U.t, esc = U.esc, P = U.pages;
  var KEY = "gp.nhac", DONE = "gp.nhac.done", LEADS = [7, 3, 1, 0];
  function load() { try { var o = JSON.parse(localStorage.getItem(KEY) || "null"); if (o && o.leads) return o; } catch (e) {} return { gio: true, sinh: true, le: false, leads: [7, 1], noti: false }; }
  function save(o) { try { localStorage.setItem(KEY, JSON.stringify(o)); } catch (e) {} }
  var pr = load();
  function jd(d) { return L.jdFromDate(d[0], d[1], d[2]); }
  /** Các sự kiện cần nhắc hôm nay theo cài đặt: [{x, days}] */
  function due() {
    var V = U.view(), td = U.today(), mx = Math.max.apply(null, pr.leads.concat([0])), end = L.jdToDate(jd(td) + mx), out = [];
    GP.io.upcoming(V.list, td, end, { gioThieu: S.S.data.settings.gio_thang_thieu }).forEach(function (x) {
      if (!pr[x.loai] || (x.loai === "le" && ["tet1", "ram", "gio_to", "vu_lan", "trung_thu", "giao_thua", "thanh_minh"].indexOf(x.khoa) < 0)) return;
      var d = jd(x.ngay) - jd(td); if (pr.leads.indexOf(d) >= 0) out.push({ x: x, days: d });
    });
    return out.sort(function (a, b) { return a.days - b.days; });
  }
  function when(n) { return n === 0 ? t("nhac.hom_nay") : n === 1 ? t("nhac.ngay_mai") : t("nhac.con_n", { n: n }); }
  function label(x) { return (x.loai === "gio" ? t("lich.gio") : x.loai === "sinh" ? t("lich.sinh") : t("lich.le")) + ": " + (x.loai === "le" ? t("le." + x.khoa) : U.nameOf(x.id)); }
  U.nhacCard = function () {
    var d = due(); if (!d.length) return "";
    return '<section class="card nhac"><h2>🔔 ' + esc(t("nhac.can_nho")) + '</h2><ul class="plain hnl">' + d.map(function (r) {
      return '<li><b>' + esc(when(r.days)) + "</b> · " + (r.x.loai === "le" ? esc(label(r.x)) : '<a href="#nguoi-' + esc(r.x.id) + '">' + esc(label(r.x)) + "</a>") + ' <span class="muted">' + esc(U.dmy(r.x.ngay)) + "</span></li>";
    }).join("") + "</ul></section>";
  };
  var homeOld = P["trang-chu"];
  P["trang-chu"] = function () { var o = homeOld(), k = '<section class="card hn">'; if (o && o.html && o.html.indexOf(k) >= 0) o.html = o.html.replace(k, U.nhacCard() + k); return o; };

  // ---------- Cài đặt nhắc nhở (trang Lịch) ----------
  var KL = { gio: "lich.gio", sinh: "lich.sinh", le: "lich.le" };
  function settingsCard() {
    var chk = function (k) { return '<label class="chk"><input type="checkbox" data-on="nhac-loai" data-k="' + k + '"' + (pr[k] ? " checked" : "") + "> " + esc(t(KL[k])) + "</label>"; };
    var ld = LEADS.map(function (n) { return '<label class="chk"><input type="checkbox" data-on="nhac-lead" data-n="' + n + '"' + (pr.leads.indexOf(n) >= 0 ? " checked" : "") + "> " + esc(n === 0 ? t("nhac.dung_ngay") : t("nhac.n_ngay", { n: n })) + "</label>"; }).join("");
    var supported = typeof Notification !== "undefined", perm = supported ? Notification.permission : "denied";
    var tb = !supported ? '<p class="muted">' + esc(t("nhac.tb_khong")) + "</p>" : perm === "denied" && !pr.noti ? '<p class="muted">' + esc(t("nhac.tb_tu_choi")) + "</p>" : '<label class="chk"><input type="checkbox" data-on="nhac-noti"' + (pr.noti && perm === "granted" ? " checked" : "") + "> " + esc(t("nhac.bat_tb")) + "</label>";
    return '<section class="card" id="nhac-set"><h2>🔔 ' + esc(t("nhac.tieu_de")) + '</h2><p class="muted">' + esc(t("nhac.mo_ta")) + '</p><fieldset class="fs"><legend>' + esc(t("nhac.nhac_gi")) + '</legend><div class="row">' + chk("gio") + chk("sinh") + chk("le") + '</div></fieldset><fieldset class="fs"><legend>' + esc(t("nhac.truoc")) + '</legend><div class="row">' + ld + "</div></fieldset>" + tb +
      '<p class="note">' + esc(t("nhac.luu_y")) + '</p><p><button type="button" class="btn primary" data-act="ics">📅 ' + esc(t("nhac.tai_ics")) + "</button></p></section>";
  }

  // ---------- Đồng bộ lịch vào điện thoại (đăng ký lịch webcal) ----------
  var ICS_FILE = "lich-ho-tong.ics";
  function base() { return location.href.replace(/[#?].*$/, "").replace(/[^\/]*$/, ""); }
  function isWeb() { return /^https?:$/.test(location.protocol) && !GP.PUBLIC_FRAME; }
  /** Lịch giỗ + lễ của người khách được phép thấy (an toàn để công khai), 3 năm tới */
  function publicIcs() {
    var d = S.S.data, y = U.today()[2], ctx = GP.privacy.makeContext({ role: "khach", ten: "Khách" }, d.persons, d.spouses, d.settings.nam_hien_tai || y), list = GP.privacy.visibleList(d.persons, ctx), by = {};
    list.forEach(function (p) { by[p.id] = p; });
    var items = GP.io.upcoming(list, [1, 1, y], [31, 12, y + 2], { gioThieu: d.settings.gio_thang_thieu, leTet: true }).filter(function (i) { return i.loai === "gio" || (i.loai === "le" && ["tet1", "ram", "gio_to", "thanh_minh", "giao_thua"].indexOf(i.khoa) >= 0); });
    var o = U.icsOpts ? U.icsOpts() : {}; o.alarms = [7, 1];
    var txt = GP.io.toIcs(items, function (i) { return i.loai === "le" ? t("lich.le") + ": " + t("le." + i.khoa) : t("lich.gio") + ": " + (by[i.id] ? U.fullName(by[i.id]) : ""); }, t("nhac.ten_lich"), o);
    return txt.replace("X-WR-CALNAME:", "REFRESH-INTERVAL;VALUE=DURATION:P1D\r\nX-PUBLISHED-TTL:PT24H\r\nX-WR-CALNAME:");
  }
  function syncCard() {
    var adm = S.S.viewer.role === "admin", url = isWeb() ? base() + ICS_FILE : "", wc = url.replace(/^https?:/, "webcal:");
    var steps = function (k) { return "<li>" + esc(t(k)) + "</li>"; };
    return '<section class="card" id="nhac-sync"><h2>📱 ' + esc(t("nhac.sync_tieu")) + '</h2><p class="muted">' + esc(t("nhac.sync_mo_ta")) + "</p>" +
      (url ? '<p><a class="btn primary" href="' + esc(wc) + '">📅 ' + esc(t("nhac.dang_ky")) + '</a> <button type="button" class="btn small" data-act="nhac-copy" data-u="' + esc(url) + '">📋 ' + esc(t("nhac.chep_link")) + '</button></p><p class="muted" id="nhac-stt"></p>' : '<p class="note">' + esc(t("nhac.chua_web")) + "</p>") +
      '<details><summary><b>🍎 ' + esc(t("nhac.huong_dan_ios")) + '</b></summary><ol>' + steps("nhac.i1") + steps("nhac.i2") + steps("nhac.i3") + steps("nhac.i4") + steps("nhac.i5") + '</ol><p class="muted">' + esc(t("nhac.i_luu_y")) + '</p></details>' +
      '<details><summary><b>🤖 ' + esc(t("nhac.huong_dan_and")) + '</b></summary><ol>' + steps("nhac.a1") + steps("nhac.a2") + steps("nhac.a3") + "</ol></details>" +
      (adm ? '<details open><summary><b>🔧 ' + esc(t("nhac.quan_tri")) + '</b></summary><p>' + esc(t("nhac.qt_mo_ta")) + '</p><p><button type="button" class="btn primary" data-act="nhac-pub">⬇ ' + esc(t("nhac.tao_file")) + "</button></p></details>" : "") + "</section>";
  }
  U.acts["nhac-pub"] = function () { U.download(ICS_FILE, publicIcs(), "text/calendar"); U.toast(t("nhac.da_tao")); };
  U.acts["nhac-copy"] = function (el) { var u = el.getAttribute("data-u"); try { navigator.clipboard.writeText(u).then(function () { U.toast(t("nhac.da_chep")); }, function () { window.prompt && 0; }); } catch (e) {} };
  function checkFile() {
    var el = document.getElementById("nhac-stt"); if (!el || !isWeb()) return;
    fetch(ICS_FILE, { method: "HEAD", cache: "no-store" }).then(function (r) { el.textContent = r.ok ? t("nhac.file_co") : t("nhac.file_chua"); }, function () { el.textContent = t("nhac.file_chua"); });
  }
  U.publicIcs = publicIcs;
  var lichOld = P.lich;
  P.lich = function () { var o = lichOld(), mark = '<div class="card"><h3>' + esc(t("lich.xuat")); o.html = o.html.indexOf(mark) >= 0 ? o.html.replace(mark, settingsCard() + syncCard() + mark) : o.html + settingsCard() + syncCard(); var af = o.after; o.after = function () { if (af) af(); checkFile(); }; return o; };
  U.ons["nhac-loai"] = function (el) { pr[el.getAttribute("data-k")] = el.checked; save(pr); };
  U.ons["nhac-lead"] = function (el) { var n = +el.getAttribute("data-n"), a = pr.leads.filter(function (x) { return x !== n; }); if (el.checked) a.push(n); pr.leads = a.sort(function (x, y) { return y - x; }); save(pr); };
  U.ons["nhac-noti"] = function (el) {
    if (!el.checked) { pr.noti = false; save(pr); return; }
    if (typeof Notification === "undefined") { el.checked = false; return; }
    Notification.requestPermission().then(function (r) { pr.noti = r === "granted"; save(pr); if (r === "granted") { U.toast(t("nhac.da_bat")); notify(true); } U.rerender(); });
  };
  // lịch .ics theo cài đặt: loại sự kiện + số ngày nhắc trước
  var icsBase = U.icsOpts;
  U.icsOpts = function () { var o = icsBase ? icsBase() : {}; o.alarms = pr.leads.length ? pr.leads : [1]; return o; };
  U.acts.ics = function () {
    var V = U.view(), td = U.today(), items = GP.io.upcoming(V.list, [1, 1, td[2]], [31, 12, td[2] + 1], { gioThieu: S.S.data.settings.gio_thang_thieu, leTet: false }).filter(function (i) { return pr[i.loai] !== false; });
    U.download("gia-pha-lich.ics", GP.io.toIcs(items, label, t("site.ten"), U.icsOpts()), "text/calendar");
  };

  // ---------- Thông báo khi mở web (mỗi sự kiện mỗi ngày một lần) ----------
  function notify(force) {
    if (typeof Notification === "undefined" || Notification.permission !== "granted" || !(pr.noti || force)) return;
    var td = U.today(), day = td.join("-"), done = {}; try { done = JSON.parse(localStorage.getItem(DONE) || "{}"); } catch (e) {} if (done.d !== day) done = { d: day, k: [] };
    due().forEach(function (r) {
      var k = r.x.loai + (r.x.id || r.x.khoa) + r.days; if (done.k.indexOf(k) >= 0) return; done.k.push(k);
      var title = when(r.days) + ": " + label(r.x), opt = { body: U.dmy(r.x.ngay), icon: GP.IMG.nho, tag: k };
      try { if (navigator.serviceWorker && navigator.serviceWorker.getRegistration) navigator.serviceWorker.getRegistration().then(function (g) { if (g && g.showNotification) g.showNotification(title, opt); else new Notification(title, opt); }, function () { new Notification(title, opt); }); else new Notification(title, opt); } catch (e) {}
    });
    try { localStorage.setItem(DONE, JSON.stringify(done)); } catch (e) {}
  }
  if (typeof window !== "undefined") window.addEventListener("load", function () { setTimeout(function () { try { notify(false); } catch (e) {} }, 2500); });
  U.nhac = { prefs: function () { return pr; }, due: due };
})(typeof window !== "undefined" ? window : globalThis);
