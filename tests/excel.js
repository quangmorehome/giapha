// Nạp Excel (.xlsx) trực tiếp vào web: thêm mới, rồi nạp lần 2 ghi đè theo Mã (không nhân đôi); ngày dương+âm cho Quản trị
const { chromium } = require("playwright"), assert = require("assert"), path = require("path"), cp = require("child_process"), fs = require("fs");
const mk = (name, tweak) => cp.execFileSync("python3", ["-c", `
from openpyxl import load_workbook
wb=load_workbook("/tmp/claude-0/out/Bang-nhap-gia-pha-Ho-Tong.xlsx"); p=wb["Người"]
for r in (2,3,4):
    for c in range(1,30):
        if c not in (1,20,22): p.cell(r,c).value=None
rows=[("Tống","Văn","An","Nam",1890,"Đã mất",1960,"Ruột","","Công khai",1,1),("Lê","Thị","Hoa","Nữ",1895,"Đã mất",1970,"Dâu/Rể","","Công khai",None,None),("Tống","Văn","Bình","Nam",1920,"Còn sống","","Ruột","N001","Riêng tư",2,1)]
for k,(ho,dem,ten,gt,sn,tt,mn,vai,cha,ht,doi,tt2) in enumerate(rows):
    r=2+k; p.cell(r,2,ho);p.cell(r,3,dem);p.cell(r,4,ten);p.cell(r,6,gt);p.cell(r,7,sn);p.cell(r,10,tt);p.cell(r,11,mn or None);p.cell(r,23,vai);p.cell(r,27,ht);p.cell(r,17,doi);p.cell(r,18,tt2)
    if cha: p.cell(r,19,cha)
p.cell(4,21,"N002"); p.cell(2,8,5); p.cell(2,9,5); p.cell(2,7,1890)
${tweak}
s=wb["Vợ chồng"]; s.cell(2,8,None)
wb.save("${name}")`]);
(async () => {
  mk("/tmp/x1.xlsx", ""); mk("/tmp/x2.xlsx", 'p.cell(4,4,"Bình Sửa"); p.cell(5,2,"Tống"); p.cell(5,4,"Mới"); p.cell(5,6,"Nam"); p.cell(5,10,"Còn sống"); p.cell(5,27,"Riêng tư")');
  const b = await chromium.launch(), pg = await (await b.newContext({ viewport: { width: 1000, height: 900 } })).newPage(), errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await pg.goto("file://" + path.join(__dirname, "..", "dist", "_khung_thu.html") + "#du-lieu"); await pg.waitForTimeout(500);
  const before = await pg.evaluate(() => GP.store.S.data.persons.length);
  await pg.setInputFiles("#imp-f", "/tmp/x1.xlsx"); await pg.waitForSelector('[data-act="imp-sync"]');
  assert.ok((await pg.textContent("#imp-prev")).includes("Người mới"), "có xem trước"); await pg.click('[data-act="imp-sync"]'); await pg.waitForTimeout(400);
  let n = await pg.evaluate(() => GP.store.S.data.persons.length); assert.strictEqual(n, 3, "dữ liệu mẫu được gỡ, còn đúng 3 người từ Excel");
  const find = () => pg.evaluate(() => { const P = GP.store.S.data.persons, g = m => P.filter(p => p.ma === m)[0]; const b = g("N003"), a = g("N001"); return { bn: b.ten, cha: b.cha_id === a.id, me: b.me_id === g("N002").id, doi: b.the_thu, sp: GP.store.S.data.spouses.length, sinhAm: a.sinh }; });
  let f = await find(); assert.ok(f.cha && f.me && f.doi === 2, "cha mẹ nối đúng theo Mã"); console.log("✔ nạp Excel lần 1: thêm 3, nối cha/mẹ theo Mã");
  await pg.evaluate(() => { location.hash = "#du-lieu"; }); await pg.waitForTimeout(300);
  await pg.setInputFiles("#imp-f", "/tmp/x2.xlsx"); await pg.waitForSelector('[data-act="imp-sync"]'); await pg.click('[data-act="imp-sync"]'); await pg.waitForTimeout(400);
  n = await pg.evaluate(() => GP.store.S.data.persons.length); assert.strictEqual(n, 4, "nạp lại: chỉ thêm 1 người mới, không nhân đôi");
  f = await find(); assert.strictEqual(f.bn, "Bình Sửa", "dòng sau ghi đè dòng trước"); console.log("✔ nạp lần 2 ghi đè theo Mã, không nhân đôi");
  // Quản trị thấy ngày sinh dương + âm
  const id = await pg.evaluate(() => GP.store.S.data.persons.filter(p => p.ma === "N001")[0].id); await pg.evaluate(i => { location.hash = "#nguoi-" + i; }, id); await pg.waitForTimeout(500);
  const tx = await pg.textContent("main"); assert.ok(/Ngày tháng/.test(tx) && /dương lịch/.test(tx) && /âm lịch/.test(tx) && !tx.includes("<span"), "admin thấy dương + âm"); console.log("✔ Quản trị thấy ngày sinh dương + âm");
  assert.deepStrictEqual(errs, [], errs.join(";")); await b.close();
})().catch(e => { console.error("✘", e.message); process.exit(1); });
