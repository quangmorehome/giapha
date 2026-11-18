// Bản đồ theo địa chỉ: liên kết Google Maps/Waze/Apple, lộ trình, sửa địa chỉ, quyền xem, không còn kinh độ/vĩ độ.
const { chromium } = require("playwright"), path = require("path"), assert = require("assert");
const URL = "file://" + path.join(__dirname, "..", "dist", "_khung_thu.html");
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1200, height: 900 } }); const pg = await ctx.newPage(); const errs = [];
  pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { if (!sessionStorage.getItem("i")) { localStorage.clear(); sessionStorage.setItem("i", "1"); localStorage.setItem("gp.viewer", "u_admin"); } } catch (e) {} });
  const ok = (n) => console.log("✔", n);
  await pg.goto(URL + "#ban-do"); await pg.waitForTimeout(500);
  const body = await pg.textContent("main"); assert.ok(!/kinh độ|vĩ độ/i.test(body) && (await pg.locator('[name="vi_do"],[name="kinh_do"]').count()) === 0, "không có ô nhập kinh độ/vĩ độ (chỉ hiển thị tọa độ bên lề)"); ok("trang bản đồ không còn kinh độ/vĩ độ/tọa độ");
  const T = await pg.evaluate(() => { const s = GP.store.S.data.sites[0]; return { q: GP.mapTools.query(s), dir: GP.mapTools.link.dir(s), embed: GP.mapTools.link.embed(s), waze: GP.mapTools.link.waze(s) }; });
  assert.ok(T.dir.startsWith("https://www.google.com/maps/dir/?api=1&destination=") && T.embed.includes("output=embed") && T.waze.includes("waze.com")); ok("liên kết Google Maps / Waze / nhúng theo địa chỉ");
  await pg.click('button[data-act="map-sel"] >> nth=0'); await pg.waitForTimeout(300);
  assert.ok(await pg.$(".mapembed iframe"), "có khung bản đồ nhúng"); const href = await pg.$eval('.mapact a.primary', e => e.href); assert.ok(href.includes("destination=")); ok("chọn địa điểm: có khung bản đồ + nút Chỉ đường");
  // sửa địa chỉ
  await pg.click('[data-act="map-edit"]'); await pg.fill("#m-dia_chi", "Nhà thờ họ Tống, thôn A, xã B, huyện C, tỉnh D"); await pg.click('.mapform button[type=submit]'); await pg.waitForTimeout(300);
  const addr = await pg.evaluate(() => GP.store.S.data.sites[0].dia_chi); assert.ok(addr.startsWith("Nhà thờ họ Tống")); ok("sửa địa chỉ được lưu");
  // khách chỉ thấy địa điểm công khai
  await pg.evaluate(() => { const s = document.querySelector("#sel-viewer"); s.value = "khach"; s.dispatchEvent(new Event("change", { bubbles: true })); }); await pg.waitForTimeout(300);
  const n = await pg.$$eval(".mcard", e => e.length); const pub = await pg.evaluate(() => GP.store.S.data.sites.filter(s => s.muc_hien_thi === "cong_khai" && !s.da_an).length); assert.strictEqual(n, pub); ok("khách chỉ thấy " + n + " địa điểm công khai");
  console.log(errs.length ? "LỖI JS: " + errs.join(" | ") : "XONG"); await b.close(); process.exit(errs.length ? 1 : 0);
})().catch(e => { console.error("THẤT BẠI:", e.message); process.exit(1); });
