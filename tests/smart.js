const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => {
  const b = await chromium.launch(), errs = [], ok = n => console.log("✔", n);
  const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } }), pg = await ctx.newPage(); pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  const go = async () => { await pg.goto("file://" + path.join(__dirname, "..", "dist", "_khung_thu.html") + "#danh-sach"); await pg.evaluate(() => { location.hash = "#them"; }); await pg.waitForTimeout(400); };
  const val = n => pg.$eval("[name=" + n + "]", e => e.value), vis = id => pg.isVisible("#" + id);
  await go();
  // 1. chọn cha → mẹ (cha có đúng 1 vợ), họ, chi, đời, thứ tự con
  await pg.evaluate(() => GP.ui.pkChoose("cha", "p15")); await pg.waitForTimeout(150);
  assert.strictEqual(await val("ho"), "Tống"); assert.ok(!(await pg.$("[name=chi]")), "không còn ô chi"); assert.strictEqual(await val("the_thu"), "5");
  assert.strictEqual(await pg.evaluate(() => GP.ui.pkVal("me")), "p21", "mẹ tự điền"); assert.strictEqual(await val("thu_tu_con"), "4"); assert.ok(await vis("link-note"), "có ghi chú tự điền"); ok("chọn cha → họ, chi, đời, mẹ, thứ tự con");
  // không ghi đè điều đã gõ
  await pg.fill("[name=ho]", "Lê"); await pg.evaluate(() => GP.ui.pkChoose("cha", "p16")); assert.strictEqual(await val("ho"), "Lê", "không ghi đè"); ok("không ghi đè ô người dùng đã gõ");
  // 2. gõ tên cha rồi bấm ra ngoài → vẫn liên kết
  await go(); await pg.fill("#pk-cha", "Mẫu Mười Lăm"); await pg.click("[name=ten]"); await pg.waitForTimeout(500);
  assert.strictEqual(await val("the_thu"), "5", "liên kết khi gõ tên"); ok("gõ tên rồi bấm ra ngoài vẫn liên kết");
  // 3. năm sinh xa → đã mất; ngày mất → giỗ âm lịch tự tính; mức hiển thị mặc định
  await go(); await pg.fill("[name=sinh_nam]", "1880"); await pg.waitForTimeout(100);
  assert.strictEqual(await val("con_song"), "0"); assert.ok(await vis("dead-box")); assert.strictEqual(await val("muc_hien_thi"), "gia_toc");
  await pg.fill("[name=mat_ngay]", "15"); await pg.fill("[name=mat_thang]", "3"); await pg.fill("[name=mat_nam]", "1950");
  const exp = await pg.evaluate(() => { const l = GP.lunar.solarToLunar(15, 3, 1950), b = GP.lunar.lunarBefore(l.day, l.month, l.year, l.leap, 1); return { day: b.day, month: b.month }; }); assert.strictEqual(+(await val("gio_ngay_am")), exp.day); assert.strictEqual(+(await val("gio_thang_am")), exp.month); assert.ok(await vis("gio-note"));
  await pg.fill("[name=gio_ngay_am]", "7"); await pg.fill("[name=mat_ngay]", "16"); assert.strictEqual(await val("gio_ngay_am"), "7", "ngày giỗ đã sửa tay được giữ"); ok("năm sinh → đã mất; ngày mất → giỗ âm lịch; sửa tay được tôn trọng");
  // ghi âm lịch: giỗ = chính ngày mất
  await go(); await pg.fill("[name=sinh_nam]", "1900"); await pg.check("[name=mat_lich][value=am]"); await pg.fill("[name=mat_ngay]", "9"); await pg.fill("[name=mat_thang]", "2"); await pg.fill("[name=mat_nam]", "1960");
  assert.strictEqual(await val("gio_ngay_am"), "8"); assert.strictEqual(await val("gio_thang_am"), "2"); ok("mất ghi theo âm lịch → giỗ trước 1 ngày");
  // 4. đoán giới tính, ô đồng ý trẻ em
  await go(); await pg.fill("[name=ten_dem]", "Thị Hoa"); assert.strictEqual(await val("gioi_tinh"), "nu"); await pg.selectOption("[name=gioi_tinh]", "nam"); await pg.fill("[name=ten_dem]", "Thị Văn"); assert.strictEqual(await val("gioi_tinh"), "nam", "chọn tay được giữ");
  assert.ok(!(await vis("consent-box"))); await pg.fill("[name=sinh_nam]", "2020"); assert.ok(await vis("consent-box"), "trẻ dưới 18 hiện ô đồng ý"); await pg.fill("[name=sinh_nam]", "1990"); assert.ok(!(await vis("consent-box"))); ok("đoán giới tính, ô đồng ý trẻ em chỉ hiện khi cần");
  // 5. lưu thử trọn luồng: con của p15, tên mới
  await go(); await pg.evaluate(() => GP.ui.pkChoose("cha", "p15")); await pg.fill("[name=ten]", "Thử Tự Điền"); await pg.fill("[name=sinh_nam]", "1960"); await pg.click("#pform button[type=submit]"); await pg.waitForTimeout(500);
  const np = await pg.evaluate(() => GP.store.S.data.persons.find(p => p.ten === "Điền" && p.ten_dem === "Thử Tự")); assert.ok(np && np.cha_id === "p15" && np.me_id === "p21" && np.the_thu === 5 && np.thu_tu_con === 4, JSON.stringify(np)); ok("lưu: con gắn đúng cha, mẹ, đời, thứ tự");
  console.log(errs.length ? "LỖI JS: " + errs.join("|") : "không lỗi JS"); await b.close(); if (errs.length) process.exit(1); console.log("XONG");
})().catch(e => { console.log("FAIL", e.message.slice(0, 400)); process.exit(1); });
