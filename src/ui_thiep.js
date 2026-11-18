/* Câu chuyện & truyền thống: "Hôm nay trong dòng họ" ở trang chủ, thẻ câu chuyện từng người, thiệp mời giỗ / họp họ (vẽ ảnh PNG để gửi Zalo). */
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, S = GP.store, L = GP.lunar, t = U.t, esc = U.esc, P = U.pages;
  var KL = { gio: "th.l_gio", hop: "th.l_hop", nguoi: "th.l_nguoi", tu_do: "th.l_tu_do" };
  var DAN = ["hn.d1", "hn.d2", "hn.d3", "hn.d4", "hn.d5", "hn.d6", "hn.d7", "hn.d8"];

  // ---------- Hôm nay trong dòng họ ----------
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  U.todayCard = function () {
    var V = U.view(), td = U.today(), lu = L.solarToLunar(td[0], td[1], td[2]), items = [], old = [];
    var ev = GP.io.upcoming(V.list, td, td, { gioThieu: S.S.data.settings.gio_thang_thieu });
    ev.forEach(function (x) {
      if (x.loai === "le") { if (["tet1", "ram", "gio_to", "vu_lan", "trung_thu", "giao_thua", "thanh_minh"].indexOf(x.khoa) >= 0) items.push("<li>🏮 <b>" + esc(t("le." + x.khoa)) + "</b></li>"); return; }
      var ico = x.loai === "gio" ? "🕯️" : "🎂", lab = x.loai === "gio" ? t("lich.gio") : t("lich.sinh");
      items.push('<li>' + ico + " <b>" + esc(lab) + "</b> · " + U.link(x.id) + (x.loai === "sinh" && x.tuoi ? ' <span class="muted">(' + esc(x.tuoi + "") + ")</span>" : "") + "</li>");
    });
    V.list.forEach(function (p) {
      if (p.level !== "full") return;
      [["sinh", "hn.sinh"], ["mat", "hn.mat"]].forEach(function (k) {
        var d = p[k[0]]; if (!d || !d.nam || d.xap_xi || d.lich === "am" || d.thang !== td[1] || d.ngay !== td[0] || d.nam >= td[2]) return;
        if (k[0] === "mat" && p.con_song !== false) return;
        old.push({ y: d.nam, h: "<li>📜 " + esc(t("hn.nam_xua", { y: d.nam })) + " " + U.link(p.id) + " " + esc(t(k[1])) + "</li>" });
      });
    });
    old.sort(function (a, b) { return a.y - b.y; });
    var j = L.jdFromDate(td[0], td[1], td[2]), dan = t(DAN[((j % 8) + 8) % 8]);
    var body = items.concat(old.slice(0, 4).map(function (o) { return o.h; })).join("");
    return '<section class="card hn"><h2>🌅 ' + esc(t("hn.tieu_de")) + '</h2><p class="muted">' + esc(U.dmy(td) + " · " + t("d.am") + " " + lu.day + "/" + lu.month + (lu.leap ? " " + t("d.nhuan") : "")) + "</p>" +
      (body ? '<ul class="plain hnl">' + body + "</ul>" : '<p class="muted">' + esc(t("hn.khong_co")) + "</p>") +
      '<p class="hn-dan"><span aria-hidden="true">📖</span> <b>' + esc(t("hn.loi_dan")) + ":</b> " + esc(dan) + '</p><p><a class="btn small" href="#thiep">🖼️ ' + esc(t("nav.thiep")) + "</a></p></section>";
  };
  var homeOld = P["trang-chu"];
  P["trang-chu"] = function () {
    var o = homeOld(), k = '<section class="feats">'; if (o && o.html && o.html.indexOf(k) >= 0) o.html = o.html.replace(k, U.todayCard() + k); return o;
  };

  // ---------- Thiệp & thẻ chia sẻ ----------
  var T = { kind: "gio", fmt: "vuong", theme: "son", id: "", xung: "auto", f: { tieu: "", ngay: "", gio: "", noi: "", loi: "", gui: "", moi: "" } };
  var XUNG = ["auto", "Cụ ông", "Cụ bà", "Ông", "Bà", "Bác", "Chú", "Cô", "Dì", "Anh", "Chị", ""];
  function maxGen() { var m = 1; U.view().list.forEach(function (q) { var g = +U.gen(q); if (g > m) m = g; }); return m; }
  /** Đại từ nhân xưng: tự động theo giới tính và khoảng cách đời so với đời trẻ nhất trong gia phả */
  function xungOf(p) {
    if (!p) return ""; if (T.xung !== "auto") return T.xung;
    var nu = p.gioi_tinh === "nu", nam = p.gioi_tinh === "nam", gap = maxGen() - (+U.gen(p) || maxGen());
    if (!nu && !nam) return gap >= 3 ? "Cụ" : "";
    if (gap >= 3) return nu ? "Cụ bà" : "Cụ ông"; if (gap >= 1) return nu ? "Bà" : "Ông"; return nu ? "Chị" : "Anh";
  }
  U.callName = function (p) { return callName(p); };
  function callName(p) { var x = xungOf(p); return (x ? x + " " : "") + U.fullName(p); }
  function clanName() { return String((S.S.data.settings || {}).ten_dong_ho || "Họ Tống").replace(/^Họ\s+/i, ""); }
  function people() { return U.view().list.filter(function (p) { return p.level === "full" && p.con_song === false && !p.da_an; }).sort(function (a, b) { return U.fullName(a) < U.fullName(b) ? -1 : 1; }); }
  function iso(d) { return d[2] + "-" + pad(d[1]) + "-" + pad(d[0]); }
  function parseIso(s) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s || ""); return m ? [+m[3], +m[2], +m[1]] : null; }
  function nextGio(p) {
    var g = GP.io.gioInfo(p); if (!g) return null; var td = U.today(), j0 = L.jdFromDate(td[0], td[1], td[2]);
    for (var y = td[2]; y <= td[2] + 2; y++) { var a = L.anniversary(g.ngay, g.thang, y, { leap: g.nhuan, rule: S.S.data.settings.gio_thang_thieu || "cuoi" }); if (a && a.solar && L.jdFromDate(a.solar[0], a.solar[1], a.solar[2]) >= j0) return a.solar; }
    return null;
  }
  function defaults() {
    var V = U.view(), p = T.id && V.by[T.id], f = T.f;
    if (T.kind === "gio") {
      f.tieu = p ? t("th.gio_cua", { ten: callName(p) }) : t("th.l_gio");
      var n = p && nextGio(p); f.ngay = n ? iso(n) : ""; f.noi = (p && p.noi_an_tang) || ""; f.loi = p ? t("th.mo_gio", { ten: callName(p) }) : t("th.mo_gio_chung"); f.gui = t("th.gui_mac_dinh", { ho: clanName() });
    } else if (T.kind === "hop") { f.tieu = t("th.hop_tieu"); f.ngay = ""; f.noi = ""; f.loi = t("th.mo_hop"); f.gui = t("th.gui_mac_dinh", { ho: clanName() }); }
    else if (T.kind === "nguoi") { f.tieu = p ? callName(p) : ""; f.ngay = ""; f.noi = ""; f.loi = ""; }
    else { f.tieu = ""; f.ngay = ""; f.noi = ""; f.loi = ""; f.gui = ""; }
    if (T.kind === "nguoi" || T.kind === "tu_do") f.gui = "";
  }
  function content() {
    var V = U.view(), p = T.id && V.by[T.id], f = T.f, d = parseIso(f.ngay), lines = [], head, body = f.loi || "", foot = t("th.nho_nguon");
    if (T.kind === "nguoi") {
      head = t("th.nho_ve");
      if (p) { var s = U.yearTxt(p.sinh), m = U.yearTxt(p.mat); lines.push((s || "?") + " – " + (m || "?")); if (U.gen(p)) lines.push(t("th.doi_n", { n: U.gen(p) })); if (p.nghe) lines.push(p.nghe); body = (p.tieu_su || "").replace(/\s+/g, " ").trim(); if (body.length > 520) body = body.slice(0, 517).replace(/\s\S*$/, "") + "…"; if (p.nguon) foot = t("p.nguon") + ": " + p.nguon; }
    } else {
      head = T.kind === "gio" ? t("th.thu_moi_gio") : T.kind === "hop" ? t("th.thu_moi_hop") : t("th.thu_moi");
      if (f.gui) lines.push(t("th.kinh_gui") + ": " + f.gui);
      if (d) { var l = L.solarToLunar(d[0], d[1], d[2]); lines.push(t("th.ngay_l") + " " + U.dmy(d) + " (" + t("d.duong") + ")"); lines.push("(" + t("th.tuc") + " " + l.day + "/" + l.month + (l.leap ? " " + t("d.nhuan") : "") + " " + t("d.am") + ")"); }
      if (f.gio) lines.push(t("th.luc") + " " + f.gio);
      if (f.noi) lines.push(t("th.tai") + " " + f.noi);
    }
    if (T.kind !== "nguoi" && f.moi) foot = t("th.tran_trong") + " — " + f.moi;
    return { head: head, title: f.tieu, lines: lines, body: body, foot: foot };
  }
  function wrap(ctx, text, w) {
    var out = [], paras = String(text || "").split(/\n/);
    paras.forEach(function (para) { var cur = ""; para.split(/\s+/).forEach(function (wd) { if (!wd) return; var tst = cur ? cur + " " + wd : wd; if (ctx.measureText(tst).width > w && cur) { out.push(cur); cur = wd; } else cur = tst; }); out.push(cur); });
    return out;
  }
  var TH = { son: { bg0: "#fdf6e6", bg1: "#f1e2bf", frame: "#7a1f1f", gold: "#b8892b", title: "#7a1f1f", ink: "#2b1d12", sub: "#6b5a48" },
    huong: { bg0: "#2a1209", bg1: "#100604", frame: "#e0bd62", gold: "#e0bd62", title: "#f6dd96", ink: "#ecd596", sub: "#b0955c" },
    lua: { bg0: "#8a1f1a", bg1: "#430c0a", frame: "#e0bd62", gold: "#f3dc9a", title: "#f6dd96", ink: "#fbf3df", sub: "#e8d29a" } };
  function diamond(ctx, x, y, r) { ctx.beginPath(); ctx.moveTo(x, y - r); ctx.lineTo(x + r, y); ctx.lineTo(x, y + r); ctx.lineTo(x - r, y); ctx.closePath(); ctx.fill(); }
  function corner(ctx, x, y, sx, sy, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(sx, sy); ctx.strokeStyle = col; ctx.fillStyle = col; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.moveTo(0, 90); ctx.lineTo(0, 0); ctx.lineTo(90, 0); ctx.stroke();
    ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(16, 70); ctx.lineTo(16, 16); ctx.lineTo(70, 16); ctx.stroke(); diamond(ctx, 0, 0, 11); diamond(ctx, 34, 34, 6); ctx.restore();
  }
  function divider(ctx, cx, y, col) { ctx.fillStyle = col; ctx.fillRect(cx - 150, y - 1, 120, 2); ctx.fillRect(cx + 30, y - 1, 120, 2); diamond(ctx, cx, y, 9); diamond(ctx, cx - 26, y, 4); diamond(ctx, cx + 26, y, 4); }
  function lantern(ctx, x, y, s, th) {
    ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.strokeStyle = th.gold; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(0, -60); ctx.lineTo(0, -34); ctx.stroke();
    ctx.fillStyle = th.gold; ctx.fillRect(-14, -36, 28, 8); ctx.fillStyle = "#c0281f"; ctx.beginPath(); ctx.ellipse(0, 0, 30, 36, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = "rgba(255,220,150,.55)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(0, 0, 14, 36, 0, 0, 7); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-30, 0); ctx.lineTo(30, 0); ctx.stroke();
    ctx.fillStyle = th.gold; ctx.fillRect(-12, 34, 24, 7); ctx.fillRect(-1.5, 41, 3, 30); ctx.restore();
  }
  var logo = null;
  function draw() {
    var cv = document.getElementById("th-cv"); if (!cv) return; var sq = T.fmt === "vuong", W = 1080, H = sq ? 1080 : 1350; cv.width = W; cv.height = H;
    var ctx = cv.getContext("2d"), c = content(), th = TH[T.theme] || TH.son, serif = '"Lora", Georgia, "Times New Roman", serif', sans = '"Be Vietnam Pro", "Inter", system-ui, sans-serif', cx = W / 2;
    var g = ctx.createLinearGradient(0, 0, 0, H); g.addColorStop(0, th.bg0); g.addColorStop(1, th.bg1); ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = .07; ctx.fillStyle = th.gold; for (var gx = 40; gx < W; gx += 54) for (var gy = 40; gy < H; gy += 54) diamond(ctx, gx, gy, 3); ctx.globalAlpha = 1;
    ctx.strokeStyle = th.frame; ctx.lineWidth = 12; ctx.strokeRect(26, 26, W - 52, H - 52); ctx.strokeStyle = th.gold; ctx.lineWidth = 3; ctx.strokeRect(52, 52, W - 104, H - 104);
    corner(ctx, 66, 66, 1, 1, th.gold); corner(ctx, W - 66, 66, -1, 1, th.gold); corner(ctx, 66, H - 66, 1, -1, th.gold); corner(ctx, W - 66, H - 66, -1, -1, th.gold);
    ctx.textAlign = "center"; var y = sq ? 110 : 150, ls = sq ? 84 : 110;
    lantern(ctx, 150, sq ? 150 : 190, sq ? .8 : 1, th); lantern(ctx, W - 150, sq ? 150 : 190, sq ? .8 : 1, th);
    if (logo && logo.complete && logo.naturalWidth) { var lh = ls, lw = lh * logo.naturalWidth / logo.naturalHeight; ctx.drawImage(logo, cx - lw / 2, y - 20, lw, lh); y += lh + 34; } else y += 40;
    ctx.fillStyle = th.gold; ctx.font = "600 " + (sq ? 28 : 32) + "px " + sans; ctx.fillText(String(c.head || "").toUpperCase().split("").join(" "), cx, y); y += sq ? 36 : 44;
    divider(ctx, cx, y, th.gold); y += sq ? 62 : 78;
    var ts = sq ? 58 : 66, tl = []; do { ctx.font = "700 " + ts + "px " + serif; tl = wrap(ctx, c.title || " ", W - 260); ts -= 4; } while (tl.length > 2 && ts > 36);
    ctx.fillStyle = th.title; ctx.shadowColor = "rgba(0,0,0,.25)"; ctx.shadowBlur = 6; ctx.shadowOffsetY = 2; tl.slice(0, 3).forEach(function (ln) { ctx.fillText(ln, cx, y); y += ts * 1.25 + 8; }); ctx.shadowColor = "transparent"; y += 8;
    var fs2 = sq ? 36 : 40; ctx.font = "500 " + fs2 + "px " + serif; c.lines.forEach(function (ln, i) { ctx.fillStyle = i === 1 && /^\(/.test(ln) ? th.sub : th.ink; wrap(ctx, ln, W - 260).forEach(function (w) { ctx.fillText(w, cx, y); y += fs2 * 1.4; }); }); y += 14;
    var bs = sq ? 30 : 34, lh2 = bs * 1.5, foot = H - (sq ? 170 : 200); ctx.fillStyle = th.ink; ctx.font = "400 " + bs + "px " + sans;
    var bl = wrap(ctx, c.body, W - 280), room = Math.floor((foot - 30 - y) / lh2); bl.slice(0, Math.max(0, room)).forEach(function (w) { ctx.fillText(w, cx, y); y += lh2; });
    divider(ctx, cx, foot, th.gold);
    ctx.fillStyle = th.title; ctx.font = "italic 600 " + (sq ? 28 : 31) + "px " + serif; wrap(ctx, c.foot, W - 300).slice(0, 2).forEach(function (w, i) { ctx.fillText(w, cx, foot + 46 + i * 40); });
    var clan = String((S.S.data.settings || {}).ten_dong_ho || "Họ Tống"); ctx.fillStyle = th.sub; ctx.font = "500 " + (sq ? 22 : 24) + "px " + sans; ctx.fillText(clan + " · " + t("th.gia_pha_so"), cx, H - (sq ? 84 : 92));
  }
  function loadLogo() { if (logo) return; logo = new Image(); logo.onload = draw; logo.src = GP.IMG.nho; }
  function ok() { return T.kind !== "gio" && T.kind !== "nguoi" || !!T.id; }
  P.thiep = function () {
    var ps = people(), kinds = ["gio", "hop", "nguoi", "tu_do"], f = T.f;
    if ((T.kind === "gio" || T.kind === "nguoi") && !T.id && ps.length) { T.id = ps[0].id; defaults(); }
    var inp = function (k, lab, ty, ph) { return '<div><label class="lab" for="th-' + k + '">' + esc(lab) + '</label><input class="inp" id="th-' + k + '" type="' + (ty || "text") + '" value="' + esc(f[k]) + '" data-oninput="th-in" data-k="' + k + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : "") + "></div>"; };
    var html = "<h1>" + esc(t("nav.thiep")) + "</h1><p>" + esc(t("th.mo_ta")) + '</p><div class="card"><div class="fpills" role="group" aria-label="' + esc(t("th.loai")) + '">' +
      kinds.map(function (k) { return '<button type="button" class="fpill' + (T.kind === k ? " on" : "") + '" data-act="th-kind" data-k="' + k + '" aria-pressed="' + (T.kind === k) + '">' + esc(t(KL[k])) + "</button>"; }).join("") + "</div>" +
      ((T.kind === "gio" || T.kind === "nguoi") ? '<label class="lab" for="th-p">' + esc(t("th.nguoi")) + '</label><select class="inp" id="th-p" data-on="th-person">' + (ps.length ? ps.map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === T.id ? " selected" : "") + ">" + esc(U.fullName(p)) + "</option>"; }).join("") : '<option value="">' + esc(t("th.chua_co_nguoi")) + "</option>") + '</select><label class="lab" for="th-xung">' + esc(t("th.xung")) + '</label><select class="inp" id="th-xung" data-on="th-xung">' + XUNG.map(function (x) { return '<option value="' + esc(x) + '"' + (T.xung === x ? " selected" : "") + ">" + esc(x === "auto" ? t("th.xung_auto") + (T.id ? " (" + (xungOf(U.view().by[T.id]) || "—") + ")" : "") : x || t("th.khong_xung")) + "</option>"; }).join("") + "</select>" : "") +
      (T.kind === "nguoi" ? "" : '<div class="filters">' + inp("tieu", t("th.tieu_de_f")) + inp("ngay", t("th.ngay"), "date") + inp("gio", t("th.gio"), "text", t("th.gio_vd")) + inp("noi", t("th.dia_diem")) + (T.kind === "tu_do" ? "" : inp("gui", t("th.kinh_gui")) + inp("moi", t("th.nguoi_moi"), "text", t("th.nguoi_moi_vd"))) + inp("loi", t("th.loi_nhan")) + "</div>") +
      '</div><div class="card thc"><div class="fpills" role="group" aria-label="' + esc(t("th.khung")) + '">' + [["vuong", "th.vuong"], ["doc", "th.doc"]].map(function (x) { return '<button type="button" class="fpill' + (T.fmt === x[0] ? " on" : "") + '" data-act="th-fmt" data-k="' + x[0] + '" aria-pressed="' + (T.fmt === x[0]) + '">' + esc(t(x[1])) + "</button>"; }).join("") + '<span class="th-sep"></span>' + [["son", "th.m_son"], ["huong", "th.m_huong"], ["lua", "th.m_lua"]].map(function (x) { return '<button type="button" class="fpill' + (T.theme === x[0] ? " on" : "") + '" data-act="th-theme" data-k="' + x[0] + '" aria-pressed="' + (T.theme === x[0]) + '">' + esc(t(x[1])) + "</button>"; }).join("") + '</div><canvas id="th-cv" width="1080" height="1080" aria-label="' + esc(t("th.xem_truoc")) + '" style="width:100%;max-width:460px;height:auto;border-radius:10px;display:block;margin:12px auto 0;box-shadow:0 10px 26px rgba(0,0,0,.25)"></canvas>' +
      '<div class="row" style="justify-content:center;margin-top:12px"><button type="button" class="btn primary" data-act="th-save">⬇️ ' + esc(t("th.tai_anh")) + '</button><button type="button" class="btn" data-act="th-share">📤 ' + esc(t("th.zalo")) + '</button><button type="button" class="btn" data-act="th-copy">📋 ' + esc(t("th.chep")) + '</button><button type="button" class="btn" data-act="th-print">🖨️ ' + esc(t("th.in_thiep")) + "</button></div></div>";
    return { title: t("nav.thiep"), html: html, after: function () { loadLogo(); draw(); } };
  };
  U.acts["th-kind"] = function (el) { T.kind = el.getAttribute("data-k"); if ((T.kind === "gio" || T.kind === "nguoi") && !T.id) { var ps = people(); T.id = ps[0] ? ps[0].id : ""; } defaults(); U.rerender(); };
  U.ons["th-xung"] = function (el) { T.xung = el.value; defaults(); U.rerender(); };
  U.ons["th-person"] = function (el) { T.id = el.value; defaults(); U.rerender(); };
  U.ons["th-in"] = function (el) { T.f[el.getAttribute("data-k")] = el.value; draw(); };
  U.acts["th-open"] = function (el) { T.kind = el.getAttribute("data-k") || "nguoi"; T.id = el.getAttribute("data-id") || ""; defaults(); location.hash = "#thiep"; };
  U.acts["th-fmt"] = function (el) { T.fmt = el.getAttribute("data-k"); U.rerender(); };
  U.acts["th-theme"] = function (el) { T.theme = el.getAttribute("data-k"); U.rerender(); };
  U.acts["th-copy"] = function () { var c = content(), txt = [c.title].concat(c.lines, c.body ? [c.body] : []).join("\n"); try { navigator.clipboard.writeText(txt).then(function () { U.toast(t("th.da_chep")); }, function () { U.toast(t("th.khong_chia_se"), true); }); } catch (e) { U.toast(t("th.khong_chia_se"), true); } };
  U.acts["th-print"] = function () { draw(); var cv = document.getElementById("th-cv"); if (!cv) return; try { var w = window.open("", "_blank"); if (!w) throw 0; w.document.write('<title>' + esc(T.f.tieu || "") + '</title><style>@page{margin:0}body{margin:0}img{width:100%;display:block}</style><img src="' + cv.toDataURL("image/png") + '" onload="setTimeout(function(){print()},300)">'); w.document.close(); } catch (e) { U.acts["th-save"](); } };
  function blob(cb) { var cv = document.getElementById("th-cv"); if (!cv) return; cv.toBlob(cb, "image/png"); }
  function fname() { var p = T.id && U.view().by[T.id]; return "the-" + (p ? U.fullName(p) : T.f.tieu || "ho-tong").toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") + ".png"; }
  U.acts["th-save"] = function () { draw(); blob(function (b) { if (!b) return; var a = document.createElement("a"); a.href = URL.createObjectURL(b); a.download = fname(); document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500); U.toast(t("th.da_tai")); }); };
  U.acts["th-share"] = function () {
    draw(); blob(function (b) { if (!b) return; var file; try { file = new File([b], fname(), { type: "image/png" }); } catch (e) { file = null; }
      if (file && navigator.canShare && navigator.canShare({ files: [file] })) navigator.share({ files: [file], title: T.f.tieu || "" }).catch(function () {}); else { U.toast(t("th.khong_chia_se"), true); U.acts["th-save"](); } });
  };
  U.thiepState = T;
})(typeof window !== "undefined" ? window : globalThis);
