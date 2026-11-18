const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => { const b = await chromium.launch(), errs = [];
  for (const role of ["khach", "u_admin"]) { const pg = await (await b.newContext({ viewport: { width: 1000, height: 900 } })).newPage(); pg.on("pageerror", e => errs.push(e.message));
    await pg.addInitScript(r => { try { localStorage.setItem("gp.viewer", r); } catch (e) {} }, role);
    await pg.goto("file://" + path.resolve(__dirname, "../dist/_khung_thu.html") + "#bai-viet"); await pg.waitForTimeout(500);
    const txt = await pg.innerText("main"); assert(/Quy ước dòng họ Tống/.test(txt) && /Quy chế Hội đồng/.test(txt) && /tế lễ hàng năm/.test(txt), role + ": đủ 3 văn bản");
    assert((await pg.locator(".arts .chip, .arts .badge").filter({ hasText: "Sưu tầm" }).count()) >= 3, "nhãn Sưu tầm ở danh sách");
    await pg.evaluate(() => { location.hash = "#bai-vb-te-le"; }); await pg.waitForTimeout(300);
    assert(/Nguồn:\s*Sưu tầm/.test(await pg.innerText("article")) && await pg.locator("article ol li").count() >= 30 && await pg.locator("article h2").count() >= 2, "bài tế lễ: nguồn + danh sách 33 bước + tiêu đề");
    if (role === "u_admin") { await pg.evaluate(() => { const S = GP.store; S.deleteRow ? 0 : 0; GP.store.S.data.articles = GP.store.S.data.articles.filter(a => a.id !== "vb-quy-uoc-ct"); }); await pg.evaluate(() => { location.hash = "#bai-viet"; }); await pg.waitForTimeout(300); assert(!/Quy ước dòng họ Tống/.test(await pg.innerText("main")), "xoá rồi không nạp lại"); }
  }
  assert.deepStrictEqual(errs, []); console.log("✔ văn bản dòng họ (sưu tầm) hiển thị đúng"); await b.close(); })().catch(e => { console.error("✘", e.message); process.exit(1); });
