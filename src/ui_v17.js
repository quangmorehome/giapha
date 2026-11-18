/* v1.7: cửa sổ hồ sơ đầy đủ ngay tại trang, bộ lọc cây/sơ đồ, xuất tệp cho các trang có dữ liệu. */
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, S = GP.store, t = U.t, esc = U.esc, P = U.pages;

  // ---------- Bộ lọc hiển thị cho cây và sơ đồ ----------
  var FL = U.FL = { min: false, nobtn: false, dau: false, re: false, con_trai: false, con_gai: false, nam: false, nu: false, chau_trai: false, chau_gai: false };
  var KEYS = [["min", "flt.toi_gian", 1], ["nobtn", "flt.an_nut", 2], ["dau", "flt.an_dau"], ["re", "flt.an_re"], ["con_trai", "flt.an_con_trai"], ["con_gai", "flt.an_con_gai"], ["nam", "flt.an_nam"], ["nu", "flt.an_nu"], ["chau_trai", "flt.an_chau_trai"], ["chau_gai", "flt.an_chau_gai"]];
  // Ẩn một người con cháu (kèm cả nhánh của họ). depth: 1 = con, 2 = cháu so với người gốc
  U.fltHide = function (p, depth) {
    if (!depth) return false; var g = p.gioi_tinh;
    if (FL.nam && g === "nam") return true; if (FL.nu && g === "nu") return true;
    if (depth === 1 && ((FL.con_trai && g === "nam") || (FL.con_gai && g === "nu"))) return true;
    if (depth === 2 && ((FL.chau_trai && g === "nam") || (FL.chau_gai && g === "nu"))) return true;
    return false;
  };
  // Ẩn vợ/chồng của owner. q có thể null (mới chỉ có tên)
  U.fltSpouse = function (q, owner) {
    if (FL.min) return true;
    var g = q ? q.gioi_tinh : owner && owner.gioi_tinh === "nam" ? "nu" : owner && owner.gioi_tinh === "nu" ? "nam" : "";
    var inl = q ? U.isInlaw(q) : !!owner && !U.isInlaw(owner);
    if (FL.nam && g === "nam") return true; if (FL.nu && g === "nu") return true;
    if (inl && ((FL.dau && g === "nu") || (FL.re && g === "nam"))) return true;
    return false;
  };
  U.fltBar = function (kind) {
    var ks = KEYS.filter(function (k) { return kind === "tree" || k[2] !== 2; }), n = ks.filter(function (k) { return FL[k[0]]; }).length;
    return '<details class="card fltbar"' + (n ? " open" : "") + "><summary><b>" + esc(t("flt.loc")) + "</b>" + (n ? ' <span class="nbadge">' + n + "</span>" : "") + '</summary><div class="fpills">' + ks.map(function (k) {
      return '<button type="button" class="fpill' + (FL[k[0]] ? " on" : "") + '" data-act="flt" data-k="' + k[0] + '" aria-pressed="' + !!FL[k[0]] + '">' + esc(t(k[1])) + "</button>";
    }).join("") + (n ? '<button type="button" class="fpill ghost" data-act="flt-reset">' + esc(t("flt.bo_loc")) + "</button>" : "") + "</div></details>";
  };
  U.acts.flt = function (el) { var k = el.getAttribute("data-k"); FL[k] = !FL[k]; U.rerender(); };
  U.acts["flt-reset"] = function () { Object.keys(FL).forEach(function (k) { FL[k] = false; }); U.rerender(); };

  // ---------- Tải tệp ----------
  function stamp() { var d = new Date(); return d.getFullYear() + "" + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2); }
  function csv(rows) { return rows.map(function (r) { return r.map(function (c) { c = c == null ? "" : String(c); return /[",\n;]/.test(c) ? '"' + c.replace(/"/g, '""') + '"' : c; }).join(","); }).join("\r\n"); }
  function dlBlob(name, blob) {
    try { var a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 800); U.toast(t("xuat.da_tao", { f: name })); } catch (e) { U.toast(t("xuat.loi"), true); }
  }
  U.csv = csv;
  var XB = {
    "danh-sach": [["csv-ds", "xuat.csv"]], cay: [["txt-cay", "xuat.txt"]], "so-do": [["svg-dg", "xuat.svg"], ["png-dg", "xuat.png"]], mindmap: [["svg-dg", "xuat.svg"], ["png-dg", "xuat.png"]], "bong-bong": [["svg-dg", "xuat.svg"], ["png-dg", "xuat.png"]],
    "thong-ke": [["csv-tk", "xuat.csv"]], lich: [["ics", "xuat.ics"]], "di-tich": [["csv-dt", "xuat.csv"]], nguoi: [["txt-nguoi", "xuat.txt"]]
  };
  function xbar(k, arg) {
    return '<div class="xbar"><span aria-hidden="true">📤</span> <b>' + esc(t("xuat.tieu_de")) + "</b> " + XB[k].map(function (x) { return '<button type="button" class="btn small" data-act="' + x[0] + '"' + (arg ? ' data-id="' + esc(arg) + '"' : "") + ">" + esc(t(x[1])) + "</button>"; }).join(" ") + "</div>";
  }
  Object.keys(XB).forEach(function (k) {
    var o = P[k]; if (!o) return;
    P[k] = function (a) { var r = o(a); if (r && r.html && r.html.indexOf("</h1>") >= 0 && !(k === "nguoi" && !S.S.data.persons.length)) r.html = r.html.replace("</h1>", "</h1>" + xbar(k, k === "nguoi" ? a : "")); return r; };
  });
  U.acts["csv-ds"] = function () {
    var V = U.view(), rows = [[t("l.ten"), t("p.doi"), t("p.gioi_tinh"), t("p.sinh"), t("l.tinh_trang"), t("p.mat"), t("p.cha"), t("p.me"), t("vai.vai_tro"), t("p.vo_chong")]];
    U.listFiltered().forEach(function (p) {
      if (p.level === "hidden") return; var ri = U.roleInfo(p), sp = U.spousesOf(p.id).map(U.spouseName).join("; ");
      rows.push([U.fullName(p), p.the_thu, p.gioi_tinh === "nam" ? t("p.nam") : p.gioi_tinh === "nu" ? t("p.nu") : "", p.level === "full" && p.sinh ? U.dateTxt(p.sinh) : "", p.con_song === false ? t("p.da_mat") : t("p.con_song"), p.level === "full" && p.mat ? U.dateTxt(p.mat) : "", p.cha_id && V.by[p.cha_id] ? U.nameOf(p.cha_id) : "", p.me_id && V.by[p.me_id] ? U.nameOf(p.me_id) : p.me_ten, ri ? ri.label : "", sp]);
    });
    U.download("danh-sach-" + stamp() + ".csv", csv(rows), "text/csv");
  };
  U.acts["txt-cay"] = function () {
    var out = [];
    (function walk(ul, d) { [].forEach.call(ul.children, function (li) { var line = li.querySelector(":scope > details > summary, :scope > .leaf"); if (line) out.push(new Array(d + 1).join("    ") + "- " + line.textContent.replace(/\s+/g, " ").trim()); var sub = li.querySelector(":scope > ul, :scope > details > ul"); if (sub) walk(sub, d + 1); }); })(document.querySelector("ul.tree"), 0);
    U.download("cay-gia-pha-" + stamp() + ".txt", out.join("\r\n"), "text/plain");
  };
  function svgClone() {
    var svg = document.querySelector("#dgbox svg.dg"); if (!svg) return null;
    var vp = svg.querySelector("g.vp"), bb = vp.getBBox(), pad = 24, c = svg.cloneNode(true);
    var src = svg.querySelectorAll("*"), dst = c.querySelectorAll("*"), props = ["fill", "stroke", "stroke-width", "font-size", "font-family", "font-weight", "text-anchor", "opacity", "stroke-dasharray"];
    for (var i = 0; i < src.length; i++) { var cs = getComputedStyle(src[i]), st = ""; props.forEach(function (p) { st += p + ":" + cs.getPropertyValue(p) + ";"; }); dst[i].setAttribute("style", st); }
    [].forEach.call(c.querySelectorAll(".dgpop"), function (e) { e.remove(); });
    c.querySelector("g.vp").setAttribute("transform", "translate(" + (pad - bb.x) + "," + (pad - bb.y) + ")");
    var w = Math.ceil(bb.width + pad * 2), h = Math.ceil(bb.height + pad * 2);
    c.setAttribute("width", w); c.setAttribute("height", h); c.setAttribute("viewBox", "0 0 " + w + " " + h); c.setAttribute("xmlns", "http://www.w3.org/2000/svg"); c.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");
    var bg = getComputedStyle(document.body).backgroundColor, r = document.createElementNS("http://www.w3.org/2000/svg", "rect"); r.setAttribute("width", w); r.setAttribute("height", h); r.setAttribute("fill", bg); c.insertBefore(r, c.firstChild);
    return { xml: new XMLSerializer().serializeToString(c), w: w, h: h };
  }
  U.acts["svg-dg"] = function () { var s = svgClone(); if (!s) return; dlBlob("so-do-" + stamp() + ".svg", new Blob([s.xml], { type: "image/svg+xml" })); };
  U.acts["png-dg"] = function () {
    var s = svgClone(); if (!s) return; var k = Math.min(2, 8000 / Math.max(s.w, s.h)), img = new Image();
    img.onload = function () { try { var cv = document.createElement("canvas"); cv.width = s.w * k; cv.height = s.h * k; var cx = cv.getContext("2d"); cx.scale(k, k); cx.drawImage(img, 0, 0); cv.toBlob(function (b) { if (b) dlBlob("so-do-" + stamp() + ".png", b); else U.toast(t("xuat.loi"), true); }, "image/png"); } catch (e) { U.toast(t("xuat.loi"), true); } };
    img.onerror = function () { U.toast(t("xuat.loi"), true); };
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(s.xml);
  };
  U.acts["csv-tk"] = function () {
    var rows = [[t("xuat.muc"), t("xuat.gia_tri")]];
    [].forEach.call(document.querySelectorAll("#main .st"), function (e) { var n = e.querySelector(".st-n"), l = e.querySelector(".st-l,.st-lab"); rows.push(["", (l ? l.textContent : e.textContent).replace(/\s+/g, " ").trim(), n ? n.textContent.trim() : ""]); });
    [].forEach.call(document.querySelectorAll("#main section.card.sec"), function (sec) { var h = sec.querySelector("h2"); [].forEach.call(sec.querySelectorAll("li"), function (li) { rows.push([h ? h.textContent.trim() : "", li.textContent.replace(/\s+/g, " ").trim(), ""]); }); });
    U.download("thong-ke-" + stamp() + ".csv", csv(rows), "text/csv");
  };
  U.acts["csv-dt"] = function () {
    var rows = [[t("dt.ten_dt"), t("dt.loai"), t("dt.nam_xay"), t("rf.dia_chi"), t("xuat.mo_ta")]];
    S.S.data.sites.forEach(function (s) { rows.push([s.ten, t("loai." + s.loai), s.nam_xay, s.dia_chi, s.gioi_thieu]); });
    U.download("di-tich-" + stamp() + ".csv", csv(rows), "text/csv");
  };
  U.acts["txt-nguoi"] = function (el) {
    var box = el.closest(".sheet-body") || document.getElementById("main"), name = (box.querySelector("h1") || {}).textContent || "ho-so";
    var lines = []; [].forEach.call(box.querySelectorAll("h1,h2,h3,dt,dd,li,p.chips,.lc"), function (e) { if (e.closest(".xbar,.pbar,.row,.addrow")) return; var x = e.textContent.replace(/\s+/g, " ").trim(); if (!x) return; lines.push(e.tagName === "H1" ? x.toUpperCase() : /^H/.test(e.tagName) ? "\r\n" + x : e.tagName === "DT" ? x + ": " : x); });
    U.download("ho-so-" + name.trim().replace(/\s+/g, "-").toLowerCase() + ".txt", lines.join("\r\n").replace(/: \r\n/g, ": "), "text/plain");
  };

  // ---------- Cửa sổ hồ sơ đầy đủ ngay tại trang ----------
  var stack = [], open = false;
  function body(id) {
    var o = P.nguoi(id), d = document.createElement("div"); d.innerHTML = o.html;
    var f = d.firstElementChild; if (f && f.tagName === "P" && f.querySelector('a.btn[href="#danh-sach"]')) f.remove();
    return { html: d.innerHTML, title: o.title };
  }
  function draw() {
    var id = stack[stack.length - 1], b = body(id), bg = document.getElementById("sheet-bg");
    if (!bg) {
      bg = document.createElement("div"); bg.id = "sheet-bg"; bg.className = "sheet-bg"; document.body.appendChild(bg);
      bg.innerHTML = '<div class="sheet" role="dialog" aria-modal="true"><div class="sheet-bar"><button type="button" class="btn small" data-act="sheet-back" id="sheet-back">←</button><span class="grow"></span><button type="button" class="btn small" data-act="dg-root" id="sheet-root" hidden></button><a class="btn small ghost" data-nosheet href="#"  id="sheet-full">' + esc(t("sheet.trang_rieng")) + '</a><button type="button" class="btn small" data-act="sheet-close" aria-label="' + esc(t("c.dong")) + '">✕</button></div><div class="sheet-body" id="sheet-body" tabindex="-1"></div></div>';
      document.documentElement.classList.add("sheet-open");
    }
    bg.querySelector(".sheet").setAttribute("aria-label", b.title);
    var rb = bg.querySelector("#sheet-root"), inDg = !!document.getElementById("dgbox") && !!U.view().by[id] && U.view().by[id].level !== "hidden" && U.childrenOf(id).length > 0; rb.hidden = !inDg; rb.setAttribute("data-id", id); rb.textContent = t("dg.dat_goc");
    bg.querySelector("#sheet-back").hidden = stack.length < 2; bg.querySelector("#sheet-full").setAttribute("href", "#nguoi-" + id);
    var bd = bg.querySelector("#sheet-body"); bd.innerHTML = b.html; bd.scrollTop = 0; try { bd.focus({ preventScroll: true }); } catch (e) {}
  }
  function openSheet(id) {
    if (!open) { open = true; try { history.pushState({ gpsheet: 1 }, "", location.href); } catch (e) {} }
    stack.push(id); U.lastPerson = id; draw();
  }
  function closeSheet(viaPop) {
    var bg = document.getElementById("sheet-bg"); if (bg) bg.remove(); document.documentElement.classList.remove("sheet-open");
    var was = open, last = stack[stack.length - 1]; open = false; stack = [];
    if (was && !viaPop) { try { if (history.state && history.state.gpsheet) history.back(); } catch (e) {} }
    var main = document.getElementById("main"), a = last && main && main.querySelector('a[href="#nguoi-' + last.replace(/"/g, "") + '"]');
    if (a) { a.classList.add("flash"); setTimeout(function () { a.classList.remove("flash"); }, 1800); }
  }
  U.openSheet = openSheet; U.closeSheet = function () { closeSheet(false); };
  U.acts["sheet-close"] = function () { closeSheet(false); };
  U.acts["sheet-back"] = function () { if (stack.length > 1) { stack.pop(); draw(); } };
  window.addEventListener("popstate", function () { if (open) closeSheet(true); });
  window.addEventListener("hashchange", function () { if (open) closeSheet(true); });
  document.addEventListener("keydown", function (e) { if (open && e.key === "Escape") { e.preventDefault(); closeSheet(false); } });
  document.addEventListener("click", function (e) {
    if (e.defaultPrevented || e.button || e.metaKey || e.ctrlKey || e.shiftKey) return;
    var a = e.target.closest && e.target.closest("a[href]"); var bg = document.getElementById("sheet-bg");
    if (bg && e.target === bg) { closeSheet(false); return; }
    if (!a) return;
    var h = a.getAttribute("href") || "", inSheet = a.closest(".sheet");
    if (a.hasAttribute("data-nosheet")) { if (inSheet) closeSheet(true); return; }
    var m = /^#nguoi-(.+)$/.exec(h);
    if (m) {
      var cur = (location.hash.match(/^#([a-z-]+)/) || [])[1];
      if (!inSheet && (cur === "nguoi" || cur === "sua" || cur === "them")) return; // trang hồ sơ/biểu mẫu: đi như thường
      e.preventDefault(); openSheet(decodeURIComponent(m[1])); return;
    }
    if (inSheet && h.charAt(0) === "#") closeSheet(true); // liên kết khác (sửa, thêm...) đóng cửa sổ rồi đi
  }, false);
  var rr = U.rerender; U.rerender = function () { rr(); if (open && stack.length) { var bd = document.getElementById("sheet-body"), y = bd ? bd.scrollTop : 0; draw(); if (bd) document.getElementById("sheet-body").scrollTop = y; } };
})(typeof window !== "undefined" ? window : globalThis);
