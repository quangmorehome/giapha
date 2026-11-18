// Kiểm tra gia đình nhiều đời (1→9): cây, 3 sơ đồ, danh sách nội/ngoại tộc, nút xoá, bộ lọc gọn
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
(async () => {
  const b = await chromium.launch(), errs = [], ok = n => console.log("✔", n);
  const ctx = await b.newContext({ viewport: { width: 1100, height: 900 } }), pg = await ctx.newPage(); pg.on("pageerror", e => errs.push(e.message));
  await pg.addInitScript(() => { try { localStorage.setItem("gp.viewer", "u_admin"); } catch (e) {} });
  await pg.goto("file://" + path.join(__dirname, "..", "dist", "_khung_thu.html") + "#danh-sach"); await pg.waitForTimeout(400);
  await pg.evaluate(() => {
    const S = GP.store.S, base = GP.store.blank(), P = [], SP = []; let n = 0;
    const mk = (id, ten, gt, o) => { P.push(Object.assign({}, base, { id, ho: gt === "nam" || (o && o.ho) ? "Tống" : "", ten, gioi_tinh: gt, con_song: false, muc_hien_thi: "cong_khai", sinh: { nam: 1700 + n++ } }, o || {})); };
    const wed = (a, b) => SP.push({ id: "s" + SP.length, person_id: a, spouse_person_id: b, ten: "", thu_tu: 1, tinh_trang: "dang_o", ghi_chu: "", da_an: false });
    mk("a1", "Ông Một", "nam", { the_thu: 1 }); mk("a1w", "Bà Một", "nu", { ho: "Lê" }); wed("a1", "a1w");
    // đời 2: con trai (có dâu) và con gái (có rể)
    mk("a2", "Hai", "nam", { the_thu: 2, cha_id: "a1", me_id: "a1w", thu_tu_con: 1 }); mk("a2w", "Dâu Hai", "nu", { ho: "Phạm", vai: "dau_re" }); wed("a2", "a2w");
    mk("d2", "Gái Hai", "nu", { ho: "Tống", the_thu: 2, cha_id: "a1", me_id: "a1w", thu_tu_con: 2 }); mk("r2", "Rể Hai", "nam", { ho: "Vũ", vai: "dau_re" }); wed("d2", "r2");
    mk("e3", "Cháu Ngoại", "nam", { ho: "Vũ", the_thu: 3, cha_id: "r2", me_id: "d2", thu_tu_con: 1 });
    // dòng trưởng nam xuống đời 9
    let fa = "a2", mo = "a2w";
    for (let g = 3; g <= 9; g++) { const id = "g" + g; mk(id, "Đời" + g, "nam", { the_thu: g, cha_id: fa, me_id: mo, thu_tu_con: 1 }); if (g < 9) { mk(id + "w", "Dâu" + g, "nu", { ho: "Hồ", vai: "dau_re" }); wed(id, id + "w"); } fa = id; mo = id + "w"; }
    S.data.persons = P; S.data.spouses = SP; GP.ui.invalidate && GP.ui.invalidate();
  });
  const go = async h => { await pg.evaluate(h => { location.hash = h; }, h); await pg.waitForTimeout(450); };
  // 1. Giao diện Cây đã bỏ: #cay chuyển sang sơ đồ; không còn tab Cây
  await go("#cay"); assert.strictEqual(await pg.evaluate(() => location.hash), "#so-do"); assert.ok(!(await pg.$('a[href="#cay"]')), "không còn liên kết tới cây"); ok("cây gộp vào sơ đồ");
  // 2. Ba sơ đồ: đủ con cháu đến đời 9 và có nhãn đời
  for (const [h, nm] of [["#so-do", "sơ đồ"], ["#mindmap", "tư duy"], ["#bong-bong", "bong bóng"]]) {
    await go(h); await pg.waitForSelector(".mmn");
    const ids = await pg.$$eval(".mmn", e => e.map(x => x.getAttribute("data-id")));
    for (const id of ["a1", "a2", "d2", "e3", "g3", "g6", "g9"]) assert.ok(ids.includes(id), nm + " thiếu " + id);
    assert.ok(!ids.includes("r2") && !ids.includes("a2w"), nm + ": dâu/rể không thành nút riêng");
    const labs = await pg.$$eval(".glab", e => e.map(x => x.textContent));
    assert.ok(labs.includes("Đời 1") || nm === "bong bóng", nm + " có nhãn đời 1"); assert.ok(labs.includes("Đời 9"), nm + " có nhãn đời 9");
    ok(nm + ": đủ con cháu, đời 1 → 9");
  }
  // gốc ở đời sâu → có đường về tổ đời 1
  await go("#so-do"); await pg.evaluate(() => GP.ui.acts["dg-root"]({ getAttribute: () => "g5" })); await pg.waitForTimeout(400);
  assert.ok(await pg.$(".crumbs"), "có đường từ đời 1"); assert.ok((await pg.$$eval(".crumb", e => e.length)) >= 5); ok("breadcrumb từ đời 1");
  await pg.evaluate(() => GP.ui.acts["dg-root"]({ getAttribute: () => "a1" })); await pg.waitForTimeout(300);
  // 3. Danh sách: nội tộc trước, ngoại tộc sau; dâu/rể không rơi vào "chưa rõ đời"
  await go("#danh-sach");
  const heads = await pg.$$eval("#kq li", e => e.map(x => x.className + "|" + x.textContent.trim().slice(0, 40)));
  const iN = heads.findIndex(x => x.startsWith("gsec noi")), iX = heads.findIndex(x => x.startsWith("gsec ngoai"));
  assert.ok(iN < 0 && iX < 0, "Tất cả: xếp theo gia đình, không tách nội/ngoại");
  await pg.click('[data-act="tc"][data-v="noi"], [data-act="tc"]:nth-of-type(2)'); await pg.waitForTimeout(200);
  await pg.click('[data-act="tc"]:nth-of-type(3)'); await pg.waitForTimeout(200);
  assert.ok((await pg.$$eval("#kq li", e => e.length)) > 0, "lọc ngoại tộc có kết quả");
  assert.ok(!heads.some(x => /Chưa rõ đời/i.test(x)), "không có nhóm chưa rõ đời");
  ok("danh sách tách nội tộc / ngoại tộc theo đời");
  // bấm tab Ngoại tộc
  await pg.click('[data-act="tc"][data-k="ngoai"]'); await pg.waitForTimeout(150);
  assert.strictEqual(await pg.$$eval("#kq li.gsec.noi", e => e.length), 0); assert.ok(await pg.$$eval("#kq a.prow", e => e.length) > 0); await pg.click('[data-act="tc"][data-k=""]');
  // bộ lọc gộp
  assert.ok(await pg.$("details.morefl"), "bộ lọc gộp"); assert.ok(!(await pg.isVisible("#f-doi")), "lọc phụ ẩn sẵn"); await pg.click(".morefl summary"); await pg.selectOption("#f-doi", "3"); await pg.waitForTimeout(150);
  assert.ok(await pg.isVisible("#fl-n"), "huy hiệu đếm bộ lọc"); await pg.click('[data-act="lf-reset"]'); await pg.waitForTimeout(300); ok("bộ lọc gộp một chỗ + huy hiệu");
  // 4. Nút xoá (quản trị) + hộp xác nhận trong trang
  assert.ok((await pg.$$eval(".rowdel", e => e.length)) > 5, "mỗi dòng có nút xoá");
  await pg.click('.rowdel[data-id="g9"]'); await pg.waitForSelector("#ask-bg"); await pg.click("#ask-cancel"); assert.ok(!(await pg.$("#ask-bg")), "huỷ thì đóng");
  await pg.click('.rowdel[data-id="g9"]'); await pg.waitForSelector("#ask-bg"); await pg.click('[data-act="ask-ok"]'); await pg.waitForTimeout(300);
  assert.ok(!(await pg.evaluate(() => !!GP.store.byId("g9"))), "đã xoá g9"); ok("nút xoá + xác nhận");
  assert.deepStrictEqual(errs, [], "không lỗi JS: " + errs.join("; ")); await b.close();
})().catch(e => { console.error("✘", e.message); process.exit(1); });
