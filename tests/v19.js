// v1.19: hiện trạng, người an táng, nhắc giỗ (.ics có báo trước), Excel khứ hồi lăng mộ
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => { const b = await chromium.launch(), pg = await (await b.newContext({ acceptDownloads: true, viewport: { width: 1100, height: 900 } })).newPage(), errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await pg.goto("file://" + path.resolve(__dirname, "../dist/_khung_thu.html") + "#ban-do"); await pg.waitForTimeout(500);
  const ids = await pg.evaluate(() => { const S = GP.store, d = S.S.data, dead = d.persons.filter(p => p.con_song === false && p.gio_ngay_am).slice(0, 2).map(p => p.id); const s = d.sites[0]; S.saveRow("sites", { id: s.id, nguoi_an_tang: dead, hien_trang: "can_tu_sua" }); return { dead, site: s.id }; });
  await pg.evaluate(() => GP.ui.rerender()); await pg.waitForTimeout(200);
  await pg.click('[data-act="map-sel"][data-id="' + ids.site + '"]'); await pg.waitForTimeout(200);
  assert(await pg.locator(".buried li").count() === 2, "liệt kê người an táng");
  assert((await pg.locator(".mapd .chips").innerText()).includes("Cần tu sửa"), "huy hiệu hiện trạng");
  const ics = await pg.evaluate(id => { const U = GP.ui, p = GP.store.byId(id), td = U.today(); const it = GP.io.upcoming([p], td, [td[0], td[1], td[2] + 2], {}).filter(i => i.loai === "gio"); return GP.io.toIcs(it, i => "Giỗ " + U.nameOf(i.id), "x", U.icsOpts()); }, ids.dead[0]);
  assert(/BEGIN:VALARM[\s\S]*TRIGGER:-P7D/.test(ics) && /LOCATION:/.test(ics), "ics có nhắc trước và địa điểm");
  await pg.evaluate(id => { location.hash = "#nguoi-" + id; }, ids.dead[0]); await pg.waitForTimeout(300);
  assert(await pg.locator('[data-act="map-go"]').count() >= 1 && await pg.locator('[data-act="gio-ics"]').count() === 1, "hồ sơ có link mộ + nút nhắc giỗ");
  const rt = await pg.evaluate(async () => { const d = GP.store.S.data, imp = GP.xlsx.toImport(await GP.xlsx.parse(GP.xlsx.build(d.persons, d.spouses, d.sites, {}).buffer)); const s = imp.sites[0]; return { at: s.nguoi_an_tang.length, ht: s.hien_trang }; });
  assert.strictEqual(rt.at, 2); assert.strictEqual(rt.ht, "can_tu_sua");
  assert.deepStrictEqual(errs, []); console.log("✔ lăng mộ: hiện trạng, người an táng, nhắc giỗ, Excel khứ hồi"); await b.close(); })().catch(e => { console.error("✘", e.message); process.exit(1); });
