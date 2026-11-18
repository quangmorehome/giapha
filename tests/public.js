const { chromium } = require("playwright"), path = require("path"), assert = require("assert"), http = require("http"), fs = require("fs");
const DIR = path.join(__dirname, "..", "dist", "public");
(async () => {
  // máy chủ tĩnh nhỏ để thử đúng như khi đưa lên mạng (data.json tải được)
  let override = null;
  const srv = http.createServer((q, r) => { const u = q.url.split("?")[0]; if (u === "/data.json" && override) { r.setHeader("content-type", "application/json"); return r.end(override); } const f = path.join(DIR, u === "/" ? "index.html" : u); if (!f.startsWith(DIR) || !fs.existsSync(f)) { r.statusCode = 404; return r.end(); } r.setHeader("content-type", f.endsWith(".json") ? "application/json" : f.endsWith(".html") ? "text/html;charset=utf8" : "application/octet-stream"); r.end(fs.readFileSync(f)); }).listen(0);
  const base = "http://127.0.0.1:" + srv.address().port + "/";
  const b = await chromium.launch(), ok = n => console.log("✔", n); const errs = [];
  for (const vw of [{ width: 1200, height: 800 }, { width: 400, height: 800 }]) {
    const pg = await (await b.newContext({ viewport: vw })).newPage(); pg.on("pageerror", e => errs.push(e.message));
    pg.on("console", m => { if (m.type() === "error" && !/Failed to load resource|ERR_/.test(m.text())) errs.push(m.text()); });
    await pg.goto(base); await pg.waitForTimeout(700);
    assert.ok(!(await pg.$("#sel-viewer")), "không có ô đổi vai"); assert.ok(await pg.$(".banner.pub"), "có dải thông báo công khai");
    for (const r of ["trang-chu", "danh-sach", "cay", "so-do", "mindmap", "bong-bong", "lich", "thong-ke", "ban-do", "di-tich"]) {
      await pg.goto(base + "#" + r); await pg.waitForTimeout(250);
      const ov = await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 2); assert.ok(!ov || vw.width > 500, r + " tràn ngang");
    }
    // khách không vào được biểu mẫu sửa/thêm và không thấy hồ sơ riêng tư
    await pg.goto(base + "#them"); await pg.waitForTimeout(300); assert.ok(!(await pg.$("form[data-submit]")), "khách không có form thêm");
    await pg.goto(base + "#nguoi-p24"); await pg.waitForTimeout(300); const tx = await pg.evaluate(() => document.body.innerText); assert.ok(!/Hồ sơ riêng tư \(mẫu\)/.test(tx), "lộ hồ sơ riêng tư");
    await pg.goto(base + "#nguoi-p23"); await pg.waitForTimeout(300); assert.ok(!/1940|20\/5/.test(await pg.evaluate(() => document.getElementById("main").innerText)), "lộ ngày sinh người còn sống");
    const ls = await pg.evaluate(() => Object.keys(localStorage).filter(k => /gp\.v2/.test(k))); assert.strictEqual(ls.length, 0, "không ghi dữ liệu vào trình duyệt");
  }
  ok("bản công khai: chỉ xem, không đổi vai, riêng tư không lọt, 2 khổ màn hình");
  // data.json mới thay thế bản nhúng
  const d = JSON.parse(fs.readFileSync(path.join(DIR, "data.json"), "utf8")); d.settings.tac_gia = "Người Thử Cập Nhật"; override = JSON.stringify(d);
  const pg = await (await b.newContext()).newPage(); await pg.goto(base); await pg.waitForTimeout(900);
  assert.ok(/Người Thử Cập Nhật/.test(await pg.evaluate(() => document.body.innerText)), "data.json mới được nạp"); ok("cập nhật chỉ bằng cách thay data.json");
  // mở bằng file:// (không có máy chủ): dùng dữ liệu nhúng sẵn
  const pf = await (await b.newContext()).newPage(); await pf.goto("file://" + path.join(DIR, "index.html") + "#danh-sach"); await pf.waitForTimeout(600); assert.ok((await pf.$$eval("main a[href^='#nguoi-']", e => e.length)) > 3, "dữ liệu nhúng hiện được"); ok("mở trực tiếp bằng tệp vẫn hiện dữ liệu nhúng");
  console.log(errs.length ? "LỖI JS: " + errs.join(" | ") : "không lỗi JS"); srv.close(); await b.close(); if (errs.length) process.exit(1); console.log("XONG");
})().catch(e => { console.log("FAIL", e.message); process.exit(1); });
