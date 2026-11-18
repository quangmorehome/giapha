/* Bản đồ địa điểm: nhà thờ tổ, mộ tổ, khu lăng mộ… Nhập ĐỊA CHỈ cụ thể → hiện bản đồ Google ngay trong trang (khi chạy bản độc lập
 * hoặc trên website riêng) và mở Google Maps / chỉ đường bằng liên kết. Khung xem của Claude không cho nhúng bản đồ bên ngoài:
 * khi bị chặn, trang tự đổi sang nút "Mở Google Maps". Không còn nhập/hiện kinh độ, vĩ độ. */
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, S = GP.store, t = U.t, esc = U.esc, P = U.pages;
  var ICON = { nha_tho_to: "🏯", tu_duong: "🏛️", nha_tho: "⛩️", mo_to: "🪦", mo: "🪦", khu_lang_mo: "⛰️", chua_dinh: "🛕", nha_cu: "🏡", khac: "📍" };
  var COL = { nha_tho_to: 3, tu_duong: 4, nha_tho: 4, mo_to: 7, mo: 7, khu_lang_mo: 6, chua_dinh: 8, nha_cu: 5, khac: 1 };
  var LOAI = ["nha_tho_to", "tu_duong", "nha_tho", "mo_to", "mo", "khu_lang_mo", "chua_dinh", "nha_cu", "khac"];
  var st = { sel: null, loai: "", pick: {}, edit: false, sat: true, osm: "" };

  function visible(s) {
    var r = S.S.viewer.role; if (r === "admin") return true; if (s.da_an) return false; if (r === "editor") return true;
    return r === "khach" ? s.muc_hien_thi === "cong_khai" : s.muc_hien_thi === "cong_khai" || s.muc_hien_thi === "gia_toc";
  }
  // Chuỗi tìm kiếm: ưu tiên địa chỉ; nếu chưa có thì dùng tên; (toạ độ cũ nếu còn thì dùng làm phương án cuối, không hiển thị)
  function query(s) {
    if (s.map_xn && typeof s.vi_do === "number" && typeof s.kinh_do === "number") return s.vi_do + "," + s.kinh_do; // vị trí do người trong họ đánh dấu trên Google Maps: chính xác nhất
    var a = String(s.dia_chi || "").trim(); if (a) return a;
    if (typeof s.vi_do === "number" && typeof s.kinh_do === "number") return s.vi_do + "," + s.kinh_do;
    return ""; // KHÔNG đoán theo tên: tên chung chung làm bản đồ mở sai chỗ. Chưa có địa chỉ/toạ độ → báo chưa có vị trí.
  }
  function pinned(s) { return !!(s.map_xn && typeof s.vi_do === "number" && typeof s.kinh_do === "number"); }
  function ok(s) { return !!query(s) || !!s.map_link; }
  var q = function (s) { return encodeURIComponent(query(s)); };
  var link = {
    place: function (s) { return s.map_link && /^https?:\/\//.test(s.map_link) && !(s.map_xn && query(s)) ? s.map_link : "https://www.google.com/maps/search/?api=1&query=" + q(s); },
    dir: function (s) { return query(s) ? "https://www.google.com/maps/dir/?api=1&destination=" + q(s) + "&travelmode=driving" : s.map_link; },
    waze: function (s) { return "https://waze.com/ul?q=" + q(s) + "&navigate=yes"; },
    apple: function (s) { return "https://maps.apple.com/?daddr=" + q(s) + "&dirflg=d"; },
    embed: function (s, sat) { return "https://www.google.com/maps?q=" + q(s) + "&hl=vi&z=" + (sat ? 18 : 16) + (sat ? "&t=k" : "") + "&output=embed"; }
  };
  // Lộ trình nhiều điểm theo thứ tự trong danh sách
  function route(list) {
    list = list.filter(ok); if (!list.length) return null; if (list.length === 1) return { url: link.dir(list[0]), order: list };
    var mid = list.slice(1, -1).map(q).join("%7C");
    return { url: "https://www.google.com/maps/dir/?api=1&destination=" + q(list[list.length - 1]) + (mid ? "&waypoints=" + mid : "") + "&origin=" + q(list[0]) + "&travelmode=driving", order: list };
  }
  GP.mapTools = { query: query, link: link, route: route };

  // ----- Hiện trạng, người an táng, nhắc giỗ -----
  var HT = ["tot", "can_tu_sua", "xuong_cap", "chua_ro"], HTK = { tot: "ok", can_tu_sua: "warn", xuong_cap: "mat", chua_ro: "" };
  function htBadge(s) { return s.hien_trang && s.hien_trang !== "chua_ro" ? U.badge(t("ht." + s.hien_trang), HTK[s.hien_trang]) : ""; }
  U.graveOf = function (pid) { var V = S.S.data.sites || []; for (var i = 0; i < V.length; i++) if (visible(V[i]) && (V[i].nguoi_an_tang || []).indexOf(pid) >= 0) return V[i]; return null; };
  U.icsOpts = function () { return { alarms: [7, 1], loc: function (i) { if (i.loai !== "gio") return ""; var g = U.graveOf(i.id); return g ? [g.ten, g.dia_chi].filter(Boolean).join(" · ") : ""; }, desc: function (i) { var g = i.loai === "gio" && U.graveOf(i.id); return g && g.duong_di ? g.duong_di : ""; } }; };
  function icsFor(ids, file) {
    var V = U.view(), td = U.today(), set = {}; ids.forEach(function (i) { set[i] = 1; });
    var items = GP.io.upcoming(V.list.filter(function (p) { return set[p.id]; }), td, [td[0], td[1], td[2] + 2], { gioThieu: S.S.data.settings.gio_thang_thieu, leTet: false }).filter(function (i) { return i.loai === "gio"; });
    if (!items.length) { U.toast(t("map.khong_co_gio"), true); return; }
    U.download(file, GP.io.toIcs(items, function (i) { return t("lich.gio") + ": " + U.nameOf(i.id); }, t("site.ten"), U.icsOpts()), "text/calendar");
  }
  U.acts["gio-ics"] = function (el) { icsFor([el.getAttribute("data-id")], "gio-" + el.getAttribute("data-id") + ".ics"); };
  U.acts["site-ics"] = function (el) { var s = S.S.data.sites.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0]; if (s) icsFor(s.nguoi_an_tang || [], "gio-" + s.id + ".ics"); };
  U.acts["map-go"] = function (el) { st.sel = el.getAttribute("data-id"); st.edit = false; st.loai = ""; if (location.hash === "#ban-do") U.rerender(); else location.hash = "#ban-do"; };
  function buried(s, can) {
    var V = U.view(), ids = (s.nguoi_an_tang || []).filter(function (i) { return V.by[i] && V.by[i].level !== "hidden"; }); if (!ids.length) return "";
    return '<h3>' + esc(t("map.an_tang_o_day")) + " (" + ids.length + ')</h3>' + (can ? '<p class="muted">' + esc(t("map.an_tang_ghi_chu")) + ' <button type="button" class="linkbtn" data-act="gan-clear" data-id="' + esc(s.id) + '">' + esc(t("map.go_tat_ca")) + "</button></p>" : "") + '<ul class="plain buried">' + ids.map(function (i) { var p = V.by[i], g = GP.io.gioInfo(p); return "<li>" + U.link(i) + (g ? ' <small class="muted">· ' + esc(t("lich.gio") + " " + g.ngay + "/" + g.thang + " ÂL")  + "</small>" : "") + (can ? ' <button type="button" class="linkbtn" data-act="gan-bo" data-id="' + esc(s.id) + '" data-pid="' + esc(i) + '" aria-label="' + esc(t("map.bo_gan") + ": " + U.nameOf(i)) + '">✕</button>' : "") + "</li>"; }).join("") + '</ul><div class="row"><button type="button" class="btn" data-act="site-ics" data-id="' + esc(s.id) + '">📅 ' + esc(t("map.nhac_gio")) + "</button></div>";
  }
  function burialPicker(s) {
    var V = U.view(), cur = {}; (s.nguoi_an_tang || []).forEach(function (i) { cur[i] = 1; });
    var list = V.list.filter(function (p) { return p.level !== "hidden" && (p.con_song === false || cur[p.id]); }).sort(function (a, b) { return (U.gen(a) || 99) - (U.gen(b) || 99) || (U.fullName(a) < U.fullName(b) ? -1 : 1); });
    return '<div><label class="lab" for="m-at">' + esc(t("map.nguoi_an_tang")) + '</label><select id="m-at" name="nguoi_an_tang" multiple size="7">' + list.map(function (p) { return '<option value="' + esc(p.id) + '"' + (cur[p.id] ? " selected" : "") + ">" + esc(U.fullName(p) + (U.gen(p) ? " · " + t("p.doi") + " " + U.gen(p) : "") + (p.mat && p.mat.nam ? " · † " + p.mat.nam : "")) + "</option>"; }).join("") + '</select><p class="muted">' + esc(t("map.chon_nhieu")) + "</p></div>";
  }
  function sitesAll() { return S.S.data.sites.filter(visible); }
  function kv(k, v) { return v ? "<dt>" + esc(k) + "</dt><dd>" + v + "</dd>" : ""; }
  function a(href, text, cls) { return '<a class="btn linkbtn ' + (cls || "") + '" href="' + href + '" target="_blank" rel="noopener noreferrer">' + text + "</a>"; }


  // Vẽ lại nhưng giữ vị trí cuộn của trang và của từng cột (danh sách | bản đồ | bên lề)
  function keepRender(o) {
    var y = window.scrollY, cols = Array.prototype.map.call(document.querySelectorAll(".mapws>div"), function (c) { return c.scrollTop; });
    U.rerender(); window.scrollTo(0, y);
    Array.prototype.forEach.call(document.querySelectorAll(".mapws>div"), function (c, i) { if (!(o && o.info && c.classList.contains("mw-info"))) c.scrollTop = cols[i] || 0; });
  }
  // ----- Bản đồ ô vuông tự vẽ (OpenStreetMap / OpenTopoMap): không dùng khung nhúng, chỉ tải ô nhìn thấy, có ghi nguồn -----
  var TL = { osm: { url: "https://tile.openstreetmap.org/{z}/{x}/{y}.png", max: 19, at: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>' },
    topo: { url: "https://tile.opentopomap.org/{z}/{x}/{y}.png", max: 17, at: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>, <a href="https://opentopomap.org" target="_blank" rel="noopener">OpenTopoMap</a> (CC-BY-SA)' } };
  function hasXY(s) { return typeof s.vi_do === "number" && typeof s.kinh_do === "number"; }
  function tileBox(s) { return '<div class="mapembed big tmapw"><div class="tmap" tabindex="0" role="application" aria-label="' + esc(s.ten) + '" data-lat="' + s.vi_do + '" data-lng="' + s.kinh_do + '" data-layer="' + esc(st.osm) + '"></div></div><p class="muted maploc">' + esc(t("map.osm_ghi_chu")) + "</p>"; }
  function initTiles() {
    Array.prototype.forEach.call(document.querySelectorAll(".tmap"), function (el) {
      if (el.getAttribute("data-init")) return; el.setAttribute("data-init", "1");
      var L = TL[el.getAttribute("data-layer")] || TL.osm, lat0 = +el.getAttribute("data-lat"), lng0 = +el.getAttribute("data-lng"), z = Math.min(17, L.max), cx, cy, W, H;
      var px = function (lat, lng, zz) { var n = Math.pow(2, zz) * 256, r = lat * Math.PI / 180; return [(lng + 180) / 360 * n, (1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n]; };
      var c0 = px(lat0, lng0, z); cx = c0[0]; cy = c0[1];
      var tiles = document.createElement("div"), mk = document.createElement("div"), at = document.createElement("div"), zc = document.createElement("div");
      tiles.className = "tl-tiles"; mk.className = "tl-mk"; mk.textContent = "📍"; at.className = "tl-at"; at.innerHTML = L.at; zc.className = "tl-zc";
      zc.innerHTML = '<button type="button" aria-label="+">+</button><button type="button" aria-label="−">−</button>';
      el.appendChild(tiles); el.appendChild(mk); el.appendChild(zc); el.appendChild(at);
      function draw() {
        W = el.clientWidth; H = el.clientHeight; if (!W || !H) return;
        var tlx = cx - W / 2, tly = cy - H / 2, x0 = Math.floor(tlx / 256), y0 = Math.floor(tly / 256), x1 = Math.floor((tlx + W) / 256), y1 = Math.floor((tly + H) / 256), n = Math.pow(2, z), keep = {}, x, y;
        for (x = x0; x <= x1; x++) for (y = y0; y <= y1; y++) {
          if (y < 0 || y >= n) continue; var xx = ((x % n) + n) % n, id = z + "/" + xx + "/" + y + "@" + x, im = tiles.querySelector('[data-k="' + id + '"]'); keep[id] = 1;
          if (!im) { im = document.createElement("img"); im.setAttribute("data-k", id); im.alt = ""; im.width = 256; im.height = 256; im.draggable = false; im.src = L.url.replace("{z}", z).replace("{x}", xx).replace("{y}", y); tiles.appendChild(im); }
          im.style.left = Math.round(x * 256 - tlx) + "px"; im.style.top = Math.round(y * 256 - tly) + "px";
        }
        Array.prototype.slice.call(tiles.children).forEach(function (im) { if (!keep[im.getAttribute("data-k")]) tiles.removeChild(im); });
        var m = px(lat0, lng0, z); mk.style.left = Math.round(m[0] - tlx) + "px"; mk.style.top = Math.round(m[1] - tly) + "px";
      }
      function zoom(d, fx, fy) { var nz = Math.max(3, Math.min(L.max, z + d)); if (nz === z) return; var k = Math.pow(2, nz - z); fx = fx == null ? W / 2 : fx; fy = fy == null ? H / 2 : fy; cx = (cx + fx - W / 2) * k - (fx - W / 2); cy = (cy + fy - H / 2) * k - (fy - H / 2); z = nz; draw(); }
      var drag = null;
      el.addEventListener("pointerdown", function (e) { if (e.target.closest(".tl-zc,.tl-at")) return; drag = { x: e.clientX, y: e.clientY }; try { el.setPointerCapture(e.pointerId); } catch (x) {} });
      el.addEventListener("pointermove", function (e) { if (!drag) return; cx -= e.clientX - drag.x; cy -= e.clientY - drag.y; drag.x = e.clientX; drag.y = e.clientY; draw(); });
      el.addEventListener("pointerup", function () { drag = null; }); el.addEventListener("pointercancel", function () { drag = null; });
      el.addEventListener("wheel", function (e) { e.preventDefault(); var r = el.getBoundingClientRect(); zoom(e.deltaY < 0 ? 1 : -1, e.clientX - r.left, e.clientY - r.top); }, { passive: false });
      el.addEventListener("keydown", function (e) { var d = 60; if (e.key === "+" || e.key === "=") zoom(1); else if (e.key === "-") zoom(-1); else if (e.key === "ArrowLeft") cx -= d; else if (e.key === "ArrowRight") cx += d; else if (e.key === "ArrowUp") cy -= d; else if (e.key === "ArrowDown") cy += d; else return; e.preventDefault(); draw(); });
      zc.addEventListener("click", function (e) { var b = e.target.closest("button"); if (b) zoom(b.textContent === "+" ? 1 : -1); });
      draw(); setTimeout(draw, 80); window.addEventListener("resize", draw);
    });
  }
  function embedBox(s) {
    if (!query(s)) return '<div class="mapembed blocked nopos"><p class="mapfb">' + esc(s.map_link ? t("map.link_ngan") : t("map.chua_vi_tri")) + "</p>" + editBtn(s) + "</div>";
    return '<div class="mapembed" id="mapembed"><iframe title="' + esc(s.ten) + '" loading="lazy" referrerpolicy="no-referrer-when-downgrade" allowfullscreen src="' + link.embed(s, st.sat) + '"></iframe><p class="mapfb muted" hidden>' + esc(t("map.bi_chan")) + '</p></div><p class="muted maploc">' + (pinned(s) ? "✅ " + esc(t("map.loc_chinh_xac")) : "📍 " + esc(t("map.loc_theo_dc"))) + "</p>";
  }
  function canLoc(s) { return U.canWrite && U.canWrite() && (S.S.viewer.role === "admin" || !s.da_an); }
  function editBtn(s) { return canLoc(s) ? '<button type="button" class="btn small" data-act="loc-edit" data-id="' + esc(s.id) + '">✏️ ' + esc(t("map.sua_vi_tri")) + "</button>" : ""; }
  /** Form sửa nhanh VỊ TRÍ của một khu: địa chỉ + link Google Maps (dán link để ghim đúng điểm) */
  function locForm(s) {
    return '<form class="mapform locform" data-submit="loc-save" data-id="' + esc(s.id) + '"><h3>📍 ' + esc(t("map.sua_vi_tri")) + ": " + esc(s.ten) + '</h3>' +
      '<div><label class="lab" for="m-map_link">🗺️ ' + esc(t("map.link_gg")) + '</label><input class="inp" id="m-map_link" name="map_link" type="url" inputmode="url" autocomplete="off" placeholder="https://www.google.com/maps/…" value="' + esc(s.map_link || "") + '" data-oninput="maplink"><p class="muted" id="maplink-st" aria-live="polite">' + esc(pinned(s) ? t("map.link_ok", { lat: s.vi_do, lng: s.kinh_do }) : t("map.link_goi_y")) + "</p></div>" +
      '<div><label class="lab" for="m-dia_chi">' + esc(t("rf.dia_chi")) + '</label><textarea class="inp" id="m-dia_chi" name="dia_chi" rows="2">' + esc(s.dia_chi || "") + '</textarea><p class="muted">' + esc(t("map.dia_chi_goi_y")) + "</p></div>" +
      '<div class="row"><button class="btn primary" type="submit">' + esc(t("c.luu")) + '</button><button type="button" class="btn ghost" data-act="loc-edit" data-id="' + esc(s.id) + '">' + esc(t("c.huy")) + "</button></div></form>";
  }

  // ----- Tỉnh/thành tự nhận từ địa chỉ (chính xác) hoặc từ tọa độ (ước tính theo tâm tỉnh gần nhất) -----
  var TINH = [["Hà Nội", 21.03, 105.85, "ha noi"], ["Hải Phòng", 20.84, 106.69, "hai phong"], ["Quảng Ninh", 21.0, 107.3, "quang ninh"], ["Hải Dương", 20.94, 106.33, "hai duong"], ["Hưng Yên", 20.65, 106.05, "hung yen"], ["Thái Bình", 20.45, 106.34, "thai binh"], ["Nam Định", 20.42, 106.17, "nam dinh"], ["Hà Nam", 20.54, 105.92, "ha nam"], ["Ninh Bình", 20.25, 105.97, "ninh binh"], ["Bắc Ninh", 21.19, 106.07, "bac ninh"], ["Bắc Giang", 21.28, 106.19, "bac giang"], ["Vĩnh Phúc", 21.31, 105.6, "vinh phuc"], ["Phú Thọ", 21.4, 105.2, "phu tho"], ["Thái Nguyên", 21.59, 105.84, "thai nguyen"], ["Bắc Kạn", 22.15, 105.83, "bac kan"], ["Cao Bằng", 22.67, 106.26, "cao bang"], ["Lạng Sơn", 21.85, 106.76, "lang son"], ["Tuyên Quang", 21.82, 105.21, "tuyen quang"], ["Hà Giang", 22.82, 104.98, "ha giang"], ["Yên Bái", 21.7, 104.87, "yen bai"], ["Lào Cai", 22.48, 103.97, "lao cai"], ["Lai Châu", 22.39, 103.46, "lai chau"], ["Điện Biên", 21.39, 103.02, "dien bien"], ["Sơn La", 21.33, 103.91, "son la"], ["Hòa Bình", 20.82, 105.34, "hoa binh"], ["Thanh Hóa", 19.8, 105.78, "thanh hoa"], ["Nghệ An", 19.0, 105.0, "nghe an"], ["Hà Tĩnh", 18.34, 105.9, "ha tinh"], ["Quảng Bình", 17.47, 106.6, "quang binh"], ["Quảng Trị", 16.75, 107.2, "quang tri"], ["Thừa Thiên Huế", 16.46, 107.59, "hue"], ["Đà Nẵng", 16.05, 108.2, "da nang"], ["Quảng Nam", 15.58, 108.0, "quang nam"], ["Quảng Ngãi", 15.12, 108.8, "quang ngai"], ["Bình Định", 14.17, 108.9, "binh dinh"], ["Phú Yên", 13.09, 109.1, "phu yen"], ["Khánh Hòa", 12.25, 109.1, "khanh hoa"], ["Ninh Thuận", 11.6, 108.99, "ninh thuan"], ["Bình Thuận", 11.09, 108.07, "binh thuan"], ["Kon Tum", 14.35, 108.0, "kon tum"], ["Gia Lai", 13.8, 108.1, "gia lai"], ["Đắk Lắk", 12.7, 108.2, "dak lak"], ["Đắk Nông", 12.0, 107.69, "dak nong"], ["Lâm Đồng", 11.95, 108.44, "lam dong"], ["Bình Phước", 11.75, 106.9, "binh phuoc"], ["Tây Ninh", 11.3, 106.1, "tay ninh"], ["Bình Dương", 11.0, 106.65, "binh duong"], ["Đồng Nai", 11.0, 107.2, "dong nai"], ["Bà Rịa - Vũng Tàu", 10.55, 107.3, "vung tau|ba ria"], ["TP. Hồ Chí Minh", 10.78, 106.7, "ho chi minh|hcm|sai gon"], ["Long An", 10.6, 106.2, "long an"], ["Tiền Giang", 10.4, 106.3, "tien giang"], ["Bến Tre", 10.2, 106.4, "ben tre"], ["Trà Vinh", 9.8, 106.3, "tra vinh"], ["Vĩnh Long", 10.2, 105.95, "vinh long"], ["Đồng Tháp", 10.45, 105.65, "dong thap"], ["An Giang", 10.5, 105.2, "an giang"], ["Kiên Giang", 10.0, 105.1, "kien giang"], ["Cần Thơ", 10.03, 105.78, "can tho"], ["Hậu Giang", 9.78, 105.6, "hau giang"], ["Sóc Trăng", 9.6, 105.97, "soc trang"], ["Bạc Liêu", 9.3, 105.7, "bac lieu"], ["Cà Mau", 9.17, 105.15, "ca mau"]];
  function plain(x) { return String(x || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase(); }
  function tinhAuto(s) {
    var addr = " " + plain(s.dia_chi).replace(/[^a-z0-9]+/g, " ") + " ", best = null, bi = -1;
    TINH.forEach(function (t0) { t0[3].split("|").forEach(function (k) { var i = addr.lastIndexOf(" " + k + " "); if (i > bi) { bi = i; best = t0[0]; } }); });
    if (best) return { v: best, tu: "dia_chi" };
    if (typeof s.vi_do === "number" && typeof s.kinh_do === "number") {
      var bd = 1e9; TINH.forEach(function (t0) { var dy = t0[1] - s.vi_do, dx = (t0[2] - s.kinh_do) * Math.cos(s.vi_do * Math.PI / 180), d = dx * dx + dy * dy; if (d < bd) { bd = d; best = t0[0]; } });
      if (best && bd < 1.2) return { v: best, tu: "toa_do" };
    }
    return null;
  }
  function tinhOf(s) { if (s.tinh_thanh) return { v: s.tinh_thanh, tu: "" }; return tinhAuto(s); }
  function locRow(row, link, addr) {
    row.map_link = String(link || "").trim(); row.dia_chi = String(addr || "").trim(); var gm = GP.io.parseGmaps(row.map_link);
    if (gm.ok) { row.vi_do = gm.lat; row.kinh_do = gm.lng; row.map_xn = true; } else { row.map_xn = false; row.vi_do = null; row.kinh_do = null; if (row.map_link) U.toast(gm.short ? t("map.link_ngan_luu") : t("map.link_khong_doc"), true); }
    var old0 = S.S.data.sites.filter(function (x) { return x.id === row.id; })[0] || {}, tmp = Object.assign({}, old0, row), au = tinhAuto(tmp);
    if (au && (!old0.tinh_thanh || old0.tinh_auto)) { row.tinh_thanh = au.v; row.tinh_auto = true; }
    return row;
  }
  U.acts["loc-edit"] = function (el) { var id = el.getAttribute("data-id"); st.loc = st.loc === id ? null : id; st.locNew = null; keepRender(); };
  U.ons["loc-save"] = function (f) {
    var d = new FormData(f), row = locRow({ id: f.getAttribute("data-id") }, d.get("map_link"), d.get("dia_chi"));
    var r = U.attempt(function () { return S.saveRow("sites", row); }); if (r.ok) { U.toast(t("c.da_luu")); st.loc = null; keepRender(); }
  };
  // Hồ sơ người mất chưa có khu mộ nào phù hợp: thêm khu mới (tên + địa chỉ/link) và gán luôn
  U.acts["loc-new"] = function (el) { var pid = el.getAttribute("data-id"); st.locNew = st.locNew === pid ? null : pid; st.loc = null; keepRender(); };
  U.ons["loc-new-save"] = function (f) {
    var d = new FormData(f), pid = f.getAttribute("data-id"), ten = String(d.get("ten") || "").trim(); if (!ten) { U.toast(t("val.thieu_ten"), true); return; }
    var row = locRow({ ten: ten, loai: String(d.get("loai") || "mo"), hien_trang: "chua_ro", muc_hien_thi: "gia_toc", muc_chac_chan: "chua_chac", nguon: "Nhập tay", nguoi_an_tang: [pid] }, d.get("map_link"), d.get("dia_chi"));
    var r = U.attempt(function () { return S.saveRow("sites", row); }); if (r.ok) { U.toast(t("c.da_luu")); st.locNew = null; keepRender(); }
  };
  function newSiteForm(p) {
    return '<form class="mapform locform" data-submit="loc-new-save" data-id="' + esc(p.id) + '"><h3>➕ ' + esc(t("map.them_noi")) + '</h3><div><label class="lab" for="ns-ten">' + esc(t("dt.ten_dt")) + '</label><input class="inp" id="ns-ten" name="ten" placeholder="' + esc(t("map.vd_ten")) + '"></div>' +
      '<div><label class="lab" for="ns-loai">' + esc(t("dt.loai")) + '</label><select class="inp" id="ns-loai" name="loai">' + ["mo", "mo_to", "khu_lang_mo"].map(function (k) { return '<option value="' + k + '">' + esc(t("loai." + k)) + "</option>"; }).join("") + "</select></div>" +
      '<div><label class="lab" for="m-map_link">🗺️ ' + esc(t("map.link_gg")) + '</label><input class="inp" id="m-map_link" name="map_link" type="url" inputmode="url" autocomplete="off" placeholder="https://www.google.com/maps/…" data-oninput="maplink"><p class="muted" id="maplink-st" aria-live="polite">' + esc(t("map.link_goi_y")) + "</p></div>" +
      '<div><label class="lab" for="ns-dc">' + esc(t("rf.dia_chi")) + '</label><textarea class="inp" id="ns-dc" name="dia_chi" rows="2"></textarea></div>' +
      '<div class="row"><button class="btn primary" type="submit">' + esc(t("c.luu")) + '</button><button type="button" class="btn ghost" data-act="loc-new" data-id="' + esc(p.id) + '">' + esc(t("c.huy")) + "</button></div></form>";
  }
  // Nếu trình xem chặn khung bản đồ → hiện chú thích thay cho khung trắng
  if (typeof document !== "undefined" && !U._mapCsp) {
    U._mapCsp = true;
    document.addEventListener("securitypolicyviolation", function (e) {
      if (!/google\.com\/maps/.test(e.blockedURI || "") && e.violatedDirective.indexOf("frame") < 0) return;
      var b = document.getElementById("mapembed"); if (!b) return; var f = b.querySelector("iframe"), p = b.querySelector(".mapfb"); if (f) f.hidden = true; if (p) p.hidden = false; b.classList.add("blocked");
    });
  }

  function nextEach(l) { var seen = {}; return l.filter(function (e) { if (seen[e.label]) return false; seen[e.label] = 1; return true; }); }
  function siteTaoMo(s) { var l = nextEach(taoMoDates(s, U.today())); return l.length ? "<h3>🌿 " + esc(t("tm.sap_toi")) + "</h3>" + taoMoBlock(l) + '<div class="row"><button type="button" class="btn" data-act="tm-ics" data-id="' + esc(s.id) + '">📅 ' + esc(t("tm.them_lich")) + "</button></div>" : ""; }
  function sideKv(s) {
    var dash = '<span class="muted">' + esc(t("sx.chua_cap_nhat")) + "</span>", row = function (k, v) { return "<dt>" + esc(k) + "</dt><dd>" + (v || dash) + "</dd>"; };
    var has = function (x) { return x !== undefined && x !== null && x !== ""; };
    var c = [s.lien_he_ten, s.lien_he_tuoi ? s.lien_he_tuoi + " " + t("sx.tuoi") : "", s.lien_he_qh].filter(Boolean).map(esc).join(" · ");
    var coord = typeof s.vi_do === "number" && typeof s.kinh_do === "number" ? esc(s.vi_do.toFixed(6) + ", " + s.kinh_do.toFixed(6)) : "";
    return '<div class="sidestats"><div><b>' + (has(s.so_mo) ? esc(s.so_mo) : "—") + "</b><small>" + esc(t("sx.so_mo")) + "</small></div><div><b>" + (has(s.so_cho_trong) ? esc(s.so_cho_trong) : "—") + "</b><small>" + esc(t("sx.cho_trong")) + "</small></div><div><b>" + (has(s.dien_tich) ? esc(s.dien_tich) : "—") + "</b><small>" + esc(t("sx.dien_tich")) + "</small></div></div>" +
      '<dl class="kv sidekv">' + row(t("sx.tinh"), (function () { var o = tinhOf(s); return o ? esc(o.v) + (o.tu === "toa_do" ? ' <small class="muted">(' + esc(t("sx.uoc_tinh")) + ")</small>" : "") : ""; })()) + row(t("sx.duy_tu"), esc(s.duy_tu || "").replace(/\n/g, "<br>")) +
      row(t("sx.trong_coi"), c || s.lien_he_sdt ? c + (s.lien_he_sdt ? (c ? "<br>" : "") + '<a href="tel:' + esc(String(s.lien_he_sdt).replace(/[^\d+]/g, "")) + '">' + esc(s.lien_he_sdt) + "</a>" : "") : "") + row(t("sx.toa_do"), coord) + "</dl>";
  }
  function detail(s) {
    var can = U.canWrite() && (S.S.viewer.role === "admin" || !s.da_an);
    var h = '<section class="card mapd c' + (COL[s.loai] || 1) + '"><div class="mapd-h"><span class="mapd-i" aria-hidden="true">' + (ICON[s.loai] || "📍") + '</span><div><h2>' + esc(s.ten) + '</h2><p class="chips">' + U.badge(t("loai." + s.loai), "") + (s.da_an ? U.badge(t("p.da_an"), "warn") : "") + htBadge(s) + "</p></div></div>";
    if (ok(s)) h += '<div class="row mapact">' + a(link.waze(s), "Waze") + a(link.apple(s), "Apple Maps") + '<button type="button" class="btn" data-act="map-copy" data-id="' + esc(s.id) + '">📋 ' + esc(t("map.chep_dia_chi")) + "</button></div>";
    else h += '<p class="note">' + esc(t("map.thieu_dia_chi")) + "</p>";
    h += sideKv(s) + '<dl class="kv">' + kv(t("rf.dia_chi"), esc(s.dia_chi || "")) + kv(t("dt.nam_xay"), esc(s.nam_xay || "")) + kv(t("rf.duong_di"), esc(s.duong_di || "").replace(/\n/g, "<br>")) + kv(t("rf.gio_tham_vieng"), esc(s.gio_tham_vieng || "")) + kv(t("ht.tieu_de"), s.hien_trang && s.hien_trang !== "chua_ro" ? esc(t("ht." + s.hien_trang)) + (s.hien_trang_ngay ? " <small class=\"muted\">(" + esc(s.hien_trang_ngay) + ")</small>" : "") : "") + kv(t("rf.lien_he"), esc(s.lien_he || "")) + kv(t("p.muc_hien_thi"), esc(t("hien." + (s.muc_hien_thi || "gia_toc")))) + "</dl>" + (s.gioi_thieu ? "<p>" + esc(s.gioi_thieu) + "</p>" : "") + (U.khoBlock ? U.khoBlock(null, s.id) : "") + siteTaoMo(s) + buried(s, can) + (can ? dead(s) : "");
    if (can) h += '<div class="row"><button type="button" class="btn" data-act="map-edit">✏️ ' + esc(t("map.sua")) + "</button></div>" + (st.edit ? editForm(s) : "");
    return h + "</section>";
  }
  function editForm(s) {
    var f = function (n, label, val, area, ph) { return '<div><label class="lab" for="m-' + n + '">' + esc(label) + "</label>" + (area ? '<textarea class="inp" id="m-' + n + '" name="' + n + '" rows="3">' + esc(val || "") + "</textarea>" : '<input class="inp" id="m-' + n + '" name="' + n + '" value="' + esc(val || "") + '"' + (ph ? ' placeholder="' + esc(ph) + '"' : "") + ">") + "</div>"; };
    return '<form class="mapform" data-submit="map-save" data-id="' + esc(s.id) + '"><h3>' + esc(t("map.sua")) + "</h3>" + f("ten", t("dt.ten_dt"), s.ten) +
      '<div><label class="lab" for="m-loai">' + esc(t("dt.loai")) + '</label><select id="m-loai" name="loai">' + LOAI.map(function (k) { return '<option value="' + k + '"' + (s.loai === k ? " selected" : "") + ">" + esc(t("loai." + k)) + "</option>"; }).join("") + "</select></div>" +
      '<div><label class="lab" for="m-map_link">🗺️ ' + esc(t("map.link_gg")) + '</label><input class="inp" id="m-map_link" name="map_link" type="url" inputmode="url" autocomplete="off" placeholder="https://www.google.com/maps/…" value="' + esc(s.map_link || "") + '" data-oninput="maplink"><p class="muted" id="maplink-st" aria-live="polite">' + esc(s.map_xn && typeof s.vi_do === "number" ? t("map.link_ok", { lat: s.vi_do, lng: s.kinh_do }) : t("map.link_goi_y")) + '</p></div>' +
      f("dia_chi", t("rf.dia_chi"), s.dia_chi, true, "") + '<p class="muted">' + esc(t("map.dia_chi_goi_y")) + '</p><button type="button" class="btn small" data-act="map-try">🔍 ' + esc(t("map.xem_thu")) + "</button>" +
      f("duong_di", t("rf.duong_di"), s.duong_di, true) + f("gio_tham_vieng", t("rf.gio_tham_vieng"), s.gio_tham_vieng) + f("lien_he", t("rf.lien_he"), s.lien_he) + f("nam_xay", t("dt.nam_xay"), s.nam_xay) +
      '<fieldset class="sidef"><legend>' + esc(t("sx.thong_tin")) + '</legend>' + f("tinh_thanh", t("sx.tinh"), s.tinh_thanh) + f("dien_tich", t("sx.dien_tich"), s.dien_tich) + f("so_mo", t("sx.so_mo"), s.so_mo) + f("so_cho_trong", t("sx.cho_trong"), s.so_cho_trong) + f("duy_tu", t("sx.duy_tu"), s.duy_tu, true, t("sx.duy_tu_ph")) +
      '<h4>' + esc(t("sx.trong_coi")) + '</h4>' + f("lien_he_ten", t("sx.ten"), s.lien_he_ten) + f("lien_he_tuoi", t("sx.tuoi_l"), s.lien_he_tuoi) + f("lien_he_sdt", t("sx.sdt"), s.lien_he_sdt) + f("lien_he_qh", t("sx.quan_he"), s.lien_he_qh) + '<p class="muted">' + esc(t("sx.rieng")) + '</p></fieldset>' +
      '<div><label class="lab" for="m-ht">' + esc(t("ht.tieu_de")) + '</label><select id="m-ht" name="hien_trang">' + HT.map(function (k) { return '<option value="' + k + '"' + ((s.hien_trang || "chua_ro") === k ? " selected" : "") + ">" + esc(t("ht." + k)) + "</option>"; }).join("") + "</select></div>" + burialPicker(s) +
      '<div><label class="lab" for="m-hien">' + esc(t("p.muc_hien_thi")) + '</label><select id="m-hien" name="muc_hien_thi">' + ["rieng_tu", "gia_dinh_nho", "dai_gia_dinh", "gia_toc", "cong_khai"].map(function (k) { return '<option value="' + k + '"' + (s.muc_hien_thi === k ? " selected" : "") + ">" + esc(t("hien." + k)) + "</option>"; }).join("") + "</select></div>" +
      taoMoForm(s) +
      '<div class="row"><button class="btn primary" type="submit">' + esc(t("c.luu")) + '</button><button type="button" class="btn ghost" data-act="map-edit">' + esc(t("c.huy")) + "</button></div></form>";
  }

  function mapPanel(s) {
    if (!s) return "";
    var h = '<section class="card mapbig c' + (COL[s.loai] || 1) + '"><div class="mb-h"><span class="mapd-i" aria-hidden="true">' + (ICON[s.loai] || "📍") + '</span><div class="mb-t"><h2>' + esc(s.ten) + '</h2><p class="muted">' + esc(s.dia_chi || t("map.chua_co_dia_chi")) + "</p></div></div>";
    if (!ok(s)) return h + '<p class="note">' + esc(t("map.thieu_dia_chi")) + '</p><div class="row">' + editBtn(s) + "</div>" + (st.loc === s.id ? locForm(s) : "") + "</section>";
    return h + '<div class="seg mb-seg" role="group" aria-label="' + esc(t("map.kieu_xem")) + '"><button type="button" class="segb' + (st.sat && !st.osm ? " on" : "") + '" data-act="map-sat" data-v="1" aria-pressed="' + (st.sat && !st.osm) + '">🛰️ ' + esc(t("map.ve_tinh")) + '</button><button type="button" class="segb' + (!st.sat && !st.osm ? " on" : "") + '" data-act="map-sat" data-v="0" aria-pressed="' + (!st.sat && !st.osm) + '">🗺️ ' + esc(t("map.ban_do_th")) + "</button>" + (hasXY(s) ? ['osm', 'topo'].map(function (k) { return '<button type="button" class="segb' + (st.osm === k ? " on" : "") + '" data-act="map-osm" data-v="' + k + '" aria-pressed="' + (st.osm === k) + '">' + (k === "osm" ? "🌍 OSM" : "⛰️ " + esc(t("map.dia_hinh"))) + "</button>"; }).join("") : "") + "</div>" +
      (st.osm && hasXY(s) ? tileBox(s) : embedBox(s).replace('class="mapembed"', 'class="mapembed big"')) + '<div class="row mapact">' + a(link.dir(s), "🧭 " + esc(t("map.chi_duong")), "primary") + editBtn(s) + "</div>" + (st.loc === s.id ? locForm(s) : "") + "</section>";
  }
  U.acts["map-osm"] = function (el) { var v = el.getAttribute("data-v"); st.osm = st.osm === v ? "" : v; keepRender(); };
  U.acts["map-sat"] = function (el) {
    st.sat = el.getAttribute("data-v") === "1"; if (st.osm) { st.osm = ""; keepRender(); return; }
    var f = document.querySelector(".mapbig iframe"), s = S.S.data.sites.filter(function (x) { return x.id === st.sel; })[0];
    if (f && s) f.src = link.embed(s, st.sat);
    Array.prototype.forEach.call(document.querySelectorAll(".mb-seg .segb"), function (b) { var on = (b.getAttribute("data-v") === "1") === st.sat; b.classList.toggle("on", on); b.setAttribute("aria-pressed", String(on)); });
  };
  // Gán / bỏ gán người đã mất cho một địa điểm (không cần mở form sửa)
  function dead(s) {
    var V = U.view(), cur = {}; (s.nguoi_an_tang || []).forEach(function (i) { cur[i] = 1; });
    var list = V.list.filter(function (p) { return p.level !== "hidden" && p.con_song === false && !cur[p.id]; }).sort(function (x, y) { return (U.gen(x) || 99) - (U.gen(y) || 99) || (U.fullName(x) < U.fullName(y) ? -1 : 1); });
    if (!list.length) return "";
    return '<div class="gan-ng"><label class="lab" for="gan-sel">' + esc(t("map.gan_nguoi")) + '</label><div class="row"><select id="gan-sel" class="inp">' + '<option value="">' + esc(t("map.chon_nguoi_mat")) + "</option>" + list.map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(U.fullName(p) + (U.gen(p) ? " · " + t("p.doi") + " " + U.gen(p) : "")) + "</option>"; }).join("") + '</select><button type="button" class="btn primary" data-act="gan-add" data-id="' + esc(s.id) + '">➕ ' + esc(t("map.gan")) + "</button></div></div>";
  }
  function saveBury(sid, ids) { var r = U.attempt(function () { return S.saveRow("sites", { id: sid, nguoi_an_tang: ids }); }); if (r.ok) { U.toast(t("c.da_luu")); keepRender(); } }
  function siteById(id) { return S.S.data.sites.filter(function (x) { return x.id === id; })[0]; }
  U.acts["gan-add"] = function (el) { var v = document.getElementById("gan-sel"), s = siteById(el.getAttribute("data-id")); if (!s || !v || !v.value) { U.toast(t("map.chon_nguoi_mat"), true); return; } saveBury(s.id, (s.nguoi_an_tang || []).concat([v.value])); };
  U.acts["gan-clear"] = function (el) { var s = siteById(el.getAttribute("data-id")); if (!s) return; if (el.getAttribute("data-sure") !== "1") { el.setAttribute("data-sure", "1"); el.textContent = t("map.go_tat_ca_chac"); return; } saveBury(s.id, []); };
  U.acts["gan-bo"] = function (el) { var s = siteById(el.getAttribute("data-id")), pid = el.getAttribute("data-pid"); if (s) saveBury(s.id, (s.nguoi_an_tang || []).filter(function (i) { return i !== pid; })); };
  // Từ hồ sơ người đã mất: chọn nơi an táng
  U.ons["grave-set"] = function (el) {
    var pid = el.getAttribute("data-id"), to = el.value, r = U.attempt(function () {
      S.S.data.sites.forEach(function (s) { var has = (s.nguoi_an_tang || []).indexOf(pid) >= 0; if (has && s.id !== to) S.saveRow("sites", { id: s.id, nguoi_an_tang: s.nguoi_an_tang.filter(function (i) { return i !== pid; }) }); });
      var d = siteById(to); if (d && (d.nguoi_an_tang || []).indexOf(pid) < 0) S.saveRow("sites", { id: d.id, nguoi_an_tang: (d.nguoi_an_tang || []).concat([pid]) });
    }); if (r.ok) { U.toast(t("c.da_luu")); keepRender(); }
  };
  /** Thẻ "Nơi an táng" trong hồ sơ người đã mất: vị trí đã gán, bản đồ nhỏ, chỉ đường; người sửa được thì chọn/đổi nơi an táng */
  U.graveCard = function (p, can) {
    var g = U.graveOf(p.id), all = sitesAll();
    if (!g && !p.noi_an_tang && !can) return "";
    var h = '<section class="card sec c7"><h2><i aria-hidden="true">🪦</i> ' + esc(t("p.noi_an_tang")) + "</h2>";
    if (p.noi_an_tang) h += "<p>" + esc(p.noi_an_tang) + "</p>";
    if (g) {
      h += '<div class="grv"><b>' + (ICON[g.loai] || "📍") + " " + esc(g.ten) + "</b> " + htBadge(g) + (g.dia_chi ? '<p class="muted">' + esc(g.dia_chi) + "</p>" : "") + "</div>";
      if (query(g)) h += '<div class="mapembed mini"><iframe title="' + esc(g.ten) + '" loading="lazy" allowfullscreen referrerpolicy="no-referrer-when-downgrade" src="' + link.embed(g, true) + '"></iframe></div><p class="muted maploc">' + (pinned(g) ? "✅ " + esc(t("map.loc_chinh_xac")) : "📍 " + esc(t("map.loc_theo_dc"))) + "</p>";
      else h += '<p class="note">' + esc(t("map.chua_vi_tri")) + "</p>";
      h += '<div class="row">' + '<button type="button" class="btn primary" data-act="map-go" data-id="' + esc(g.id) + '">📍 ' + esc(t("map.xem_ban_do")) + "</button>" + (ok(g) ? a(link.dir(g), "🧭 " + esc(t("map.chi_duong"))) : "") + (can && canLoc(g) ? '<button type="button" class="btn" data-act="loc-edit" data-id="' + esc(g.id) + '">✏️ ' + esc(t("map.sua_vi_tri")) + "</button>" : "") + "</div>" + (can && st.loc === g.id ? locForm(g) : "");
    }
    if (can && all.length) h += '<div class="gan-ng"><label class="lab" for="gr-' + esc(p.id) + '">' + esc(t("map.chon_noi_an_tang")) + '</label><select class="inp" id="gr-' + esc(p.id) + '" data-on="grave-set" data-id="' + esc(p.id) + '"><option value="">' + esc(t("map.chua_gan")) + "</option>" + all.map(function (s) { return '<option value="' + esc(s.id) + '"' + (g && g.id === s.id ? " selected" : "") + ">" + esc(s.ten) + "</option>"; }).join("") + "</select></div>";
    if (can) h += '<div class="row"><button type="button" class="btn small" data-act="loc-new" data-id="' + esc(p.id) + '">➕ ' + esc(t("map.them_noi")) + "</button></div>" + (st.locNew === p.id ? newSiteForm(p) : "");
    return h + "</section>";
  };

  P["ban-do"] = function () {
    var all = sitesAll(), loais = LOAI.filter(function (k) { return all.some(function (s) { return s.loai === k; }); });
    var list = all.filter(function (s) { return !st.loai || s.loai === st.loai; });
    if (st.sel && !all.some(function (s) { return s.id === st.sel; })) st.sel = null;
    if (!st.sel) { var f0 = all.filter(ok)[0] || all[0]; if (f0) st.sel = f0.id; }
    var sel = all.filter(function (s) { return s.id === st.sel; })[0];
    var pills = '<div class="fpills" role="group" aria-label="' + esc(t("dt.loai")) + '"><button type="button" class="fpill' + (!st.loai ? " on" : "") + '" data-act="map-f" data-v="">' + esc(t("l.tat_ca")) + " (" + all.length + ")</button>" + loais.map(function (k) { return '<button type="button" class="fpill c' + COL[k] + (st.loai === k ? " on" : "") + '" data-act="map-f" data-v="' + k + '">' + (ICON[k] || "") + " " + esc(t("loai." + k)) + "</button>"; }).join("") + "</div>";
    var cards = list.map(function (s) {
      return '<li><div class="mcard c' + (COL[s.loai] || 1) + (st.sel === s.id ? " on" : "") + '"><button type="button" class="mbody" data-act="map-sel" data-id="' + esc(s.id) + '"><span class="mi">' + (ICON[s.loai] || "📍") + '</span><span><b>' + esc(s.ten) + "</b><br><small>" + esc(s.dia_chi || t("map.chua_co_dia_chi")) + "</small>" + (s.hien_trang && s.hien_trang !== "chua_ro" ? " " + htBadge(s) : "") + "</span></button></div></li>";
    }).join("");
    var trip = "";
    var nMo = all.filter(function (s) { return /mo|lang/.test(s.loai); }).length, nSua = all.filter(function (s) { return s.hien_trang === "can_tu_sua" || s.hien_trang === "xuong_cap"; }).length;
    var tiles = '<p class="dtsum"><span class="chip">📍 ' + all.length + " " + esc(t("dt.tong")) + '</span> <span class="chip">🪦 ' + nMo + " " + esc(t("dt.so_mo")) + "</span>" + (nSua ? ' <span class="chip">⚠️ ' + nSua + " " + esc(t("dt.can_tu_sua")) + "</span>" : "") + "</p>";
    var empty = all.length ? "" : '<p class="muted">' + esc(t("map.chua_co")) + "</p>";
    return { title: t("map.tieu_de"), after: initTiles, html: "<h1>" + esc(t("map.tieu_de")) + '</h1><p class="muted">' + esc(t("map.mo_ta")) + "</p>" + '<div class="mapws"><div class="mw-map">' + (sel ? mapPanel(sel) : "") + '</div><div class="mw-list"><h2 class="mh2">📍 ' + esc(t("map.ds_dia_diem")) + " (" + all.length + ")</h2>" + pills + empty + '<ul class="plain mlist">' + cards + '</ul></div><div class="mw-info">' + (sel ? detail(sel) : "") + "</div></div>" + trip + overview() +
      '<section class="card sec"><h2>💡 ' + esc(t("map.meo")) + '</h2><ul><li>' + esc(t("map.meo1")) + "</li><li>" + esc(t("map.meo2")) + "</li><li>" + esc(t("map.meo3")) + "</li><li>" + esc(t("map.meo4")) + "</li></ul></section>" };
  };

  U.acts["map-f"] = function (el) { st.loai = el.getAttribute("data-v") || ""; U.rerender(); };
  U.acts["map-sel"] = function (el) { st.sel = el.getAttribute("data-id"); st.edit = false; keepRender({ info: true }); var d = document.querySelector(".mapd"); if (d && d.scrollIntoView && window.innerWidth < 800) d.scrollIntoView({ block: "start" }); };
  U.acts["map-pick"] = function (el) { var id = el.getAttribute("data-id"); if (el.checked) st.pick[id] = 1; else delete st.pick[id]; keepRender(); };
  // Di tích: thêm/sửa dùng chung form đầy đủ của trang Bản đồ (thay form cũ hiện mã chữ thô)
  var oldNew = U.acts["row-new"], oldEdit = U.acts["row-edit"];
  U.acts["row-new"] = function (el) {
    if (el.getAttribute("data-table") !== "sites") return oldNew(el);
    var r = U.attempt(function () { return S.saveRow("sites", { ten: t("map.dia_diem_moi"), loai: "nha_tho_to", hien_trang: "chua_ro", muc_hien_thi: "gia_toc", muc_chac_chan: "chua_chac", nguon: "Nhập tay" }); });
    if (!r.ok) return; st.sel = r.v.id; st.edit = true; st.loai = ""; if (location.hash === "#ban-do") U.rerender(); else location.hash = "#ban-do";
  };
  U.acts["row-edit"] = function (el) {
    if (el.getAttribute("data-table") !== "sites") return oldEdit(el);
    st.sel = el.getAttribute("data-id"); st.edit = true; st.loai = ""; if (location.hash === "#ban-do") U.rerender(); else location.hash = "#ban-do";
  };
  U.acts["map-edit"] = function () { st.edit = !st.edit; keepRender(); };
  U.acts["map-copy"] = function (el) {
    var s = S.S.data.sites.filter(function (x) { return x.id === el.getAttribute("data-id"); })[0]; if (!s) return; var txt = query(s);
    var done = function () { U.toast(t("map.da_chep")); };
    try { navigator.clipboard.writeText(txt).then(done, function () { U.toast(txt); }); } catch (e) { U.toast(txt); }
  };
  U.acts["map-try"] = function () {
    var v = document.getElementById("m-dia_chi"), n = document.getElementById("m-ten"); var s = { dia_chi: v ? v.value : "", ten: n ? n.value : "" };
    if (!ok(s)) { U.toast(t("map.thieu_dia_chi"), true); return; }
    var box = document.getElementById("mapembed"); if (box) { box.outerHTML = embedBox(s); }
    window.open(link.place(s), "_blank", "noopener");
  };
  U.ons["map-save"] = function (f) {
    var d = new FormData(f), row = { id: f.getAttribute("data-id") }; ["ten", "loai", "dia_chi", "duong_di", "gio_tham_vieng", "lien_he", "nam_xay", "muc_hien_thi", "hien_trang", "map_link", "tao_mo_tuy", "tinh_thanh", "dien_tich", "so_mo", "so_cho_trong", "duy_tu", "lien_he_ten", "lien_he_tuoi", "lien_he_sdt", "lien_he_qh"].forEach(function (k) { row[k] = String(d.get(k) || "").trim(); });
    row.tao_mo = d.getAll("tao_mo"); var gm = GP.io.parseGmaps(row.map_link);
    if (gm.ok) { row.vi_do = gm.lat; row.kinh_do = gm.lng; row.map_xn = true; } else if (row.map_link) { var o0 = S.S.data.sites.filter(function (x) { return x.id === row.id; })[0]; if (!o0 || o0.map_link !== row.map_link) { row.map_xn = false; row.vi_do = null; row.kinh_do = null; U.toast(gm.short ? t("map.link_ngan_luu") : t("map.link_khong_doc"), true); } } else { row.map_xn = false; }
    row.nguoi_an_tang = d.getAll("nguoi_an_tang"); var old = S.S.data.sites.filter(function (x) { return x.id === row.id; })[0]; if (!old || (old.hien_trang || "chua_ro") !== row.hien_trang) { var td = U.today(); row.hien_trang_ngay = td[0] + "/" + td[1] + "/" + td[2]; }
    if (!row.ten) { U.toast(t("val.thieu_ten"), true); return; }
    var au = tinhAuto(Object.assign({}, old || {}, row)); if (au && (!row.tinh_thanh || (old && old.tinh_auto && row.tinh_thanh === old.tinh_thanh))) { row.tinh_thanh = au.v; row.tinh_auto = true; } else if (row.tinh_thanh && (!old || row.tinh_thanh !== old.tinh_thanh)) row.tinh_auto = false;
    var r = U.attempt(function () { return S.saveRow("sites", row); }); if (r.ok) { U.toast(t("c.da_luu")); st.edit = false; keepRender(); }
  };
  // ----- Link Google Maps: xem trước toạ độ ngay khi dán -----
  U.ons.maplink = function (el) {
    var r = GP.io.parseGmaps(el.value), o = document.getElementById("maplink-st"); if (!o) return;
    o.textContent = !el.value.trim() ? t("map.link_goi_y") : r.ok ? t("map.link_ok", { lat: r.lat.toFixed(6), lng: r.lng.toFixed(6) }) : r.short ? t("map.link_ngan_luu") : t("map.link_khong_doc");
  };
  // ----- Nhắc tảo mộ định kỳ -----
  var TM = ["thanh_minh", "chap"];
  function taoMoForm(s) {
    var cur = {}; (s.tao_mo || []).forEach(function (k) { cur[k] = 1; });
    return '<fieldset class="taomo"><legend>' + esc(t("tm.tieu_de")) + "</legend>" + TM.map(function (k) { return '<label class="chk"><input type="checkbox" name="tao_mo" value="' + k + '"' + (cur[k] ? " checked" : "") + "> " + esc(t("tm." + k)) + "</label>"; }).join("") +
      '<label class="lab" for="m-tmt">' + esc(t("tm.tuy")) + '</label><input class="inp" id="m-tmt" name="tao_mo_tuy" placeholder="10/3" value="' + esc(s.tao_mo_tuy || "") + '"><p class="muted">' + esc(t("tm.mo_ta")) + "</p></fieldset>";
  }
  /** Các ngày tảo mộ sắp tới (dương lịch) của một khu, từ ngày `from` đến hết năm sau */
  function taoMoDates(s, from) {
    var L = GP.lunar, out = [], j0 = L.jdFromDate(from[0], from[1], from[2]);
    for (var y = from[2]; y <= from[2] + 2; y++) {
      (s.tao_mo || []).forEach(function (k) {
        var d = k === "thanh_minh" ? L.thanhMinh(y) : k === "chap" ? ((L.anniversary(23, 12, y, { rule: "cuoi" }) || {}).solar || null) : null;
        if (d) out.push({ site: s, solar: d, label: t("tm." + k) });
      });
      var m = /^\s*(\d{1,2})\s*[\/\-.]\s*(\d{1,2})\s*$/.exec(s.tao_mo_tuy || "");
      if (m && +m[1] >= 1 && +m[1] <= 30 && +m[2] >= 1 && +m[2] <= 12) { var a = L.anniversary(+m[1], +m[2], y, { rule: "cuoi" }); if (a && a.solar) out.push({ site: s, solar: a.solar, label: t("tm.tuy_nhan", { n: m[1] + "/" + m[2] }) }); }
    }
    return out.filter(function (e) { return L.jdFromDate(e.solar[0], e.solar[1], e.solar[2]) >= j0; }).sort(function (a, b) { return L.jdFromDate(a.solar[0], a.solar[1], a.solar[2]) - L.jdFromDate(b.solar[0], b.solar[1], b.solar[2]); });
  }
  U.taoMo = function () { var td = U.today(), all = []; sitesAll().forEach(function (s) { all = all.concat(taoMoDates(s, td)); }); return all.sort(function (a, b) { return GP.lunar.jdFromDate(a.solar[0], a.solar[1], a.solar[2]) - GP.lunar.jdFromDate(b.solar[0], b.solar[1], b.solar[2]); }); };
  function fmt(d) { return d[0] + "/" + d[1] + "/" + d[2]; }
  function taoMoBlock(list) {
    if (!list.length) return "";
    var td = U.today(), j0 = GP.lunar.jdFromDate(td[0], td[1], td[2]);
    return "<ul class=\"plain taomo-l\">" + list.slice(0, 6).map(function (e) { var n = GP.lunar.jdFromDate(e.solar[0], e.solar[1], e.solar[2]) - j0; return "<li>🌿 <b>" + esc(fmt(e.solar)) + "</b> · " + esc(e.label) + (e.site ? " · " + esc(e.site.ten) : "") + ' <small class="muted">(' + esc(n === 0 ? t("tm.hom_nay") : t("tm.con_n", { n: n })) + ")</small></li>"; }).join("") + "</ul>";
  }
  function taoMoIcs(list, file) {
    if (!list.length) { U.toast(t("tm.khong_co"), true); return; }
    var items = list.map(function (e) { return { loai: "tao_mo", ngay: e.solar, id: e.site.id, ten: e.label + " · " + e.site.ten, site: e.site }; });
    U.download(file, GP.io.toIcs(items, function (i) { return "🌿 " + i.ten; }, t("site.ten"), { alarms: [7, 1], loc: function (i) { return [i.site.ten, i.site.dia_chi].filter(Boolean).join(" · "); }, desc: function (i) { return i.site.duong_di || ""; } }), "text/calendar");
  }
  U.acts["tm-ics"] = function (el) { var id = el.getAttribute("data-id"); taoMoIcs(id ? taoMoDates(S.S.data.sites.filter(function (x) { return x.id === id; })[0], U.today()) : U.taoMo(), "tao-mo.ics"); };
  // ----- Bản đồ chung (Google My Maps): Quản trị dán link bản đồ đã đánh dấu sẵn các khu -----
  function myMid(str) { var m = /[?&]mid=([\w-]+)/.exec(str || ""); return m ? m[1] : /^[\w-]{20,}$/.test(String(str || "").trim()) ? String(str).trim() : ""; }
  U.ons["mymaps-save"] = function (f) {
    var v = String(new FormData(f).get("mm") || "").trim(), mid = v ? myMid(v) : ""; if (v && !mid) { U.toast(t("mm.khong_doc"), true); return; }
    var r = U.attempt(function () { return S.saveSettings({ mymaps_mid: mid }); }); if (r.ok) { U.toast(t("c.da_luu")); U.rerender(); }
  };
  U.acts["mm-pub"] = function () { var n = 0; S.S.data.sites.forEach(function (s) { if (s.muc_hien_thi !== "cong_khai" && !s.da_an) { S.saveRow("sites", { id: s.id, muc_hien_thi: "cong_khai" }); n++; } }); U.toast(t("mm.da_mo", { n: n })); U.rerender(); };
  function overview() {
    var mid = (S.S.data.settings || {}).mymaps_mid, adm = S.S.viewer.role === "admin", h = "";
    var tm = U.taoMo(); if (tm.length) { var sd = {}; tm = tm.filter(function (e) { var k = e.label + "|" + e.solar.join("-"); if (sd[k]) { sd[k].site = { ten: sd[k].site.ten.replace(/( \+\d+)?$/, "") }; return false; } sd[k] = e; return true; }); } if (tm.length) h += '<section class="card sec c5"><h2>🌿 ' + esc(t("tm.sap_toi")) + "</h2>" + taoMoBlock(tm) + '<div class="row"><button type="button" class="btn" data-act="tm-ics">📅 ' + esc(t("tm.them_lich")) + "</button></div></section>";
    return h;
  }
  // ----- Trang Di tích & nơi thờ tự: thẻ đầy đủ (loại, hiện trạng, địa chỉ, người an táng, tư liệu, chỉ đường) -----
  var dtf = { loai: "", k: "" };
  function isMo(s) { return /mo|lang/.test(s.loai); }
  function isSua(s) { return s.hien_trang === "can_tu_sua" || s.hien_trang === "xuong_cap"; }
  U.acts["dt-loc"] = function (el) { dtf.loai = el.getAttribute("data-v") || ""; dtf.k = ""; U.rerender(); };
  U.acts["dt-st"] = function (el) { var k = el.getAttribute("data-k") || ""; dtf.k = k === "all" || dtf.k === k ? "" : k; dtf.loai = ""; U.rerender(); var l = document.querySelector(".dtgrid"); if (l && l.scrollIntoView) l.scrollIntoView({ block: "nearest", behavior: "smooth" }); };
  P["di-tich"] = function () {
    var all = sitesAll().filter(visible), V = U.view(), adm = S.S.viewer.role === "admin", items = all.filter(function (s) { return (!dtf.loai || s.loai === dtf.loai) && (!dtf.k || (dtf.k === "mo" ? isMo(s) : isSua(s))); })
      .sort(function (a, b) { return LOAI.indexOf(a.loai) - LOAI.indexOf(b.loai) || (a.ten < b.ten ? -1 : 1); });
    var used = LOAI.filter(function (k) { return all.some(function (s) { return s.loai === k; }); });
    var pills = used.length > 1 ? '<div class="fpills" role="group" aria-label="' + esc(t("map.loc_loai")) + '">' + [""].concat(used).map(function (k) { return '<button type="button" class="fpill' + (dtf.loai === k ? " on" : "") + '" data-act="dt-loc" data-v="' + k + '" aria-pressed="' + (dtf.loai === k) + '">' + esc(k ? (ICON[k] || "") + " " + t("loai." + k) : t("kho.tat_ca")) + "</button>"; }).join("") + "</div>" : "";
    var tiles = U.sumTiles ? U.sumTiles([{ ico: "📍", n: all.length, label: t("dt.tong"), c: 4, act: "dt-st", k: "all", on: !dtf.k && !dtf.loai }, { ico: "🪦", n: all.filter(isMo).length, label: t("dt.so_mo"), c: 7, act: "dt-st", k: "mo", on: dtf.k === "mo" }, { ico: "⚠️", n: all.filter(isSua).length, label: t("dt.can_tu_sua"), c: 1, act: "dt-st", k: "sua", on: dtf.k === "sua" }]) : "";
    var html = "<h1>" + esc(t("dt.tieu_de")) + '</h1><p class="muted">' + esc(t("dt.mo_ta")) + "</p>" + tiles + (adm ? '<p><button type="button" class="btn primary" data-act="row-new" data-table="sites">+ ' + esc(t("dt.them")) + "</button></p>" : "") + '<div id="row-form"></div>' + pills +
      (items.length ? '<div class="dtgrid">' + items.map(function (s) {
        var ids = (s.nguoi_an_tang || []).filter(function (i) { return V.by[i] && V.by[i].level !== "hidden"; }), names = ids.slice(0, 3).map(function (i) { return U.link(i); }).join(", ");
        var kho = U.khoBlock ? U.khoBlock(null, s.id) : "";
        return '<article class="card dtc c' + (COL[s.loai] || 1) + '"><div class="dth"><span class="dti" aria-hidden="true">' + (ICON[s.loai] || "📍") + "</span><div><h2>" + esc(s.ten) + "</h2><p>" + U.badge(t("loai." + s.loai), "") + " " + htBadge(s) + (s.nam_xay ? ' <span class="muted">' + esc(t("dt.nam_xay")) + ": " + esc(s.nam_xay) + "</span>" : "") + "</p></div></div>" +
          (s.dia_chi ? '<p class="dta">📍 ' + esc(s.dia_chi) + "</p>" : '<p class="dta muted">📍 ' + esc(t("map.chua_vi_tri_ngan")) + "</p>") + (s.gioi_thieu ? "<p>" + esc(s.gioi_thieu) + "</p>" : "") +
          (ids.length ? '<p class="dtb">🪦 ' + esc(t("map.an_tang_o_day")) + " (" + ids.length + "): " + names + (ids.length > 3 ? " …" : "") + "</p>" : "") +
          '<div class="row"><button type="button" class="btn small primary" data-act="map-go" data-id="' + esc(s.id) + '">🗺️ ' + esc(t("dt.xem_ban_do")) + "</button>" + (ok(s) ? '<a class="btn small" rel="noopener noreferrer" target="_blank" href="' + esc(link.dir(s)) + '">🧭 ' + esc(t("map.chi_duong")) + "</a>" : "") + (canLoc(s) ? '<button type="button" class="btn small" data-act="loc-edit" data-id="' + esc(s.id) + '">✏️ ' + esc(t("map.sua_vi_tri")) + "</button>" : "") + (adm ? '<button type="button" class="btn small" data-act="row-edit" data-table="sites" data-id="' + esc(s.id) + '">' + esc(t("c.sua")) + "</button>" : "") + "</div>" + (st.loc === s.id ? locForm(s) : "") + (kho ? kho.replace("card sec c8", "dtkho") : "") + "</article>";
      }).join("") + "</div>" : '<div class="card"><p class="muted">' + esc(t("dt.chua_co")) + "</p></div>");
    return { title: t("dt.tieu_de"), html: html, after: function () { if (U.khoHydrate) setTimeout(U.khoHydrate, 200); } };
  };
  U.mapOverview = overview; U.taoMoBlock = taoMoBlock;
})(typeof window !== "undefined" ? window : globalThis);
