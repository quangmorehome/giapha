// Excel nhiều đời (1→9), thiếu cột Đời ở các đời sau: dữ liệu mẫu tự gỡ, các đời nối nhau, "Bắt đầu từ đời" chạy ở cả ba kiểu sơ đồ, không còn "chi"
const { chromium } = require("playwright"), assert = require("assert"), path = require("path"), cp = require("child_process");
const ok = n => console.log("✔", n);
cp.execFileSync("python3", ["-c", `
from openpyxl import load_workbook
wb=load_workbook("/tmp/claude-0/out/Bang-nhap-gia-pha-Ho-Tong.xlsx"); p=wb["Người"]; s=wb["Vợ chồng"]
for r in (2,3,4):
    for c in range(1,30):
        if c not in (1,20,22): p.cell(r,c).value=None
s.cell(2,8,None)
r=2; sp=[]
def add(ho,dem,ten,gt,sn,tt,doi,cha,me,vai,mn=None):
    global r
    vals={2:ho,3:dem,4:ten,6:gt,7:sn,10:tt,11:mn,17:doi,19:cha,21:me,23:vai,27:"Công khai"}
    for c,v in vals.items():
        if v not in (None,""): p.cell(r,c,v)
    r+=1; return "N%03d"%(r-2)
fa=me=None
for g in range(1,10):
    a=add("Tống","Văn","Đời%d"%g,"Nam",1700+g*25,"Đã mất",g if g<4 else None,fa,me,"Ruột",1760+g*25)   # từ đời 4 trở đi bỏ trống cột Đời
    w=add("Lê","Thị","Vợ%d"%g,"Nữ",1705+g*25,"Đã mất",None,None,None,"Dâu/Rể",1770+g*25)
    sp.append((a,w))
    if 1<g<9: add("Tống","Văn","Em%d"%g,"Nam",1702+g*25,"Đã mất",g if g<4 else None,fa,me,"Ruột",1770+g*25)
    fa,me=a,w
for i,(a,b) in enumerate(sp): s.cell(2+i,1,a); s.cell(2+i,3,b); s.cell(2+i,5,1)
wb.save("/tmp/x9.xlsx")`]);
(async () => {
  const b = await chromium.launch(), pg = await (await b.newContext({ viewport: { width: 1100, height: 900 } })).newPage(), errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await pg.goto("file://" + path.join(__dirname, "..", "dist", "_khung_thu.html") + "#du-lieu"); await pg.waitForTimeout(500);
  await pg.setInputFiles("#imp-f", "/tmp/x9.xlsx"); await pg.waitForSelector('[data-act="imp-sync"]'); await pg.click('[data-act="imp-sync"]'); await pg.waitForTimeout(500);
  const st = await pg.evaluate(() => ({ n: GP.store.S.data.persons.length, sample: GP.store.sampleCount(), mau: GP.store.S.data.mau, chi: GP.store.S.data.persons.filter(p => p.chi).length }));
  assert.strictEqual(st.n, 25, "đúng số người từ Excel"); assert.strictEqual(st.sample, 0); assert.strictEqual(st.mau, false); assert.strictEqual(st.chi, 0); ok("nạp Excel 9 đời: dữ liệu mẫu tự gỡ, không có chi");
  // đời suy ra từ cha/mẹ cho các dòng bỏ trống cột Đời
  const gens = await pg.evaluate(() => { const U = GP.ui, V = U.view(); return V.list.filter(p => /^(Đời|Em)\d$/.test(p.ten)).map(p => p.ten + ":" + U.gen(p)).join(","); });
  assert.ok(gens.includes("Đời9:9") && gens.includes("Đời5:5") && gens.includes("Em7:7") && gens.includes("Em3:3"), gens); ok("đời tự tính theo cha/mẹ khi bỏ trống cột Đời");
  for (const [h, nm] of [["#so-do", "sơ đồ"], ["#mindmap", "tư duy"], ["#bong-bong", "bong bóng"]]) {
    await pg.evaluate(h => { location.hash = h; }, h); await pg.waitForSelector("#dg-gen"); await pg.waitForTimeout(400);
    const opts = await pg.$$eval("#dg-gen option", e => e.map(x => x.value)); assert.deepStrictEqual(opts, ["1", "2", "3", "4", "5", "6", "7", "8", "9"], nm + ": đủ đời 1→9");
    assert.strictEqual(await pg.$$eval(".mmn", e => e.length), 16, nm + ": đời 1 là một cây đủ 16 người trong họ"); // 9 đời + 7 em
    await pg.selectOption("#dg-gen", "4"); await pg.waitForTimeout(450);
    const rootOpts = await pg.$$eval("#dg-root option", e => e.map(x => x.textContent)); assert.ok(rootOpts[0].includes("Tất cả người đời 4") && rootOpts.length === 3, nm + ": " + rootOpts.join("|"));
    const ids = await pg.$$eval(".mmn", e => e.map(x => x.getAttribute("data-id"))), names = await pg.evaluate(ids => ids.map(i => GP.store.byId(i).ten), ids);
    assert.ok(names.includes("Đời4") && names.includes("Em4") && names.includes("Đời9") && !names.includes("Đời3") && !names.includes("Em3"), nm + ": từ đời 4 xuống đời 9 — " + names.join(","));
    await pg.selectOption("#dg-root", { index: 2 }); await pg.waitForTimeout(450);
    const one = await pg.$$eval(".mmn", e => e.length); assert.ok(one >= 1 && one < ids.length, nm + ": chọn một người làm gốc"); 
    await pg.selectOption("#dg-gen", "1"); await pg.waitForTimeout(300);
    ok(nm + ": bắt đầu từ đời N (tất cả / một người) chạy đúng");
  }
  // không còn chi trong giao diện
  await pg.evaluate(() => { location.hash = "#danh-sach"; }); await pg.waitForTimeout(400);
  assert.ok(!(await pg.$("#f-chi")), "không còn lọc theo chi"); await pg.evaluate(() => { location.hash = "#them"; }); await pg.waitForTimeout(400); assert.ok(!(await pg.$("[name=chi]")), "form không có ô chi"); ok("không còn mục chi (lọc, form)");
  assert.deepStrictEqual(errs, [], errs.join(";")); await b.close();
})().catch(e => { console.error("✘", e.message); process.exit(1); });
