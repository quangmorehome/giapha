// v1.45: ô tìm ở trang chủ, sidebar không nhảy, subnav giữ cuộn, ô thống kê di tích bấm được, tảo mộ, bong bóng chạm, lịch không trượt
const { chromium, devices } = require("playwright"), assert = require("assert"), path = require("path");
(async () => { const b = await chromium.launch(), errs = [];
  const F = "file://" + path.resolve(__dirname, "../dist/_khung_thu.html"), init = () => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} };
  let pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); pg.on("pageerror", e => errs.push(e.message)); await pg.addInitScript(init);
  await pg.goto(F + "#trang-chu"); await pg.waitForTimeout(700);
  await pg.fill(".hero2 .pk input", "Tống"); await pg.waitForTimeout(400);
  const r = await pg.evaluate(() => { const l = document.querySelector(".hero2 .pk-list"), bt = l.querySelector("li"), lr = l.getBoundingClientRect(), h = document.querySelector(".hero2").getBoundingClientRect(); return { n: l.querySelectorAll("li").length, c: getComputedStyle(bt).color, bg: getComputedStyle(l).backgroundColor, out: lr.bottom > h.bottom, vis: (() => { const e = document.elementFromPoint(lr.left + 20, Math.min(h.bottom + 25, innerHeight - 5)); return !!e && l.contains(e); })(), ic: getComputedStyle(document.querySelector(".hero2 .pk input")).color }; });
  assert.ok(r.n >= 3, "nhiều kết quả: " + r.n); assert.ok(r.c !== r.bg, "chữ khác nền " + r.c + " / " + r.bg); assert.ok(r.out && r.vis, "danh sách không bị khung hero cắt " + JSON.stringify(r)); assert.ok(/rgb\(43, 26, 16\)/.test(r.ic), "chữ ô nhập đậm " + r.ic);
  // sidebar: hover không đổi độ cao mục
  const it = pg.locator('.side-nav a[href="#danh-nhan"]'); const h0 = (await it.boundingBox()).height; await it.hover(); await pg.waitForTimeout(350); assert.strictEqual((await it.boundingBox()).height, h0, "hover không xuống dòng");
  // di tích: thẻ thống kê bấm được
  await pg.goto(F + "#di-tich"); await pg.waitForTimeout(600);
  const n0 = await pg.locator(".dtc").count(); await pg.click('.stiles button[data-k="mo"]'); await pg.waitForTimeout(300);
  const n1 = await pg.locator(".dtc").count(); assert.ok(n1 > 0 && n1 <= n0, "lọc khu mộ " + n0 + "→" + n1); await pg.click('.stiles button[data-k="all"]'); await pg.waitForTimeout(300); assert.strictEqual(await pg.locator(".dtc").count(), n0, "bỏ lọc");
  await pg.click('.stiles button[data-k="sua"]'); await pg.waitForTimeout(300); assert.ok(await pg.locator('.stiles button[data-k="sua"][aria-pressed="true"]').count(), "đang lọc cần tu sửa");
  // lịch: lọc không cuộn
  await pg.goto(F + "#lich"); await pg.waitForTimeout(700);
  await pg.locator('[data-act="cal-filt"][data-k="gio"]').scrollIntoViewIfNeeded(); await pg.waitForTimeout(300); const y0 = await pg.evaluate(() => scrollY); await pg.click('[data-act="cal-filt"][data-k="gio"]'); await pg.waitForTimeout(700); assert.ok(Math.abs((await pg.evaluate(() => scrollY)) - y0) < 4, "lọc lịch không trượt trang");
  // điện thoại
  const ctx = await b.newContext({ ...devices["iPhone 13"] }); pg = await ctx.newPage(); pg.on("pageerror", e => errs.push(e.message)); await pg.addInitScript(init);
  await pg.goto(F + "#so-do"); await pg.waitForTimeout(800);
  await pg.evaluate(() => { document.querySelector("#subnav .tabs").scrollLeft = 200; }); const sl = await pg.evaluate(() => document.querySelector("#subnav .tabs").scrollLeft);
  await pg.evaluate(() => { location.hash = "#danh-xung"; }); await pg.waitForTimeout(600);
  const sl2 = await pg.evaluate(() => document.querySelector("#subnav .tabs").scrollLeft); assert.ok(sl > 0 && sl2 > 0, "subnav giữ cuộn ngang " + sl + "/" + sl2);
  await pg.goto(F + "#bong-bong"); await pg.waitForTimeout(1200);
  const el = pg.locator(".mmn a.dg-a").nth(3); await el.scrollIntoViewIfNeeded(); const bb = await el.boundingBox(); await pg.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await pg.waitForTimeout(500);
  assert.ok(await pg.locator("svg.dimmed .mmn.rel").count() > 1 && await pg.locator(".dgtip").count() && !(await pg.locator("#sheet-bg").count()), "chạm lần 1: sáng nhánh + thanh tên");
  await pg.click("[data-tip-open]"); await pg.waitForTimeout(500); assert.ok(await pg.locator("#sheet-bg, .sheet").count(), "bấm Hồ sơ mới mở hồ sơ");
  assert.deepStrictEqual(errs, []); console.log("✔ v1.45"); await b.close(); })().catch(e => { console.error("✘", e.message); process.exit(1); });
