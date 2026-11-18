/* Máy tính: menu dọc bên trái (cài đặt + ủng hộ ở góc dưới); cửa sổ Ủng hộ (QR, sao chép, mở app ngân hàng); cửa sổ Cài đặt hiển thị */
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, S = GP.store, t = U.t, esc = U.esc, P = U.pages;
  var BANKS = { vcb: ["Vietcombank", "970436", "vcb"], ctg: ["VietinBank", "970415", ""], bidv: ["BIDV", "970418", "bidv"], agr: ["Agribank", "970405", ""], tcb: ["Techcombank", "970407", "tcb"], mb: ["MB Bank", "970422", "mb"], acb: ["ACB", "970416", "acb"], vpb: ["VPBank", "970432", "vpb"], tpb: ["TPBank", "970423", "tpb"], stb: ["Sacombank", "970403", ""], vib: ["VIB", "970441", ""] };
  function st() { return (S.S.data.settings) || {}; }
  function donateOn() { var s = st(); return !!(s.ung_ho_so_tk || s.ung_ho_qr); }

  // ---------- Thanh bên (chỉ hiện ≥ 1000px nhờ CSS) ----------
  U.sideRender = function (cur) {
    var el = document.getElementById("side"); if (!el) return;
    var g0 = U.groupOf(cur), h = '<a class="brand side-brand" href="#trang-chu"><img src="' + GP.IMG.vuong + '" width="44" height="44" alt=""><span class="brand-t"><span class="brand-n">' + esc(t("site.ten")) + '</span><span class="brand-s">' + esc(t("site.khau_hieu")) + "</span></span></a><nav class=\"side-nav\">";
    U.GROUPS.forEach(function (g) {
      if (g[0] === "ung-ho") return; var items = g[2].filter(U.okItem); if (!items.length) return;
      var ico = GP.ico(U.NAV_ICO[g[0]] || "tree");
      if (items.length === 1) { h += '<a class="sg1' + (g === g0 ? " cur" : "") + '" href="#' + items[0][0] + '"' + (g === g0 ? ' aria-current="page"' : "") + ">" + ico + "<span>" + esc(t(g[1])) + "</span></a>"; return; }
      h += '<div class="sg' + (g === g0 ? " cur" : "") + '"><div class="sgh">' + ico + "<span>" + esc(t(g[1])) + "</span></div>" + items.map(function (n) { return '<a href="#' + n[0] + '"' + (cur === n[0] ? ' aria-current="page"' : "") + ">" + esc(t(n[1])) + "</a>"; }).join("") + "</div>";
    });
    h += '</nav><div class="side-foot">' + (donateOn() || U.canWrite() ? donateCard(true) : "") + '<button type="button" class="btn side-set" data-act="set-open">' + GP.ico("gear") + " " + esc(t("nav.hien_thi")) + "</button></div>";
    var oldNav = el.querySelector(".side-nav"), keep = oldNav ? oldNav.scrollTop : (U.sideScroll || 0);
    el.innerHTML = h;
    var nv = el.querySelector(".side-nav"); if (nv) { nv.scrollTop = keep; var cu = nv.querySelector("[aria-current=page]"); if (cu) { var r1 = cu.getBoundingClientRect(), r2 = nv.getBoundingClientRect(); if (r1.top < r2.top || r1.bottom > r2.bottom) nv.scrollTop += r1.top - r2.top - 40; } nv.addEventListener("scroll", function () { U.sideScroll = nv.scrollTop; }); }
  };
  function donateCard(small) {
    var s = st(), qr = qrSrc();
    return '<div class="dcard"><button type="button" class="dqr" data-act="donate-open" aria-label="' + esc(t("dn2.ung_ho")) + '">' + (qr ? '<img src="' + esc(qr) + '" alt="" width="64" height="64">' : "💝") + '</button><div><b>❤ ' + esc(t("dn2.ung_ho")) + "</b><p>" + esc(t("dn2.quet_qr")) + '</p><button type="button" class="btn small dbtn" data-act="donate-open">' + esc(t("dn2.nut")) + "</button></div></div>";
  }
  function qrSrc() {
    var s = st(); if (s.ung_ho_qr) return s.ung_ho_qr;
    var b = BANKS[s.ung_ho_ngan_hang]; if (b && s.ung_ho_so_tk) return "https://img.vietqr.io/image/" + b[1] + "-" + encodeURIComponent(s.ung_ho_so_tk) + "-compact2.png?accountName=" + encodeURIComponent(s.ung_ho_chu_tk || "") + "&addInfo=" + encodeURIComponent(s.ung_ho_noi_dung || "");
    return "";
  }

  // ---------- Cửa sổ chung ----------
  function dlg(html) {
    var d = document.getElementById("dlg"); if (!d) { d = document.createElement("div"); d.id = "dlg"; document.body.appendChild(d); }
    d.className = "dlg-bg"; d.innerHTML = '<div class="dlg-box" role="dialog" aria-modal="true">' + html + "</div>"; d.hidden = false; document.body.classList.add("ms-open");
    var f = d.querySelector("button,select,input"); if (f) f.focus();
  }
  U.acts["dlg-x"] = function () { var d = document.getElementById("dlg"); if (d) d.hidden = true; document.body.classList.remove("ms-open"); };
  document.addEventListener("click", function (e) { if (e.target && e.target.id === "dlg") U.acts["dlg-x"](); });
  document.addEventListener("keydown", function (e) { var d = document.getElementById("dlg"); if (e.key === "Escape" && d && !d.hidden) U.acts["dlg-x"](); });

  U.acts["set-open"] = function () {
    dlg('<div class="ms-h"><b>' + GP.ico("gear") + " " + esc(t("nav.hien_thi")) + '</b><button type="button" class="btn small" data-act="dlg-x">✕ ' + esc(t("nav.dong")) + '</button></div><div class="ms-l setl"><label for="sel-lang3" class="lab">' + esc(t("c.ngon_ngu")) + '</label><select id="sel-lang3" data-on="lang"><option value="vi"' + (U.lang === "vi" ? " selected" : "") + '>Tiếng Việt</option><option value="en"' + (U.lang === "en" ? " selected" : "") + '>English</option><option value="zh"' + (U.lang === "zh" ? " selected" : "") + '>中文</option></select>' +
      '<div class="row"><button type="button" class="btn" data-act="font-">A−</button><button type="button" class="btn" data-act="font+">A+</button><button type="button" class="btn" data-act="theme">' + GP.ico("sun") + " " + esc(t("c.giao_dien_ngan")) + '</button><button type="button" class="btn" data-act="motion">' + GP.ico("spark") + " " + esc(t("c.chuyen_dong")) + "</button></div></div>");
  };

  // ---------- Cửa sổ Ủng hộ ----------
  function copyBtn(v, label) { return '<button type="button" class="btn small" data-act="don-copy" data-v="' + esc(v) + '">📋 ' + esc(label) + "</button>"; }
  U.acts["donate-open"] = function () {
    var s = st(), b = BANKS[s.ung_ho_ngan_hang], qr = qrSrc(), app = b && b[2] && s.ung_ho_so_tk ? "https://dl.vietqr.io/pay?app=" + b[2] + "&ba=" + encodeURIComponent(s.ung_ho_so_tk) + "@" + b[2] + "&tn=" + encodeURIComponent(s.ung_ho_noi_dung || "") : "";
    var h = '<div class="ms-h"><b>❤ ' + esc(t("dn2.ung_ho")) + '</b><button type="button" class="btn small" data-act="dlg-x">✕ ' + esc(t("nav.dong")) + "</button></div>";
    if (!donateOn()) h += '<p class="note">' + esc(t("dn2.chua_co")) + "</p>";
    else h += (qr ? '<p class="dqrbig"><img src="' + esc(qr) + '" alt="' + esc(t("dn2.ma_qr")) + '"></p>' : "") + '<dl class="kv dkv">' + (s.ung_ho_chu_tk ? "<dt>" + esc(t("dn2.chu_tk")) + "</dt><dd><b>" + esc(s.ung_ho_chu_tk) + "</b></dd>" : "") + (b ? "<dt>" + esc(t("dn2.ngan_hang")) + "</dt><dd>" + esc(b[0]) + "</dd>" : "") + (s.ung_ho_so_tk ? "<dt>" + esc(t("dn2.so_tk")) + '</dt><dd><b class="dstk">' + esc(s.ung_ho_so_tk) + "</b> " + copyBtn(s.ung_ho_so_tk, t("dn2.sao_chep")) + "</dd>" : "") + (s.ung_ho_noi_dung ? "<dt>" + esc(t("dn2.noi_dung")) + "</dt><dd>" + esc(s.ung_ho_noi_dung) + " " + copyBtn(s.ung_ho_noi_dung, t("dn2.sao_chep")) + "</dd>" : "") + "</dl>" +
      '<div class="row">' + (app ? '<a class="btn primary" href="' + esc(app) + '" rel="noopener">📱 ' + esc(t("dn2.mo_app")) + "</a>" : "") + (qr ? '<a class="btn" href="' + esc(qr) + '" download="qr-ung-ho.png">⬇ ' + esc(t("dn2.tai_qr")) + "</a>" : "") + '</div><p class="muted">' + esc(t("dn2.huong_dan")) + "</p>";
    h += '<p class="thanks">🙏 ' + esc(t("dn2.cam_on")) + "</p>"; dlg(h);
  };
  U.acts["don-copy"] = function (el) { var v = el.getAttribute("data-v"); try { navigator.clipboard.writeText(v).then(function () { U.toast(t("dn2.da_chep")); }, function () { U.toast(v); }); } catch (e) { U.toast(v); } };

  // Trang chủ: thẻ ủng hộ nhỏ; trang Ủng hộ: biểu mẫu tài khoản cho Quản trị
  var home = P["trang-chu"];
  P["trang-chu"] = function (a) { var o = home(a); if (donateOn() || U.canWrite()) o.html += '<section class="homedn">' + donateCard(false) + "</section>"; return o; };
  var uh = P["ung-ho"];
  P["ung-ho"] = function (a) {
    var o = uh(a), s = st(); o.html = '<p><button type="button" class="btn primary" data-act="donate-open">❤ ' + esc(t("dn2.nut")) + "</button></p>" + o.html;
    if (S.S.viewer.role === "admin") o.html += '<section class="card"><h2>' + esc(t("dn2.cau_hinh")) + '</h2><form data-submit="dn2-save"><div class="filters"><div><label class="lab" for="d-nh">' + esc(t("dn2.ngan_hang")) + '</label><select id="d-nh" name="ung_ho_ngan_hang"><option value="">—</option>' + Object.keys(BANKS).map(function (k) { return '<option value="' + k + '"' + (s.ung_ho_ngan_hang === k ? " selected" : "") + ">" + esc(BANKS[k][0]) + "</option>"; }).join("") + '</select></div><div><label class="lab" for="d-stk">' + esc(t("dn2.so_tk")) + '</label><input class="inp" id="d-stk" name="ung_ho_so_tk" inputmode="numeric" value="' + esc(s.ung_ho_so_tk || "") + '"></div><div><label class="lab" for="d-ct">' + esc(t("dn2.chu_tk")) + '</label><input class="inp" id="d-ct" name="ung_ho_chu_tk" value="' + esc(s.ung_ho_chu_tk || "") + '"></div><div><label class="lab" for="d-nd">' + esc(t("dn2.noi_dung")) + '</label><input class="inp" id="d-nd" name="ung_ho_noi_dung" value="' + esc(s.ung_ho_noi_dung || "") + '"></div></div><div><label class="lab" for="d-qr">' + esc(t("dn2.tai_len_qr")) + '</label><input type="file" id="d-qr" accept="image/*" data-on="dn2-qr">' + (s.ung_ho_qr ? ' <button type="button" class="btn small" data-act="dn2-qr-xoa">' + esc(t("c.xoa")) + "</button>" : "") + '</div><p class="muted">' + esc(t("dn2.ghi_chu_cong_khai")) + '</p><button class="btn primary" type="submit">' + esc(t("c.luu")) + "</button></form></section>";
    return o;
  };
  U.ons["dn2-save"] = function (f) {
    var d = new FormData(f), o = {}; ["ung_ho_ngan_hang", "ung_ho_so_tk", "ung_ho_chu_tk", "ung_ho_noi_dung"].forEach(function (k) { o[k] = String(d.get(k) || "").trim(); });
    var r = U.attempt(function () { S.saveSettings(o); }); if (r.ok) { U.toast(t("c.da_luu")); U.rerender(); }
  };
  U.ons["dn2-qr"] = function (el) {
    var f = el.files && el.files[0]; if (!f) return; var rd = new FileReader();
    rd.onload = function () { var im = new Image(); im.onload = function () { var k = Math.min(1, 480 / Math.max(im.width, im.height)), c = document.createElement("canvas"); c.width = Math.round(im.width * k); c.height = Math.round(im.height * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); var r = U.attempt(function () { S.saveSettings({ ung_ho_qr: c.toDataURL("image/png") }); }); if (r.ok) { U.toast(t("c.da_luu")); U.rerender(); } }; im.src = rd.result; }; rd.readAsDataURL(f);
  };
  U.acts["dn2-qr-xoa"] = function () { var r = U.attempt(function () { S.saveSettings({ ung_ho_qr: "" }); }); if (r.ok) U.rerender(); };
})(typeof window !== "undefined" ? window : globalThis);
