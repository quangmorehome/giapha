const test = require("node:test"), assert = require("node:assert");
const GP = (require("../src/lunar.js"), require("../src/checks.js"), require("../src/privacy.js"), require("../src/io.js"), globalThis.GP);
const S = require("../src/data.js");
const F = ["ho", "ten_dem", "ten", "ten_thuong_goi", "gioi_tinh", "sinh", "con_song", "mat", "gio_ngay_am", "gio_thang_am", "gio_nhuan", "the_thu", "thu_tu_con", "chi", "cha_id", "me_id", "me_ten", "tieu_su", "nguon", "muc_chac_chan", "muc_hien_thi", "da_dong_y_tre_em", "da_an", "chung_cu"];
const cl = (v) => v === "" || v === undefined || v === false ? null : v;
const nm = (p) => { const o = {}; F.forEach(f => { let v = cl(p[f]); if (v && typeof v === "object") v = JSON.stringify(Object.keys(v).sort().map(k => [k, v[k]])); o[f] = v; }); return o; };

test("CSV khứ hồi khớp 100% và chặn công thức", () => {
  const ps = JSON.parse(JSON.stringify(S.persons)); ps[0].tieu_su = '=HYPERLINK("x"),dòng\nhai "ngoặc"'; ps[1].nguon = "+84 123";
  const csv = GP.io.toCsv(ps, S.spouses);
  assert.ok(csv.includes("'=HYPERLINK") && csv.includes("'+84"));
  const b = GP.io.fromCsv(csv); assert.strictEqual(b.persons.length, ps.length);
  ps.forEach((p, i) => assert.deepStrictEqual(nm(b.persons[i]), nm(p), p.id));
  const key = (s) => [s.person_id, s.spouse_person_id, s.thu_tu, s.tinh_trang, s.ten].join("|");
  assert.deepStrictEqual(b.spouses.map(key).sort(), S.spouses.map(key).sort());
});
test("CSV sai số ô bị từ chối với số dòng", () => {
  assert.throws(() => GP.io.fromCsv("id,ho\r\na,b,c\r\n"), /csv_so_o_sai:2/);
});
test("JSON: sao lưu Admin đầy đủ, Khách chỉ phần công khai, rồi nhập lại", () => {
  const st = JSON.parse(JSON.stringify({ persons: S.persons, spouses: S.spouses, events: S.events, sites: S.sites, articles: S.articles, donations: S.donations, profiles: S.profiles, settings: S.settings, edit_history: [], media: [] }));
  const adm = JSON.parse(GP.io.backupJson(st, GP.privacy.makeContext({ role: "admin" }, st.persons, st.spouses, 2026)));
  assert.strictEqual(adm.persons.length, st.persons.length); assert.ok(adm.donations && adm.profiles && adm.settings);
  const back = GP.io.readJson(JSON.stringify(adm)); assert.strictEqual(back.persons.length, st.persons.length);
  const kh = JSON.parse(GP.io.backupJson(st, GP.privacy.makeContext({ role: "khach" }, st.persons, st.spouses, 2026)));
  assert.ok(!kh.donations && !kh.profiles && !kh.settings);
  const txt = JSON.stringify(kh); assert.ok(!txt.includes("Mẫu Hai Bốn") && !txt.includes("Hồ sơ riêng tư (mẫu)"));
  assert.ok(!kh.persons.some(p => p.da_an));
  const song = kh.persons.find(p => p.id === "p40"); assert.ok(song && !song.sinh && !song.tieu_su, "người sống chỉ cơ bản");
  assert.throws(() => GP.io.readJson(JSON.stringify({ phien_ban: 99, persons: [] })), /json_phien_ban_moi/);
});
test("Nâng cấp bản thử v1 -> v2", () => {
  const v1 = [{ id: "p1", ho: "Tống", tenDem: "Văn", ten: "Thử Một", gioiTinh: "nam", sinh: { nam: 1820, khoang: true }, mat: { nam: 1890, khoang: true }, gio: { ngay: 12, thang: 3 }, doi: 1, chi: "Chi mẫu A", chaId: null, meId: null, vc: [{ id: "p2", thuTu: 1, tinhTrang: "dang_o" }], conSong: false, muc: "cong_khai", tieuSu: "x", nguon: "n", chac: "chua_chac" }];
  const r = GP.io.readJson(JSON.stringify(v1)); const p = r.persons[0];
  assert.strictEqual(p.schema, 2); assert.strictEqual(p.ten, "Một"); assert.strictEqual(p.ten_dem, "Văn Thử"); assert.deepStrictEqual(p.sinh, { nam: 1820, xap_xi: true });
  assert.strictEqual(p.gio_ngay_am, 12); assert.strictEqual(p.muc_hien_thi, "cong_khai"); assert.strictEqual(r.spouses.length, 1); assert.ok(r.warnings[0].startsWith("da_nang_cap"));
});
test("Nhắc ngày: giỗ đổi âm sang dương từng năm; giỗ đầu; tháng nhuận; sinh nhật; lễ", () => {
  const list = S.persons.map(p => Object.assign({ level: "full" }, p));
  const up = GP.io.upcoming(list, [1, 1, 2026], [31, 12, 2026]);
  const g = up.filter(x => x.loai === "gio" && x.id === "p01"); assert.strictEqual(g.length, 1);
  assert.deepStrictEqual(g[0].ngay, GP.lunar.lunarToSolar(12, 3, 2026, false));
  assert.ok(up.some(x => x.loai === "le" && x.khoa === "tet1" && x.ngay[0] === 17 && x.ngay[1] === 2));
  assert.ok(up.some(x => x.loai === "le" && x.khoa === "gio_to" && x.ngay[0] === 26 && x.ngay[1] === 4));
  const up25 = GP.io.upcoming(list, [1, 1, 2025], [31, 12, 2025]);
  const nh = up25.filter(x => x.id === "p22"); assert.ok(nh.length === 1 && nh[0].lunar.leap, "giỗ p22 năm 2025 rơi vào tháng 6 nhuận");
  const nh26 = up.filter(x => x.id === "p22"); assert.ok(nh26.length === 1 && !nh26[0].lunar.leap);
  assert.ok(up.some(x => x.loai === "sinh" && x.id === "p23" && x.ngay[0] === 20 && x.ngay[1] === 5));
  const first = GP.io.upcoming([Object.assign({ level: "full" }, S.persons.find(p => p.id === "p22"), { mat: { nam: 2025 } })], [1, 1, 2025], [31, 12, 2026]);
  assert.ok(first.filter(x => x.loai === "gio").length > 0 && first.filter(x => x.loai === "gio").every(x => x.nam > 2025), "không có giỗ trong năm âm lịch mất");
});
test("ICS hợp lệ, có UID ổn định", () => {
  const list = S.persons.slice(0, 12).map(p => Object.assign({ level: "full" }, p));
  const ics = GP.io.toIcs(GP.io.upcoming(list, [1, 1, 2026], [31, 12, 2026]), i => "Giỗ " + i.id, "Gia phả");
  assert.ok(ics.startsWith("BEGIN:VCALENDAR") && ics.trim().endsWith("END:VCALENDAR")); assert.ok(/UID:gio-p01-20\d{6}@giapha/.test(ics));
  assert.ok(ics.split("\r\n").every(l => Buffer.byteLength(l) <= 80));
});
test("Thống kê chỉ tính hồ sơ được phép thấy", () => {
  const ctx = GP.privacy.makeContext({ role: "khach" }, S.persons, S.spouses, 2026);
  const st = GP.io.stats(GP.privacy.visibleList(S.persons, ctx), S.spouses, 2026);
  assert.ok(st.an > 0 && st.tong < S.persons.length - 1);
  const adm = GP.io.stats(GP.privacy.visibleList(S.persons, GP.privacy.makeContext({ role: "admin" }, S.persons, S.spouses, 2026)), S.spouses, 2026);
  assert.strictEqual(adm.tong, S.persons.length); assert.ok(adm.nhieuVoChong >= 2 && adm.tuoiTho.n > 10);
});
