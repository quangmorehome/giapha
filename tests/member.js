// Người nhà: Quản trị soạn bản riêng cho từng người nhà; người nhà đăng nhập chỉ thấy phần được phép, không có quyền sửa
const { chromium } = require("playwright"), assert = require("assert"), path = require("path");
const F = "file://" + path.join(__dirname, "..", "dist", "_khung_thu.html"), URL = "https://mock.test";
(async () => {
  const b = await chromium.launch(), errs = [], DB = { mine: null, mem: [] };
  const mk = async (user, vai, nguoi) => {
    const ctx = await b.newContext({ viewport: { width: 1000, height: 900 } }), pg = await ctx.newPage(); pg.on("pageerror", e => errs.push(e.message));
    await pg.addInitScript(([u, url]) => { window.GP_CLOUD_TEST = { url, key: "k" }; localStorage.setItem("gp.sess", JSON.stringify({ access_token: "T", refresh_token: "R", expires_at: 9999999999, user: { id: u, email: u + "@x.vn" } })); }, [user, URL]);
    await pg.route(URL + "/**", r => { const q = r.request(), u = q.url().slice(URL.length), j = (c, o) => r.fulfill({ status: c, contentType: "application/json", headers: { "access-control-allow-origin": "*" }, body: JSON.stringify(o) });
      if (q.method() === "OPTIONS") return r.fulfill({ status: 204, headers: { "access-control-allow-origin": "*", "access-control-allow-headers": "*", "access-control-allow-methods": "*" } });
      if (u.startsWith("/rest/v1/gp_vai_tro")) return j(200, [{ vai_tro: vai, ten: "Tên " + user, nguoi_id: nguoi }]);
      if (u.startsWith("/rest/v1/rpc/gp_ds_thanh_vien")) return vai === "admin" ? j(200, DB.mem) : j(403, { message: "no" });
      if (u.startsWith("/rest/v1/gp_nguoi_nha")) { if (q.method() === "GET") return j(200, DB.mine ? [{ data: DB.mine }] : []); DB.mine = JSON.parse(q.postData()).data; return j(201, []); }
      if (u.startsWith("/rest/v1/gp_rieng") || u.startsWith("/rest/v1/gp_cong_khai")) return j(vai === "member" ? 403 : 200, vai === "member" ? { message: "RLS" } : []);
      j(404, {}); });
    return pg; };
  // 1) Quản trị soạn bản cho người nhà gắn với p07 (một hồ sơ trong dữ liệu mẫu)
  let pg = await mk("admin1", "admin", ""); await pg.goto(F + "#trang-chu"); await pg.waitForTimeout(800);
  const info = await pg.evaluate(() => { const P = GP.store.S.data.persons, me = P.find(p => p.cha_id && p.con_song !== false) || P[5], far = P.filter(p => p.con_song !== false && !p.da_an && p.id !== me.id && p.id !== me.cha_id && p.id !== me.me_id && !p.cha_id !== undefined).slice(-1)[0]; return { me: me.id, far: far.id }; });
  DB.mem = [{ r_user_id: "m1", r_email: "an@x.vn", r_vai_tro: "member", r_ten: "Cháu An", r_nguoi_id: info.me }];
  const n = (await pg.evaluate(() => GP.cloud.publishMembers(true))).n; assert.strictEqual(n, 1, "soạn 1 bản người nhà"); assert.ok(DB.mine && DB.mine.nguoi_nha === info.me);
  const s = JSON.stringify(DB.mine); assert.ok(!DB.mine.profiles.length && !DB.mine.edit_history.length && !DB.mine.donations.length, "không lộ tài khoản/lịch sử");
  const meRec = DB.mine.persons.find(p => p.id === info.me); assert.ok(meRec, "có hồ sơ của chính mình");
  console.log("✔ Quản trị soạn bản riêng:", DB.mine.persons.length, "hồ sơ");
  // 2) Người nhà đăng nhập
  const pm = await mk("m1", "member", info.me); await pm.goto(F + "#trang-chu"); await pm.waitForTimeout(900);
  const v = await pm.evaluate(() => ({ role: GP.store.S.viewer.role, pid: GP.store.S.viewer.person_id, n: GP.store.S.data.persons.length, w: GP.ui.canWrite() }));
  assert.strictEqual(v.role, "member"); assert.strictEqual(v.pid, info.me); assert.strictEqual(v.w, false, "người nhà không sửa được");
  assert.ok(/Người nhà/.test(await pm.textContent(".cloudbar")), "hiện vai trò Người nhà");
  await pm.evaluate(id => { location.hash = "#nguoi-" + id; }, info.me); await pm.waitForTimeout(400);
  assert.ok(await pm.locator("h1").count() >= 1 && !(await pm.locator('[data-act="row-del"], a[href^="#sua-"]').count()), "xem được hồ sơ mình, không có nút sửa/xoá");
  const far = await pm.evaluate(id => { const p = GP.store.S.data.persons.find(x => x.id === id); return p ? { tieu_su: p.tieu_su || "", nghe: p.nghe || "" } : null; }, info.far);
  assert.ok(!far || (!far.tieu_su && !far.nghe), "người ngoài quan hệ: không có chi tiết riêng");
  assert.deepStrictEqual(errs, []); console.log("✔ Người nhà: xem được, không sửa được, không lộ chi tiết người xa"); await b.close();
})().catch(e => { console.error("✘", e.message); process.exit(1); });
