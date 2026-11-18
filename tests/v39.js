// v1.43: cành thẳng không biến mất, sơ đồ tự căn khung sau Cây sống, Gia huấn bia đứng
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => { const b = await chromium.launch(), errs = [];
  const F = "file://" + path.resolve(__dirname, "../dist/_khung_thu.html");
  for (const [w, h] of [[1300, 900], [390, 800]]) {
    const pg = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); pg.on("pageerror", e => errs.push(e.message));
    await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
    await pg.goto(F + "#cay-song"); await pg.waitForTimeout(600);
    assert.ok(await pg.locator("linearGradient#csb[gradientUnits='userSpaceOnUse']").count(), "gradient cành không phụ thuộc bbox");
    const rx = await pg.evaluate(() => { const s = document.querySelector(".cs-svg"), wr = document.getElementById("cs-wrap"); return [+s.dataset.rx * (s.getBoundingClientRect().width / s.getAttribute("width")) - wr.scrollLeft, wr.clientWidth]; });
    assert.ok(rx[0] > 0 && rx[0] < rx[1], "gốc cây nằm trong khung: " + rx);
    for (const hash of ["#so-do", "#mindmap", "#bong-bong"]) {
      await pg.evaluate(x => { location.hash = x; }, hash); await pg.waitForTimeout(1100);
      const r = await pg.evaluate(() => { const g = document.querySelector("g.vp"), bx = document.querySelector("#dgbox").getBoundingClientRect(), a = g.getBoundingClientRect(); return { l: a.left - bx.left, r: bx.right - a.right, t: a.top - bx.top }; });
      assert.ok(r.l >= -12 && r.r >= -12 && r.t >= -2, hash + " @" + w + " lệch khung " + JSON.stringify(r));
    }
  }
  const pg = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage();
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await pg.goto(F + "#gia-huan"); await pg.waitForTimeout(900);
  const c = await pg.evaluate(() => { const m = document.querySelector(".gh").getBoundingClientRect(), s = document.querySelector(".gh-stele").getBoundingClientRect(); return Math.abs((m.left + m.right) / 2 - (s.left + s.right) / 2); });
  assert.ok(c < 3, "bia chính nằm giữa: " + c);
  assert.strictEqual(await pg.locator(".gh-bia").count(), 10);
  assert.deepStrictEqual(errs, []); console.log("✔ v1.43"); await b.close(); })().catch(e => { console.error("✘", e.message); process.exit(1); });
