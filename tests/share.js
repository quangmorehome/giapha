// File xem chung: tải về, mở lại ở "máy khác" (ngữ cảnh mới) vẫn thấy dữ liệu đã nhập; ô số liệu trang chủ bấm được; lịch có can chi
const { chromium } = require("playwright"), assert = require("assert"), path = require("path"), fs = require("fs");
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ acceptDownloads: true, viewport: { width: 1000, height: 900 } }), pg = await ctx.newPage(), errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await pg.goto("file://" + path.join(__dirname, "..", "dist", "_khung_thu.html") + "#trang-chu"); await pg.waitForTimeout(500);
  // ô số liệu bấm được
  await pg.click('.stiles .st.clk >> nth=0'); await pg.waitForSelector("#st-pop .frow"); assert.ok((await pg.$$eval("#st-pop .frow", e => e.length)) > 5); await pg.click("#st-pop .pop-x"); console.log("✔ ô số liệu trang chủ bấm ra danh sách");
  // thêm người rồi xuất
  await pg.evaluate(() => { const S = GP.store; S.addPerson({ ho: "Tống", ten: "Nguoi Moi Nhap", gioi_tinh: "nam", con_song: false, sinh: { nam: 1900 }, mat: { nam: 1970 }, muc_hien_thi: "cong_khai" }); });
  await pg.evaluate(() => { location.hash = "#du-lieu"; }); await pg.waitForTimeout(400);
  const [dl] = await Promise.all([pg.waitForEvent("download"), pg.click('[data-act="ex-share"]')]);
  const f = "/tmp/xem-chung.html"; await dl.saveAs(f); assert.ok(fs.statSync(f).size > 300000);
  const pg2 = await (await b.newContext()).newPage(); pg2.on("pageerror", e => errs.push(e.message));
  await pg2.goto("file://" + f + "#danh-sach"); await pg2.waitForTimeout(600);
  assert.ok((await pg2.textContent("body")).includes("Nguoi Moi Nhap"), "người mới nhập có trong file xem chung");
  assert.ok(await pg2.$(".banner.pub"), "là bản xem chung (khách)"); console.log("✔ file xem chung mở ở máy khác vẫn thấy dữ liệu");
  // lịch: can chi
  await pg.evaluate(() => { location.hash = "#lich"; }); await pg.waitForTimeout(400); await pg.click(".cd:not(.empty) >> nth=9"); await pg.waitForSelector(".calpop");
  const tx = await pg.textContent(".calpop"); assert.ok(/Năm [A-ZÀ-Ỹ][a-zà-ỹ]+ [A-ZÀ-Ỹ][a-zà-ỹ]+/.test(tx) && /Tháng .+ · ngày/.test(tx), "có năm/tháng/ngày can chi: " + tx.slice(0, 120)); console.log("✔ cửa sổ ngày có can chi:", tx.match(/Năm [^T]+/)[0].slice(0, 20));
  assert.deepStrictEqual(errs, [], errs.join(";")); await b.close();
})().catch(e => { console.error("✘", e.message); process.exit(1); });
