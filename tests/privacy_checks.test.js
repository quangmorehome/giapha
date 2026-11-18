const test = require("node:test"), assert = require("node:assert");
const Pv = require("../src/privacy.js"), C = require("../src/checks.js");
const mk = (id, o) => Object.assign({ id, ho: "Tống", ten: id, gioi_tinh: "nam", con_song: false, muc_hien_thi: "rieng_tu", chi: "A", cha_id: null, me_id: null }, o || {});
const persons = [
  mk("pub", { muc_hien_thi: "cong_khai", sinh: { nam: 1900 }, mat: { nam: 1960 } }),
  mk("tv", { muc_hien_thi: "gia_toc", sinh: { nam: 1920 }, mat: { nam: 1990 } }),
  mk("rt", { muc_hien_thi: "rieng_tu", sinh: { nam: 1930 } }),
  mk("song", { muc_hien_thi: "cong_khai", con_song: true, sinh: { nam: 1975 }, tieu_su: "bí mật", chi: "B" }),
  mk("tre", { muc_hien_thi: "cong_khai", con_song: true, sinh: { nam: 2015 }, cha_id: "song", chi: "B", tieu_su: "trẻ" }),
  mk("tre_ok", { muc_hien_thi: "cong_khai", con_song: true, sinh: { nam: 2016 }, cha_id: "song", chi: "B", da_dong_y_tre_em: true }),
  mk("an", { muc_hien_thi: "cong_khai", da_an: true }),
  mk("fam", { muc_hien_thi: "gia_dinh_nho", con_song: true, sinh: { nam: 1980 }, chi: "A" }),
  mk("xa", { muc_hien_thi: "dai_gia_dinh", chi: "C" })
];
const ctx = (v) => Pv.makeContext(v, persons, [], 2026);
const lv = (v, id) => Pv.project(persons.find(p => p.id === id), ctx(v)).level;

test("Khách chỉ thấy công khai; còn lại là khung ẩn không lộ trường nào", () => {
  const k = { role: "khach" };
  assert.strictEqual(lv(k, "pub"), "full"); assert.strictEqual(lv(k, "tv"), "hidden"); assert.strictEqual(lv(k, "rt"), "hidden");
  const h = Pv.project(persons[1], ctx(k)).p; assert.deepStrictEqual(Object.keys(h).sort(), ["cha_id", "id", "level", "me_id"]);
});
test("Người sống và trẻ em: Khách chỉ thấy tên và quan hệ cơ bản", () => {
  const r = Pv.project(persons.find(p => p.id === "song"), ctx({ role: "khach" }));
  assert.strictEqual(r.level, "basic"); assert.ok(!("sinh" in r.p) && !("tieu_su" in r.p));
  assert.strictEqual(lv({ role: "khach" }, "tre"), "basic"); assert.strictEqual(lv({ role: "khach" }, "tre_ok"), "full");
});
test("Member: thấy gia tộc, người sống ngoài nhánh chỉ cơ bản, trong nhánh thì đầy đủ", () => {
  const m = { role: "member", person_id: "fam" }; // chi A
  assert.strictEqual(lv(m, "tv"), "full"); assert.strictEqual(lv(m, "rt"), "hidden");
  assert.strictEqual(lv(m, "song"), "basic");                 // chi B, ngoài nhánh
  const mB = { role: "member", person_id: "song" }; assert.strictEqual(lv(mB, "song"), "full"); assert.strictEqual(lv(mB, "tre"), "full");
});
test("Hồ sơ đã ẩn: Member và Khách không nhận được hàng nào; Admin và Editor thấy để khôi phục", () => {
  assert.strictEqual(lv({ role: "member", person_id: "fam" }, "an"), "none"); assert.strictEqual(lv({ role: "khach" }, "an"), "none");
  assert.strictEqual(lv({ role: "admin" }, "an"), "full"); assert.strictEqual(lv({ role: "editor", chi: ["A"] }, "an"), "full");
});
test("Admin và Editor thấy hết (cả dòng họ là một chi); Member không sửa được", () => {
  assert.strictEqual(lv({ role: "admin" }, "rt"), "full");
  assert.strictEqual(lv({ role: "editor", chi: ["A"] }, "rt"), "full");
  assert.strictEqual(lv({ role: "editor", chi: ["B"] }, "rt"), "full");
  assert.ok(Pv.canEdit(persons[0], { role: "editor" })); assert.ok(Pv.canEdit(persons[0], { role: "admin" })); assert.ok(!Pv.canEdit(persons[0], { role: "khach" }));
  assert.ok(!Pv.canEdit(persons[0], { role: "member" }));
});
test("visibleList không chứa trường bị cấm", () => {
  const list = Pv.visibleList(persons, ctx({ role: "khach" }));
  const s = JSON.stringify(list); assert.ok(!s.includes("bí mật") && !s.includes('"trẻ"'));
  assert.ok(!list.some(p => p.id === "an"));
});

