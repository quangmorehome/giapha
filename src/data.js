/* DỮ LIỆU MẪU GIẢ. Không có người thật. Tên có chữ "Mẫu" hoặc "Thử" để không nhầm với thật (hiến chương điều 1 và 14).
 * Dùng để thử giao diện; hai chỗ cố ý "sai" (p32, p33) để thử trang Kiểm tra mâu thuẫn. */
(function (root) {
  "use strict";
  var NOW = "2026-11-04T00:00:00+07:00";
  function P(id, ho, dem, ten, gt, s, m, doi, chi, cha, me, tt, x) {
    var w = ten.split(" "); if (w.length > 1) { ten = w.pop(); dem = (dem + " " + w.join(" ")).trim(); } // ten luôn là một từ cuối
    var p = { id: id, schema: 2, ho: ho, ten_dem: dem, ten: ten, ten_thuong_goi: "", ten_huy: "", ten_thuy: "", ten_han_nom: "", dao_hieu: "", gioi_tinh: gt,
      sinh: s ? (typeof s === "number" ? { nam: s } : s) : null, con_song: !m, mat: m ? (typeof m === "number" ? { nam: m } : m) : null,
      gio_ngay_am: null, gio_thang_am: null, gio_nhuan: false, the_thu: doi, thu_tu_con: tt == null ? null : tt, chi: chi || "", cha_id: cha || null, me_id: me || null, me_ten: "",
      nghe: "", noi_sinh: "", noi_an_tang: "", tieu_su: "", anh_dai_dien: "", nguon: "Dữ liệu mẫu giả", muc_chac_chan: "chua_chac",
      muc_hien_thi: m ? "gia_toc" : "gia_dinh_nho", da_dong_y_tre_em: false, da_an: false, tao_boi: "mau", tao_luc: NOW, chung_cu: null };
    if (x) Object.keys(x).forEach(function (k) { p[k] = x[k]; });
    return p;
  }
  var A = "Chi mẫu A", B = "Chi mẫu B", T = "Tống";
  var persons = [
    P("p01", T, "Văn", "Thử Một", "nam", { nam: 1820, xap_xi: true }, { nam: 1890, xap_xi: true }, 1, A, null, null, null, { gio_ngay_am: 12, gio_thang_am: 3, muc_hien_thi: "cong_khai", tieu_su: "Cụ tổ trong dữ liệu mẫu. Nội dung giả để thử giao diện.", ten_huy: "Mẫu húy", ten_han_nom: "宋文試一", dao_hieu: "Mẫu Đạo" }),
    P("p02", "Lê", "Thị", "Mẫu Hai", "nu", { nam: 1825, xap_xi: true }, { nam: 1900, xap_xi: true }, null, A, null, null, null, { gio_ngay_am: 8, gio_thang_am: 7, tieu_su: "Vợ cả của cụ Thử Một (dữ liệu mẫu)." }),
    P("p03", "Trần", "Thị", "Mẫu Ba", "nu", 1835, 1910, null, B, null, null, null, { gio_ngay_am: 19, gio_thang_am: 2, muc_chac_chan: "truyen_mieng", tieu_su: "Vợ hai của cụ Thử Một (dữ liệu mẫu)." }),
    P("p04", T, "Văn", "Mẫu Bốn", "nam", 1848, 1920, 2, A, "p01", "p02", 1, { ten_thuong_goi: "Cả Bốn", gio_ngay_am: 20, gio_thang_am: 10, muc_hien_thi: "cong_khai", tieu_su: "Con trai cả (dữ liệu mẫu)." }),
    P("p05", T, "Thị", "Mẫu Năm", "nu", 1852, 1930, 2, A, "p01", "p02", 2, { muc_hien_thi: "cong_khai", tieu_su: "Con gái (dữ liệu mẫu). Chưa ghi chồng." }),
    P("p06", T, "Văn", "Mẫu Sáu", "nam", 1860, 1935, 2, B, "p01", "p03", 1, { muc_chac_chan: "truyen_mieng", muc_hien_thi: "cong_khai", tieu_su: "Con trai của vợ hai (dữ liệu mẫu). Thứ tự con tính riêng theo mẹ." }),
    P("p07", "Phạm", "Thị", "Mẫu Bảy", "nu", 1852, 1925, null, A, null, null, null, { gio_ngay_am: 5, gio_thang_am: 11 }),
    P("p08", T, "Văn", "Mẫu Tám", "nam", 1875, { nam: 1950, thang: 12, ngay: 2, lich: "am" }, 3, A, "p04", "p07", 1, { gio_ngay_am: 2, gio_thang_am: 12, muc_chac_chan: "da_xac_minh", chung_cu: { sinh: { nguon: "Lời kể mẫu", muc: "chua_chac" }, mat: { nguon: "Bia mộ mẫu", muc: "da_xac_minh" } } }),
    P("p09", T, "Thị", "Mẫu Chín", "nu", 1880, 1960, 3, A, "p04", "p07", 2, {}),
    P("p10", T, "Văn", "Mẫu Mười", "nam", 1885, 1962, 3, A, "p04", "p07", 3, { gio_ngay_am: 30, gio_thang_am: 9, tieu_su: "Ngày giỗ 30: gặp tháng thiếu thì theo quy ước trong Cài đặt." }),
    P("p11", "Hoàng", "Thị", "Mẫu Mười Một", "nu", 1880, 1955, null, A, null, null, null, {}),
    P("p12", "Vũ", "Thị", "Mẫu Mười Hai", "nu", 1890, 1970, null, A, null, null, null, {}),
    P("p13", T, "Văn", "Mẫu Mười Ba", "nam", 1890, 1965, 3, B, "p06", null, 1, { me_ten: "chưa rõ", muc_chac_chan: "truyen_mieng", tieu_su: "Mẹ chưa rõ trong dữ liệu mẫu. Dùng để thử trường hợp thiếu thông tin." }),
    P("p14", T, "Thị", "Mẫu Mười Bốn", "nu", 1895, 1970, 3, B, "p06", null, 2, {}),
    P("p15", T, "Văn", "Mẫu Mười Lăm", "nam", 1905, 1980, 4, A, "p08", "p11", 1, { gio_ngay_am: 30, gio_thang_am: 10 }),
    P("p16", T, "Văn", "Mẫu Mười Sáu", "nam", 1910, 1985, 4, A, "p08", "p11", 2, { tieu_su: "Có hai vợ (dữ liệu mẫu), con của hai vợ ghi mẹ riêng từng người." }),
    P("p17", T, "Thị", "Mẫu Mười Bảy", "nu", 1915, 1990, 4, A, "p08", "p11", 3, {}),
    P("p18", T, "Văn", "Mẫu Mười Tám", "nam", 1920, 2000, 4, A, "p10", "p12", 1, { gio_ngay_am: 1, gio_thang_am: 1 }),
    P("p19", T, "Thị", "Mẫu Mười Chín", "nu", 1925, 2005, 4, A, "p10", "p12", 2, {}),
    P("p20", T, "Văn", "Mẫu Hai Mươi", "nam", 1925, 1995, 4, B, "p13", null, 1, { muc_chac_chan: "truyen_mieng" }),
    P("p21", "Đặng", "Thị", "Mẫu Hai Mốt", "nu", 1910, 1992, null, A, null, null, null, {}),
    P("p22", T, "Văn", "Mẫu Hai Hai", "nam", 1935, 2010, 5, A, "p15", "p21", 1, { gio_ngay_am: 15, gio_thang_am: 6, gio_nhuan: true, tieu_su: "Mất ở tháng nhuận (dữ liệu mẫu): giỗ rơi vào tháng nhuận khi năm có nhuận cùng tháng." }),
    P("p23", T, "Thị", "Mẫu Hai Ba", "nu", { nam: 1940, thang: 5, ngay: 20 }, null, 5, A, "p15", "p21", 2, { muc_hien_thi: "gia_toc", tieu_su: "Người còn sống (mẫu): người ngoài nhánh chỉ thấy tên và quan hệ cơ bản." }),
    P("p24", T, "Văn", "Mẫu Hai Bốn", "nam", 1945, null, 5, A, "p15", "p21", 3, { muc_hien_thi: "rieng_tu", tieu_su: "Hồ sơ riêng tư (mẫu): chỉ Quản trị và Biên tập trong nhánh xem được." }),
    P("p25", "Bùi", "Thị", "Mẫu Hai Lăm", "nu", 1915, 1999, null, A, null, null, null, {}),
    P("p26", T, "Văn", "Mẫu Hai Sáu", "nam", 1942, null, 5, A, "p16", "p25", 1, { muc_hien_thi: "gia_toc" }),
    P("p27", "Đỗ", "Thị", "Mẫu Hai Bảy", "nu", 1925, 2008, null, A, null, null, null, {}),
    P("p28", T, "Văn", "Mẫu Hai Tám", "nam", { nam: 1950, thang: 2, ngay: 8, lich: "am" }, null, 5, A, "p18", "p27", 1, { muc_hien_thi: "gia_toc", tieu_su: "Ngày sinh ghi theo âm lịch (mẫu)." }),
    P("p29", T, "Thị", "Mẫu Hai Chín", "nu", 1953, null, 5, A, "p18", "p27", 2, { muc_hien_thi: "gia_toc" }),
    P("p30", "Lương", "Thị", "Mẫu Ba Mươi", "nu", 1930, null, null, A, null, null, null, { muc_hien_thi: "gia_dinh_nho" }),
    P("p31", T, "Văn", "Mẫu Ba Mốt", "nam", 1960, null, 5, A, "p16", "p30", 1, { muc_hien_thi: "gia_toc", tieu_su: "Con của vợ hai cụ Mẫu Mười Sáu: cùng cha khác mẹ với Mẫu Hai Sáu." }),
    P("p32", T, "Thị", "Mẫu Ba Hai", "nu", 1962, null, 5, A, "p16", null, 2, { muc_hien_thi: "gia_toc", tieu_su: "Cố ý để thiếu mẹ (dữ liệu mẫu): cha có hai vợ nên trang Kiểm tra sẽ hỏi." }),
    P("p33", T, "Văn", "Mẫu Ba Ba", "nam", 1925, null, 6, A, "p22", "p34", 3, { muc_hien_thi: "gia_toc", tieu_su: "Cố ý sai (dữ liệu mẫu): năm sinh trước cha, để thử trang Kiểm tra." }),
    P("p34", "Mai", "Thị", "Mẫu Ba Bốn", "nu", 1938, null, null, A, null, null, null, { muc_hien_thi: "gia_dinh_nho" }),
    P("p35", T, "Văn", "Mẫu Ba Lăm", "nam", 1962, null, 6, A, "p22", "p34", 1, { muc_hien_thi: "gia_toc" }),
    P("p36", T, "Thị", "Mẫu Ba Sáu", "nu", 1965, null, 6, A, "p22", "p34", 2, { muc_hien_thi: "gia_toc" }),
    P("p37", T, "Văn", "Mẫu Ba Bảy", "nam", 1970, null, 6, A, "p26", null, 1, { muc_hien_thi: "gia_dinh_nho", me_ten: "chưa rõ" }),
    P("p38", T, "Văn", "Mẫu Ba Tám", "nam", 1980, null, 6, A, "p28", null, 1, { muc_hien_thi: "gia_toc" }),
    P("p39", T, "Thị", "Mẫu Ba Chín", "nu", 1984, null, 6, A, "p28", null, 2, { muc_hien_thi: "gia_toc" }),
    P("p40", T, "Văn", "Mẫu Bốn Mươi", "nam", 2012, null, 7, A, "p38", null, 1, { muc_hien_thi: "cong_khai", tieu_su: "Trẻ dưới 18 tuổi, chưa có đồng ý (mẫu): ngoài nhánh chỉ thấy tên và quan hệ." }),
    P("p41", T, "Thị", "Mẫu Bốn Mốt", "nu", 2015, null, 7, A, "p38", null, 2, { muc_hien_thi: "cong_khai", da_dong_y_tre_em: true, tieu_su: "Trẻ dưới 18 tuổi, đã có đồng ý bằng văn bản được lưu (mẫu)." }),
    P("p42", T, "Văn", "Mẫu Bốn Hai", "nam", 2019, null, 7, A, "p39", null, 1, { muc_hien_thi: "gia_dinh_nho" }),
    P("p43", T, "Văn", "Mẫu Bốn Ba", "nam", 1900, 1950, 4, B, "p13", null, 3, { da_an: true, muc_hien_thi: "cong_khai", tieu_su: "Hồ sơ đã ẩn (mẫu): chỉ Quản trị và Biên tập thấy để khôi phục." })
  ];
  function S(id, pid, sp, tt, tt2, ten) { return { id: id, person_id: pid, spouse_person_id: sp, ten: ten || "", thu_tu: tt, tinh_trang: tt2 || "dang_o", ghi_chu: "" }; }
  var spouses = [
    S("s01", "p01", "p02", 1), S("s02", "p01", "p03", 2), S("s03", "p02", "p01", 1), S("s04", "p03", "p01", 1),
    S("s05", "p04", "p07", 1), S("s06", "p07", "p04", 1),
    S("s07", "p06", null, 1, "dang_o", "Vợ chưa rõ (mẫu)"),
    S("s08", "p08", "p11", 1), S("s09", "p11", "p08", 1), S("s10", "p10", "p12", 1), S("s11", "p12", "p10", 1),
    S("s12", "p15", "p21", 1), S("s13", "p21", "p15", 1),
    S("s14", "p16", "p25", 1, "da_mat"), S("s15", "p16", "p30", 2), S("s16", "p25", "p16", 1, "da_mat"), S("s17", "p30", "p16", 1),
    S("s18", "p18", "p27", 1), S("s19", "p27", "p18", 1), S("s20", "p22", "p34", 1), S("s21", "p34", "p22", 1)
  ];
  var events = [
    { id: "e1", nam_hien_thi: "1900", nam_sap_xep: 1900, tieu_de: "Mẫu: xây từ đường", noi_dung: "Sự kiện mẫu giả để thử dòng thời gian.", nguon: "Dữ liệu mẫu giả", muc_chac_chan: "chua_chac", muc_hien_thi: "cong_khai" },
    { id: "e2", nam_hien_thi: "Khoảng 1930", nam_sap_xep: 1930, tieu_de: "Mẫu: họp họ lần đầu", noi_dung: "Sự kiện mẫu giả. Năm ghi theo lời kể.", nguon: "Dữ liệu mẫu giả", muc_chac_chan: "truyen_mieng", muc_hien_thi: "gia_toc" },
    { id: "e3", nam_hien_thi: "1995", nam_sap_xep: 1995, tieu_de: "Mẫu: sửa sang mộ tổ", noi_dung: "Sự kiện mẫu giả.", nguon: "Dữ liệu mẫu giả", muc_chac_chan: "chua_chac", muc_hien_thi: "gia_toc" }
  ];
  var sites = [
    { id: "d1", ten: "Từ đường chi A (mẫu)", loai: "tu_duong", nam_xay: "1900 (mẫu)", dia_chi: "Chùa Một Cột, Hà Nội (địa điểm ví dụ để thử bản đồ)", duong_di: "Mẫu: đi theo đường chính, rẽ phải ở cổng làng, đỗ xe trước sân.", gio_tham_vieng: "Mẫu: sáng sớm, nên báo trước", lien_he: "Người trông coi (mẫu) — chưa có số thật", gioi_thieu: "Di tích mẫu giả để thử giao diện. Thay bằng thông tin thật khi có nguồn.", nguon: "Dữ liệu mẫu giả (địa chỉ chỉ để thử)", muc_chac_chan: "chua_chac", muc_hien_thi: "cong_khai" },
    { id: "d2", ten: "Khu mộ tổ (mẫu)", loai: "mo_to", nam_xay: "", dia_chi: "Hồ Tây, Hà Nội (địa điểm ví dụ để thử bản đồ)", duong_di: "Mẫu: đường đất sau khi qua cầu, đi bộ khoảng 300 m.", gio_tham_vieng: "Mẫu: dịp giỗ, Tết, Thanh minh", lien_he: "", gioi_thieu: "Di tích mẫu giả.", nguon: "Dữ liệu mẫu giả (địa chỉ chỉ để thử)", muc_chac_chan: "truyen_mieng", muc_hien_thi: "gia_toc" },
    { id: "d3", ten: "Nhà thờ tổ (mẫu)", loai: "nha_tho_to", nam_xay: "1850 (mẫu)", dia_chi: "Văn Miếu - Quốc Tử Giám, Hà Nội (địa điểm ví dụ để thử bản đồ)", duong_di: "Mẫu: cách trung tâm xã 2 km, có biển chỉ dẫn.", gio_tham_vieng: "", lien_he: "", gioi_thieu: "Nơi thờ tổ họ (mẫu giả). Thay bằng thông tin thật.", nguon: "Dữ liệu mẫu giả (địa chỉ chỉ để thử)", muc_chac_chan: "chua_chac", muc_hien_thi: "cong_khai" },
    { id: "d4", ten: "Khu lăng mộ chi B (mẫu)", loai: "khu_lang_mo", nam_xay: "", dia_chi: "Công viên Thống Nhất, Hà Nội (địa điểm ví dụ để thử bản đồ)", duong_di: "Mẫu: lên đồi theo lối bậc thang, mang theo nước.", gio_tham_vieng: "", lien_he: "", gioi_thieu: "Khu mộ nhiều đời (mẫu giả).", nguon: "Dữ liệu mẫu giả (địa chỉ chỉ để thử)", muc_chac_chan: "truyen_mieng", muc_hien_thi: "gia_toc" },
    { id: "d5", ten: "Nhà cũ quê gốc (mẫu, chưa có địa chỉ)", loai: "nha_cu", nam_xay: "", dia_chi: "Chỉ biết tên làng (mẫu)", gioi_thieu: "Ví dụ địa điểm chưa có địa chỉ cụ thể: Quản trị có thể bổ sung sau.", nguon: "Dữ liệu mẫu giả", muc_chac_chan: "truyen_mieng", muc_hien_thi: "gia_toc" }
  ];
  var articles = [
    { id: "a1", tieu_de: "Vu Lan và ngày rằm tháng bảy", trang_thai: "da_duyet", nguoi_duyet: "Quản trị (mẫu)", noi_dung: "Rằm tháng bảy âm lịch là ngày Vu Lan, dịp con cháu nhớ ơn cha mẹ, ông bà. Nhiều gia đình dọn mâm cơm cúng gia tiên, đi chùa, và làm việc thiện.\n\nBài mẫu: nội dung phong tục chung, chưa phải tư liệu của dòng họ. Khi có tư liệu thật, nhánh nào biết thì ghi thêm kèm nguồn." },
    { id: "a2", tieu_de: "Mùng một và ngày rằm cúng gia tiên", trang_thai: "da_duyet", nguoi_duyet: "Quản trị (mẫu)", noi_dung: "Ngày mùng một và ngày rằm âm lịch hằng tháng, nhiều nhà thắp hương, dâng hoa quả lên bàn thờ gia tiên. Trang Lịch của gia phả đánh dấu hai ngày này để mọi người dễ nhớ.\n\nBài mẫu: cách làm khác nhau theo vùng và theo từng gia đình." },
    { id: "a3", tieu_de: "Cách gọi họ hàng: bác, chú, cô, cậu, dì", trang_thai: "da_duyet", nguoi_duyet: "Quản trị (mẫu)", noi_dung: "Người Việt xếp thứ bậc theo nhánh: anh của cha là bác, em trai của cha là chú, em gái của cha là cô. Bên mẹ, anh em trai của mẹ là cậu, em gái của mẹ là dì. Chị gái của mẹ ở miền Bắc thường gọi là bác, ở miền Trung và miền Nam thường gọi là dì.\n\nCon cái của anh em họ xếp theo nhánh của cha mẹ, không theo tuổi. Vì vậy một người nhỏ tuổi hơn vẫn có thể là anh họ. Trang Danh xưng của gia phả tính theo quy tắc này." },
    { id: "a4", tieu_de: "Cách ghi một hồ sơ cho đúng", trang_thai: "nhap", nguoi_duyet: "", noi_dung: "Bản nháp mẫu chờ Quản trị duyệt. Khi ghi một người, chỉ ghi điều mình biết. Mỗi thông tin nên có nguồn: lời kể của ai, tài liệu nào, ảnh nào. Điều chưa rõ thì để trống hoặc ghi \"chưa rõ\", không đoán." }
  ];
  var donations = [
    { id: "u1", ten: "Người ủng hộ mẫu A", so_tien: 500000, ngay: "2026-10-01", loi_nhan: "Mẫu giả", dong_y_hien_ten: true, da_an: false },
    { id: "u2", ten: "Người ủng hộ mẫu B", so_tien: 200000, ngay: "2026-10-15", loi_nhan: "", dong_y_hien_ten: false, da_an: false }
  ];
  var profiles = [
    { id: "u_admin", ten_hien_thi: "Kent (Quản trị mẫu)", vai_tro: "admin", nhanh_chi: [], person_id: null, da_xoa: false },
    { id: "u_editor", ten_hien_thi: "Biên tập Chi mẫu A", vai_tro: "editor", nhanh_chi: [A], person_id: "p22", da_xoa: false },
    { id: "u_member", ten_hien_thi: "Thành viên mẫu", vai_tro: "member", nhanh_chi: [], person_id: "p23", da_xoa: false }
  ];
  var settings = {
    ten_dong_ho: "Họ Tống", tac_gia: "Kent", nam_ban_quyen: 2026, giay_phep_noi_dung: "CC BY-NC-SA 4.0", giay_phep_ma: "AGPL-3.0 (chờ Kent xác nhận)",
    quy_uoc_danh_xung: "bac", gio_thang_thieu: "cuoi", ung_ho_thong_tin: "Thông tin nhận ủng hộ do chủ trang nhập (mẫu giả). Trang không xử lý thanh toán.",
    schema: 2, nam_hien_tai: 2026
  };
  root.GP = root.GP || {};
  root.GP.sample = { persons: persons, spouses: spouses, events: events, sites: sites, articles: articles, donations: donations, profiles: profiles, settings: settings, chis: [A, B] };
  if (typeof module !== "undefined") module.exports = root.GP.sample;
})(typeof window !== "undefined" ? window : globalThis);
