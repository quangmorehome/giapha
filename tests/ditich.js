// Di tích: "Thêm/Sửa" mở form đầy đủ (không hiện mã chữ thô); khung bản đồ chiếm đủ chiều rộng
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => { const b = await chromium.launch(), pg = await b.newPage({ viewport: { width: 1366, height: 850 } }), errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  const F = "file://" + path.resolve(__dirname, "../dist/_khung_thu.html");
  await pg.goto(F + "#di-tich"); await pg.waitForTimeout(600); await pg.click('[data-act="row-new"]'); await pg.waitForTimeout(600);
  assert.strictEqual(await pg.evaluate(() => location.hash), "#ban-do"); const tx = await pg.textContent("main"); assert.ok(!/\brf\.[a-z_]+/.test(tx), "không hiện mã chữ thô"); assert.ok(await pg.$("#m-map_link"), "form có ô link Google Maps");
  await pg.evaluate(() => { GP.store.saveRow("sites", { id: "st-th", ten: "Mộ thử", loai: "mo", dia_chi: "Đà Nẵng", hien_trang: "chua_ro", muc_hien_thi: "gia_toc", muc_chac_chan: "chua_chac", nguon: "Nhập tay", nguoi_an_tang: [] }); location.hash = "#di-tich"; GP.ui.rerender(); }); await pg.waitForTimeout(600); await pg.click('[data-act="map-go"][data-id="st-th"]'); await pg.waitForTimeout(400);
  const w = await pg.$eval(".mapbig iframe", e => e.getBoundingClientRect().width), W = await pg.$eval(".mapbig", e => e.getBoundingClientRect().width); assert.ok(w > W * 0.9, "khung bản đồ rộng gần hết thẻ: " + w + "/" + W);
  await pg.goto(F + "#di-tich"); await pg.waitForTimeout(500); await pg.click('[data-act="row-edit"]'); await pg.waitForTimeout(500); assert.ok(await pg.$("#m-ten"), "Sửa mở form đầy đủ");
  assert.deepStrictEqual(errs, []); console.log("✔ di tích: thêm/sửa dùng form đầy đủ, bản đồ rộng"); await b.close(); })().catch(e => { console.error("✘", e.message); process.exit(1); });
