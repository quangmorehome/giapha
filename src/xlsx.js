/* Đọc tệp Excel (.xlsx) ngay trong trình duyệt, không cần thư viện: giải nén zip + đọc XML.
   Dùng cho bảng nhập liệu "Bang-nhap-gia-pha-Ho-Tong.xlsx" (sheet Người / Vợ chồng / Lăng mộ). */
(function () {
  "use strict";
  var GP = (window.GP = window.GP || {});
  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  var dec = new TextDecoder("utf-8");
  function unzip(buf) {
    var b = new Uint8Array(buf), e = -1, i;
    for (i = b.length - 22; i >= Math.max(0, b.length - 70000); i--) if (u32(b, i) === 0x06054b50) { e = i; break; }
    if (e < 0) throw new Error("khong_phai_xlsx");
    var n = u16(b, e + 10), p = u32(b, e + 16), ent = {};
    for (i = 0; i < n; i++) {
      if (u32(b, p) !== 0x02014b50) throw new Error("zip_hong");
      var nl = u16(b, p + 28), el = u16(b, p + 30), cl = u16(b, p + 32), name = dec.decode(b.subarray(p + 46, p + 46 + nl));
      ent[name] = { method: u16(b, p + 10), size: u32(b, p + 20), off: u32(b, p + 42) }; p += 46 + nl + el + cl;
    }
    return {
      get: function (name) {
        var x = ent[name]; if (!x) return Promise.resolve(null);
        var s = x.off + 30 + u16(b, x.off + 26) + u16(b, x.off + 28), raw = b.subarray(s, s + x.size);
        if (x.method === 0) return Promise.resolve(dec.decode(raw));
        if (x.method !== 8 || typeof DecompressionStream === "undefined") return Promise.reject(new Error("trinh_duyet_cu"));
        return new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer().then(function (ab) { return dec.decode(ab); });
      }
    };
  }
  function xml(s) { return new DOMParser().parseFromString(s, "application/xml"); }
  function colIdx(ref) { var m = /^([A-Z]+)/.exec(ref), n = 0; for (var i = 0; i < m[1].length; i++) n = n * 26 + m[1].charCodeAt(i) - 64; return n - 1; }
  function txt(node) { return Array.prototype.map.call(node.getElementsByTagName("t"), function (t) { return t.textContent; }).join(""); }
  /** → Promise<{ "Tên sheet": [[ô, ô, …], …] }> */
  function parse(buf) {
    var z = unzip(buf), shared = [], sheets = [], rels = {};
    return Promise.all([z.get("xl/workbook.xml"), z.get("xl/_rels/workbook.xml.rels"), z.get("xl/sharedStrings.xml")]).then(function (r) {
      if (!r[0]) throw new Error("khong_phai_xlsx");
      if (r[2]) Array.prototype.forEach.call(xml(r[2]).getElementsByTagName("si"), function (si) { shared.push(txt(si)); });
      Array.prototype.forEach.call(xml(r[1]).getElementsByTagName("Relationship"), function (x) { rels[x.getAttribute("Id")] = x.getAttribute("Target"); });
      Array.prototype.forEach.call(xml(r[0]).getElementsByTagName("sheet"), function (s) {
        var id = s.getAttribute("r:id") || s.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id"), tg = rels[id] || "";
        sheets.push({ name: s.getAttribute("name"), path: tg.charAt(0) === "/" ? tg.slice(1) : "xl/" + tg });
      });
      return Promise.all(sheets.map(function (s) { return z.get(s.path); }));
    }).then(function (xs) {
      var out = {};
      sheets.forEach(function (s, k) {
        var rows = []; if (!xs[k]) { out[s.name] = rows; return; }
        Array.prototype.forEach.call(xml(xs[k]).getElementsByTagName("row"), function (row) {
          var ri = (+row.getAttribute("r") || rows.length + 1) - 1, arr = rows[ri] = rows[ri] || [];
          Array.prototype.forEach.call(row.getElementsByTagName("c"), function (c) {
            var t = c.getAttribute("t"), v = c.getElementsByTagName("v")[0], val = "";
            if (t === "inlineStr") val = txt(c); else if (v) val = t === "s" ? (shared[+v.textContent] || "") : v.textContent;
            arr[colIdx(c.getAttribute("r"))] = String(val).trim();
          });
        });
        for (var i = 0; i < rows.length; i++) { rows[i] = rows[i] || []; for (var j = 0; j < rows[i].length; j++) if (rows[i][j] === undefined) rows[i][j] = ""; }
        out[s.name] = rows;
      });
      return out;
    });
  }
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/gi, "d").toLowerCase().replace(/[^a-z0-9]/g, ""); }
  var PCOL = { ma: "ma", ho: "ho", tendem: "ten_dem", tenbatbuoc: "ten", tenthuonggoi: "ten_thuong_goi", gioitinh: "gt", namsinh: "sn", thangsinh: "st", ngaysinh: "sd", tinhtrang: "tt", nammat: "mn", thangmat: "mt", ngaymat: "md", giongayam: "gd", giothangam: "gt_am", giounhuanx: "gnh", doithu: "the_thu", thutucon: "thu_tu_con", chinhanh: "chi", macha: "cha", mame: "me", vaitro: "vai", nghenghiep: "nghe", noisinh: "noi_sinh", noiantang: "noi_an_tang", hienthi: "hien", ghichutieusu: "tieu_su" };
  var SCOL = { manguoi1: "a", manguoi2: "b", thutuvochong123: "thu", namketHon: "nk", namkethon: "nk", tinhtrang: "tt", ghichu: "gc" };
  var LCOL = { tenkhulangmotuduong: "ten", loailangmotuduongnhathoho: "loai", diachixaphuonghuyentinh: "dia_chi", vido: "vi_do", kinhdo: "kinh_do", manguoianguongcachnhaudaup: "an_tang", manguoiantangcachnhaudauphay: "an_tang", linkgooglemaps: "link", hientrang: "ht", nguoilienhedienthoai: "lien_he", ghichucachdi: "duong_di", taomodinhkythanhminhchap: "tm", ngaytaomoriengngaythangamvd103: "tm_tuy", giothamvieng: "gio_tv", namxay: "nam_xay" };
  function headMap(rows, MAP, extra) {
    var h = rows[0] || [], m = {}; h.forEach(function (x, i) { var k = norm(x), key = MAP[k]; if (!key && extra) for (var q in extra) if (k.indexOf(q) === 0) key = extra[q]; if (key) m[key] = i; }); return m;
  }
  function num(v, nm, row, warn, lo, hi) {
    if (v === "" || v == null) return null; var n = +String(v).replace(",", "."); if (!isFinite(n) || n % 1 !== 0 || n < lo || n > hi) { warn.push(nm + " dòng " + row + ": “" + v + "” không hợp lệ, bỏ qua"); return null; } return n;
  }
  var GT = { nam: "nam", nu: "nu" }, VAI = { ruot: "ruot", daure: "dau_re", thonggia: "thong_gia" }, HT = { congkhai: "cong_khai", giatoc: "gia_toc", daigiadinh: "dai_gia_dinh", giadinhnho: "gia_dinh_nho", riengtu: "rieng_tu" };
  var HTV = { tot: "tot", cantusua: "can_tu_sua", xuongcap: "xuong_cap" }, TT = { dangovochong: "dang_o", damatmotnguoi: "da_mat", dalyhon: "ly_hon" }, LOAI = { lang: "khu_lang_mo", mo: "mo", tuduong: "tu_duong", nhathoho: "nha_tho_to", nhatho: "nha_tho", nhatotodinh: "nha_tho_to", nhatoto: "nha_tho_to", nharieng: "nha_cu", nhacu: "nha_cu", chua: "chua_dinh", dinh: "chua_dinh", chuadinh: "chua_dinh", khac: "khac" };
  /** Chuyển các sheet của bảng nhập liệu thành {persons, spouses, sites, warnings} cùng dạng với CSV/JSON */
  function toImport(sh) {
    var warn = [], persons = [], spouses = [], sites = [], seen = {};
    var rows = sh["Người"] || sh["Nguoi"] || []; if (!rows.length) throw new Error("thieu_sheet_nguoi");
    var m = headMap(rows, PCOL); if (m.ma === undefined || m.ten === undefined) throw new Error("thieu_cot_ma_ten");
    var g = function (r, k) { return m[k] === undefined ? "" : (r[m[k]] || ""); };
    for (var i = 1; i < rows.length; i++) {
      var r = rows[i] || [], ln = i + 1, ten = g(r, "ten"); if (!ten || /^ví dụ/i.test(g(r, "tieu_su"))) continue;
      var code = g(r, "ma"); if (!code) { warn.push("Dòng " + ln + ": thiếu Mã, bỏ qua"); continue; } if (seen[code]) { warn.push("Dòng " + ln + ": trùng Mã " + code + ", bỏ qua"); continue; } seen[code] = 1;
      var gt = GT[norm(g(r, "gt"))] || ""; if (!gt) warn.push(ten + " (" + code + "): chưa có Giới tính");
      var d = function (a, b, c, nm) { var y = num(g(r, a), "Năm " + nm, ln, warn, 1000, 2100), mo = num(g(r, b), "Tháng " + nm, ln, warn, 1, 12), dd = num(g(r, c), "Ngày " + nm, ln, warn, 1, 31); if (!y && !mo && !dd) return null; var o = {}; if (y) o.nam = y; if (mo) o.thang = mo; if (dd) o.ngay = dd; return o; };
      var sinh = d("sn", "st", "sd", "sinh"), mat = d("mn", "mt", "md", "mất"), dead = norm(g(r, "tt")) === "damat" || (!!mat && mat.nam > 0);
      var hien = HT[norm(g(r, "hien"))] || "rieng_tu";
      if (!dead && hien === "cong_khai") warn.push(ten + " (" + code + "): còn sống mà để Công khai — bản xuất công khai sẽ chỉ hiện thông tin cơ bản");
      persons.push({ schema: 2, id: code, ma: code, ho: g(r, "ho"), ten_dem: g(r, "ten_dem"), ten: ten, ten_thuong_goi: g(r, "ten_thuong_goi"), ten_huy: "", ten_thuy: "", ten_han_nom: "", dao_hieu: "", gioi_tinh: gt, sinh: sinh, con_song: !dead, mat: dead ? mat : null,
        gio_ngay_am: num(g(r, "gd"), "Giỗ ngày âm", ln, warn, 1, 30), gio_thang_am: num(g(r, "gt_am"), "Giỗ tháng âm", ln, warn, 1, 12), gio_nhuan: /^x/i.test(g(r, "gnh")),
        the_thu: num(g(r, "the_thu"), "Đời", ln, warn, 1, 60), thu_tu_con: num(g(r, "thu_tu_con"), "Thứ tự con", ln, warn, 1, 60), chi: "", cha_id: g(r, "cha") || null, me_id: g(r, "me") || null, me_ten: "",
        vai: VAI[norm(g(r, "vai"))] || "", nghe: g(r, "nghe"), noi_sinh: g(r, "noi_sinh"), noi_an_tang: g(r, "noi_an_tang"), tieu_su: g(r, "tieu_su"), anh_dai_dien: "", nguon: "Nhập từ Excel", muc_chac_chan: "chua_chac", muc_hien_thi: hien, da_dong_y_tre_em: false, da_an: false, chung_cu: null });
    }
    var rs = sh["Vợ chồng"] || sh["Vo chong"];
    if (rs && rs.length) {
      var ms = headMap(rs, SCOL), gs = function (r, k) { return ms[k] === undefined ? "" : (r[ms[k]] || ""); };
      for (var j = 1; j < rs.length; j++) {
        var q = rs[j] || [], a = gs(q, "a"), b = gs(q, "b"), l2 = j + 1; if (!a && !b) continue; if (/^ví dụ/i.test(gs(q, "gc"))) continue;
        if (!a || !b) { warn.push("Vợ chồng dòng " + l2 + ": thiếu mã người"); continue; }
        spouses.push({ id: "x" + a + "_" + b, person_id: a, spouse_person_id: b, ten: "", thu_tu: num(gs(q, "thu"), "Thứ tự", l2, warn, 1, 20) || 1, tinh_trang: TT[norm(gs(q, "tt"))] || "dang_o", ghi_chu: [gs(q, "nk") ? "Kết hôn " + gs(q, "nk") : "", gs(q, "gc")].filter(Boolean).join(" · ") });
      }
    }
    var codesSet = {}; persons.forEach(function (p) { codesSet[p.id] = 1; });
    var ls = sh["Lăng mộ"] || sh["Lang mo"];
    if (ls && ls.length) {
      var hl = headMap(ls, LCOL, { tenkhulang: "ten", loai: "loai", diachi: "dia_chi", vido: "vi_do", kinhdo: "kinh_do", hientrang: "ht", nguoilienhe: "lien_he", ghichu: "duong_di" }), gl = function (r, k) { return hl[k] === undefined ? "" : (r[hl[k]] || ""); };
      for (var k = 1; k < ls.length; k++) {
        var s = ls[k] || [], nm = gl(s, "ten"); if (!nm) continue;
        var o = { id: "x" + nm, ten: nm, loai: LOAI[norm(gl(s, "loai"))] || "khac", dia_chi: gl(s, "dia_chi"), duong_di: gl(s, "duong_di"), lien_he: gl(s, "lien_he"), gioi_thieu: gl(s, "ht") && !HTV[norm(gl(s, "ht"))] ? "Hiện trạng: " + gl(s, "ht") : "", hien_trang: HTV[norm(gl(s, "ht"))] || "chua_ro", nguoi_an_tang: gl(s, "an_tang").split(/[,;\s]+/).filter(function (c) { return c && !!codesSet[c]; }), nguon: "Nhập từ Excel", muc_chac_chan: "chua_chac", muc_hien_thi: "cong_khai" };
        var gm = GP.io.parseGmaps(gl(s, "link")); if (gl(s, "link")) o.map_link = gl(s, "link"); if (gm.ok) { o.vi_do = gm.lat; o.kinh_do = gm.lng; o.map_xn = true; }
        var la = gl(s, "vi_do"), lo = gl(s, "kinh_do"); if (la && lo && isFinite(+la.replace(",", ".")) && isFinite(+lo.replace(",", "."))) { o.vi_do = +la.replace(",", "."); o.kinh_do = +lo.replace(",", "."); }
        var tm = norm(gl(s, "tm")); if (tm) { o.tao_mo = []; if (tm.indexOf("thanh") >= 0) o.tao_mo.push("thanh_minh"); if (tm.indexOf("chap") >= 0) o.tao_mo.push("chap"); }
        if (gl(s, "tm_tuy")) o.tao_mo_tuy = String(gl(s, "tm_tuy")).trim(); if (gl(s, "gio_tv")) o.gio_tham_vieng = gl(s, "gio_tv"); if (gl(s, "nam_xay")) o.nam_xay = gl(s, "nam_xay");
        sites.push(o);
      }
    }
    var ids = {}; persons.forEach(function (p) { ids[p.id] = 1; });
    return { kind: "xlsx", persons: persons, spouses: spouses, sites: sites, warnings: warn, codes: ids };
  }
  // ---------- Xuất .xlsx: cùng cột, cùng tên sheet với bảng nhập liệu → xuất ra rồi nhập lại được ngay ----------
  var crcT = null;
  function crc32(b) { if (!crcT) { crcT = []; for (var n = 0; n < 256; n++) { var c = n; for (var k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcT[n] = c >>> 0; } } var c2 = 0xFFFFFFFF; for (var i = 0; i < b.length; i++) c2 = crcT[(c2 ^ b[i]) & 255] ^ (c2 >>> 8); return (c2 ^ 0xFFFFFFFF) >>> 0; }
  function zipStore(files) {
    var enc = new TextEncoder(), parts = [], cen = [], off = 0;
    function w16(a, v) { a.push(v & 255, (v >> 8) & 255); } function w32(a, v) { a.push(v & 255, (v >>> 8) & 255, (v >>> 16) & 255, (v >>> 24) & 255); }
    files.forEach(function (f) {
      var nm = enc.encode(f[0]), d = enc.encode(f[1]), c = crc32(d), h = [];
      w32(h, 0x04034b50); w16(h, 20); w16(h, 0x0800); w16(h, 0); w16(h, 0); w16(h, 0x21); w32(h, c); w32(h, d.length); w32(h, d.length); w16(h, nm.length); w16(h, 0);
      parts.push(new Uint8Array(h), nm, d);
      var e = []; w32(e, 0x02014b50); w16(e, 20); w16(e, 20); w16(e, 0x0800); w16(e, 0); w16(e, 0); w16(e, 0x21); w32(e, c); w32(e, d.length); w32(e, d.length); w16(e, nm.length); w16(e, 0); w16(e, 0); w16(e, 0); w16(e, 0); w32(e, 0); w32(e, off);
      cen.push(new Uint8Array(e), nm); off += h.length + nm.length + d.length;
    });
    var cs = 0; cen.forEach(function (x) { cs += x.length; }); var z = []; w32(z, 0x06054b50); w16(z, 0); w16(z, 0); w16(z, files.length); w16(z, files.length); w32(z, cs); w32(z, off); w16(z, 0);
    var all = parts.concat(cen, [new Uint8Array(z)]), tot = 0; all.forEach(function (x) { tot += x.length; }); var out = new Uint8Array(tot), o = 0; all.forEach(function (x) { out.set(x, o); o += x.length; }); return out;
  }
  function ex(s) { return String(s).replace(/[&<>]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]; }).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, ""); }
  function colName(i) { var s = ""; i++; while (i > 0) { var m = (i - 1) % 26; s = String.fromCharCode(65 + m) + s; i = Math.floor((i - 1) / 26); } return s; }
  function sheetXml(rows, widths) {
    var o = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews><cols>' + widths.map(function (w, i) { return '<col min="' + (i + 1) + '" max="' + (i + 1) + '" width="' + w + '" customWidth="1"/>'; }).join("") + "</cols><sheetData>";
    rows.forEach(function (r, ri) { o += '<row r="' + (ri + 1) + '">' + r.map(function (v, ci) { if (v === "" || v == null) return ""; var ref = colName(ci) + (ri + 1), st = ri === 0 ? ' s="1"' : ""; return typeof v === "number" ? '<c r="' + ref + '"' + st + "><v>" + v + "</v></c>" : '<c r="' + ref + '" t="inlineStr"' + st + "><is><t xml:space=\"preserve\">" + ex(v) + "</t></is></c>"; }).join("") + "</row>"; });
    return o + "</sheetData></worksheet>";
  }
  var HEAD_P = ["Mã", "Họ", "Tên đệm", "Tên (bắt buộc)", "Tên thường gọi", "Giới tính", "Năm sinh", "Tháng sinh", "Ngày sinh", "Tình trạng", "Năm mất", "Tháng mất", "Ngày mất", "Giỗ ngày âm", "Giỗ tháng âm", "Giỗ nhuận (x)", "Đời thứ", "Thứ tự con", "Mã cha", "Tên cha (tự hiện)", "Mã mẹ", "Tên mẹ (tự hiện)", "Vai trò", "Nghề nghiệp", "Nơi sinh", "Nơi an táng", "Hiển thị", "Ghi chú / tiểu sử"];
  var HEAD_S = ["Mã người 1", "Tên người 1 (tự hiện)", "Mã người 2", "Tên người 2 (tự hiện)", "Thứ tự vợ/chồng (1,2,3…)", "Năm kết hôn", "Tình trạng", "Ghi chú"];
  var HEAD_L = ["Tên khu lăng / mộ / từ đường", "Loại (Lăng / Mộ / Từ đường / Nhà thờ họ / Nhà thờ / Nhà riêng / Chùa / Khác)", "Địa chỉ (xã/phường, huyện, tỉnh)", "Vĩ độ (nếu có)", "Kinh độ (nếu có)", "Mã người an táng (cách nhau dấu phẩy)", "Hiện trạng (tốt / cần tu sửa / xuống cấp)", "Người liên hệ / điện thoại", "Ghi chú, cách đi", "Link Google Maps", "Tảo mộ định kỳ (Thanh minh / Chạp)", "Ngày tảo mộ riêng (ngày/tháng âm, VD 10/3)", "Giờ thăm viếng", "Năm xây"];
  var R_VAI = { ruot: "Ruột", dau_re: "Dâu/Rể", thong_gia: "Thông gia" }, R_HT = { cong_khai: "Công khai", gia_toc: "Gia tộc", dai_gia_dinh: "Đại gia đình", gia_dinh_nho: "Gia đình nhỏ", rieng_tu: "Riêng tư" };
  var R_TT = { dang_o: "Đang ở vợ chồng", da_mat: "Đã mất một người", ly_hon: "Đã ly hôn" }, R_LOAI = { khu_lang_mo: "Lăng", mo: "Mộ", mo_to: "Mộ", tu_duong: "Từ đường", nha_tho_to: "Nhà thờ họ", nha_tho: "Nhà thờ", nha_cu: "Nhà riêng", chua_dinh: "Chùa / Đình", khac: "Khác" };
  /** Dựng tệp .xlsx (Uint8Array) từ danh sách người, vợ chồng, di tích; opts.gen(p) trả đời đã suy ra (nếu có) */
  function build(persons, spouses, sites, opts) {
    opts = opts || {}; var by = {}; persons.forEach(function (p) { by[p.id] = p; });
    var nm = function (id) { var p = by[id]; return p ? [p.ho, p.ten_dem, p.ten].filter(Boolean).join(" ") : ""; };
    var P = [HEAD_P].concat(persons.map(function (p) {
      var sn = p.sinh || {}, m = p.mat || {};
      return [p.id, p.ho || "", p.ten_dem || "", p.ten || "", p.ten_thuong_goi || "", p.gioi_tinh === "nam" ? "Nam" : p.gioi_tinh === "nu" ? "Nữ" : "", sn.nam || "", sn.thang || "", sn.ngay || "", p.con_song === false ? "Đã mất" : "Còn sống", m.nam || "", m.thang || "", m.ngay || "", p.gio_ngay_am || "", p.gio_thang_am || "", p.gio_nhuan ? "x" : "",
        p.the_thu || (opts.gen && opts.gen(p)) || "", p.thu_tu_con || "", by[p.cha_id] ? p.cha_id : "", nm(p.cha_id), by[p.me_id] ? p.me_id : "", nm(p.me_id), R_VAI[p.vai] || "", p.nghe || "", p.noi_sinh || "", p.noi_an_tang || "", R_HT[p.muc_hien_thi] || "Riêng tư", p.tieu_su || ""];
    }));
    var S = [HEAD_S].concat((spouses || []).filter(function (s) { return by[s.person_id] && by[s.spouse_person_id]; }).map(function (s) {
      var g = String(s.ghi_chu || ""), nk = /Kết hôn (\d{4})/.exec(g), rest = g.replace(/Kết hôn \d{4}\s*·?\s*/, "").trim();
      return [s.person_id, nm(s.person_id), s.spouse_person_id, nm(s.spouse_person_id), s.thu_tu || 1, nk ? +nk[1] : "", R_TT[s.tinh_trang] || "Đang ở vợ chồng", rest];
    }));
    var L = [HEAD_L].concat((sites || []).map(function (x) {
      var ht = /^Hiện trạng:\s*(.*)$/.exec(x.gioi_thieu || "");
      var R_HTR = { tot: "tốt", can_tu_sua: "cần tu sửa", xuong_cap: "xuống cấp" };
      return [x.ten || "", R_LOAI[x.loai] || "", x.dia_chi || "", x.vi_do != null ? x.vi_do : "", x.kinh_do != null ? x.kinh_do : "", (x.nguoi_an_tang || []).filter(function (i) { return by[i]; }).join(", "), R_HTR[x.hien_trang] || (ht ? ht[1] : ""), x.lien_he || "", x.duong_di || "", x.map_link || (x.map_xn && typeof x.vi_do === "number" ? "https://www.google.com/maps?q=" + x.vi_do + "," + x.kinh_do : ""), (x.tao_mo || []).map(function (k) { return k === "chap" ? "Chạp" : "Thanh minh"; }).join(", "), x.tao_mo_tuy || "", x.gio_tham_vieng || "", x.nam_xay || ""];
    }));
    var names = ["Người", "Vợ chồng", "Lăng mộ"], bodies = [sheetXml(P, [9, 10, 9, 14, 14, 9, 8, 8, 8, 11, 8, 8, 8, 9, 9, 9, 7, 8, 9, 20, 9, 20, 11, 16, 16, 16, 12, 40]), sheetXml(S, [10, 22, 10, 22, 12, 10, 18, 30]), sheetXml(L, [30, 16, 36, 10, 10, 14, 16, 22, 36, 40, 22, 22, 18, 10])];
    var H = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>', NS = "http://schemas.openxmlformats.org/";
    var files = [["[Content_Types].xml", H + '<Types xmlns="' + NS + 'package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>' + names.map(function (n, i) { return '<Override PartName="/xl/worksheets/sheet' + (i + 1) + '.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'; }).join("") + "</Types>"],
      ["_rels/.rels", H + '<Relationships xmlns="' + NS + 'package/2006/relationships"><Relationship Id="rId1" Type="' + NS + 'officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>'],
      ["xl/workbook.xml", H + '<workbook xmlns="' + NS + 'spreadsheetml/2006/main" xmlns:r="' + NS + 'officeDocument/2006/relationships"><sheets>' + names.map(function (n, i) { return '<sheet name="' + n + '" sheetId="' + (i + 1) + '" r:id="rId' + (i + 1) + '"/>'; }).join("") + "</sheets></workbook>"],
      ["xl/_rels/workbook.xml.rels", H + '<Relationships xmlns="' + NS + 'package/2006/relationships">' + names.map(function (n, i) { return '<Relationship Id="rId' + (i + 1) + '" Type="' + NS + 'officeDocument/2006/relationships/worksheet" Target="worksheets/sheet' + (i + 1) + '.xml"/>'; }).join("") + '<Relationship Id="rId9" Type="' + NS + 'officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
      ["xl/styles.xml", H + '<styleSheet xmlns="' + NS + 'spreadsheetml/2006/main"><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><color rgb="FFFFFFFF"/><name val="Calibri"/></font></fonts><fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF7A1F1F"/></patternFill></fill></fills><borders count="1"><border/></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="2"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1" applyAlignment="1"><alignment wrapText="1" vertical="center"/></xf></cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>']];
    bodies.forEach(function (b, i) { files.push(["xl/worksheets/sheet" + (i + 1) + ".xml", b]); });
    return zipStore(files);
  }
  GP.xlsx = { parse: parse, toImport: toImport, norm: norm, build: build };
})();
