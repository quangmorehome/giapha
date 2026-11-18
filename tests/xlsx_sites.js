// Địa điểm: xuất rồi nhập lại phải khớp từng trường (kể cả tảo mộ, giờ thăm viếng, năm xây, loại mới)
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => { const b = await chromium.launch(), pg = await (await b.newContext()).newPage(), errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await pg.goto("file://" + path.resolve(__dirname, "../dist/_khung_thu.html") + "#du-lieu"); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async () => {
    const sites = [{ ten: "Khu mộ A", loai: "khu_lang_mo", dia_chi: "xã X", hien_trang: "xuong_cap", lien_he: "Ông B", duong_di: "rẽ trái", map_link: "https://www.google.com/maps?q=10.5,106.5", tao_mo: ["thanh_minh", "chap"], tao_mo_tuy: "10/3", gio_tham_vieng: "6h-17h", nam_xay: "1998" },
      { ten: "Nhà riêng C", loai: "nha_cu", tao_mo: [] }, { ten: "Chùa D", loai: "chua_dinh", tao_mo: ["chap"] }];
    const u8 = GP.xlsx.build([], [], sites, {}), imp = GP.xlsx.toImport(await GP.xlsx.parse(u8.buffer)); return imp.sites; });
  assert.strictEqual(r.length, 3); const a = r[0];
  assert.deepStrictEqual([a.ten, a.loai, a.hien_trang, a.tao_mo_tuy, a.gio_tham_vieng, a.nam_xay], ["Khu mộ A", "khu_lang_mo", "xuong_cap", "10/3", "6h-17h", "1998"]); assert.deepStrictEqual(a.tao_mo, ["thanh_minh", "chap"]);
  assert.ok(a.map_xn && Math.abs(a.vi_do - 10.5) < 1e-9, "link Google Maps ra toạ độ"); assert.strictEqual(r[1].loai, "nha_cu"); assert.strictEqual(r[2].loai, "chua_dinh"); assert.deepStrictEqual(r[2].tao_mo, ["chap"]);
  assert.deepStrictEqual(errs, []); console.log("✔ địa điểm: xuất xlsx → nhập lại khớp"); await b.close(); })().catch(e => { console.error("✘", e.message); process.exit(1); });
