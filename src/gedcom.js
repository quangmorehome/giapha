/* GEDCOM 5.5.1: xuất và nhập (hiến chương điều 7, FR-07). Mỗi cặp cha mẹ là một gia đình; cha nhiều vợ thì nhiều gia đình.
 * Trường không có trong chuẩn được ghi bằng thẻ riêng bắt đầu bằng "_" (chuẩn cho phép) để xuất rồi nhập lại không mất gì. */
(function (root) {
  "use strict";
  var MON = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"];
  function nfc(s) { return String(s == null ? "" : s).normalize("NFC"); }

  // ---------- Ghi ----------
  function pushLine(out, lvl, tag, val) {
    val = nfc(val).replace(/\r/g, "");
    var parts = val.split("\n");
    emit(out, lvl, tag, parts[0]);
    for (var i = 1; i < parts.length; i++) emit(out, lvl + 1, "CONT", parts[i]);
  }
  function emit(out, lvl, tag, val) {
    var MAX = 180, first = true, rest = val;
    do {
      var chunk = rest.slice(0, MAX); rest = rest.slice(MAX);
      if (rest && /[\ud800-\udbff]$/.test(chunk)) { rest = chunk.slice(-1) + rest; chunk = chunk.slice(0, -1); }
      out.push(first ? (lvl + " " + tag + (chunk !== "" ? " " + chunk : "")) : (lvl + 1) + " CONC " + chunk);
      first = false;
    } while (rest);
  }
  function dateStr(d) {
    if (!d || !d.nam) return "";
    var s;
    if (d.den_nam) return "BET " + d.nam + " AND " + d.den_nam;
    if (d.ngay && d.thang) s = d.ngay + " " + MON[d.thang - 1] + " " + d.nam;
    else if (d.thang) s = MON[d.thang - 1] + " " + d.nam;
    else s = String(d.nam);
    return (d.xap_xi ? "ABT " : "") + s;
  }
  function lunarLine(d) { return d.nam || d.thang || d.ngay ? [d.ngay || 0, d.thang || 0, d.nam || 0].join(" ") + (d.nhuan ? " LEAP" : "") + (d.xap_xi ? " ABT" : "") : ""; }
  function writeEvent(out, tag, d, place) {
    if (!d && !place) return;
    if (d && d.lich === "am") { emit(out, 1, tag, ""); out.length && (out[out.length - 1] = out[out.length - 1].replace(/ $/, "")); emit(out, 2, "_AM", lunarLine(d)); }
    else if (d && d.nam) { emit(out, 1, tag, ""); emit(out, 2, "DATE", dateStr(d)); }
    else emit(out, 1, tag, "Y");
    if (place) pushLine(out, 2, "PLAC", place);
  }

  /** Xuất. data: {persons, spouses}. Trả chuỗi GEDCOM. */
  function exportGedcom(data, opts) {
    opts = opts || {};
    var persons = data.persons || [], spouses = data.spouses || [], byId = {}, idx = {};
    persons.forEach(function (p, i) { byId[p.id] = p; idx[p.id] = i + 1; });
    var out = [];
    out.push("0 HEAD", "1 SOUR GiaPhaSo", "2 NAME Gia pha so - Ho Tong", "2 VERS " + (opts.version || "1.0"), "1 GEDC", "2 VERS 5.5.1", "2 FORM LINEAGE-LINKED", "1 CHAR UTF-8", "1 SUBM @U1@");
    // ---- Gia đình
    var fams = {}, famOrder = [];
    function fam(h, w) { var k = (h || "") + "|" + (w || ""); if (!fams[k]) { fams[k] = { h: h || null, w: w || null, children: [], sp: [] }; famOrder.push(k); } return fams[k]; }
    persons.forEach(function (p) { if (p.cha_id || p.me_id) fam(p.cha_id && byId[p.cha_id] ? p.cha_id : null, p.me_id && byId[p.me_id] ? p.me_id : null).children.push(p.id); });
    spouses.forEach(function (s) {
      var a = byId[s.person_id]; if (!a) return;
      var b = s.spouse_person_id && byId[s.spouse_person_id];
      var h, w;
      if (!b) { h = a.gioi_tinh === "nu" ? null : a.id; w = a.gioi_tinh === "nu" ? a.id : null; }
      else if (a.gioi_tinh === "nu" && b.gioi_tinh !== "nu") { h = b.id; w = a.id; }
      else { h = a.gioi_tinh === "nu" ? b.id : a.id; w = a.gioi_tinh === "nu" ? a.id : b.id; }
      var f = fam(h, b ? w : w), rec = { s: s, aIsHusband: h === a.id };
      f.sp.push(rec);
    });
    var famId = {}; famOrder.forEach(function (k, i) { famId[k] = "@F" + (i + 1) + "@"; });
    var famc = {}, fams2 = {};
    famOrder.forEach(function (k) { var f = fams[k]; f.children.forEach(function (c) { (famc[c] = famc[c] || []).push(famId[k]); }); [f.h, f.w].forEach(function (x) { if (x) (fams2[x] = fams2[x] || []).push(famId[k]); }); });

    // ---- Người
    persons.forEach(function (p) {
      var out0 = out; out0.push("0 @I" + idx[p.id] + "@ INDI");
      pushLine(out, 1, "_UID", p.id);
      var given = [p.ten_dem, p.ten].filter(Boolean).join(" ");
      pushLine(out, 1, "NAME", given + " /" + nfc(p.ho || "") + "/");
      if (given) pushLine(out, 2, "GIVN", given);
      if (p.ho) pushLine(out, 2, "SURN", p.ho);
      if (p.ten_thuong_goi) pushLine(out, 2, "NICK", p.ten_thuong_goi);
      [["_TENHUY", "ten_huy"], ["_TENTHUY", "ten_thuy"], ["_HANNOM", "ten_han_nom"], ["_DAOHIEU", "dao_hieu"], ["_CHI", "chi"], ["_METEN", "me_ten"], ["_NGUON", "nguon"], ["_CHAC", "muc_chac_chan"], ["_HIENTHI", "muc_hien_thi"]]
        .forEach(function (m) { if (p[m[1]]) pushLine(out, 1, m[0], p[m[1]]); });
      if (p.gioi_tinh) pushLine(out, 1, "SEX", p.gioi_tinh === "nam" ? "M" : "F");
      if (p.the_thu != null) pushLine(out, 1, "_DOI", p.the_thu);
      if (p.thu_tu_con != null) pushLine(out, 1, "_THUTUCON", p.thu_tu_con);
      writeEvent(out, "BIRT", p.sinh, p.noi_sinh);
      if (p.con_song === false) {
        writeEvent(out, "DEAT", p.mat, null);
        if (p.gio_ngay_am || p.gio_thang_am) pushLine(out, 1, "_GIO", (p.gio_ngay_am || 0) + " " + (p.gio_thang_am || 0) + (p.gio_nhuan ? " LEAP" : ""));
      } else pushLine(out, 1, "_SONG", "Y");
      if (p.noi_an_tang) { emit(out, 1, "BURI", ""); out[out.length - 1] = out[out.length - 1].replace(/ $/, ""); pushLine(out, 2, "PLAC", p.noi_an_tang); }
      if (p.nghe) pushLine(out, 1, "OCCU", p.nghe);
      if (p.tieu_su) pushLine(out, 1, "NOTE", p.tieu_su);
      if (p.anh_dai_dien) pushLine(out, 1, "_ANH", p.anh_dai_dien);
      if (p.da_dong_y_tre_em) pushLine(out, 1, "_DONGY", "Y");
      if (p.da_an) pushLine(out, 1, "_AN", "Y");
      if (p.chung_cu) pushLine(out, 1, "_CHUNGCU", JSON.stringify(p.chung_cu));
      if (p.tao_boi) pushLine(out, 1, "_TAOBOI", p.tao_boi);
      if (p.tao_luc) pushLine(out, 1, "_TAOLUC", p.tao_luc);
      (famc[p.id] || []).forEach(function (f) { pushLine(out, 1, "FAMC", f); });
      (fams2[p.id] || []).forEach(function (f) { pushLine(out, 1, "FAMS", f); });
    });
    // ---- Gia đình
    famOrder.forEach(function (k) {
      var f = fams[k]; out.push("0 " + famId[k] + " FAM");
      if (f.h) pushLine(out, 1, "HUSB", "@I" + idx[f.h] + "@");
      if (f.w) pushLine(out, 1, "WIFE", "@I" + idx[f.w] + "@");
      f.children.forEach(function (c) { pushLine(out, 1, "CHIL", "@I" + idx[c] + "@"); });
      f.sp.forEach(function (r) {
        var s = r.s, side = r.aIsHusband ? "H" : "W";
        pushLine(out, 1, "_VC" + side, JSON.stringify({ id: s.id, thu_tu: s.thu_tu, tinh_trang: s.tinh_trang || "", ten: s.ten || "", ghi_chu: s.ghi_chu || "" }));
        if (s.tinh_trang === "ly_hon") { emit(out, 1, "DIV", "Y"); }
      });
      if (f.sp.length) emit(out, 1, "MARR", "Y");
    });
    out.push("0 @U1@ SUBM", "1 NAME " + nfc(opts.tacGia || "Kent"), "0 TRLR");
    return out.join("\r\n") + "\r\n";
  }

  // ---------- Đọc ----------
  function parseDate(s) {
    s = nfc(s).trim().toUpperCase(); var d = { nam: null };
    var m;
    if ((m = /^BET\s+(\d{3,4})\s+AND\s+(\d{3,4})$/.exec(s))) return { nam: +m[1], den_nam: +m[2] };
    if (/^(ABT|EST|CAL)\s+/.test(s)) { d.xap_xi = true; s = s.replace(/^(ABT|EST|CAL)\s+/, ""); }
    s = s.replace(/^(AFT|BEF)\s+/, function () { d.xap_xi = true; return ""; });
    if ((m = /^(\d{1,2})\s+([A-Z]{3})\s+(\d{3,4})$/.exec(s))) { d.ngay = +m[1]; d.thang = MON.indexOf(m[2]) + 1; d.nam = +m[3]; }
    else if ((m = /^([A-Z]{3})\s+(\d{3,4})$/.exec(s))) { d.thang = MON.indexOf(m[1]) + 1; d.nam = +m[2]; }
    else if ((m = /^(\d{3,4})$/.exec(s))) d.nam = +m[1];
    else return null;
    if (d.thang === 0) delete d.thang;
    return d;
  }
  function parseLunar(s) {
    var m = /^(\d+)\s+(\d+)\s+(\d+)(.*)$/.exec(s.trim()); if (!m) return null;
    var d = { lich: "am" }; if (+m[1]) d.ngay = +m[1]; if (+m[2]) d.thang = +m[2]; if (+m[3]) d.nam = +m[3];
    if (/LEAP/.test(m[4])) d.nhuan = true; if (/ABT/.test(m[4])) d.xap_xi = true; return d;
  }
  function parseTree(text) {
    var lines = nfc(text).replace(/^﻿/, "").split(/\r\n|\n|\r/), root = { kids: [] }, stack = [{ lvl: -1, node: root }], last = null;
    lines.forEach(function (ln) {
      if (!ln.trim()) return;
      var m = /^(\d+)\s+(@[^@]+@\s+)?(\S+)(?: (.*))?$/.exec(ln); if (!m) return;
      var lvl = +m[1], ptr = m[2] ? m[2].trim() : null, tag = m[3], val = m[4] == null ? "" : m[4];
      if (tag === "CONC" || tag === "CONT") {
        if (last) last.val += (tag === "CONT" ? "\n" : "") + val; return;
      }
      var node = { tag: tag, val: val, ptr: ptr, kids: [] };
      while (stack[stack.length - 1].lvl >= lvl) stack.pop();
      stack[stack.length - 1].node.kids.push(node); stack.push({ lvl: lvl, node: node }); last = node;
    });
    return root.kids;
  }
  function kid(n, tag) { for (var i = 0; i < n.kids.length; i++) if (n.kids[i].tag === tag) return n.kids[i]; return null; }
  function val(n, tag) { var k = kid(n, tag); return k ? k.val : null; }
  function readEvent(n) {
    if (!n) return { d: null, place: null };
    var am = kid(n, "_AM"), dt = kid(n, "DATE");
    return { d: am ? parseLunar(am.val) : dt ? parseDate(dt.val) : null, place: val(n, "PLAC"), has: true };
  }
  /** Nhập. Trả {persons, spouses, warnings:[]}; id lấy từ _UID nếu có, nếu không tạo "g<n>" */
  function importGedcom(text) {
    var recs = parseTree(text), warnings = [], persons = [], spouses = [], map = {}, famsRecs = [];
    var gen = 0;
    recs.forEach(function (r) {
      if (r.tag === "INDI") {
        var uid = val(r, "_UID") || "g" + (++gen);
        var p = { id: uid, schema: 2 }; map[r.ptr] = p;
        var nm = kid(r, "NAME"), given = nm ? val(nm, "GIVN") : null, surn = nm ? val(nm, "SURN") : null;
        if (nm && (given == null || surn == null)) {
          var mm = /^(.*?)\s*\/(.*?)\/\s*(.*)$/.exec(nm.val);
          if (mm) { given = given == null ? (mm[1] + " " + mm[3]).trim() : given; surn = surn == null ? mm[2].trim() : surn; }
          else { var w = nm.val.trim().split(/\s+/); if (surn == null) surn = w.shift() || ""; if (given == null) given = w.join(" "); } // cách ghi Việt Nam: họ đứng đầu
        }
        p.ho = nfc(surn || ""); var gw = (given || "").split(/\s+/).filter(Boolean);
        p.ten = gw.length ? gw[gw.length - 1] : ""; p.ten_dem = gw.slice(0, -1).join(" ");
        if (nm && val(nm, "NICK")) p.ten_thuong_goi = val(nm, "NICK");
        [["_TENHUY", "ten_huy"], ["_TENTHUY", "ten_thuy"], ["_HANNOM", "ten_han_nom"], ["_DAOHIEU", "dao_hieu"], ["_CHI", "chi"], ["_METEN", "me_ten"], ["_NGUON", "nguon"], ["_CHAC", "muc_chac_chan"], ["_HIENTHI", "muc_hien_thi"], ["OCCU", "nghe"], ["NOTE", "tieu_su"], ["_ANH", "anh_dai_dien"], ["_TAOBOI", "tao_boi"], ["_TAOLUC", "tao_luc"]]
          .forEach(function (m) { var v = val(r, m[0]); if (v != null && v !== "") p[m[1]] = v; });
        var sex = val(r, "SEX"); p.gioi_tinh = sex === "M" ? "nam" : sex === "F" ? "nu" : null;
        if (val(r, "_DOI") != null) p.the_thu = +val(r, "_DOI");
        if (val(r, "_THUTUCON") != null) p.thu_tu_con = +val(r, "_THUTUCON");
        var b = readEvent(kid(r, "BIRT")); if (b.d) p.sinh = b.d; if (b.place) p.noi_sinh = b.place;
        var dn = kid(r, "DEAT"); p.con_song = !dn;
        if (dn) { var de = readEvent(dn); if (de.d) p.mat = de.d; }
        var gio = val(r, "_GIO"); if (gio) { var gm = /^(\d+)\s+(\d+)(.*)$/.exec(gio); if (gm) { if (+gm[1]) p.gio_ngay_am = +gm[1]; if (+gm[2]) p.gio_thang_am = +gm[2]; if (/LEAP/.test(gm[3])) p.gio_nhuan = true; } }
        var bu = kid(r, "BURI"); if (bu && val(bu, "PLAC")) p.noi_an_tang = val(bu, "PLAC");
        if (val(r, "_DONGY")) p.da_dong_y_tre_em = true; p.da_an = !!val(r, "_AN");
        var cc = val(r, "_CHUNGCU"); if (cc) { try { p.chung_cu = JSON.parse(cc); } catch (e) { warnings.push("chung_cu_loi:" + uid); } }
        p.cha_id = null; p.me_id = null; persons.push(p);
      } else if (r.tag === "FAM") famsRecs.push(r);
    });
    famsRecs.forEach(function (f) {
      var h = f.kids.filter(function (k) { return k.tag === "HUSB"; })[0], w = f.kids.filter(function (k) { return k.tag === "WIFE"; })[0];
      var H = h && map[h.val], W = w && map[w.val];
      f.kids.filter(function (k) { return k.tag === "CHIL"; }).forEach(function (c) {
        var ch = map[c.val]; if (!ch) { warnings.push("con_khong_co:" + c.val); return; }
        if (H) ch.cha_id = H.id; if (W) ch.me_id = W.id;
      });
      [["_VCH", H, W], ["_VCW", W, H]].forEach(function (x) {
        f.kids.filter(function (k) { return k.tag === x[0]; }).forEach(function (k) {
          var o; try { o = JSON.parse(k.val); } catch (e) { warnings.push("vc_loi"); return; }
          if (!x[1]) return;
          spouses.push({ id: o.id, person_id: x[1].id, spouse_person_id: x[2] ? x[2].id : null, ten: o.ten || "", thu_tu: o.thu_tu, tinh_trang: o.tinh_trang || "", ghi_chu: o.ghi_chu || "" });
        });
      });
      // GEDCOM của chương trình khác: không có _VC, nhưng có HUSB và WIFE
      if (!f.kids.some(function (k) { return k.tag === "_VCH" || k.tag === "_VCW"; }) && H && W) {
        [[H, W], [W, H]].forEach(function (pr) {
          var n = spouses.filter(function (s) { return s.person_id === pr[0].id; }).length + 1;
          spouses.push({ id: "s" + (spouses.length + 1) + "_" + pr[0].id, person_id: pr[0].id, spouse_person_id: pr[1].id, ten: "", thu_tu: n, tinh_trang: kid(f, "DIV") ? "ly_hon" : "dang_o", ghi_chu: "" });
        });
      }
    });
    return { persons: persons, spouses: spouses, warnings: warnings };
  }
  root.GP = root.GP || {};
  root.GP.gedcom = { exportGedcom: exportGedcom, importGedcom: importGedcom, parseDate: parseDate };
  if (typeof module !== "undefined") module.exports = root.GP.gedcom;
})(typeof window !== "undefined" ? window : globalThis);
