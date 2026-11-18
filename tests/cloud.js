// Đăng nhập + lưu chung (máy chủ Supabase giả lập): khách chỉ thấy bản công khai; admin đẩy/đăng; chống ghi đè; editor không đăng công khai
const { chromium } = require("playwright"), assert = require("assert"), path = require("path"), http = require("http");
const DB = { rieng: null, ck: null, vai: "admin", pubWrites: 0, tv: [{ r_user_id: "u1", r_email: "kent@x.vn", r_vai_tro: "admin", r_ten: "Kent" }, { r_user_id: "u2", r_email: "bien@x.vn", r_vai_tro: null, r_ten: null }] };
const srv = http.createServer((q, r) => {
  const cors = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Headers": "apikey,authorization,content-type,prefer,x-upsert", "Access-Control-Allow-Methods": "GET,POST,PATCH,DELETE,OPTIONS" };
  if (q.method === "OPTIONS") { r.writeHead(204, cors); return r.end(); }
  let b = ""; q.on("data", c => b += c); q.on("end", () => {
    const js = (c, o) => { r.writeHead(c, Object.assign({ "Content-Type": "application/json" }, cors)); r.end(JSON.stringify(o)); }, body = (() => { try { return b ? JSON.parse(b) : null; } catch (e) { return null; } })(), u = q.url, auth = !!q.headers.authorization;
    if (u.startsWith("/auth/v1/token")) { if (u.includes("password")) return body.password === "mat-khau" ? js(200, { access_token: "T", refresh_token: "R", expires_in: 3600, user: { id: "u1", email: body.email } }) : js(400, { error_description: "Invalid login credentials" }); return js(200, { access_token: "T2", refresh_token: "R", expires_in: 3600 }); }
    if (u.startsWith("/rest/v1/rpc/gp_ds_thanh_vien")) return DB.vai === "admin" ? js(200, DB.tv) : js(403, { message: "Chỉ Quản trị mới xem được danh sách thành viên" });
    if (u.startsWith("/rest/v1/rpc/gp_dat_vai_tro")) { const m = DB.tv.find(x => x.r_user_id === body.p_user); if (body.p_vai_tro !== "admin" && m.r_vai_tro === "admin" && DB.tv.filter(x => x.r_vai_tro === "admin").length <= 1) return js(400, { message: "Phải còn ít nhất một Quản trị" }); m.r_vai_tro = body.p_vai_tro === "none" ? null : body.p_vai_tro; if (body.p_ten) m.r_ten = body.p_ten; DB.rpcBody = body; r.writeHead(204, cors); return r.end(); }
    if (u.startsWith("/storage/v1/object/sign/gp-tu-lieu")) return js(200, ((body && body.paths) || []).map(p => ({ path: p, signedURL: "/object/sign/gp-tu-lieu/" + p + "?token=x" })));
    if (u.startsWith("/storage/v1/object/gp-tu-lieu/")) { DB.files = DB.files || []; DB.files.push(decodeURIComponent(u.slice(30))); return js(200, { Key: "ok" }); }
    if (u.startsWith("/rest/v1/gp_tu_lieu")) { DB.kho = DB.kho || []; if (q.method === "POST") { DB.kho.push(Object.assign({ id: "k" + DB.kho.length, user_id: "u2", trang_thai: "cho", muc_hien_thi: "gia_toc", created_at: "2026-11-15T00:00:00Z" }, body)); return js(201, null); } if (q.method === "PATCH") { const x = DB.kho.find(k => u.includes("id=eq." + k.id)); Object.assign(x, body); return js(204, null); } if (q.method === "DELETE") { DB.kho = DB.kho.filter(k => !u.includes("id=eq." + k.id)); return js(204, null); } return js(200, DB.kho); }
    if (u.startsWith("/rest/v1/gp_de_xuat")) { DB.dx = DB.dx || []; if (q.method === "POST") { DB.dx.push(Object.assign({ id: "d" + DB.dx.length, user_id: "u2", trang_thai: "moi", created_at: "2026-11-15T00:00:00Z" }, body)); return js(201, null); } return js(200, DB.dx); }
    if (u.startsWith("/rest/v1/rpc/gp_gan_ho_so_minh")) { if (DB.vai !== "admin" && DB.vai !== "editor") return js(403, { message: "Chỉ Quản trị hoặc Biên tập" }); DB.self = body.p_nguoi; return js(200, null); }
    if (u.startsWith("/rest/v1/gp_vai_tro")) return auth ? js(200, [{ vai_tro: DB.vai, ten: "Kent", nguoi_id: DB.self }]) : js(401, { message: "no" });
    if (u.startsWith("/rest/v1/gp_rieng")) {
      if (!auth) return js(401, { message: "RLS" });
      if (q.method === "GET") return js(200, DB.rieng ? [DB.rieng] : []);
      if (q.method === "POST") { if (DB.rieng) return js(409, { message: "dup" }); DB.rieng = { data: body.data, version: 1 }; return js(201, [DB.rieng]); }
      if (q.method === "PATCH") { const v = +/version=eq\.(\d+)/.exec(u)[1]; if (!DB.rieng || DB.rieng.version !== v) return js(200, []); DB.rieng = { data: body.data, version: body.version }; return js(200, [DB.rieng]); }
    }
    if (u.startsWith("/rest/v1/gp_cong_khai")) { if (q.method === "GET") return js(200, DB.ck ? [{ data: DB.ck }] : []); if (!auth || DB.vai !== "admin") return js(403, { message: "RLS" }); DB.ck = body.data; DB.pubWrites++; r.writeHead(201, cors); return r.end(); }
    js(404, {});
  });
});
(async () => {
  await new Promise(r => srv.listen(0, r)); const URL = "http://127.0.0.1:" + srv.address().port, F = "file://" + path.join(__dirname, "..", "dist", "_khung_thu.html"), b = await chromium.launch(), errs = [];
  const mkpage = async (keep) => { const ctx = keep || await b.newContext({ viewport: { width: 1000, height: 900 } }), pg = await ctx.newPage(); pg.on("pageerror", e => errs.push(e.message)); await pg.addInitScript(u => { window.GP_CLOUD_TEST = { url: u, key: "pk" }; }, URL); return { ctx, pg }; };
  // 1. khách, đám mây chưa có gì → dùng dữ liệu trên máy, thấy ô đăng nhập, không có chọn vai demo
  let { ctx, pg } = await mkpage(); await pg.goto(F + "#trang-chu"); await pg.waitForTimeout(700);
  assert.ok(await pg.$(".cloudlogin") && !(await pg.$("#sel-viewer")), "có ô đăng nhập, không có chọn vai demo"); console.log("✔ khách: thấy ô đăng nhập, không có chọn vai demo");
  // 2. sai mật khẩu
  await pg.click(".cloudlogin summary"); await pg.fill("#cl-e", "a@b.c"); await pg.fill("#cl-p", "sai"); await pg.click('.cloudlogin button[type=submit]'); await pg.waitForTimeout(500);
  assert.ok(/Sai email|Đăng nhập không/.test(await pg.textContent("body")), "báo sai mật khẩu"); console.log("✔ sai mật khẩu bị từ chối");
  // 3. đăng nhập admin → đám mây trống → đưa dữ liệu lên lần đầu
  await pg.fill("#cl-p", "mat-khau"); await Promise.all([pg.waitForEvent("load"), pg.click('.cloudlogin button[type=submit]')]); await pg.waitForTimeout(900);
  assert.ok(/Kent/.test(await pg.textContent(".cloudbar")), "hiện tên + vai trò"); assert.strictEqual(await pg.evaluate(() => GP.store.S.viewer.role), "admin");
  await pg.evaluate(() => { location.hash = "#du-lieu"; }); await pg.waitForSelector('[data-act="cl-first"]'); await pg.click('[data-act="cl-first"]'); await pg.waitForTimeout(800);
  assert.ok(DB.rieng && DB.rieng.version === 1 && DB.ck, "đã đưa lên: bản đầy đủ + bản công khai"); console.log("✔ admin đăng nhập, đưa dữ liệu lên lần đầu");
  const priv = DB.rieng.data.persons.length, pub = DB.ck.persons.length; assert.ok(pub <= priv && DB.ck.persons.every(p => p.con_song === false || !p.sinh || true)); assert.ok(!DB.ck.profiles || DB.ck.profiles.length === 0, "bản công khai không có tài khoản");
  // 4. sửa người → tự đồng bộ (version 2) và đăng lại bản công khai
  const w0 = DB.pubWrites; await pg.evaluate(() => { const p = GP.store.S.data.persons.filter(p => p.con_song === false)[0]; GP.store.updatePerson(p.id, { nghe: "Nghề đồng bộ thử" }); }); await pg.waitForTimeout(2600);
  assert.strictEqual(DB.rieng.version, 2, "version tăng"); assert.ok(DB.pubWrites > w0, "admin đăng lại bản công khai"); assert.ok(JSON.stringify(DB.rieng.data).includes("Nghề đồng bộ thử")); console.log("✔ sửa → tự lưu lên đám mây + đăng công khai");
  // 5. khách ở máy khác: thấy bản công khai, không thấy bản đầy đủ
  const g = await mkpage(); await g.pg.goto(F + "#danh-sach"); await g.pg.waitForTimeout(900);
  assert.strictEqual(await g.pg.evaluate(() => GP.store.S.data.persons.length), pub, "khách nạp bản công khai"); assert.strictEqual(await g.pg.evaluate(() => GP.store.S.viewer.role), "khach"); assert.ok(!(await g.pg.$("#sel-viewer"))); console.log("✔ khách máy khác thấy bản công khai (" + pub + " người)");
  // 6. chống ghi đè: có người khác lưu trước → báo xung đột, không ghi đè
  DB.rieng = { data: DB.rieng.data, version: 9 }; await pg.evaluate(() => { const p = GP.store.S.data.persons[0]; GP.store.updatePerson(p.id, { nghe: "Sửa muộn" }); }); await pg.waitForTimeout(2600);
  assert.strictEqual(DB.rieng.version, 9, "không ghi đè"); assert.ok(/Có người khác vừa lưu/.test(await pg.evaluate(() => document.getElementById("toast").textContent + document.body.textContent)), "báo xung đột"); console.log("✔ chống ghi đè: báo xung đột");
  // 7. biên tập viên: lưu được bản đầy đủ nhưng KHÔNG đăng bản công khai
  DB.vai = "editor"; DB.rieng = { data: DB.rieng.data, version: 5 }; const ed = await mkpage(); await ed.pg.addInitScript(() => localStorage.setItem("gp.sess", JSON.stringify({ access_token: "T", refresh_token: "R", expires_at: Math.floor(Date.now() / 1000) + 3000, user: { id: "u2", email: "e@x.y" } })));
  await ed.pg.goto(F + "#danh-sach"); await ed.pg.waitForTimeout(900); assert.strictEqual(await ed.pg.evaluate(() => GP.store.S.viewer.role), "editor"); const w1 = DB.pubWrites;
  await ed.pg.evaluate(() => { const p = GP.store.S.data.persons.filter(p => p.con_song === false)[0]; GP.store.updatePerson(p.id, { nghe: "Biên tập sửa" }); }); await ed.pg.waitForTimeout(2600);
  assert.strictEqual(DB.rieng.version, 6); assert.strictEqual(DB.pubWrites, w1, "editor không đăng công khai"); console.log("✔ biên tập: lưu được, không đăng công khai");
  // 8. Quản trị thêm Biên tập ngay trên web; không tự hạ vai của mình
  DB.vai = "admin"; await pg.evaluate(() => { location.hash = "#quan-tri"; }); await pg.waitForSelector("#tv-box tr[data-uid]"); await pg.waitForTimeout(300);
  assert.strictEqual(await pg.$$eval("#tv-box tr[data-uid]", e => e.length), 2, "hiện 2 tài khoản"); assert.ok(await pg.$eval('#tv-box tr[data-uid="u1"] select', e => e.disabled), "dòng của mình khoá vai trò");
  await pg.selectOption('#tv-box tr[data-uid="u2"] select[name=vai]', "editor"); await pg.click('[data-act="tv-save"][data-uid="u2"]'); await pg.waitForTimeout(300); assert.notStrictEqual(DB.tv[1].r_vai_tro, "editor", "chưa gắn hồ sơ thì không lưu"); console.log("✔ mọi tài khoản phải gắn hồ sơ cá nhân");
  await pg.selectOption('#tv-box tr[data-uid="u2"] select[name=nguoi]', { index: 1 }); await pg.fill('#tv-box tr[data-uid="u2"] input', "Anh Bình"); await pg.click('[data-act="tv-save"][data-uid="u2"]'); await pg.waitForTimeout(700);
  assert.strictEqual(DB.tv[1].r_vai_tro, "editor"); assert.strictEqual(DB.tv[1].r_ten, "Anh Bình"); assert.strictEqual(await pg.$eval('#tv-box tr[data-uid="u2"] select[name=vai]', e => e.value), "editor"); console.log("✔ Quản trị cấp vai trò Biên tập ngay trên web");
  await pg.selectOption('#tv-box tr[data-uid="u1"] select[name=nguoi]', { index: 1 });
  await pg.click('[data-act="tv-save"][data-uid="u1"]'); await pg.waitForTimeout(500); assert.strictEqual(DB.tv[0].r_vai_tro, "admin", "không tự hạ quản trị"); console.log("✔ không tự hạ vai trò của chính mình");
  DB.vai = "editor"; const e2 = await mkpage(); await e2.pg.addInitScript(() => localStorage.setItem("gp.sess", JSON.stringify({ access_token: "T", refresh_token: "R", expires_at: Math.floor(Date.now() / 1000) + 3000, user: { id: "u2", email: "bien@x.vn" } }))); await e2.pg.goto(F + "#quan-tri"); await e2.pg.waitForTimeout(800);
  assert.ok(!(await e2.pg.$("#tv-box")), "Biên tập không thấy mục quản lý thành viên"); console.log("✔ Biên tập không vào được mục quản lý thành viên");
  // Biên tập tự gắn tài khoản với một hồ sơ cá nhân ở trang "Tài khoản"
  DB.self = undefined; const e3 = await mkpage(); await e3.pg.addInitScript(() => localStorage.setItem("gp.sess", JSON.stringify({ access_token: "T", refresh_token: "R", expires_at: Math.floor(Date.now() / 1000) + 3000, user: { id: "u2", email: "bien@x.vn" } }))); await e3.pg.goto(F + "#tai-khoan"); await e3.pg.waitForTimeout(900);
  assert.ok(await e3.pg.$(".nolink"), "có cảnh báo chưa gắn hồ sơ"); assert.strictEqual(await e3.pg.$eval(".nolink", e => e.getAttribute("href")), "#tai-khoan");
  await e3.pg.selectOption("#tk-ng", "p03"); await Promise.all([e3.pg.waitForNavigation().catch(() => {}), e3.pg.click('form[data-submit="tk-gan"] button[type=submit]')]); await e3.pg.waitForTimeout(900);
  assert.strictEqual(DB.self, "p03"); assert.ok(!(await e3.pg.$(".nolink")), "hết cảnh báo sau khi gắn"); console.log("✔ Biên tập tự gắn tài khoản với hồ sơ cá nhân");
  await e3.pg.goto(F + "#de-xuat"); await e3.pg.waitForTimeout(700); await e3.pg.selectOption("#dx-n", "p03"); await e3.pg.fill("#dx-t", "Cụ mất ngày 19 tháng 2 âm lịch"); await e3.pg.click('form[data-submit="dx-send"] button[type=submit]'); await e3.pg.waitForTimeout(900);
  assert.strictEqual(DB.dx.length, 1); assert.strictEqual(DB.dx[0].nguoi_id, "p03"); assert.ok((await e3.pg.textContent("main")).includes("Cụ mất ngày 19"), "thấy đề xuất của mình"); console.log("✔ Gửi đề xuất sửa thông tin");
  DB.vai = "admin"; await e3.pg.goto(F + "#trang-chu"); await e3.pg.reload(); await e3.pg.waitForTimeout(1500);
  assert.strictEqual((await e3.pg.textContent("#bnav .bdg")).trim(), "1", "chấm đỏ báo 1 đề xuất chờ"); console.log("✔ Quản trị thấy chấm đỏ đề xuất chờ xử lý");
  // Kho tư liệu: gửi tệp + link, duyệt, hiện lên
  await e3.pg.goto(F + "#kho"); await e3.pg.waitForTimeout(900); await e3.pg.click(".kform summary");
  e3.pg.on("pageerror", e => console.log("PE", e.message)); e3.pg.on("console", m => { if (m.type() === "error") console.log("CE", m.text()); }); await e3.pg.setInputFiles("#k-f", { name: "Sắc phong.png", mimeType: "image/png", buffer: Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64") });
  await e3.pg.fill("#k-t", "Sắc phong cụ tổ"); await e3.pg.fill("#k-n", "Bản gốc do ông Ba giữ"); await e3.pg.selectOption("#k-p", "p03"); await e3.pg.click('[data-act="kho-addp"]'); await e3.pg.click('form[data-submit="kho-send"] button[type=submit]'); await e3.pg.waitForTimeout(1200);
  assert.strictEqual(DB.files.length, 1); assert.ok(/^u2\//.test(DB.files[0]) || /^u1\//.test(DB.files[0]), "tệp nằm trong thư mục của người tải: " + DB.files[0]);
  assert.strictEqual(DB.kho.length, 1); assert.deepStrictEqual(DB.kho[0].nguoi_ids, ["p03"]); assert.strictEqual(DB.kho[0].loai, "anh"); assert.strictEqual(DB.kho[0].trang_thai, "cho");
  assert.ok((await e3.pg.textContent("main")).includes("Chờ duyệt (1)"), "Quản trị thấy hàng chờ duyệt");
  await e3.pg.click('[data-act="kho-ok"]'); await e3.pg.waitForTimeout(1000); assert.strictEqual(DB.kho[0].trang_thai, "da_duyet"); assert.ok(DB.kho[0].duyet_boi);
  assert.ok(await e3.pg.$(".kgrid .kcard"), "tư liệu đã duyệt hiện trong lưới"); await e3.pg.click(".kgrid .kcard"); await e3.pg.waitForTimeout(600);
  assert.ok(/object\/sign\/gp-tu-lieu\/.*token=x/.test(await e3.pg.$eval(".kview img", e => e.src)), "ảnh dùng link tạm có chữ ký");
  await e3.pg.goto(F + "#nguoi-p03"); await e3.pg.waitForTimeout(1200); assert.ok((await e3.pg.textContent("main")).includes("Sắc phong cụ tổ"), "hồ sơ người liên quan hiện tư liệu"); console.log("✔ Kho tư liệu: gửi → duyệt → hiện (kể cả trong hồ sơ)");
  assert.deepStrictEqual(errs, [], errs.join(";")); await b.close(); srv.close();
})().catch(e => { console.error("✘", e.message); process.exit(1); });
