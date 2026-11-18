/* Đăng nhập + lưu chung qua Supabase (chỉ dùng fetch, không cần thư viện).
   - Khách: đọc bản công khai (bảng gp_cong_khai).
   - Quản trị / Biên tập: đăng nhập email + mật khẩu, đọc/ghi bản đầy đủ (gp_rieng) có khoá phiên bản chống ghi đè nhau.
   - Quản trị: mỗi lần lưu tự đăng bản đã lọc riêng tư lên gp_cong_khai. */
(function (root) {
  "use strict";
  var GP = (root.GP = root.GP || {}), C = { st: { user: null, role: "khach", ten: "", status: "", version: 0, loaded: false, last: "" } }, sess = null, timer = null, busy = false;
  function cfg() { var c = root.GP_CLOUD_TEST || GP.CLOUD_CFG; return c && c.url && c.key ? c : null; }
  function ls(k, v) { try { if (v === undefined) return root.localStorage.getItem(k); if (v === null) root.localStorage.removeItem(k); else root.localStorage.setItem(k, v); } catch (e) { return null; } }
  function req(method, path, body, o) {
    o = o || {}; var c = cfg(), h = { apikey: c.key, "Content-Type": "application/json" };
    if (!o.anon && sess && sess.access_token) h.Authorization = "Bearer " + sess.access_token;
    if (o.prefer) h.Prefer = o.prefer;
    return root.fetch(c.url + path, { method: method, headers: h, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" }).then(function (r) {
      return r.text().then(function (tx) {
        var j = null; try { j = tx ? JSON.parse(tx) : null; } catch (e) {}
        if (!r.ok) { var e = new Error((j && (j.msg || j.message || j.error_description || j.error)) || "HTTP " + r.status); e.status = r.status; throw e; }
        return j;
      });
    });
  }
  function setSess(j) { sess = j && j.access_token ? { access_token: j.access_token, refresh_token: j.refresh_token, expires_at: j.expires_at || Math.floor(Date.now() / 1000) + (j.expires_in || 3600), user: j.user || (sess && sess.user) } : null; ls("gp.sess", sess ? JSON.stringify(sess) : null); }
  function fresh() {
    if (!sess) return Promise.reject(new Error("chua_dang_nhap"));
    if (sess.expires_at * 1000 - Date.now() > 60000) return Promise.resolve();
    return req("POST", "/auth/v1/token?grant_type=refresh_token", { refresh_token: sess.refresh_token }, { anon: true }).then(setSess);
  }
  C.active = function () { return !!cfg(); };
  C.login = function (email, pw) {
    return req("POST", "/auth/v1/token?grant_type=password", { email: email, password: pw }, { anon: true }).then(setSess);
  };
  C.logout = function () { sess = null; ls("gp.sess", null); C.st.user = null; C.st.role = "khach"; C.st.loaded = false; C.st.version = 0; };
  C.restore = function () { var raw = ls("gp.sess"); if (!raw) return false; try { sess = JSON.parse(raw); } catch (e) { sess = null; } return !!sess; };
  C.me = function () {
    return fresh().then(function () { return req("GET", "/rest/v1/gp_vai_tro?select=vai_tro,ten,nguoi_id&user_id=eq." + sess.user.id); }).then(function (rows) {
      C.st.user = sess.user.email || ""; C.st.role = rows && rows[0] ? rows[0].vai_tro : "khach"; C.st.ten = rows && rows[0] && rows[0].ten || C.st.user; C.st.nguoi = rows && rows[0] && rows[0].nguoi_id || ""; return C.st.role;
    });
  };
  C.loadPublic = function () { return req("GET", "/rest/v1/gp_cong_khai?id=eq.1&select=data", undefined, { anon: true }).then(function (r) { return r && r[0] ? r[0].data : null; }); };
  C.loadMine = function () { return fresh().then(function () { return req("GET", "/rest/v1/gp_nguoi_nha?user_id=eq." + sess.user.id + "&select=data"); }).then(function (r) { return r && r[0] ? r[0].data : null; }); };
  C.loadPrivate = function () { return fresh().then(function () { return req("GET", "/rest/v1/gp_rieng?id=eq.1&select=data,version"); }).then(function (r) { return r && r[0] ? r[0] : null; }); };
  C.pushPrivate = function (data) {
    return fresh().then(function () {
      var v = C.st.version;
      if (!v) return req("POST", "/rest/v1/gp_rieng", { id: 1, data: data, version: 1, updated_by: sess.user.id }, { prefer: "return=representation" }).then(function (r) { C.st.version = r[0].version; return true; }, function (e) { if (e.status === 409) return false; throw e; });
      return req("PATCH", "/rest/v1/gp_rieng?id=eq." + 1 + "&version=eq." + v, { data: data, version: v + 1, updated_at: new Date().toISOString(), updated_by: sess.user.id }, { prefer: "return=representation" }).then(function (r) { if (!r || !r.length) return false; C.st.version = r[0].version; return true; });
    });
  };
  C.publishPublic = function (data) { return fresh().then(function () { return req("POST", "/rest/v1/gp_cong_khai?on_conflict=id", { id: 1, data: data, updated_at: new Date().toISOString() }, { prefer: "resolution=merge-duplicates,return=minimal" }); }); };
  function pubData() { var S = GP.store; var d = JSON.parse(JSON.stringify(GP.publish.sanitize(S.S.data, { nang_gia_toc: !!(S.S.data.settings || {}).web_nang_gia_toc }))); return d; }
  /** Quản trị: danh sách tài khoản + vai trò (hàm gp_ds_thanh_vien kiểm tra quyền ở máy chủ) */
  C.listMembers = function () { return fresh().then(function () { return req("POST", "/rest/v1/rpc/gp_ds_thanh_vien", {}); }).then(function (r) { return Array.isArray(r) ? r : []; }); };
  C.setRole = function (uid, role, ten, nguoi) { return fresh().then(function () { return req("POST", "/rest/v1/rpc/gp_dat_vai_tro", { p_user: uid, p_vai_tro: role, p_ten: ten || null, p_nguoi: nguoi || null }); }); };
  /** Kho tư liệu: danh sách, tải tệp lên Storage, thêm/sửa/xoá bản ghi, link tạm để xem tệp riêng tư */
  C.khoList = function () { return fresh().then(function () { return req("GET", "/rest/v1/gp_tu_lieu?select=*&order=created_at.desc&limit=500"); }).then(function (r) { return Array.isArray(r) ? r : []; }); };
  C.khoUpload = function (path, blob) {
    return fresh().then(function () {
      var c = cfg(); return root.fetch(c.url + "/storage/v1/object/gp-tu-lieu/" + path.split("/").map(encodeURIComponent).join("/"), { method: "POST", headers: { apikey: c.key, Authorization: "Bearer " + sess.access_token, "Content-Type": blob.type || "application/octet-stream", "x-upsert": "false" }, body: blob }).then(function (r) {
        if (r.ok) return true; return r.text().then(function (tx) { var j = null; try { j = JSON.parse(tx); } catch (e) {} throw new Error((j && (j.message || j.error)) || "HTTP " + r.status); });
      });
    });
  };
  C.khoAdd = function (row) { return fresh().then(function () { return req("POST", "/rest/v1/gp_tu_lieu", row, { prefer: "return=minimal" }); }); };
  C.khoSet = function (id, patch) { return fresh().then(function () { return req("PATCH", "/rest/v1/gp_tu_lieu?id=eq." + encodeURIComponent(id), patch, { prefer: "return=minimal" }); }); };
  C.khoDel = function (id, path) {
    return fresh().then(function () { var c = cfg(); return path ? root.fetch(c.url + "/storage/v1/object/gp-tu-lieu/" + path.split("/").map(encodeURIComponent).join("/"), { method: "DELETE", headers: { apikey: c.key, Authorization: "Bearer " + sess.access_token } }).catch(function () {}) : null; })
      .then(function () { return req("DELETE", "/rest/v1/gp_tu_lieu?id=eq." + encodeURIComponent(id)); });
  };
  var signCache = {};
  C.khoSign = function (paths) {
    var now = Date.now(), need = paths.filter(function (p) { return !signCache[p] || signCache[p].t < now; });
    if (!need.length) return Promise.resolve(signCache);
    return fresh().then(function () { return req("POST", "/storage/v1/object/sign/gp-tu-lieu", { expiresIn: 3600, paths: need }); }).then(function (r) {
      (Array.isArray(r) ? r : []).forEach(function (x) { if (x && x.signedURL) signCache[x.path] = { u: cfg().url + "/storage/v1" + x.signedURL, t: now + 50 * 60 * 1000 }; }); return signCache;
    });
  };
  /** Đề xuất của người trong họ: gửi, xem (của mình; Quản trị xem tất cả), Quản trị duyệt */
  C.sendProposal = function (o) { return fresh().then(function () { return req("POST", "/rest/v1/gp_de_xuat", { ten: C.st.ten || C.st.user || null, nguoi_id: o.nguoi_id || null, loai: o.loai, noi_dung: o.noi_dung }, { prefer: "return=minimal" }); }); };
  C.listProposals = function () { return fresh().then(function () { return req("GET", "/rest/v1/gp_de_xuat?select=*&order=created_at.desc&limit=200"); }).then(function (r) { return Array.isArray(r) ? r : []; }); };
  C.resolveProposal = function (id, status, note) { return fresh().then(function () { return req("PATCH", "/rest/v1/gp_de_xuat?id=eq." + encodeURIComponent(id), { trang_thai: status, ghi_chu: note || null, resolved_at: new Date().toISOString() }, { prefer: "return=minimal" }); }); };
  /** Quản trị / Biên tập: tự gắn tài khoản của mình với một hồ sơ cá nhân */
  C.linkSelf = function (nguoi) { return fresh().then(function () { return req("POST", "/rest/v1/rpc/gp_gan_ho_so_minh", { p_nguoi: nguoi }); }).then(function () { C.st.nguoi = nguoi; }); };
  /** Quản trị: soạn lại bản dữ liệu riêng cho từng Người nhà (chỉ ghi dòng nào đã đổi) */
  var lastMem = {};
  /** Trả về báo cáo {n: số bản đã ghi, rows:[{ten,email,ho_so,so_nguoi,loi}], thieu:[tài khoản Người nhà chưa gắn hồ sơ]}; lỗi được lưu ở C.st.memErr (không nuốt im lặng) */
  C.publishMembers = function (force) {
    return C.listMembers().then(function (rows) {
      C.st.members = rows; var S = GP.store, jobs = [], rep = { n: 0, rows: [], thieu: [] };
      rows.filter(function (m) { return m.r_vai_tro === "member"; }).forEach(function (m) {
        if (!m.r_nguoi_id) { rep.thieu.push(m.r_email); return; }
        var d = GP.publish.forMember(S.S.data, m.r_nguoi_id), key = JSON.stringify(d, function (k, v) { return k === "xuat_luc" ? undefined : v; }), ln = { ten: m.r_ten || m.r_email, email: m.r_email, ho_so: m.r_nguoi_id, so_nguoi: d.persons.length, loi: "" };
        rep.rows.push(ln);
        if (!force && lastMem[m.r_user_id] === key) return;
        jobs.push(req("POST", "/rest/v1/gp_nguoi_nha?on_conflict=user_id", { user_id: m.r_user_id, data: d, updated_at: new Date().toISOString() }, { prefer: "resolution=merge-duplicates" }).then(function () { lastMem[m.r_user_id] = key; rep.n++; }, function (e) { ln.loi = e.message || String(e.status); }));
      });
      return Promise.all(jobs).then(function () { C.st.memReport = rep; C.st.memErr = rep.rows.some(function (r) { return r.loi; }) ? rep.rows.filter(function (r) { return r.loi; })[0].loi : ""; return rep; });
    }, function (e) { C.st.memErr = e.message || "loi"; throw e; });
  };
  C.myId = function () { return sess && sess.user ? sess.user.id : ""; };
  C.canPush = function () { return C.st.loaded && (C.st.role === "admin" || C.st.role === "editor"); };
  function say(s) { C.st.status = s; if (GP.ui && GP.ui.cloudStatus) GP.ui.cloudStatus(); }
  /** Đẩy ngay (admin/editor); admin đăng thêm bản công khai */
  C.sync = function (force) {
    if (!C.canPush() || busy) return Promise.resolve(false);
    var S = GP.store, str = JSON.stringify(S.S.data); if (!force && str === C.st.last) return Promise.resolve(true);
    busy = true; say("saving");
    return C.pushPrivate(S.S.data).then(function (ok) {
      if (!ok) { say("conflict"); return false; }
      C.st.last = str;
      return (C.st.role === "admin" ? C.publishPublic(pubData()).then(function () { return C.publishMembers(false).catch(function () {}); }).then(function () { return true; }, function () { say("pub_err"); return false; }) : Promise.resolve(true)).then(function (p) { if (p) say("ok:" + new Date().toLocaleTimeString("vi-VN")); return true; });
    }).catch(function (e) { say("err:" + (e.message || "")); return false; }).then(function (r) { busy = false; return r; });
  };
  C.schedule = function () { if (!C.canPush()) return; clearTimeout(timer); timer = setTimeout(function () { C.sync(false); }, 1500); };
  /** Khởi động: có phiên → vai trò → tải bản đầy đủ; không có → tải bản công khai */
  C.boot = function () {
    var S = GP.store, U = GP.ui;
    function adopt(d) { d.chis = d.chis || []; d.media = d.media || []; d.edit_history = d.edit_history || []; d.profiles = d.profiles || []; d.mau = false; S.S.data = d; }
    var guest = function () {
      return C.loadPublic().then(function (d) { if (d && d.persons && d.persons.length) { adopt(d); } S.setViewer({ role: "khach", ten: "Khách" }); }).catch(function () { S.setViewer({ role: "khach", ten: "Khách" }); say("offline"); });
    };
    if (!C.restore()) return guest();
    return C.me().then(function (role) {
      if (role === "member" && C.st.nguoi) {
        return C.loadMine().then(function (d) {
          if (!d || !d.persons) { say("member_wait"); return guest(); }
          adopt(d); C.st.stale = d.nn_ver !== GP.publish.NN_VER; C.st.loaded = false; say(C.st.stale ? "member_stale" : "ok:" + new Date().toLocaleTimeString("vi-VN"));
          S.setViewer({ role: "member", ten: C.st.ten, person_id: C.st.nguoi });
        });
      }
      if (role !== "admin" && role !== "editor") { say("no_role"); return guest(); }
      return C.loadPrivate().then(function (row) {
        if (row) { adopt(row.data); C.st.version = row.version; C.st.loaded = true; C.st.last = JSON.stringify(S.S.data); say("ok:" + new Date().toLocaleTimeString("vi-VN")); }
        else { C.st.loaded = false; say("empty"); }
        if (role === "admin" && C.st.loaded) C.publishMembers(false).catch(function () {});
        S.setViewer({ role: role, ten: C.st.ten, person_id: C.st.nguoi || null }); // cả dòng họ là một chi: Quản trị và Biên tập đều sửa được mọi hồ sơ; chỉ Quản trị đăng bản công khai, nhập Excel, quản lý thành viên
      });
    }).catch(function (e) { if (e.status === 400 || e.status === 401 || /refresh|JWT|chua_dang/i.test(e.message)) { C.logout(); } say("offline"); return guest(); });
  };
  GP.cloud = C;
})(typeof window !== "undefined" ? window : globalThis);
