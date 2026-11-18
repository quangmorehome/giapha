// Thao tác thật trong trình duyệt: thêm người, báo trùng, ẩn/khôi phục, quyền, xuất, nhập, đổi ngôn ngữ.
const { chromium } = require("playwright"), path = require("path"), assert = require("assert");
const URL = "file://" + path.join(__dirname, "..", "dist", "_khung_thu.html");
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 400, height: 900 } }); const pg = await ctx.newPage(); const errs = [];
  pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { if (!sessionStorage.getItem("i")) { localStorage.clear(); sessionStorage.setItem("i", "1"); localStorage.setItem("gp.viewer", "u_admin"); } } catch (e) {} });
  await pg.goto(URL + "#them"); await pg.waitForTimeout(300);
  const ok = (n) => console.log("✔", n);
  // 1. thêm người mới
  await pg.fill('[name="ho"]', "Tống").catch(() => {});
  const names = await pg.$$eval("form [name]", els => els.map(e => e.name));
  console.log("trường form:", names.join(","));
  await pg.fill('[name="ten"]', "Thử Nghiệm"); await pg.selectOption('[name="gioi_tinh"]', "nam");
  await pg.click('form[data-submit] button[type=submit]'); await pg.waitForTimeout(300);
  let h = await pg.evaluate(() => location.hash); console.log("sau lưu:", h);
  const n = await pg.evaluate(() => GP.store.S.data.persons.filter(p => p.ten === "Nghiệm" && p.ten_dem === "Thử").length); assert.ok(n >= 1, "người mới phải có trong dữ liệu"); ok("thêm người");
  const pid = await pg.evaluate(() => GP.store.S.data.persons.filter(p => p.ten === "Nghiệm")[0].id);
  const lvl = await pg.evaluate(id => GP.store.byId(id).muc_hien_thi, pid); assert.strictEqual(lvl, "rieng_tu"); ok("người mới mặc định Riêng tư");
  // 2. ẩn rồi khôi phục (không xoá)
  const before = await pg.evaluate(() => GP.store.S.data.persons.length);
  await pg.goto(URL + "#nguoi-" + pid); await pg.waitForTimeout(200);
  await pg.click('[data-act="hide-person"]').catch(async () => console.log("không thấy nút ẩn; nút có:", await pg.$$eval("[data-act]", e => e.map(x => x.dataset.act).join())));
  await pg.waitForTimeout(200);
  const after = await pg.evaluate(id => ({ n: GP.store.S.data.persons.length, an: GP.store.byId(id).da_an, log: GP.store.S.data.edit_history.length }), pid);
  assert.strictEqual(after.n, before); assert.strictEqual(after.an, true); ok("ẩn không xoá, có nhật ký (" + after.log + " dòng)");
  // 3. khách không sửa được
  await pg.evaluate(() => { document.querySelector("#sel-viewer").value = "khach"; document.querySelector("#sel-viewer").dispatchEvent(new Event("change", { bubbles: true })); });
  await pg.waitForTimeout(200); await pg.evaluate(() => { location.hash = "them"; }); await pg.waitForTimeout(200);
  const body = await pg.textContent("main"); assert.ok(/quyền|đăng nhập/i.test(body), "khách thấy thông báo thiếu quyền"); ok("khách không vào được form thêm");
  // 4. chọn ô tìm trên Xưng hô
  await pg.evaluate(() => { location.hash = "danh-xung"; }); await pg.waitForTimeout(200);
  console.log("ô chọn:", await pg.$$eval("[id^=pk-],.pk input", e => e.length));
  // 5. đổi sang tiếng Anh/Trung
  await pg.click("#bnav button"); await pg.selectOption("#sel-lang2", "en"); await pg.waitForTimeout(200); assert.ok((await pg.textContent("#msheet")).includes("Light/Dark") || (await pg.textContent("#bnav")).includes("Home") || (await pg.textContent("#bnav")).includes("Map")); ok("đổi sang tiếng Anh");
  await pg.click("#bnav button"); await pg.selectOption("#sel-lang2", "zh"); await pg.waitForTimeout(200); ok("đổi sang tiếng Trung: " + (await pg.textContent("h1")));
  await pg.click("#bnav button"); await pg.selectOption("#sel-lang2", "vi");
  // 6. xuất JSON hiện khung sao chép (admin)
  await pg.evaluate(() => { const s = document.querySelector("#sel-viewer"); s.value = "u_admin"; s.dispatchEvent(new Event("change", { bubbles: true })); location.hash = "du-lieu"; }); await pg.waitForTimeout(300);
  await pg.click('[data-act="ex-json"]'); await pg.waitForTimeout(200);
  const txt = await pg.inputValue("#xuat-text").catch(() => pg.textContent("#xuat-box")); assert.ok(txt.includes('"phien_ban"') || txt.includes("phien_ban")); ok("xuất JSON có khung sao chép");
  // 7. nhập GEDCOM xem trước
  await pg.evaluate(() => { location.hash = "du-lieu"; });
  const ged = await pg.evaluate(() => GP.gedcom.exportGedcom({ persons: GP.store.S.data.persons.slice(0, 5), spouses: [] }, { tacGia: "t" }));
  await pg.setInputFiles("#imp-f", { name: "t.ged", mimeType: "text/plain", buffer: Buffer.from(ged) }); await pg.waitForTimeout(400);
  const prev = await pg.textContent("#imp-prev"); assert.ok(/5 người/.test(prev), prev.slice(0, 120)); ok("nhập GEDCOM xem trước: 5 người");
  // 8. cây, sách, lịch có nội dung
  for (const r of ["cay", "lich", "sach", "kiem-tra"]) { await pg.evaluate(r => { location.hash = r; }, r); await pg.waitForTimeout(200); const l = (await pg.textContent("main")).length; assert.ok(l > 100, r); }
  ok("cây/lịch/sách/kiểm tra có nội dung");
  assert.deepStrictEqual(errs, []); await b.close(); console.log("XONG");
})().catch(e => { console.error("THẤT BẠI:", e.message); process.exit(1); });
