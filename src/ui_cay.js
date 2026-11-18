// Cây gia phả hình cây thật (cành = các đời, lá = người) và trang Gia huấn (bia đá, câu đối)
(function (G) {
  "use strict";
  var GP = G.GP, U = GP.ui, S = GP.store, P = U.pages, t = U.t, esc = U.esc;

  // ================= CÂY SỐNG =================
  var rootSel = "", zoom = 0, col = {}, showSp = true, focusId = "";
  function kids(id) { return U.famKids(id).filter(function (c) { return !U.fltHide || !U.fltHide(c, 1); }); }
  function descN(id, seen) { seen = seen || {}; if (seen[id]) return 0; seen[id] = 1; return 1 + kids(id).reduce(function (a, c) { return a + descN(c.id, seen); }, 0); }
  function short(n, k) { n = String(n || ""); return n.length > k ? n.slice(0, k - 1) + "…" : n; }
  function yrs(p) { var b = p.sinh && p.sinh.nam, d = p.mat && p.mat.nam; return b || d ? (b || "?") + (p.con_song === false ? "–" + (d || "?") : "") : ""; }
  function hash(s) { var h = 0; s = String(s); for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function spOf(id) {
    var V = U.view(), out = [];
    U.spousesOf(id).forEach(function (s) { var q = s.spouse_person_id && V.by[s.spouse_person_id]; if (q && q.level === "hidden") return; out.push({ id: q ? q.id : "", p: q, name: q ? U.nameOf(q.id) : U.spouseName(s) }); });
    return out;
  }
  function inSubtree(rootId, id) { var seen = {}; (function go(x) { if (seen[x]) return; seen[x] = 1; kids(x).forEach(function (c) { go(c.id); }); })(rootId); return !!seen[id]; }
  function build(root) {
    var W = 104, H = 132, seen = {}, leaves = 0, maxD = 0, nodes = [], dead = 0;
    function lay(p, d) {
      seen[p.id] = 1; maxD = Math.max(maxD, d);
      var all = kids(p.id).filter(function (c) { return !seen[c.id]; }), ch = col[p.id] ? [] : all, n = { p: p, d: d, ch: [], hid: col[p.id] ? all.reduce(function (a, c) { return a + descN(c.id); }, 0) : 0, has: all.length > 0 };
      ch.forEach(function (c) { n.ch.push(lay(c, d + 1)); });
      n.x = n.ch.length ? (n.ch[0].x + n.ch[n.ch.length - 1].x) / 2 : (leaves++ * W);
      nodes.push(n); return n;
    }
    var r = lay(root, 0), pad = 70, w = Math.max(leaves, 1) * W + pad * 2, h = (maxD + 1) * H + 210, gy = h - 70;
    var X = function (n) { return n.x + pad + W / 2; }, Y = function (n) { return gy - 60 - n.d * H; };
    var o = '<svg class="cs-svg' + (showSp ? "" : " nosp") + '" data-rx="' + X(r) + '" viewBox="0 0 ' + w + " " + h + '" width="' + w + '" height="' + h + '" role="img" aria-label="' + esc(t("nav.cay_song")) + '"><defs><linearGradient id="csb" gradientUnits="userSpaceOnUse" x1="0" y1="0" x2="' + w + '" y2="0"><stop offset="0" stop-color="var(--bark2)"/><stop offset=".5" stop-color="var(--bark)"/><stop offset="1" stop-color="var(--bark2)"/></linearGradient></defs>';
    o += '<ellipse class="cs-gr" cx="' + (w / 2) + '" cy="' + (gy + 6) + '" rx="' + (w / 2 - 20) + '" ry="26"/>';
    var cx0 = X(r);
    o += '<path class="cs-root" d="M' + (cx0 - 46) + " " + (gy + 8) + " Q" + (cx0 - 20) + " " + (gy - 20) + " " + (cx0 - 14) + " " + (gy - 60) + " L" + (cx0 + 14) + " " + (gy - 60) + " Q" + (cx0 + 20) + " " + (gy - 20) + " " + (cx0 + 46) + " " + (gy + 8) + ' Q' + cx0 + " " + (gy + 22) + " " + (cx0 - 46) + " " + (gy + 8) + 'Z"/>';
    var br = "", lf = "", fall = "";
    nodes.slice().reverse().forEach(function (n) {
      var px = X(n), py = Y(n);
      n.ch.forEach(function (c) {
        var qx = X(c), qy = Y(c), sw = Math.max(2.5, 17 - (n.d + 1) * 2.6).toFixed(1);
        br += '<path class="cs-br" data-tg="' + esc(n.p.id) + '" stroke-width="' + sw + '" d="M' + px + " " + (py + 4) + " C" + px + " " + (py - H * 0.55) + " " + qx + " " + (qy + H * 0.55) + " " + qx + " " + (qy + 6) + '"><title>' + esc(t("cs.bam_canh")) + "</title></path>";
      });
    });
    nodes.forEach(function (n) {
      var p = n.p, x = X(n), y = Y(n), g = p.gioi_tinh === "nu" ? "f" : p.gioi_tinh === "nam" ? "m" : "n", isD = p.con_song === false, nm = U.nameOf(p.id), hs = hash(p.id), tilt = isD ? ((hs % 41) - 20) : 0, sp = spOf(p.id), spTxt = sp.slice(0, 2).map(function (s) { return s.name.split(/\s+/).slice(-2).join(" "); }).join(", ");
      var ttl = nm + (yrs(p) ? " (" + yrs(p) + ")" : "") + (sp.length ? " ♥ " + sp.map(function (s) { return s.name; }).join(", ") : "");
      if (isD) dead++;
      lf += '<g class="cs-nd' + (focusId === p.id ? " foc" : "") + '" data-id="' + esc(p.id) + '"><a href="#nguoi-' + esc(p.id) + '" class="cs-n"><title>' + esc(ttl) + '</title><g transform="translate(' + x + " " + y + ") rotate(" + tilt + ')"><g class="cs-sw' + (isD ? " dd" : "") + '" style="animation-delay:-' + (hs % 7) + 's"><path class="cs-lf ' + g + (isD ? " d s" + (hs % 3) : "") + '" d="M0 -26 C26 -18 26 16 0 28 C-26 16 -26 -18 0 -26Z"/><path class="cs-vn" d="M0 -20 V24 M0 -6 L-9 -14 M0 6 L10 -4"/></g></g><text class="cs-nm" x="' + x + '" y="' + (y + (n.d ? 48 : 114)) + '" text-anchor="middle">' + esc(short(nm.split(/\s+/).slice(-2).join(" "), 14)) + '</text><text class="cs-yr" x="' + x + '" y="' + (y + (n.d ? 62 : 128)) + '" text-anchor="middle">' + esc(yrs(p)) + "</text></a>";
      if (sp.length) {
        lf += '<g class="cs-sp"><text class="cs-sn" x="' + x + '" y="' + (y + (n.d ? 75 : 141)) + '" text-anchor="middle">♥ ' + esc(short(spTxt, 15)) + "</text>";
        sp.slice(0, 2).forEach(function (s, i) {
          var sg = s.p && s.p.gioi_tinh === "nam" ? "m" : "f", sd = s.p && s.p.con_song === false, lx = x + 36 + i * 14, ly = y + 14 + i * 6, body = '<g transform="translate(' + lx + " " + ly + ') scale(.55) rotate(' + (24 + i * 18) + ')"><path class="cs-lf ' + sg + (sd ? " d s" + (hash(s.id || s.name) % 3) : "") + '" d="M0 -26 C26 -18 26 16 0 28 C-26 16 -26 -18 0 -26Z"/><path class="cs-vn" d="M0 -20 V24"/></g>';
          lf += s.id ? '<a href="#nguoi-' + esc(s.id) + '" class="cs-n"><title>' + esc("♥ " + s.name) + "</title>" + body + "</a>" : "<g><title>" + esc("♥ " + s.name) + "</title>" + body + "</g>";
        });
        lf += "</g>";
      }
      if (n.has) lf += '<g class="cs-tgb" data-tg="' + esc(p.id) + '" transform="translate(' + (x - 30) + " " + (y - 18) + ')"><title>' + esc(t(col[p.id] ? "cs.mo_nhanh" : "cs.thu_nhanh")) + '</title><circle r="10"/><text text-anchor="middle" y="4">' + (col[p.id] ? "+" + Math.min(n.hid, 99) : "−") + "</text></g>";
      lf += "</g>";
      if (isD && dead <= 14) { var fx = 40 + (hs % Math.max(1, w - 80)), fy = gy + 4 + (hs % 22); fall += '<path class="cs-lf d s' + (hs % 3) + ' fl" transform="translate(' + fx + " " + fy + ") scale(.34) rotate(" + ((hs % 120) - 60) + ')" d="M0 -26 C26 -18 26 16 0 28 C-26 16 -26 -18 0 -26Z"/>'; }
    });
    return o + fall + br + lf + "</svg>";
  }
  function topFor(id) {
    var roots = U.rootsOf().filter(function (p) { return kids(p.id).length; }), hit = null, ids = [id];
    spOf(id).forEach(function (s) { if (s.id) ids.push(s.id); });
    ids.forEach(function (x) { if (!hit) roots.forEach(function (r) { if (!hit && inSubtree(r.id, x)) hit = r.id; }); });
    return hit;
  }
  function leg() { return '<p class="cs-leg"><span class="lg m"></span>' + esc(t("p.nam")) + ' <span class="lg f"></span>' + esc(t("p.nu")) + ' <span class="lg d"></span>' + esc(t("cs.la_rung")) + " · " + esc(t("cs.chu_giai")) + "</p>"; }
  P["cay-song"] = function () {
    var V = U.view(), roots = U.rootsOf().filter(function (p) { return kids(p.id).length; }); if (!roots.length) roots = U.rootsOf();
    if (!roots.length) return { title: t("nav.cay_song"), html: "<h1>" + esc(t("nav.cay_song")) + '</h1><p class="muted">' + esc(t("lich.khong_co")) + "</p>" };
    if (focusId) { var tf = topFor(focusId); if (tf) { rootSel = tf; zoom = 0; } }
    var cur = V.by[rootSel] && roots.some(function (p) { return p.id === rootSel; }) ? V.by[rootSel] : roots.slice().sort(function (a, b) { return descN(b.id) - descN(a.id); })[0];
    rootSel = cur.id;
    var opts = roots.map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === cur.id ? " selected" : "") + ">" + esc(U.nameOf(p.id)) + " · " + descN(p.id) + "</option>"; }).join("");
    return { title: t("nav.cay_song"), after: fit, html: "<h1>🌳 " + esc(t("nav.cay_song")) + '</h1><p class="muted">' + esc(t("cs.mo_ta")) + '</p><div class="cs-bar row"><label>' + esc(t("cs.chon_goc")) + ' <select id="cs-root" data-on="cs-root">' + opts + '</select></label><span class="cs-z"><button type="button" class="btn small' + (showSp ? " on" : "") + '" data-act="cs-sp" aria-pressed="' + showSp + '">♥ ' + esc(t("cs.vo_chong")) + '</button><button type="button" class="btn small" data-act="cs-all" data-v="1">' + esc(t("cs.thu_het")) + '</button><button type="button" class="btn small" data-act="cs-all" data-v="0">' + esc(t("cs.mo_het")) + '</button><button type="button" class="btn small" data-act="cs-z" data-v="-1" aria-label="−">−</button><button type="button" class="btn small" data-act="cs-z" data-v="0">' + esc(t("cs.vua")) + '</button><button type="button" class="btn small" data-act="cs-z" data-v="1" aria-label="+">+</button></span></div>' +
      '<div class="cs-wrap" id="cs-wrap"><div class="cs-in" id="cs-in">' + build(cur) + "</div></div>" + leg() };
  };
  function wrapEl() { return document.getElementById("cs-wrap"); }
  function fit() {
    var w = wrapEl(), s = document.querySelector("#cs-in svg"); if (!w || !s) return;
    var base = Math.min(1, (w.clientWidth - 8) / s.getAttribute("width")); if (!zoom) zoom = Math.max(base, 0.85); applyZ();
    center(true); setTimeout(function () { focusId = ""; }, 0);
  }
  function center(bottom) {
    var w = wrapEl(), s = document.querySelector("#cs-in svg"); if (!w || !s) return;
    var sc = (+s.style.width.replace("px", "") || +s.getAttribute("width")) / s.getAttribute("width"), foc = focusId && s.querySelector('.cs-nd[data-id="' + focusId.replace(/"/g, "") + '"] .cs-lf');
    if (foc) { var b = foc.getBoundingClientRect(), wb = w.getBoundingClientRect(); w.scrollLeft += b.left + b.width / 2 - (wb.left + w.clientWidth / 2); w.scrollTop += b.top + b.height / 2 - (wb.top + w.clientHeight / 2); return; }
    w.scrollLeft = Math.max(0, (+s.getAttribute("data-rx") || s.getAttribute("width") / 2) * sc - w.clientWidth / 2); if (bottom) w.scrollTop = w.scrollHeight;
  }
  function applyZ() { var s = document.querySelector("#cs-in svg"); if (!s) return; s.style.width = Math.round(s.getAttribute("width") * zoom) + "px"; s.style.height = Math.round(s.getAttribute("height") * zoom) + "px"; }
  function redraw() {
    var w = wrapEl(), box = document.getElementById("cs-in"), V = U.view(), cur = V.by[rootSel]; if (!w || !box || !cur) return U.rerender();
    var sl = w.scrollLeft, st = w.scrollTop, oldW = +box.querySelector("svg").getAttribute("height");
    box.innerHTML = build(cur); applyZ();
    var nh = +box.querySelector("svg").getAttribute("height"); w.scrollLeft = sl; w.scrollTop = st + (nh - oldW) * zoom;
  }
  U.cayFocus = function (id) { focusId = id; location.hash = "#cay-song"; };
  U.ons["cs-root"] = function (el) { rootSel = el.value; zoom = 0; focusId = ""; col = {}; U.rerender(); };
  U.acts["cs-sp"] = function () { showSp = !showSp; U.rerender(); };
  U.acts["cs-all"] = function (el) {
    var V = U.view(), cur = V.by[rootSel]; if (!cur) return; col = {};
    if (el.getAttribute("data-v") === "1") { var seen = {}; (function go(x, d) { if (seen[x.id]) return; seen[x.id] = 1; var ks = kids(x.id); if (ks.length && d >= 1) col[x.id] = 1; ks.forEach(function (c) { go(c, d + 1); }); })(cur, 0); col[cur.id] = 0; }
    focusId = ""; redraw(); center(true);
  };
  U.acts["cay-focus"] = function (el) { U.cayFocus(el.getAttribute("data-id")); };
  U.acts["cs-z"] = function (el) {
    var v = +el.getAttribute("data-v"), w = wrapEl(), s = document.querySelector("#cs-in svg"); if (!s) return;
    if (v === 0) { zoom = Math.min(1, (w.clientWidth - 8) / s.getAttribute("width")); applyZ(); center(true); return; }
    zoom = Math.max(0.25, Math.min(1.8, zoom * (v > 0 ? 1.25 : 0.8))); applyZ();
  };
  document.addEventListener("click", function (e) {
    var el = e.target.closest && e.target.closest("#cs-in [data-tg]"); if (!el || e.target.closest("a.cs-n")) return;
    var id = el.getAttribute("data-tg"); col[id] = col[id] ? 0 : 1; focusId = ""; redraw();
  });

  // ================= GIA HUẤN =================
  var DEF = { trai: "Uống nước nhớ nguồn, nghìn thu con cháu ghi lòng tổ", phai: "Ăn quả nhớ người trồng, muôn đời họ hàng giữ nếp nhà",
    ds: ["Hiếu kính tổ tiên | Ngày giỗ, ngày Tết, ngày Thanh minh con cháu quây quần, thắp nén hương nhớ người đã khuất.", "Anh em hòa thuận | Một giọt máu đào hơn ao nước lã; anh em trong họ thương yêu, nhường nhịn, không để tiền của chia rẽ.", "Chăm học, trọng đạo | Học để làm người, học để giúp đời; người đi trước dìu dắt người đi sau.", "Sống trung thực, giữ nhân nghĩa | Làm ăn chân chính, nói lời giữ lời; nghèo mà sạch, giàu mà biết sẻ chia.", "Tương thân tương ái | Trong họ có việc vui buồn, hoạn nạn, ốm đau, mọi nhà cùng chung tay giúp đỡ.", "Giữ gìn nhà thờ, mồ mả | Tu bổ, hương khói khu lăng mộ và nhà thờ họ; mỗi đời góp công, góp của, ghi vào sổ vàng.", "Giữ gìn gia phả | Ghi chép đúng, đủ, kịp thời; con cháu sinh ra, trưởng thành, lập gia đình đều được bổ sung vào gia phả.", "Trọng nội ngoại, kính thông gia | Gắn bó họ ngoại, họ vợ, họ chồng; đối đãi chân thành để hai họ thêm thân.", "Cần kiệm xây nhà | Chắt chiu, tiết kiệm, không xa hoa; giữ gìn nếp nhà thanh bạch.", "Hướng về quê cha đất tổ | Dù đi xa đến đâu, hằng năm về quê dự giỗ tổ, giữ sợi dây gắn kết dòng họ."] };
  U.giaHuanList = function () { var st = S.S.data.settings || {}; return lines(st).filter(function (x) { return x[1]; }).map(function (x) { return (x[0] ? x[0] + ": " : "") + x[1]; }); };
  var gedit = false;
  function lines(st) { var raw = st.gia_huan_ds; var a = raw ? String(raw).split(/\r?\n/).filter(function (x) { return x.trim(); }) : DEF.ds; return a.map(function (l) { var i = l.indexOf("|"); return i < 0 ? ["", l.trim()] : [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }); }
  var NUM = ["Nhất", "Nhị", "Tam", "Tứ", "Ngũ", "Lục", "Thất", "Bát", "Cửu", "Thập"];
  P["gia-huan"] = function () {
    var st = S.S.data.settings || {}, clan = String(st.ten_dong_ho || "Họ Tống"), L = lines(st), tr = st.gia_huan_trai || DEF.trai, ph = st.gia_huan_phai || DEF.phai, can = U.canWrite();
    var h = '<section class="gh"><div class="gh-top"><div class="gh-cd l" role="note"><span>' + esc(tr) + '</span></div><div class="gh-st"><div class="gh-stele"><small>' + esc(t("gh.nho")) + "</small><h1>" + esc(t("gh.gia_huan")) + "</h1><b>" + esc(clan) + '</b><i></i><p>' + esc(st.gia_huan_loi || t("gh.loi_mo")) + '</p></div><div class="gh-bd"></div></div><div class="gh-cd r" role="note"><span>' + esc(ph) + "</span></div></div>" +
      '<ol class="gh-list">' + L.map(function (x, i) { return '<li class="gh-bia"><span class="gh-no">' + esc(NUM[i] || i + 1) + "</span><div>" + (x[0] ? "<h2>" + esc(x[0]) + "</h2>" : "") + "<p>" + esc(x[1]) + "</p></div></li>"; }).join("") + "</ol>" +
      '<p class="gh-note muted">' + esc(t("gh.ghi_chu")) + "</p></section>";
    if (can) {
      h += gedit ? '<form class="card gh-form" data-submit="gh-save"><h2>' + esc(t("gh.sua")) + '</h2><label>' + esc(t("gh.vt")) + '<input name="trai" value="' + esc(tr) + '"></label><label>' + esc(t("gh.vp")) + '<input name="phai" value="' + esc(ph) + '"></label><label>' + esc(t("gh.loi")) + '<textarea name="loi" rows="2">' + esc(st.gia_huan_loi || t("gh.loi_mo")) + '</textarea></label><label>' + esc(t("gh.ds")) + '<textarea name="ds" rows="12">' + esc(L.map(function (x) { return (x[0] ? x[0] + " | " : "") + x[1]; }).join("\n")) + '</textarea></label><p><button class="btn primary" type="submit">' + esc(t("gh.luu")) + '</button> <button type="button" class="btn" data-act="gh-sua">' + esc(t("c.huy")) + "</button></p></form>"
        : '<p class="gh-act"><button type="button" class="btn" data-act="gh-sua">✏️ ' + esc(t("gh.sua")) + "</button></p>";
    }
    return { title: t("gh.gia_huan"), html: h };
  };
  U.acts["gh-sua"] = function () { gedit = !gedit; U.rerender(); };
  U.ons["gh-save"] = function (f) {
    var d = new FormData(f), o = { gia_huan_trai: String(d.get("trai") || "").trim(), gia_huan_phai: String(d.get("phai") || "").trim(), gia_huan_loi: String(d.get("loi") || "").trim(), gia_huan_ds: String(d.get("ds") || "").trim() };
    var r = U.attempt(function () { return S.saveSettings(o); }); if (r.ok) { U.toast(t("c.da_luu")); gedit = false; U.rerender(); }
  };
})(typeof window !== "undefined" ? window : globalThis);
