const { chromium } = require("playwright"), path = require("path"), assert = require("assert");
const URL = "file://" + path.join(__dirname, "..", "dist", "_khung_thu.html");
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1200, height: 900 }, acceptDownloads: true }); const pg = await ctx.newPage(); const errs = [];
  pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { if (!sessionStorage.getItem("i")) { localStorage.clear(); sessionStorage.setItem("i", "1"); localStorage.setItem("gp.viewer", "u_admin"); } } catch (e) {} });
  const ok = n => console.log("✔", n);
  const fl = async k => { if (!(await pg.isVisible('[data-act=flt][data-k=' + k + ']'))) await pg.click('.fltbar summary'); await pg.click('[data-act=flt][data-k=' + k + ']'); };
  // danh sách: nhóm gia đình + nút thêm + lọc vai trò
  await pg.goto(URL + "#danh-sach"); await pg.waitForTimeout(300);
  assert.ok(await pg.$$eval(".gfam", e => e.length) > 0, "có nhóm gia đình");
  assert.ok(await pg.$$eval(".gfam a[data-act=add-child],.gfam a[data-act=new-blank]", e => e.length) > 0, "có nút thêm thành viên"); ok("danh sách: nhóm gia đình + nút thêm");
  await pg.click(".morefl summary"); await pg.selectOption("#f-vai", "dau"); await pg.waitForTimeout(100); ok("lọc vai trò chạy");
  await pg.selectOption("#f-vai", "");
  // bấm một người → cửa sổ hồ sơ, không đổi trang
  const h0 = await pg.evaluate(() => location.hash);
  await pg.click("a.prow >> nth=1"); await pg.waitForTimeout(200);
  assert.ok(await pg.$("#sheet-bg .sheet-body h1"), "mở cửa sổ hồ sơ");
  assert.strictEqual(await pg.evaluate(() => location.hash), h0, "không đổi trang");
  assert.ok(await pg.$("#sheet-body .fam"), "đủ thông tin gia đình"); ok("danh sách → cửa sổ hồ sơ tại chỗ");
  await pg.keyboard.press("Escape"); await pg.waitForTimeout(150); assert.ok(!(await pg.$("#sheet-bg"))); ok("Esc đóng");
  // cây đã gộp vào sơ đồ: #cay chuyển sang #so-do; bộ lọc ẩn nam làm giảm số thẻ
  await pg.goto(URL + "#cay"); await pg.waitForTimeout(400); assert.strictEqual(await pg.evaluate(() => location.hash), "#so-do"); ok("#cay → sơ đồ");
  const n0 = await pg.$$eval(".mmn", e => e.length); await fl("nam"); await pg.waitForTimeout(150);
  const n1 = await pg.$$eval(".mmn", e => e.length); assert.ok(n1 < n0, "ẩn nam giảm số thẻ " + n0 + "→" + n1); await pg.click("[data-act=flt-reset]"); ok("bộ lọc sơ đồ");
  // sơ đồ
  for (const r of ["so-do", "mindmap", "bong-bong"]) {
    await pg.goto(URL + "#" + r); await pg.waitForTimeout(400);
    const c0 = await pg.$$eval(".mmn", e => e.length);
    await fl('nu'); await pg.waitForTimeout(300); const c1 = await pg.$$eval(".mmn", e => e.length); assert.ok(c1 <= c0, r + " lọc nữ"); await pg.click('[data-act=flt-reset]'); await pg.waitForTimeout(300);
    await pg.click(".mmn a.dg-a >> nth=0", { force: true }); await pg.waitForTimeout(200); assert.ok(await pg.$("#sheet-bg"), r + " → cửa sổ hồ sơ như danh sách"); assert.ok(!(await pg.$(".dgpop")), r + " không còn popup nhỏ"); assert.strictEqual(await pg.evaluate(() => location.hash), "#" + r);
    assert.ok(await pg.isVisible("#sheet-root"), r + " có nút đặt làm gốc"); assert.ok((await pg.$$eval("#sheet-body h1", e => e.length)) > 0, r + " nội dung hồ sơ đầy đủ");
    await pg.keyboard.press("Escape"); await pg.waitForTimeout(150); assert.ok(!(await pg.$("#sheet-bg")), r + " Esc đóng");
    let rid = null; const n = await pg.$$eval(".mmn a.dg-a", e => e.length);
    for (let i = 1; i < n && !rid; i++) { await pg.evaluate(k => document.querySelectorAll(".mmn a.dg-a")[k].dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true })), i); await pg.waitForTimeout(150); if (await pg.isVisible("#sheet-root")) rid = await pg.getAttribute("#sheet-root", "data-id"); else await pg.keyboard.press("Escape"); }
    assert.ok(rid, r + " có người đặt gốc được"); await pg.click("#sheet-root"); await pg.waitForTimeout(400);
    assert.ok(!(await pg.$("#sheet-bg")), r + " đặt gốc đóng cửa sổ"); assert.strictEqual(await pg.$eval("#dg-root", e => e.value), rid, r + " gốc đã đổi"); await pg.selectOption("#dg-root", { index: 0 }); await pg.waitForTimeout(300);
    const [d] = await Promise.all([pg.waitForEvent("download", { timeout: 4000 }).catch(() => null), pg.click('[data-act=svg-dg]')]); assert.ok(d, r + " tải svg"); assert.match(d.suggestedFilename(), /\.svg$/);
    const [d2] = await Promise.all([pg.waitForEvent("download", { timeout: 6000 }).catch(() => null), pg.click('[data-act=png-dg]')]); assert.ok(d2, r + " tải png");
    ok("sơ đồ " + r);
  }
  // hồ sơ có mục Dâu/Rể + xuất
  const pid = await pg.evaluate(() => { const V = GP.ui.view(); const p = V.list.filter(x => GP.ui.childrenAll(x.id).some(c => GP.ui.spousesOf(c.id).length))[0]; return p && p.id; });
  if (pid) { await pg.goto(URL + "#nguoi-" + pid); await pg.waitForTimeout(300); assert.ok((await pg.textContent("#main")).includes("Dâu / Rể"), "mục Dâu / Rể"); ok("hồ sơ có mục Dâu / Rể"); }
  // xuất các trang
  const dl = async (route, act) => { await pg.goto(URL + "#" + route); await pg.waitForTimeout(300); const [d] = await Promise.all([pg.waitForEvent("download", { timeout: 4000 }).catch(() => null), pg.click('[data-act=' + act + ']')]); assert.ok(d, route + " xuất " + act); return d; };
  await dl("danh-sach", "csv-ds"); await dl("thong-ke", "csv-tk"); await dl("di-tich", "csv-dt"); await dl("lich", "ics"); if (pid) await dl("nguoi-" + pid, "txt-nguoi");
  ok("xuất file các trang");
  // điện thoại
  const m = await b.newContext({ viewport: { width: 390, height: 780 } }); const mp = await m.newPage(); await mp.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await mp.goto(URL + "#danh-sach"); await mp.waitForTimeout(300); await mp.click("a.prow >> nth=1"); await mp.waitForTimeout(250);
  assert.ok(await mp.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), "không tràn ngang");
  await mp.screenshot({ path: "/tmp/sheet_m.png" }); await mp.goBack(); await mp.waitForTimeout(250); assert.ok(!(await mp.$("#sheet-bg")), "nút Back đóng cửa sổ"); ok("điện thoại: cửa sổ + Back");
  assert.deepStrictEqual(errs, [], "lỗi JS: " + errs.join("|")); console.log("XONG"); await b.close();
})().catch(e => { console.error("FAIL", e.message); process.exit(1); });
