// Kiểm thử các yêu cầu v1.4: form, ô chọn cha/mẹ, tạo hồ sơ vợ/mẹ, menu, sơ đồ có cửa sổ nhỏ, lịch, thống kê bấm được.
const { chromium } = require("playwright"), path = require("path"), assert = require("assert");
const URL = "file://" + path.join(__dirname, "..", "dist", "_khung_thu.html");
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } }); const pg = await ctx.newPage(); const errs = [];
  pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { if (!sessionStorage.getItem("i")) { localStorage.clear(); sessionStorage.setItem("i", "1"); localStorage.setItem("gp.viewer", "u_admin"); } } catch (e) {} });
  const ok = (n) => console.log("✔", n);
  await pg.goto(URL + "#them"); await pg.waitForTimeout(300);
  // form: không còn 'đến năm', không còn nguồn; thứ tự ngày-tháng-năm
  const names = await pg.$$eval("form [name]", els => els.map(e => e.name));
  assert.ok(!names.includes("sinh_den") && !names.includes("mat_den") && !names.includes("nguon") && !names.some(n => n.startsWith("cc_")), "đã bỏ 'đến năm' và nguồn");
  const order = names.filter(n => /^sinh_(ngay|thang|nam)$/.test(n)); assert.deepStrictEqual(order, ["sinh_ngay", "sinh_thang", "sinh_nam"]); ok("form: ngày-tháng-năm, không đến năm, không nguồn");
  // sinh >= 1900 ẩn tên huý; còn sống ẩn ngày mất + nơi an táng
  await pg.fill('[name="sinh_nam"]', "1990"); await pg.waitForTimeout(100);
  assert.ok(await pg.$eval("#old-names", e => e.hidden), "ẩn tên huý khi sinh ≥1900");
  await pg.fill('[name="sinh_nam"]', "1850"); await pg.waitForTimeout(100);
  assert.ok(!(await pg.$eval("#old-names", e => e.hidden)), "hiện lại khi sinh <1900"); ok("ẩn/hiện tên huý theo năm sinh");
  assert.ok(!(await pg.$eval("#dead-box", e => e.hidden)), "sinh 1850: tự chuyển sang Đã mất"); await pg.selectOption('[name="con_song"]', "1"); await pg.waitForTimeout(100);
  assert.ok(await pg.$eval("#dead-box", e => e.hidden), "còn sống: ẩn ngày mất");
  await pg.selectOption('[name="con_song"]', "0"); await pg.waitForTimeout(100);
  assert.ok(!(await pg.$eval("#dead-box", e => e.hidden)) && (await pg.$("#dead-box [name=noi_an_tang]")), "đã mất: hiện ngày mất + nơi an táng"); ok("ẩn/hiện ngày mất, giỗ, nơi an táng theo tình trạng");
  // ô chọn cha: gõ đủ tên rồi lưu không bị mất
  const fa = await pg.evaluate(() => { const l = GP.ui.view().list.filter(p => p.gioi_tinh === "nam" && p.level !== "hidden")[0]; return { id: l.id, name: GP.ui.fullName(l) }; });
  await pg.fill('[name="ten"]', "Kiểm Thử"); await pg.selectOption('[name="gioi_tinh"]', "nam"); await pg.selectOption('[name="con_song"]', "1");
  await pg.fill("#pk-cha", fa.name); await pg.click('form[data-submit] button[type=submit]'); await pg.waitForTimeout(300);
  const kid = await pg.evaluate(() => GP.store.S.data.persons.filter(p => p.ten === "Thử" && p.ho === "Kiểm")[0]); assert.ok(kid && kid.cha_id === fa.id, "tên cha gõ tay vẫn được nhận"); ok("gõ tên cha không chọn vẫn nhận đúng người");
  // tạo hồ sơ cho mẹ chỉ có tên
  const mk = await pg.evaluate((kid) => { GP.store.updatePerson(kid.id, { me_id: null, me_ten: "Nguyễn Thị Mẫu" }); return true; }, kid);
  await pg.goto(URL + "#nguoi-" + kid.id); await pg.evaluate(() => GP.ui.rerender()); await pg.waitForTimeout(300);
  await pg.click('[data-act="mom-mk"]'); await pg.waitForTimeout(400);
  const after = await pg.evaluate((id) => { const c = GP.store.byId(id); const m = c.me_id && GP.store.byId(c.me_id); return { me: c.me_id, ten: m && m.ten, gt: m && m.gioi_tinh, hash: location.hash }; }, kid.id);
  assert.ok(after.me && after.ten === "Mẫu" && after.gt === "nu" && /^#sua-/.test(after.hash)); ok("tạo hồ sơ mẹ từ tên → mở form sửa");
  // menu: hàng nhóm + hàng phụ
  await pg.goto(URL + "#cay"); await pg.waitForTimeout(300);
  const top = await pg.$$eval("#nav-list a", e => e.length), sub = await pg.$$eval("#subnav .tabs a", e => e.length); assert.ok(top <= 7 && sub >= 5, "menu gọn " + top + "/" + sub);
  assert.strictEqual(await pg.$$eval("main .tabs", e => e.length), 0, "không lặp tab trong trang"); ok("menu gom nhóm (" + top + " nhóm, " + sub + " mục phụ)");
  // sơ đồ: bấm vào người → cửa sổ nhỏ, không đổi trang
  for (const [route, kind] of [["so-do", "td"], ["mindmap", "mm"], ["bong-bong", "bb"]]) {
    await pg.goto(URL + "#" + route); await pg.waitForTimeout(600);
    const a = await pg.$("#dgbox a.dg-a"); assert.ok(a, route + ": có nút người");
    await a.click({ force: true }); await pg.waitForTimeout(300);
    const h = await pg.evaluate(() => location.hash); assert.ok(h === "#" + route, route + ": không nhảy trang (" + h + ")");
    assert.ok(await pg.$("#sheet-bg"), route + ": có cửa sổ hồ sơ");
    await pg.keyboard.press("Escape"); await pg.waitForTimeout(200); assert.ok(!(await pg.$("#sheet-bg")), route + ": tắt được");
  }
  ok("3 loại sơ đồ: bấm ra cửa sổ hồ sơ, tắt được, không nhảy trang");
  // lịch: bấm ngày → cửa sổ, vị trí cuộn giữ nguyên
  await pg.goto(URL + "#lich"); await pg.waitForTimeout(400);
  const has = await pg.$$eval(".cd.has-gio,.cd.has-sinh,.cd.has-le", e => e.length); console.log("  ngày có tô màu:", has);
  await pg.click(".cd:not(.empty) >> nth=9"); await pg.waitForTimeout(200); assert.ok(await pg.$(".calpop"), "mở cửa sổ ngày");
  await pg.keyboard.press("Escape"); await pg.waitForTimeout(150); assert.ok(!(await pg.$(".calpop"))); ok("lịch: bấm ngày ra cửa sổ, Esc đóng");
  // thống kê bấm được
  await pg.goto(URL + "#thong-ke"); await pg.waitForTimeout(400);
  await pg.click('button.st[data-k="nam"]'); await pg.waitForTimeout(200);
  const nrows = await pg.$$eval("#st-pop li", e => e.length); assert.ok(nrows > 0, "danh sách nam"); await pg.keyboard.press("Escape");
  await pg.click('ul.bars li.clk .bar-hit >> nth=0'); await pg.waitForTimeout(200); assert.ok(await pg.$("#st-pop")); ok("thống kê: bấm ô/cột ra danh sách (" + nrows + " nam)");
  // v1.5.1: tên cha/mẹ chưa có hồ sơ → tự tạo; vai trò; thêm người thân; xoá/gộp; trạng thái
  await pg.goto(URL + "#them"); await pg.waitForTimeout(300);
  await pg.fill('[name="ten"]', "Rể Thử"); await pg.selectOption('[name="gioi_tinh"]', "nam"); await pg.selectOption('[name="vai"]', "dau_re");
  await pg.fill("#pk-cha", "Lê Văn Thông"); await pg.fill("#pk-me", "Phạm Thị Gia"); await pg.click('form[data-submit] button[type=submit]'); await pg.waitForTimeout(400);
  const rr = await pg.evaluate(() => { const c = GP.store.S.data.persons.filter(p => p.ten === "Thử" && p.ho === "Rể")[0], f = GP.store.byId(c.cha_id), m = GP.store.byId(c.me_id), sp = GP.store.S.data.spouses.filter(s => s.person_id === c.cha_id && s.spouse_person_id === c.me_id).length; return { f: f && f.ten, fv: f && f.vai, m: m && m.ten, sp }; });
  assert.deepStrictEqual(rr, { f: "Thông", fv: "thong_gia", m: "Gia", sp: 1 }); ok("cha/mẹ chưa có hồ sơ: tự tạo, đánh dấu Thông gia, tự nối vợ chồng");
  const lab = await pg.evaluate(() => { const c = GP.store.S.data.persons.filter(p => p.ten === "Thử" && p.ho === "Rể")[0]; return [GP.ui.roleInfo(c) && GP.ui.roleInfo(c).label, GP.ui.roleInfo(GP.store.byId(c.cha_id)).label]; }); console.log("  nhãn:", lab.join(" | "));
  // trạng thái + thêm người thân + xoá gộp
  const pid0 = await pg.evaluate(() => GP.store.S.data.persons.filter(p => p.ten === "Thử" && p.ho === "Rể")[0].id);
  await pg.goto(URL + "#nguoi-" + pid0); await pg.evaluate(() => GP.ui.rerender()); await pg.waitForTimeout(300);
  assert.ok(/Trạng thái/.test(await pg.textContent(".lcs")), "thẻ Trạng thái"); ok("thẻ 'Trạng thái' thay cho 'Mất'");
  await pg.goto(URL + "#sua-" + pid0); await pg.evaluate(() => GP.ui.rerender()); await pg.waitForTimeout(300);
  await pg.check("#rel-on"); await pg.fill('.relrow [name="rel_ten"]', "Bé Một"); await pg.fill('.relrow [name="rel_nam"]', "2015"); await pg.click('form[data-submit] button[type=submit]'); await pg.waitForTimeout(400);
  const child = await pg.evaluate((id) => GP.store.S.data.persons.filter(p => p.ten === "Một" && p.cha_id === id).length, pid0); assert.strictEqual(child, 1); ok("thêm con ngay trong form sửa");
  await pg.goto(URL + "#sua-" + pid0); await pg.evaluate(() => GP.ui.rerender()); await pg.waitForTimeout(300);
  const n0 = await pg.evaluate(() => GP.store.S.data.persons.length);
  await pg.click('[data-act="del-open"]'); await pg.click('[data-act="del-do"]'); await pg.waitForTimeout(400);
  const n1 = await pg.evaluate(() => GP.store.S.data.persons.length); assert.strictEqual(n1, n0 - 1); ok("xoá hồ sơ (admin) có xác nhận trong trang");
  // quay lại danh sách: tự cuộn tới người vừa xem
  await pg.goto(URL + "#danh-sach"); await pg.evaluate(() => GP.ui.rerender()); await pg.waitForTimeout(300);
  const last = await pg.evaluate(() => { const l = GP.ui.view().list; return l[l.length - 3].id; });
  await pg.evaluate((id) => { location.hash = "#nguoi-" + id; }, last); await pg.waitForTimeout(300);
  await pg.evaluate(() => { location.hash = "#danh-sach"; }); await pg.waitForTimeout(500);
  const vis = await pg.evaluate((id) => { const a = document.querySelector('a[href="#nguoi-' + id + '"]'); if (!a) return "no-el"; const r = a.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }, last); assert.strictEqual(vis, true, "người vừa xem phải nằm trong màn hình"); ok("quay lại danh sách: tự cuộn tới người vừa xem");
  console.log(errs.length ? "LỖI JS: " + errs.join(" | ") : "không lỗi JS"); await b.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error("THẤT BẠI:", e.message); process.exit(1); });
