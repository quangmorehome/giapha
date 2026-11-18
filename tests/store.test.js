const test = require("node:test"), assert = require("node:assert");
["lunar", "checks", "privacy", "gedcom", "data", "io", "store"].forEach(m => require("../src/" + m + ".js"));
const GP = globalThis.GP, St = GP.store;
const as = (v) => { St.init(); St.setViewer(v); };
const ADMIN = { role: "admin", ten: "Kent" }, ED = { role: "editor", ten: "Ed", chi: ["Chi mẫu A"] }, MEM = { role: "member", person_id: "p23" }, KH = { role: "khach" };
const code = (f) => { try { f(); } catch (e) { return e.code; } return null; };
const reset = () => { St.S.data = null; };

test("Member và Khách không ghi được gì; thử ghi bị từ chối", () => {
  [MEM, KH].forEach(v => { reset(); as(v);
    assert.strictEqual(code(() => St.addPerson({ ten: "X" })), "khong_du_quyen");
    assert.strictEqual(code(() => St.updatePerson("p01", { tieu_su: "x" })), "khong_du_quyen");
    assert.strictEqual(code(() => St.setHidden("p01", true)), "khong_du_quyen");
    assert.strictEqual(code(() => St.saveRow("donations", { ten: "x" })), "khong_du_quyen");
    assert.strictEqual(code(() => St.saveSettings({ tac_gia: "x" })), "khong_du_quyen");
  });
});
test("Editor sửa được cả dòng họ; không đổi vai trò, cài đặt, ủng hộ; không xoá, không nhập Excel", () => {
  reset(); as(ED);
  assert.ok(St.updatePerson("p22", { nghe: "mẫu" }));
  assert.ok(St.updatePerson("p06", { nghe: "x" })); // cả dòng họ là một chi
  assert.strictEqual(code(() => St.deletePerson("p06")), "khong_du_quyen");
  assert.strictEqual(code(() => St.syncImport({ persons: [], spouses: [] })), "khong_du_quyen");
  assert.strictEqual(code(() => St.removeSample()), "khong_du_quyen");
  assert.strictEqual(code(() => St.saveRow("profiles", { id: "u_member", vai_tro: "admin" })), "khong_du_quyen");
  assert.strictEqual(code(() => St.saveSettings({ tac_gia: "x" })), "khong_du_quyen");
  const a = St.saveRow("articles", { tieu_de: "t", noi_dung: "n", trang_thai: "da_duyet" });
  assert.strictEqual(St.S.data.articles.find(x => x.id === a.id).trang_thai, "nhap", "Editor soạn, không tự duyệt");
});
test("Mặc định riêng tư; tên bắt buộc; mọi lần ghi có lịch sử cũ/mới", () => {
  reset(); as(ED);
  assert.strictEqual(code(() => St.addPerson({ ten: "" })), "khong_hop_le");
  const p = St.addPerson({ ten: "Thử", ho: "Tống", chi: "Chi mẫu A" }); assert.strictEqual(p.muc_hien_thi, "rieng_tu");
  St.updatePerson(p.id, { nghe: "thợ mẫu" });
  const h = St.S.data.edit_history.filter(x => x.ban_ghi_id === p.id); assert.deepStrictEqual(h.map(x => x.hanh_dong), ["them", "sua"]);
  assert.deepStrictEqual(h[1].thay_doi, { cu: { nghe: "" }, moi: { nghe: "thợ mẫu" } }); assert.ok(h[1].ai.includes("Ed") && h[1].luc);
});
test("Không tạo vòng cha mẹ con; không tự làm cha", () => {
  reset(); as(ADMIN);
  assert.strictEqual(code(() => St.updatePerson("p01", { cha_id: "p04" })), "khong_hop_le");
  assert.strictEqual(code(() => St.updatePerson("p04", { cha_id: "p04" })), "khong_hop_le");
});
test("Ẩn/khôi phục có lịch sử; chỉ Quản trị mới xoá hồ sơ trùng (có gộp liên kết, có nhật ký)", () => {
  reset(); as(ADMIN); const n = St.S.data.persons.length;
  St.setHidden("p05", true); assert.strictEqual(St.S.data.persons.length, n); assert.ok(St.byId("p05").da_an);
  St.setHidden("p05", false); assert.ok(!St.byId("p05").da_an);
  assert.deepStrictEqual(St.S.data.edit_history.slice(-2).map(x => x.hanh_dong), ["an", "khoi_phuc"]);
  assert.strictEqual(St.remove, undefined);
});
test("Xoá hồ sơ trùng: chỉ Quản trị, gộp liên kết, ghi nhật ký", () => {
  reset(); as(ADMIN);
  const dup = St.addPerson(Object.assign(St.blank(), { ho: "Tống", ten: "Trùng", gioi_tinh: "nam", cha_id: "p01", the_thu: 2 }));
  const kid = St.addPerson(Object.assign(St.blank(), { ho: "Tống", ten: "Con", gioi_tinh: "nam", cha_id: dup.id, the_thu: 3 }));
  const n0 = St.S.data.persons.length;
  const r = St.deletePerson(dup.id, "p02"); assert.strictEqual(r.con >= 1, true);
  assert.strictEqual(St.S.data.persons.length, n0 - 1); assert.strictEqual(St.byId(kid.id).cha_id, "p02");
  assert.strictEqual(St.S.data.edit_history.slice(-1)[0].hanh_dong, "xoa"); assert.ok(St.S.data.edit_history.slice(-1)[0].thay_doi.cu.ten === "Trùng");
  as(ED); assert.strictEqual(code(() => St.deletePerson("p03")), "khong_du_quyen");
});
test("Đổi vai trò chỉ Admin, có ghi lịch sử", () => {
  reset(); as(ADMIN); St.saveRow("profiles", { id: "u_member", ten_hien_thi: "x", vai_tro: "editor", nhanh_chi: [], person_id: "p23", da_xoa: false });
  assert.ok(St.S.data.edit_history.some(h => h.hanh_dong === "doi_vai_tro" && h.thay_doi.moi.vai_tro === "editor"));
});
test("Cảnh báo trùng và con sinh trước cha: hỏi, không chặn", () => {
  reset(); as(ADMIN);
  const v = St.validate(Object.assign(St.blank(), { ho: "Tống", ten_dem: "Văn Mẫu Hai", ten: "Bốn", sinh: { nam: 1945 }, cha_id: "p15" }));
  assert.ok(v.warnings.some(w => w.code === "co_the_trung"));
  const v2 = St.validate(Object.assign(St.blank(), { ten: "Q", sinh: { nam: 1890 }, cha_id: "p15" })); assert.ok(v2.warnings.some(w => w.code === "con_truoc_cha")); assert.strictEqual(v2.errors.length, 0);
});
test("Thêm vào cây: id mới, không đụng dữ liệu cũ; nâng cấp có lịch sử", () => {
  reset(); as(ADMIN); St.resetSample(); St.removeSample(); const real = St.addPerson({ ten: "Người thật", ho: "Tống" }); const n = St.S.data.persons.length; assert.strictEqual(n, 1, "người mẫu đã gỡ, còn người thật");
  const imp = { persons: [{ id: "a", ten: "A", ho: "X", cha_id: null, me_id: null, schema: 2 }, { id: "b", ten: "B", ho: "X", cha_id: "a", me_id: null, schema: 2 }], spouses: [] };
  assert.strictEqual(St.appendImport(imp), 2); assert.strictEqual(St.S.data.persons.length, n + 2);
  const b = St.S.data.persons[St.S.data.persons.length - 1]; assert.ok(b.id !== "b" && b.cha_id === St.S.data.persons[St.S.data.persons.length - 2].id);
  St.S.data.persons[0].schema = 1; assert.strictEqual(St.outdated(), 1); assert.strictEqual(St.upgradeAll(), 1); assert.strictEqual(St.outdated(), 0);
  assert.ok(St.byId(real.id), "dữ liệu thật cũ vẫn còn"); St.resetSample();
});
test("Nạp Excel/CSV tự gỡ dữ liệu mẫu, giữ nguyên người thật; gỡ tay cũng được", () => {
  reset(); as(ADMIN); St.resetSample(); assert.ok(St.sampleCount() > 30); assert.ok(St.S.data.mau);
  const imp = { persons: [{ id: "N001", ma: "N001", ten: "Một", ho: "Tống", cha_id: null, me_id: null, schema: 2, the_thu: 1 }, { id: "N002", ma: "N002", ten: "Hai", ho: "Tống", cha_id: "N001", me_id: null, schema: 2 }], spouses: [], sites: [] };
  St.syncImport(imp); assert.strictEqual(St.S.data.persons.length, 2); assert.strictEqual(St.sampleCount(), 0); assert.strictEqual(St.S.data.mau, false);
  assert.ok(!St.S.data.sites.some(x => /mẫu/i.test(x.ten)) && !St.S.data.events.length, "địa điểm và sự kiện mẫu cũng được gỡ");
  assert.strictEqual(St.byId(St.S.data.persons[1].id).cha_id, St.S.data.persons[0].id, "nối cha con theo Mã");
  St.resetSample(); assert.ok(St.sampleCount() > 30); const n = St.removeSample(); assert.ok(n > 30 && St.sampleCount() === 0); St.resetSample();
});
test("Người dùng gửi yêu cầu ẩn hồ sơ; Admin xử lý; khách không gửi được", () => {
  reset(); as(KH); assert.strictEqual(code(() => St.addRequest({ loai: "an_ho_so" })), "khong_du_quyen");
  as(Object.assign({}, MEM, { profileId: "u_member" })); const q = St.addRequest({ loai: "an_ho_so" });
  assert.strictEqual(code(() => St.resolveRequest(q.id)), "khong_du_quyen");
  St.setViewer(ADMIN); St.resolveRequest(q.id); assert.ok(St.byId("p23").da_an);
});
