const test = require("node:test"), assert = require("node:assert");
const L = require("../src/lunar.js");

// Mùng 1 Tết (dương lịch) theo lịch Việt Nam. Lưu ý 2007 và 2030: Việt Nam (UTC+7) sớm hơn Trung Quốc (UTC+8) một ngày vì trăng non rơi gần nửa đêm
const TET = { 2007: [17, 2], 2008: [7, 2], 2009: [26, 1], 2010: [14, 2], 2011: [3, 2], 2012: [23, 1], 2013: [10, 2], 2014: [31, 1],
  2015: [19, 2], 2016: [8, 2], 2017: [28, 1], 2018: [16, 2], 2019: [5, 2], 2020: [25, 1], 2021: [12, 2], 2022: [1, 2], 2023: [22, 1],
  2024: [10, 2], 2025: [29, 1], 2026: [17, 2], 2027: [6, 2], 2028: [26, 1], 2029: [13, 2], 2030: [2, 2] };

test("Tết 2007–2030: âm -> dương và dương -> âm", () => {
  for (const y of Object.keys(TET)) {
    const s = L.lunarToSolar(1, 1, +y, false);
    assert.deepStrictEqual(s, [TET[y][0], TET[y][1], +y], "Tết " + y);
    const l = L.solarToLunar(TET[y][0], TET[y][1], +y);
    assert.deepStrictEqual([l.day, l.month, l.year, l.leap], [1, 1, +y, false], "ngược " + y);
  }
});
test("Giỗ Tổ Hùng Vương 10/3 âm", () => {
  assert.deepStrictEqual(L.lunarToSolar(10, 3, 2024, false), [18, 4, 2024]);
  assert.deepStrictEqual(L.lunarToSolar(10, 3, 2025, false), [7, 4, 2025]);
  assert.deepStrictEqual(L.lunarToSolar(10, 3, 2026, false), [26, 4, 2026]);
});
test("Rằm tháng 7 và Trung thu 2026", () => {
  assert.deepStrictEqual(L.lunarToSolar(15, 7, 2026, false), [27, 8, 2026]);
  assert.deepStrictEqual(L.lunarToSolar(15, 8, 2026, false), [25, 9, 2026]);
});
test("Tháng nhuận: 2023 nhuận tháng 2, 2025 nhuận tháng 6", () => {
  assert.deepStrictEqual(L.lunarToSolar(1, 2, 2023, true), [22, 3, 2023]);
  assert.deepStrictEqual(L.lunarToSolar(1, 6, 2025, true), [25, 7, 2025]);
  assert.strictEqual(L.lunarToSolar(1, 3, 2023, true), null);
  const l = L.solarToLunar(25, 7, 2025);
  assert.deepStrictEqual([l.day, l.month, l.year, l.leap], [1, 6, 2025, true]);
});
test("Vòng đổi qua lại 1 ngày mỗi 7 ngày từ 2000 đến 2035 không lệch", () => {
  let n = 0;
  for (let jd = L.jdFromDate(1, 1, 2000); jd < L.jdFromDate(1, 1, 2035); jd += 7) {
    const [d, m, y] = L.jdToDate(jd), l = L.solarToLunar(d, m, y), back = L.lunarToSolar(l.day, l.month, l.year, l.leap);
    assert.deepStrictEqual(back, [d, m, y], `${d}/${m}/${y}`); n++;
  }
  assert.ok(n > 1000);
});
test("Giỗ ngày 30 gặp tháng thiếu", () => {
  // tìm một tháng âm thiếu (29 ngày) trong 2026
  let found = null;
  for (let m = 1; m <= 12 && !found; m++) if (L.monthLength(m, 2026, false) === 29) found = m;
  assert.ok(found, "phải có tháng thiếu");
  const a = L.anniversary(30, found, 2026, { rule: "cuoi" });
  assert.strictEqual(a.lunar.day, 29); assert.ok(a.adjusted);
  const b = L.anniversary(30, found, 2026, { rule: "mung1" });
  assert.strictEqual(b.lunar.day, 1); assert.ok(b.adjusted);
  const full = []; for (let m = 1; m <= 12; m++) if (L.monthLength(m, 2026, false) === 30) full.push(m);
  const c = L.anniversary(30, full[0], 2026, {}); assert.ok(!c.adjusted && c.lunar.day === 30);
});
test("Giỗ tháng nhuận: năm không có nhuận cùng tháng dùng tháng thường", () => {
  const a = L.anniversary(10, 6, 2025, { leap: true }); assert.ok(a.lunar.leap);
  const b = L.anniversary(10, 6, 2026, { leap: true }); assert.ok(!b.lunar.leap);
});
test("Thanh minh gần 4–5/4", () => {
  const t = L.thanhMinh(2026); assert.ok(t[0] >= 4 && t[0] <= 6);
});
test("Can chi", () => { assert.strictEqual(L.canChiYear(2026), "Bính Ngọ"); assert.strictEqual(L.canChiYear(2024), "Giáp Thìn"); });
