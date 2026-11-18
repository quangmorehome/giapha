const test = require("node:test"), assert = require("node:assert");
const G = require("../src/gedcom.js"), S = require("../src/data.js");
const F = ["ho", "ten_dem", "ten", "ten_thuong_goi", "ten_huy", "ten_thuy", "ten_han_nom", "dao_hieu", "gioi_tinh", "sinh", "con_song", "mat", "gio_ngay_am", "gio_thang_am", "gio_nhuan", "the_thu", "thu_tu_con", "chi", "cha_id", "me_id", "me_ten", "nghe", "noi_sinh", "noi_an_tang", "tieu_su", "nguon", "muc_chac_chan", "muc_hien_thi", "da_dong_y_tre_em", "da_an", "chung_cu"];
const clean = (v) => v === "" || v === undefined || v === false ? null : v;
const norm = (p) => { const o = {}; F.forEach(f => { let v = clean(p[f]); if (v && typeof v === "object") v = JSON.stringify(Object.keys(v).sort().map(k => [k, v[k]])); o[f] = v; }); return o; };

test("Xuất rồi nhập lại GEDCOM: mọi hồ sơ và trường khớp 100%", () => {
  const txt = G.exportGedcom({ persons: S.persons, spouses: S.spouses });
  const back = G.importGedcom(txt);
  assert.strictEqual(back.persons.length, S.persons.length);
  assert.deepStrictEqual(back.warnings, []);
  const bi = {}; back.persons.forEach(p => bi[p.id] = p);
  S.persons.forEach(p => assert.deepStrictEqual(norm(bi[p.id]), norm(p), p.id));
  const key = (s) => [s.person_id, s.spouse_person_id, s.thu_tu, s.tinh_trang, s.ten].join("|");
  assert.deepStrictEqual(back.spouses.map(key).sort(), S.spouses.map(key).sort());
});
test("Cha nhiều vợ: mỗi cặp cha mẹ là một gia đình", () => {
  const txt = G.exportGedcom({ persons: S.persons, spouses: S.spouses });
  const fams = txt.split(/\r\n/).filter(l => /^0 @F\d+@ FAM$/.test(l)).length;
  const p16 = txt.split(/\r\n/).filter(l => l === "1 FAMS @F" + 0).length; // không dùng
  const sections = txt.split(/\r\n0 /).filter(s => /^@F\d+@ FAM/.test(s));
  const withP16 = sections.filter(s => s.includes("HUSB @I16@")); assert.ok(withP16.length >= 3, "p16 phải ở ≥3 gia đình (vợ 1, vợ 2, con thiếu mẹ)");
  assert.ok(fams > 10);
});
test("Dòng dài được tách CONC/CONT, ký tự Việt NFC giữ nguyên", () => {
  const long = "Đ".repeat(500) + "\ndòng hai: ễ ệ ự";
  const ps = [{ id: "x", ho: "Tống", ten_dem: "Văn", ten: "Đức", gioi_tinh: "nam", con_song: true, tieu_su: long }];
  const txt = G.exportGedcom({ persons: ps, spouses: [] });
  assert.ok(txt.split("\r\n").every(l => l.length < 255)); assert.ok(/CONC/.test(txt) && /CONT/.test(txt));
  const b = G.importGedcom(txt).persons[0]; assert.strictEqual(b.tieu_su, long.normalize("NFC")); assert.strictEqual(b.ten, "Đức"); assert.strictEqual(b.ten_dem, "Văn");
});
test("Nhập GEDCOM của chương trình khác (không có thẻ riêng)", () => {
  const t = ["0 HEAD", "1 CHAR UTF-8", "0 @I1@ INDI", "1 NAME Nguyễn Văn An", "1 SEX M", "1 BIRT", "2 DATE ABT 1900", "1 DEAT", "2 DATE 5 FEB 1970", "0 @I2@ INDI", "1 NAME Văn B /Nguyễn/", "1 SEX F", "1 FAMS @F1@", "0 @I3@ INDI", "1 NAME Nguyễn Văn Con", "1 FAMC @F1@", "0 @F1@ FAM", "1 HUSB @I1@", "1 WIFE @I2@", "1 CHIL @I3@", "0 TRLR"].join("\n");
  const r = G.importGedcom(t), by = {}; r.persons.forEach(p => by[p.ten] = p);
  assert.strictEqual(by["An"].ho, "Nguyễn"); assert.strictEqual(by["An"].ten_dem, "Văn"); assert.deepStrictEqual(by["An"].sinh, { nam: 1900, xap_xi: true });
  assert.deepStrictEqual(by["An"].mat, { nam: 1970, thang: 2, ngay: 5 }); assert.strictEqual(by["Con"].cha_id, by["An"].id); assert.strictEqual(by["Con"].me_id, by["B"].id);
  assert.strictEqual(r.spouses.length, 2);
});
