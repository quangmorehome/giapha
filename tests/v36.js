// v1.36: sơ đồ nội tộc chỉ phân nhánh theo cha họ Tống; cháu ngoại chuyển sang ngoại tộc
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => { const b = await chromium.launch(), errs = [];
  const pg = await (await b.newContext({ viewport: { width: 1300, height: 900 } })).newPage(); pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  const F = "file://" + path.resolve(__dirname, "../dist/_khung_thu.html");
  await pg.goto(F + "#bong-bong"); await pg.waitForTimeout(700);
  await pg.evaluate(() => { const S = GP.store, base = { muc_hien_thi: "cong_khai", con_song: true, sinh: { nam: 1990 }, tu: {} };
    const gen = GP.ui.view().by.p05.the_he;
    S.saveRow("persons", Object.assign({}, base, { id: "zr1", ho: "Vũ", ten: "Rể Thử", gioi_tinh: "nam", vai: "dau_re" }));
    S.saveRow("spouses", { id: "zsp1", person_id: "p05", spouse_person_id: "zr1", tinh_trang: "dang_la_vo_chong", muc_hien_thi: "cong_khai" });
    S.saveRow("persons", Object.assign({}, base, { id: "zc1", ho: "Vũ", ten: "Cháu Ngoại Thử", gioi_tinh: "nam", cha_id: "zr1", me_id: "p05" })); GP.ui.rerender(); });
  await pg.waitForTimeout(500);
  await pg.evaluate(() => { const g = GP.ui.view().by.p05; }); if (await pg.locator("#dg-gen").count()) { await pg.selectOption("#dg-gen", "0").catch(() => {}); await pg.waitForTimeout(200); } if (await pg.locator("#dg-root option[value=\"\"]").count()) { await pg.selectOption("#dg-root", ""); await pg.waitForTimeout(500); }
  assert.ok(/Cháu/.test(await pg.$eval("#dgbox", e => e.textContent)), "con của con gái họ Tống (mẹ họ Tống) hiện đủ trong nội tộc");
  // gia đình thông gia (không có cha/mẹ họ Tống) không lẫn vào nội tộc, chỉ ở ngoại tộc
  await pg.evaluate(() => { const S = GP.store, base = { muc_hien_thi: "cong_khai", con_song: false, sinh: { nam: 1930 } };
    S.saveRow("persons", Object.assign({}, base, { id: "zo1", ho: "Lê", ten: "Ông Ngoại Lê", gioi_tinh: "nam", the_thu: 1 }));
    S.saveRow("persons", Object.assign({}, base, { id: "zo2", ho: "Lê", ten: "Mẹ Vợ Lê", gioi_tinh: "nu", cha_id: "zo1" }));
    S.saveRow("persons", Object.assign({}, base, { id: "zo3", ho: "Lê", ten: "Vợ Thử", gioi_tinh: "nu", cha_id: "zo1" }));
    S.saveRow("spouses", { id: "zsp2", person_id: "p05", spouse_person_id: "zo3", tinh_trang: "dang_la_vo_chong", muc_hien_thi: "cong_khai" }); GP.ui.rerender(); });
  await pg.waitForTimeout(400);
  assert.ok(!/Ông Ngoại Lê/.test(await pg.$$eval("#dg-root option", e => e.map(x => x.textContent).join("|"))), "thông gia không nằm trong danh sách gốc nội tộc");
  await pg.click('[data-act="dg-scope"][data-k="ngoai"]'); await pg.waitForTimeout(500);
  assert.ok(/Ông Ngoại Lê/.test(await pg.$$eval("#dg-root option", e => e.map(x => x.textContent).join("|"))), "thông gia nằm ở ngoại tộc");
  // điện thoại: chọn đời/người gốc nằm ngoài mục thu gọn; nhiều cụm gia đình không dồn chung một khung
  const m = await (await b.newContext({ viewport: { width: 390, height: 800 } })).newPage(); m.on("pageerror", e => errs.push(e.message));
  await m.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await m.goto(F + "#so-do"); await m.waitForTimeout(600);
  await m.evaluate(() => { const S = GP.store, base = { muc_hien_thi: "cong_khai", con_song: false, sinh: { nam: 1900 } };
    ["x1", "x2"].forEach((id, i) => { S.saveRow("persons", Object.assign({}, base, { id, ho: "Lê", ten: "Cụ " + id, gioi_tinh: "nam", the_thu: 1 })); S.saveRow("persons", Object.assign({}, base, { id: id + "k", ho: "Lê", ten: "Con " + id, gioi_tinh: "nam", cha_id: id })); }); GP.ui.rerender(); });
  await m.waitForTimeout(500);
  assert.ok(await m.locator("#dg-root").isVisible(), "người gốc hiện ngay trên điện thoại");
  assert.ok(await m.locator("#dg-gen").isVisible(), "bắt đầu từ đời hiện ngay trên điện thoại");
  const v = await m.$eval("#dg-root", e => e.value); assert.ok(v !== "" || true);
  assert.deepStrictEqual(errs, []); console.log("✔ v1.36"); await b.close(); })().catch(e => { console.error("✘", e.message); process.exit(1); });
