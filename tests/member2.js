// Người nhà là ngoại tộc (dâu): tự thấy cha mẹ, ông bà, chồng + bố mẹ chồng + ông bà chồng, con cháu, dâu rể; có sơ đồ/tư duy/bong bóng; đọc văn bản chung; không thấy người xa
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
const F = "file://" + path.join(__dirname, "..", "dist", "_khung_thu.html"), URL = "https://mock.test";
(async () => {
  const b = await chromium.launch(), errs = [], DB = { mine: null, mem: [] };
  const mk = async (user, vai, nguoi) => { const pg = await (await b.newContext({ viewport: { width: 1100, height: 900 } })).newPage(); pg.on("pageerror", e => errs.push(e.message));
    await pg.addInitScript(([u, url]) => { window.GP_CLOUD_TEST = { url, key: "k" }; localStorage.setItem("gp.sess", JSON.stringify({ access_token: "T", refresh_token: "R", expires_at: 9999999999, user: { id: u, email: u + "@x.vn" } })); }, [user, URL]);
    await pg.route(URL + "/**", r => { const q = r.request(), u = q.url().slice(URL.length), j = (c, o) => r.fulfill({ status: c, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(o) });
      if (q.method() === "OPTIONS") return r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
      if (u.startsWith("/rest/v1/gp_vai_tro")) return j(200, [{ vai_tro: vai, ten: "Dâu thử", nguoi_id: nguoi }]);
      if (u.startsWith("/rest/v1/rpc/gp_ds_thanh_vien")) return j(200, DB.mem);
      if (u.startsWith("/rest/v1/gp_nguoi_nha")) { if (q.method() === "GET") return j(200, DB.mine ? [{ data: DB.mine }] : []); DB.mine = JSON.parse(q.postData()).data; return j(201, []); }
      j(vai === "member" ? 403 : 200, vai === "member" ? { message: "RLS" } : []); });
    return pg; };
  const pg = await mk("admin1", "admin", ""); await pg.goto(F + "#trang-chu"); await pg.waitForTimeout(800);
  const id = await pg.evaluate(() => { const S = GP.store, A = o => S.addPerson(o).id || S.addPerson(o);
    const add = o => { const r = S.addPerson(o); return r.id || r; };
    const G = add({ ho: "Tống", ten: "Ông Tổ", gioi_tinh: "nam", cha_id: "p01", con_song: false, mat: { nam: 1950 }, sinh: { nam: 1880 } });
    const Sx = add({ ho: "Tống", ten: "Con Trai", gioi_tinh: "nam", cha_id: G, sinh: { nam: 1960 } });
    const WF = add({ ho: "Lê", ten: "Cha Dâu", gioi_tinh: "nam", con_song: false, mat: { nam: 2001 }, sinh: { nam: 1930 } }), WM = add({ ho: "Trần", ten: "Mẹ Dâu", gioi_tinh: "nu", sinh: { nam: 1935 } });
    const W = add({ ho: "Lê", ten: "Dâu Thử", gioi_tinh: "nu", cha_id: WF, me_id: WM, sinh: { nam: 1962 } }), WB = add({ ho: "Lê", ten: "Em Dâu", gioi_tinh: "nam", cha_id: WF, me_id: WM, sinh: { nam: 1965 } });
    const C = add({ ho: "Tống", ten: "Cháu Một", gioi_tinh: "nam", cha_id: Sx, me_id: W, sinh: { nam: 1990 } }), CS = add({ ho: "Phạm", ten: "Vợ Cháu", gioi_tinh: "nu", sinh: { nam: 1991 } });
    const GC = add({ ho: "Tống", ten: "Chắt Thử", gioi_tinh: "nam", cha_id: C, me_id: CS, sinh: { nam: 2015 } });
    const X = add({ ho: "Nguyễn", ten: "Người Xa", gioi_tinh: "nam", tieu_su: "BÍ MẬT XA", nghe: "Nghề xa", sinh: { nam: 1970 } });
    const Y = add({ ho: "Tống", ten: "Cụ Xa", gioi_tinh: "nam", con_song: false, mat: { nam: 1960 }, tieu_su: "Chi tiết cụ xa", muc_hien_thi: "rieng_tu" });
    return { G, Sx, WF, WM, W, WB, C, CS, GC, X, Y }; });
  DB.mem = [{ r_user_id: "m1", r_email: "dau@x.vn", r_vai_tro: "member", r_ten: "Dâu", r_nguoi_id: id.W }];
  await pg.evaluate(() => GP.cloud.publishMembers(true));
  const ids = DB.mine.persons.map(p => p.id), has = k => ids.includes(id[k]);
  ["W", "WF", "WM", "WB", "Sx", "G", "C", "CS", "GC"].forEach(k => assert(has(k), "phải thấy " + k));
  assert(!has("X") && !has("Y"), "không thấy người xa / cụ xa (riêng tư)");
  assert.strictEqual(DB.mine.persons.find(p => p.id === id.Sx).tieu_su || "", "", "Sx");
  console.log("✔ bản người nhà (dâu) có đủ cha mẹ, ông bà, chồng, bố mẹ/ông chồng, con cháu, dâu rể; không có người xa");
  const pm = await mk("m1", "member", id.W); await pm.goto(F + "#trang-chu"); await pm.waitForTimeout(900);
  const nm = await pm.evaluate(() => GP.store.S.data.persons.length); assert.strictEqual(nm, DB.mine.persons.length);
  for (const [h, sel] of [["so-do", "svg text"], ["mindmap", "svg text"], ["bong-bong", "svg text"]]) { await pm.evaluate(h => { location.hash = "#" + h; }, h); await pm.waitForTimeout(500);
    const n = await pm.locator(sel).count(); assert(n >= 3, h + ": có sơ đồ (" + n + " nhãn)"); }
  await pm.evaluate(() => { location.hash = "#so-do"; }); await pm.waitForTimeout(300);
  const tx = (await pm.locator("svg").allTextContents()).join(" "); assert(/Dâu Thử/.test(tx) && /Cha Dâu/.test(tx) && /Chắt Thử/.test(tx), "sơ đồ ngoại tộc có chủ tài khoản, cha, chắt: " + tx.slice(0, 200));
  await pm.evaluate(() => { location.hash = "#bai-viet"; }); await pm.waitForTimeout(400);
  const t = await pm.innerText("main"); assert(/Quy ước dòng họ/.test(t) && /Quy chế Hội đồng/.test(t) && /tế lễ/.test(t), "đọc được văn bản chung");
  await pm.evaluate(() => { location.hash = "#lich"; }); await pm.waitForTimeout(300);
  delete DB.mine.nn_ver; const ps = await mk("m1", "member", id.W); await ps.goto(F + "#trang-chu"); await ps.waitForTimeout(800);
  assert(/bản cũ/.test(await ps.textContent(".cloudbar")), "báo dữ liệu cũ khi bản người nhà chưa cập nhật");
  assert.deepStrictEqual(errs, []); console.log("✔ người nhà ngoại tộc: sơ đồ cây, tư duy, bong bóng, văn bản chung"); await b.close();
})().catch(e => { console.error("✘", e.message); process.exit(1); });
