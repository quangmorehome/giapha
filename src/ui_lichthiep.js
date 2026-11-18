/* v1.47 — Lịch: bấm vào ngày → thiệp tự tạo theo dịp (sinh nhật, giỗ, Tết, Rằm, Trung thu, Vu lan, Thanh minh…) với nền riêng cho từng loại ngày. */
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, S = GP.store, L = GP.lunar, t = U.t, esc = U.esc;
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); localStorage.setItem(k, v); } catch (e) {} return null; }
  function clanName() { return String((S.S.data.settings || {}).ten_dong_ho || "Họ Tống").replace(/^Họ\s+/i, ""); }

  // ---------- Phân loại dịp ----------
  var GROUP = { tet1: "tet", tet2: "tet", tet3: "tet", giao_thua: "tet", ram_gieng: "ram", ram: "ram", phat_dan: "ram", mung1: "ram", trung_thu: "trung_thu", vu_lan: "vu_lan", han_thuc: "xuan", gio_to: "xuan", thanh_minh: "xuan" };
  U.occasionOf = function (es, key) {
    es = es || [];
    if (es.some(function (e) { return e.loai === "gio"; })) return "gio";
    if (es.some(function (e) { return e.loai === "sinh"; })) return "sinh";
    var k = key || (es.filter(function (e) { return e.loai === "le"; })[0] || {}).khoa;
    return GROUP[k] || "def";
  };
  function leKey(es, key) { var e = (es || []).filter(function (x) { return x.loai === "le" && x.khoa; })[0]; return key || (e && e.khoa) || null; }

  // Danh sách thiệp của một ngày
  var CARDS = [];
  U.calCards = function (es, d, key) {
    CARDS = []; es = es || [];
    es.forEach(function (e) { if (e.loai === "gio" || e.loai === "sinh") CARDS.push({ kind: e.loai, id: e.id, ngay: d, e: e }); });
    var k = leKey(es, key); if (k && k !== "mung1" || (k === "mung1" && !CARDS.length)) CARDS.push({ kind: "le", khoa: k, ngay: d });
    if (!CARDS.length) return "";
    return '<div class="cp-cards"><b>🎴 ' + esc(t("lc.the_ngay")) + '</b><div class="cp-cl">' + CARDS.map(function (c, i) {
      var p = c.id && U.view().by[c.id];
      return '<button type="button" class="cp-cb ' + c.kind + '" data-act="cc-open" data-i="' + i + '"><span aria-hidden="true">' + (c.kind === "gio" ? "🕯️" : c.kind === "sinh" ? "🎂" : "🏮") + "</span> " + esc(c.kind === "le" ? t("le." + c.khoa) : p ? U.nameOf(c.id) : "") + "</button>";
    }).join("") + "</div></div>";
  };

  // ---------- Nội dung thiệp ----------
  var CC = null; // {i, gio, noi, loi}
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }
  function dateLines(d) {
    var l = L.solarToLunar(d[0], d[1], d[2]);
    return [t("th.ngay_l") + " " + U.dmy(d) + " (" + t("d.duong") + ")", "(" + t("th.tuc") + " " + l.day + "/" + l.month + (l.leap ? " " + t("d.nhuan") : "") + " " + t("d.am") + ")"];
  }
  function spec(c) {
    var V = U.view(), p = c.id && V.by[c.id], ho = clanName(), lines = [], out = { occ: "def" };
    var nm = p ? (U.callName ? U.callName(p) : U.fullName(p)) : "";
    if (c.kind === "sinh") {
      out.occ = "sinh"; out.head = t("lc.sinh_head"); out.title = nm; if (c.e && c.e.tuoi) lines.push(t("lc.tuoi", { n: c.e.tuoi }));
      lines = lines.concat(dateLines(c.ngay)); out.body = CC.loi != null && CC.loi !== "" ? CC.loi : t(["lc.wish1", "lc.wish2", "lc.wish3"][hash(c.id + c.ngay[2]) % 3]);
      out.foot = t("lc.sinh_foot", { ho: ho });
    } else if (c.kind === "gio") {
      out.occ = "gio"; out.head = t("th.thu_moi_gio"); out.title = t("th.gio_cua", { ten: nm });
      lines = lines.concat(dateLines(c.ngay)); if (CC.gio) lines.push(t("th.luc") + " " + CC.gio); if (CC.noi) lines.push(t("th.tai") + " " + CC.noi);
      out.body = CC.loi != null && CC.loi !== "" ? CC.loi : t("th.mo_gio", { ten: nm }); out.foot = t("th.tran_trong") + " — " + t("th.gui_mac_dinh", { ho: ho });
    } else {
      var g = GROUP[c.khoa] || "def"; out.occ = g; out.head = t("lc.le_head"); out.title = t("le." + c.khoa); lines = dateLines(c.ngay);
      out.body = CC.loi != null && CC.loi !== "" ? CC.loi : t({ tet: "lc.m_tet", ram: "lc.m_ram", trung_thu: "lc.m_trung_thu", vu_lan: "lc.m_vu_lan", xuan: "lc.m_xuan" }[g] || "lc.m_def"); out.foot = t("lc.le_foot", { ho: ho });
    }
    out.lines = lines; out.seed = hash(String(c.id || c.khoa) + c.ngay.join("-")); return out;
  }

  // ---------- Vẽ ----------
  var PAL = {
    sinh: { bg0: "#fff3f6", bg1: "#ffd3df", frame: "#c2185b", gold: "#d19a2a", title: "#a3144f", ink: "#4a2433", sub: "#9b5a70", panel: "rgba(255,255,255,.55)" },
    gio: { bg0: "#1b1210", bg1: "#33201a", frame: "#8c6a2a", gold: "#d9b45a", title: "#f2d98c", ink: "#efe3cf", sub: "#bfa97a", panel: "rgba(0,0,0,.28)" },
    tet: { bg0: "#c3181f", bg1: "#7d0e12", frame: "#f4c542", gold: "#f4c542", title: "#ffe08a", ink: "#fff3d6", sub: "#ffd98a", panel: "rgba(80,0,0,.28)" },
    ram: { bg0: "#0e1d3b", bg1: "#1d3260", frame: "#e8c872", gold: "#e8c872", title: "#f7e7b0", ink: "#e8eefc", sub: "#b9c7e8", panel: "rgba(5,12,30,.3)" },
    trung_thu: { bg0: "#1a1446", bg1: "#40206f", frame: "#ffd166", gold: "#ffd166", title: "#ffe9a8", ink: "#f1ecff", sub: "#cbbdf0", panel: "rgba(10,5,40,.3)" },
    vu_lan: { bg0: "#0f3b3a", bg1: "#1d5e59", frame: "#f2c4d0", gold: "#f2c4d0", title: "#ffe3ea", ink: "#eafaf6", sub: "#bfe3dc", panel: "rgba(0,30,28,.3)" },
    xuan: { bg0: "#eaf7e4", bg1: "#c2e5b3", frame: "#2e7d32", gold: "#8a6d1c", title: "#1b5e20", ink: "#22402a", sub: "#4f7a56", panel: "rgba(255,255,255,.5)" },
    def: { bg0: "#fdf6e6", bg1: "#f1e2bf", frame: "#7a1f1f", gold: "#b8892b", title: "#7a1f1f", ink: "#3a2a22", sub: "#7a5c3a", panel: "rgba(255,255,255,.45)" }
  };
  function rng(seed) { var s = seed % 2147483647 || 1; return function () { s = (s * 48271) % 2147483647; return s / 2147483647; }; }
  function diamond(c, x, y, r) { c.beginPath(); c.moveTo(x, y - r); c.lineTo(x + r, y); c.lineTo(x, y + r); c.lineTo(x - r, y); c.closePath(); c.fill(); }
  function circle(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, 6.2832); c.fill(); }
  function flower(c, x, y, r, n, col, mid) { c.fillStyle = col; for (var i = 0; i < n; i++) { var a = i * 6.2832 / n; c.beginPath(); c.arc(x + Math.cos(a) * r * .62, y + Math.sin(a) * r * .62, r * .46, 0, 6.2832); c.fill(); } c.fillStyle = mid; circle(c, x, y, r * .3); }
  function lotus(c, x, y, s, col, col2) {
    for (var k = 0; k < 2; k++) for (var i = -2; i <= 2; i++) {
      c.save(); c.translate(x, y); c.rotate(i * (k ? .34 : .5)); c.fillStyle = k ? col2 : col; c.beginPath(); c.moveTo(0, 0); c.bezierCurveTo(-s * .32, -s * .35, -s * .2, -s * .85, 0, -s * (k ? 1 : .86)); c.bezierCurveTo(s * .2, -s * .85, s * .32, -s * .35, 0, 0); c.fill(); c.restore();
    }
  }
  function star(c, x, y, r, n) { c.beginPath(); for (var i = 0; i < n * 2; i++) { var a = -1.5708 + i * Math.PI / n, rr = i % 2 ? r * .45 : r; c[i ? "lineTo" : "moveTo"](x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath(); c.fill(); }
  function glow(c, x, y, r, col) { var g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, col); g.addColorStop(1, "rgba(255,255,255,0)"); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }

  var DECOR = {
    sinh: function (c, W, H, p, R) {
      var cols = ["#ff6b8b", "#ffb703", "#4cc9f0", "#9b5de5", "#80ed99", "#f15bb5"], pos = [[150, 150, 54], [260, 110, 44], [W - 150, 150, 54], [W - 260, 110, 44], [90, 260, 38], [W - 90, 260, 38]];
      pos.forEach(function (b, i) { c.strokeStyle = "rgba(120,80,90,.55)"; c.lineWidth = 3; c.beginPath(); c.moveTo(b[0], b[1] + b[2] * 1.15); c.bezierCurveTo(b[0] - 12, b[1] + b[2] * 2.2, b[0] + 14, b[1] + b[2] * 2.8, b[0], b[1] + b[2] * 3.6); c.stroke();
        c.fillStyle = cols[i % cols.length]; c.beginPath(); c.ellipse(b[0], b[1], b[2], b[2] * 1.18, 0, 0, 6.2832); c.fill(); c.fillStyle = "rgba(255,255,255,.4)"; c.beginPath(); c.ellipse(b[0] - b[2] * .3, b[1] - b[2] * .4, b[2] * .18, b[2] * .32, .5, 0, 6.2832); c.fill(); c.fillStyle = cols[i % cols.length]; diamond(c, b[0], b[1] + b[2] * 1.28, 7); });
      for (var i = 0; i < 90; i++) { var x = R() * W, y = R() * H; if (x > 140 && x < W - 140 && y > 300 && y < H - 120) continue; c.save(); c.translate(x, y); c.rotate(R() * 6); c.fillStyle = cols[i % cols.length]; c.globalAlpha = .75; c.fillRect(-6, -3, 12, 6); c.restore(); }
      c.globalAlpha = 1;
    },
    gio: function (c, W, H, p, R) {
      glow(c, W / 2, 150, 360, "rgba(217,180,90,.22)");
      [[150, 4], [W - 150, 4]].forEach(function (s) { var x = s[0]; c.strokeStyle = "#caa55a"; c.lineWidth = 6; for (var i = -1; i <= 1; i++) { c.beginPath(); c.moveTo(x + i * 22, H - 150); c.lineTo(x + i * 22, H - 400); c.stroke(); c.fillStyle = "#ff8a3d"; circle(c, x + i * 22, H - 402, 6); glow(c, x + i * 22, H - 402, 40, "rgba(255,150,60,.55)");
        c.strokeStyle = "rgba(235,225,205,.28)"; c.lineWidth = 4; c.beginPath(); c.moveTo(x + i * 22, H - 410); c.bezierCurveTo(x + i * 22 - 34, H - 470, x + i * 22 + 34, H - 520, x + i * 22, H - 590); c.bezierCurveTo(x + i * 22 - 24, H - 640, x + i * 22 + 20, H - 670, x + i * 22 + 4, H - 720); c.stroke(); }
        c.fillStyle = "#6e4a1f"; c.fillRect(x - 56, H - 150, 112, 40); c.fillStyle = "#8c6a2a"; c.fillRect(x - 64, H - 112, 128, 16); });
      lotus(c, 170, 170, 90, "#f5c6d0", "#fbe3e8"); lotus(c, W - 170, 170, 90, "#f5c6d0", "#fbe3e8");
      c.fillStyle = "rgba(217,180,90,.6)"; for (var i = 0; i < 26; i++) circle(c, R() * W, R() * H, 1 + R() * 2.6);
    },
    tet: function (c, W, H, p, R) {
      [[0, 0, 1], [W, 0, -1]].forEach(function (o) { var x0 = o[0], sg = o[2]; c.strokeStyle = "#5a2a12"; c.lineWidth = 9; c.beginPath(); c.moveTo(x0, 40); c.bezierCurveTo(x0 + sg * 120, 90, x0 + sg * 200, 120, x0 + sg * 330, 220); c.stroke(); c.lineWidth = 5; c.beginPath(); c.moveTo(x0 + sg * 140, 100); c.bezierCurveTo(x0 + sg * 190, 60, x0 + sg * 250, 70, x0 + sg * 300, 40); c.stroke();
        [[70, 70], [160, 100], [250, 160], [320, 215], [210, 52], [290, 40], [110, 140]].forEach(function (f, i) { flower(c, x0 + sg * f[0], f[1], 22 + (i % 3) * 5, 5, "#ffd23f", "#e07a00"); }); });
      [[W / 2 - 220, 120], [W / 2 + 220, 120]].forEach(function (l) { c.strokeStyle = "#f4c542"; c.lineWidth = 3; c.beginPath(); c.moveTo(l[0], 40); c.lineTo(l[0], l[1] - 40); c.stroke(); c.fillStyle = "#e11d2e"; c.beginPath(); c.ellipse(l[0], l[1], 44, 52, 0, 0, 6.2832); c.fill(); c.fillStyle = "#f4c542"; c.fillRect(l[0] - 18, l[1] - 56, 36, 10); c.fillRect(l[0] - 18, l[1] + 46, 36, 10); c.fillRect(l[0] - 2, l[1] + 56, 4, 40); });
      c.fillStyle = "rgba(244,197,66,.5)"; for (var i = 0; i < 40; i++) { var x = R() * W, y = H - 40 - R() * 150; flower(c, x, y, 7 + R() * 7, 5, "rgba(255,210,63,.6)", "rgba(224,122,0,.6)"); }
    },
    ram: function (c, W, H, p, R) {
      glow(c, W / 2, 125, 300, "rgba(255,240,190,.35)"); c.fillStyle = "#fff3c4"; circle(c, W / 2, 125, 68); c.fillStyle = "rgba(210,190,120,.5)"; circle(c, W / 2 - 20, 108, 12); circle(c, W / 2 + 22, 142, 9);
      c.fillStyle = "rgba(255,255,255,.9)"; for (var i = 0; i < 60; i++) { var x = R() * W, y = R() * 300; if (Math.abs(x - W / 2) < 110 && y < 250) continue; circle(c, x, y, .8 + R() * 1.8); }
      c.fillStyle = "rgba(255,255,255,.1)"; [[200, 250, 130], [W - 220, 230, 150], [120, 480, 90]].forEach(function (k) { c.beginPath(); c.ellipse(k[0], k[1], k[2], k[2] * .3, 0, 0, 6.2832); c.fill(); });
      lotus(c, 190, H - 120, 110, "#f4b8c8", "#fde2ea"); lotus(c, W - 190, H - 120, 110, "#f4b8c8", "#fde2ea");
    },
    trung_thu: function (c, W, H, p, R) {
      glow(c, W - 220, 170, 340, "rgba(255,230,150,.4)"); c.fillStyle = "#ffe9a8"; circle(c, W - 220, 170, 84);
      c.fillStyle = "rgba(255,255,255,.9)"; for (var i = 0; i < 60; i++) circle(c, R() * W, R() * H * .5, .8 + R() * 1.8);
      [[150, 170, 60, "#ff5d73"], [300, 120, 44, "#ffb703"], [110, H - 200, 52, "#ffb703"], [W - 120, H - 200, 56, "#ff5d73"], [W - 290, H - 150, 40, "#4cc9f0"]].forEach(function (l) { c.strokeStyle = "rgba(255,230,160,.7)"; c.lineWidth = 3; c.beginPath(); c.moveTo(l[0], l[1] - l[2] * 2.2); c.lineTo(l[0], l[1] - l[2] * 1.1); c.stroke(); glow(c, l[0], l[1], l[2] * 2.6, "rgba(255,220,120,.35)"); c.fillStyle = l[3]; star(c, l[0], l[1], l[2], 5); c.fillStyle = "rgba(255,255,255,.5)"; star(c, l[0], l[1], l[2] * .45, 5); });
    },
    vu_lan: function (c, W, H, p, R) {
      for (var i = 0; i < 24; i++) { c.fillStyle = "rgba(255,214,224," + (.25 + R() * .45) + ")"; c.beginPath(); c.ellipse(R() * W, R() * H, 7 + R() * 9, 4 + R() * 5, R() * 3, 0, 6.2832); c.fill(); }
      lotus(c, 170, 170, 120, "#f2a7bb", "#ffdbe4"); lotus(c, W - 170, 170, 120, "#f2a7bb", "#ffdbe4"); lotus(c, 140, H - 110, 100, "#f2a7bb", "#ffdbe4"); lotus(c, W - 140, H - 110, 100, "#f2a7bb", "#ffdbe4");
      c.fillStyle = "rgba(40,120,100,.5)"; [[W / 2 - 80, H - 60], [W / 2 + 80, H - 60]].forEach(function (k) { c.beginPath(); c.ellipse(k[0], k[1], 110, 22, 0, 0, 6.2832); c.fill(); });
    },
    xuan: function (c, W, H, p, R) {
      c.fillStyle = "rgba(120,190,110,.45)"; c.beginPath(); c.moveTo(0, H - 130); c.bezierCurveTo(W * .25, H - 230, W * .5, H - 90, W, H - 190); c.lineTo(W, H); c.lineTo(0, H); c.fill(); c.fillStyle = "rgba(60,140,70,.5)"; c.beginPath(); c.moveTo(0, H - 70); c.bezierCurveTo(W * .3, H - 150, W * .7, H - 40, W, H - 110); c.lineTo(W, H); c.lineTo(0, H); c.fill();
      c.strokeStyle = "rgba(46,125,50,.75)"; c.lineWidth = 3; [[100, 70], [190, 60], [W - 100, 70], [W - 190, 60]].forEach(function (a, k) { for (var i = 0; i < 6; i++) { var x = a[0] + (i - 3) * 14; c.beginPath(); c.moveTo(x, 40); c.bezierCurveTo(x + 18, 130 + k * 4, x - 14, 230, x + 10, 280 + i * 18); c.stroke(); } });
      c.fillStyle = "rgba(255,255,255,.9)"; for (var i = 0; i < 18; i++) flower(c, R() * W, H - 40 - R() * 110, 6 + R() * 4, 5, "#fff", "#f4c542");
    },
    def: function (c, W, H, p) { c.globalAlpha = .07; c.fillStyle = p.gold; for (var gx = 40; gx < W; gx += 54) for (var gy = 40; gy < H; gy += 54) diamond(c, gx, gy, 3); c.globalAlpha = 1; }
  };

  function wrap(ctx, text, w) {
    var out = []; String(text || "").split(/\n/).forEach(function (para) { var cur = ""; para.split(/\s+/).forEach(function (wd) { if (!wd) return; var tst = cur ? cur + " " + wd : wd; if (ctx.measureText(tst).width > w && cur) { out.push(cur); cur = wd; } else cur = tst; }); if (cur) out.push(cur); });
    return out;
  }
  /** Vẽ thiệp theo dịp lên canvas 1080×1080. */
  U.cardDraw = function (cv, s) {
    var W = 1080, H = 1080; cv.width = W; cv.height = H; var c = cv.getContext("2d"), p = PAL[s.occ] || PAL.def, R = rng(s.seed || 7), cx = W / 2;
    var serif = '"Lora", Georgia, "Times New Roman", serif', sans = '"Be Vietnam Pro", "Inter", system-ui, sans-serif';
    var g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, p.bg0); g.addColorStop(1, p.bg1); c.fillStyle = g; c.fillRect(0, 0, W, H);
    (DECOR[s.occ] || DECOR.def)(c, W, H, p, R);
    c.strokeStyle = p.frame; c.lineWidth = 10; c.strokeRect(26, 26, W - 52, H - 52); c.strokeStyle = p.gold; c.lineWidth = 3; c.strokeRect(50, 50, W - 100, H - 100);
    c.fillStyle = p.gold; [[66, 66], [W - 66, 66], [66, H - 66], [W - 66, H - 66]].forEach(function (q) { diamond(c, q[0], q[1], 11); });
    // tấm nền mờ cho chữ dễ đọc
    c.fillStyle = p.panel; c.beginPath(); if (c.roundRect) c.roundRect(150, 300, W - 300, 560, 28); else c.rect(150, 300, W - 300, 560); c.fill();
    c.textAlign = "center"; var y = 262;
    c.fillStyle = p.gold; c.font = "600 28px " + sans; c.fillText(String(s.head || "").toUpperCase().split("").join(" "), cx, y); y += 26;
    c.fillRect(cx - 150, y, 120, 2); c.fillRect(cx + 30, y, 120, 2); diamond(c, cx, y + 1, 8); y += 78;
    var ts = 66, tl = []; do { c.font = "700 " + ts + "px " + serif; tl = wrap(c, s.title || " ", W - 340); ts -= 4; } while (tl.length > 2 && ts > 36);
    c.fillStyle = p.title; tl.slice(0, 2).forEach(function (ln) { c.fillText(ln, cx, y); y += ts * 1.22 + 6; }); y += 6;
    c.font = "500 34px " + serif; (s.lines || []).forEach(function (ln, i) { c.fillStyle = /^\(/.test(ln) ? p.sub : p.ink; wrap(c, ln, W - 340).forEach(function (w) { c.fillText(w, cx, y); y += 46; }); }); y += 10;
    c.fillStyle = p.ink; var bs = 29, bl, lh; do { c.font = "400 " + bs + "px " + sans; lh = bs * 1.5; bl = wrap(c, s.body, W - 360); bs -= 1; } while (bl.length * lh > 852 - y && bs > 20); bl.slice(0, Math.max(0, Math.floor((852 - y) / lh))).forEach(function (w) { c.fillText(w, cx, y); y += lh; });
    c.fillStyle = p.title; c.font = "italic 600 27px " + serif; wrap(c, s.foot, W - 300).slice(0, 2).forEach(function (w, i) { c.fillText(w, cx, 912 + i * 36); });
    c.fillStyle = p.sub; c.font = "500 22px " + sans; c.fillText(String((S.S.data.settings || {}).ten_dong_ho || "Họ Tống") + " · " + t("th.gia_pha_so"), cx, 1000);
  };

  // ---------- Cửa sổ thiệp ----------
  function field(k, lab, ty) { return '<div><label class="lab" for="cc-' + k + '">' + esc(lab) + '</label>' + (ty === "area" ? '<textarea class="inp" id="cc-' + k + '" rows="3" data-oninput="cc-in" data-k="' + k + '"></textarea>' : '<input class="inp" id="cc-' + k + '" ' + (ty === "time" ? 'type="time"' : 'type="text"') + ' data-oninput="cc-in" data-k="' + k + '">') + "</div>"; }
  function redraw() { var cv = document.getElementById("cc-cv"); if (!cv || !CC) return; var c = CARDS[CC.i]; if (c) U.cardDraw(cv, spec(c)); }
  function chips() { return CARDS.length > 1 ? '<div class="cp-cl cc-sw" role="tablist">' + CARDS.map(function (c, i) { var p = c.id && U.view().by[c.id]; return '<button type="button" role="tab" aria-selected="' + (i === CC.i) + '" class="cp-cb ' + c.kind + (i === CC.i ? " on" : "") + '" data-act="cc-pick" data-i="' + i + '">' + (c.kind === "gio" ? "🕯️ " : c.kind === "sinh" ? "🎂 " : "🏮 ") + esc(c.kind === "le" ? t("le." + c.khoa) : p ? U.nameOf(c.id) : "") + "</button>"; }).join("") + "</div>" : ""; }
  function open(i) {
    var c = CARDS[i]; if (!c) return;
    CC = { i: i, gio: ls("gp.cc.gio") || "08:00", noi: ls("gp.cc.noi") || "", loi: "" };
    var old = document.getElementById("cc-bg"); if (old) old.remove();
    var bg = document.createElement("div"); bg.id = "cc-bg"; bg.className = "calpop-bg cc-bg"; bg.setAttribute("data-act", "cc-close");
    bg.innerHTML = '<div class="calpop cc" role="dialog" aria-modal="true" aria-label="' + esc(t("lc.the_ngay")) + '"><button type="button" class="pop-x" data-act="cc-close" aria-label="' + esc(t("c.dong")) + '">✕</button><div id="cc-chips"></div><canvas id="cc-cv" class="cc-cv" aria-label="' + esc(t("lc.the_ngay")) + '"></canvas><div id="cc-f" class="cc-f"></div><div class="row cc-btn"><button type="button" class="btn primary" data-act="cc-save">⬇️ ' + esc(t("th.tai_anh")) + '</button><button type="button" class="btn" data-act="cc-share">📤 ' + esc(t("th.chia_se")) + '</button><button type="button" class="btn" data-act="cc-close">' + esc(t("c.dong")) + "</button></div></div>";
    document.body.appendChild(bg); fill(); bg.querySelector(".pop-x").focus({ preventScroll: true });
  }
  function fill() {
    var c = CARDS[CC.i], f = document.getElementById("cc-f"), ch = document.getElementById("cc-chips"); if (!c || !f) return;
    ch.innerHTML = chips();
    f.innerHTML = (c.kind === "gio" ? '<div class="cc-two">' + field("gio", t("lc.gio_lbl"), "time") + field("noi", t("lc.noi_lbl")) + "</div>" : "") + field("loi", t("lc.loi_lbl"), "area");
    var set = function (k, v) { var e = document.getElementById("cc-" + k); if (e) e.value = v; };
    set("gio", CC.gio); set("noi", CC.noi); set("loi", CC.loi); var ta = document.getElementById("cc-loi"); if (ta) ta.placeholder = spec(c).body;
    redraw();
  }
  U.acts["cc-open"] = function (el) { open(+el.getAttribute("data-i")); };
  U.acts["cc-pick"] = function (el) { CC.i = +el.getAttribute("data-i"); CC.loi = ""; fill(); };
  U.acts["cc-close"] = function (el, e) { if (el.classList.contains("cc-bg") && e && e.target && e.target.closest(".calpop")) return; var b = document.getElementById("cc-bg"); if (b) b.remove(); CC = null; };
  U.ons["cc-in"] = function (el) { var k = el.getAttribute("data-k"); CC[k] = el.value; if (k === "gio") ls("gp.cc.gio", el.value); if (k === "noi") ls("gp.cc.noi", el.value); redraw(); };
  function fname() { var c = CARDS[CC.i], p = c && c.id && U.view().by[c.id], base = c ? (c.kind === "le" ? c.khoa : (c.kind === "gio" ? "gio-" : "sinhnhat-") + (p ? U.fullName(p) : "")) : "thiep"; return ("thiep-" + base + "-" + c.ngay.join("-")).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".png"; }
  function blob(cb) { var cv = document.getElementById("cc-cv"); if (cv) cv.toBlob(cb, "image/png"); }
  U.acts["cc-save"] = function () { redraw(); blob(function (b) { if (!b) return; var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = fname(); document.body.appendChild(a); a.click(); a.remove(); setTimeout(function () { URL.revokeObjectURL(a.href); }, 4000); }); };
  U.acts["cc-share"] = function () {
    redraw(); blob(function (b) { if (!b) return; var file; try { file = new File([b], fname(), { type: "image/png" }); } catch (e) { file = null; }
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: t("lc.the_ngay") }).catch(function () {}); else U.acts["cc-save"](); });
  };
  document.addEventListener("keydown", function (e) { if (e.key === "Escape" && document.getElementById("cc-bg")) { e.stopImmediatePropagation(); document.getElementById("cc-bg").remove(); CC = null; } }, true);
})(typeof window !== "undefined" ? window : globalThis);
