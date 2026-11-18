/* Âm lịch Việt Nam (múi giờ UTC+7).
 * Phương pháp thiên văn: Hồ Ngọc Đức, https://www.informatik.uni-leipzig.de/~duc/amlich/
 * (công thức trăng non của Jean Meeus). Viết lại độc lập cho dự án này; ghi công tác giả (clarify Q-11).
 * Chú thích bằng tiếng Việt, tên hàm bằng tiếng Anh không dấu. */
(function (root) {
  "use strict";
  var TZ = 7, PI = Math.PI, DR = PI / 180, F = Math.floor;
  var EPOCH = 2415021.076998695, SYN = 29.530588853;

  function jdFromDate(dd, mm, yy) {
    var a = F((14 - mm) / 12), y = yy + 4800 - a, m = mm + 12 * a - 3;
    var jd = dd + F((153 * m + 2) / 5) + 365 * y + F(y / 4) - F(y / 100) + F(y / 400) - 32045;
    if (jd < 2299161) jd = dd + F((153 * m + 2) / 5) + 365 * y + F(y / 4) - 32083;
    return jd;
  }
  function jdToDate(jd) {
    var a, b, c;
    if (jd > 2299160) { a = jd + 32044; b = F((4 * a + 3) / 146097); c = a - F((b * 146097) / 4); }
    else { b = 0; c = jd + 32082; }
    var d = F((4 * c + 3) / 1461), e = c - F((1461 * d) / 4), m = F((5 * e + 2) / 153);
    return [e - F((153 * m + 2) / 5) + 1, m + 3 - 12 * F(m / 10), b * 100 + d - 4800 + F(m / 10)];
  }
  function newMoon(k) {
    var T = k / 1236.85, T2 = T * T, T3 = T2 * T;
    var jd1 = 2415020.75933 + 29.53058868 * k + 0.0001178 * T2 - 0.000000155 * T3;
    jd1 += 0.00033 * Math.sin((166.56 + 132.87 * T - 0.009173 * T2) * DR);
    var M = 359.2242 + 29.10535608 * k - 0.0000333 * T2 - 0.00000347 * T3;
    var Mpr = 306.0253 + 385.81691806 * k + 0.0107306 * T2 + 0.00001236 * T3;
    var Fx = 21.2964 + 390.67050646 * k - 0.0016528 * T2 - 0.00000239 * T3;
    var C1 = (0.1734 - 0.000393 * T) * Math.sin(M * DR) + 0.0021 * Math.sin(2 * DR * M)
      - 0.4068 * Math.sin(Mpr * DR) + 0.0161 * Math.sin(DR * 2 * Mpr)
      - 0.0004 * Math.sin(DR * 3 * Mpr) + 0.0104 * Math.sin(DR * 2 * Fx)
      - 0.0051 * Math.sin(DR * (M + Mpr)) - 0.0074 * Math.sin(DR * (M - Mpr))
      + 0.0004 * Math.sin(DR * (2 * Fx + M)) - 0.0004 * Math.sin(DR * (2 * Fx - M))
      - 0.0006 * Math.sin(DR * (2 * Fx + Mpr)) + 0.0010 * Math.sin(DR * (2 * Fx - Mpr))
      + 0.0005 * Math.sin(DR * (2 * Mpr + M));
    var dt = T < -11 ? 0.001 + 0.000839 * T + 0.0002261 * T2 - 0.00000845 * T3 - 0.000000081 * T * T3
      : -0.000278 + 0.000265 * T + 0.000262 * T2;
    return jd1 + C1 - dt;
  }
  function sunLongitude(jdn) {
    var T = (jdn - 2451545.0) / 36525, T2 = T * T;
    var M = 357.5291 + 35999.0503 * T - 0.0001559 * T2 - 0.00000048 * T * T2;
    var L0 = 280.46645 + 36000.76983 * T + 0.0003032 * T2;
    var DL = (1.9146 - 0.004817 * T - 0.000014 * T2) * Math.sin(DR * M);
    DL += (0.019993 - 0.000101 * T) * Math.sin(DR * 2 * M) + 0.00029 * Math.sin(DR * 3 * M);
    var L = L0 + DL - 0.00569 - 0.00478 * Math.sin((125.04 - 1934.136 * T) * DR);
    L = L * DR; return L - PI * 2 * F(L / (PI * 2));
  }
  function sunSector(day) { return F((sunLongitude(day - 0.5 - TZ / 24) / PI) * 6); } // 0..11, mỗi phần 30 độ
  function newMoonDay(k) { return F(newMoon(k) + 0.5 + TZ / 24); }
  function month11(yy) {
    var off = jdFromDate(31, 12, yy) - 2415021, k = F(off / SYN), nm = newMoonDay(k);
    if (sunSector(nm) >= 9) nm = newMoonDay(k - 1);
    return nm;
  }
  function leapOffset(a11) {
    var k = F((a11 - EPOCH) / SYN + 0.5), last, i = 1, arc = sunSector(newMoonDay(k + i));
    do { last = arc; i++; arc = sunSector(newMoonDay(k + i)); } while (arc !== last && i < 14);
    return i - 1;
  }
  /** Dương -> âm. Trả {day, month, year, leap} */
  function solarToLunar(dd, mm, yy) {
    var dn = jdFromDate(dd, mm, yy), k = F((dn - EPOCH) / SYN), ms = newMoonDay(k + 1);
    if (ms > dn) ms = newMoonDay(k);
    var a11 = month11(yy), b11 = a11, ly;
    if (a11 >= ms) { ly = yy; a11 = month11(yy - 1); } else { ly = yy + 1; b11 = month11(yy + 1); }
    var ld = dn - ms + 1, diff = F((ms - a11) / 29), leap = false, lm = diff + 11;
    if (b11 - a11 > 365) {
      var lo = leapOffset(a11);
      if (diff >= lo) { lm = diff + 10; if (diff === lo) leap = true; }
    }
    if (lm > 12) lm -= 12;
    if (lm >= 11 && diff < 4) ly -= 1;
    return { day: ld, month: lm, year: ly, leap: leap };
  }
  /** Âm -> dương. Trả [ngày, tháng, năm] hoặc null nếu không tồn tại (vd tháng nhuận không có). */
  function lunarToSolar(ld, lm, ly, leap) {
    var a11, b11;
    if (lm < 11) { a11 = month11(ly - 1); b11 = month11(ly); } else { a11 = month11(ly); b11 = month11(ly + 1); }
    var k = F(0.5 + (a11 - EPOCH) / SYN), off = lm - 11;
    if (off < 0) off += 12;
    if (b11 - a11 > 365) {
      var lo = leapOffset(a11), lmo = lo - 2;
      if (lmo < 0) lmo += 12;
      if (leap && lm !== lmo) return null;
      if (leap || off >= lo) off += 1;
    } else if (leap) return null;
    return jdToDate(newMoonDay(k + off) + ld - 1);
  }
  /** Ngày âm của n ngày trước một ngày âm đã cho (qua tháng/năm đúng độ dài tháng, có nhuận) → {day,month,year,leap} */
  function lunarBefore(ld, lm, ly, leap, n) {
    var s = lunarToSolar(ld, lm, ly, !!leap); if (!s) return null;
    var d = jdToDate(jdFromDate(s[0], s[1], s[2]) - (n || 0)); return solarToLunar(d[0], d[1], d[2]);
  }
  function same(a, b) { return a && b && a[0] === b[0] && a[1] === b[1] && a[2] === b[2]; }
  /** Số ngày của một tháng âm (29 hoặc 30), hoặc 0 nếu tháng không tồn tại */
  function monthLength(lm, ly, leap) {
    var d1 = lunarToSolar(1, lm, ly, leap);
    if (!d1) return 0;
    var d30 = lunarToSolar(30, lm, ly, leap);
    if (!d30) return 29;
    var back = solarToLunar(d30[0], d30[1], d30[2]);
    return back.day === 30 && back.month === lm && back.year === ly && back.leap === !!leap ? 30 : 29;
  }
  /** Ngày giỗ (âm) của một năm âm -> ngày dương.
   * opts.rule: "cuoi" (tháng thiếu thì cúng ngày cuối tháng = 29) | "mung1" (mùng 1 tháng sau)
   * opts.leap: người mất ở tháng nhuận; năm không có nhuận cùng tháng thì dùng tháng thường. */
  function anniversary(ld, lm, ly, opts) {
    opts = opts || {};
    var leap = !!opts.leap;
    if (leap && monthLength(lm, ly, true) === 0) leap = false;
    var len = monthLength(lm, ly, leap), note = "";
    if (len === 0) return null;
    var day = ld;
    if (ld > len) {
      if (opts.rule === "mung1") {
        var nm = lm === 12 ? 1 : lm + 1, ny = lm === 12 ? ly + 1 : ly;
        var s = lunarToSolar(1, nm, ny, false);
        return { solar: s, lunar: { day: 1, month: nm, year: ny, leap: false }, adjusted: true };
      }
      day = len; note = "thieu";
    }
    return { solar: lunarToSolar(day, lm, ly, leap), lunar: { day: day, month: lm, year: ly, leap: leap }, adjusted: !!note };
  }
  /** Tiết Thanh minh (kinh độ mặt trời 15 độ): ngày dương trong năm yy */
  function thanhMinh(yy) {
    for (var d = 1; d <= 30; d++) { // tìm ngày đầu tiên của tháng 4 mà sector chuyển từ 0 -> 1
      var jd = jdFromDate(d, 4, yy);
      if (F((sunLongitude(jd - 0.5 - TZ / 24) / PI) * 12) === 1 && F((sunLongitude(jd - 1.5 - TZ / 24) / PI) * 12) === 0) return [d, 4, yy];
    }
    return null;
  }
  /** Các ngày lễ âm lịch cố định trong phong tục Việt Nam: [ngày, tháng, khoá chữ] */
  var LE_AM = [
    [1, 1, "tet1"], [2, 1, "tet2"], [3, 1, "tet3"], [15, 1, "ram_gieng"], [3, 3, "han_thuc"], [10, 3, "gio_to"],
    [5, 5, "doan_ngo"], [15, 4, "phat_dan"], [15, 7, "vu_lan"], [15, 8, "trung_thu"], [23, 12, "ong_tao"]
  ];
  function holidayKey(l, solarYear) {
    // Giao thừa: ngày cuối tháng Chạp
    if (l.month === 12 && !l.leap && l.day === monthLength(12, l.year, false)) return "giao_thua";
    if (l.leap) return null;
    for (var i = 0; i < LE_AM.length; i++) if (LE_AM[i][0] === l.day && LE_AM[i][1] === l.month) return LE_AM[i][2];
    if (l.day === 1) return "mung1";
    if (l.day === 15) return "ram";
    return null;
  }
  var CAN = ["Canh", "Tân", "Nhâm", "Quý", "Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ"];
  var CHI = ["Thân", "Dậu", "Tuất", "Hợi", "Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi"];
  var CAN2 = ["Giáp", "Ất", "Bính", "Đinh", "Mậu", "Kỷ", "Canh", "Tân", "Nhâm", "Quý"], CHI2 = ["Tý", "Sửu", "Dần", "Mão", "Thìn", "Tỵ", "Ngọ", "Mùi", "Thân", "Dậu", "Tuất", "Hợi"];
  function canChiMonth(l) { return CAN2[(l.year * 12 + l.month + 3) % 10] + " " + CHI2[(l.month + 1) % 12]; }
  function canChiDay(d, m, y) { var jd = jdFromDate(d, m, y); return CAN2[(jd + 9) % 10] + " " + CHI2[(jd + 1) % 12]; }
  function canChiYear(y) { return CAN[y % 10] + " " + CHI[y % 12]; }

  root.GP = root.GP || {};
  root.GP.lunar = {
    TZ: TZ, jdFromDate: jdFromDate, jdToDate: jdToDate, solarToLunar: solarToLunar, lunarToSolar: lunarToSolar, lunarBefore: lunarBefore,
    monthLength: monthLength, anniversary: anniversary, thanhMinh: thanhMinh, holidayKey: holidayKey, canChiYear: canChiYear, canChiMonth: canChiMonth, canChiDay: canChiDay
  };
  if (typeof module !== "undefined") module.exports = root.GP.lunar;
})(typeof window !== "undefined" ? window : globalThis);
