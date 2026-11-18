// Giao diện "đại sảnh": hoành phi, đèn lồng, tờ lịch, dải số liệu vàng đồng (v1.41)
(function (G) {
  "use strict";
  var GP = G.GP, U = GP.ui, P = U.pages, t = U.t, esc = U.esc;
  var LANTERN = '<svg viewBox="0 0 40 74" aria-hidden="true"><path d="M20 0v10" stroke="#d9b45a" stroke-width="2"/><rect x="12" y="9" width="16" height="5" rx="2" fill="#d9b45a"/><ellipse cx="20" cy="32" rx="17" ry="20" fill="#c0281f"/><path d="M20 12c-8 6-8 34 0 40M20 12c8 6 8 34 0 40M4 32h32" stroke="#e8c874" stroke-width="1.2" fill="none" opacity=".7"/><rect x="12" y="50" width="16" height="5" rx="2" fill="#d9b45a"/><path d="M20 55v14M16 69h8" stroke="#d9b45a" stroke-width="2"/></svg>';
  var old = P["trang-chu"];
  P["trang-chu"] = function () {
    var o = old.apply(this, arguments); if (!o || !o.html) return o;
    var td = U.today();
    o.html = o.html.replace('<section class="hero">', '<section class="hero hero2"><i class="lan l1">' + LANTERN + '</i><i class="lan l2">' + LANTERN + '</i><div class="hp"><span>' + esc(t("hn.d1").replace(/\.$/, "")) + '</span></div>');
    o.html = o.html.replace('<span class="dc-ico" aria-hidden="true">📅</span>', '<span class="dc-day" aria-hidden="true"><small>' + esc(t("lich.thang")) + " " + td[1] + "</small><b>" + td[0] + "</b><small>" + td[2] + "</small></span>");
    return o;
  };
})(typeof window !== "undefined" ? window : globalThis);
