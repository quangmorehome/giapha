/* Trang: kiểm tra mâu thuẫn, dữ liệu (xuất nhập, nâng cấp), quản trị, tài khoản, nhật ký, giới thiệu, sách gia phả. */
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, S = GP.store, t = U.t, esc = U.esc, P = U.pages;
  function opt(v, label, sel) { return '<option value="' + esc(v) + '"' + (String(sel) === String(v) ? " selected" : "") + ">" + esc(label) + "</option>"; }
  function role() { return S.S.viewer.role; }
  function deny() { return { title: t("err.khong_du_quyen"), html: '<div class="card"><h1>' + esc(t("err.khong_du_quyen")) + "</h1><p>" + esc(t("err.can_dang_nhap")) + "</p></div>" }; }
  function locale() { return U.lang === "zh" ? "zh-CN" : U.lang === "en" ? "en-GB" : "vi-VN"; }

  // ---------- Kiểm tra mâu thuẫn ----------
  var showIgnored = false;
  P["kiem-tra"] = function () {
    if (role() !== "admin" && role() !== "editor") return deny();
    var d = S.S.data;
    var res = GP.checks.run(d.persons, d.spouses, { year: d.settings.nam_hien_tai });
    var ign = d.bo_qua || [], open = res.filter(function (r) { return ign.indexOf(r.key) < 0; }), done = res.filter(function (r) { return ign.indexOf(r.key) >= 0; });
    function item(r, isIgn) {
      var v = Object.assign({}, r.params, { vaiTro: r.params.vaiTro ? (U.lang === "zh" ? t("p." + r.params.vaiTro) : t("p." + r.params.vaiTro).toLowerCase()) : "" });
      return '<li class="finding ' + r.sev + '"><div>' + U.badge(t("sev." + r.sev), r.sev) + " " + esc(t("chk." + r.rule, v)) + '</div><div class="row tight">' + r.ids.map(function (id) { return U.link(id); }).join(" · ") + '<button type="button" class="btn small" data-act="chk-ign" data-key="' + esc(r.key) + '" data-v="' + (isIgn ? 0 : 1) + '">' + esc(isIgn ? t("chk.mo_lai") : t("chk.da_xem")) + "</button></div></li>";
    }
    var cs = function (sv) { return open.filter(function (r) { return r.sev === sv; }).length; };
    var html = "<h1>" + esc(t("chk.tieu_de")) + "</h1><p>" + esc(t("chk.mo_ta")) + '</p><p class="note">' + esc(t("chk.tong", { n: open.length })) + "</p>" + U.sumTiles([{ ico: "🚨", n: cs("cao"), label: t("sev.cao"), c: 3 }, { ico: "🔍", n: cs("tb"), label: t("sev.tb"), c: 4 }, { ico: "💡", n: cs("thap"), label: t("sev.thap"), c: 1 }, { ico: "✅", n: done.length, label: t("chk.da_xem"), c: 5 }], "compact") +
      ["cao", "tb", "thap"].map(function (sv) { var xs = open.filter(function (r) { return r.sev === sv; }); return xs.length ? "<h2>" + esc(t("sev." + sv)) + " (" + xs.length + ')</h2><ul class="plain findings">' + xs.map(function (r) { return item(r, false); }).join("") + "</ul>" : ""; }).join("") +
      (done.length ? '<details class="card"' + (showIgnored ? " open" : "") + '><summary>' + esc(t("chk.da_xem_ds", { n: done.length })) + '</summary><ul class="plain findings">' + done.map(function (r) { return item(r, true); }).join("") + "</ul></details>" : "");
    return { title: t("chk.tieu_de"), html: html };
  };
  U.acts["chk-ign"] = function (el) { var r = U.attempt(function () { S.ignoreCheck(el.getAttribute("data-key"), el.getAttribute("data-v") === "1"); }); if (r.ok) U.rerender(); };

  // ---------- Dữ liệu ----------
  function exportable() {
    var V = U.view(), vis = V.list.filter(function (p) { return p.level !== "hidden"; }).map(function (p) { var q = Object.assign({}, p); delete q.level; return q; }), ids = {}; vis.forEach(function (p) { ids[p.id] = 1; });
    return { persons: vis, spouses: S.S.data.spouses.filter(function (s) { return !s.da_an && ids[s.person_id] && (!s.spouse_person_id || ids[s.spouse_person_id]); }) };
  }
  function stamp() { var d = new Date(); return d.getFullYear() + "" + ("0" + (d.getMonth() + 1)).slice(-2) + ("0" + d.getDate()).slice(-2); }
  U.acts["ex-json"] = function () { U.download("gia-pha-" + stamp() + ".json", GP.io.backupJson(S.S.data, U.view().ctx), "application/json"); };
  // Tệp xem chung: bản công khai (tệp mẫu nhúng sẵn, nén) + dữ liệu hiện tại đã lọc quyền riêng tư
  U.acts["ex-share"] = function () {
    var r = U.attempt(function () { return JSON.stringify(GP.publish.sanitize(S.S.data, { nang_gia_toc: !!(document.getElementById("pub-gt") || {}).checked })); });
    if (!r.ok) return;
    if (!GP.SHARE_TPL || typeof DecompressionStream === "undefined") { U.toast("Trình duyệt quá cũ, hãy dùng Chrome/Safari mới"); return; }
    var bin = atob(GP.SHARE_TPL), u8 = new Uint8Array(bin.length); for (var i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
    new Response(new Blob([u8]).stream().pipeThrough(new DecompressionStream("gzip"))).text().then(function (tpl) {
      var data = r.v.replace(/<\//g, "<\\/"), a = tpl.indexOf("@@DATA@@");
      U.download("Gia-pha-Ho-Tong-xem-chung.html", tpl.slice(0, a) + data + tpl.slice(a + 8), "text/html");
    });
  };
  U.acts["ex-pub"] = function () { var r = U.attempt(function () { return JSON.stringify(GP.publish.sanitize(S.S.data, { nang_gia_toc: !!(document.getElementById("pub-gt") || {}).checked })); }); if (r.ok) U.download("data.json", r.v, "application/json"); };
  U.acts["ex-xlsx"] = function () { var e = exportable(), r = U.attempt(function () { return GP.xlsx.build(e.persons, e.spouses, (S.S.data.sites || []).filter(function (x) { return !x.da_an; }), { gen: U.gen }); }); if (r.ok) U.download("gia-pha-" + stamp() + ".xlsx", r.v, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"); };
  U.acts["ex-csv"] = function () { var e = exportable(); U.download("gia-pha-" + stamp() + ".csv", GP.io.toCsv(e.persons, e.spouses), "text/csv"); };
  U.acts["ex-ged"] = function () { var e = exportable(); U.download("gia-pha-" + stamp() + ".ged", GP.gedcom.exportGedcom(e, { tacGia: S.S.data.settings.tac_gia }), "text/plain"); };
  function sniff(text) {
    var s = text.replace(/^﻿/, "").trim();
    if (/^0\s+HEAD/m.test(s.slice(0, 200))) return "ged";
    if (s[0] === "{" || s[0] === "[") return "json";
    return "csv";
  }
  var pending = null;
  function parseImport(text) {
    var kind = sniff(text), r;
    if (kind === "ged") r = GP.gedcom.importGedcom(text);
    else if (kind === "json") r = GP.io.readJson(text);
    else r = Object.assign(GP.io.fromCsv(text), { warnings: [] });
    r.kind = kind; return r;
  }
  // Excel: đọc ngay trên máy, xem trước, rồi cập nhật theo Mã (hoặc thay toàn bộ)
  function xlsxPreview(f, box) {
    var sp = S.syncPreview(pending), w = pending.warnings || [];
    box.innerHTML = '<div class="card"><h3>' + esc(t("du.xem_truoc")) + " · " + esc(f.name) + '</h3><ul class="plain"><li>' + esc(t("du.xlsx_moi", { n: sp.nNew })) + "</li><li>" + esc(t("du.xlsx_capnhat", { n: sp.nUp })) + "</li><li>" + esc(t("du.so_vc", { n: pending.spouses.length })) + "</li>" + (pending.sites.length ? "<li>" + esc(t("du.xlsx_dt", { n: pending.sites.length })) + "</li>" : "") +
      (sp.broken ? '<li class="warnb">' + esc(t("du.lien_ket_gay", { n: sp.broken })) + "</li>" : "") + w.slice(0, 15).map(function (x) { return '<li class="warnb">' + esc(x) + "</li>"; }).join("") + (w.length > 15 ? '<li class="muted">… +' + (w.length - 15) + "</li>" : "") + "</ul>" +
      (role() === "admin" ? '<div class="row"><button type="button" class="btn primary" data-act="imp-sync">' + esc(t("du.sync_btn")) + '</button></div><p class="muted">' + esc(t("du.sync_mo_ta")) + '</p><div class="card warnb"><label class="chk"><input type="checkbox" id="imp-ok"> ' + esc(t("du.da_sao_luu")) + '</label><div class="row"><button type="button" class="btn" data-act="imp-replace">' + esc(t("du.thay_toan_bo")) + '</button></div><p class="muted">' + esc(t("du.thay_mo_ta")) + "</p></div>" : '<p class="muted">' + esc(t("du.chi_admin")) + "</p>") + "</div>";
  }
  U.acts["imp-sync"] = function () { if (!pending || pending.kind !== "xlsx") return; var r = U.attempt(function () { return S.syncImport(pending); }); if (r.ok) { U.toast(t("du.sync_xong", { moi: r.v.nNew, cn: r.v.nUp })); pending = null; U.rerender(); } };
  U.ons.imp = function (el) {
    var f = el.files[0], box = document.getElementById("imp-prev"); if (!f) return;
    if (/\.xlsx$/i.test(f.name)) {
      f.arrayBuffer().then(GP.xlsx.parse).then(function (sh) { pending = GP.xlsx.toImport(sh); xlsxPreview(f, box); }).catch(function (e) { pending = null; box.innerHTML = '<div class="card bad"><p>' + esc(t("du.loi_tep")) + " " + esc(String(e.message)) + "</p></div>"; });
      return;
    }
    var rd = new FileReader();
    rd.onload = function () {
      try { pending = parseImport(String(rd.result)); } catch (e) { pending = null; box.innerHTML = '<div class="card bad"><p>' + esc(t("du.loi_tep")) + " " + esc(String(e.message)) + "</p></div>"; return; }
      var ids = {}; pending.persons.forEach(function (p) { ids[p.id] = 1; });
      var broken = pending.persons.filter(function (p) { return (p.cha_id && !ids[p.cha_id]) || (p.me_id && !ids[p.me_id]); }).length;
      box.innerHTML = '<div class="card"><h3>' + esc(t("du.xem_truoc")) + " · " + esc(f.name) + " (" + pending.kind.toUpperCase() + ")</h3><ul class=\"plain\"><li>" + esc(t("du.so_nguoi", { n: pending.persons.length })) + "</li><li>" + esc(t("du.so_vc", { n: (pending.spouses || []).length })) + "</li>" +
        (pending.warnings || []).map(function (w) { return "<li class=\"warnb\">" + esc(w.indexOf("da_nang_cap") === 0 ? t("du.da_nang_cap", { n: w.split(":")[1] }) : w) + "</li>"; }).join("") + (broken ? '<li class="warnb">' + esc(t("du.lien_ket_gay", { n: broken })) + "</li>" : "") + "</ul>" +
        (role() === "admin" ? '<div class="row"><button type="button" class="btn primary" data-act="imp-add">' + esc(t("du.them_vao")) + '</button></div><p class="muted">' + esc(t("du.them_vao_mo_ta")) + '</p><div class="card warnb"><label class="chk"><input type="checkbox" id="imp-ok"> ' + esc(t("du.da_sao_luu")) + '</label><div class="row"><button type="button" class="btn" data-act="imp-replace">' + esc(t("du.thay_toan_bo")) + '</button></div><p class="muted">' + esc(t("du.thay_mo_ta")) + "</p></div>" : '<p class="muted">' + esc(t("du.chi_admin")) + "</p>") + "</div>";
    };
    rd.readAsText(f, "utf-8");
  };
  U.acts["imp-add"] = function () { if (!pending) return; var r = U.attempt(function () { return S.appendImport(pending); }); if (r.ok) { U.toast(t("du.da_them", { n: r.v })); pending = null; U.rerender(); } };
  U.acts["imp-replace"] = function () {
    if (!pending) return; if (!document.getElementById("imp-ok").checked) { U.toast(t("du.can_tick"), true); return; }
    var r = U.attempt(function () { S.replaceAll(pending); }); if (r.ok) { U.toast(t("du.da_thay")); pending = null; U.rerender(); }
  };
  U.acts["do-upgrade"] = function () { var r = U.attempt(function () { return S.upgradeAll(); }); if (r.ok) { U.toast(t("du.da_nang_cap_n", { n: r.v })); U.rerender(); } };
  U.acts["reset-ask"] = function () { document.getElementById("reset-box").innerHTML = '<div class="card warnb"><p>' + esc(t("du.dat_lai_hoi")) + '</p><div class="row"><button type="button" class="btn" data-act="reset-do">' + esc(t("du.dat_lai_xac_nhan")) + '</button><button type="button" class="btn" data-act="reset-no">' + esc(t("c.huy")) + "</button></div></div>"; };
  U.acts["reset-no"] = function () { document.getElementById("reset-box").innerHTML = ""; };
  U.acts["xoa-mau"] = function () { var r = U.attempt(function () { return S.removeSample(); }); if (r.ok) { U.toast(t("du.da_xoa_mau", { n: r.v })); U.rerender(); } };
  U.acts["reset-do"] = function () { var r = U.attempt(function () { S.resetSample(); }); if (r.ok) { U.toast(t("du.da_dat_lai")); U.rerender(); } };
  U.acts["scan-dup"] = function () {
    var d = S.S.data, res = GP.checks.run(d.persons, d.spouses, { year: d.settings.nam_hien_tai }).filter(function (r) { return r.rule === "co_the_trung"; });
    document.getElementById("dup-out").innerHTML = res.length ? '<ul class="plain">' + res.map(function (r) { return "<li>" + r.ids.map(function (i) { return U.link(i); }).join(" ≈ ") + "</li>"; }).join("") + "</ul>" : '<p class="muted">' + esc(t("du.khong_trung")) + "</p>";
  };
  P["du-lieu"] = function () {
    var d = S.S.data, size = Math.round(JSON.stringify(d).length / 1024), out = S.outdated(), adm = role() === "admin";
    var html = "<h1>" + esc(t("du.tieu_de")) + '</h1>' + (S.sampleCount() ? '<section class="card warnb"><h2>' + esc(t("du.mau_lan")) + "</h2><p>" + esc(t("du.mau_lan_mo_ta", { n: S.sampleCount() })) + '</p><div class="row"><button type="button" class="btn danger" data-act="xoa-mau">' + esc(t("du.xoa_mau")) + "</button></div></section>" : "") + '<section class="card"><h2>' + esc(t("du.xuat")) + "</h2><p>" + esc(t("du.xuat_mo_ta")) + '</p><div class="row"><button type="button" class="btn primary" data-act="ex-json">' + esc(adm ? t("du.sao_luu_day_du") : "JSON") + '</button><button type="button" class="btn primary" data-act="ex-xlsx">Excel (.xlsx)</button><button type="button" class="btn" data-act="ex-csv">CSV</button><button type="button" class="btn" data-act="ex-ged">GEDCOM 5.5.1</button>' + (adm ? '<button type="button" class="btn" data-act="ex-pub">' + esc(t("du.xuat_cong_khai")) + '</button><button type="button" class="btn primary" data-act="ex-share">' + esc(t("du.xuat_xem_chung")) + "</button>" : "") + '</div>' + (adm ? '<p class="muted">' + esc(t("du.xuat_cong_khai_mo_ta")) + '</p><p class="muted">' + esc(t("du.xuat_xem_chung_mo_ta")) + '</p><label class="chk"><input type="checkbox" id="pub-gt" checked> ' + esc(t("du.pub_gia_toc")) + "</label>" : "") + '<p class="muted">' + esc(t("du.anh_rieng")) + '</p><div id="xuat-box" class="card" hidden></div></section>' +
      '<section class="card"><h2>' + esc(t("du.nhap")) + '</h2><label class="lab" for="imp-f">' + esc(t("du.chon_tep")) + '</label><input class="inp" id="imp-f" type="file" accept=".xlsx,.json,.csv,.ged,.gedcom,.txt" data-on="imp"><div id="imp-prev"></div></section>' +
      '<section class="card"><h2>' + esc(t("du.tinh_trang")) + '</h2><dl class="kv"><dt>' + esc(t("du.phien_ban")) + "</dt><dd>v" + GP.VERSION + " · schema " + GP.io.SCHEMA + "</dd><dt>" + esc(t("du.ket_noi")) + "</dt><dd>" + esc(t("du.ket_noi_thu")) + (S.S.saved ? "" : " · " + U.badge(t("du.khong_luu_duoc"), "warn")) + "</dd><dt>" + esc(t("du.so_ban_ghi")) + "</dt><dd>" + d.persons.length + " / " + d.spouses.length + " / " + d.edit_history.length + "</dd><dt>" + esc(t("du.dung_luong")) + "</dt><dd>" + size + " KB</dd><dt>" + esc(t("du.can_nang_cap")) + "</dt><dd>" + out + (out && adm ? ' <button type="button" class="btn small" data-act="do-upgrade">' + esc(t("du.nang_cap")) + "</button>" : "") + "</dd>" + "</dl>" +
      '<p class="muted">' + esc(t("du.rls_ghi_chu")) + '</p><div class="row"><button type="button" class="btn" data-act="scan-dup">' + esc(t("du.quet_trung")) + '</button>' + (adm ? '<a class="btn" href="#nhat-ky">' + esc(t("nk.tieu_de")) + '</a><button type="button" class="btn" data-act="reset-ask">' + esc(t("du.dat_lai_mau")) + "</button>" : "") + '</div><div id="dup-out"></div><div id="reset-box"></div></section>';
    return { title: t("du.tieu_de"), html: html };
  };

  // ---------- Nhật ký (chỉ Admin) ----------
  var nkTable = "";
  P["nhat-ky"] = function () {
    if (role() !== "admin") return deny();
    var hs = S.S.data.edit_history.slice().reverse().filter(function (h) { return !nkTable || h.bang === nkTable; }).slice(0, 200), tables = Array.from(new Set(S.S.data.edit_history.map(function (h) { return h.bang; })));
    var html = "<h1>" + esc(t("nk.tieu_de")) + '</h1><p class="muted">' + esc(t("nk.mo_ta")) + '</p><label class="lab" for="nk-b">' + esc(t("nk.bang")) + '</label><select id="nk-b" data-on="nkb">' + opt("", t("l.tat_ca"), nkTable) + tables.map(function (b) { return opt(b, b, nkTable); }).join("") + '</select><ul class="plain hist">' +
      (hs.length ? hs.map(function (h) { return "<li><b>" + esc(t("ls." + h.hanh_dong)) + "</b> · <code>" + esc(h.bang) + "</code> " + (h.bang === "persons" && S.byId(h.ban_ghi_id) ? U.link(h.ban_ghi_id, U.fullName(S.byId(h.ban_ghi_id))) : esc(h.ban_ghi_id)) + " · <time>" + esc(new Date(h.luc).toLocaleString(locale())) + "</time> · " + esc(h.ai) + U.diffTxt(h) + "</li>"; }).join("") : '<li class="muted">' + esc(t("ls.chua_co")) + "</li>") + "</ul>";
    return { title: t("nk.tieu_de"), html: html };
  };
  U.ons.nkb = function (el) { nkTable = el.value; U.rerender(); };

  // ---------- Quản trị ----------
  P["quan-tri"] = function () {
    if (role() !== "admin") return deny();
    var d = S.S.data, st = d.settings, reqs = (d.yeu_cau || []).filter(function (q) { return !q.xong; });
    var html = "<h1>" + esc(t("qt.tieu_de")) + '</h1><section class="card"><h2>' + esc(t("qt.nguoi_dung")) + '</h2><div class="tblw"><table class="tbl"><thead><tr><th>' + esc(t("qt.ten")) + "</th><th>" + esc(t("qt.vai_tro")) + "</th><th>" + esc(t("qt.nguoi_lien_ket")) + '</th><th></th></tr></thead><tbody>' +
      d.profiles.map(function (p) { return "<tr" + (p.da_xoa ? ' class="dim"' : "") + "><td>" + esc(p.ten_hien_thi) + (p.da_xoa ? " " + U.badge(t("qt.da_xoa"), "warn") : "") + '</td><td><label class="sr" for="r-' + esc(p.id) + '">' + esc(t("qt.vai_tro")) + '</label><select id="r-' + esc(p.id) + '" data-on="role" data-id="' + esc(p.id) + '">' + ["admin", "editor", "member"].map(function (r) { return opt(r, t("role." + r), p.vai_tro); }).join("") + "</select></td><td>" + (p.person_id ? U.link(p.person_id) : "—") + "</td><td></td></tr>"; }).join("") + "</tbody></table></div>" +
      '<form data-submit="pr-add"><h3>' + esc(t("qt.them_tk")) + '</h3><div class="filters"><div><label class="lab" for="pa-t">' + esc(t("qt.ten")) + '</label><input class="inp" id="pa-t" name="ten" required></div><div><label class="lab" for="pa-r">' + esc(t("qt.vai_tro")) + '</label><select id="pa-r" name="vai_tro">' + ["member", "editor", "admin"].map(function (r) { return opt(r, t("role." + r), "member"); }).join("") + '</select></div></div><label class="lab">' + esc(t("qt.nguoi_lien_ket")) + "</label>" + U.picker("pap", null, {}) + '<div class="row"><button class="btn primary" type="submit">' + esc(t("c.luu")) + "</button></div></form><p class=\"muted\">" + esc(t("qt.vai_tro_mo_ta")) + "</p></section>" +
      '<section class="card"><h2>' + esc(t("qt.yeu_cau")) + "</h2>" + (reqs.length ? '<ul class="plain">' + reqs.map(function (q) { return "<li>" + esc(t("req." + q.loai)) + " · " + (q.person_id ? U.link(q.person_id) : "") + " · " + esc(new Date(q.luc).toLocaleString(locale())) + ' <button type="button" class="btn small" data-act="req-do" data-id="' + esc(q.id) + '">' + esc(t("qt.xu_ly")) + "</button></li>"; }).join("") + "</ul>" : '<p class="muted">' + esc(t("qt.khong_yeu_cau")) + "</p>") + "</section>" +
      '<section class="card"><h2>' + esc(t("qt.cai_dat")) + '</h2><form data-submit="set-save"><div class="filters">' +
      [["ten_dong_ho", "txt"], ["tac_gia", "txt"], ["nam_ban_quyen", "num"], ["giay_phep_noi_dung", "txt"], ["giay_phep_ma", "txt"], ["nam_hien_tai", "num"]].map(function (f) { return '<div><label class="lab" for="s-' + f[0] + '">' + esc(t("set." + f[0])) + '</label><input class="inp" id="s-' + f[0] + '" name="' + f[0] + '" value="' + esc(st[f[0]]) + '"' + (f[1] === "num" ? ' type="number"' : "") + "></div>"; }).join("") +
      '<div><label class="lab" for="s-q">' + esc(t("kin.quy_uoc")) + '</label><select id="s-q" name="quy_uoc_danh_xung">' + opt("bac", t("kin.qu_bac"), st.quy_uoc_danh_xung) + opt("di", t("kin.qu_di"), st.quy_uoc_danh_xung) + opt("trung", t("kin.qu_trung"), st.quy_uoc_danh_xung) + '</select></div><div><label class="lab" for="s-g">' + esc(t("set.gio_thang_thieu")) + '</label><select id="s-g" name="gio_thang_thieu">' + opt("cuoi", t("set.gio_cuoi"), st.gio_thang_thieu) + opt("mung1", t("set.gio_mung1"), st.gio_thang_thieu) + '</select></div></div><label class="lab" for="s-u">' + esc(t("set.ung_ho_thong_tin")) + '</label><textarea class="inp" id="s-u" name="ung_ho_thong_tin" rows="3">' + esc(st.ung_ho_thong_tin) + '</textarea><div class="row"><button class="btn primary" type="submit">' + esc(t("c.luu")) + "</button></div></form></section>";
    return { title: t("qt.tieu_de"), html: html };
  };
  U.ons.role = function (el) { var id = el.getAttribute("data-id"), pr = S.S.data.profiles.filter(function (x) { return x.id === id; })[0]; var r = U.attempt(function () { S.saveRow("profiles", Object.assign({}, pr, { vai_tro: el.value })); }); if (r.ok) { U.toast(t("c.da_luu")); U.invalidate(); } };
  U.ons["pr-add"] = function (f) {
    var d = new FormData(f), r = U.attempt(function () { return S.saveRow("profiles", { ten_hien_thi: d.get("ten"), vai_tro: d.get("vai_tro"), nhanh_chi: [], person_id: U.pkVal("pap") || null, da_xoa: false }); });
    if (r.ok) { U.toast(t("c.da_luu")); U.shell(); U.setViewerFromId(U.lsGet("gp.viewer") || "khach"); U.rerender(); }
  };
  U.ons["set-save"] = function (f) {
    var d = new FormData(f), o = {}; ["ten_dong_ho", "tac_gia", "giay_phep_noi_dung", "giay_phep_ma", "quy_uoc_danh_xung", "gio_thang_thieu", "ung_ho_thong_tin"].forEach(function (k) { o[k] = d.get(k); }); ["nam_ban_quyen", "nam_hien_tai"].forEach(function (k) { o[k] = +d.get(k); });
    var r = U.attempt(function () { S.saveSettings(o); }); if (r.ok) { U.toast(t("c.da_luu")); U.shell(); U.rerender(); }
  };
  U.acts["req-do"] = function (el) { var r = U.attempt(function () { S.resolveRequest(el.getAttribute("data-id")); }); if (r.ok) { U.toast(t("c.da_luu")); U.rerender(); } };

  // ---------- Tài khoản của tôi ----------
  P["tai-khoan"] = function () {
    var v = S.S.viewer; if (v.role === "khach") return deny();
    var mine = (S.S.data.yeu_cau || []).filter(function (q) { return q.profile_id === v.profileId; });
    var html = "<h1>" + esc(t("tk.tieu_de")) + '</h1><div class="card"><dl class="kv"><dt>' + esc(t("qt.ten")) + "</dt><dd>" + esc(v.ten) + "</dd><dt>" + esc(t("qt.vai_tro")) + "</dt><dd>" + esc(t("role." + v.role)) + "</dd><dt>" + esc(t("qt.nhanh")) + "</dt><dd>" + esc((v.chi || []).join(", ") || "—") + "</dd><dt>" + esc(t("qt.nguoi_lien_ket")) + "</dt><dd>" + (v.person_id ? U.link(v.person_id) : "—") + "</dd></dl></div>" +
      '<div class="card"><h2>' + esc(t("tk.quyen_cua_toi")) + "</h2><p>" + esc(t("tk.quyen_mo_ta")) + '</p><div class="row">' + (v.person_id ? '<button type="button" class="btn" data-act="req" data-k="an_ho_so">' + esc(t("req.an_ho_so")) + "</button>" : "") + '<button type="button" class="btn" data-act="req" data-k="xoa_tai_khoan">' + esc(t("req.xoa_tai_khoan")) + '</button></div>' + (mine.length ? '<ul class="plain">' + mine.map(function (q) { return "<li>" + esc(t("req." + q.loai)) + " · " + esc(q.xong ? t("tk.da_xu_ly") : t("tk.dang_cho")) + "</li>"; }).join("") + "</ul>" : "") + '<p class="muted">' + esc(t("tk.luat")) + "</p></div>";
    return { title: t("tk.tieu_de"), html: html };
  };
  U.acts.req = function (el) { var r = U.attempt(function () { return S.addRequest({ loai: el.getAttribute("data-k") }); }); if (r.ok) { U.toast(t("tk.da_gui")); U.rerender(); } };

  // ---------- Sách gia phả (in) ----------
  P.sach = function () {
    var V = U.view(), byDoi = {};
    V.list.forEach(function (p) { if (p.level === "hidden") return; (byDoi[p.the_thu || 0] = byDoi[p.the_thu || 0] || []).push(p); });
    var ks = Object.keys(byDoi).map(Number).sort(function (a, b) { return (a || 999) - (b || 999); });
    function entry(p, n) {
      var g = p.level === "full" && GP.io.gioInfo(p), sp = U.spousesOf(p.id).map(function (s) { return U.spouseName(s) + " (" + t("tt." + (s.tinh_trang || "dang_o")) + ")"; }), kids = U.childrenOf(p.id).sort(function (a, b) { return (a.thu_tu_con || 99) - (b.thu_tu_con || 99); }).map(function (c) { return U.nameOf(c.id); });
      var names = [p.ten_thuong_goi, p.ten_huy && t("p.ten_huy") + " " + p.ten_huy, p.ten_thuy && t("p.ten_thuy") + " " + p.ten_thuy, p.ten_han_nom].filter(Boolean).join(" · ");
      return '<li class="bk"><h3>' + n + ". " + esc(U.fullName(p)) + "</h3>" + (names ? '<p class="muted">' + esc(names) + "</p>" : "") + '<p>' + esc([p.gioi_tinh === "nam" ? t("p.nam") : p.gioi_tinh === "nu" ? t("p.nu") : "", p.chi, p.level === "full" ? (U.dateTxt(p.sinh) ? t("p.sinh") + " " + U.dateTxt(p.sinh) : "") : "", p.level === "full" && p.con_song === false && U.dateTxt(p.mat) ? t("p.mat") + " " + U.dateTxt(p.mat) : "", g ? t("p.gio_am") + " " + g.ngay + "/" + g.thang + (g.nhuan ? " " + t("d.nhuan") : "") : "", p.level === "full" && p.noi_an_tang ? t("p.noi_an_tang") + ": " + p.noi_an_tang : ""].filter(Boolean).join(" · ")) + "</p><p>" + esc(t("p.cha")) + ": " + esc(p.cha_id ? U.nameOf(p.cha_id) : t("p.chua_ro")) + " · " + esc(t("p.me")) + ": " + esc(p.me_id ? U.nameOf(p.me_id) : (p.me_ten || t("p.chua_ro"))) + "</p>" + (sp.length ? "<p>" + esc(t("p.vo_chong")) + ": " + esc(sp.join("; ")) + "</p>" : "") + (kids.length ? "<p>" + esc(t("p.con")) + ": " + esc(kids.join(", ")) + "</p>" : "") + (p.level === "full" && p.tieu_su ? "<p>" + esc(p.tieu_su) + "</p>" : "") + "</li>";
    }
    var n = 0, html = '<div class="noprint"><h1>' + esc(t("sach.tieu_de")) + "</h1><p>" + esc(t("sach.mo_ta")) + '</p><div class="row"><button type="button" class="btn primary" data-act="print">' + esc(t("c.in")) + '</button><a class="btn" href="#cay">←</a></div></div><div class="book"><div class="cover"><img src="' + GP.IMG.tam + '" alt="" width="256" height="140"><h1>' + esc(t("site.ten")) + "</h1><p>" + esc(t("sach.in_ngay") + ": " + new Date().toLocaleDateString(locale())) + "</p><p>© " + esc(S.S.data.settings.nam_ban_quyen + " " + S.S.data.settings.tac_gia + " · " + S.S.data.settings.giay_phep_noi_dung) + "</p></div>" +
      ks.map(function (k) { return '<section class="gen"><h2>' + esc(k ? t("p.doi") + " " + k : t("sach.chua_doi")) + '</h2><ol class="plain">' + byDoi[k].map(function (p) { return entry(p, ++n); }).join("") + "</ol></section>"; }).join("") + "</div>";
    return { title: t("sach.tieu_de"), html: html };
  };

  // ---------- Giới thiệu ----------
  P["gioi-thieu"] = function () {
    var st = S.S.data.settings;
    var html = "<h1>" + esc(t("gt.tieu_de")) + '</h1><section class="card"><img class="about-logo" src="' + GP.IMG.tam + '" width="512" height="279" alt="' + esc(t("site.logo_alt")) + '"><p>' + esc(t("gt.d1")) + "</p><p>" + esc(t("gt.d2")) + "</p><p>" + esc(t("gt.d3")) + '</p></section><section class="card"><h2>' + esc(t("gt.nguyen_tac")) + '</h2><ul class="plain bul"><li>' + esc(t("gt.n1")) + "</li><li>" + esc(t("gt.n2")) + "</li><li>" + esc(t("gt.n3")) + "</li><li>" + esc(t("gt.n4")) + "</li><li>" + esc(t("gt.n5")) + "</li></ul></section>" +
      '<section class="card"><h2>' + esc(t("gt.giay_phep")) + "</h2><p>" + esc(t("gt.noi_dung")) + ": <b>" + esc(st.giay_phep_noi_dung) + "</b> · " + esc(t("gt.ma_nguon")) + ": <b>" + esc(st.giay_phep_ma) + "</b></p><p>" + esc(t("gt.tac_gia")) + ": " + esc(st.tac_gia) + " © " + esc(st.nam_ban_quyen) + '</p></section><section class="card"><h2>' + esc(t("gt.ghi_cong")) + '</h2><ul class="plain bul"><li>' + esc(t("gt.c1")) + "</li><li>" + esc(t("gt.c2")) + "</li><li>" + esc(t("gt.c3")) + "</li><li>" + esc(t("gt.c4")) + '</li></ul></section><section class="card"><h2>' + esc(t("gt.bo_nhan_dien")) + '</h2><img class="about-logo" src="' + GP.IMG.bo + '" width="512" height="279" alt="' + esc(t("gt.bo_alt")) + '"></section>';
    return { title: t("gt.tieu_de"), html: html };
  };
})(typeof window !== "undefined" ? window : globalThis);
