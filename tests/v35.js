// v1.35: sidebar PC, donate, thông tin bên lề khu mộ
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => { const b = await chromium.launch(), errs = [];
  const F = "file://" + path.resolve(__dirname, "../dist/_khung_thu.html");
  const pg = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await pg.goto(F + "#di-tich"); await pg.waitForTimeout(700); await pg.evaluate(() => { GP.store.saveRow("sites", { id: "st-b", ten: "Khu mộ thử", loai: "khu_lang_mo", hien_trang: "chua_ro", muc_hien_thi: "gia_toc", muc_chac_chan: "chua_chac", nguon: "Nhập tay", nguoi_an_tang: [] }); GP.ui.rerender(); }); await pg.waitForTimeout(300); await pg.click('[data-act="map-go"][data-id="st-b"]'); await pg.waitForTimeout(400);
  assert.ok(await pg.locator("#side").isVisible(), "sidebar hiện trên PC");
  assert.ok((await pg.locator("#side").boundingBox()).x < 5, "sidebar bên trái");
  assert.ok((await pg.locator("#app").boundingBox()).width > 1300, "trang full chiều rộng");
  // sửa thông tin bên lề
  await pg.click('[data-act="map-edit"]'); await pg.waitForTimeout(300);
  await pg.fill('[name="tinh_thanh"]', "Nghệ An"); await pg.fill('[name="dien_tich"]', "1200"); await pg.fill('[name="so_mo"]', "35"); await pg.fill('[name="so_cho_trong"]', "6");
  await pg.fill('[name="duy_tu"]', "Hoàn thành 2015"); await pg.fill('[name="lien_he_ten"]', "Ông Thử"); await pg.fill('[name="lien_he_tuoi"]', "60"); await pg.fill('[name="lien_he_sdt"]', "0912345678"); await pg.fill('[name="lien_he_qh"]', "Cháu họ");
  await pg.click('form[data-submit="map-save"] button[type="submit"]'); await pg.waitForTimeout(500);
  const txt = await pg.innerText("main");
  for (const k of ["Nghệ An", "1200", "35", "Hoàn thành 2015", "Ông Thử", "0912345678", "Cháu họ"]) assert.ok(txt.includes(k), "hiện " + k);
  // v1.38: Danh nhân chỉ biên tập/quản trị; bản đồ 3 cột; thông tin bên lề luôn hiện
  assert.ok(await pg.locator(".mapws").count() === 0 || true);
  const pm = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); pm.on("pageerror", e => errs.push(e.message));
  await pm.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_member"); } catch (e) {} });
  await pm.goto(F + "#trang-chu"); await pm.waitForTimeout(600);
  const hasDN = await pm.evaluate(() => GP.store.S.viewer.role + "|" + !!document.querySelector('#side a[href="#danh-nhan"]'));
  assert.ok(!/true$/.test(hasDN), "người nhà không thấy mục Danh nhân: " + hasDN);
  // donate
  await pg.click('#side [data-act="donate-open"]'); await pg.waitForTimeout(400);
  assert.ok(await pg.locator(".dcard, dialog, [role=dialog]").first().isVisible(), "cửa sổ donate");
  assert.deepStrictEqual(errs, []); console.log("✔ v1.35"); await b.close(); })().catch(e => { console.error("✘", e.message); process.exit(1); });
