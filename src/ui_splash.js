// v1.46: màn chào khi mở ứng dụng (logo, câu "Uống nước nhớ nguồn", đèn lồng); chạm để vào; chỉ hiện 1 lần mỗi phiên
(function (G) {
  "use strict";
  var GP = G.GP, U = GP.ui, t = U.t, esc = U.esc;
  function clan() { try { return String(((GP.store.S.data || {}).settings || {}).ten_dong_ho || "") || t("site.ten"); } catch (e) { return t("site.ten"); } }
  function show() {
    try { if (navigator.webdriver) return; if (sessionStorage.getItem("gp.splash")) return; sessionStorage.setItem("gp.splash", "1"); } catch (e) {}
    if (!document.body || document.getElementById("splash")) return;
    var rm = false; try { rm = matchMedia("(prefers-reduced-motion: reduce)").matches; } catch (e) {}
    var el = document.createElement("div"); el.id = "splash"; el.setAttribute("role", "presentation");
    el.innerHTML = '<i class="sp-lan l" aria-hidden="true"></i><i class="sp-lan r" aria-hidden="true"></i><div class="sp-in"><div class="sp-glow" aria-hidden="true"></div><img class="sp-logo" alt="" src="' + esc(GP.IMG.vuong || GP.IMG.nho) + '"><h1>' + esc(clan()) + '</h1><i class="sp-band" aria-hidden="true"></i><p>“' + esc(t("hn.d1")) + '”</p><small>' + esc(t("sp.cham")) + "</small></div>";
    document.body.appendChild(el);
    var done = false; function out() { if (done) return; done = true; el.classList.add("out"); setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 700); }
    el.addEventListener("click", out); el.addEventListener("keydown", out); setTimeout(out, rm ? 900 : 2100);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", show); else setTimeout(show, 0);
})(typeof window !== "undefined" ? window : globalThis);
