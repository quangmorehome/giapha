#!/usr/bin/env node
/* Dùng: node tools/make_public.js [tep-sao-luu.json] [data.json]
 * Không đối số: dùng dữ liệu mẫu. Có tệp sao lưu đầy đủ (do Quản trị xuất): chỉ giữ phần KHÁCH được xem. */
const fs = require("fs"), path = require("path"), R = path.join(__dirname, "..");
["lunar", "checks", "privacy", "gedcom", "data", "io", "publish"].forEach(m => require(path.join(R, "src", m + ".js")));
const A = process.argv.slice(2).filter(a => a.indexOf("--") !== 0), GP = globalThis.GP, inp = A[0], out = A[1] || path.join(R, "dist", "public", "data.json");
let state, mau = false;
if (inp && fs.existsSync(inp)) { state = JSON.parse(fs.readFileSync(inp, "utf8")); if (!state.persons) throw new Error("Tệp không phải bản sao lưu gia phả (thiếu persons)"); state.settings = state.settings || GP.sample.settings; state.spouses = state.spouses || []; }
else { state = JSON.parse(JSON.stringify(GP.sample)); state.media = []; state.mau = true; mau = true; }
const nang = process.argv.indexOf("--rieng-nguyen") < 0; // mặc định: nâng mức "Gia tộc" → công khai
const pub = GP.publish.sanitize(state, { mau, nang_gia_toc: nang });
fs.mkdirSync(path.dirname(out), { recursive: true }); fs.writeFileSync(out, JSON.stringify(pub));
console.log("data.json:", pub.persons.length, "hồ sơ,", pub.spouses.length, "quan hệ vợ/chồng ->", out);
