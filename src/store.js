/* Kho dữ liệu: lưu trong trình duyệt (bản thử). Mỗi thao tác ghi kiểm quyền như RLS sẽ làm ở cơ sở dữ liệu,
 * không có thao tác xóa (chỉ ẩn/khôi phục), mỗi lần sửa ghi edit_history (chỉ thêm). */
(function (root) {
  "use strict";
  var GP = root.GP = root.GP || {};
  var KEY = "gp.v2.data", mem = null;
  function clone(o) { return o === undefined ? undefined : JSON.parse(JSON.stringify(o)); }
  function now() { return new Date().toISOString(); }
  var seq = 0;
  function uid(pre) { return pre + Date.now().toString(36) + (++seq).toString(36) + Math.random().toString(36).slice(2, 5); }
  function lsGet() { try { return root.localStorage ? root.localStorage.getItem(KEY) : mem; } catch (e) { return mem; } }
  function lsSet(v) { mem = v; try { if (root.localStorage) root.localStorage.setItem(KEY, v); return true; } catch (e) { return false; } }

  var S = { data: null, viewer: { role: "khach" }, listeners: [], saved: true };
  function fresh() {
    var d = clone(GP.sample);
    return { persons: d.persons, spouses: d.spouses, events: d.events, sites: d.sites, articles: d.articles, donations: d.donations, profiles: d.profiles, settings: d.settings,
      media: [], edit_history: [], bo_qua: [], chis: d.chis, schema: GP.io.SCHEMA, mau: true };
  }
  function init() {
    if (GP.PUBLIC) { var pd = clone(GP.PUBDATA); S.data = pd; S.data.chis = S.data.chis || []; S.data.media = S.data.media || []; S.data.edit_history = []; S.viewer = { role: "khach" }; return S; }
    var raw = lsGet(), d = null;
    if (raw) { try { d = JSON.parse(raw); } catch (e) { d = null; } }
    S.data = d && d.persons ? d : fresh();
    S.data.chis = S.data.chis || [];
    return S;
  }
  function save() { if (GP.PUBLIC) { emit(); return true; } S.saved = lsSet(JSON.stringify(S.data)); emit(); return S.saved; }
  function emit() { S.listeners.forEach(function (f) { try { f(); } catch (e) { if (root.console) console.error(e); } }); }
  function on(f) { S.listeners.push(f); }
  function setViewer(v) { S.viewer = v; emit(); }
  function ctx() { return GP.privacy.makeContext(S.viewer, S.data.persons, S.data.spouses, S.data.settings.nam_hien_tai || new Date().getFullYear()); }
  function who() { var v = S.viewer; return (v.ten || v.role) + " (" + v.role + ")"; }
  function log(bang, id, action, cu, moi) {
    S.data.edit_history.push({ id: uid("h"), bang: bang, ban_ghi_id: id, hanh_dong: action, thay_doi: { cu: cu === undefined ? null : cu, moi: moi === undefined ? null : moi }, ai: who(), luc: now() });
  }
  function need(ok, code) { if (!ok) { var e = new Error(code); e.code = code; throw e; } }
  function isAdmin() { return S.viewer.role === "admin"; }
  function isEditor() { return S.viewer.role === "editor" || isAdmin(); }
  function byId(id) { return S.data.persons.filter(function (p) { return p.id === id; })[0]; }
  function canEditPerson(p) { return GP.privacy.canEdit(p, S.viewer); }

  var FIELDS = ["ho", "ten_dem", "ten", "ten_thuong_goi", "ten_huy", "ten_thuy", "ten_han_nom", "dao_hieu", "gioi_tinh", "sinh", "con_song", "mat", "gio_ngay_am", "gio_thang_am", "gio_nhuan", "the_thu", "thu_tu_con",
    "chi", "cha_id", "me_id", "me_ten", "nghe", "noi_sinh", "noi_an_tang", "tieu_su", "anh_dai_dien", "nguon", "muc_chac_chan", "muc_hien_thi", "da_dong_y_tre_em", "chung_cu", "vai", "hien_khach"];
  function nfcDeep(v) { if (typeof v === "string") return v.normalize("NFC"); if (v && typeof v === "object") { Object.keys(v).forEach(function (k) { v[k] = nfcDeep(v[k]); }); } return v; }

  /** Kiểm tra trước khi lưu: lỗi chặn (errors) và cảnh báo hỏi lại (warnings). Không tự sửa. */
  function validate(cand, isNew) {
    var errors = [], warnings = [], P = S.data.persons;
    if (!String(cand.ten || "").trim()) errors.push({ code: "thieu_ten" });
    if (cand.cha_id && cand.cha_id === cand.id) errors.push({ code: "tu_lam_cha" });
    if (cand.me_id && cand.me_id === cand.id) errors.push({ code: "tu_lam_me" });
    // vòng: tổ tiên của cha/mẹ mới không được chứa chính người này
    [cand.cha_id, cand.me_id].forEach(function (pid) {
      if (!pid || pid === cand.id) return;
      var seen = {}, fr = [pid];
      while (fr.length) { var x = fr.pop(); if (seen[x]) continue; seen[x] = 1; if (x === cand.id) { errors.push({ code: "tao_vong", id: pid }); break; } var q = byId(x); if (q) { if (q.cha_id) fr.push(q.cha_id); if (q.me_id) fr.push(q.me_id); } }
    });
    var cha = byId(cand.cha_id), me = byId(cand.me_id);
    if (cha && cha.gioi_tinh === "nu") warnings.push({ code: "cha_la_nu" });
    if (me && me.gioi_tinh === "nam") warnings.push({ code: "me_la_nam" });
    if (cand.sinh && cand.sinh.nam && cand.mat && cand.mat.nam && cand.mat.nam < cand.sinh.nam) errors.push({ code: "mat_truoc_sinh" });
    [cha, me].forEach(function (par) { if (par && par.sinh && par.sinh.nam && cand.sinh && cand.sinh.nam && cand.sinh.nam < par.sinh.nam) warnings.push({ code: "con_truoc_cha", id: par.id }); });
    var nn = GP.checks.norm([cand.ho, cand.ten_dem, cand.ten].join(" "));
    var dup = P.filter(function (p) { return p.id !== cand.id && GP.checks.norm([p.ho, p.ten_dem, p.ten].join(" ")) === nn && ((p.sinh && p.sinh.nam) || null) === ((cand.sinh && cand.sinh.nam) || null); });
    if (dup.length) warnings.push({ code: "co_the_trung", ids: dup.map(function (p) { return p.id; }) });
    return { errors: errors, warnings: warnings };
  }
  function blank() {
    return { id: null, schema: GP.io.SCHEMA, ho: "", ten_dem: "", ten: "", ten_thuong_goi: "", ten_huy: "", ten_thuy: "", ten_han_nom: "", dao_hieu: "", gioi_tinh: "nam", sinh: null, con_song: true, mat: null,
      gio_ngay_am: null, gio_thang_am: null, gio_nhuan: false, the_thu: null, thu_tu_con: null, chi: "", cha_id: null, me_id: null, me_ten: "", nghe: "", noi_sinh: "", noi_an_tang: "", tieu_su: "",
      anh_dai_dien: "", nguon: "", muc_chac_chan: "chua_chac", muc_hien_thi: "rieng_tu", da_dong_y_tre_em: false, da_an: false, chung_cu: null, vai: "", hien_khach: false };
  }
  // ---------- Tự nối quan hệ khi đã đủ thông tin ----------
  // 1) Con có cả cha và mẹ mà hai người chưa là vợ chồng → tự tạo quan hệ vợ chồng.
  // 2) Con chỉ có cha (hoặc chỉ có mẹ) mà người đó có đúng một vợ/chồng → tự điền mẹ (hoặc cha).
  // Không bao giờ ghi đè thông tin đã có. Dâu/rể, cháu, bố mẹ chồng… hiện ra từ các liên kết này.
  function autoLink() {
    var P = S.data.persons, by = {}, add = 0, fill = 0; P.forEach(function (p) { by[p.id] = p; });
    function live(id) { return S.data.spouses.filter(function (s) { return !s.da_an && (s.person_id === id || s.spouse_person_id === id) && by[s.person_id === id ? s.spouse_person_id : s.person_id]; }); }
    function linked(a, b) { return S.data.spouses.some(function (s) { return (s.person_id === a && s.spouse_person_id === b) || (s.person_id === b && s.spouse_person_id === a); }); }
    P.forEach(function (c) {
      if (c.da_an) return; var f = by[c.cha_id], m = by[c.me_id];
      if (f && m && f.id !== m.id && !linked(f.id, m.id)) { S.data.spouses.push({ id: uid("s"), person_id: f.id, spouse_person_id: m.id, ten: "", thu_tu: live(f.id).length + 1, tinh_trang: "dang_o", ghi_chu: "Tự nối từ hồ sơ con" }); add++; }
      else if (f && !m && !c.me_id) { var a = live(f.id); if (a.length === 1) { var q = by[a[0].person_id === f.id ? a[0].spouse_person_id : a[0].person_id]; if (q && q.gioi_tinh !== "nam" && q.id !== c.id) { c.me_id = q.id; fill++; } } }
      else if (m && !f && !c.cha_id) { var b = live(m.id); if (b.length === 1) { var r = by[b[0].person_id === m.id ? b[0].spouse_person_id : b[0].person_id]; if (r && r.gioi_tinh !== "nu" && r.id !== c.id) { c.cha_id = r.id; fill++; } } }
    });
    if (add || fill) log("he_thong", "quan_he", "tu_noi", null, { vo_chong: add, cha_me: fill });
    S.lastAuto = { vo_chong: add, cha_me: fill };
    return S.lastAuto;
  }

  function addPerson(data) {
    need(isEditor(), "khong_du_quyen");
    var p = Object.assign(blank(), nfcDeep(clone(data))); p.id = uid("p"); p.da_an = false; if (S.viewer.role !== "admin") p.hien_khach = false; p.schema = GP.io.SCHEMA;
    p.chi = ""; need(canEditPerson(p), "khong_du_quyen");
    if (!data.muc_hien_thi) p.muc_hien_thi = "rieng_tu"; // mặc định riêng tư (điều 8)
    var v = validate(p, true); if (v.errors.length) { var e = new Error("khong_hop_le"); e.code = "khong_hop_le"; e.errors = v.errors; throw e; }
    p.tao_boi = who(); p.tao_luc = now();
    S.data.persons.push(p); log("persons", p.id, "them", null, clone(p)); autoLink(); save(); return p;
  }
  function updatePerson(id, changes) {
    var p = byId(id); need(p, "khong_co"); need(canEditPerson(p), "khong_du_quyen");
    var ch = nfcDeep(clone(changes)), cand = Object.assign({}, p), cu = {}, moi = {};
    if (S.viewer.role !== "admin") delete ch.hien_khach; // chỉ Quản trị quyết định cho khách xem người mới mất
    FIELDS.forEach(function (f) { if (f in ch && JSON.stringify(ch[f]) !== JSON.stringify(p[f])) { cu[f] = clone(p[f]); moi[f] = ch[f]; cand[f] = ch[f]; } });
    if (!Object.keys(moi).length) return p;
    var v = validate(cand, false); if (v.errors.length) { var e = new Error("khong_hop_le"); e.code = "khong_hop_le"; e.errors = v.errors; throw e; }
    Object.assign(p, moi); log("persons", id, "sua", cu, moi); autoLink(); save(); return p;
  }
  function setHidden(id, hidden) {
    var p = byId(id); need(p, "khong_co"); need(canEditPerson(p), "khong_du_quyen");
    if (!!p.da_an === !!hidden) return p;
    p.da_an = !!hidden; log("persons", id, hidden ? "an" : "khoi_phuc", { da_an: !hidden }, { da_an: !!hidden }); save(); return p;
  }
  /** Xoá hồ sơ trùng (chỉ Quản trị). Nếu có "into": chuyển mọi liên kết sang hồ sơ giữ lại và bù các ô còn trống. Ghi nhật ký kèm bản chụp đầy đủ. */
  function deletePerson(id, into) {
    need(isAdmin(), "khong_du_quyen"); var p = byId(id); need(p, "khong_co");
    var keep = into ? byId(into) : null; if (into) { need(keep, "khong_co"); need(into !== id, "khong_co"); }
    var snap = clone(p), nm = [p.ho, p.ten_dem, p.ten].filter(Boolean).join(" "), n = { con: 0, vc: 0 };
    S.data.persons.forEach(function (c) {
      if (c.cha_id === id) { c.cha_id = into || null; n.con++; }
      if (c.me_id === id) { c.me_id = into || null; n.con++; }
    });
    S.data.spouses.forEach(function (s) {
      if (s.person_id === id) { n.vc++; if (into) s.person_id = into; else s.da_an = true; }
      if (s.spouse_person_id === id) { n.vc++; if (into) s.spouse_person_id = into; else { s.spouse_person_id = null; s.ten = s.ten || nm; } }
      if (into && s.person_id === s.spouse_person_id) s.da_an = true;
    });
    (S.data.profiles || []).forEach(function (u) { if (u.person_id === id) u.person_id = into || null; });
    if (keep) FIELDS.forEach(function (k) { var a = keep[k], b = p[k]; var empty = a == null || a === "" || a === false && k !== "con_song" && k !== "gio_nhuan" && k !== "da_dong_y_tre_em"; if ((a == null || a === "") && b != null && b !== "") keep[k] = clone(b); });
    S.data.persons = S.data.persons.filter(function (x) { return x.id !== id; });
    log("persons", id, "xoa", snap, into ? { gop_vao: into } : null); save(); return n;
  }
  /** Vợ chồng: thêm/sửa một dòng; không xóa, chỉ da_an */
  function saveSpouse(row) {
    var p = byId(row.person_id); need(p, "khong_co"); need(canEditPerson(p), "khong_du_quyen");
    var ex = S.data.spouses.filter(function (s) { return s.id === row.id; })[0];
    if (ex) { var cu = clone(ex); Object.assign(ex, nfcDeep(clone(row))); log("spouses", ex.id, "sua", cu, clone(ex)); }
    else { var n = Object.assign({ id: uid("s"), spouse_person_id: null, ten: "", thu_tu: S.data.spouses.filter(function (s) { return s.person_id === row.person_id && !s.da_an; }).length + 1, tinh_trang: "dang_o", ghi_chu: "" }, nfcDeep(clone(row))); S.data.spouses.push(n); log("spouses", n.id, "them", null, clone(n)); }
    save();
  }
  function hideSpouse(id, hidden) {
    var s = S.data.spouses.filter(function (x) { return x.id === id; })[0]; need(s, "khong_co"); var p = byId(s.person_id); need(canEditPerson(p), "khong_du_quyen");
    log("spouses", id, hidden ? "an" : "khoi_phuc", { da_an: !!s.da_an }, { da_an: !!hidden }); s.da_an = !!hidden; save();
  }
  /** Bảng khác: events, sites, articles, donations, settings, profiles */
  function saveRow(table, row) {
    var T = S.data[table]; need(T, "khong_co_bang");
    var adminOnly = { donations: 1, profiles: 1 };
    if (adminOnly[table]) need(isAdmin(), "khong_du_quyen");
    else if (table === "articles") { need(isEditor(), "khong_du_quyen"); }
    else need(isAdmin(), "khong_du_quyen");
    var ex = T.filter(function (x) { return x.id === row.id; })[0];
    if (table === "articles") { // Editor soạn, Admin duyệt (Q-10)
      if (!isAdmin()) { row.trang_thai = "nhap"; row.nguoi_duyet = ""; }
      else if (row.trang_thai === "da_duyet") row.nguoi_duyet = S.viewer.ten || "Quản trị";
    }
    if (table === "profiles" && ex && ex.vai_tro !== row.vai_tro) log("profiles", ex.id, "doi_vai_tro", { vai_tro: ex.vai_tro }, { vai_tro: row.vai_tro });
    if (ex) { var cu = clone(ex); Object.assign(ex, nfcDeep(clone(row))); if (!(table === "profiles" && cu.vai_tro !== ex.vai_tro)) log(table, ex.id, "sua", cu, clone(ex)); }
    else { var n = Object.assign({ id: uid(table[0]) }, nfcDeep(clone(row))); T.push(n); log(table, n.id, "them", null, clone(n)); row.id = n.id; }
    save(); return row;
  }
  function hideRow(table, id, hidden) {
    var T = S.data[table], r = T.filter(function (x) { return x.id === id; })[0]; need(r, "khong_co");
    need(isAdmin() || (table === "media" && isEditor()), "khong_du_quyen");
    r.da_an = !!hidden; log(table, id, hidden ? "an" : "khoi_phuc", null, { da_an: !!hidden }); save();
  }
  function saveSettings(obj) {
    need(isAdmin(), "khong_du_quyen"); var cu = {}, moi = {};
    Object.keys(obj).forEach(function (k) { if (obj[k] !== S.data.settings[k]) { cu[k] = S.data.settings[k]; moi[k] = obj[k]; } });
    Object.assign(S.data.settings, moi); if (Object.keys(moi).length) log("settings", "settings", "sua", cu, moi); save();
  }
  function addMedia(meta) { need(isEditor(), "khong_du_quyen"); var m = Object.assign({ id: uid("m"), da_an: false }, nfcDeep(clone(meta))); S.data.media.push(m); log("media", m.id, "them", null, { tieu_de: m.tieu_de }); save(); return m; }
  function updateMedia(id, ch) { need(isEditor(), "khong_du_quyen"); var m = S.data.media.filter(function (x) { return x.id === id; })[0]; need(m, "khong_co"); var cu = clone(m); Object.assign(m, nfcDeep(clone(ch))); log("media", id, "sua", cu, clone(m)); save(); }
  function ignoreCheck(key, ignored) { need(isEditor(), "khong_du_quyen"); var i = S.data.bo_qua.indexOf(key); if (ignored && i < 0) S.data.bo_qua.push(key); if (!ignored && i >= 0) S.data.bo_qua.splice(i, 1); save(); }

  // ---------- Dữ liệu mẫu: tự gỡ khi nạp dữ liệu thật, hoặc gỡ tay ----------
  function sampleIds(tbl) { var o = {}; ((GP.sample || {})[tbl] || []).forEach(function (x) { o[x.id] = 1; }); return o; }
  function isSamplePerson(p) { return p.tao_boi === "mau" || p.nguon === "Dữ liệu mẫu giả"; }
  function sampleCount() { return S.data.persons.filter(isSamplePerson).length; }
  function stripSample() {
    var gone = {}, n = 0; S.data.persons.forEach(function (p) { if (isSamplePerson(p)) gone[p.id] = 1; });
    n = Object.keys(gone).length;
    S.data.persons = S.data.persons.filter(function (p) { return !gone[p.id]; });
    S.data.spouses = S.data.spouses.filter(function (s) { return !gone[s.person_id] && !gone[s.spouse_person_id]; });
    S.data.persons.forEach(function (p) { if (gone[p.cha_id]) p.cha_id = null; if (gone[p.me_id]) p.me_id = null; });
    var ev = sampleIds("events"), si = sampleIds("sites"), ar = sampleIds("articles"), dn = sampleIds("donations");
    S.data.events = (S.data.events || []).filter(function (x) { return !(ev[x.id] && x.nguon === "Dữ liệu mẫu giả"); });
    S.data.sites = (S.data.sites || []).filter(function (x) { return !(si[x.id] && /mẫu/i.test(x.ten || "")); });
    S.data.articles = (S.data.articles || []).filter(function (x) { return !(ar[x.id] && /mẫu/i.test(x.nguoi_duyet || x.tieu_de || "") ); });
    S.data.donations = (S.data.donations || []).filter(function (x) { return !(dn[x.id] && /mẫu/i.test(x.ten || "")); });
    S.data.mau = false;
    return n;
  }
  function removeSample() {
    need(isAdmin(), "khong_du_quyen"); var n = stripSample();
    log("he_thong", "mau", "xoa_du_lieu_mau", null, { so_nguoi: n }); save(); return n;
  }

  // ---------- Nhập / nâng cấp ----------
  function outdated() { return S.data.persons.filter(function (p) { return (p.schema || 1) < GP.io.SCHEMA; }).length; }
  function upgradeAll() {
    need(isAdmin(), "khong_du_quyen"); var n = 0;
    S.data.persons.forEach(function (p) { if ((p.schema || 1) < GP.io.SCHEMA) { var cu = p.schema || 1; p.schema = GP.io.SCHEMA; GP.io.COLS.forEach(function () {}); log("persons", p.id, "nang_cap", { schema: cu }, { schema: GP.io.SCHEMA }); n++; } });
    save(); return n;
  }
  /** Thay toàn bộ (khôi phục sao lưu). Ghi lịch sử; người gọi phải đã đưa bản sao lưu cho người dùng (điều 19). */
  function replaceAll(imp) {
    need(isAdmin(), "khong_du_quyen");
    var hist = S.data.edit_history, d = fresh();
    d.persons = imp.persons; d.spouses = imp.spouses || []; ["events", "sites", "articles", "donations", "profiles", "settings", "media"].forEach(function (k) { if (imp[k]) d[k] = imp[k]; });
    d.mau = false; d.edit_history = (imp.edit_history || []).concat(hist); d.bo_qua = imp.bo_qua_kiem_tra || [];
    d.chis = []; d.persons.forEach(function (p) { p.chi = ""; });
    S.data = d; log("he_thong", "khoi_phuc", "khoi_phuc_sao_luu", null, { so_nguoi: d.persons.length }); save();
  }
  /** Thêm vào cây hiện có: mọi bản ghi nhận id mới, không đụng dữ liệu cũ */
  function appendImport(imp) {
    need(isAdmin(), "khong_du_quyen"); stripSample();
    var map = {}; imp.persons.forEach(function (p) { map[p.id] = uid("p"); });
    imp.persons.forEach(function (p) { var q = clone(p); q.id = map[p.id]; q.cha_id = map[p.cha_id] || null; q.me_id = map[p.me_id] || null; q.tao_boi = who(); q.tao_luc = now(); S.data.persons.push(q); });
    (imp.spouses || []).forEach(function (s) { if (!map[s.person_id]) return; var q = clone(s); q.id = uid("s"); q.person_id = map[s.person_id]; q.spouse_person_id = map[s.spouse_person_id] || null; S.data.spouses.push(q); });
    log("he_thong", "them_vao", "nhap_them", null, { so_nguoi: imp.persons.length }); autoLink(); save(); return imp.persons.length;
  }
  // Nạp bảng Excel theo MÃ: cùng Mã thì dòng sau ghi đè (các ô có trong bảng, kể cả ô để trống); Mã mới thì thêm; không xoá ai
  var SYNC_KEEP = ["schema", "nguon", "muc_chac_chan", "ten_huy", "ten_thuy", "ten_han_nom", "dao_hieu", "me_ten", "anh_dai_dien", "da_dong_y_tre_em", "da_an", "chung_cu"];
  function syncMap(imp) {
    var byMa = {}; S.data.persons.forEach(function (p) { byMa[p.id] = p; if (p.ma) byMa[p.ma] = p; });
    var map = {}; imp.persons.forEach(function (p) { map[p.id] = byMa[p.id] ? byMa[p.id].id : null; });
    return { byMa: byMa, map: map };
  }
  function syncPreview(imp) {
    var m = syncMap(imp), up = 0, nw = 0, broken = 0; imp.persons.forEach(function (p) { if (m.map[p.id]) up++; else nw++; });
    imp.persons.forEach(function (p) { [p.cha_id, p.me_id].forEach(function (c) { if (c && !(c in m.map) && !m.byMa[c]) broken++; }); });
    return { nNew: nw, nUp: up, broken: broken, sample: sampleCount() };
  }
  function syncImport(imp) {
    need(isAdmin(), "khong_du_quyen"); stripSample();
    var m = syncMap(imp), byMa = m.byMa, map = m.map, nNew = 0, nUp = 0, nSp = 0, nSite = 0;
    imp.persons.forEach(function (p) { if (!map[p.id]) map[p.id] = uid("p"); });
    var resolve = function (c) { return c ? (map[c] || (byMa[c] && byMa[c].id) || null) : null; };
    imp.persons.forEach(function (p) {
      var ex = byMa[p.id], q = clone(p); q.id = map[p.id]; q.cha_id = resolve(p.cha_id); q.me_id = resolve(p.me_id);
      if (ex && ex.id === q.id) { var before = clone(ex); Object.keys(q).forEach(function (k) { if (SYNC_KEEP.indexOf(k) < 0 && k !== "id") ex[k] = q[k]; }); log("persons", ex.id, "nhap_excel", before, clone(ex)); nUp++; }
      else { q.tao_boi = who(); q.tao_luc = now(); S.data.persons.push(q); byMa[p.id] = q; nNew++; }
    });
    (imp.spouses || []).forEach(function (s) {
      var a = resolve(s.person_id), b = resolve(s.spouse_person_id); if (!a || !b) return;
      var ex = S.data.spouses.filter(function (x) { return (x.person_id === a && x.spouse_person_id === b) || (x.person_id === b && x.spouse_person_id === a); })[0];
      if (ex) { ex.thu_tu = s.thu_tu; ex.tinh_trang = s.tinh_trang; ex.ghi_chu = s.ghi_chu; ex.da_an = false; } else S.data.spouses.push({ id: uid("s"), person_id: a, spouse_person_id: b, ten: "", thu_tu: s.thu_tu, tinh_trang: s.tinh_trang, ghi_chu: s.ghi_chu });
      nSp++;
    });
    (imp.sites || []).forEach(function (s) {
      var ex = S.data.sites.filter(function (x) { return x.ten === s.ten; })[0], q = clone(s);
      if (q.nguoi_an_tang) q.nguoi_an_tang = q.nguoi_an_tang.map(resolve).filter(Boolean);
      if (ex) { Object.keys(q).forEach(function (k) { if (k !== "id" && k !== "nguon" && k !== "muc_hien_thi" && k !== "muc_chac_chan") ex[k] = q[k]; }); } else { q.id = uid("d"); S.data.sites.push(q); }
      nSite++;
    });
    log("he_thong", "excel", "nhap_excel", null, { moi: nNew, cap_nhat: nUp, vo_chong: nSp, di_tich: nSite }); var al = autoLink(); save(); return { auto: al, nNew: nNew, nUp: nUp, nSp: nSp, nSite: nSite };
  }
  /** Người dùng đã đăng nhập tự gửi yêu cầu ẩn hồ sơ hoặc xóa tài khoản (US-10); Admin xử lý, có ghi lịch sử */
  function addRequest(r) {
    need(S.viewer.role !== "khach", "khong_du_quyen"); S.data.yeu_cau = S.data.yeu_cau || [];
    var q = { id: uid("q"), loai: r.loai, person_id: S.viewer.person_id || null, profile_id: S.viewer.profileId || null, luc: now(), xong: false };
    S.data.yeu_cau.push(q); log("yeu_cau", q.id, "them", null, { loai: q.loai }); save(); return q;
  }
  function resolveRequest(id) {
    need(isAdmin(), "khong_du_quyen"); var q = (S.data.yeu_cau || []).filter(function (x) { return x.id === id; })[0]; need(q, "khong_co");
    if (q.loai === "an_ho_so" && q.person_id) { var p = byId(q.person_id); if (p && !p.da_an) { p.da_an = true; log("persons", p.id, "an", { da_an: false }, { da_an: true }); } }
    if (q.loai === "xoa_tai_khoan" && q.profile_id) { var pr = S.data.profiles.filter(function (x) { return x.id === q.profile_id; })[0]; if (pr) { pr.da_xoa = true; log("profiles", pr.id, "xoa_tai_khoan", { da_xoa: false }, { da_xoa: true }); } }
    q.xong = true; log("yeu_cau", id, "xu_ly", null, { xong: true }); save();
  }
  function resetSample() { need(isAdmin(), "khong_du_quyen"); var h = S.data.edit_history; S.data = fresh(); S.data.edit_history = h; log("he_thong", "mau", "dat_lai_du_lieu_mau", null, null); save(); }

  GP.store = { S: S, init: init, save: save, on: on, setViewer: setViewer, ctx: ctx, validate: validate, blank: blank, addPerson: addPerson, updatePerson: updatePerson, deletePerson: deletePerson, setHidden: setHidden, saveSpouse: saveSpouse, hideSpouse: hideSpouse,
    saveRow: saveRow, hideRow: hideRow, saveSettings: saveSettings, addMedia: addMedia, updateMedia: updateMedia, ignoreCheck: ignoreCheck, outdated: outdated, upgradeAll: upgradeAll, replaceAll: replaceAll, appendImport: appendImport, syncImport: syncImport, syncPreview: syncPreview,
    resetSample: resetSample, autoLink: autoLink, removeSample: removeSample, sampleCount: sampleCount, addRequest: addRequest, resolveRequest: resolveRequest, byId: byId, uid: uid, clone: clone, FIELDS: FIELDS };
  if (typeof module !== "undefined") module.exports = GP.store;
})(typeof window !== "undefined" ? window : globalThis);
