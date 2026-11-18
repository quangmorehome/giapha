// Sửa hồ sơ rồi lưu phải còn sau khi tải lại (admin + biên tập), kể cả hồ sơ cũ thiếu ô mới
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => {
  const b = await chromium.launch();
  for (const role of ["u_admin", "u_editor"]) {
    const pg = await (await b.newContext({ viewport: { width: 1000, height: 900 } })).newPage(), errs = []; pg.on("pageerror", e => errs.push(e.message));
    await pg.addInitScript(r => { try { if (!sessionStorage.getItem("x")) { localStorage.setItem("gp.viewer", r); sessionStorage.setItem("x", "1"); } } catch (e) {} }, role);
    await pg.goto("file://" + path.join(__dirname, "..", "dist", "_khung_thu.html") + "#danh-sach"); await pg.waitForTimeout(400);
    const id = await pg.evaluate(() => { const p = GP.store.S.data.persons.filter(p => GP.privacy.canEdit(p, GP.store.S.viewer))[0]; delete p.vai; delete p.nghe; return p.id; });
    await pg.evaluate(i => { location.hash = "#sua-" + i; }, id); await pg.waitForTimeout(400);
    await pg.fill("[name=nghe]", "Thợ thử"); await pg.fill("[name=noi_sinh]", "Nơi thử"); await pg.click("#pform button[type=submit]"); await pg.waitForFunction(i => location.hash === "#nguoi-" + i, id, { timeout: 5000 }).catch(() => {});
    if (await pg.evaluate(() => location.hash) !== "#nguoi-" + id) console.log("DBG", await pg.evaluate(() => (document.getElementById("f-err") || {}).innerText + "|" + ((document.getElementById("toast") || {}).textContent)));
    assert.strictEqual(await pg.evaluate(() => location.hash), "#nguoi-" + id, role + ": sau lưu về hồ sơ");
    await pg.reload(); await pg.waitForFunction(() => window.GP && GP.store && GP.store.S.data); await pg.waitForTimeout(300);
    assert.strictEqual(await pg.evaluate(i => GP.store.byId(i).nghe, id), "Thợ thử", role + ": còn sau khi tải lại"); assert.deepStrictEqual(errs, []);
    console.log("✔ sửa & lưu còn nguyên:", role);
  }
  await b.close();
})().catch(e => { console.error("✘", e.message); process.exit(1); });
