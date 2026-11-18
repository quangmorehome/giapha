// v1.44: bài vị, đêm thắp hương, cây sống (vợ/chồng, lá rụng, thu gọn), Hôm nay, thẻ chia sẻ
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => { const b = await chromium.launch(), errs = [];
  const F = "file://" + path.resolve(__dirname, "../dist/_khung_thu.html");
  const pg = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage(); pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await pg.goto(F + "#cay-song"); await pg.waitForTimeout(700);
  assert.ok(await pg.locator(".cs-sp .cs-sn").count() > 0, "có vợ/chồng cạnh lá");
  assert.ok(await pg.locator(".cs-nd .cs-lf.d.dd, .cs-nd .cs-sw.dd").count() > 0, "lá rụng cho người đã mất");
  const n0 = await pg.locator(".cs-nd").count(), id = await pg.locator(".cs-tgb").first().getAttribute("data-tg");
  await pg.locator(`.cs-tgb[data-tg="${id}"]`).evaluate(e => e.dispatchEvent(new MouseEvent("click", { bubbles: true }))); await pg.waitForTimeout(200);
  const n1 = await pg.locator(".cs-nd").count(); assert.ok(n1 < n0, "thu gọn nhánh: " + n0 + "→" + n1);
  await pg.locator(`.cs-tgb[data-tg="${id}"]`).evaluate(e => e.dispatchEvent(new MouseEvent("click", { bubbles: true }))); await pg.waitForTimeout(200);
  assert.strictEqual(await pg.locator(".cs-nd").count(), n0, "mở lại đủ");
  await pg.click('[data-act="cs-all"][data-v="1"]'); await pg.waitForTimeout(200); assert.ok(await pg.locator(".cs-nd").count() < n0, "thu gọn tất cả");
  await pg.click('[data-act="cs-all"][data-v="0"]'); await pg.waitForTimeout(200); assert.strictEqual(await pg.locator(".cs-nd").count(), n0, "mở hết");
  await pg.click('[data-act="cs-sp"]'); await pg.waitForTimeout(200); assert.ok(await pg.locator(".cs-svg.nosp").count(), "ẩn vợ/chồng");
  // bài vị + xem trên cây
  const pid = await pg.locator(".cs-nd").nth(3).getAttribute("data-id");
  await pg.goto(F + "#nguoi-" + pid); await pg.waitForTimeout(600);
  assert.ok(await pg.locator(".bv .bv-tab h1").count() && await pg.locator(".bv-fam .bv-b").count() === 3, "thẻ bài vị");
  await pg.click('[data-act="cay-focus"]'); await pg.waitForTimeout(700);
  assert.ok(/#cay-song/.test(pg.url()) && await pg.locator(`.cs-nd.foc[data-id="${pid}"]`).count(), "nhảy tới người trên cây");
  // Đêm thắp hương
  await pg.goto(F + "#trang-chu"); await pg.waitForTimeout(500);
  await pg.evaluate(() => document.documentElement.setAttribute("data-theme", "light"));
  const ids = []; for (let i = 0; i < 3; i++) { await pg.evaluate(() => GP.ui.acts.theme()); ids.push(await pg.evaluate(() => document.documentElement.getAttribute("data-theme"))); }
  assert.deepStrictEqual(ids, ["dark", "huong", "light"], "vòng giao diện " + ids);
  await pg.evaluate(() => document.documentElement.setAttribute("data-theme", "huong"));
  const bg = await pg.evaluate(() => getComputedStyle(document.body).backgroundColor); assert.ok(/rgb\(11, 7, 5\)/.test(bg), "nền đen nâu " + bg);
  // Hôm nay
  assert.ok(await pg.locator(".hn-q").count() && (await pg.innerText(".hn-q")).length > 10, "lời dạy hôm nay");
  const q0 = await pg.innerText(".hn-q"); let ch = false; for (let i = 0; i < 6 && !ch; i++) { await pg.click('[data-act="hn-dan"]'); ch = (await pg.innerText(".hn-q")) !== q0; } assert.ok(ch, "đổi lời dạy");
  // Thẻ chia sẻ
  await pg.goto(F + "#thiep"); await pg.waitForTimeout(700);
  assert.deepStrictEqual(await pg.evaluate(() => [document.getElementById("th-cv").width, document.getElementById("th-cv").height]), [1080, 1080], "mặc định ảnh vuông");
  await pg.click('[data-act="th-fmt"][data-k="doc"]'); await pg.waitForTimeout(300);
  assert.strictEqual(await pg.evaluate(() => document.getElementById("th-cv").height), 1350, "khổ dọc");
  assert.ok(await pg.locator('[data-act="th-theme"]').count() === 3 && await pg.locator('[data-act="th-print"]').count() && await pg.locator('[data-act="th-copy"]').count(), "đủ nút");
  assert.deepStrictEqual(errs, []); console.log("✔ v1.44"); await b.close(); })().catch(e => { console.error("✘", e.message); process.exit(1); });
