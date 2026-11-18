// v1.27: điện thoại (thanh dưới + menu), bản đồ vệ tinh/danh sách/gán người mất, bảng ngày tháng, quy đổi âm-dương
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => {
  const b = await chromium.launch(), F = "file://" + path.join(__dirname, "..", "dist", "_khung_thu.html"), errs = [], ok = n => console.log("✔", n);
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }), pg = await ctx.newPage(); pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await pg.goto(F + "#trang-chu"); await pg.waitForTimeout(600);
  assert.ok(await pg.isVisible("#bnav"), "thanh dưới hiện"); assert.ok(!(await pg.isVisible(".nav-btn")), "menu cũ ẩn");
  const bx = await pg.$$eval("#bnav a,#bnav button", els => els.map(e => e.getBoundingClientRect().height)); assert.ok(bx.every(h => h >= 44), "nút đủ lớn");
  await pg.click("#bnav button"); assert.ok(await pg.isVisible("#msheet .ms-box")); assert.ok((await pg.$$("#msheet a")).length >= 10);
  await pg.click('#msheet a[href="#ban-do"]'); await pg.waitForTimeout(500); assert.ok(!(await pg.isVisible("#msheet .ms-box")), "bảng đóng sau khi chọn"); ok("điện thoại: thanh dưới + bảng menu");
  // bản đồ
  const src = () => pg.$eval(".mapbig iframe", e => e.src);
  assert.ok(/[?&]t=k/.test(await src()), "mặc định vệ tinh"); await pg.click('.mb-seg [data-v="0"]'); assert.ok(!/[?&]t=k/.test(await src()), "chuyển sang bản đồ thường"); await pg.click('.mb-seg [data-v="1"]');
  const names = await pg.$$eval(".mlist .mbody b", e => e.map(x => x.textContent)); assert.ok(names.length >= 4);
  const first = await pg.$eval(".mapbig h2", e => e.textContent); await pg.click(".mlist li:nth-child(3) .mbody"); await pg.waitForTimeout(300);
  assert.notStrictEqual(await pg.$eval(".mapbig h2", e => e.textContent), first, "bấm danh sách đổi địa điểm"); assert.ok(await pg.$('.mapbig a[href*="/maps/dir/"]'), "có chỉ đường Google Maps"); ok("bản đồ: vệ tinh, danh sách, chỉ đường");
  // gán người đã mất → thể hiện trong hồ sơ
  const sid = await pg.evaluate(() => GP.store.S.data.sites.filter(s => s.dia_chi)[0].id); await pg.evaluate(id => { GP.ui.acts["map-go"]({ getAttribute: () => id }); }, sid); await pg.waitForTimeout(300);
  const opt = await pg.$eval("#gan-sel option:nth-child(2)", e => e.value); await pg.selectOption("#gan-sel", opt); await pg.click('[data-act="gan-add"]'); await pg.waitForTimeout(300);
  assert.ok((await pg.evaluate(id => GP.store.S.data.sites.filter(s => s.id === id)[0].nguoi_an_tang, sid)).includes(opt)); await pg.goto(F + "#nguoi-" + opt); await pg.waitForTimeout(500);
  const txt = await pg.textContent("main"); assert.ok(txt.includes("Nơi an táng") && txt.includes("Xem trên bản đồ"), "hồ sơ có thẻ nơi an táng"); assert.ok(!txt.includes("<span"), "không lộ mã HTML");
  await pg.goto(F + "#nguoi-p03"); await pg.waitForTimeout(500); const t3 = await pg.textContent("main"); assert.ok(t3.includes("dương lịch") && t3.includes("âm lịch") && !t3.includes("<span"), "bảng ngày tháng"); ok("gán người mất ↔ hồ sơ cá nhân, bảng ngày tháng gọn");
  // quy đổi ngày
  await pg.goto(F + "#them"); await pg.waitForTimeout(400);
  await pg.fill('[name="sinh_ngay"]', "1"); await pg.fill('[name="sinh_thang"]', "7"); await pg.fill('[name="sinh_nam"]', "2025"); await pg.waitForTimeout(200);
  assert.ok((await pg.textContent("#dc-sinh")).includes("âm lịch") && (await pg.textContent("#dc-sinh")).includes("2025"), "dương → âm");
  await pg.fill('[name="sinh_ngay"]', "25"); await pg.fill('[name="sinh_thang"]', "7"); await pg.waitForTimeout(100);
  assert.ok((await pg.textContent("#dc-sinh")).includes("nhuận"), "25/7/2025 rơi vào tháng 6 nhuận: " + await pg.textContent("#dc-sinh"));
  await pg.check('[name="sinh_lich"][value="am"]'); await pg.fill('[name="sinh_ngay"]', "10"); await pg.fill('[name="sinh_thang"]', "6"); await pg.waitForTimeout(200);
  assert.ok(await pg.isChecked('[name="sinh_nhuan"]') === true && (await pg.textContent("#dc-sinh")).includes("dương lịch"), "âm: tự đánh dấu nhuận + ra dương lịch");
  ok("tự quy đổi âm ⇄ dương, tự nhận tháng nhuận");
  assert.deepStrictEqual(errs, [], errs.join(";")); await b.close();
})().catch(e => { console.error("THẤT BẠI:", e.message); process.exit(1); });
