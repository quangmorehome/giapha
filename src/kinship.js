/* Danh xưng họ hàng theo cách gọi của người Việt (hiến chương: thứ bậc theo nhánh, không theo tuổi; D-07).
 * Dữ liệu vào: persons (cha_id, me_id, gioi_tinh, thu_tu_con), spouses (person_id, spouse_person_id).
 * Không đoán: thiếu thứ tự con thì trả về dạng gộp (Anh/Chị/Em) kèm gợi ý cách bổ sung. */
(function (root) {
  "use strict";
  var UP = ["", "Cha/Mẹ", "Ông/Bà", "Cụ", "Kỵ", "Sơ", "Tiệm", "Tiểu", "Di", "Diễn"];
  var DOWN = ["", "Con", "Cháu", "Chắt", "Chút", "Chít"]; // theo đặc tả FR-05; vùng khác có thể gọi chít/chút ngược lại

  function create(persons, spouses, opts) {
    opts = opts || {};
    var quyUoc = opts.quyUoc || "bac"; // chị gái của mẹ: "bac" gọi Bác (Bắc), "di" gọi Dì (Trung, Nam)
    var byId = {};
    persons.forEach(function (p) { byId[p.id] = p; });

    /** Mọi tổ tiên của x (kể cả chính x ở độ sâu 0): Map id -> {depth, path:[x,...,id]} (đường ngắn nhất, ưu tiên cha) */
    function ancestors(id) {
      var res = {}; res[id] = { depth: 0, path: [id] };
      var frontier = [id];
      while (frontier.length) {
        var next = [];
        frontier.forEach(function (cur) {
          var p = byId[cur]; if (!p) return;
          [p.cha_id, p.me_id].forEach(function (par) { // cha trước, mẹ sau: đường qua cha được ưu tiên khi hòa
            if (!par || !byId[par] || res[par]) return;
            res[par] = { depth: res[cur].depth + 1, path: res[cur].path.concat(par) };
            next.push(par);
          });
        });
        frontier = next;
      }
      return res;
    }
    function isMale(p) { return p && p.gioi_tinh === "nam"; }
    function isFemale(p) { return p && p.gioi_tinh === "nu"; }
    function samePair(x, y) { return (x.cha_id || null) === (y.cha_id || null) && (x.me_id || null) === (y.me_id || null); }
    /** x lớn hơn y (trả -1), nhỏ hơn (1), chưa rõ (null). Chỉ dùng thứ tự con ghi sẵn; không dùng tuổi. */
    function elder(x, y) {
      if (x.thu_tu_con != null && y.thu_tu_con != null && x.thu_tu_con !== y.thu_tu_con) return x.thu_tu_con < y.thu_tu_con ? -1 : 1;
      return null;
    }
    function ladder(arr, n, fallback) { return arr[n] || (fallback + " đời " + n); }

    /** A gọi B là gì. Trả {term, notes:[], hints:[]} */
    function call(A, B, lca, pa, pb) {
      var a = pa.length - 1, b = pb.length - 1, notes = [], hints = [], term;
      var gB = isMale(B) ? "m" : isFemale(B) ? "f" : "?";
      // ---- Trực hệ: B là tổ tiên của A
      if (b === 0) {
        var side = pa[1] && isMale(byId[pa[1]]) ? "noi" : "ngoai";
        if (a === 1) term = gB === "m" ? "Cha" : gB === "f" ? "Mẹ" : "Cha/Mẹ";
        else if (a === 2) { var base = gB === "m" ? "Ông" : gB === "f" ? "Bà" : "Ông/Bà"; term = base + (side === "noi" ? " nội" : " ngoại"); }
        else {
          var nm = ladder(UP, a, "Tổ");
          term = a >= 10 ? nm : nm + (gB === "m" ? " ông" : gB === "f" ? " bà" : "");
          notes.push(side === "noi" ? "note.ben_noi" : "note.ben_ngoai");
        }
        if (a === 1) notes.push("note.cha_vung");
        return { term: term, notes: notes, hints: hints };
      }
      // ---- Trực hệ: B là con cháu của A
      if (a === 0) {
        var x = byId[pb[b - 1]]; // người con trực tiếp của A trên đường tới B
        if (b === 1) term = gB === "m" ? "Con trai" : gB === "f" ? "Con gái" : "Con";
        else if (b === 2) term = isMale(x) ? "Cháu nội" : "Cháu ngoại";
        else { term = ladder(DOWN, b, "Cháu"); notes.push(isMale(x) ? "note.ben_noi" : "note.ben_ngoai"); if (b >= 4) notes.push("note.chut_chit"); }
        return { term: term, notes: notes, hints: hints };
      }
      // ---- Bàng hệ: so thứ bậc hai nhánh con của tổ chung
      var Ap = byId[pa[a - 1]], Bp = byId[pb[b - 1]];
      var order = elder(Bp, Ap); // -1: nhánh của B lớn hơn nhánh của A
      var unknown = order === null;
      if (unknown) hints.push({ code: "thieu_thu_tu", ids: [Ap.id, Bp.id] });
      var elderB = order === -1;
      if (a === b) {
        var ho = a >= 2;
        if (unknown) term = (gB === "m" ? "Anh/Em" : gB === "f" ? "Chị/Em" : "Anh/Chị/Em");
        else if (elderB) term = gB === "m" ? "Anh" : gB === "f" ? "Chị" : "Anh/Chị";
        else term = gB === "m" ? "Em trai" : gB === "f" ? "Em gái" : "Em";
        if (ho) { term = term.replace(/ (trai|gái)$/, "") + " họ"; if (a >= 3) notes.push("note.ho_xa"); }
        else if (!samePair(A, B)) {
          var sc = A.cha_id && A.cha_id === B.cha_id, sm = A.me_id && A.me_id === B.me_id;
          if (sc && !sm) notes.push("note.cung_cha_khac_me"); else if (sm && !sc) notes.push("note.cung_me_khac_cha");
        }
        if (ho || !unknown) notes.push("note.thu_bac_nhanh");
        return { term: term, notes: notes, hints: hints, unknown: unknown };
      }
      if (a < b) { // B thuộc thế hệ dưới
        var n = b - a;
        term = ladder(["", "Cháu", "Chắt", "Chút", "Chít"], n, "Cháu") + (a >= 2 ? " họ" : "");
        if (n >= 3) notes.push("note.chut_chit");
        return { term: term, notes: notes, hints: [] }; // thế hệ dưới: không cần thứ tự
      }
      // a > b: B thuộc thế hệ trên của A (bác, chú, cô, cậu, dì...)
      var d = a - b, P = byId[pa[d]]; // P: tổ tiên của A cùng thế hệ với B
      var pm = isMale(P), base2, ho2 = b >= 2;
      if (pm) { // bên cha (nội)
        if (unknown) base2 = gB === "m" ? "Bác/Chú" : "Bác/Cô";
        else if (elderB) base2 = "Bác";
        else base2 = gB === "m" ? "Chú" : "Cô";
      } else { // bên mẹ (ngoại)
        if (gB === "m") base2 = unknown ? "Cậu" : "Cậu";
        else if (unknown) base2 = "Dì/Bác";
        else if (elderB) base2 = quyUoc === "di" ? "Dì" : "Bác";
        else base2 = "Dì";
        if (gB === "f" && elderB) notes.push("note.bac_di_vung");
      }
      if (d === 1) term = base2;
      else if (d === 2) term = (gB === "m" ? "Ông " : gB === "f" ? "Bà " : "Ông/Bà ") + base2.toLowerCase();
      else { term = ladder(UP, d, "Tổ") + (gB === "m" ? " ông" : gB === "f" ? " bà" : ""); notes.push("note.ho_hang_bac"); }
      if (ho2) term += " họ";
      return { term: term, notes: notes, hints: hints, unknown: unknown };
    }

    var anc = {};
    function ancC(id) { return anc[id] || (anc[id] = ancestors(id)); }
    /** Quan hệ huyết thống giữa hai người (null nếu không có tổ chung) */
    function blood(idA, idB) {
      var A = byId[idA], B = byId[idB]; if (!A || !B || idA === idB) return null;
      var AA = ancC(idA), BB = ancC(idB), best = null;
      Object.keys(AA).forEach(function (id) {
        if (!BB[id]) return;
        var sum = AA[id].depth + BB[id].depth;
        if (!best || sum < best.sum) best = { id: id, sum: sum };
      });
      if (!best) return null;
      var pa = AA[best.id].path, pb = BB[best.id].path;
      return { kind: "blood", ok: true, lca: best.id, up: pa.length - 1, down: pb.length - 1, ab: call(A, B, best.id, pa, pb), ba: call(B, A, best.id, pb, pa) };
    }
    function spousesOf(id) {
      var out = [];
      (spouses || []).forEach(function (s) { if (s.person_id === id && byId[s.spouse_person_id]) out.push(s.spouse_person_id); else if (s.spouse_person_id === id && byId[s.person_id]) out.push(s.person_id); });
      return out.filter(function (x, i) { return out.indexOf(x) === i; });
    }
    var bloodCache = {};
    function bloodAll(id) {
      if (bloodCache[id]) return bloodCache[id];
      return (bloodCache[id] = persons.filter(function (p) { return p.id !== id && blood(id, p.id); }).map(function (p) { return p.id; }));
    }
    function sw(S) { return isMale(S) ? "chồng" : isFemale(S) ? "vợ" : "vợ/chồng"; }
    var SIB = ["Anh", "Chị", "Em", "Em trai", "Em gái", "Anh/Em", "Chị/Em", "Anh/Chị/Em"];
    /** Vợ/chồng của người X mà A gọi là tX: tX là cách A gọi X */
    function spouseOfTerm(tX, X, to) {
      var ho = / họ$/.test(tX), t0 = tX.replace(/ họ$/, ""), m = isMale(X), fT = isFemale(to), pre = "", inner = t0, res, hs = ho ? " họ" : "";
      if (SIB.indexOf(t0) >= 0) {
        var elderX = /^(Anh|Chị)$/.test(t0), youngX = /^Em/.test(t0);
        if (m) res = elderX ? "Chị dâu" : youngX ? "Em dâu" : "Chị/Em dâu"; else res = elderX ? "Anh rể" : youngX ? "Em rể" : "Anh/Em rể";
        return res + hs;
      }
      if (t0 === "Cha") return isFemale(to) || !isMale(to) ? "Mẹ kế (dì ghẻ)" : "Cha kế";
      if (t0 === "Mẹ") return isMale(to) || !isFemale(to) ? "Cha dượng (cha kế)" : "Mẹ kế";
      if (/^Con( trai| gái)?$/.test(t0)) return m ? "Con dâu" : "Con rể";
      if (/^(Cháu|Chắt|Chút|Chít)( nội| ngoại)?$/.test(t0)) return t0.split(" ")[0] + (m ? " dâu" : " rể") + hs;
      var mm = /^(Ông\/Bà |Ông |Bà )?(.+)$/.exec(t0); if (mm && mm[1]) { pre = m ? "Bà " : "Ông "; inner = mm[2]; }
      var map = { "Bác": m ? "Bác gái" : "Bác trai", "Chú": "Thím", "Cậu": "Mợ", "Cô": "Dượng", "Dì": "Dượng", "Bác/Chú": m ? "Bác gái/Thím" : "Bác trai/Dượng", "Bác/Cô": "Bác trai/Dượng", "Dì/Bác": "Dượng/Bác trai" };
      if (map[inner]) { var w = map[inner]; return pre ? pre + w.charAt(0).toLowerCase() + w.slice(1) + hs : w + hs; }
      return (fT ? "Vợ" : isMale(to) ? "Chồng" : "Vợ/chồng") + " của " + tX.toLowerCase();
    }
    /** A gọi B là gì khi hai người có quan hệ qua hôn nhân (không cùng huyết thống). Trả null nếu không tìm thấy. */
    function affinal(idA, idB) {
      var A = byId[idA], B = byId[idB], i, j, S, X, Y, b, r;
      var sA = spousesOf(idA);
      // 1) B là họ hàng ruột của vợ/chồng A
      for (i = 0; i < sA.length; i++) {
        S = byId[sA[i]]; b = blood(S.id, idB); if (!b) continue;
        var t0 = b.ab.term, ho = / họ$/.test(t0), s0 = t0.replace(/ họ$/, ""), w = sw(S), term, notes = ["note.gt_theo_" + (isMale(S) ? "chong" : "vo")];
        if (s0 === "Cha" || s0 === "Mẹ" || SIB.indexOf(s0) >= 0 && !ho) term = t0 + " " + w;
        else if (/^Con( trai| gái)?$/.test(s0)) term = "Con riêng của " + w;
        else term = t0 + " bên " + w;
        return { term: term, notes: notes, hints: b.ab.hints || [], via: [S.id] };
      }
      // 2) B là vợ/chồng của một họ hàng ruột của A
      var bl = bloodAll(idA);
      for (i = 0; i < bl.length; i++) {
        X = byId[bl[i]]; if (spousesOf(X.id).indexOf(idB) < 0) continue; r = blood(idA, X.id);
        return { term: spouseOfTerm(r.ab.term, X, B), notes: ["note.gt_qua_ho_hang"], hints: r.ab.hints || [], via: [X.id] };
      }
      // 3) Anh em đồng hao / chị em dâu: B là vợ/chồng của anh chị em ruột của vợ/chồng A
      for (i = 0; i < sA.length; i++) {
        S = byId[sA[i]]; var bs = bloodAll(S.id);
        for (j = 0; j < bs.length; j++) {
          X = byId[bs[j]]; if (spousesOf(X.id).indexOf(idB) < 0) continue; r = blood(S.id, X.id);
          if (r.up === 1 && r.down === 1) {
            if (isMale(A) && isMale(B) && isFemale(S) && isFemale(X)) return { term: "Anh em đồng hao (cột chèo)", notes: ["note.dong_hao"], hints: [], via: [S.id, X.id] };
            if (isFemale(A) && isFemale(B) && isMale(S) && isMale(X)) return { term: "Chị em dâu", notes: ["note.chi_em_dau"], hints: [], via: [S.id, X.id] };
          }
          return { term: spouseOfTerm(r.ab.term, X, B) + " bên " + sw(S), notes: ["note.thong_gia"], hints: r.ab.hints || [], via: [S.id, X.id] };
        }
      }
      // 4) Thông gia: B là họ hàng ruột của người đã kết hôn với họ hàng ruột của A (cha mẹ hai bên sui gia…)
      for (i = 0; i < bl.length; i++) {
        X = byId[bl[i]]; var sx = spousesOf(X.id);
        for (j = 0; j < sx.length; j++) {
          Y = byId[sx[j]]; b = blood(Y.id, idB); if (!b || blood(idA, idB)) continue;
          var par = b.ab.term === "Cha" || b.ab.term === "Mẹ";
          var rx = blood(idA, X.id), yT = rx ? spouseOfTerm(rx.ab.term, X, Y) : ""; return { term: par ? (isMale(B) ? "Ông thông gia (ông sui)" : isFemale(B) ? "Bà thông gia (bà sui)" : "Ông/Bà thông gia") : (yT ? b.ab.term + " của " + yT + " (thông gia)" : "Họ hàng thông gia"), notes: ["note.thong_gia"], hints: [], via: [X.id, Y.id] };
        }
      }
      return null;
    }
    // Vùng miền: mặc định (Bắc) giữ nguyên; "trung" đổi sang cách gọi miền Trung
    function reg(term) {
      if (quyUoc !== "trung") return term;
      if (term === "Cha") return "Ba (Bọ)";
      if (term === "Mẹ") return "Mạ (Má, Mự)";
      var w = function (x) { return new RegExp("(^|[^\\p{L}])" + x + "(?![\\p{L}])", "u"); };
      return term.replace(w("Cha"), "$1Ba").replace(w("Mẹ"), "$1Mạ").replace(/^Bà (nội|ngoại)/, "Mệ $1").replace(w("Cô"), "$1O").replace(w("cô"), "$1o");
    }
    function regionRes(x) { if (!x) return x; var r = {}; for (var k in x) r[k] = x[k]; r.term = reg(x.term); if (quyUoc === "trung" && x.term !== r.term) r.notes = (x.notes || []).concat(["note.vung_trung"]); return r; }

    /** Quan hệ hai chiều giữa hai người */
    function relate(idA, idB) {
      var A = byId[idA], B = byId[idB];
      if (!A || !B) return { kind: "none", ok: false };
      if (idA === idB) return { kind: "self", ok: true };
      var isSp = (spouses || []).some(function (s) {
        return (s.person_id === idA && s.spouse_person_id === idB) || (s.person_id === idB && s.spouse_person_id === idA);
      });
      if (isSp) return {
        kind: "spouse", ok: true,
        ab: { term: isMale(B) ? "Chồng" : isFemale(B) ? "Vợ" : "Vợ/Chồng", notes: [], hints: [] },
        ba: { term: isMale(A) ? "Chồng" : isFemale(A) ? "Vợ" : "Vợ/Chồng", notes: [], hints: [] }
      };
      var bl = blood(idA, idB);
      if (!bl) {
        var x = affinal(idA, idB), y = affinal(idB, idA);
        if (!x && !y) return { kind: "none", ok: false, hints: [{ code: "khong_cung_goc", ids: [idA, idB] }] };
        var gen = { term: "Họ hàng thông gia", notes: ["note.thong_gia"], hints: [], via: [] };
        return { kind: "affinal", ok: true, ab: regionRes(x || gen), ba: regionRes(y || gen), via: ((x || y).via || []) };
      }
      bl.ab = regionRes(bl.ab); bl.ba = regionRes(bl.ba);
      return bl;
    }
    return { relate: relate, ancestors: ancestors };
  }
  root.GP = root.GP || {};
  root.GP.kinship = { create: create };
  if (typeof module !== "undefined") module.exports = root.GP.kinship;
})(typeof window !== "undefined" ? window : globalThis);
