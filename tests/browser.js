// Chạy: node tests/browser.js  (cần Chromium + playwright có sẵn)
const { chromium } = require("playwright");
const path = require("path"), OUT = process.env.SHOTS || "/tmp/shots";
require("fs").mkdirSync(OUT, { recursive: true });
const URL = "file://" + path.join(__dirname, "..", "dist", "_khung_thu.html");
const ROUTES = ["trang-chu","danh-sach","cay","so-do","mindmap","bong-bong","danh-xung","lich","thong-ke","phong-anh","dong-thoi-gian","di-tich","ban-do","bai-viet","ung-ho","kiem-tra","du-lieu","quan-tri","tai-khoan","nhat-ky","sach","gioi-thieu","nguoi-p22","nguoi-p40","sua-p22","them","bai-moi","nguoi-p43"];
(async () => {
  const b = await chromium.launch(); const errs = []; let overflow = [];
  for (const [w, h, name] of [[400, 800, "m"], [1280, 900, "d"]]) {
    for (const viewer of ["khach", "u_admin", "u_editor", "u_member"]) {
      const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1 }); const pg = await ctx.newPage();
      pg.on("pageerror", e => errs.push(`${name}/${viewer}: PAGEERROR ${e.message}`));
      pg.on("console", m => { if (m.type() === "error" && !/fonts\.g|ERR_(INTERNET|NAME|CONNECTION|BLOCKED|FAILED)/.test(m.text())) errs.push(`${name}/${viewer}: ${m.text()}`); });
      await pg.addInitScript(v => { try { localStorage.setItem("gp.viewer", v); } catch (e) {} }, viewer);
      await pg.goto(URL + "#trang-chu"); await pg.waitForTimeout(300);
      for (const r of ROUTES) {
        await pg.evaluate(r => { location.hash = r; }, r); await pg.waitForTimeout(120);
        const ow = await pg.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        if (ow > 1) overflow.push(`${name}/${viewer}/${r}: +${ow}px`);
        if (viewer === "u_admin" && ["trang-chu","cay","so-do","kiem-tra","du-lieu","lich","nguoi-p22","gioi-thieu"].includes(r)) await pg.screenshot({ path: `${OUT}/${name}-${r}.png` });
      }
      const miss = await pg.evaluate(() => Object.keys(window.GP.missing || {}));
      if (miss.length) errs.push(`${name}/${viewer}: khoá thiếu ${miss.join(", ")}`);
      await ctx.close();
    }
  }
  console.log("LỖI:", errs.length ? "\n" + [...new Set(errs)].join("\n") : "không"); console.log("TRÀN NGANG:", overflow.length ? "\n" + overflow.join("\n") : "không");
  await b.close();
})();
