const test = require("node:test"), assert = require("node:assert");
const K = require("../src/kinship.js");
function P(id, gt, cha, me, tt, extra) { return Object.assign({ id, gioi_tinh: gt, cha_id: cha || null, me_id: me || null, thu_tu_con: tt == null ? null : tt }, extra || {}); }
// Họ nội: Cụ G có hai con trai: Ong (1), O (2). O có Bac(1) F(2) Chu(3) Co(4). Họ ngoại: ON & BN có ChiMe(1) M(2) Cau(3) Di(4)
const persons = [
  P("G", "nam"), P("Ong", "nam", "G", null, 1), P("O", "nam", "G", null, 2), P("Bn", "nu"),
  P("Bac", "nam", "O", "Bn", 1), P("F", "nam", "O", "Bn", 2), P("Chu", "nam", "O", "Bn", 3), P("Co", "nu", "O", "Bn", 4),
  P("ON", "nam"), P("BN", "nu"),
  P("ChiMe", "nu", "ON", "BN", 1), P("M", "nu", "ON", "BN", 2), P("Cau", "nam", "ON", "BN", 3), P("Di", "nu", "ON", "BN", 4),
  P("X", "nam", "F", "M", 1), P("Y", "nam", "F", "M", 2), P("W2", "nu"), P("Z", "nam", "F", "W2", 3),
  P("AnhHo", "nam", "Bac", null, 1, { sinh: { nam: 2005 } }), P("ConChu", "nu", "Chu", null, 1, { sinh: { nam: 1990 } }),
  P("Con", "nu", "X", null, 1), P("Chau", "nu", "Con", null, 1), P("La", "nam")
];
const spouses = [{ person_id: "F", spouse_person_id: "M" }];
const k = K.create(persons, spouses), kd = K.create(persons, spouses, { quyUoc: "di" });
const ab = (a, b) => k.relate(a, b).ab.term, ba = (a, b) => k.relate(a, b).ba.term;

test("Trực hệ vế trên", () => {
  assert.strictEqual(ab("X", "F"), "Cha"); assert.strictEqual(ab("X", "M"), "Mẹ");
  assert.strictEqual(ab("X", "O"), "Ông nội"); assert.strictEqual(ab("X", "Bn"), "Bà nội");
  assert.strictEqual(ab("X", "ON"), "Ông ngoại"); assert.strictEqual(ab("X", "BN"), "Bà ngoại");
  assert.strictEqual(ab("X", "G"), "Cụ ông");
  assert.strictEqual(ab("Chau", "G").startsWith("Kỵ"), false); // Chau -> Con -> X -> F -> O -> G = 5 đời: Sơ
  assert.ok(ab("Chau", "G").startsWith("Sơ"));
});
test("Trực hệ vế dưới, hai chiều", () => {
  assert.strictEqual(ba("X", "F"), "Con trai"); assert.strictEqual(ba("X", "M"), "Con trai");
  assert.strictEqual(ba("X", "O"), "Cháu nội"); assert.strictEqual(ba("X", "ON"), "Cháu ngoại");
  assert.strictEqual(ba("X", "G"), "Chắt");
});
test("Bác, chú, cô, cậu, dì theo thứ tự của cha mẹ", () => {
  assert.strictEqual(ab("X", "Bac"), "Bác"); assert.strictEqual(ab("X", "Chu"), "Chú"); assert.strictEqual(ab("X", "Co"), "Cô");
  assert.strictEqual(ab("X", "Cau"), "Cậu"); assert.strictEqual(ab("X", "Di"), "Dì");
  assert.strictEqual(ab("X", "ChiMe"), "Bác"); assert.strictEqual(kd.relate("X", "ChiMe").ab.term, "Dì");
  assert.strictEqual(ba("X", "Bac"), "Cháu");
});
test("Anh chị em ruột và cùng cha khác mẹ", () => {
  assert.strictEqual(ab("X", "Y"), "Em trai"); assert.strictEqual(ab("Y", "X"), "Anh");
  const r = k.relate("X", "Z"); assert.strictEqual(r.ab.term, "Em trai"); assert.ok(r.ab.notes.includes("note.cung_cha_khac_me"));
});
test("Anh em họ xếp theo nhánh, không theo tuổi (D-07)", () => {
  assert.strictEqual(ab("X", "AnhHo"), "Anh họ"); assert.strictEqual(ba("X", "AnhHo"), "Em họ");
  // ConChu sinh 1990 (lớn tuổi hơn X nếu X sinh sau) nhưng nhánh Chú nhỏ hơn nhánh Cha => X là anh họ
  assert.strictEqual(ab("X", "ConChu"), "Em họ"); assert.strictEqual(ba("X", "ConChu"), "Anh họ");
});
test("Con anh họ gọi, bác họ", () => {
  assert.strictEqual(ba("Con", "AnhHo"), "Cháu họ"); assert.strictEqual(ab("Con", "AnhHo"), "Bác họ");
  assert.strictEqual(ab("Con", "ConChu"), "Chú họ".replace("Chú", "Cô")); // ConChu là nữ, nhánh nhỏ hơn: Cô họ
});
test("Anh em của ông", () => {
  assert.strictEqual(ab("X", "Ong"), "Ông bác"); // Ong thu_tu 1 < O thu_tu 2
});
test("Thiếu thứ tự con: nói rõ và gợi ý, không đoán", () => {
  const ps = persons.map(p => p.id === "Bac" ? Object.assign({}, p, { thu_tu_con: null }) : p);
  const r = K.create(ps, spouses).relate("X", "Bac");
  assert.strictEqual(r.ab.term, "Bác/Chú"); assert.ok(r.ab.hints.some(h => h.code === "thieu_thu_tu"));
});
test("Vợ chồng, chính mình, không quan hệ", () => {
  assert.strictEqual(ab("F", "M"), "Vợ"); assert.strictEqual(ba("F", "M"), "Chồng");
  assert.strictEqual(k.relate("X", "X").kind, "self");
  const n = k.relate("X", "La"); assert.strictEqual(n.kind, "none"); assert.ok(n.hints.length);
});
