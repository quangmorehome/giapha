/* Danh nhân & thành tích: hồ sơ do người nhà viết (bài viết nhóm danh_nhan) + nghề nghiệp ghi trong gia phả */
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, S = GP.store, t = U.t, esc = U.esc, P = U.pages, open = false;
  function role() { return S.S.viewer.role; }
  function excerpt(a) {
    var ls = String(a.noi_dung || "").split("\n").map(function (x) { return x.trim(); }).filter(function (x) { return x && !/^[>#|]/.test(x); });
    var tx = (ls[0] || "").replace(/\*\*?/g, "").replace(/\s+/g, " "); return tx.length > 170 ? tx.slice(0, 167).replace(/\s\S*$/, "") + "…" : tx;
  }
  P["danh-nhan"] = function () {
    if (!U.okItem([0, 0, "w"])) return { title: t("p.khong_co"), html: '<div class="card"><h1>' + esc(t("p.khong_co")) + '</h1><p><a class="btn" href="#trang-chu">←</a></p></div>' };
    var r = role(), arts = (S.S.data.articles || []).filter(function (a) { return a.nhom === "danh_nhan" && a.trang_thai !== "luu_tru" && (a.trang_thai === "da_duyet" || r === "admin" || r === "editor"); }).sort(function (a, b) { return (a.thu_tu || 99) - (b.thu_tu || 99) || String(a.tieu_de).localeCompare(String(b.tieu_de), "vi"); });
    var V = U.view(), jobs = V.list.filter(function (p) { return p.level === "full" && p.nghe && String(p.nghe).trim(); }).sort(function (a, b) { return (U.gen ? (U.gen(a) || 99) - (U.gen(b) || 99) : 0); });
    var html = "<h1>🏅 " + esc(t("dn.tieu_de")) + "</h1><p>" + esc(t("dn.mo_ta")) + "</p>" + (U.canWrite() ? '<p><button type="button" class="btn primary" data-act="dn-new">+ ' + esc(t("dn.viet")) + "</button></p>" : "");
    if (open && U.canWrite()) html += '<form class="card" data-submit="dn-save"><h2>' + esc(t("dn.viet")) + '</h2><label class="lab" for="dn-t">' + esc(t("dn.ten")) + '</label><input class="inp" id="dn-t" name="tieu_de" required placeholder="' + esc(t("dn.vd")) + '"><label class="lab" for="dn-n">' + esc(t("dn.noi_dung")) + '</label><textarea class="inp" id="dn-n" name="noi_dung" rows="8"></textarea><label class="lab" for="dn-s">' + esc(t("bv.nguon")) + '</label><input class="inp" id="dn-s" name="nguon" placeholder="' + esc(t("dn.nguon_vd")) + '"><p class="muted">' + esc(t("dn.luu_y")) + '</p><div class="row"><button class="btn primary" type="submit">' + esc(t("c.luu")) + '</button><button type="button" class="btn ghost" data-act="dn-new">' + esc(t("c.huy")) + "</button></div></form>";
    html += arts.length ? '<div class="plgrid">' + arts.map(function (a, i) { return '<a class="card plc" href="#bai-' + esc(a.id) + '"><span class="pln">🏅</span><h2>' + esc(a.tieu_de) + "</h2>" + (a.trang_thai !== "da_duyet" ? U.badge(t("bv.nhap"), "warn") + " " : "") + "<p>" + esc(excerpt(a)) + "</p></a>"; }).join("") + "</div>" : '<p class="note">' + esc(t("dn.chua_co")) + "</p>";
    if (jobs.length) html += '<section class="card"><h2>' + esc(t("dn.nghe")) + '</h2><ul class="plain jobs">' + jobs.map(function (p) { return "<li>" + U.link(p.id) + ' <span class="muted">— ' + esc(p.nghe) + (U.gen && U.gen(p) ? " · " + esc(t("p.doi") + " " + U.gen(p)) : "") + "</span></li>"; }).join("") + "</ul></section>";
    return { title: t("dn.tieu_de"), html: html };
  };
  U.acts["dn-new"] = function () { open = !open; U.rerender(); };
  U.ons["dn-save"] = function (f) {
    var d = new FormData(f), row = { tieu_de: d.get("tieu_de"), noi_dung: d.get("noi_dung"), nguon: d.get("nguon") || "", nhom: "danh_nhan", trang_thai: role() === "admin" ? "da_duyet" : "nhap", nguoi_duyet: "" };
    var r = U.attempt(function () { return S.saveRow("articles", row); }); if (r.ok) { open = false; U.toast(t("c.da_luu")); U.rerender(); }
  };
})(typeof window !== "undefined" ? window : globalThis);
