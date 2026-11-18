/* Sơ đồ phả hệ bằng SVG tự vẽ (không cần thư viện): sơ đồ cặp vợ chồng, mindmap, bong bóng. Kéo, cuộn chuột, chụm hai ngón, bàn phím. */
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, S = GP.store, t = U.t, esc = U.esc, P = U.pages;
  var rootSel = null, rootGen = 0, dgScope = "noi", rootAll = false;
  // Gốc mặc định khi có nhiều cụm gia đình: cụm đông con cháu nhất (không dồn nhiều dòng họ vào một khung nhỏ)
  function descN(id, seen) { seen = seen || {}; if (seen[id]) return 0; seen[id] = 1; return 1 + U.famKids(id).reduce(function (a, c) { return a + descN(c.id, seen); }, 0); }
  function topOf(p) { var V = U.view(), n = 0; while (n++ < 60) { var f = p.cha_id && V.by[p.cha_id] || p.me_id && V.by[p.me_id]; if (!f) break; p = f; } return p.id; }
  function defRoot(list) { var tops = {}; list.forEach(function (p) { tops[topOf(p)] = 1; }); return Object.keys(tops).length > 1 ? bigRoot(list) : ""; }
  function bigRoot(list) { var best = null, bn = -1; list.forEach(function (p) { var n = descN(p.id); if (n > bn) { bn = n; best = p; } }); return best ? best.id : ""; }

  // Thuộc nội tộc (họ Tống) khi: mang họ của dòng họ, hoặc có cha/mẹ thuộc họ Tống (kể cả con của con gái). Gia đình thông gia không có cha/mẹ họ Tống → ngoại tộc.
  function clanName() { var n = String((GP.store.S.data.settings || {}).ten_dong_ho || "Tống").replace(/^\s*họ\s+/i, "").trim().toLowerCase(); return n || "tống"; }
  function sNoi(p, d) {
    var V = U.view(); if (!p) return false; d = d || 0; if (d > 40) return true;
    if (p.vai === "ruot") return true;
    if (p.vai === "dau_re" || p.vai === "thong_gia" || U.isInlaw(p) || U.isTG(p)) return false;
    var ho = String(p.ho || "").trim().toLowerCase();
    if (ho && ho === clanName()) return true;
    var f = p.cha_id && V.by[p.cha_id], m = p.me_id && V.by[p.me_id];
    if ((f && sNoi(f, d + 1)) || (m && sNoi(m, d + 1))) return true;
    if (ho) return false; // có ghi họ khác và không có cha/mẹ họ Tống
    return !f && !m ? U.isNoi(p) : false;
  }
  function sortKids(a, b) { var x = a.thu_tu_con == null ? 9999 : a.thu_tu_con, y = b.thu_tu_con == null ? 9999 : b.thu_tu_con; return x - y || ((a.sinh && a.sinh.nam) || 0) - ((b.sinh && b.sinh.nam) || 0); }
  function build(id, seen, depth) {
    var p = U.view().by[id]; if (!p || seen[id]) return null; seen[id] = 1;
    var node = { p: p, depth: depth, kids: [], sp: [] };
    node.sp = U.spousesOf(id).map(function (s) { var q = s.spouse_person_id && U.view().by[s.spouse_person_id]; return { id: s.spouse_person_id, p: q || null, name: s.spouse_person_id ? U.nameOf(s.spouse_person_id) : (s.ten || t("p.chua_ro")), tt: s.tinh_trang }; }).filter(function (s) { return !U.fltSpouse(s.p, p); });
    node.sp.forEach(function (s) { if (s.id) seen[s.id] = 1; });
    if (dgScope === "ngoai" && depth > 0 && sNoi(p) && GP.store.S.viewer.role !== "member") return node; // sơ đồ ngoại tộc dừng ở người đã thuộc nội tộc (đã có sơ đồ nội tộc)
    U.famKids(id).sort(sortKids).filter(function (c) { return !seen[c.id] && !U.fltHide(c, depth + 1); }).forEach(function (c) { var n = build(c.id, seen, depth + 1); if (n) node.kids.push(n); });
    return node;
  }

  // Nhiều người cùng đời làm gốc: gộp vào một "gốc ảo" không vẽ, để ba kiểu sơ đồ vẫn dùng chung một cây
  function forest(ids) {
    var seen = {}, v = { p: null, virtual: true, depth: -1, kids: [], sp: [] };
    ids.forEach(function (id) { var n = U.fltHide(U.view().by[id], 0) ? null : build(id, seen, 0); if (n) v.kids.push(n); });
    return v;
  }
  // Những người đứng đầu một đời: người trong họ (không phải dâu/rể/thông gia), xếp theo thứ tự anh em
  function genPeople(g) {
    var V = U.view();
    if (!g) return U.rootsOf().filter(function (p) { return sNoi(p); });
    return V.list.filter(function (p) { return p.level !== "hidden" && !U.isTG(p) && !U.isInlaw(p) && !(p.gioi_tinh === "nu" && !p.cha_id && !p.me_id && U.spousesOf(p.id).length) && U.gen(p) === g && sNoi(p); })
      .sort(function (a, b) { var x = U.seniorKey(a), y = U.seniorKey(b); return x < y ? -1 : x > y ? 1 : 0; });
  }
  // Gốc các gia đình ngoại tộc: người ngoài dòng họ không có cha/mẹ ngoại tộc phía trên, và có con ghi nhận (ví dụ bố mẹ của dâu/rể kèm anh chị em)
  function ngoaiRoots() {
    var V = U.view();
    return V.list.filter(function (p) {
      if (p.level === "hidden" || sNoi(p)) return false;
      var f = p.cha_id && V.by[p.cha_id], m = p.me_id && V.by[p.me_id];
      if ((f && !sNoi(f)) || (m && !sNoi(m))) return false;
      if (U.spousesOf(p.id).length && !f && !m) { var sp = U.spousesOf(p.id).map(function (s) { return V.by[s.spouse_person_id]; }).filter(Boolean); if (sp.some(function (q) { return q.gioi_tinh !== p.gioi_tinh; }) && sp.every(function (q) { return sNoi(q) || ((q.cha_id || q.me_id) && !sNoi(q) ? false : true); }) && p.gioi_tinh === "nu") return false; }
      return U.famKids(p.id).some(function (c) { return !sNoi(c); });
    }).sort(function (a, b) { return U.fullName(a) < U.fullName(b) ? -1 : 1; });
  }
  function bridgeName(p) { // người của dòng họ có quan hệ thông gia với gia đình này
    var V = U.view(), seen = {}, q = [p], hit = "";
    while (q.length && !hit) { var x = q.shift(); if (seen[x.id]) continue; seen[x.id] = 1;
      U.spousesOf(x.id).forEach(function (s) { var y = V.by[s.spouse_person_id]; if (y && sNoi(y) && !hit) hit = U.fullName(y); });
      U.famKids(x.id).forEach(function (c) { if (sNoi(c) && !hit) hit = U.fullName(c); else if (!sNoi(c)) q.push(c); }); }
    return hit;
  }
  function genList() {
    var V = U.view(), o = {}; V.list.forEach(function (p) { if (p.level === "hidden" || U.isTG(p) || U.isInlaw(p) || !sNoi(p)) return; var g = U.gen(p); if (g) o[g] = 1; });
    var out = Object.keys(o).map(Number).sort(function (a, b) { return a - b; }); return out.length ? out : [0];
  }

  // Đời hiển thị cho từng tầng: lấy đời nhỏ nhất ghi trên các thẻ của tầng đó, thiếu thì suy từ gốc
  function depthGens(tree) {
    var by = {}, maxD = 0; (function w(n) { maxD = Math.max(maxD, n.depth); var g = n.p ? U.gen(n.p) : 0; if (g) by[n.depth] = by[n.depth] ? Math.min(by[n.depth], g) : g; n.kids.forEach(w); })(tree);
    var base = null; Object.keys(by).forEach(function (d) { if (base === null) base = by[d] - d; });
    var out = []; for (var d = 0; d <= maxD; d++) out.push(by[d] || (base !== null ? base + d : 0)); return out;
  }
  function gl(g, d) { return g ? t("p.doi") + " " + g : "· " + (d + 1); }
  // Chuỗi tổ tiên từ đời 1 xuống người đang chọn làm gốc
  function ancestors(id) {
    var V = U.view(), out = [], cur = V.by[id], guard = 0;
    while (cur && guard++ < 60) { var up = cur.cha_id && V.by[cur.cha_id] ? V.by[cur.cha_id] : cur.me_id && V.by[cur.me_id] ? V.by[cur.me_id] : null; if (!up || out.indexOf(up) >= 0) break; out.unshift(up); cur = up; }
    return out;
  }
  function crumbs(id) {
    var V = U.view(), anc = ancestors(id); if (!anc.length) return "";
    var one = function (p, on) { return '<button type="button" class="crumb' + (on ? " on" : "") + '" data-act="dg-root" data-id="' + esc(p.id) + '">' + (U.gen(p) ? "<small>" + esc(t("p.doi") + " " + U.gen(p)) + "</small> " : "") + esc(p.level === "hidden" ? t("p.da_an_ten") : U.fullName(p)) + "</button>"; };
    return '<nav class="crumbs card" aria-label="' + esc(t("dg.duong_ve")) + '"><b>' + esc(t("dg.duong_ve")) + "</b>" + anc.map(function (p) { return one(p, false); }).join('<span class="sep" aria-hidden="true">›</span>') + '<span class="sep" aria-hidden="true">›</span>' + one(V.by[id], true) + '<button type="button" class="btn small" data-act="dg-root" data-id="' + esc(anc[0].id) + '">⇧ ' + esc(t("dg.tu_goc")) + "</button></nav>";
  }
  function count(n) { n.desc = 0; n.leaves = 0; n.kids.forEach(function (k) { count(k); n.desc += 1 + k.desc; n.leaves += k.leaves; }); if (!n.kids.length) n.leaves = 1; return n; }
  function cut(s, n) { s = String(s); return s.length > n ? s.slice(0, n - 1) + "…" : s; }
  function nickSub(p, sub) { return p && p.level !== "hidden" && p.ten_thuong_goi ? "“" + p.ten_thuong_goi + "”" + (sub ? " · " + sub : "") : sub; }
  function nm(p) { return p.level === "hidden" ? t("p.da_an_ten") : U.fullName(p); }
  function cls(p) { return p ? (p.level === "hidden" ? "hid" : p.gioi_tinh === "nu" ? "f" : "m") : "x"; }

  // ---------- khung kéo thả ----------
  function mount(box, inner, W, H, label) {
    box.innerHTML = '<svg class="dg" role="group" tabindex="0" aria-label="' + esc(label) + '" width="100%" height="100%"><g class="vp">' + inner + "</g></svg>";
    var svg = box.querySelector("svg"), g = svg.querySelector("g.vp"), st = { k: 1, x: 0, y: 0 }, ptr = {}, drag = null, pinch = null;
    function apply() { g.setAttribute("transform", "translate(" + st.x + "," + st.y + ") scale(" + st.k + ")"); }
    function dims() { return { width: box.clientWidth || svg.clientWidth || 600, height: box.clientHeight || svg.clientHeight || 400 }; }
    var touched = false;
    function fit() { touched = false; var r = dims(), k = Math.min(r.width / (W + 40), r.height / (H + 40), 1.2); st.k = Math.max(k, 0.04); st.x = (r.width - W * st.k) / 2; st.y = 20; apply(); }
    function zoomAt(f, cx, cy) { touched = true; var k = Math.max(0.04, Math.min(3, st.k * f)), r = k / st.k; st.x = cx - (cx - st.x) * r; st.y = cy - (cy - st.y) * r; st.k = k; apply(); }
    function center() { var r = dims(); return [r.width / 2, r.height / 2]; }
    svg.addEventListener("wheel", function (e) { e.preventDefault(); var r = svg.getBoundingClientRect(); zoomAt(e.deltaY < 0 ? 1.12 : 1 / 1.12, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
    svg.addEventListener("pointerdown", function (e) { touched = true; lastMoved = false; ptr[e.pointerId] = [e.clientX, e.clientY]; var ks = Object.keys(ptr); if (ks.length === 1) drag = { x: e.clientX, y: e.clientY, sx: st.x, sy: st.y, moved: false }; if (ks.length === 2) { var a = ptr[ks[0]], b = ptr[ks[1]]; pinch = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), k: st.k }; drag = null; } });
    svg.addEventListener("pointermove", function (e) {
      if (!ptr[e.pointerId]) return; ptr[e.pointerId] = [e.clientX, e.clientY]; var ks = Object.keys(ptr);
      if (ks.length === 2 && pinch) { var a = ptr[ks[0]], b = ptr[ks[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]), r = svg.getBoundingClientRect(); zoomAt((pinch.k * d / pinch.d) / st.k, (a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top); return; }
      if (drag) { var dx = e.clientX - drag.x, dy = e.clientY - drag.y; if (!drag.moved && Math.hypot(dx, dy) > 5) { drag.moved = true; try { svg.setPointerCapture(e.pointerId); } catch (x) {} svg.classList.add("grab"); } if (drag.moved) { st.x = drag.sx + dx; st.y = drag.sy + dy; apply(); } }
    });
    var lastMoved = false;
    function up(e) { lastMoved = !!(drag && drag.moved); delete ptr[e.pointerId]; if (Object.keys(ptr).length < 2) pinch = null; if (!Object.keys(ptr).length) { drag = null; svg.classList.remove("grab"); } }
    svg.addEventListener("pointerup", up); svg.addEventListener("pointercancel", up);
    // làm mờ nhánh không liên quan khi rê/chạm vào một người (sơ đồ ngang)
    function focusMM(id) {
      var ns = svg.querySelectorAll(".mmn"), ls = svg.querySelectorAll(".mml");
      if (!ns.length) return;
      if (!id) { svg.classList.remove("dimmed"); [].forEach.call(ns, function (e) { e.classList.remove("rel", "sel"); }); [].forEach.call(ls, function (e) { e.classList.remove("rel"); }); return; }
      svg.classList.add("dimmed");
      var rel = function (nid, anc) { return nid === id || anc.indexOf("," + id + ",") >= 0 || (anc.indexOf("," + nid + ",") >= 0 && false); };
      var me = svg.querySelector('.mmn[data-id="' + id.replace(/"/g, "") + '"]'), mine = me ? me.getAttribute("data-anc") : ",";
      [].forEach.call(ns, function (e) { var nid = e.getAttribute("data-id"), a = e.getAttribute("data-anc"); var r = rel(nid, a) || mine.indexOf("," + nid + ",") >= 0; e.classList.toggle("rel", r); e.classList.toggle("sel", nid === id); });
      [].forEach.call(ls, function (e) { var to = e.getAttribute("data-to"), a = e.getAttribute("data-anc"); e.classList.toggle("rel", to === id || a.indexOf("," + id + ",") >= 0 || mine.indexOf("," + to + ",") >= 0); });
    }
    var pin = null;
    svg.addEventListener("pointerover", function (e) { var g = e.target.closest && e.target.closest(".mmn"); focusMM(g ? g.getAttribute("data-id") : pin); });
    svg.addEventListener("pointerleave", function () { focusMM(pin); });
    // Bấm vào một người: hiện cửa sổ nhỏ ngay trong sơ đồ (không chuyển trang), giữ sáng cả chi
    box.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest("a.dg-a");
      if (!a) { if (e.target.closest && e.target.closest(".dgpop")) return; if (!lastMoved) closePop(); return; }
      e.preventDefault();
      if (lastMoved) { lastMoved = false; return; }
      var pid = decodeURIComponent((a.getAttribute("href") || "").replace("#nguoi-", "")), g = a.closest(".mmn");
      var nid = g ? g.getAttribute("data-id") : pid, coarse = false; try { coarse = matchMedia("(pointer: coarse)").matches || window.innerWidth < 800; } catch (er) {}
      if (coarse && g && pin !== nid) { // điện thoại: chạm lần 1 chỉ làm sáng cả nhánh + thanh tên nhỏ; chạm lần 2 hoặc bấm "Hồ sơ" mới mở hồ sơ đầy đủ
        pin = nid; focusMM(pin); U.lastPerson = pid; showTip(pid); return;
      }
      pin = nid; focusMM(pin); U.lastPerson = pid; U.openSheet(pid);
    });
    function showTip(pid) {
      var el = box.querySelector(".dgtip"); if (!el) { el = document.createElement("div"); el.className = "dgtip"; el.setAttribute("role", "status"); box.appendChild(el); }
      var p = U.view().by[pid], g = p && U.gen ? U.gen(p) : "";
      el.innerHTML = '<span class="dgtip-n"><b>' + esc(U.nameOf(pid)) + "</b>" + (g ? "<small>" + esc(t("p.doi") + " " + g) + "</small>" : "") + '</span><button type="button" class="btn small primary" data-tip-open="' + esc(pid) + '">' + esc(t("dg.ho_so")) + '</button><button type="button" class="btn small ghost" data-pop-close aria-label="×">✕</button>';
    }
    box.addEventListener("click", function (e) { var b = e.target.closest && e.target.closest("[data-tip-open]"); if (b) { U.lastPerson = b.getAttribute("data-tip-open"); U.openSheet(U.lastPerson); } });
    function openPop(pid) {
      var el = box.querySelector(".dgpop"); if (!el) { el = document.createElement("div"); el.className = "dgpop"; el.setAttribute("role", "dialog"); el.setAttribute("aria-modal", "false"); box.appendChild(el); }
      el.innerHTML = U.popHtml(pid); var b = el.querySelector("[data-pop-close]"); if (b) b.focus();
    }
    function closePop() { var el = box.querySelector(".dgpop"); if (el) el.remove(); var tp = box.querySelector(".dgtip"); if (tp) tp.remove(); pin = null; focusMM(null); }
    box.addEventListener("click", function (e) { if (e.target.closest && e.target.closest("[data-pop-close]")) closePop(); });
    box.addEventListener("keydown", function (e) { if (e.key === "Escape") closePop(); });
    svg.addEventListener("keydown", function (e) {
      var c = center(), s = 40;
      if (e.key === "+" || e.key === "=") zoomAt(1.2, c[0], c[1]); else if (e.key === "-") zoomAt(1 / 1.2, c[0], c[1]); else if (e.key === "0") fit();
      else if (e.key === "ArrowLeft") { st.x += s; apply(); } else if (e.key === "ArrowRight") { st.x -= s; apply(); } else if (e.key === "ArrowUp") { st.y += s; apply(); } else if (e.key === "ArrowDown") { st.y -= s; apply(); } else return;
      e.preventDefault();
    });
    U.dg = { closePop: closePop, fit: fit, zoom: function (f) { var c = center(); zoomAt(f, c[0], c[1]); } };
    // Quay lại từ hồ sơ một người: đưa người đó vào giữa khung và giữ sáng chi của họ
    function focusLast() {
      var id = U.lastPerson; if (!id) return;
      var a = svg.querySelector('a.dg-a[href="#nguoi-' + id.replace(/"/g, "") + '"]'), grp = a && a.closest(".mmn"); if (!a) return;
      var bb; try { bb = a.getBBox(); } catch (e) { return; }
      var r = dims(), sx = st.x + (bb.x + bb.width / 2) * st.k, sy = st.y + (bb.y + bb.height / 2) * st.k, inView = sx > 20 && sx < r.width - 20 && sy > 20 && sy < r.height - 20;
      if (grp) { pin = grp.getAttribute("data-id"); focusMM(pin); }
      // người vừa xem đã nằm trong khung vừa-khít thì chỉ làm sáng, không phóng/đẩy sơ đồ; chỉ dời khung khi quay lại bằng nút Back mà người đó nằm ngoài khung
      if (inView || !U.back) return;
      touched = true; st.k = Math.min(1.2, Math.max(st.k, 0.9)); st.x = r.width / 2 - (bb.x + bb.width / 2) * st.k; st.y = r.height / 2 - (bb.y + bb.height / 2) * st.k; apply();
    }
    setTimeout(function () { fit(); focusLast(); }, 0);
    // khung đổi cỡ (hết hiệu ứng vào trang, xoay máy, mở/đóng thanh bên): tự căn lại nếu người dùng chưa kéo/phóng
    try { var ro = new ResizeObserver(function () { if (!touched && box.isConnected) { var k0 = st.k; fit(); } }); ro.observe(box); } catch (e) {}
  }
  U.acts["dg-in"] = function () { U.dg && U.dg.zoom(1.25); }; U.acts["dg-out"] = function () { U.dg && U.dg.zoom(0.8); }; U.acts["dg-fit"] = function () { U.dg && U.dg.fit(); };

  // ---------- 1. Sơ đồ cặp vợ chồng (từ trên xuống) ----------
  var CW = 172, CH = 60, GX = 26, GY = 70;
  function card(x, y, p, name, sub, c) {
    if (p && p.level !== "hidden" && p.ten_thuong_goi) sub = "“" + p.ten_thuong_goi + "”" + (sub ? " · " + sub : "");
    var inner = '<rect class="dg-card ' + c + '" x="' + x + '" y="' + y + '" width="' + CW + '" height="' + CH + '" rx="10"/><text class="dg-n" x="' + (x + CW / 2) + '" y="' + (y + 25) + '" text-anchor="middle">' + esc(cut(name, 20)) + '</text><text class="dg-s" x="' + (x + CW / 2) + '" y="' + (y + 47) + '" text-anchor="middle">' + esc(cut(sub, 30)) + "</text>";
    return p ? '<a class="dg-a" href="#nguoi-' + esc(p.id) + '" aria-label="' + esc(name) + '"><title>' + esc(name) + "</title>" + inner + "</a>" : "<g><title>" + esc(name) + "</title>" + inner + "</g>";
  }
  function layoutTD(n) { var cards = n.virtual ? 0 : 1 + n.sp.length; n.w = n.virtual ? 0 : cards * CW + (cards - 1) * 14; n.kids.forEach(layoutTD); var ks = n.kids.reduce(function (a, k) { return a + k.sw; }, 0) + Math.max(0, n.kids.length - 1) * GX; n.sw = Math.max(n.w, ks); }
  function placeTD(n, left) {
    var cur = left + (n.sw - (n.kids.reduce(function (a, k) { return a + k.sw; }, 0) + Math.max(0, n.kids.length - 1) * GX)) / 2;
    n.kids.forEach(function (k) { placeTD(k, cur); cur += k.sw + GX; });
    n.cx = n.kids.length ? (n.kids[0].cx + n.kids[n.kids.length - 1].cx) / 2 : left + n.sw / 2; n.y = n.depth * (CH + GY);
  }
  function drawTD(n, out, anc) {
    if (n.virtual) { n.kids.forEach(function (k) { drawTD(k, out, ","); }); return; }
    anc = anc || ","; var me = anc + n.p.id + ",";
    var left = n.cx - n.w / 2, y = n.y;
    out.cards += '<g class="mmn' + (anc === "," ? " root" : "") + '" data-id="' + esc(n.p.id) + '" data-anc="' + esc(anc) + '">' + card(left, y, n.p, nm(n.p), n.p.level === "hidden" ? "" : [U.gen(n.p) ? t("p.doi") + " " + U.gen(n.p) : "", U.span(n.p)].filter(Boolean).join(" · "), cls(n.p));
    n.sp.forEach(function (s, i) { var x = left + (i + 1) * (CW + 14); out.cards += '<line class="dg-l" x1="' + (x - 14) + '" y1="' + (y + CH / 2) + '" x2="' + x + '" y2="' + (y + CH / 2) + '"/>' + card(x, y, s.p && s.p.level !== "hidden" ? s.p : null, s.p ? nm(s.p) : s.name, t("tt." + (s.tt || "dang_o")), s.p ? cls(s.p) : "x"); });
    out.cards += "</g>";
    n.kids.forEach(function (k) { var y1 = y + CH, ym = y1 + GY / 2; out.links += '<path class="dg-l mml" data-to="' + esc(k.p.id) + '" data-anc="' + esc(me) + '" d="M' + n.cx + " " + y1 + " V" + ym + " H" + k.cx + " V" + k.y + '" fill="none"/>'; drawTD(k, out, me); });
  }
  // ---------- 2. Mindmap (trái sang phải) ----------
  var MW = 190, MH = 46, MGX = 70, MGY = 14;
  function layoutMM(n, st) {
    n.kids.forEach(function (k) { layoutMM(k, st); });
    n.y = n.kids.length ? (n.kids[0].y + n.kids[n.kids.length - 1].y) / 2 : st.leaf++ * (MH + MGY);
    n.x = n.depth * (MW + MGX);
  }
  function initial(p) { var n = (p.ten || U.fullName(p) || "?").trim().split(/\s+/).pop() || "?"; return n.charAt(0).toUpperCase(); }
  function drawMM(n, out, anc) {
    if (n.virtual) { n.kids.forEach(function (k) { drawMM(k, out, ","); }); return; }
    anc = anc || ",";
    var c = cls(n.p), hid = n.p.level === "hidden", me = anc + n.p.id + ",";
    var sp = n.sp.length ? "+ " + n.sp.map(function (s) { return s.name; }).join(", ") : (hid ? "" : U.span(n.p));
    var tx = n.x + 46 + (MW - 46) / 2, cy = n.y + MH / 2;
    out.cards += '<g class="mmn' + (anc === "," ? " root" : "") + '" data-id="' + esc(n.p.id) + '" data-anc="' + esc(anc) + '">' + (hid ? "" : '<a class="dg-a" href="#nguoi-' + esc(n.p.id) + '" aria-label="' + esc(nm(n.p)) + '">') + '<title>' + esc(nm(n.p)) + '</title><rect class="dg-card ' + c + '" x="' + n.x + '" y="' + n.y + '" width="' + MW + '" height="' + MH + '" rx="' + (MH / 2) + '"/><circle class="dg-av ' + c + '" cx="' + (n.x + 23) + '" cy="' + cy + '" r="17"/><text class="dg-ai" x="' + (n.x + 23) + '" y="' + (cy + 5) + '" text-anchor="middle">' + esc(hid ? "·" : initial(n.p)) + '</text><text class="dg-n" x="' + tx + '" y="' + (n.y + 19) + '" text-anchor="middle">' + esc(cut(nm(n.p), 18)) + '</text><text class="dg-s" x="' + tx + '" y="' + (n.y + 37) + '" text-anchor="middle">' + esc(cut(nickSub(n.p, sp), 24)) + "</text>" + (hid ? "" : "</a>") + "</g>";
    n.kids.forEach(function (k) { out.links += '<path class="dg-l mml" data-to="' + esc(k.p.id) + '" data-anc="' + esc(me) + '" fill="none" d="M' + (n.x + MW) + " " + cy + " C" + (n.x + MW + MGX / 2) + " " + cy + " " + (k.x - MGX / 2) + " " + (k.y + MH / 2) + " " + k.x + " " + (k.y + MH / 2) + '"/>'; drawMM(k, out, me); });
  }
  // ---------- 3. Bong bóng (tỏa tròn, cỡ bóng theo số con cháu) ----------
  function radius(n) { return 16 + 7 * Math.sqrt(n.desc); }
  var lastRing = {};
  function layoutBB(root) {
    var off = root.virtual ? 1 : 0, levels = {}; (function walk(n) { (levels[n.depth + off] = levels[n.depth + off] || []).push(n); n.r = radius(n); n.kids.forEach(walk); })(root);
    var ringR = { 0: 0 }, depths = Object.keys(levels).map(Number).sort(function (a, b) { return a - b; });
    depths.forEach(function (d) { if (!d) return; var circ = levels[d].reduce(function (a, n) { return a + 2 * n.r + 16; }, 0); ringR[d] = Math.max(ringR[d - 1] + 100, circ / (2 * Math.PI)); });
    lastRing = ringR;
    (function place(n, a0, a1) {
      var a = (a0 + a1) / 2, d = n.depth + off; n.x = d ? Math.cos(a) * ringR[d] : 0; n.y = d ? Math.sin(a) * ringR[d] : 0;
      var cur = a0, tot = n.kids.reduce(function (s, k) { return s + k.leaves; }, 0) || 1;
      n.kids.forEach(function (k) { var span = (a1 - a0) * (k.leaves / tot); place(k, cur, cur + span); cur += span; });
    })(root, 0, Math.PI * 2);
    var maxR = ringR[depths[depths.length - 1]] + 80; return maxR;
  }
  function drawBB(n, out, off, parent, anc) {
    if (n.virtual) { n.kids.forEach(function (k) { drawBB(k, out, off, null, ","); }); return; }
    anc = anc || ","; var me = anc + n.p.id + ",";
    var x = n.x + off, y = n.y + off;
    if (parent) out.links += '<line class="dg-l mml" data-to="' + esc(n.p.id) + '" data-anc="' + esc(anc) + '" x1="' + (parent.x + off) + '" y1="' + (parent.y + off) + '" x2="' + x + '" y2="' + y + '"/>';
    var hid = n.p.level === "hidden", lab = hid ? t("p.da_an_ten") : n.p.ten;
    out.cards += '<g class="mmn' + (anc === "," ? " root" : "") + '" data-id="' + esc(n.p.id) + '" data-anc="' + esc(anc) + '">' + (hid ? "" : '<a class="dg-a" href="#nguoi-' + esc(n.p.id) + '" aria-label="' + esc(nm(n.p)) + '">') + '<title>' + esc(nm(n.p)) + '</title><circle class="dg-card ' + cls(n.p) + '" cx="' + x + '" cy="' + y + '" r="' + n.r + '"/><text class="dg-n" font-size="' + Math.max(11, Math.min(15, n.r / 2.2)) + '" x="' + x + '" y="' + (y + 4) + '" text-anchor="middle">' + esc(cut(lab, Math.max(5, Math.floor(n.r / 4.5)))) + "</text>" + (n.r < 34 ? "" : '<text class="dg-s" x="' + x + '" y="' + (y + 20) + '" text-anchor="middle">' + esc(n.desc ? t("dg.con_chau", { n: n.desc }) : "") + "</text>") + (hid ? "" : "</a>") + "</g>";
    n.kids.forEach(function (k) { drawBB(k, out, off, n, me); });
  }

  // Cửa sổ thông tin nhanh khi bấm vào một người trong sơ đồ
  U.popHtml = function (id) {
    var V = U.view(), p = V.by[id]; if (!p) return "";
    if (p.level === "hidden") return '<button type="button" class="pop-x" data-pop-close aria-label="' + esc(t("c.dong")) + '">✕</button><h3>' + esc(t("p.da_an_ten")) + "</h3><p class=\"muted\">" + esc(t("p.da_an_mo_ta")) + "</p>";
    var basic = p.level === "basic", sps = U.spousesOf(id), kids = U.childrenAll(id), row = function (k, v) { return v ? "<dt>" + esc(k) + "</dt><dd>" + v + "</dd>" : ""; };
    var nameLink = function (i) { return i && V.by[i] ? '<a href="#nguoi-' + esc(i) + '">' + esc(U.fullName(V.by[i])) + "</a>" : ""; };
    var spTxt = sps.map(function (s) { return s.spouse_person_id ? nameLink(s.spouse_person_id) : esc(U.spouseName(s)); }).filter(Boolean).join(", ");
    var mom = p.me_id ? nameLink(p.me_id) : esc(p.me_ten || "");
    return '<button type="button" class="pop-x" data-pop-close aria-label="' + esc(t("c.dong")) + '">✕</button><div class="pop-h">' + U.av(p, "xl") + "<div><h3>" + esc(U.fullName(p)) + U.nickTag(p) + "</h3><span class=\"muted\">" + esc(U.span(p)) + "</span></div></div><dl class=\"kv pop-kv\">" +
      row(t("p.doi"), esc(U.gen(p) || "")) + (basic ? "" : row(t("p.sinh"), esc(p.sinh ? U.dateTxt(p.sinh) : "")) + (p.con_song === false ? row(t("p.mat"), esc(p.mat ? U.dateTxt(p.mat) : "")) : "")) +
      row(t("p.cha"), nameLink(p.cha_id)) + row(t("p.me"), mom) + row(t("p.vo_chong"), spTxt) + row(t("p.con"), kids.length ? esc(String(kids.length)) : "") + "</dl>" +
      '<div class="row"><a class="btn primary" href="#nguoi-' + esc(id) + '">' + esc(t("dg.xem_ho_so")) + '</a><button type="button" class="btn" data-act="dg-root" data-id="' + esc(id) + '">' + esc(t("dg.dat_goc")) + '</button><button type="button" class="btn ghost" data-pop-close>' + esc(t("c.dong")) + "</button></div>";
  };
  U.acts["dg-root"] = function (el) { rootSel = el.getAttribute("data-id"); var rp = U.view().by[rootSel]; if (rp && U.gen(rp)) rootGen = U.gen(rp); if (U.closeSheet) U.closeSheet(); U.rerender(); };

  // Chọn "bắt đầu từ đời N" rồi chọn một người của đời đó (hoặc tất cả người đời đó). Trả về {gens, people, gen, root}
  function pickRoot() {
    var V = U.view();
    // Người nhà thuộc ngoại tộc: mở sơ đồ ở chế độ Ngoại tộc ngay lần đầu (họ vẫn đổi sang Nội tộc được)
    var vw = GP.store.S.viewer; if (!pickRoot.init && vw && vw.role === "member" && vw.person_id && V.by[vw.person_id]) { pickRoot.init = true; if (!sNoi(V.by[vw.person_id])) dgScope = "ngoai"; }
    if (dgScope === "ngoai") { var ng = ngoaiRoots(); if (rootSel && !ng.some(function (p) { return p.id === rootSel; })) rootSel = ""; return { gens: [], people: ng, gen: 0, root: rootSel || (ng.length === 1 ? ng[0].id : (ng.length > 1 && !rootAll ? defRoot(ng) : "")) }; }
    var gens = genList(), g = rootGen;
    if (rootSel && V.by[rootSel] && !rootGen && U.gen(V.by[rootSel])) g = U.gen(V.by[rootSel]);
    if (gens.indexOf(g) < 0) g = gens[0];
    var people = genPeople(g);
    if (rootSel && V.by[rootSel] && people.every(function (p) { return p.id !== rootSel; })) {
      var rg = U.gen(V.by[rootSel]); if (rg && rg !== g && gens.indexOf(rg) >= 0) { g = rg; people = genPeople(g); }
      if (people.every(function (p) { return p.id !== rootSel; })) people = people.concat([V.by[rootSel]]);
    }
    if (rootSel && !V.by[rootSel]) rootSel = "";
    rootGen = g;
    var root = rootSel || (people.length === 1 ? people[0].id : (people.length > 1 && !rootAll ? defRoot(people) : ""));
    return { gens: gens, people: people, gen: g, root: root };
  }
  function page(kind, tabKey) {
    var V = U.view(), pk = pickRoot(), nameOpt = function (p) { return U.fullName(p) + (p.the_thu && !pk.gen ? " (" + t("p.doi") + " " + p.the_thu + ")" : ""); };
    var ng = dgScope === "ngoai", seg = '<div class="lrow"><div class="seg" role="group" aria-label="' + esc(t("l.noi_ngoai")) + '">' + [["noi", "l.noi_toc"], ["ngoai", "l.ngoai_toc"]].map(function (x) { return '<button type="button" class="segb' + (dgScope === x[0] ? " on" : "") + '" data-act="dg-scope" data-k="' + x[0] + '" aria-pressed="' + (dgScope === x[0]) + '">' + esc(t(x[1])) + "</button>"; }).join("") + "</div></div>";
    var html = "<h1>" + esc(t("so_do.tieu_de")) + "</h1>" + "<p class=\"dgdesc\">" + esc(t("so_do.mo_ta")) + '</p>' + seg + U.fltBar("dg") + '<div class="row">' + (ng ? "" : '<div><label class="lab" for="dg-gen">' + esc(t("dg.bat_dau_doi")) + '</label><select id="dg-gen" data-on="dggen">' +
      pk.gens.map(function (g) { return '<option value="' + g + '"' + (g === pk.gen ? " selected" : "") + ">" + esc(g ? t("p.doi") + " " + g + " (" + genPeople(g).length + ")" : t("l.tat_ca")) + "</option>"; }).join("") + '</select></div>') + '<div><label class="lab" for="dg-root">' + esc(ng ? t("dg.gd_ngoai") : t("so_do.goc")) + '</label><select id="dg-root" data-on="dgroot">' +
      (pk.people.length > 1 ? '<option value=""' + (pk.root === "" ? " selected" : "") + ">" + esc(ng ? t("dg.tat_ca_ngoai") : pk.gen ? t("dg.tat_ca_doi", { n: pk.gen }) : t("l.tat_ca")) + "</option>" : "") +
      pk.people.map(function (p) { var br = ng ? bridgeName(p) : ""; return '<option value="' + esc(p.id) + '"' + (p.id === pk.root ? " selected" : "") + ">" + esc(nameOpt(p) + (br ? " · " + t("dg.thong_gia_voi", { ten: br }) : "")) + "</option>"; }).join("") + '</select></div><div class="row tight"><button type="button" class="btn" data-act="dg-in" aria-label="' + esc(t("so_do.phong_to")) + '">+</button><button type="button" class="btn" data-act="dg-out" aria-label="' + esc(t("so_do.thu_nho")) + '">−</button><button type="button" class="btn" data-act="dg-fit">' + esc(t("so_do.vua_khung")) + '</button></div></div>' +
      (pk.root ? crumbs(pk.root) : "") + '<div class="dgbox" id="dgbox"></div><p class="muted">' + esc(t("so_do.huong_dan")) + '</p><div class="legend"><span><i class="sw m"></i>' + esc(t("p.nam")) + '</span><span><i class="sw f"></i>' + esc(t("p.nu")) + '</span><span><i class="sw hid"></i>' + esc(t("p.da_an_ten")) + "</span></div>";
    return { title: t("so_do.tieu_de"), html: html, after: function () {
      // Điện thoại: gom bộ chọn/lọc vào mục thu gọn để sơ đồ hiện ngay, rộng rãi
      try {
        var bx = U.$("#dgbox"), first = bx && bx.parentNode.querySelector(".lrow");
        if (bx && first && window.innerWidth <= 700 && !bx.parentNode.querySelector("details.dgctl")) {
          var dt = document.createElement("details"), sm = document.createElement("summary"); dt.className = "dgctl card"; sm.textContent = "⚙️ " + t("dg.tuy_chinh"); dt.appendChild(sm);
          var nx = first.nextElementSibling, mv = []; while (nx && nx !== bx) { if (!(nx.classList && nx.classList.contains("row"))) mv.push(nx); nx = nx.nextElementSibling; }
          mv.forEach(function (n) { dt.appendChild(n); }); bx.parentNode.insertBefore(dt, bx);
        }
      } catch (e) {}
      if (!pk.people.length) { U.$("#dgbox").innerHTML = '<p class="muted pad">' + esc(ng ? t("dg.ngoai_trong") : t("l.khong_thay")) + "</p>"; return; }
      var tree = count(pk.root ? build(pk.root, {}, 0) : forest(pk.people.map(function (p) { return p.id; })));
      if (!tree || (tree.virtual && !tree.kids.length)) { U.$("#dgbox").innerHTML = '<p class="muted pad">' + esc(t("l.khong_thay")) + "</p>"; return; }
      var out = { cards: "", links: "", bands: "" }, W, H, gens = depthGens(tree), LB = 78, nd = gens.length, i;
      if (kind === "td") {
        layoutTD(tree); placeTD(tree, 0); drawTD(tree, out); W = tree.sw + LB; H = nd * (CH + GY);
        for (i = 0; i < nd; i++) out.bands += '<rect class="gband' + (i % 2 ? " alt" : "") + '" x="0" y="' + (i * (CH + GY) - GY / 2) + '" width="' + W + '" height="' + (CH + GY) + '"/><text class="glab" x="8" y="' + (i * (CH + GY) + CH / 2 + 4) + '">' + esc(gl(gens[i], i)) + "</text>";
        out.cards = '<g transform="translate(' + LB + ',0)">' + out.links + out.cards + "</g>"; out.links = "";
      } else if (kind === "mm") {
        var st = { leaf: 0 }; layoutMM(tree, st); drawMM(tree, out); W = nd * (MW + MGX); H = st.leaf * (MH + MGY) + 30;
        for (i = 0; i < nd; i++) out.bands += '<rect class="gband' + (i % 2 ? " alt" : "") + '" x="' + (i * (MW + MGX) - MGX / 2) + '" y="0" width="' + (MW + MGX) + '" height="' + H + '"/><text class="glab" x="' + (i * (MW + MGX) + MW / 2) + '" y="16" text-anchor="middle">' + esc(gl(gens[i], i)) + "</text>";
        out.cards = '<g transform="translate(0,30)">' + out.links + out.cards + "</g>"; out.links = "";
      } else {
        var R = layoutBB(tree), ro = tree.virtual ? 1 : 0; drawBB(tree, out, R, null); W = H = R * 2;
        for (i = ro ? 0 : 1; i < nd; i++) if (lastRing[i + ro]) out.bands += '<circle class="gring" cx="' + R + '" cy="' + R + '" r="' + lastRing[i + ro] + '"/><text class="glab" x="' + R + '" y="' + (R - lastRing[i + ro] - 6) + '" text-anchor="middle">' + esc(gl(gens[i], i)) + "</text>";
        out.bands += '<text class="glab" x="' + R + '" y="' + (R + 4) + '" text-anchor="middle" opacity="0">' + esc(gl(gens[0], 0)) + "</text>";
      }
      mount(U.$("#dgbox"), out.bands + out.links + out.cards, W, H, t("so_do.tieu_de"));
    } };
  }
  P["so-do"] = function () { return page("td", "so-do"); };
  P.mindmap = function () { return page("mm", "mindmap"); };
  P["bong-bong"] = function () { return page("bb", "bong-bong"); };
  U.ons.dgroot = function (el) { rootSel = el.value; rootAll = !el.value; U.rerender(); };
  U.acts["dg-scope"] = function (el) { dgScope = el.getAttribute("data-k") === "ngoai" ? "ngoai" : "noi"; rootSel = ""; rootAll = false; U.rerender(); };
  U.ons.dggen = function (el) { rootGen = +el.value; rootSel = ""; rootAll = false; U.rerender(); };
})(typeof window !== "undefined" ? window : globalThis);
