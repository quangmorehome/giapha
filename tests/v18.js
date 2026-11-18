// v1.18: xoá/ẩn trong form sửa, chọn con đã có, tự nối, danh sách theo gia đình, logo về trang chủ
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => {
  const b = await chromium.launch();
  const open = async role => { const pg = await (await b.newContext({ viewport: { width: 990, height: 900 } })).newPage(); pg.errs = []; pg.on("pageerror", e => pg.errs.push(e.message));
    await pg.addInitScript(r => { try { if (!sessionStorage.getItem("x")) { localStorage.setItem("gp.viewer", r); sessionStorage.setItem("x", "1"); } } catch (e) {} }, role);
    await pg.goto("file://" + path.join(__dirname, "..", "dist", "_khung_thu.html") + "#danh-sach"); await pg.waitForTimeout(400); return pg; };
  // admin: nút xoá trong form sửa
  let pg = await open("u_admin");
  const id = await pg.evaluate(() => GP.store.S.data.persons.filter(p => !p.cha_id && !p.me_id && GP.privacy.canEdit(p, GP.store.S.viewer))[0].id);
  await pg.evaluate(i => { location.hash = "#sua-" + i; }, id); await pg.waitForTimeout(300);
  assert(await pg.locator("#pform .delbtn[data-act=row-del]").count() === 1, "admin thấy nút xoá");
  // chọn con đã có
  const r = await pg.evaluate(() => { const S = GP.store, P = S.S.data.persons; const par = P.find(p => p.gioi_tinh === "nam" && !p.da_an); const c = S.addPerson({ ho: "Tống", ten: "Mồ côi", gioi_tinh: "nam" }); return { par: par.id, c: c.id || c }; });
  await pg.evaluate(i => { location.hash = "#nguoi-" + i; }, r.par); await pg.waitForTimeout(300);
  await pg.click("[data-act=child-pick]"); await pg.waitForTimeout(200);
  assert(await pg.locator("#cp-s option", { hasText: "Mồ côi" }).count() >= 1, "ứng viên có người chưa cha");
  await pg.fill("#cp-q", "mo coi"); await pg.waitForTimeout(150);
  await pg.selectOption("#cp-s", r.c); await pg.click("#sp-form button[type=submit]"); await pg.waitForTimeout(300);
  if (await pg.evaluate(c => GP.store.byId(c).cha_id, r.c) !== r.par) console.log("DBG", r, await pg.evaluate(() => (document.getElementById("toast")||{}).textContent), await pg.evaluate(c => JSON.stringify(GP.store.byId(c)), r.c));
  assert.strictEqual(await pg.evaluate(c => GP.store.byId(c).cha_id, r.c), r.par, "đã nối cha");
  // tự nối: con có cha và mẹ → cha mẹ thành vợ chồng
  const ok = await pg.evaluate(() => { const S = GP.store, a = S.addPerson({ ho: "Tống", ten: "Cha thử", gioi_tinh: "nam" }), m = S.addPerson({ ho: "Lê", ten: "Mẹ thử", gioi_tinh: "nu" }); const A = a.id || a, M = m.id || m; S.addPerson({ ho: "Tống", ten: "Con thử", gioi_tinh: "nam", cha_id: A, me_id: M }); return S.S.data.spouses.some(s => !s.da_an && ((s.person_id === A && s.spouse_person_id === M) || (s.person_id === M && s.spouse_person_id === A))); });
  assert(ok, "tự nối vợ chồng từ hồ sơ con");
  // danh sách: Tất cả không có tiêu đề nội/ngoại, lọc ngoại thì có
  await pg.evaluate(() => { location.hash = "#danh-sach"; }); await pg.waitForTimeout(300);
  const heads = () => pg.evaluate(() => document.querySelectorAll(".sechead, .sec-head, [data-sec]").length);
  const h0 = await heads(); console.log("tiêu đề mục ở Tất cả:", h0);
  // logo về trang chủ
  await pg.evaluate(() => { location.hash = "#thong-ke"; }); await pg.waitForTimeout(200);
  await pg.click(".brand"); await pg.waitForTimeout(200);
  assert.strictEqual(await pg.evaluate(() => location.hash), "#trang-chu", "logo về trang chủ");
  assert.deepStrictEqual(pg.errs, []); console.log("✔ admin: xoá, chọn con, tự nối, logo");
  // biên tập: nút ẩn thay xoá
  pg = await open("u_editor");
  const e = await pg.evaluate(() => GP.store.S.data.persons.filter(p => GP.privacy.canEdit(p, GP.store.S.viewer))[0].id);
  await pg.evaluate(i => { location.hash = "#sua-" + i; }, e); await pg.waitForTimeout(300);
  assert(await pg.locator("#pform .delbtn[data-act=hide-person]").count() === 1 && await pg.locator("#pform [data-act=row-del]").count() === 0, "biên tập: ẩn, không xoá");
  assert.deepStrictEqual(pg.errs, []); console.log("✔ biên tập: nút ẩn");
  await b.close();
})().catch(e => { console.error("✘", e.message); process.exit(1); });
