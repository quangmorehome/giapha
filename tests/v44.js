// v1.47.0: Lịch — bấm ngày ra thiệp theo dịp (sinh nhật, giỗ, lễ), nhiều người chọn từng người
const { chromium } = require("playwright"), assert = require("assert"), path = require("path"), fs = require("fs");
(async () => { const b = await chromium.launch(), F = "file://" + path.resolve(__dirname, "../dist/_khung_thu.html"), out = process.env.SHOTS || "";
  const errs = []; const pg = await (await b.newContext({ viewport: { width: 1100, height: 900 } })).newPage(); pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await pg.goto(F + "#lich"); await pg.waitForTimeout(800);
  const seen = {};
  for (let m = 0; m < 14 && Object.keys(seen).length < 3; m++) {
    const days = await pg.evaluate(() => [...document.querySelectorAll(".cd[data-d]")].map(b => ({ d: b.dataset.d, c: b.className })));
    for (const x of days) {
      if (!/has-(gio|sinh|le)/.test(x.c)) continue;
      await pg.click('.cd[data-d="' + x.d + '"]'); await pg.waitForTimeout(150);
      const occ = await pg.getAttribute(".calpop", "data-occ"); const btn = await pg.$(".cp-cb");
      if (btn && !seen[occ]) { await btn.click(); await pg.waitForTimeout(300); const ok = await pg.evaluate(() => { const c = document.getElementById("cc-cv"); return c && c.width === 1080 && c.getContext("2d").getImageData(540, 540, 1, 1).data[3] > 0; }); assert.ok(ok, "canvas vẽ được " + occ); seen[occ] = 1;
        if (out) { fs.mkdirSync(out, { recursive: true }); await (await pg.$(".cc")).screenshot({ path: out + "/cc-" + occ + ".png" }); }
        await pg.click('.cc [data-act="cc-close"].btn'); await pg.waitForTimeout(100); }
      await pg.keyboard.press("Escape");
    }
    await pg.click('[data-act="cal-next"]'); await pg.waitForTimeout(150);
  }
  assert.ok(Object.keys(seen).length >= 2, "thấy ≥2 loại dịp: " + Object.keys(seen));
  assert.deepStrictEqual(errs, [], errs.join("; "));
  console.log("✔ v1.47.0 thiệp theo dịp:", Object.keys(seen).join(",")); await b.close(); })().catch(e => { console.error("✘", e.message); process.exit(1); });
