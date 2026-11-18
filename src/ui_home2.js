/* Trang chủ đón khách: lối đi nhanh 4 nút lớn, khẩu hiệu, thẻ chức năng gọn hai cột trên điện thoại. */
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, t = U.t, esc = U.esc, P = U.pages;
  var QUICK = [["danh-sach", "🔎", "nav.q_tim"], ["so-do", "🌳", "nav.q_cay"], ["lich", "📅", "nav.q_lich"], ["ban-do", "🗺️", "nav.q_map"]];
  var old = P["trang-chu"];
  P["trang-chu"] = function () {
    var o = old(); if (!o || !o.html) return o;
    var q = '<nav class="quick" aria-label="' + esc(t("nav.q_tieu_de")) + '">' + QUICK.map(function (x, i) { return '<a class="qk q' + i + '" href="#' + x[0] + '"><span class="qi" aria-hidden="true">' + x[1] + "</span><b>" + esc(t(x[2])) + "</b></a>"; }).join("") + "</nav>";
    var k = '<section class="card datecard">'; if (o.html.indexOf(k) >= 0) o.html = o.html.replace(k, q + k);
    o.html = o.html.replace("</h1><p>", '</h1><p class="motto">“' + esc(t("hn.d1").replace(/\.$/, "")) + '”</p><p>');
    return o;
  };
})(typeof window !== "undefined" ? window : globalThis);
