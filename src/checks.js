/* Phát hiện mâu thuẫn (hiến chương điều 3, US-17). Chỉ báo và hỏi, KHÔNG tự sửa.
 * Mỗi quy tắc một hàm; mỗi kết quả: {key, rule, sev: cao|tb|thap, ids, params} */
(function (root) {
  "use strict";
  function by(arr, f) { var m = {}; arr.forEach(function (x) { m[f(x)] = x; }); return m; }
  function yr(d) { return d && d.nam ? d.nam : null; }
  function norm(s) { return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").toLowerCase().replace(/\s+/g, " ").trim(); }
  function fullName(p) { return [p.ho, p.ten_dem, p.ten].filter(Boolean).join(" "); }

  var RULES = {
    vong_cha_me: function (c) {
      var out = [], seen = {};
      c.persons.forEach(function (p) {
        var path = {}, cur = p.id, steps = 0, stack = [p.id];
        // theo đường cha, sau đó đường mẹ (đủ để phát hiện vòng)
        [function (x) { return x.cha_id; }, function (x) { return x.me_id; }].forEach(function (next) {
          var id = p.id, visited = {}; visited[id] = 1;
          for (var i = 0; i < 200; i++) {
            var q = c.byId[id]; var n = q && next(q); if (!n) break;
            if (n === p.id) { var k = "vong|" + p.id; if (!seen[k]) { seen[k] = 1; out.push({ ids: [p.id], params: {} }); } break; }
            if (visited[n]) break; visited[n] = 1; id = n;
          }
        });
      });
      // vòng hỗn hợp cha/mẹ: duyệt DFS
      var color = {};
      function dfs(id, stack) {
        color[id] = 1;
        var q = c.byId[id];
        [q.cha_id, q.me_id].forEach(function (n) {
          if (!n || !c.byId[n]) return;
          if (color[n] === 1) { var k = "vong|" + n; if (!seen[k]) { seen[k] = 1; out.push({ ids: [n, id], params: {} }); } }
          else if (!color[n]) dfs(n, stack);
        });
        color[id] = 2;
      }
      c.persons.forEach(function (p) { if (!color[p.id]) dfs(p.id, []); });
      return out;
    },
    con_truoc_cha: function (c) {
      var out = [];
      c.persons.forEach(function (ch) {
        [["cha_id", "cha"], ["me_id", "me"]].forEach(function (pr) {
          var par = c.byId[ch[pr[0]]]; if (!par) return;
          var a = yr(par.sinh), b = yr(ch.sinh); if (!a || !b) return;
          if (b < a) out.push({ ids: [ch.id, par.id], params: { vaiTro: pr[1], a: a, b: b } });
        });
      });
      return out;
    },
    tuoi_cha_me: function (c) {
      var out = [];
      c.persons.forEach(function (ch) {
        [["cha_id", "cha"], ["me_id", "me"]].forEach(function (pr) {
          var par = c.byId[ch[pr[0]]]; if (!par) return;
          var a = yr(par.sinh), b = yr(ch.sinh); if (!a || !b || b < a) return;
          var d = b - a, lim = pr[1] === "me" ? [12, 55] : [12, 80];
          if (d < lim[0] || d > lim[1]) out.push({ ids: [ch.id, par.id], params: { vaiTro: pr[1], chenh: d } });
        });
      });
      return out;
    },
    mat_truoc_sinh: function (c) {
      return c.persons.filter(function (p) { return yr(p.sinh) && yr(p.mat) && yr(p.mat) < yr(p.sinh); })
        .map(function (p) { return { ids: [p.id], params: { sinh: yr(p.sinh), mat: yr(p.mat) } }; });
    },
    me_cha_mat_truoc_con: function (c) {
      var out = [];
      c.persons.forEach(function (ch) {
        var b = yr(ch.sinh); if (!b) return;
        var me = c.byId[ch.me_id], cha = c.byId[ch.cha_id];
        if (me && yr(me.mat) && yr(me.mat) < b) out.push({ ids: [ch.id, me.id], params: { vaiTro: "me", mat: yr(me.mat), sinh: b } });
        if (cha && yr(cha.mat) && yr(cha.mat) < b - 1) out.push({ ids: [ch.id, cha.id], params: { vaiTro: "cha", mat: yr(cha.mat), sinh: b } });
      });
      return out;
    },
    cha_nhieu_vo_thieu_me: function (c) {
      var out = [], cnt = {};
      c.spouses.forEach(function (s) { cnt[s.person_id] = (cnt[s.person_id] || 0) + 1; });
      c.persons.forEach(function (ch) {
        if (ch.cha_id && !ch.me_id && !ch.me_ten && (cnt[ch.cha_id] || 0) >= 2) out.push({ ids: [ch.id, ch.cha_id], params: { soVo: cnt[ch.cha_id] } });
      });
      return out;
    },
    thieu_ngay_gio: function (c) {
      return c.persons.filter(function (p) { return p.con_song === false && !(p.gio_ngay_am && p.gio_thang_am) && !(p.mat && p.mat.ngay && p.mat.thang); })
        .map(function (p) { return { ids: [p.id], params: {} }; });
    },
    mat_thieu_nam: function (c) {
      return c.persons.filter(function (p) { return p.con_song === false && !yr(p.mat); }).map(function (p) { return { ids: [p.id], params: {} }; });
    },
    song_co_ngay_mat: function (c) {
      return c.persons.filter(function (p) { return p.con_song !== false && (yr(p.mat) || p.gio_ngay_am); }).map(function (p) { return { ids: [p.id], params: {} }; });
    },
    qua_120: function (c) {
      return c.persons.filter(function (p) {
        var b = yr(p.sinh); if (!b) return false;
        return p.con_song !== false ? c.year - b > 120 : yr(p.mat) && yr(p.mat) - b > 120;
      }).map(function (p) { return { ids: [p.id], params: {} }; });
    },
    nam_tuong_lai: function (c) {
      return c.persons.filter(function (p) { return (yr(p.sinh) && yr(p.sinh) > c.year) || (yr(p.mat) && yr(p.mat) > c.year); }).map(function (p) { return { ids: [p.id], params: {} }; });
    },
    co_the_trung: function (c) {
      var g = {}, out = [];
      c.persons.forEach(function (p) { var k = norm(fullName(p)) + "|" + (yr(p.sinh) || ""); (g[k] = g[k] || []).push(p.id); });
      Object.keys(g).forEach(function (k) { if (g[k].length > 1 && k.split("|")[0]) out.push({ ids: g[k], params: {} }); });
      return out;
    },
    sai_gioi_tinh_cha_me: function (c) {
      var out = [];
      c.persons.forEach(function (p) {
        var f = c.byId[p.cha_id], m = c.byId[p.me_id];
        if (f && f.gioi_tinh === "nu") out.push({ ids: [p.id, f.id], params: { vaiTro: "cha" } });
        if (m && m.gioi_tinh === "nam") out.push({ ids: [p.id, m.id], params: { vaiTro: "me" } });
      });
      return out;
    },
    lech_doi: function (c) {
      var out = [];
      c.persons.forEach(function (p) {
        [p.cha_id, p.me_id].forEach(function (pid) {
          var par = c.byId[pid]; if (!par || !p.the_thu || !par.the_thu) return;
          if (p.the_thu !== par.the_thu + 1) out.push({ ids: [p.id, par.id], params: { doiCon: p.the_thu, doiCha: par.the_thu } });
        });
      });
      return out;
    },
    trung_thu_tu: function (c) {
      var g = {}, out = [];
      c.persons.forEach(function (p) {
        if (p.thu_tu_con == null || !(p.cha_id || p.me_id)) return;
        var k = (p.cha_id || "") + "|" + (p.me_id || "") + "|" + p.thu_tu_con; (g[k] = g[k] || []).push(p.id);
      });
      Object.keys(g).forEach(function (k) { if (g[k].length > 1) out.push({ ids: g[k], params: { thuTu: k.split("|")[2] } }); });
      return out;
    },
    thu_tu_nguoc_tuoi: function (c) { // chỉ HỎI: thứ tự con ghi ngược với năm sinh
      var g = {}, out = [];
      c.persons.forEach(function (p) { if (p.cha_id || p.me_id) { var k = (p.cha_id || "") + "|" + (p.me_id || ""); (g[k] = g[k] || []).push(p); } });
      Object.keys(g).forEach(function (k) {
        var a = g[k].filter(function (p) { return p.thu_tu_con != null && yr(p.sinh); }).sort(function (x, y) { return x.thu_tu_con - y.thu_tu_con; });
        for (var i = 1; i < a.length; i++) if (yr(a[i].sinh) < yr(a[i - 1].sinh)) { out.push({ ids: [a[i - 1].id, a[i].id], params: {} }); break; }
      });
      return out;
    },
    vo_chong_cung_huyet: function (c) {
      var out = [], seen = {};
      function anc(id) { var res = {}; res[id] = 0; var fr = [id]; while (fr.length) { var nx = []; fr.forEach(function (x) { var p = c.byId[x]; [p && p.cha_id, p && p.me_id].forEach(function (a) { if (a && c.byId[a] && res[a] === undefined) { res[a] = res[x] + 1; nx.push(a); } }); }); fr = nx; } return res; }
      c.spouses.forEach(function (s) {
        if (!s.spouse_person_id) return;
        var k = [s.person_id, s.spouse_person_id].sort().join("|"); if (seen[k]) return; seen[k] = 1;
        var A = anc(s.person_id), B = anc(s.spouse_person_id), hit = null;
        Object.keys(A).forEach(function (x) { if (B[x] !== undefined && A[x] <= 4 && B[x] <= 4 && x !== s.person_id && x !== s.spouse_person_id) hit = hit || x; });
        if (hit) out.push({ ids: [s.person_id, s.spouse_person_id, hit], params: {} });
      });
      return out;
    },
    khong_lien_ket: function (c) {
      if (c.persons.length < 2) return [];
      var linked = {};
      c.persons.forEach(function (p) { if (p.cha_id) { linked[p.id] = 1; linked[p.cha_id] = 1; } if (p.me_id) { linked[p.id] = 1; linked[p.me_id] = 1; } });
      c.spouses.forEach(function (s) { linked[s.person_id] = 1; if (s.spouse_person_id) linked[s.spouse_person_id] = 1; });
      return c.persons.filter(function (p) { return !linked[p.id]; }).map(function (p) { return { ids: [p.id], params: {} }; });
    },
    tre_em_chua_dong_y: function (c) {
      return c.persons.filter(function (p) { return root.GP.privacy.isMinor(p, c.year) && !p.da_dong_y_tre_em && p.muc_hien_thi && p.muc_hien_thi !== "rieng_tu" && p.muc_hien_thi !== "gia_dinh_nho"; })
        .map(function (p) { return { ids: [p.id], params: {} }; });
    },
    ngay_am_sai: function (c) {
      return c.persons.filter(function (p) { return (p.gio_ngay_am && (p.gio_ngay_am < 1 || p.gio_ngay_am > 30)) || (p.gio_thang_am && (p.gio_thang_am < 1 || p.gio_thang_am > 12)); })
        .map(function (p) { return { ids: [p.id], params: {} }; });
    }
  };
  var SEV = { vong_cha_me: "cao", con_truoc_cha: "cao", mat_truoc_sinh: "cao", me_cha_mat_truoc_con: "cao", tre_em_chua_dong_y: "cao", sai_gioi_tinh_cha_me: "cao",
    nam_tuong_lai: "cao", cha_nhieu_vo_thieu_me: "tb", thieu_ngay_gio: "tb", song_co_ngay_mat: "tb", qua_120: "tb", co_the_trung: "tb", lech_doi: "tb",
    trung_thu_tu: "tb", thu_tu_nguoc_tuoi: "tb", vo_chong_cung_huyet: "tb", tuoi_cha_me: "tb", ngay_am_sai: "tb", khong_lien_ket: "tb", mat_thieu_nam: "thap" };

  /** Chạy toàn bộ quy tắc. opts.year: năm hiện tại. Không sửa dữ liệu. */
  function run(persons, spouses, opts) {
    opts = opts || {};
    var c = { persons: persons.filter(function (p) { return !p.da_an; }), spouses: spouses || [], year: opts.year || new Date().getFullYear() };
    c.byId = by(persons, function (p) { return p.id; });
    var res = [];
    Object.keys(RULES).forEach(function (rule) {
      RULES[rule](c).forEach(function (r) { res.push({ key: rule + "|" + r.ids.join(","), rule: rule, sev: SEV[rule], ids: r.ids, params: r.params || {} }); });
    });
    var order = { cao: 0, tb: 1, thap: 2 };
    res.sort(function (a, b) { return order[a.sev] - order[b.sev] || a.rule.localeCompare(b.rule); });
    return res;
  }
  root.GP = root.GP || {};
  root.GP.checks = { run: run, RULES: Object.keys(RULES), SEV: SEV, norm: norm, fullName: fullName };
  if (typeof module !== "undefined") module.exports = root.GP.checks;
})(typeof window !== "undefined" ? window : globalThis);
