const test = require("node:test"), assert = require("node:assert");
["lunar", "checks", "privacy", "gedcom", "data", "io", "publish"].forEach(m => require("../src/" + m + ".js"));
const GP = globalThis.GP, mk = (o) => { const s = JSON.parse(JSON.stringify(GP.sample)); s.media = []; return GP.publish.sanitize(s, o); };

test("bản công khai: không lọt hồ sơ riêng tư, đã ẩn, tài khoản, ủng hộ, nhật ký", () => {
  const d = mk({ nang_gia_toc: true }), txt = JSON.stringify(d);
  assert.ok(!d.persons.some(p => p.id === "p43"), "hồ sơ đã ẩn bị loại");
  const p24 = d.persons.find(p => p.id === "p24"); assert.ok(!p24 || !p24.ten, "hồ sơ riêng tư chỉ còn khung ẩn");
  assert.deepStrictEqual([d.profiles, d.donations, d.edit_history], [[], [], []]);
  assert.ok(!/u_admin|Người ủng hộ|ung_ho_thong_tin/.test(txt));
});
test("khách KHÔNG thấy người còn sống, trẻ em, hay người chưa rõ tình trạng — kể cả tên", () => {
  const d = mk({ nang_gia_toc: true });
  assert.ok(d.persons.length > 0);
  d.persons.forEach(p => assert.strictEqual(p.con_song, false, p.id + " còn sống mà lọt vào bản công khai"));
  assert.ok(!d.persons.some(p => p.id === "p40" || p.id === "p41"), "trẻ em không lọt");
  const ids = new Set(d.persons.map(p => p.id));
  d.persons.forEach(p => { if (p.cha_id) assert.ok(ids.has(p.cha_id), "cha_id trỏ tới người bị ẩn"); if (p.me_id) assert.ok(ids.has(p.me_id), "me_id trỏ tới người bị ẩn"); });
  d.spouses.forEach(s => { assert.ok(ids.has(s.person_id) && (!s.spouse_person_id || ids.has(s.spouse_person_id))); });
});
test("tùy chọn nâng mức Gia tộc: mở người đã mất, không đụng người sống", () => {
  const a = mk({ nang_gia_toc: false }), b = mk({ nang_gia_toc: true });
  const named = d => d.persons.filter(p => p.ten).length;
  assert.ok(named(b) > named(a), "bật tùy chọn thấy nhiều người hơn");
  assert.ok(b.sites.length >= a.sites.length);
  const living = d => d.persons.filter(p => p.ten && p.con_song !== false && p.sinh).length; assert.strictEqual(living(b), living(a) + (b.persons.find(p => p.id === "p41") && a.persons.find(p => p.id === "p41") ? 0 : 0));
});
test("vợ/chồng chỉ nối giữa hai hồ sơ nhìn thấy được; chạy lại vẫn ổn định (idempotent)", () => {
  const d = mk({ nang_gia_toc: true }), vis = {}; d.persons.forEach(p => vis[p.id] = p.ten ? 1 : 0);
  d.spouses.forEach(s => { assert.ok(vis[s.person_id], "chủ"); assert.ok(!s.spouse_person_id || vis[s.spouse_person_id], "vợ/chồng"); });
  const again = GP.publish.sanitize(Object.assign({}, d, { settings: d.settings }), {});
  assert.deepStrictEqual(again.persons.map(p => p.id + !!p.ten + !!p.sinh), d.persons.map(p => p.id + !!p.ten + !!p.sinh));
});
test("khách chỉ thấy họ tên + năm sinh/mất + quan hệ; người mới mất bị ẩn trừ khi được bật", () => {
  const s = JSON.parse(JSON.stringify(GP.sample)); s.media = []; s.settings = Object.assign({}, s.settings, { nam_hien_tai: 2026 });
  const base = Object.assign({}, s.persons.find(p => p.id === "p04"));
  const add = (id, mat, extra) => s.persons.push(Object.assign({}, base, { id, ten: "T" + id, con_song: false, mat: { nam: mat, thang: 3, ngay: 4 }, sinh: { nam: mat - 70, thang: 1, ngay: 2 }, muc_hien_thi: "cong_khai", nghe: "bí mật nghề", noi_sinh: "bí mật nơi", tieu_su: "bí mật tiểu sử", noi_an_tang: "bí mật mộ", gio_ngay_am: 5, cha_id: null, me_id: null }, extra || {}));
  add("tx_cu", 1950); add("tx_moi", 2020); add("tx_bat", 2020, { hien_khach: true });
  const d = GP.publish.sanitize(s, {}), by = id => d.persons.find(p => p.id === id);
  assert.ok(by("tx_cu"), "mất lâu: hiện"); assert.ok(!by("tx_moi"), "mất dưới 10 năm: ẩn"); assert.ok(by("tx_bat"), "được bật riêng: hiện");
  const c = by("tx_cu"); assert.deepStrictEqual([c.sinh.nam, c.mat.nam, c.ten], [1880, 1950, "Ttx_cu"]);
  const txt = JSON.stringify(d); assert.ok(!/bí mật/.test(txt), "không lộ nghề/nơi sinh/tiểu sử/nơi an táng"); assert.ok(!c.sinh.thang && !c.mat.ngay && c.gio_ngay_am === undefined);
});
