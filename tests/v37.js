// v1.38.1: bản đồ ô vuông OSM/Địa hình, không tràn ngang, gỡ người an táng giữ vị trí cuộn
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => { const b = await chromium.launch(), errs = [];
  const pg = await (await b.newContext({ viewport: { width: 1300, height: 800 } })).newPage(); pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await pg.route("**/tile.open*/**", r => r.fulfill({ status: 200, contentType: "image/png", body: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR4nGP4z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==", "base64") }));
  await pg.goto("file://" + path.resolve(__dirname, "../dist/_khung_thu.html") + "#ban-do"); await pg.waitForTimeout(700);
  await pg.evaluate(() => { const S = GP.store, V = GP.ui.view(); const dead = V.list.filter(p => p.con_song === false).slice(0, 3).map(p => p.id);
    S.saveRow("sites", { id: "st-o", ten: "Khu mộ OSM", loai: "khu_lang_mo", hien_trang: "chua_ro", muc_hien_thi: "gia_toc", muc_chac_chan: "chua_chac", nguon: "Nhập tay", vi_do: 18.6, kinh_do: 105.7, dia_chi: "Đức Thọ, Hà Tĩnh", nguoi_an_tang: dead }); GP.ui.rerender(); });
  await pg.waitForTimeout(300); await pg.click('[data-act="map-sel"][data-id="st-o"]'); await pg.waitForTimeout(400);
  await pg.click('[data-act="map-osm"][data-v="osm"]'); await pg.waitForTimeout(500);
  assert.ok(await pg.locator(".tmap .tl-tiles img").count() > 0, "có ô bản đồ OSM");
  assert.ok((await pg.$eval(".tl-tiles img", e => e.src)).includes("tile.openstreetmap.org"), "ô OSM");
  await pg.click('[data-act="map-osm"][data-v="topo"]'); await pg.waitForTimeout(500);
  assert.ok((await pg.$eval(".tl-tiles img", e => e.src)).includes("opentopomap.org"), "ô địa hình");
  assert.ok(/OpenTopoMap/.test(await pg.$eval(".tl-at", e => e.textContent)), "ghi nguồn");
  const ov = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth); assert.ok(ov <= 1, "không tràn ngang " + ov);
  // gỡ người an táng
  const n0 = await pg.locator('[data-act="gan-bo"]').count(); assert.ok(n0 >= 2, "có người an táng gắn tay " + n0);
  await pg.click('[data-act="gan-bo"]'); await pg.waitForTimeout(400);
  assert.strictEqual(await pg.locator('[data-act="gan-bo"]').count(), n0 - 1, "gỡ được từng người");
  await pg.click('[data-act="gan-clear"]'); await pg.click('[data-act="gan-clear"]'); await pg.waitForTimeout(400);
  assert.strictEqual(await pg.locator('[data-act="gan-bo"]').count(), 0, "gỡ tất cả");
  // v1.39: chỉ một nút kiểu bản đồ sáng; lưu link mới thì bỏ vị trí cũ; tỉnh tự nhận; không còn lộ trình / bản đồ chung
  assert.strictEqual(await pg.locator(".mb-seg .segb.on").count(), 1, "chỉ 1 nút bản đồ sáng");
  assert.strictEqual(await pg.locator('[data-act="map-pick"]').count(), 0, "bỏ lộ trình");
  assert.ok(!/Bản đồ chung|lộ trình thăm viếng/i.test(await pg.innerText("main")), "bỏ bản đồ chung/lộ trình");
  await pg.click('[data-act="loc-edit"]'); await pg.waitForTimeout(300);
  await pg.fill('form[data-submit="loc-save"] [name="map_link"]', "https://www.google.com/maps/@16.0471,108.2068,17z"); await pg.fill('form[data-submit="loc-save"] [name="dia_chi"]', "Phường Hải Châu, Đà Nẵng");
  await pg.click('form[data-submit="loc-save"] button[type="submit"]'); await pg.waitForTimeout(400);
  const ns = await pg.evaluate(() => GP.store.S.data.sites.find(x => x.id === "st-o")); assert.ok(Math.abs(ns.vi_do - 16.0471) < 1e-6 && ns.tinh_thanh === "Đà Nẵng", "vị trí mới + tỉnh tự nhận: " + JSON.stringify([ns.vi_do, ns.tinh_thanh]));
  assert.ok(/Đà Nẵng/.test(await pg.innerText(".mw-info")), "tỉnh hiện ở bên lề");
  assert.deepStrictEqual(errs, []); console.log("✔ v1.38.1"); await b.close(); })().catch(e => { console.error("✘", e.message); process.exit(1); });
