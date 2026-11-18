// Hình nền phong cảnh làng quê theo từng nhóm trang (SVG tự vẽ, màu theo giao diện sáng/tối)
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, cur = "";
  function hills(a, b, c) { // ba lớp đồi/núi
    return '<path class="s-far" d="M0 360 Q150 ' + a + ' 300 330 T620 340 T900 ' + (a + 20) + ' T1200 330 V600 H0Z"/>' +
      '<path class="s-mid" d="M0 430 Q200 ' + b + ' 420 420 T800 430 T1200 410 V600 H0Z"/>' +
      '<path class="s-near" d="M0 500 Q300 ' + c + ' 600 495 T1200 490 V600 H0Z"/>';
  }
  function paddy() { var o = ""; for (var i = 0; i < 7; i++) o += '<path class="s-line" d="M0 ' + (520 + i * 14) + ' Q300 ' + (508 + i * 14) + ' 600 ' + (520 + i * 14) + ' T1200 ' + (516 + i * 14) + '"/>'; return o; }
  function bamboo(x, h) { var o = ""; for (var i = 0; i < 4; i++) o += '<path class="s-ink" d="M' + (x + i * 9) + " 520 Q" + (x + i * 9 + 6 - i * 3) + " " + (520 - h / 2) + " " + (x + i * 9 + 14 - i * 4) + " " + (520 - h - i * 14) + '" fill="none" stroke-width="3"/><ellipse class="s-ink" cx="' + (x + i * 9 + 14 - i * 4) + '" cy="' + (520 - h - i * 14) + '" rx="14" ry="3" transform="rotate(-25 ' + (x + i * 9 + 14 - i * 4) + " " + (520 - h - i * 14) + ')"/>'; return o; }
  function dinh(x, y, k) { // mái đình cong
    var w = 220 * k, h = 70 * k;
    return '<g class="s-ink" transform="translate(' + x + " " + y + ')"><path d="M' + (-w / 2 - 28 * k) + " " + 0 + " Q" + (-w / 2) + " " + (10 * k) + " " + (-w / 4) + " " + (-h / 2) + " L" + (w / 4) + " " + (-h / 2) + " Q" + (w / 2) + " " + (10 * k) + " " + (w / 2 + 28 * k) + ' 0 Z"/>' +
      '<rect x="' + (-w / 2 + 14 * k) + '" y="0" width="' + (w - 28 * k) + '" height="' + (50 * k) + '"/><rect class="s-door" x="' + (-18 * k) + '" y="' + (14 * k) + '" width="' + (36 * k) + '" height="' + (36 * k) + '"/></g>';
  }
  function house(x, y, k) { return '<g class="s-ink" transform="translate(' + x + " " + y + ')"><path d="M' + (-70 * k) + " 0 L" + (-40 * k) + " " + (-34 * k) + " L" + (40 * k) + " " + (-34 * k) + " L" + (70 * k) + ' 0Z"/><rect x="' + (-56 * k) + '" y="0" width="' + (112 * k) + '" height="' + (36 * k) + '"/><rect class="s-door" x="' + (-12 * k) + '" y="' + (8 * k) + '" width="' + (24 * k) + '" height="' + (28 * k) + '"/></g>'; }
  function da(x, y, k) { // cây đa
    var o = '<g transform="translate(' + x + " " + y + ') scale(' + k + ')"><path class="s-ink" d="M-14 0 Q-10 -60 -22 -100 L22 -100 Q10 -60 14 0Z"/>';
    [[-60, -130, 70], [0, -165, 85], [62, -130, 70], [-30, -110, 60], [34, -108, 60]].forEach(function (c) { o += '<circle class="s-leaf" cx="' + c[0] + '" cy="' + c[1] + '" r="' + c[2] + '"/>'; });
    return o + "</g>";
  }
  function sun(x, y, r) { return '<circle class="s-sun" cx="' + x + '" cy="' + y + '" r="' + r + '"/>'; }
  function moon(x, y, r) { return '<circle class="s-sun" cx="' + x + '" cy="' + y + '" r="' + r + '"/><circle class="s-sun2" cx="' + x + '" cy="' + y + '" r="' + (r + 22) + '"/>'; }
  function storks(x, y) { return '<g class="s-ink" fill="none" stroke-width="3"><path d="M' + x + " " + y + " q14 -14 28 0 q14 -14 28 0\"/><path d=\"M" + (x + 70) + " " + (y - 26) + " q10 -10 20 0 q10 -10 20 0\"/></g>"; }
  function lotus(x) { return '<g transform="translate(' + x + ' 560)"><ellipse class="s-leaf" cx="0" cy="0" rx="34" ry="8"/><path class="s-lotus" d="M0 -4 Q-12 -22 0 -34 Q12 -22 0 -4Z"/><path class="s-lotus" d="M-4 -4 Q-24 -14 -20 -30 Q-4 -22 -4 -4Z"/><path class="s-lotus" d="M4 -4 Q24 -14 20 -30 Q4 -22 4 -4Z"/></g>'; }
  function gate(x, y) { return '<g class="s-ink" transform="translate(' + x + " " + y + ')"><rect x="-70" y="-80" width="16" height="80"/><rect x="54" y="-80" width="16" height="80"/><path d="M-96 -80 Q0 -112 96 -80 L84 -66 Q0 -92 -84 -66Z"/><rect x="-60" y="-100" width="120" height="10"/></g>'; }
  // Trống đồng Đông Sơn (đường nét đồng tâm + tia sáng) — họa tiết chìm, trang nhã
  function dong(x, y, r) {
    var o = '<g transform="translate(' + x + " " + y + ')" class="s-line">', i, k;
    for (i = 1; i <= 7; i++) o += '<circle r="' + (r * i / 7).toFixed(1) + '"' + (i % 2 ? ' stroke-dasharray="2 5"' : "") + "/>";
    o += '<path d="';
    for (k = 0; k < 14; k++) { var a = k * Math.PI / 7, a2 = a + Math.PI / 14; o += "M" + (Math.cos(a) * r * 0.16).toFixed(1) + " " + (Math.sin(a) * r * 0.16).toFixed(1) + " L" + (Math.cos(a2) * r * 0.42).toFixed(1) + " " + (Math.sin(a2) * r * 0.42).toFixed(1) + " L" + (Math.cos(a + Math.PI / 7) * r * 0.16).toFixed(1) + " " + (Math.sin(a + Math.PI / 7) * r * 0.16).toFixed(1); }
    return o + '"/><circle r="' + (r * 0.1).toFixed(1) + '" class="s-sun"/></g>';
  }
  function mist(k, dx, dy, dr) { return dong(dx, dy, dr) + hills(300 + k * 10, 385 + k * 8, 485 - k * 4); }
  var SC = {
    "trang-chu": function () { return mist(0, 1010, 170, 130); },
    "gia-pha": function () { return mist(1, 160, 190, 120); },
    lich: function () { return mist(2, 1000, 160, 110); },
    "tu-lieu": function () { return mist(3, 200, 180, 125); },
    "noi-chon": function () { return mist(0, 980, 170, 115); },
    "ung-ho": function () { return mist(1, 220, 170, 120); },
    "he-thong": function () { return mist(2, 600, 170, 105); }
  };
  U.scene = function (key) {
    var el = document.getElementById("scene"); if (!el) { el = document.createElement("div"); el.id = "scene"; el.setAttribute("aria-hidden", "true"); document.body.insertBefore(el, document.body.firstChild); }
    if (key === cur) return; cur = key;
    el.innerHTML = '<svg viewBox="0 0 1200 600" preserveAspectRatio="xMidYMax slice" focusable="false">' + (SC[key] || SC["trang-chu"])() + "</svg>"; el.setAttribute("data-scene", key);
  };
})(typeof window !== "undefined" ? window : globalThis);
