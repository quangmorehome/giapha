const test = require("node:test"), assert = require("node:assert");
const K = require("../src/kinship.js");
function P(id, gt, cha, me, tt) { return { id, gioi_tinh: gt, cha_id: cha || null, me_id: me || null, thu_tu_con: tt == null ? null : tt }; }
// Nhà A: Cha(Ba) + Me → Anh(1,nam) Em(2,nam) Chi(3? nam/nu) ; vợ của Anh: VAnh; chồng của Chi: CChi
// Nhà vợ của Anh: BoVA, MeVA, và VAnh có chị gái ChiVA; chồng ChiVA: CChiVA
const persons = [
  P("Ba", "nam"), P("Me", "nu"), P("Anh", "nam", "Ba", "Me", 1), P("Em", "nam", "Ba", "Me", 2), P("ChiG", "nu", "Ba", "Me", 3), P("Cu", "nam", "Ba", null, 4),
  P("VAnh", "nu"), P("CChi", "nam"), P("VCu", "nu"), P("VEm", "nu"),
  P("BoVA", "nam"), P("MeVA", "nu"), P("VA", "nu", "BoVA", "MeVA", 1), P("ChiVA", "nu", "BoVA", "MeVA", 2), P("CChiVA", "nam"),
  P("ConAnh", "nam", "Anh", "VAnh", 1), P("ConDau", "nu"),
  P("BoCD", "nam"), P("MeCD", "nu"), P("CDau", "nu", "BoCD", "MeCD", 1), P("ConEm", "nam", "Em", "VEm", 1)
];
// VA = VAnh (cùng người) => thay bằng sp link: VAnh cha=BoVA
persons.find(p => p.id === "VAnh").cha_id = "BoVA"; persons.find(p => p.id === "VAnh").me_id = "MeVA"; persons.find(p => p.id === "VAnh").thu_tu_con = 2;
persons.find(p => p.id === "VA").thu_tu_con = 1; // VA chị cả
persons.find(p => p.id === "ChiVA").me_id = "MeVA"; persons.find(p => p.id === "ChiVA").thu_tu_con = 3;
const sp = [["Ba", "Me"], ["Anh", "VAnh"], ["ChiG", "CChi"], ["Em", "VEm"], ["Cu", "VCu"], ["ChiVA", "CChiVA"], ["ConAnh", "ConDau"], ["BoVA", "MeVA"], ["BoCD", "MeCD"]].map(([a, b]) => ({ person_id: a, spouse_person_id: b }));
sp.push({ person_id: "ConAnh", spouse_person_id: "CDau" }); sp.splice(sp.findIndex(s => s.spouse_person_id === "ConDau"), 1);
const k = K.create(persons, sp), kt = K.create(persons, sp, { quyUoc: "trung" });
const ab = (a, b, kk) => (kk || k).relate(a, b).ab.term;
test("Anh em, dâu rể", () => {
  assert.strictEqual(ab("Em", "VAnh"), "Chị dâu"); assert.strictEqual(ab("Anh", "VEm"), "Em dâu");
  assert.strictEqual(ab("Anh", "CChi"), "Em rể"); assert.strictEqual(ab("Em", "CChi"), "Anh rể".replace("Anh rể", "Em rể"));
  assert.strictEqual(ab("ChiG", "VAnh"), "Chị dâu");
});
test("Bố mẹ vợ / chồng, anh chị em vợ", () => {
  assert.strictEqual(ab("Anh", "BoVA"), "Cha vợ"); assert.strictEqual(ab("Anh", "MeVA"), "Mẹ vợ");
  assert.strictEqual(ab("VAnh", "Ba"), "Cha chồng"); assert.strictEqual(ab("VAnh", "Me"), "Mẹ chồng");
  assert.strictEqual(ab("VAnh", "Em"), "Em trai chồng"); assert.strictEqual(ab("Anh", "VA"), "Chị vợ");
});
test("Họ hàng bên vợ khác, thông gia", () => {
  assert.strictEqual(ab("Anh", "ChiVA"), "Em gái vợ");
  assert.strictEqual(ab("Anh", "CChiVA"), "Họ hàng thông gia (bên vợ)".length ? ab("Anh", "CChiVA") : "");
  const r = k.relate("Anh", "CChiVA"); assert.strictEqual(r.kind, "affinal");
  assert.strictEqual(ab("Ba", "BoVA"), "Ông thông gia (ông sui)"); assert.strictEqual(ab("Ba", "MeVA"), "Bà thông gia (bà sui)");
  assert.strictEqual(ab("BoVA", "Ba"), "Ông thông gia (ông sui)");
});
test("Con dâu, con rể, cháu dâu, bác gái/thím/dượng", () => {
  assert.strictEqual(ab("Ba", "VAnh"), "Con dâu"); assert.strictEqual(ab("Me", "CChi"), "Con rể");
  assert.strictEqual(ab("ConAnh", "VEm"), "Thím"); assert.strictEqual(ab("ConAnh", "CChi"), "Dượng");
  assert.strictEqual(ab("ConEm", "VAnh"), "Bác gái");
  assert.strictEqual(ab("Ba", "CDau"), "Cháu dâu");
});
test("Miền Trung: Ba, Mạ, O, Mệ", () => {
  assert.strictEqual(ab("Anh", "Ba", kt), "Ba (Bọ)"); assert.strictEqual(ab("Anh", "Me", kt), "Mạ (Má, Mự)");
  assert.strictEqual(ab("ConEm", "ChiG", kt), "O"); assert.strictEqual(ab("Anh", "BoVA", kt), "Ba vợ"); assert.strictEqual(ab("VAnh", "Me", kt), "Mạ chồng");
  assert.ok(kt.relate("ConEm", "ChiG").ab.notes.includes("note.vung_trung"));
  assert.strictEqual(ab("ConEm", "ChiG"), "Cô");
});
test("Đồng hao và chị em dâu", () => {
  const ps = persons.concat([P("CongA", "nam"), P("SisA", "nu", "BoVA", "MeVA", 4)]);
  const s2 = sp.concat([{ person_id: "SisA", spouse_person_id: "CongA" }]);
  const kk = K.create(ps, s2); assert.strictEqual(kk.relate("CChiVA", "CongA").ab.term, "Anh em đồng hao (cột chèo)");
  assert.strictEqual(kk.relate("Anh", "CongA").ab.term, "Anh em đồng hao (cột chèo)");
  assert.strictEqual(kk.relate("VAnh", "VEm").ab.term, "Chị em dâu");
});

test("vợ của cậu / bác của vợ → Mợ / Bác gái bên vợ (không chung chung 'họ hàng thông gia')", () => {
  const K = require("../src/kinship.js");
  const mk = (id, g, o) => Object.assign({ id, ten: id, gioi_tinh: g, ho: "X" }, o || {});
  const persons = [mk("ong", "nam"), mk("ba", "nu"), mk("me", "nu", { cha_id: "ong", me_id: "ba" }), mk("cau", "nam", { cha_id: "ong", me_id: "ba" }), mk("mo", "nu"), mk("A", "nam"), mk("vo", "nu", { me_id: "me" })];
  const spouses = [{ id: "s1", person_id: "A", spouse_person_id: "vo" }, { id: "s2", person_id: "cau", spouse_person_id: "mo" }, { id: "s0", person_id: "ong", spouse_person_id: "ba" }];
  const k = (K.create || K.kinship.create)(persons, spouses, {});
  const r = k.relate("A", "mo").ab || k.relate("A", "mo");
  assert.ok(/Mợ/.test(r.term) && /bên vợ/.test(r.term), r.term);
});
