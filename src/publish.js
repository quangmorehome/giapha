/* Bản công khai: tạo bộ dữ liệu MÀ KHÁCH ĐƯỢC PHÉP THẤY (dùng đúng hàm privacy.project như giao diện).
 * Tệp data.json đưa lên mạng là công khai hoàn toàn, nên mọi thứ riêng tư phải bị loại ngay tại đây, không dựa vào giao diện che. */
(function (root) {
  "use strict";
  var GP = root.GP = root.GP || {};
  // Khách chỉ nhận: họ tên, giới tính, NĂM sinh/mất, đời, quan hệ cha/mẹ. Không có tiểu sử, nghề, nơi sinh, nơi an táng, ngày giỗ, ảnh, ghi chú.
  var GUEST_KEEP = ["id", "schema", "ho", "ten_dem", "ten", "ten_thuong_goi", "ten_huy", "ten_thuy", "ten_han_nom", "dao_hieu", "gioi_tinh", "con_song", "the_thu", "thu_tu_con", "cha_id", "me_id", "vai", "muc_hien_thi", "muc_chac_chan", "da_an"];
  function guestFields(p) {
    var q = {}; GUEST_KEEP.forEach(function (k) { if (p[k] !== undefined) q[k] = p[k]; });
    q.me_ten = ""; q.sinh = p.sinh && p.sinh.nam ? { nam: p.sinh.nam, xap_xi: !!p.sinh.xap_xi } : null; q.mat = p.mat && p.mat.nam ? { nam: p.mat.nam, xap_xi: !!p.mat.xap_xi } : null;
    return q;
  }
  function sanitize(state, opts) {
    opts = opts || {};
    var PR = GP.privacy, BAC = PR.BAC, st = state.settings || {};
    var year = st.nam_hien_tai || new Date().getFullYear();
    // Tùy chọn: người đã mất / địa điểm / sự kiện đang ở mức "Gia tộc" được đưa lên công khai (người còn sống, trẻ em bị loại hẳn; "Riêng tư" và "Gia đình nhỏ" giữ nguyên)
    var up = function (o) { if (opts.nang_gia_toc && o.muc_hien_thi === "gia_toc") { o = Object.assign({}, o); o.muc_hien_thi = "cong_khai"; } return o; };
    var src = (state.persons || []).map(function (p) { return p.con_song === false ? up(p) : p; });
    state = Object.assign({}, state, { persons: src, events: (state.events || []).map(up), sites: (state.sites || []).map(up), media: (state.media || []).map(up) });
    var ctx = PR.makeContext({ role: "khach" }, state.persons, state.spouses || [], year);
    var seen = {}, persons = [];
    // Nguyên tắc cho KHÁCH: chỉ thấy người ĐÃ MẤT được đặt mức hiển thị công khai. Người còn sống, trẻ em, người chưa rõ tình trạng bị loại hẳn (kể cả tên).
    var dead = {}, byId = {}; state.persons.forEach(function (p) { byId[p.id] = p; if (p.con_song === false) dead[p.id] = 1; });
    PR.visibleList(state.persons, ctx).forEach(function (p) {
      if (opts.cho_phep_nguoi_song !== true) {
        if (!dead[p.id] || p.level === "basic") return;
        // người mới mất (dưới 10 năm) hoặc chưa rõ năm mất: ẩn, trừ khi Quản trị bật riêng cho người đó
        var raw = byId[p.id], dy = raw.mat && raw.mat.nam, by = raw.sinh && raw.sinh.nam;
        var recent = dy ? year - dy < 10 : by ? year - by < 80 : true;
        if (recent && !raw.hien_khach) return;
      }
      var q = guestFields(p), lv = p.level;
      q.__lv = lv; persons.push(q); seen[q.id] = lv;
    });
    var spouses = (state.spouses || []).filter(function (s) {
      if (s.da_an) return false; var a = seen[s.person_id]; if (!a || a === "hidden") return false;
      if (s.spouse_person_id) { var b = seen[s.spouse_person_id]; return !!b && b !== "hidden"; }
      return a === "full"; // vợ/chồng chỉ có tên: chỉ giữ khi chủ hồ sơ được xem đầy đủ
    }).map(function (s) { var o = Object.assign({}, s); delete o.ghi_chu; return o; });
    persons.forEach(function (p) {
      delete p.__lv;
      // không để lại dấu vết người bị ẩn: bỏ liên kết cha/mẹ trỏ tới người không công khai, và tên mẹ gõ tay
      if (p.cha_id && !seen[p.cha_id]) p.cha_id = null;
      if (p.me_id && !seen[p.me_id]) { p.me_id = null; p.me_ten = ""; }
    });
    var pub = function (e) { return !e.da_an && BAC[e.muc_hien_thi == null ? "rieng_tu" : e.muc_hien_thi] >= 4; };
    var media = (state.media || []).filter(function (m) { return pub(m) && (m.thumb || m.duong_dan_hien_thi) && String(m.thumb || m.duong_dan_hien_thi).indexOf("data:") === 0; });
    var set = Object.assign({}, st); delete set.ung_ho_thong_tin;
    return { persons: persons, spouses: spouses, events: (state.events || []).filter(pub), sites: (state.sites || []).filter(pub).map(function (x) { var o = Object.assign({}, x); delete o.lien_he_sdt; delete o.lien_he_tuoi; delete o.lien_he_ten; return o; }),
      articles: (state.articles || []).filter(function (a) { return a.trang_thai === "da_duyet" && !a.da_an && a.nhom !== "danh_nhan"; }),
      donations: [], profiles: [], media: media, edit_history: [], bo_qua: [], chis: state.chis || [], settings: set,
      schema: state.schema || (GP.io && GP.io.SCHEMA) || 2, mau: !!state.mau || !!opts.mau, cong_khai: true, xuat_luc: new Date().toISOString() };
  }
  /** Bản dữ liệu dành riêng cho MỘT người nhà: lọc đúng theo quan hệ với hồ sơ được gán (privacy.project, ngữ cảnh member) */
  var NN_VER = 4; // tăng khi đổi quy tắc người thân; người nhà sẽ được báo nếu bản của họ cũ hơn
  function forMember(state, personId) {
    var PR = GP.privacy, BAC = PR.BAC, st = state.settings || {}, year = st.nam_hien_tai || new Date().getFullYear();
    var ctx = PR.makeContext({ role: "member", person_id: personId }, state.persons || [], state.spouses || [], year), seen = {}, persons = [];
    PR.visibleList(state.persons || [], ctx).forEach(function (p) { if (p.level === "hidden") return; var q = Object.assign({}, p); delete q.level; seen[q.id] = p.level; persons.push(q); });
    persons.forEach(function (p) { if (p.cha_id && !seen[p.cha_id]) p.cha_id = null; if (p.me_id && !seen[p.me_id]) { p.me_id = null; p.me_ten = ""; } });
    var spouses = (state.spouses || []).filter(function (s) { if (s.da_an) return false; var a = seen[s.person_id]; if (!a) return false; return s.spouse_person_id ? !!seen[s.spouse_person_id] : a === "full"; }).map(function (s) { return Object.assign({}, s); });
    var ok = function (e) { return !e.da_an && BAC[e.muc_hien_thi == null ? "rieng_tu" : e.muc_hien_thi] >= 3; };
    var set = Object.assign({}, st); delete set.ung_ho_thong_tin;
    return { persons: persons, spouses: spouses, events: (state.events || []).filter(ok), sites: (state.sites || []).filter(ok),
      articles: (state.articles || []).filter(function (a) { return a.trang_thai === "da_duyet" && !a.da_an && a.nhom !== "danh_nhan"; }),
      donations: [], profiles: [], media: (state.media || []).filter(function (m) { return ok(m) && (m.thumb || m.duong_dan_hien_thi) && String(m.thumb || m.duong_dan_hien_thi).indexOf("data:") === 0; }),
      edit_history: [], bo_qua: [], chis: state.chis || [], settings: set, schema: state.schema || (GP.io && GP.io.SCHEMA) || 2, mau: false, nguoi_nha: personId, nn_ver: NN_VER, xuat_luc: new Date().toISOString() };
  }
  GP.publish = { sanitize: sanitize, forMember: forMember, NN_VER: NN_VER };
  if (typeof module !== "undefined") module.exports = GP.publish;
})(typeof window !== "undefined" ? window : globalThis);
