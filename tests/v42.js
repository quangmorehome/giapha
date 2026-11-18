// v1.46.1: lướt qua nhiều trang rồi quay lại Sơ đồ / Tư duy / Bong bóng không bị đẩy lệch khung
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => { const b = await chromium.launch(), F = "file://" + path.resolve(__dirname, "../dist/_khung_thu.html");
  for (const [w, h] of [[1300, 900], [390, 800]]) {
    const pg = await (await b.newContext({ viewport: { width: w, height: h } })).newPage(); await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
    await pg.goto(F + "#so-do"); await pg.waitForTimeout(800);
    for (let i = 0; i < 3; i++) for (const hh of ["#mindmap", "#cay-song", "#bong-bong", "#so-do"]) {
      await pg.evaluate(x => { const a = document.querySelector("a.dg-a"); if (a) GP.ui.lastPerson = decodeURIComponent(a.getAttribute("href").replace("#nguoi-", "")); location.hash = x; }, hh); await pg.waitForTimeout(650);
      if (hh === "#cay-song") continue;
      const r = await pg.evaluate(() => { const g = document.querySelector("g.vp"), bx = document.querySelector("#dgbox").getBoundingClientRect(), a = g.getBoundingClientRect(); return [a.left - bx.left, bx.right - a.right, a.top - bx.top, bx.bottom - a.bottom]; });
      assert.ok(r.every(v => v >= -12), hh + " @" + w + " lần " + i + " lệch " + r.map(Math.round));
    } }
  console.log("✔ v1.46.1"); await b.close(); })().catch(e => { console.error("✘", e.message); process.exit(1); });
