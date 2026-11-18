/* Kho tư liệu: ảnh, PDF, video, ghi âm có nguồn. Người nhà tải lên → Quản trị duyệt mới hiện (Supabase Storage + bảng gp_tu_lieu). */
(function (root) {
  "use strict";
  var GP = root.GP, U = GP.ui, S = GP.store, C = GP.cloud, t = U.t, esc = U.esc, P = U.pages;
  var K = { list: null, busy: false, err: "", sel: null, loai: "", q: "", up: { people: [] } };
  var LOAI = { anh: ["🖼️", "kho.l_anh"], pdf: ["📄", "kho.l_pdf"], video: ["🎬", "kho.l_video"], am_thanh: ["🎙️", "kho.l_am"], link: ["🔗", "kho.l_link"] };
  var MAX = 25 * 1024 * 1024;
  function on() { return !!(C && C.st && C.st.user && C.st.role && C.st.role !== "khach"); }
  function isAdm() { return C.st && C.st.role === "admin"; }
  function load(force) {
    if (!on() || K.busy || (K.list && !force)) return;
    K.busy = true;
    C.khoList().then(function (r) { K.list = r; K.err = ""; }, function (e) { K.list = K.list || []; K.err = (e && e.message) || "loi"; }).then(function () { K.busy = false; if (/^#kho/.test(location.hash) || U.khoPend) { U.khoPend = false; U.rerender(); } else if (U.badges) U.badges(); });
  }
  K.load = load; U.kho = K;
  function ok(x) { return x.trang_thai === "da_duyet" && x.muc_hien_thi !== "rieng_tu" || (isAdm() && x.trang_thai === "da_duyet"); }
  function personName(id) { var p = U.view().by[id]; return p && p.level !== "hidden" ? U.fullName(p) : ""; }
  function siteName(id) { var s = S.S.data.sites.filter(function (x) { return x.id === id; })[0]; return s ? s.ten : ""; }
  function thumb(x) {
    var ic = LOAI[x.loai] || LOAI.link;
    if (x.loai === "anh" && x.duong_dan) return '<img class="kt" alt="" loading="lazy" data-kp="' + esc(x.duong_dan) + '">';
    return '<span class="ki" aria-hidden="true">' + ic[0] + "</span>";
  }
  function card(x) {
    var who = (x.nguoi_ids || []).map(personName).filter(Boolean).slice(0, 2).join(", ");
    return '<li><button type="button" class="kcard' + (K.sel === x.id ? " on" : "") + '" data-act="kho-xem" data-id="' + esc(x.id) + '">' + thumb(x) + '<span class="kb"><b>' + esc(x.tieu_de) + '</b><small class="muted">' + esc(t((LOAI[x.loai] || LOAI.link)[1])) + (who ? " · " + esc(who) : "") + "</small></span></button></li>";
  }
  function viewer(x) {
    var v;
    if (x.link_ngoai && !x.duong_dan) v = '<p><a class="btn primary" rel="noopener noreferrer" target="_blank" href="' + esc(/^https?:\/\//.test(x.link_ngoai) ? x.link_ngoai : "#") + '">🔗 ' + esc(t("kho.mo_link")) + "</a></p>";
    else if (x.loai === "anh") v = '<img class="kv" alt="' + esc(x.tieu_de) + '" data-kp="' + esc(x.duong_dan) + '">';
    else if (x.loai === "pdf") v = '<iframe class="kpdf" title="' + esc(x.tieu_de) + '" data-kp="' + esc(x.duong_dan) + '"></iframe>';
    else if (x.loai === "video") v = '<video class="kv" controls preload="metadata" data-kp="' + esc(x.duong_dan) + '"></video>';
    else v = '<audio class="ka" controls preload="metadata" data-kp="' + esc(x.duong_dan) + '"></audio>';
    var rows = [[t("kho.nguon"), x.nguon], [t("kho.nguoi_cc"), x.nguoi_cung_cap], [t("kho.ngay"), x.ngay_thu_thap], [t("kho.gui_boi"), x.ten_nguoi_gui], [t("kho.duyet_boi"), x.duyet_boi && (x.duyet_boi + (x.duyet_luc ? " · " + String(x.duyet_luc).slice(0, 10) : ""))]].filter(function (r) { return r[1]; });
    var links = (x.nguoi_ids || []).map(function (i) { var n = personName(i); return n ? '<a class="chip" href="#nguoi-' + esc(i) + '">🙍 ' + esc(n) + "</a>" : ""; }).join(" ") + (x.dia_diem_id && siteName(x.dia_diem_id) ? ' <a class="chip" href="#ban-do" data-act="map-go" data-id="' + esc(x.dia_diem_id) + '">📍 ' + esc(siteName(x.dia_diem_id)) + "</a>" : "");
    var h = '<section class="card kview"><h2>' + esc(x.tieu_de) + "</h2>" + v + (x.mo_ta ? "<p>" + esc(x.mo_ta).replace(/\n/g, "<br>") + "</p>" : "") + '<dl class="kmeta">' + rows.map(function (r) { return "<dt>" + esc(r[0]) + "</dt><dd>" + esc(r[1]) + "</dd>"; }).join("") + "</dl>" + (links ? '<p class="klinks">' + links + "</p>" : "");
    if (x.duong_dan) h += '<p><a class="btn" target="_blank" rel="noopener" data-kd="' + esc(x.duong_dan) + '" href="#kho">⬇ ' + esc(t("kho.tai_ve")) + "</a></p>";
    if (isAdm()) h += '<div class="row">' + (x.trang_thai === "da_duyet" ? '<button type="button" class="btn" data-act="kho-muc" data-id="' + esc(x.id) + '">' + esc(t(x.muc_hien_thi === "rieng_tu" ? "kho.dang_an" : "kho.dang_hien")) + '</button>' : "") + '<button type="button" class="btn small" data-act="kho-xoa" data-id="' + esc(x.id) + '">🗑 ' + esc(t("kho.xoa")) + "</button></div>";
    return h + "</section>";
  }
  function pending(adm) {
    var l = (K.list || []).filter(function (x) { return x.trang_thai === "cho"; });
    if (!adm || !l.length) return "";
    return '<section class="card"><h2>' + esc(t("kho.cho_duyet")) + " (" + l.length + ')</h2><ul class="plain dxl">' + l.map(function (x) {
      return '<li class="dxi"><b>' + esc(x.tieu_de) + '</b> <span class="chip">' + esc(t((LOAI[x.loai] || LOAI.link)[1])) + '</span><p class="muted">' + esc((x.ten_nguoi_gui || "") + " · " + String(x.created_at || "").slice(0, 10) + " · " + t("kho.nguon") + ": " + x.nguon) + '</p><div class="row"><button type="button" class="btn small" data-act="kho-xem" data-id="' + esc(x.id) + '">👁 ' + esc(t("kho.xem")) + '</button><button type="button" class="btn small primary" data-act="kho-ok" data-id="' + esc(x.id) + '">✔ ' + esc(t("kho.duyet")) + '</button><button type="button" class="btn small" data-act="kho-no" data-id="' + esc(x.id) + '">✕ ' + esc(t("dx.tu_choi")) + "</button></div></li>";
    }).join("") + "</ul></section>";
  }
  function mine() {
    var me = C.myId(), l = (K.list || []).filter(function (x) { return x.user_id === me && x.trang_thai !== "da_duyet"; });
    if (!l.length) return "";
    return '<section class="card"><h2>' + esc(t("kho.cua_toi")) + '</h2><ul class="plain dxl">' + l.map(function (x) { return '<li class="dxi"><b>' + esc(x.tieu_de) + '</b> <span class="chip dx-' + (x.trang_thai === "cho" ? "moi" : "tu_choi") + '">' + esc(t(x.trang_thai === "cho" ? "kho.dang_cho" : "kho.bi_tu_choi")) + "</span></li>"; }).join("") + "</ul></section>";
  }
  function chips() { return K.up.people.map(function (i) { return '<span class="chip">' + esc(personName(i) || i) + ' <button type="button" class="linkbtn" data-act="kho-bop" data-id="' + esc(i) + '" aria-label="' + esc(t("map.bo_gan")) + '">✕</button></span>'; }).join(" "); }
  function form() {
    var V = U.view(), today = new Date().toISOString().slice(0, 10);
    var po = '<option value="">' + esc(t("dx.khong_ai")) + "</option>" + V.list.filter(function (p) { return p.level !== "hidden"; }).sort(function (a, b) { return U.fullName(a) < U.fullName(b) ? -1 : 1; }).map(function (p) { return '<option value="' + esc(p.id) + '">' + esc(U.fullName(p) + (U.gen(p) ? " · " + t("p.doi") + " " + U.gen(p) : "")) + "</option>"; }).join("");
    var so = '<option value="">—</option>' + S.S.data.sites.map(function (s) { return '<option value="' + esc(s.id) + '">' + esc(s.ten) + "</option>"; }).join("");
    return '<details class="card kform"' + (K.open ? " open" : "") + '><summary><b>⬆ ' + esc(t("kho.tai_len")) + '</b></summary><form data-submit="kho-send"><p class="muted">' + esc(t("kho.mo_ta_form")) + '</p><label class="lab" for="k-f">' + esc(t("kho.chon_tep")) + '</label><input class="inp" id="k-f" name="tep" type="file" accept="image/*,application/pdf,video/*,audio/*"><label class="lab" for="k-l">' + esc(t("kho.hoac_link")) + '</label><input class="inp" id="k-l" name="link" inputmode="url" placeholder="https://…">' +
      '<label class="lab" for="k-t">' + esc(t("kho.tieu_de_f")) + ' *</label><input class="inp" id="k-t" name="tieu_de" required minlength="2"><label class="lab" for="k-m">' + esc(t("kho.mo_ta")) + '</label><textarea class="inp" id="k-m" name="mo_ta" rows="3"></textarea>' +
      '<label class="lab" for="k-n">' + esc(t("kho.nguon")) + ' *</label><input class="inp" id="k-n" name="nguon" required minlength="2" placeholder="' + esc(t("kho.vd_nguon")) + '"><label class="lab" for="k-c">' + esc(t("kho.nguoi_cc")) + '</label><input class="inp" id="k-c" name="nguoi_cc" value="' + esc(C.st.ten || "") + '"><label class="lab" for="k-d">' + esc(t("kho.ngay")) + '</label><input class="inp" id="k-d" name="ngay" type="date" value="' + today + '">' +
      '<label class="lab" for="k-p">' + esc(t("kho.nguoi_lq")) + '</label><div class="row" style="flex-wrap:nowrap"><select class="inp" id="k-p" style="flex:1;min-width:0">' + po + '</select><button type="button" class="btn" data-act="kho-addp">➕</button></div><div id="kho-chips" class="klinks">' + chips() + '</div><label class="lab" for="k-s">' + esc(t("kho.dia_diem_lq")) + '</label><select class="inp" id="k-s" name="dia_diem">' + so + '</select>' +
      '<div class="row"><button class="btn primary" type="submit">' + esc(t("kho.gui")) + '</button></div><p class="muted">' + esc(t("kho.luu_y")) + "</p></form></details>";
  }
  P["kho"] = function () {
    if (!on()) return { title: t("kho.tieu_de"), html: "<h1>" + esc(t("kho.tieu_de")) + '</h1><div class="card"><p>' + esc(t("kho.can_dang_nhap")) + "</p></div>" };
    load();
    var adm = isAdm(), all = (K.list || []).filter(ok), q = GP.checks.norm(K.q || "");
    var items = all.filter(function (x) { return (!K.loai || x.loai === K.loai) && (!q || GP.checks.norm([x.tieu_de, x.mo_ta, x.nguon, x.nguoi_cung_cap].join(" ")).indexOf(q) >= 0); });
    var sel = (K.list || []).filter(function (x) { return x.id === K.sel; })[0];
    var pills = '<div class="fpills" role="group">' + [["", "kho.tat_ca"]].concat(Object.keys(LOAI).map(function (k) { return [k, LOAI[k][1]]; })).map(function (f) { return '<button type="button" class="fpill' + (K.loai === f[0] ? " on" : "") + '" data-act="kho-loc" data-v="' + f[0] + '">' + esc(t(f[1])) + "</button>"; }).join("") + "</div>";
    return { title: t("kho.tieu_de"), html: "<h1>" + esc(t("kho.tieu_de")) + '</h1><p class="muted">' + esc(t("kho.mo_ta_trang")) + "</p>" + (K.err ? '<div class="card"><p class="note">' + esc(t("kho.loi_sql")) + " (" + esc(K.err) + ")</p></div>" : "") + form() + pending(adm) + mine() + (sel ? viewer(sel) : "") +
      '<h2 class="mh2">' + esc(t("kho.tat_ca_ds")) + " (" + all.length + ")</h2>" + pills + '<input class="inp" type="search" id="kho-q" data-oninput="kho-q" placeholder="' + esc(t("c.tim")) + '" value="' + esc(K.q) + '" aria-label="' + esc(t("c.tim")) + '">' + (items.length ? '<ul class="plain kgrid">' + items.map(card).join("") + "</ul>" : '<p class="muted">' + esc(t(K.list ? "kho.trong" : "kho.dang_tai")) + "</p>"), after: hydrate };
  };
  // Gắn link tạm (1 giờ) cho các ảnh/tệp riêng tư
  function hydrate() {
    var els = Array.prototype.slice.call(document.querySelectorAll("[data-kp],[data-kd]")); if (!els.length || !C.khoSign) return;
    var paths = []; els.forEach(function (e) { var p = e.getAttribute("data-kp") || e.getAttribute("data-kd"); if (p && paths.indexOf(p) < 0) paths.push(p); });
    C.khoSign(paths).then(function (c) { els.forEach(function (e) { var p = e.getAttribute("data-kp") || e.getAttribute("data-kd"), u = c[p] && c[p].u; if (!u) return; if (e.hasAttribute("data-kp")) e.src = u; else e.href = u; }); }).catch(function () {});
  }
  U.khoHydrate = hydrate;
  /** Khối "Tư liệu liên quan" trong hồ sơ người / trang địa điểm */
  U.khoBlock = function (pid, sid) {
    if (!on()) return "";
    if (K.list === null) { load(); U.khoPend = true; return ""; }
    var l = K.list.filter(function (x) { return ok(x) && ((pid && (x.nguoi_ids || []).indexOf(pid) >= 0) || (sid && x.dia_diem_id === sid)); });
    if (!l.length) return "";
    setTimeout(hydrate, 150);
    return '<section class="card sec c8"><h2><i aria-hidden="true">🗂️</i> ' + esc(t("kho.lien_quan")) + '</h2><ul class="plain kgrid">' + l.map(function (x) { return card(x).replace('data-act="kho-xem"', 'data-act="kho-xem" data-go="1"'); }).join("") + "</ul></section>";
  };
  /** Phòng ảnh: ảnh của cả họ (Kho tư liệu, đã duyệt) hiện chung cho mọi thiết bị */
  U.khoAlbum = function () {
    if (!on()) return "";
    if (K.list === null) { load(); U.khoPend = true; return ""; }
    var l = K.list.filter(function (x) { return ok(x) && x.loai === "anh"; });
    var head = '<section class="card"><h2>🗂️ ' + esc(t("anh.tu_kho")) + " (" + l.length + ")</h2>";
    if (!l.length) return head + '<p class="muted">' + esc(t("anh.kho_trong")) + '</p><p><a class="btn primary" href="#kho">⬆ ' + esc(t("kho.tai_len")) + "</a></p></section>";
    setTimeout(hydrate, 150);
    return head + '<ul class="plain kgrid">' + l.slice(0, 24).map(function (x) { return card(x).replace('data-act="kho-xem"', 'data-act="kho-xem" data-go="1"'); }).join("") + '</ul><p><a class="btn small" href="#kho">' + esc(t("anh.xem_het_kho")) + ' →</a> <a class="btn small primary" href="#kho">⬆ ' + esc(t("kho.tai_len")) + "</a></p></section>";
  };
  var paOld = P["phong-anh"];
  P["phong-anh"] = function () {
    var o = paOld(), alb = U.khoAlbum();
    if (alb && o && o.html) o.html = o.html.replace("</h1>", "</h1>" + alb + '<h2 class="mh2">' + esc(t("anh.tren_may")) + '</h2><p class="note">' + esc(t("anh.luu_may")) + "</p>");
    return o;
  };
  U.acts["kho-xem"] = function (el) { K.sel = el.getAttribute("data-id"); if (el.getAttribute("data-go") && !/^#kho/.test(location.hash)) { location.hash = "#kho"; return; } U.rerender(); setTimeout(function () { var v = document.querySelector(".kview"); if (v && v.scrollIntoView) v.scrollIntoView({ behavior: "smooth", block: "start" }); }, 60); };
  U.acts["kho-loc"] = function (el) { K.loai = el.getAttribute("data-v") || ""; U.rerender(); };
  U.ons["kho-q"] = function (el) { K.q = el.value; var pos = el.selectionStart; U.rerender(); var n = document.getElementById("kho-q"); if (n) { n.focus(); try { n.setSelectionRange(pos, pos); } catch (e) {} } };
  U.acts["kho-addp"] = function () { var s = document.getElementById("k-p"); if (s && s.value && K.up.people.indexOf(s.value) < 0 && K.up.people.length < 8) K.up.people.push(s.value); var b = document.getElementById("kho-chips"); if (b) b.innerHTML = chips(); };
  U.acts["kho-bop"] = function (el) { K.up.people = K.up.people.filter(function (i) { return i !== el.getAttribute("data-id"); }); var b = document.getElementById("kho-chips"); if (b) b.innerHTML = chips(); };
  function kind(m) { return /^image\//.test(m) ? "anh" : m === "application/pdf" ? "pdf" : /^video\//.test(m) ? "video" : /^audio\//.test(m) ? "am_thanh" : ""; }
  function shrink(f) {
    if (!/^image\//.test(f.type) || f.size < 1.5 * 1024 * 1024) return Promise.resolve(f);
    return new Promise(function (res) { var u = URL.createObjectURL(f), im = new Image(); im.onload = function () { var k = Math.min(1, 2200 / Math.max(im.naturalWidth, im.naturalHeight)), c = document.createElement("canvas"); c.width = Math.round(im.naturalWidth * k); c.height = Math.round(im.naturalHeight * k); c.getContext("2d").drawImage(im, 0, 0, c.width, c.height); c.toBlob(function (b) { URL.revokeObjectURL(u); res(b && b.size < f.size ? new File([b], f.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" }) : f); }, "image/jpeg", 0.85); }; im.onerror = function () { res(f); }; im.src = u; });
  }
  function safeName(n) { return String(n || "tep").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").replace(/[^A-Za-z0-9._-]+/g, "_").slice(-60); }
  U.ons["kho-send"] = function (f) {
    var file = f.elements.tep.files && f.elements.tep.files[0], link = f.elements.link.value.trim();
    if (!file && !/^https?:\/\//.test(link)) { U.toast(t("kho.can_tep_hoac_link"), true); return; }
    if (file && file.size > MAX && !/^https?:\/\//.test(link)) { U.toast(t("kho.qua_lon"), true); return; }
    if (file && !kind(file.type)) { U.toast(t("kho.sai_loai"), true); return; }
    var btn = f.querySelector("button[type=submit]"); if (btn) btn.disabled = true;
    var row = { ten_nguoi_gui: C.st.ten || C.st.user, tieu_de: f.elements.tieu_de.value.trim(), mo_ta: f.elements.mo_ta.value.trim() || null, nguon: f.elements.nguon.value.trim(), nguoi_cung_cap: f.elements.nguoi_cc.value.trim() || null, ngay_thu_thap: f.elements.ngay.value || null, nguoi_ids: K.up.people.slice(), dia_diem_id: f.elements.dia_diem.value || null };
    var step = file ? shrink(file).then(function (b) {
      if (b.size > MAX) throw new Error(t("kho.qua_lon"));
      var path = C.myId() + "/" + Date.now().toString(36) + "_" + safeName(b.name);
      return C.khoUpload(path, b).then(function () { row.loai = kind(b.type); row.duong_dan = path; row.mime = b.type; row.kich_thuoc = b.size; });
    }) : Promise.resolve().then(function () { row.loai = "link"; row.link_ngoai = link; });
    step.then(function () { if (file && /^https?:\/\//.test(link)) row.link_ngoai = link; return C.khoAdd(row); }).then(function () { U.toast(t("kho.da_gui")); K.up.people = []; K.open = false; K.list = null; U.rerender(); }).catch(function (e) { if (btn) btn.disabled = false; U.toast((e && e.message) || t("kho.loi_sql"), true); });
  };
  function setSt(id, patch, msg) { C.khoSet(id, patch).then(function () { U.toast(msg || t("c.da_luu")); K.list = null; U.rerender(); }).catch(function (e) { U.toast((e && e.message) || "loi", true); }); }
  U.acts["kho-ok"] = function (el) { setSt(el.getAttribute("data-id"), { trang_thai: "da_duyet", duyet_boi: C.st.ten || C.st.user, duyet_luc: new Date().toISOString() }); };
  U.acts["kho-no"] = function (el) { setSt(el.getAttribute("data-id"), { trang_thai: "tu_choi", duyet_boi: C.st.ten || C.st.user, duyet_luc: new Date().toISOString() }); };
  U.acts["kho-muc"] = function (el) { var x = (K.list || []).filter(function (y) { return y.id === el.getAttribute("data-id"); })[0]; if (x) setSt(x.id, { muc_hien_thi: x.muc_hien_thi === "rieng_tu" ? "gia_toc" : "rieng_tu" }); };
  U.acts["kho-xoa"] = function (el) {
    var x = (K.list || []).filter(function (y) { return y.id === el.getAttribute("data-id"); })[0]; if (!x) return;
    if (el.getAttribute("data-sure") !== "1") { el.setAttribute("data-sure", "1"); el.textContent = "⚠ " + t("kho.chac_xoa"); return; }
    C.khoDel(x.id, x.duong_dan).then(function () { K.sel = null; K.list = null; U.toast(t("c.da_xoa")); U.rerender(); }).catch(function (e) { U.toast((e && e.message) || "loi", true); });
  };
  U.acts["kho-xoa"].keep = true;
  // Chấm đỏ: tư liệu chờ duyệt cộng vào số đề xuất
  U.khoPending = function () { return isAdm() && K.list ? K.list.filter(function (x) { return x.trang_thai === "cho"; }).length : 0; };
})(typeof window !== "undefined" ? window : globalThis);
