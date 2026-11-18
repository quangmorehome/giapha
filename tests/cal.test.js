const test = require("node:test"), assert = require("assert");
globalThis.GP = {}; require("../src/lunar.js"); const priv = require("../src/privacy.js"); require("../src/io.js");
const P = [
  { id: "a", ho: "T", ten: "A", cha_id: null, con_song: true, sinh: { ngay: 20, thang: 11, nam: 1980 }, muc_hien_thi: "gia_toc" },
  { id: "kid", ho: "T", ten: "K", con_song: true, sinh: { ngay: 21, thang: 11, nam: 2015 }, muc_hien_thi: "gia_toc" },
  { id: "me", ho: "T", ten: "M", con_song: true, sinh: { ngay: 5, thang: 1, nam: 1990 }, muc_hien_thi: "gia_toc" }
];
test("người có tài khoản thấy sinh nhật của người chỉ hiển thị cơ bản; khách thì không", () => {
  const acc = priv.makeContext({ role: "member", person_id: "me" }, P, [], 2026), gst = priv.makeContext({ role: "khach" }, P, [], 2026);
  const la = priv.visibleList(P, acc), lg = priv.visibleList(P, gst);
  const a = la.find(p => p.id === "a"); assert.strictEqual(a.level, "basic"); assert.ok(a.cal && a.cal.sinh.ngay === 20 && a.cal.sinh.nam === 1980); assert.ok(!("sinh" in a));
  assert.strictEqual(la.find(p => p.id === "kid").cal.sinh.nam, undefined, "không lộ năm sinh trẻ em");
  assert.ok(!lg.find(p => p.id === "a").cal);
  const ev = GP.io.upcoming(la, [14, 11, 2026], [30, 11, 2026], { leTet: false }).filter(e => e.loai === "sinh").map(e => e.id).sort();
  assert.deepStrictEqual(ev, ["a", "kid"]);
  assert.strictEqual(GP.io.upcoming(lg, [14, 11, 2026], [30, 11, 2026], { leTet: false }).filter(e => e.loai === "sinh").length, 0);
});
