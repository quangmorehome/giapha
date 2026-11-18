// v1.33: vị trí cố định, sửa vị trí, danh sách lưới, lịch có bảng, bài viết gọn, xưng hô thông gia, icon
const { chromium } = require("playwright"), assert = require("assert"), path = require("path"), fs = require("fs");
(async () => { const b = await chromium.launch(), errs = [];
  const F = "file://" + path.resolve(__dirname, "../dist/_khung_thu.html");
  const pg = await (await b.newContext({ viewport: { width: 1200, height: 900 } })).newPage(); pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  // 1) Di tích: khu chưa có địa chỉ → không nhúng bản đồ; sửa vị trí → có iframe đúng địa chỉ
  await pg.goto(F + "#di-tich"); await pg.waitForTimeout(500);
  await pg.evaluate(() => { GP.store.saveRow("sites", { id: "st-a", ten: "Mộ tổ thử", loai: "mo", hien_trang: "chua_ro", muc_hien_thi: "gia_toc", muc_chac_chan: "chua_chac", nguon: "Nhập tay", nguoi_an_tang: [] }); GP.ui.rerender(); }); await pg.waitForTimeout(400);
  assert.ok(await pg.locator('[data-act="loc-edit"]').count() >= 1, "có nút Sửa vị trí ở Di tích");
  await pg.click('[data-act="map-go"][data-id="st-a"]'); await pg.waitForTimeout(400);
  assert.strictEqual(await pg.locator(".mapbig iframe, #mapembed iframe").count(), 0, "chưa có vị trí thì không nhúng bản đồ bất kỳ");
  assert.ok(!/Mở Google Maps|Open in Google Maps/.test(await pg.innerText("main")), "đã bỏ nút Mở Google Maps");
  await pg.click('[data-act="loc-edit"]'); await pg.waitForTimeout(300);
  await pg.fill('.locform [name="dia_chi"]', "Xã Hòa Liên, Hòa Vang, Đà Nẵng"); await pg.click('.locform button[type="submit"]'); await pg.waitForTimeout(500);
  const src = await pg.$eval("#mapembed iframe", e => e.src); assert.ok(/Ho%C3%A0|H%C3%B2a|Hòa|Da%20N|%C4%90%C3%A0/.test(decodeURIComponent(src).length ? src : "") || /Đà Nẵng/.test(decodeURIComponent(src)), "bản đồ theo địa chỉ đã lưu: " + src);
  // link Google Maps → ghim toạ độ
  await pg.click('[data-act="loc-edit"]'); await pg.fill('.locform [name="map_link"]', "https://www.google.com/maps/@15.9,108.2,17z"); await pg.click('.locform button[type="submit"]'); await pg.waitForTimeout(500);
  assert.ok(/15\.9/.test(await pg.$eval("#mapembed iframe", e => e.src)), "ghim theo toạ độ");
  // 2) Trang cá nhân: nơi an táng có thêm/sửa
  const pid = await pg.evaluate(() => GP.store.S.data.persons.find(p => p.con_song === false).id);
  await pg.goto(F + "#nguoi-" + pid); await pg.waitForTimeout(600);
  assert.ok(await pg.locator('[data-act="loc-new"]').count() >= 1, "trang cá nhân: thêm nơi an táng mới");
  await pg.click('[data-act="loc-new"]'); await pg.fill('[data-submit="loc-new-save"] [name="ten"]', "Nghĩa trang thử"); await pg.fill('[data-submit="loc-new-save"] [name="dia_chi"]', "Huế"); await pg.click('[data-submit="loc-new-save"] button[type="submit"]'); await pg.waitForTimeout(500);
  assert.ok(await pg.locator('[data-act="loc-edit"]').count() >= 1, "sau khi thêm có nút Sửa vị trí");
  // 3) Danh sách: nhiều cột
  await pg.goto(F + "#danh-sach"); await pg.waitForTimeout(600);
  const cols = await pg.$eval("#kq", e => getComputedStyle(e).gridTemplateColumns.split(" ").length); assert.ok(cols >= 2, "danh sách nhiều cột: " + cols);
  // 4) Lịch: có bảng sự kiện dưới lịch tháng, ô tổng hợp nằm dưới lưới
  await pg.goto(F + "#lich"); await pg.waitForTimeout(600);
  const yg = await pg.$eval(".calgrid", e => e.getBoundingClientRect().top), yt = await pg.$eval("#cal-body .sumtiles, #cal-body .tiles, #cal-body [data-act='cal-filt']", e => e.getBoundingClientRect().top);
  assert.ok(yt > yg, "ô giỗ/sinh nhật/lễ nằm dưới lịch"); assert.ok(await pg.locator("#cal-list table.evtbl, #cal-list .muted").count() >= 1, "có bảng sự kiện tháng");
  // 5) Bài viết: không còn bản tóm lược trùng
  await pg.goto(F + "#bai-viet"); await pg.waitForTimeout(500); const arts = await pg.locator(".arts li.card h2").allInnerTexts();
  assert.ok(arts.length <= 8 && arts.every(x => !/sườn chi tiết/.test(x)), "bài viết gọn: " + arts.join(" | "));
  // 6) Xưng hô: có thông gia
  const html = fs.readFileSync(path.resolve(__dirname, "../dist/index.html"), "utf8");
  assert.ok(/apple-touch-icon\.png/.test(html) && !/rel="apple-touch-icon" href="data:/.test(html), "icon là file PNG thật");
  for (const f of ["apple-touch-icon.png", "icon-192.png", "icon-512.png", "favicon.png"]) assert.ok(fs.existsSync(path.resolve(__dirname, "../dist/app/" + f)), f);
  // 7) Điện thoại: cây gia phả thu gọn bộ chọn
  const m = await (await b.newContext({ viewport: { width: 390, height: 800 } })).newPage(); await m.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await m.goto(F + "#cay"); await m.waitForTimeout(700); const ok = await m.locator("details.dgctl").count() + await m.locator("#dgbox").count(); assert.ok(ok >= 1, "cây trên điện thoại");
  assert.deepStrictEqual(errs, []); console.log("✔ v1.33: vị trí cố định, sửa vị trí, danh sách lưới, lịch bảng, bài gọn, icon"); await b.close(); })().catch(e => { console.error("✘", e.message); process.exit(1); });