const base = [
  mk("o", { sinh: { nam: 1900 }, mat: { nam: 1970 }, the_thu: 1, nguon: "x" }),
  mk("c1", { cha_id: "o", sinh: { nam: 1895 }, the_thu: 2, thu_tu_con: 1, nguon: "x" }),                 // con sinh trước cha
  mk("c2", { cha_id: "o", sinh: { nam: 1930 }, the_thu: 3, thu_tu_con: 1, nguon: "x" }),                 // lệch đời + trùng thứ tự
  mk("c3", { cha_id: "o", sinh: { nam: 1932 }, mat: { nam: 1931 }, thu_tu_con: 1, gioi_tinh: "nu", nguon: "x" }), // mất trước sinh
  mk("w1", { gioi_tinh: "nu", nguon: "x" }), mk("w2", { gioi_tinh: "nu", nguon: "x" }),
  mk("c4", { cha_id: "o", sinh: { nam: 1940 }, nguon: "x" }),                                            // cha nhiều vợ chưa ghi mẹ
  mk("loop1", { cha_id: "loop2", nguon: "x" }), mk("loop2", { cha_id: "loop1", nguon: "x" }),
  mk("trung", { ho: "Tống", ten: "Trùng", sinh: { nam: 1950 }, nguon: "x" }), mk("trung2", { ho: "Tong", ten: "Trung", sinh: { nam: 1950 }, nguon: "x" })
];
const sp = [{ person_id: "o", spouse_person_id: "w1", thu_tu: 1 }, { person_id: "o", spouse_person_id: "w2", thu_tu: 2 }];
test("Phát hiện mâu thuẫn (chỉ báo, không sửa)", () => {
  const before = JSON.stringify(base);
  const rules = new Set(C.run(base, sp, { year: 2026 }).map(r => r.rule));
  for (const r of ["con_truoc_cha", "mat_truoc_sinh", "cha_nhieu_vo_thieu_me", "vong_cha_me", "lech_doi", "trung_thu_tu", "co_the_trung", "thieu_ngay_gio"])
    assert.ok(rules.has(r), "thiếu quy tắc " + r);
  assert.strictEqual(JSON.stringify(base), before, "không được sửa dữ liệu");
});
test("Vợ chồng cùng huyết thống", () => {
  const ps = [mk("g"), mk("a", { cha_id: "g" }), mk("b", { cha_id: "g", gioi_tinh: "nu" })];
  assert.ok(C.run(ps, [{ person_id: "a", spouse_person_id: "b" }], { year: 2026 }).some(r => r.rule === "vo_chong_cung_huyet"));
});
test("Dữ liệu sạch không báo mức cao", () => {
  const ps = [mk("a", { sinh: { nam: 1900 }, mat: { nam: 1960 }, nguon: "x", gio_ngay_am: 3, gio_thang_am: 4 }), mk("b", { cha_id: "a", sinh: { nam: 1930 }, mat: { nam: 2000 }, nguon: "x", gio_ngay_am: 5, gio_thang_am: 6 })];
  assert.strictEqual(C.run(ps, [], { year: 2026 }).filter(r => r.sev === "cao").length, 0);
});
