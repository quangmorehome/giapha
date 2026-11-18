const test = require("node:test"), assert = require("node:assert"), fs = require("fs"), path = require("path");
const STR = require("../src/i18n.js");
const dir = path.join(__dirname, "..", "src");
const keys = new Set();
fs.readdirSync(dir).filter(f => /^ui.*\.js$/.test(f)).forEach(f => {
  const s = fs.readFileSync(path.join(dir, f), "utf8");
  for (const m of s.matchAll(/\bt\("([a-z_]+\.[a-z_0-9]+)"/g)) keys.add(m[1]);
});
test("mọi khoá t(\"…\") trong giao diện đều có tiếng Việt", () => {
  const miss = [...keys].filter(k => STR.vi[k] === undefined);
  assert.deepStrictEqual(miss, []);
});
test("tiếng Anh đủ như tiếng Việt", () => {
  const miss = Object.keys(STR.vi).filter(k => STR.en[k] === undefined);
  assert.deepStrictEqual(miss, []);
});
test("tiếng Trung đủ như tiếng Việt", () => {
  const miss = Object.keys(STR.vi).filter(k => STR.zh[k] === undefined);
  assert.deepStrictEqual(miss, []);
});
test("biến {x} giữ nguyên giữa các ngôn ngữ", () => {
  for (const k of Object.keys(STR.vi)) for (const l of ["en", "zh"]) {
    const a = (STR.vi[k].match(/\{\w+\}/g) || []).sort().join(), b = (STR[l][k].match(/\{\w+\}/g) || []).sort().join();
    assert.strictEqual(b, a, l + ":" + k);
  }
});
