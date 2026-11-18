/* Xuất nhập JSON, CSV, lịch .ics; nâng cấp dữ liệu v1 -> v2; thống kê; nhắc ngày. */
(function (root) {
  "use strict";
  var GP = root.GP = root.GP || {};
  var SCHEMA = 2;
  function nfc(s) { return String(s == null ? "" : s).normalize("NFC"); }
  function norm(s) { return GP.checks.norm(s); }
  function yr(d) { return d && d.nam ? d.nam : null; }

  // ---------- Nâng cấp bản thử v1 -> v2 ----------
  /** Bản ghi v1 (bản thử, tên trường kiểu camelCase) -> v2. Trả {person, spouses} */
  function upgradeV1(o) {
    var w = String(o.ten || "").split(" "), ten = w.pop(), dem = ((o.tenDem || "") + " " + w.join(" ")).trim();
    function d(x) { if (!x) return null; var r = { nam: x.nam }; if (x.khoang) r.xap_xi = true; return r; }
    var p = { id: o.id, schema: SCHEMA, ho: o.ho || "", ten_dem: dem, ten: ten, ten_thuong_goi: o.tenThuongGoi || "", ten_huy: "", ten_thuy: "", ten_han_nom: "", dao_hieu: "",
      gioi_tinh: o.gioiTinh, sinh: d(o.sinh), con_song: o.conSong !== false && !o.mat, mat: d(o.mat), gio_ngay_am: o.gio ? o.gio.ngay : null, gio_thang_am: o.gio ? o.gio.thang : null, gio_nhuan: false,
      the_thu: o.doi == null ? null : o.doi, thu_tu_con: null, chi: o.chi || "", cha_id: o.chaId || null, me_id: o.meId || null, me_ten: "", nghe: "", noi_sinh: "", noi_an_tang: "",
      tieu_su: o.tieuSu || "", anh_dai_dien: "", nguon: o.nguon || "", muc_chac_chan: o.chac || "chua_chac", muc_hien_thi: o.muc || "rieng_tu", da_dong_y_tre_em: false, da_an: false, tao_boi: "nang_cap_v1", tao_luc: new Date().toISOString(), chung_cu: null };
    var sp = (o.vc || []).map(function (v, i) { return { id: "s_" + o.id + "_" + v.id, person_id: o.id, spouse_person_id: v.id, ten: "", thu_tu: v.thuTu || i + 1, tinh_trang: v.tinhTrang === "dang_o" ? "dang_o" : (v.tinhTrang || "dang_o"), ghi_chu: "" }; });
    return { person: p, spouses: sp };
  }
  function isV1(o) { return o && (o.schema == null || o.schema < SCHEMA) && (o.tenDem !== undefined || o.gioiTinh !== undefined || o.conSong !== undefined); }

  // ---------- CSV ----------
  var COLS = ["id", "ho", "ten_dem", "ten", "ten_thuong_goi", "ten_huy", "ten_thuy", "ten_han_nom", "dao_hieu", "gioi_tinh", "sinh_nam", "sinh_thang", "sinh_ngay", "sinh_lich", "sinh_xapxi", "sinh_den_nam",
    "con_song", "mat_nam", "mat_thang", "mat_ngay", "mat_lich", "mat_xapxi", "gio_ngay_am", "gio_thang_am", "gio_nhuan", "the_thu", "thu_tu_con", "chi", "cha_id", "me_id", "me_ten", "nghe", "noi_sinh",
    "noi_an_tang", "tieu_su", "nguon", "muc_chac_chan", "muc_hien_thi", "da_dong_y_tre_em", "da_an", "chung_cu", "vai", "vo_chong"];
  function esc(v) {
    var s = v == null ? "" : String(v);
    if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // chống chạy công thức khi mở bằng bảng tính
    return /[",\n\r;]/.test(s) || /^'/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function toCsv(persons, spouses) {
    var rows = [COLS.join(",")];
    persons.forEach(function (p) {
      var r = {};
      COLS.forEach(function (c) { r[c] = p[c]; });
      ["sinh", "mat"].forEach(function (k) {
        var d = p[k] || {};
        r[k + "_nam"] = d.nam; r[k + "_thang"] = d.thang; r[k + "_ngay"] = d.ngay; r[k + "_lich"] = d.lich; r[k + "_xapxi"] = d.xap_xi ? 1 : ""; r[k + "_den_nam"] = d.den_nam; if (k === "mat") delete r.mat_den_nam;
      });
      ["con_song", "gio_nhuan", "da_dong_y_tre_em", "da_an"].forEach(function (k) { r[k] = p[k] ? 1 : 0; });
      r.chung_cu = p.chung_cu ? JSON.stringify(p.chung_cu) : "";
      r.vo_chong = (spouses || []).filter(function (s) { return s.person_id === p.id; }).map(function (s) {
        return [s.id, s.spouse_person_id || "", s.thu_tu, s.tinh_trang || "", String(s.ten || "").replace(/[;~\n]/g, " ")].join("~");
      }).join(";");
      rows.push(COLS.map(function (c) { return esc(nfc(r[c])); }).join(","));
    });
    return rows.join("\r\n") + "\r\n";
  }
  function parseCsv(text) {
    var rows = [], row = [], cell = "", q = false, i = 0; text = text.replace(/^\uFEFF/, "");
    for (; i < text.length; i++) {
      var ch = text[i];
      if (q) { if (ch === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; } else cell += ch; }
      else if (ch === '"') q = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n" || ch === "\r") { if (ch === "\r" && text[i + 1] === "\n") i++; row.push(cell); cell = ""; if (row.length > 1 || row[0] !== "") rows.push(row); row = []; }
      else cell += ch;
    }
    if (q) throw new Error("csv_ngoac_kep");
    if (cell !== "" || row.length) { row.push(cell); rows.push(row); }
    return rows;
  }
  function fromCsv(text) {
    var rows = parseCsv(text), head = rows.shift(), persons = [], spouses = [];
    if (!head || head.indexOf("id") < 0) throw new Error("csv_thieu_cot_id");
    rows.forEach(function (r, ln) {
      if (r.length !== head.length) throw new Error("csv_so_o_sai:" + (ln + 2));
      var o = {}; head.forEach(function (h, i) { var v = r[i]; if (/^'[=+\-@\t\r]/.test(v)) v = v.slice(1); o[h] = v; });
      var p = { id: o.id, schema: SCHEMA };
      ["ho", "ten_dem", "ten", "ten_thuong_goi", "ten_huy", "ten_thuy", "ten_han_nom", "dao_hieu", "gioi_tinh", "chi", "cha_id", "me_id", "me_ten", "nghe", "noi_sinh", "noi_an_tang", "tieu_su", "nguon", "muc_chac_chan", "muc_hien_thi", "vai"].forEach(function (k) { p[k] = nfc(o[k] || "") || (k === "cha_id" || k === "me_id" ? null : ""); });
      ["sinh", "mat"].forEach(function (k) {
        if (!o[k + "_nam"] && !o[k + "_thang"] && !o[k + "_ngay"]) { p[k] = null; return; }
        var d = {}; if (o[k + "_nam"]) d.nam = +o[k + "_nam"]; if (o[k + "_thang"]) d.thang = +o[k + "_thang"]; if (o[k + "_ngay"]) d.ngay = +o[k + "_ngay"];
        if (o[k + "_lich"]) d.lich = o[k + "_lich"]; if (o[k + "_xapxi"]) d.xap_xi = true; if (o[k + "_den_nam"]) d.den_nam = +o[k + "_den_nam"]; p[k] = d;
      });
      p.con_song = o.con_song === "1"; p.gio_nhuan = o.gio_nhuan === "1"; p.da_dong_y_tre_em = o.da_dong_y_tre_em === "1"; p.da_an = o.da_an === "1";
      p.gio_ngay_am = o.gio_ngay_am ? +o.gio_ngay_am : null; p.gio_thang_am = o.gio_thang_am ? +o.gio_thang_am : null;
      p.the_thu = o.the_thu ? +o.the_thu : null; p.thu_tu_con = o.thu_tu_con ? +o.thu_tu_con : null;
      p.chung_cu = o.chung_cu ? JSON.parse(o.chung_cu) : null;
      persons.push(p);
      (o.vo_chong ? o.vo_chong.split(";") : []).forEach(function (x) { var f = x.split("~"); spouses.push({ id: f[0], person_id: p.id, spouse_person_id: f[1] || null, thu_tu: +f[2], tinh_trang: f[3] || "", ten: f[4] || "", ghi_chu: "" }); });
    });
    return { persons: persons, spouses: spouses };
  }

  // ---------- JSON sao lưu ----------
  /** Sao lưu đầy đủ (Admin) hoặc phần được phép (vai trò khác: chỉ bản ghi xem được, không có tài khoản, ủng hộ, cài đặt) */
  function backupJson(state, ctx, opts) {
    opts = opts || {};
    var full = ctx.role === "admin";
    var vis = GP.privacy.visibleList(state.persons, ctx).filter(function (p) { return p.level !== "hidden"; }).map(function (p) { var q = Object.assign({}, p); delete q.level; return q; });
    var ids = {}; vis.forEach(function (p) { ids[p.id] = 1; });
    var out = { phien_ban: SCHEMA, xuat_luc: new Date().toISOString(), quyen: ctx.role, ung_dung: "Gia phả số", persons: vis,
      spouses: state.spouses.filter(function (s) { return ids[s.person_id] && (!s.spouse_person_id || ids[s.spouse_person_id]); }),
      events: state.events.filter(function (e) { return full || GP.privacy.BAC[e.muc_hien_thi] >= (ctx.role === "khach" ? 4 : 3); }),
      sites: state.sites.filter(function (e) { return full || GP.privacy.BAC[e.muc_hien_thi] >= (ctx.role === "khach" ? 4 : 3); }) };
    if (full) { out.articles = state.articles; out.donations = state.donations; out.profiles = state.profiles; out.settings = state.settings; out.edit_history = state.edit_history; out.media = state.media; out.bo_qua_kiem_tra = state.bo_qua || []; }
    return JSON.stringify(out, null, opts.compact ? 0 : 1);
  }
  /** Đọc tệp JSON: nhận phiên bản 2, và bản thử v1 (nâng cấp tự động). Từ chối phiên bản mới hơn. */
  function readJson(text) {
    var o = JSON.parse(text), warnings = [];
    var persons = o.persons || o.nguoi || (Array.isArray(o) ? o : null);
    if (!persons) throw new Error("json_khong_hop_le");
    if (o.phien_ban && o.phien_ban > SCHEMA) throw new Error("json_phien_ban_moi:" + o.phien_ban);
    var sp = o.spouses || [], up = 0;
    persons = persons.map(function (p) { if (isV1(p)) { var u = upgradeV1(p); sp = sp.concat(u.spouses); up++; return u.person; } return p; });
    if (up) warnings.push("da_nang_cap:" + up);
    var res = Object.assign({}, o, { persons: persons, spouses: sp, warnings: warnings });
    return res;
  }

  // ---------- Gia phả: ngày giỗ, sinh nhật, lễ ----------
  /** Số ngày làm giỗ trước ngày mất (tập tục thường làm giỗ trước 1 ngày); chỉnh được ở settings.gio_truoc_ngay */
  function gioTruoc() { var st = GP.store && GP.store.S && GP.store.S.data && GP.store.S.data.settings, v = st && st.gio_truoc_ngay; return v === 0 || v > 0 ? +v : 1; }
  /** Giỗ tự suy ra từ ngày mất đầy đủ (ngày+tháng+năm, không "khoảng"), trước ngày mất gioTruoc() ngày */
  function gioTinh(p) {
    var m = p && p.mat, L = GP.lunar;
    if (!m || !m.ngay || !m.thang || !m.nam || m.xap_xi) return null;
    var am = m.lich === "am", dl = am ? { day: m.ngay, month: m.thang, year: m.nam, leap: !!m.nhuan } : L.solarToLunar(m.ngay, m.thang, m.nam);
    if (!dl) return null;
    var l = L.lunarBefore(dl.day, dl.month, dl.year, dl.leap, gioTruoc()); if (!l) return null;
    return { ngay: l.day, thang: l.month, nhuan: !!l.leap, namAm: l.month > dl.month ? dl.year - 1 : dl.year };
  }
  function gioInfo(p) {
    if (p.con_song !== false) return null;
    var L = GP.lunar;
    if (p.gio_ngay_am && p.gio_thang_am) {
      var ny = null;
      if (p.mat && p.mat.nam && p.mat.thang && p.mat.ngay && p.mat.lich !== "am") ny = L.solarToLunar(p.mat.ngay, p.mat.thang, p.mat.nam).year;
      else if (p.mat && p.mat.nam) ny = p.mat.nam; // gần đúng: năm ghi
      return { ngay: p.gio_ngay_am, thang: p.gio_thang_am, nhuan: !!p.gio_nhuan, namAm: ny };
    }
    var dv = gioTinh(p); if (dv) return { ngay: dv.ngay, thang: dv.thang, nhuan: dv.nhuan, namAm: dv.namAm, suyRa: true };
    return null;
  }
  function pad(n) { return (n < 10 ? "0" : "") + n; }
  function ymd(d) { return d[2] + "-" + pad(d[1]) + "-" + pad(d[0]); }
  function dayCmp(a, b) { return a[2] - b[2] || a[1] - b[1] || a[0] - b[0]; }
  function jd(d) { return GP.lunar.jdFromDate(d[0], d[1], d[2]); }
  /** Danh sách sự kiện trong [from, to] (ngày dương dạng [d,m,y]); persons phải là danh sách đã lọc quyền */
  function upcoming(persons, from, to, opts) {
    opts = opts || {}; var L = GP.lunar, out = [], j0 = jd(from), j1 = jd(to);
    persons.forEach(function (p) {
      if (p.level === "hidden") return;
      if (p.level === "basic") { if (!p.cal || !p.cal.sinh) return; p = { id: p.id, con_song: p.con_song, sinh: p.cal.sinh }; } // chỉ sinh nhật cho người chỉ có hồ sơ cơ bản
      var g = gioInfo(p);
      if (g) for (var y = from[2] - 1; y <= to[2] + 1; y++) {
        if (g.namAm && y <= g.namAm) continue; // giỗ đầu vào năm âm lịch sau năm mất
        var a = L.anniversary(g.ngay, g.thang, y, { leap: g.nhuan, rule: opts.gioThieu || "cuoi" });
        if (a && a.solar) { var jj = jd(a.solar); if (jj >= j0 && jj <= j1) out.push({ loai: "gio", ngay: a.solar, id: p.id, lunar: a.lunar, dieuChinh: a.adjusted, suyRa: !!g.suyRa, nam: y }); }
      }
      if (p.con_song !== false && p.sinh && p.sinh.thang && p.sinh.ngay) {
        for (var y2 = from[2]; y2 <= to[2]; y2++) {
          var d;
          if (p.sinh.lich === "am") { var a2 = L.anniversary(p.sinh.ngay, p.sinh.thang, y2, { leap: false }); var a3 = L.anniversary(p.sinh.ngay, p.sinh.thang, y2 - 1, { leap: false }); [a2, a3].forEach(function (z) { if (z && z.solar) { var jz = jd(z.solar); if (jz >= j0 && jz <= j1) out.push({ loai: "sinh", ngay: z.solar, id: p.id, tuoi: p.sinh.nam ? z.lunar.year - p.sinh.nam : null, am: true }); } }); continue; }
          d = [p.sinh.ngay, p.sinh.thang, y2]; if (p.sinh.thang === 2 && p.sinh.ngay === 29 && L.jdFromDate(29, 2, y2) !== L.jdFromDate(1, 3, y2) - 1) d = [28, 2, y2];
          var jb = jd(d); if (jb >= j0 && jb <= j1) out.push({ loai: "sinh", ngay: d, id: p.id, tuoi: p.sinh.nam ? y2 - p.sinh.nam : null });
        }
      }
    });
    if (opts.leTet !== false) for (var j = j0; j <= j1; j++) {
      var dt = L.jdToDate(j), l = L.solarToLunar(dt[0], dt[1], dt[2]), k = L.holidayKey(l);
      if (k) out.push({ loai: "le", ngay: dt, khoa: k, lunar: l });
    }
    var tm = L.thanhMinh(from[2]); if (tm && jd(tm) >= j0 && jd(tm) <= j1) out.push({ loai: "le", ngay: tm, khoa: "thanh_minh" });
    out.sort(function (a, b) { return dayCmp(a.ngay, b.ngay) || (a.loai === "le" ? 1 : 0) - (b.loai === "le" ? 1 : 0); });
    return out;
  }

  // ---------- ICS ----------
  function icsEsc(s) { return String(s).replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\n/g, "\\n"); }
  function fold(l) { var o = []; while (l.length > 74) { o.push(l.slice(0, 74)); l = " " + l.slice(74); } o.push(l); return o.join("\r\n"); }
  /** items: kết quả upcoming(); label(item) -> chuỗi; chỉ giỗ và sinh nhật (lễ để ứng dụng lịch tự có) */
  /** Lấy toạ độ từ link Google Maps (đầy đủ) hoặc chuỗi "lat, lng". Link rút gọn (maps.app.goo.gl, goo.gl/maps) không đọc được toạ độ: trả {short:true} */
  function parseGmaps(str) {
    str = String(str || "").trim(); if (!str) return { ok: false };
    var m, dec = str; try { dec = decodeURIComponent(str); } catch (e) {}
    function pair(a, b) { a = +a; b = +b; return isFinite(a) && isFinite(b) && Math.abs(a) <= 90 && Math.abs(b) <= 180 ? { ok: true, lat: a, lng: b } : null; }
    if ((m = /!3d(-?\d+(?:\.\d+)?)!4d(-?\d+(?:\.\d+)?)/.exec(dec))) { var r1 = pair(m[1], m[2]); if (r1) return r1; }
    if ((m = /@(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/.exec(dec))) { var r2 = pair(m[1], m[2]); if (r2) return r2; }
    if ((m = /[?&](?:q|ll|query|destination|center|daddr)=\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)/.exec(dec))) { var r3 = pair(m[1], m[2]); if (r3) return r3; }
    if ((m = /^\s*(-?\d+(?:\.\d+)?)\s*[,; ]\s*(-?\d+(?:\.\d+)?)\s*$/.exec(dec))) { var r4 = pair(m[1], m[2]); if (r4) return r4; }
    if (/(maps\.app\.goo\.gl|goo\.gl\/maps|g\.co\/kgs|share\.google)/i.test(str)) return { ok: false, short: true };
    return { ok: false };
  }
  function toIcs(items, label, calName, opts) {
    opts = opts || {};
    var L = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Gia pha so//VI", "CALSCALE:GREGORIAN", "X-WR-CALNAME:" + icsEsc(calName || "Gia phả")];
    items.filter(function (i) { return i.loai !== "le"; }).forEach(function (i) {
      var d = i.ngay, s = d[2] + pad(d[1]) + pad(d[0]), nx = GP.lunar.jdToDate(jd(d) + 1), e = nx[2] + pad(nx[1]) + pad(nx[0]);
      L.push("BEGIN:VEVENT", "UID:" + i.loai + "-" + i.id + "-" + s + "@giapha-ho-tong", "DTSTAMP:20260101T000000Z", "DTSTART;VALUE=DATE:" + s, "DTEND;VALUE=DATE:" + e, fold("SUMMARY:" + icsEsc(label(i))));
      var loc = opts.loc && opts.loc(i); if (loc) L.push(fold("LOCATION:" + icsEsc(loc)));
      var ds = opts.desc && opts.desc(i); if (ds) L.push(fold("DESCRIPTION:" + icsEsc(ds)));
      (opts.alarms || []).forEach(function (n) { L.push("BEGIN:VALARM", "ACTION:DISPLAY", "DESCRIPTION:" + icsEsc(label(i)), "TRIGGER:-P" + n + "D", "END:VALARM"); });
      L.push("END:VEVENT");
    });
    L.push("END:VCALENDAR"); return L.map(function (x) { return x.indexOf("\r\n") >= 0 ? x : fold(x); }).join("\r\n") + "\r\n";
  }

  // ---------- Thống kê (chỉ trên hồ sơ người xem được) ----------
  function stats(list, spouses, year) {
    var s = { tong: 0, song: 0, mat: 0, nam: 0, nu: 0, theoDoi: {}, theoChi: {}, tuoiTho: { n: 0, tb: 0, max: 0, maxId: null, min: 0 }, nhieuVoChong: 0, chacChan: { da_xac_minh: 0, chua_chac: 0, truyen_mieng: 0 }, an: 0, theoThapNien: {} };
    var sum = 0, cnt = {};
    spouses.forEach(function (x) { cnt[x.person_id] = (cnt[x.person_id] || 0) + 1; });
    list.forEach(function (p) {
      if (p.level === "hidden") { s.an++; return; }
      s.tong++; p.con_song === false ? s.mat++ : s.song++; p.gioi_tinh === "nam" ? s.nam++ : p.gioi_tinh === "nu" && s.nu++;
      var d = p.the_thu || 0; s.theoDoi[d] = (s.theoDoi[d] || 0) + 1;
      var c = p.chi || ""; s.theoChi[c] = (s.theoChi[c] || 0) + 1;
      if (p.muc_chac_chan && s.chacChan[p.muc_chac_chan] !== undefined) s.chacChan[p.muc_chac_chan]++;
      if (cnt[p.id] >= 2) s.nhieuVoChong++;
      if (p.level === "full" && yr(p.sinh) && yr(p.mat) && p.con_song === false && !p.sinh.xap_xi && !p.mat.xap_xi) {
        var t = yr(p.mat) - yr(p.sinh); if (t >= 0 && t <= 125) { sum += t; s.tuoiTho.n++; if (t > s.tuoiTho.max) { s.tuoiTho.max = t; s.tuoiTho.maxId = p.id; } var dec = Math.floor(yr(p.sinh) / 10) * 10; (s.theoThapNien[dec] = s.theoThapNien[dec] || []).push(t); }
      }
    });
    s.tuoiTho.tb = s.tuoiTho.n ? Math.round((sum / s.tuoiTho.n) * 10) / 10 : 0;
    return s;
  }
  GP.io = { SCHEMA: SCHEMA, upgradeV1: upgradeV1, isV1: isV1, toCsv: toCsv, fromCsv: fromCsv, backupJson: backupJson, readJson: readJson, gioInfo: gioInfo, gioTinh: gioTinh, gioTruoc: gioTruoc, upcoming: upcoming, toIcs: toIcs, parseGmaps: parseGmaps, stats: stats, COLS: COLS };
  if (typeof module !== "undefined") module.exports = GP.io;
})(typeof window !== "undefined" ? window : globalThis);
