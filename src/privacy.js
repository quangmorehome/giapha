/* Quyền riêng tư (hiến chương điều 8–10). Một hàm quyết định dùng chung cho giao diện, xuất dữ liệu và kiểm thử.
 * Quan trọng: giao diện KHÔNG BAO GIỜ đọc bản ghi gốc, chỉ đọc kết quả của project().
 * Ở bản chính thức, nguồn sự thật là RLS + view trong supabase/migrations; hàm này mô phỏng đúng các luật đó. */
(function (root) {
  "use strict";
  var BAC = { rieng_tu: 0, gia_dinh_nho: 1, dai_gia_dinh: 2, gia_toc: 3, cong_khai: 4 };
  var BASIC_FIELDS = ["id", "ho", "ten_dem", "ten", "gioi_tinh", "the_thu", "cha_id", "me_id", "con_song", "thu_tu_con", "muc_hien_thi", "da_an", "schema"];

  function isMinor(p, year) {
    return !!(p.sinh && p.sinh.nam && year - p.sinh.nam < 18 && p.con_song !== false);
  }
  /** Người đang sống, hoặc chưa rõ còn sống */
  function isLiving(p) { return p.con_song !== false; }

  /** viewer: {role: khach|member|editor|admin, person_id, chi:[...]} */
  function makeContext(viewer, persons, spouses, year) {
    viewer = viewer || { role: "khach" };
    var byId = {}; persons.forEach(function (p) { byId[p.id] = p; });
    var me = viewer.person_id && byId[viewer.person_id];
    // "Người thân" của chủ tài khoản (tự động, theo cây): tổ tiên (cha mẹ, ông bà…), con cháu mọi đời (nội và ngoại),
    // vợ/chồng và dâu/rể của mỗi người đó, bố mẹ + tổ tiên bên vợ/chồng, anh chị em cùng cha/mẹ, con và vợ/chồng của anh chị em.
    var small = {};
    if (me) {
      var kids = {}, sp = {};
      persons.forEach(function (q) { [q.cha_id, q.me_id].forEach(function (a) { if (a) (kids[a] = kids[a] || []).push(q.id); }); });
      (spouses || []).forEach(function (s) { if (s.da_an || !s.spouse_person_id) return; (sp[s.person_id] = sp[s.person_id] || []).push(s.spouse_person_id); (sp[s.spouse_person_id] = sp[s.spouse_person_id] || []).push(s.person_id); });
      var up = function (id, into) { var q = [id], n = 0; while (q.length && n++ < 5000) { var p = byId[q.pop()]; if (!p) continue; [p.cha_id, p.me_id].forEach(function (a) { if (a && !into[a]) { into[a] = true; q.push(a); } }); } };
      small[me.id] = true; up(me.id, small);
      var down = [me.id], seenD = {}; seenD[me.id] = true;
      while (down.length) { var x = down.pop(); (kids[x] || []).forEach(function (c) { if (!seenD[c]) { seenD[c] = true; small[c] = true; down.push(c); } }); }
      Object.keys(small).slice().forEach(function (id) { if (seenD[id]) (sp[id] || []).forEach(function (w) { small[w] = true; }); });   // vợ/chồng của mình và của con cháu
      (sp[me.id] || []).forEach(function (w) { small[w] = true; up(w, small); });                                                   // bố mẹ, ông bà bên vợ/chồng
      persons.forEach(function (q) {
        var sib = (me.cha_id && q.cha_id === me.cha_id) || (me.me_id && q.me_id === me.me_id);
        if (sib) { small[q.id] = true; (sp[q.id] || []).forEach(function (w) { small[w] = true; }); (kids[q.id] || []).forEach(function (c) { small[c] = true; }); }
      });
    }
    var role = viewer.role || "khach";
    /** Độ gần của người xem với hồ sơ p: càng nhỏ càng gần */
    function closeness(p) {
      if (role === "admin") return -2;
      if (role === "editor") return -1; // cả dòng họ là một chi: Biên tập viên thấy và sửa mọi hồ sơ
      if (me && me.id === p.id) return 0;
      if (small[p.id]) return 1;
      return role === "khach" ? 4 : 3;
    }
    return { role: role, year: year, closeness: closeness, canSeeArchived: role === "admin" || role === "editor" };
  }

  /** Trả {level: full|basic|hidden|none, p} (none = không trả hàng nào, ví dụ hồ sơ đã ẩn với Member) */
  function project(p, ctx) {
    if (p.da_an && !ctx.canSeeArchived) return { level: "none" };
    var c = ctx.closeness(p), m = BAC[p.muc_hien_thi == null ? "rieng_tu" : p.muc_hien_thi];
    if (ctx.role === "member" && c <= 1) m = Math.max(m, 1); // người thân của chủ tài khoản: tự động được xem, không cần đặt mức hiển thị từng người
    if (c > m) return { level: "hidden", p: { id: p.id, cha_id: p.cha_id || null, me_id: p.me_id || null, level: "hidden" } };
    var restricted = (isLiving(p) || isMinor(p, ctx.year)) && !p.da_dong_y_tre_em && c >= 3;
    if (restricted) {
      var b = { level: "basic" };
      BASIC_FIELDS.forEach(function (f) { if (p[f] !== undefined) b[f] = p[f]; });
      // Người có tài khoản (không phải khách) thấy ngày sinh nhật (ngày/tháng) của mọi người để dùng cho lịch; không lộ năm sinh của trẻ em.
      // Để ở trường riêng "cal" để giao diện hồ sơ không vô tình hiện ra.
      if (ctx.role !== "khach" && p.sinh && p.sinh.ngay && p.sinh.thang) {
        var cs = { ngay: p.sinh.ngay, thang: p.sinh.thang, lich: p.sinh.lich || "duong" };
        if (p.sinh.nam && !isMinor(p, ctx.year)) cs.nam = p.sinh.nam;
        b.cal = { sinh: cs };
      }
      return { level: "basic", p: b };
    }
    var full = Object.assign({}, p); full.level = "full";
    return { level: "full", p: full };
  }
  /** Danh sách đã lọc: chỉ chứa bản ghi người xem được phép thấy (đầy đủ, cơ bản hoặc khung ẩn) */
  function visibleList(persons, ctx) {
    var out = [];
    persons.forEach(function (p) { var r = project(p, ctx); if (r.level !== "none") out.push(r.p); });
    return out;
  }
  /** Có được sửa hồ sơ này không (Quản trị, Biên tập). Cả dòng họ là một chi nên không chia theo nhánh. */
  function canEdit(p, viewer) {
    return !!viewer && !!p && (viewer.role === "admin" || viewer.role === "editor");
  }
  root.GP = root.GP || {};
  root.GP.privacy = { BAC: BAC, isMinor: isMinor, isLiving: isLiving, makeContext: makeContext, project: project, visibleList: visibleList, canEdit: canEdit };
  if (typeof module !== "undefined") module.exports = root.GP.privacy;
})(typeof window !== "undefined" ? window : globalThis);
