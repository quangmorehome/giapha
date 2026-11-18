// v1.47.0: Quản trị sửa Đời → hậu duệ tự dời theo
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => { const b = await chromium.launch(), F = "file://" + path.resolve(__dirname, "../dist/_khung_thu.html");
  const pg = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage(); await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await pg.goto(F + "#danh-sach"); await pg.waitForTimeout(800);
  const r = await pg.evaluate(() => {
    const S = GP.store, P = S.S.data.persons;
    const root = P.find(p => (GP.ui.descIds(p.id).length >= 2) && GP.ui.gen(p));
    const ids = GP.ui.descIds(root.id), before = ids.map(i => GP.ui.gen(S.byId(i))), g0 = GP.ui.gen(root);
    location.hash = "#sua-" + root.id; return { id: root.id, g0, n: ids.length, before };
  });
  await pg.waitForTimeout(500);
  await pg.fill('#pform [name=the_thu]', String(r.g0 + 2));
  await pg.evaluate(() => document.querySelector("#pform").requestSubmit()); await pg.waitForTimeout(600);
  if (await pg.$("#pform")) { await pg.evaluate(() => document.querySelector("#pform").requestSubmit()); await pg.waitForTimeout(600); }
  const a = await pg.evaluate(o => GP.ui.descIds(o.id).map(i => GP.ui.gen(GP.store.byId(i))), r);
  assert.deepStrictEqual(a, r.before.map(v => v + 2), "hậu duệ dời +2: " + a + " vs " + r.before);
  console.log("✔ v1.47.0 sửa đời dây chuyền (" + r.n + " người)"); await b.close(); })().catch(e => { console.error("✘", e.message); process.exit(1); });
