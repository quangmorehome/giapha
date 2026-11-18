/* Giao diện đăng nhập + đồng bộ đám mây (Supabase): thanh đầu trang, trạng thái, thẻ trong trang Dữ liệu */
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, S = GP.store, C = GP.cloud, t = U.t, esc = U.esc, P = U.pages;
  var TT = { conflict: "cl.tt_conflict", empty: "cl.tt_empty", logging: "cl.tt_logging", login_err: "cl.tt_login_err", no_role: "cl.tt_no_role", offline: "cl.tt_offline", pub_err: "cl.tt_pub_err", saving: "cl.tt_saving", member_wait: "cl.tt_member_wait", member_stale: "cl.tt_member_stale" };
  function stText(s) {
    if (!s) return "";
    if (s.indexOf("ok:") === 0) return t("cl.da_dong_bo", { gio: s.slice(3) });
    if (s.indexOf("err:") === 0) return t("cl.loi_mang") + " " + s.slice(4);
    return t(TT[s] || "cl.tt_offline");
  }
  U.cloudStatus = function () { var e = document.getElementById("cl-status"); if (e) { e.textContent = stText(C.st.status); e.className = "cl-st dot-" + stDot(C.st.status) + (/^(conflict|err|pub_err|login_err)/.test(C.st.status) ? " bad" : ""); } if (/^conflict/.test(C.st.status)) U.toast(t("cl.tt_conflict"), true); };
  function initial(n) { n = String(n || "?").trim(); var w = n.split(/\s+/); return (w[w.length - 1] || "?").charAt(0).toUpperCase(); }
  function stDot(s) { return /^(conflict|err|pub_err|login_err|no_role|offline|member_stale)/.test(s) ? "bad" : /^(saving|logging)/.test(s) ? "busy" : "ok"; }
  U.cloudBar = function () {
    var st = C.st, I = GP.ico;
    var nolink = st.user && st.role && !st.nguoi && st.role !== "member" ? '<a class="chip warnc nolink" href="#tai-khoan">⚠ ' + esc(t("tv.chua_gan_minh")) + "</a>" : "";
    if (st.user && (st.role === "admin" || st.role === "editor" || (st.role === "member" && st.nguoi)))
      return '<div class="wrap who cloudbar"><span class="avatar" aria-hidden="true">' + esc(initial(st.ten || st.user)) + '</span><span class="who-name"><b>' + esc(st.ten || st.user) + '</b> <span class="chip role-' + st.role + '">' + I(st.role === "admin" ? "shield" : "pen") + esc(t("role." + st.role)) + '</span>' + nolink + '</span><span id="cl-status" class="cl-st dot-' + stDot(st.status) + '">' + esc(stText(st.status)) + '</span><button type="button" class="btn small logout" data-act="cl-out">' + I("logout") + esc(t("cl.dang_xuat")) + "</button></div>";
    return '<div class="wrap who cloudbar"><details class="cloudlogin"' + (st.status === "login_err" ? " open" : "") + '><summary class="btn small loginbtn">' + I("login") + esc(t("cl.dang_nhap")) + '</summary><form data-submit="cl-login" class="loginform"><div class="lf-head">' + I("lock") + '<b>' + esc(t("cl.dang_nhap")) + '</b></div><label class="sr" for="cl-e">Email</label><span class="fld">' + I("mail") + '<input id="cl-e" name="email" type="email" autocomplete="username" placeholder="Email" required></span><label class="sr" for="cl-p">' + esc(t("cl.mat_khau")) + '</label><span class="fld">' + I("key") + '<input id="cl-p" name="pw" type="password" autocomplete="current-password" placeholder="' + esc(t("cl.mat_khau")) + '" required><button type="button" class="eye" data-act="cl-eye" aria-label="' + esc(t("cl.hien_mk")) + '">' + I("eye") + '</button></span><button class="btn primary" type="submit">' + I("login") + esc(t("cl.vao")) + '</button></form></details>' +
      '<span id="cl-status" class="cl-st dot-' + stDot(st.status) + '">' + esc(stText(st.status)) + "</span></div>";
  };
  U.ons.tvvai = function (el) { var tr = el.closest("tr"), pp = tr && tr.querySelector(".tv-pp"); if (pp) pp.hidden = el.value === "none"; };
  U.acts["cl-eye"] = function (el) { var i = document.getElementById("cl-p"); if (i) { i.type = i.type === "password" ? "text" : "password"; el.setAttribute("aria-pressed", String(i.type === "text")); } };
  U.ons["cl-login"] = function (f) {
    var email = f.elements.email.value.trim(), pw = f.elements.pw.value; C.st.status = "logging"; U.cloudStatus();
    C.login(email, pw).then(function () { location.reload(); }).catch(function (e) { C.st.status = "login_err"; U.cloudStatus(); U.toast(t("cl.sai_dang_nhap") + (e.message ? " (" + e.message + ")" : ""), true); });
  };
  U.acts["cl-out"] = function () { C.logout(); location.reload(); };
  U.acts["cl-first"] = function () { C.st.loaded = true; C.st.version = 0; C.sync(true).then(function (ok) { U.toast(ok ? t("cl.da_dua_len") : t("cl.tt_conflict"), !ok); U.rerender(); }); };
  U.acts["cl-pub"] = function () { C.sync(true).then(function (ok) { U.toast(ok ? t("cl.da_dang") : t("cl.tt_pub_err"), !ok); }); };
  U.acts["cl-reload"] = function () { C.boot().then(function () { location.reload(); }); };
  // ---------- Quản trị: thêm / đổi / thu hồi vai trò Quản trị, Biên tập ----------
  var ROLES = ["admin", "editor", "member", "none"], RL = { admin: "tv.vt_admin", editor: "tv.vt_editor", member: "tv.vt_member", none: "tv.vt_none" };
  function personOpts(sel) { return '<option value="">' + esc(t("tv.chon_ho_so")) + "</option>" + S.S.data.persons.filter(function (p) { return !p.da_an; }).sort(function (a, b) { return U.fullName(a) < U.fullName(b) ? -1 : 1; }).map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === sel ? " selected" : "") + ">" + esc(U.fullName(p) + (U.gen(p) ? " · " + t("p.doi") + " " + U.gen(p) : "") + (p.sinh && p.sinh.nam ? " · " + p.sinh.nam : "")) + "</option>"; }).join(""); }
  function memberRows(rows) {
    var me = C.myId();
    return '<div class="tblw"><table class="tbl"><thead><tr><th>Email</th><th>' + esc(t("tv.ten")) + "</th><th>" + esc(t("qt.vai_tro")) + '</th><th></th></tr></thead><tbody>' + rows.map(function (m) {
      var cur = m.r_vai_tro || "none", self = m.r_user_id === me;
      return '<tr data-uid="' + esc(m.r_user_id) + '"><td>' + esc(m.r_email || "") + (self ? " <span class=\"muted\">" + esc(t("tv.ban")) + "</span>" : "") + '</td><td><label class="sr" for="tn-' + esc(m.r_user_id) + '">' + esc(t("tv.ten")) + '</label><input class="inp" id="tn-' + esc(m.r_user_id) + '" name="ten" value="' + esc(m.r_ten || "") + '" maxlength="60"></td><td><label class="sr" for="tr-' + esc(m.r_user_id) + '">' + esc(t("qt.vai_tro")) + '</label><select class="inp" id="tr-' + esc(m.r_user_id) + '" name="vai" data-on="tvvai"' + (self ? " disabled" : "") + ">" + ROLES.map(function (r) { return '<option value="' + r + '"' + (r === cur ? " selected" : "") + ">" + esc(t(RL[r])) + "</option>"; }).join("") + '</select><select class="inp tv-pp" name="nguoi" aria-label="' + esc(t("tv.ho_so_gan")) + '"' + (cur === "none" ? " hidden" : "") + ">" + personOpts(m.r_nguoi_id) + '</select></td><td><button type="button" class="btn small" data-act="tv-save" data-uid="' + esc(m.r_user_id) + '">' + esc(t("c.luu")) + "</button></td></tr>";
    }).join("") + "</tbody></table></div>";
  }
  function membersCard() {
    return '<section class="card" id="tv-card"><h2>👥 ' + esc(t("tv.tieu_de")) + '</h2><p class="muted">' + esc(t("tv.mo_ta")) + '</p><details class="tvhow"><summary>' + esc(t("tv.them_nhu_the_nao")) + "</summary><ol><li>" + esc(t("tv.b1")) + "</li><li>" + esc(t("tv.b2")) + "</li><li>" + esc(t("tv.b3")) + "</li><li>" + esc(t("tv.b4")) + '</li></ol></details><div class="row"><button type="button" class="btn" data-act="tv-load">' + esc(t("tv.tai")) + '</button><button type="button" class="btn primary" data-act="tv-pub">🔄 ' + esc(t("tv.cap_nhat_nn")) + '</button></div><div id="tv-rep" class="muted" aria-live="polite"></div><div id="tv-box" aria-live="polite"><p class="muted">' + esc(t("tv.dang_tai")) + "</p></div></section>";
  }
  U.acts["tv-load"] = function () {
    var box = document.getElementById("tv-box"); if (box) box.innerHTML = '<p class="muted">' + esc(t("tv.dang_tai")) + "</p>";
    C.listMembers().then(function (rows) { var b = document.getElementById("tv-box"); if (b) b.innerHTML = rows.length ? memberRows(rows) : '<p class="muted">' + esc(t("tv.chua_co")) + "</p>"; })
      .catch(function (e) { var b = document.getElementById("tv-box"); if (b) b.innerHTML = '<p class="warnb">' + esc(/function|rpc|404|PGRST/i.test(e.message || "") ? t("tv.chua_cai_sql") : (e.message || "")) + "</p>"; });
  };
  U.acts["tv-pub"] = function () {
    var box = document.getElementById("tv-rep"); if (box) box.textContent = t("tv.dang_cap_nhat");
    C.publishMembers(true).then(function (rep) {
      var b = document.getElementById("tv-rep"); if (!b) return;
      var h = rep.rows.map(function (r) { return "<li>" + (r.loi ? "❌ " : "✅ ") + esc(r.ten) + " → " + esc(r.ho_so) + ": " + (r.loi ? "<b>" + esc(r.loi) + "</b>" + (/404|gp_nguoi_nha|relation/i.test(r.loi) ? " — " + esc(t("tv.chua_cai_sql3")) : "") : esc(t("tv.n_ho_so", { n: r.so_nguoi }))) + "</li>"; }).join("");
      if (rep.thieu.length) h += "<li>⚠️ " + esc(t("tv.thieu_ho_so")) + ": " + esc(rep.thieu.join(", ")) + "</li>";
      b.innerHTML = rep.rows.length || rep.thieu.length ? '<ul class="plain">' + h + "</ul>" : esc(t("tv.chua_co_nn"));
    }).catch(function (e) { var b = document.getElementById("tv-rep"); if (b) b.innerHTML = '<span class="warnb">' + esc(/function|rpc|404|PGRST/i.test(e.message || "") ? t("tv.chua_cai_sql") : (e.message || "")) + "</span>"; });
  };
  U.acts["tv-save"] = function (el) {
    var tr = el.closest("tr"), uid = el.getAttribute("data-uid"), vai = tr.querySelector("[name=vai]").value, ten = tr.querySelector("[name=ten]").value.trim(), ng = tr.querySelector("[name=nguoi]").value;
    if (vai !== "none" && !ng) { U.toast(t("tv.can_chon_ho_so"), true); return; }
    if (uid === C.myId()) vai = C.st.role; // không tự đổi vai trò của chính mình
    C.setRole(uid, vai, ten, ng).then(function () { return vai === "member" ? C.publishMembers(true) : null; }).then(function () { U.toast(t("tv.da_luu")); U.acts["tv-load"](); }).catch(function (e) { U.toast((e.message || "") + "", true); });
  };
  // ---------- Tài khoản của tôi: Quản trị / Biên tập tự gắn mình với một hồ sơ ----------
  var oldTK = P["tai-khoan"];
  P["tai-khoan"] = function () {
    var o = oldTK(), v = S.S.viewer;
    if (!o || !o.html || !C.st.user || !(C.st.role === "admin" || C.st.role === "editor")) return o;
    var cur = C.st.nguoi && S.S.data.persons.filter(function (p) { return p.id === C.st.nguoi; })[0];
    var card = '<form class="card" data-submit="tk-gan"><h2>' + esc(t("tv.gan_minh_tt")) + "</h2><p>" + esc(cur ? t("tv.gan_dang") + ": " + U.fullName(cur) : t("tv.gan_mo_ta")) + '</p><div class="row"><label class="sr" for="tk-ng">' + esc(t("tv.chon_ho_so")) + '</label><select class="inp" id="tk-ng" name="nguoi">' + personOpts(C.st.nguoi) + '</select><button class="btn primary" type="submit">' + esc(t("c.luu")) + "</button></div></form>";
    o.html = o.html.replace("</h1>", "</h1>" + card);
    return o;
  };
  U.ons["tk-gan"] = function (f) {
    var id = f.elements.nguoi.value; if (!id) { U.toast(t("tv.chon_ho_so"), true); return; }
    C.linkSelf(id).then(function () { U.toast(t("tv.da_luu")); location.reload(); }).catch(function (e) { U.toast((e && e.message) || t("cl.tt_pub_err"), true); });
  };
  var oldQT = P["quan-tri"];
  P["quan-tri"] = function () {
    var r = oldQT(); if (!r || !U.cloudOn() || !r.html) return r;
    var a = r.html.indexOf('<section class="card"><h2>' + esc(t("qt.nguoi_dung"))), b = r.html.indexOf('<section class="card"><h2>' + esc(t("qt.yeu_cau")));
    if (a < 0 || b < 0) return r;
    r.html = r.html.slice(0, a) + membersCard() + r.html.slice(b);
    var af = r.after; r.after = function () { if (af) af(); U.acts["tv-load"](); };
    return r;
  };
  var old = P["du-lieu"];
  P["du-lieu"] = function () {
    var r = old(); if (!U.cloudOn() || S.S.viewer.role !== "admin") return r;
    var st = C.st, loaded = st.loaded;
    r.html += '<section class="card"><h2>☁️ ' + esc(t("cl.tieu_de")) + '</h2><p class="muted">' + esc(t("cl.mo_ta")) + "</p><p id=\"cl-status\" class=\"cl-st\">" + esc(stText(st.status)) + '</p><div class="row">' +
      (loaded ? '<button type="button" class="btn primary" data-act="cl-pub">' + esc(t("cl.dang_ngay")) + "</button>" : '<button type="button" class="btn primary" data-act="cl-first">' + esc(t("cl.dua_len_lan_dau")) + '</button>') +
      '<button type="button" class="btn" data-act="cl-reload">' + esc(t("cl.tai_lai")) + "</button></div>" + (loaded ? "" : '<p class="warnb">' + esc(t("cl.lan_dau_ghi_chu")) + "</p>") + "</section>";
    return r;
  };

  // ---------- Cài như ứng dụng trên điện thoại (PWA) ----------
  var inst = null;
  function standalone() { try { return (window.matchMedia && matchMedia("(display-mode: standalone)").matches) || navigator.standalone === true; } catch (e) { return false; } }
  if (typeof window !== "undefined") {
    window.addEventListener("beforeinstallprompt", function (e) { e.preventDefault(); inst = e; try { if (U.rerender && /^#?(trang-chu)?$/.test(location.hash)) U.rerender(); } catch (x) {} });
    window.addEventListener("appinstalled", function () { inst = null; try { U.toast(t("pwa.da_cai")); U.rerender(); } catch (x) {} });
    if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol) && !GP.PUBLIC_FRAME && !GP.PUBLIC) window.addEventListener("load", function () { navigator.serviceWorker.register("sw.js").catch(function () {}); });
  }
  U.installCard = function () {
    if (standalone()) return "";
    var ua = navigator.userAgent || "", ios = /iPhone|iPad|iPod/.test(ua), body;
    if (inst) body = '<button type="button" class="btn primary" data-act="pwa-install">📲 ' + esc(t("pwa.cai")) + "</button>";
    else body = '<p class="note">' + esc(t(ios ? "pwa.ios" : "pwa.khac")) + "</p>";
    return '<section class="card pwa"><h2>📲 ' + esc(t("pwa.tieu_de")) + "</h2><p>" + esc(t("pwa.mo_ta")) + "</p>" + body + "</section>";
  };
  U.acts["pwa-install"] = function () { if (!inst) return; inst.prompt(); inst.userChoice && inst.userChoice.then(function () { inst = null; U.rerender(); }); };

  // ---------- Đề xuất sửa / bổ sung (người trong họ gửi, Quản trị duyệt) ----------
  var DX = { list: null, err: "", busy: false, for: "" }, DXL = ["sua", "them_nguoi", "sai", "tu_lieu", "khac"], DXK = { sua: "dx.l_sua", them_nguoi: "dx.l_them_nguoi", sai: "dx.l_sai", tu_lieu: "dx.l_tu_lieu", khac: "dx.l_khac" }, DXT = { moi: "dx.tt_moi", da_xu_ly: "dx.tt_da_xu_ly", tu_choi: "dx.tt_tu_choi" };
  function dxLoad() { if (DX.busy) return; DX.busy = true; C.listProposals().then(function (r) { DX.list = r; DX.err = ""; }, function (e) { DX.list = DX.list || []; DX.err = (e && e.message) || "loi"; }).then(function () { DX.busy = false; if (/^#de-xuat/.test(location.hash)) U.rerender(); else U.badges(); }); }
  function dxItem(x, adm) {
    var V = U.view(), p = x.nguoi_id && V.by[x.nguoi_id], who = p && p.level !== "hidden" ? '<a href="#nguoi-' + esc(x.nguoi_id) + '">' + esc(U.fullName(p)) + "</a>" : "";
    var bd = '<span class="chip dx-' + esc(x.trang_thai) + '">' + esc(t(DXT[x.trang_thai] || "dx.tt_moi")) + "</span>";
    return '<li class="dxi"><div class="dxh"><b>' + esc(t(DXK[x.loai] || "dx.l_khac")) + "</b> " + bd + (who ? " · " + who : "") + '</div><p class="dxn">' + esc(x.noi_dung).replace(/\n/g, "<br>") + '</p><p class="muted">' + esc((adm && x.ten ? x.ten + " · " : "") + String(x.created_at || "").slice(0, 10)) + (x.ghi_chu ? " · " + esc(x.ghi_chu) : "") + "</p>" +
      (adm && x.trang_thai === "moi" ? '<div class="row">' + (who ? '<a class="btn small" href="#sua-' + esc(x.nguoi_id) + '">✏️ ' + esc(t("c.sua")) + '</a>' : "") + '<button type="button" class="btn small primary" data-act="dx-ok" data-id="' + esc(x.id) + '">✔ ' + esc(t("dx.da_xu_ly")) + '</button><button type="button" class="btn small" data-act="dx-no" data-id="' + esc(x.id) + '">✕ ' + esc(t("dx.tu_choi")) + "</button></div>" : "") + "</li>";
  }
  P["de-xuat"] = function () {
    var role = C.st && C.st.role, adm = role === "admin", V = U.view();
    if (!C.st || !C.st.user || !role || role === "khach") return { title: t("dx.tieu_de"), html: "<h1>" + esc(t("dx.tieu_de")) + '</h1><div class="card"><p>' + esc(t("dx.can_dang_nhap")) + "</p></div>" };
    if (DX.list === null) dxLoad();
    var opts = '<option value="">' + esc(t("dx.khong_ai")) + "</option>" + V.list.filter(function (p) { return p.level !== "hidden"; }).sort(function (a, b) { return U.fullName(a) < U.fullName(b) ? -1 : 1; }).map(function (p) { return '<option value="' + esc(p.id) + '"' + (p.id === DX.for ? " selected" : "") + ">" + esc(U.fullName(p) + (U.gen(p) ? " · " + t("p.doi") + " " + U.gen(p) : "")) + "</option>"; }).join("");
    var form = '<form class="card dxf" data-submit="dx-send"><h2>' + esc(t("dx.gui")) + '</h2><p class="muted">' + esc(t("dx.mo_ta")) + '</p><label class="lab" for="dx-l">' + esc(t("dx.loai")) + '</label><select class="inp" id="dx-l" name="loai">' + DXL.map(function (k) { return '<option value="' + k + '">' + esc(t(DXK[k])) + "</option>"; }).join("") + '</select><label class="lab" for="dx-n">' + esc(t("dx.ve_ai")) + '</label><select class="inp" id="dx-n" name="nguoi_id">' + opts + '</select><label class="lab" for="dx-t">' + esc(t("dx.noi_dung")) + '</label><textarea class="inp" id="dx-t" name="noi_dung" rows="5" required minlength="5" placeholder="' + esc(t("dx.vd")) + '"></textarea><div class="row"><button class="btn primary" type="submit">' + esc(t("dx.gui_nut")) + "</button></div></form>";
    var all = DX.list || [], pend = all.filter(function (x) { return x.trang_thai === "moi"; }), mine = all.filter(function (x) { return x.user_id === C.myId(); });
    var html = "<h1>" + esc(t("dx.tieu_de")) + "</h1>" + (DX.err ? '<div class="card"><p class="note">' + esc(t("dx.loi_sql")) + " (" + esc(DX.err) + ")</p></div>" : "") + form;
    if (adm) html += '<section class="card"><h2>' + esc(t("dx.cho_duyet")) + " (" + pend.length + ')</h2>' + (pend.length ? '<ul class="plain dxl">' + pend.map(function (x) { return dxItem(x, true); }).join("") + "</ul>" : '<p class="muted">' + esc(t("dx.khong_co")) + "</p>") + "</section>";
    var done = adm ? all.filter(function (x) { return x.trang_thai !== "moi"; }) : mine;
    html += '<section class="card"><h2>' + esc(t(adm ? "dx.da_duyet" : "dx.cua_toi")) + '</h2>' + (done.length ? '<ul class="plain dxl">' + done.map(function (x) { return dxItem(x, adm); }).join("") + "</ul>" : '<p class="muted">' + esc(t("dx.khong_co")) + "</p>") + "</section>";
    return { title: t("dx.tieu_de"), html: html };
  };
  // Chấm đỏ + số đề xuất đang chờ cho Quản trị (menu dưới đáy, bảng Menu, thanh trên)
  U.badges = function () {
    if (C.st && C.st.role === "admin" && C.st.user && U.kho && U.kho.list === null && !U.kho.busy) U.kho.load();
    var n = C.st && C.st.role === "admin" && C.st.user ? (DX.list || []).filter(function (x) { return x.trang_thai === "moi"; }).length + (U.khoPending ? U.khoPending() : 0) : 0;
    if (C.st && C.st.role === "admin" && C.st.user && DX.list === null && !DX.busy) { dxLoad(); return; }
    Array.prototype.forEach.call(document.querySelectorAll(".bdg"), function (e) { e.remove(); });
    if (!n) return;
    var add = function (el) { if (el) el.insertAdjacentHTML("beforeend", '<i class="bdg" aria-label="' + n + '">' + n + "</i>"); };
    add(document.querySelector("#bnav button")); add(document.querySelector('#msheet a[href="#de-xuat"]')); add(document.querySelector('#nav-list a[href="#he-thong"],#nav-list [data-g="he-thong"]')); add(document.querySelector('#subnav a[href="#de-xuat"]')); add(document.querySelector('#msheet a[href="#kho"]'));
  };
  U.acts["dx-for"] = function (el) { DX.for = el.getAttribute("data-id") || ""; };
  U.ons["dx-send"] = function (f) {
    var o = { loai: f.elements.loai.value, nguoi_id: f.elements.nguoi_id.value, noi_dung: f.elements.noi_dung.value.trim() };
    if (o.noi_dung.length < 5) { U.toast(t("dx.ngan"), true); return; }
    C.sendProposal(o).then(function () { U.toast(t("dx.da_gui")); DX.for = ""; DX.list = null; U.rerender(); }).catch(function (e) { U.toast((e && e.message) || t("dx.loi_sql"), true); });
  };
  function dxSet(el, st) { C.resolveProposal(el.getAttribute("data-id"), st).then(function () { DX.list = null; U.toast(t("c.da_luu")); U.rerender(); }).catch(function (e) { U.toast((e && e.message) || "loi", true); }); }
  U.acts["dx-ok"] = function (el) { dxSet(el, "da_xu_ly"); }; U.acts["dx-no"] = function (el) { dxSet(el, "tu_choi"); };
})(typeof window !== "undefined" ? window : globalThis);
