// v1.34: Danh nhân & thành tích, mốc lịch sử trên dòng thời gian
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => { const b = await chromium.launch(), errs = [];
  const pg = await (await b.newContext({ viewport: { width: 1100, height: 900 } })).newPage(); pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  const F = "file://" + path.resolve(__dirname, "../dist/_khung_thu.html");
  await pg.goto(F + "#dong-thoi-gian"); await pg.waitForTimeout(600);
  assert.ok(await pg.locator(".tl li.nation").count() >= 8, "có mốc lịch sử đất nước");
  await pg.click('input[data-on="tlnation"]'); await pg.waitForTimeout(300); assert.strictEqual(await pg.locator(".tl li.nation").count(), 0, "tắt được mốc lịch sử");
  await pg.evaluate(() => { location.hash = "#danh-nhan"; }); await pg.waitForTimeout(500);
  assert.ok(/Danh nhân/.test(await pg.innerText("h1")), "trang danh nhân");
  await pg.click('[data-act="dn-new"]'); await pg.fill('[name="tieu_de"]', "Cụ Thử — Cử nhân"); await pg.fill('[name="noi_dung"]', "Đỗ cử nhân khoa Mậu Ngọ."); await pg.click('form[data-submit="dn-save"] button[type="submit"]'); await pg.waitForTimeout(500);
  assert.ok(/Cụ Thử — Cử nhân/.test(await pg.innerText("main")), "hồ sơ mới hiện");
  await pg.click('.plc'); await pg.waitForTimeout(400); assert.ok(/Đỗ cử nhân/.test(await pg.innerText("article")), "mở được hồ sơ");
  await pg.evaluate(() => { location.hash = "#bai-viet"; }); await pg.waitForTimeout(400); assert.ok(!/Cụ Thử — Cử nhân/.test(await pg.innerText("main")), "không lẫn vào Bài viết");
  assert.deepStrictEqual(errs, []); console.log("✔ v1.34: danh nhân + mốc lịch sử"); await b.close(); })().catch(e => { console.error("✘", e.message); process.exit(1); });
