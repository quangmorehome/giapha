// File mẫu địa điểm: nạp bằng "Đồng bộ theo Mã" phải thêm địa điểm mà không đụng danh sách người
const { chromium } = require("playwright"), assert = require("assert"), path = require("path"), fs = require("fs");
const F = process.argv[2] || "/tmp/claude-0/out/Mau-nhap-dia-diem-Ho-Tong.xlsx";
(async () => { const b = await chromium.launch(), pg = await (await b.newContext()).newPage(), errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await pg.goto("file://" + path.resolve(__dirname, "../dist/_khung_thu.html") + "#du-lieu"); await pg.waitForTimeout(500);
  const n0 = await pg.evaluate(() => { GP.store.S.data.mau = false; GP.store.S.data.persons.forEach(p => { p.tao_boi = "admin"; p.nguon = "thật"; }); return [GP.store.S.data.persons.length, GP.store.S.data.sites.length]; });
  await pg.setInputFiles('input[type=file]', F); await pg.waitForTimeout(900); await pg.click('[data-act="imp-sync"]'); await pg.waitForTimeout(500);
  const n1 = await pg.evaluate(() => [GP.store.S.data.persons.length, GP.store.S.data.sites.length, GP.store.S.data.sites.filter(s => /^\[VÍ DỤ\]/.test(s.ten)).length]);
  assert.strictEqual(n1[0], n0[0], "không đụng danh sách người"); assert.strictEqual(n1[2], 3);
  assert.deepStrictEqual(errs, []); console.log("✔ file mẫu địa điểm nạp được, không ảnh hưởng người"); await b.close(); })().catch(e => { console.error("✘", e.message); process.exit(1); });
