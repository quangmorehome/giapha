// Xuất .xlsx rồi nhập lại phải ra đúng dữ liệu (cùng một định dạng)
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => { const b = await chromium.launch(), pg = await (await b.newContext()).newPage(), errs = []; pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await pg.goto("file://" + path.resolve(__dirname, "../dist/_khung_thu.html") + "#du-lieu"); await pg.waitForTimeout(500);
  const r = await pg.evaluate(async () => { const S = GP.store, d = S.S.data; d.persons[3].ten_thuong_goi = "Cả Thử";
    const u8 = GP.xlsx.build(d.persons, d.spouses, d.sites, { gen: GP.ui.gen }); const imp = GP.xlsx.toImport(await GP.xlsx.parse(u8.buffer));
    const P = d.persons; return { n: P.length, m: imp.persons.length, sp: [d.spouses.filter(s => s.spouse_person_id).length, imp.spouses.length], st: [d.sites.length, imp.sites.length], nick: imp.persons[3].ten_thuong_goi, ten: [P[3].ten, imp.persons[3].ten], cha: P.filter(p => p.cha_id).length === imp.persons.filter(p => p.cha_id).length, w: imp.warnings.slice(0, 3) }; });
  console.log(JSON.stringify(r)); assert.strictEqual(r.n, r.m); assert.strictEqual(r.sp[0], r.sp[1]); assert.strictEqual(r.nick, "Cả Thử"); assert.strictEqual(r.ten[0], r.ten[1]); assert(r.cha);
  assert.deepStrictEqual(errs, []); console.log("✔ xuất xlsx → nhập lại khớp"); await b.close(); })().catch(e => { console.error("✘", e.message); process.exit(1); });
