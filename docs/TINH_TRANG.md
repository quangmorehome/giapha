# Tình trạng bản 1.0.0

## Đã chạy và kiểm tra thật
- 51 kiểm thử logic (Node): âm lịch (Tết 2007–2030, tháng nhuận, giỗ ngày 30), xưng hô, riêng tư, 21 luật kiểm tra, GEDCOM vòng tròn 100%, CSV/JSON/ICS, quyền và nhật ký, bảng chữ vi/en/zh đủ khoá.
- Trình duyệt (Chromium): 27 trang × 4 vai × điện thoại 400px và máy tính 1280px: không lỗi JavaScript, không tràn ngang, không thiếu khoá chữ. Kịch bản thao tác: thêm người, ẩn/khôi phục, khách bị chặn, đổi ngôn ngữ, xuất, nhập GEDCOM.
- PostgreSQL 16: 41 tình huống quyền (khách/member/editor/admin) đều đạt: che thông tin người còn sống và dưới 18, không xoá, nhật ký chỉ-thêm, chống vòng cha-con, ảnh gốc chỉ Admin.

## CHƯA làm được / chưa kiểm chứng
1. Chưa chạy trên Supabase thật (cần tài khoản của Kent — Q-05). Migration đã thử trên PostgreSQL cục bộ với `auth.uid()` giả.
2. Chưa có phần đăng nhập thật, lưu ảnh lên Storage, và nối giao diện vào Supabase. Bản một tệp lưu trong trình duyệt.
3. Không dựng được Next.js/family-chart vì môi trường này không tải được npm; dùng bộ vẽ SVG tự viết.
4. App iPhone cần máy Mac + Apple Developer — chưa làm.
5. Chữ Hán do máy dịch, cần người biết tiếng Trung xem lại.
6. Tết 2030 tính ra 2/2/2030 (Việt Nam UTC+7); nên đối chiếu lịch chính thức khi gần ngày.
7. Biểu trưng gốc độ phân giải thấp (512px); icon 512 cho PWA sẽ bị mờ — cần bản lớn hơn.
8. Chưa kiểm thử bằng trình đọc màn hình thật và chưa đo WCAG bằng công cụ; mới tuân thủ theo thiết kế (cỡ chữ, vùng chạm 44px, tương phản token).
9. Kiểm thử tốc độ với 5000 người chưa làm.

## Cần Kent quyết
- D-03: giấy phép mã nguồn (đang ghi AGPL-3.0, chờ xác nhận).
- Q-05: tạo tài khoản Supabase + hosting để triển khai bản thật.
- Q-07/Q-15: biểu mẫu đồng ý cho người còn sống/dưới 18 tuổi (tạm thời ẩn thông tin cho tới khi có).
- Cần luật sư xem: dữ liệu cá nhân (NĐ 13/2023), dùng ảnh người đã mất, giấy phép.

## Cập nhật v1.4.0
- Thêm: chuyển động nhỏ (✨ bật/tắt), trang Thống kê màu sắc, Trang chủ/Danh sách/Hồ sơ/Lịch giỗ làm lại theo phong cách giapha-os.
- Thêm trang **Bản đồ** (nhà thờ tổ, mộ tổ, khu lăng mộ…): mở Google Maps/Waze/Apple Maps, chỉ đường, lộ trình nhiều điểm, dán tọa độ hoặc link Google, xuất KML/GPX. Migration `0002_ban_do_dia_diem.sql` (RLS test 46 đạt, chỉ thử trên PG16 cục bộ).
- Sơ đồ Tư duy: nút tròn chữ cái, viền xanh/hồng theo giới, người đang chọn viền cam, làm mờ nhánh không liên quan.
- Giới hạn: không nhúng được bản đồ nền trong trình xem (CSP) – chỉ mở sang Google Maps; tọa độ mẫu là GIẢ; link rút gọn maps.app.goo.gl chưa đọc được; khoảng cách là đường chim bay.

## Cập nhật v1.5.0 (theo góp ý của Kent)
- Form sửa: thứ tự ngày–tháng–năm, bỏ ô "đến năm", bỏ phần nguồn/mức chắc chắn; sinh từ 1900 trở đi ẩn tên húy/thụy/Hán Nôm/đạo hiệu; còn sống ẩn ngày mất, giỗ, nơi an táng.
- Ô chọn cha/mẹ: gõ tên không bấm chọn vẫn nhận nếu khớp đúng một người; nếu không khớp thì báo rõ.
- Vợ/chồng, mẹ chỉ có tên: nút "Tạo hồ sơ" để nhập đầy đủ thông tin; vợ/chồng đã có hồ sơ có nút "Sửa hồ sơ".
- Hồ sơ mẹ/vợ hiển thị đủ con; ghi chú "cùng cha khác mẹ" chỉ hiện khi thực sự có hai mẹ.
- Danh sách theo đời sắp theo vai vế trưởng/thứ (theo thứ tự con của cha mẹ), không theo năm sinh.
- Menu gom nhóm 2 tầng; sơ đồ (cặp vợ chồng, tư duy, bong bóng): rê chuột sáng cả chi, bấm ra cửa sổ nhỏ (không nhảy trang).
- Lịch dạng ô màu, ngày dương to, ngày âm ở góc phải, bấm ngày ra cửa sổ; Thống kê bấm ô/cột ra danh sách người.
- Kiểm thử mới: tests/v14.js.

## Cập nhật v1.6.0
- Sửa lỗi tên húy/thụy/Hán Nôm/đạo hiệu vẫn hiện khi sinh từ 1900 (do CSS); thêm `[hidden]` toàn trang.
- Cha/mẹ chưa có hồ sơ: gõ tên là được; khi Lưu hệ thống tự tạo hồ sơ (Riêng tư) và liên kết; có cả cha lẫn mẹ thì tự nối vợ/chồng. Bố/mẹ của dâu/rể tự đánh dấu "Thông gia".
- Vai trò mới `vai` (tự động / ruột / dâu-rể / thông gia): nhãn Dâu trưởng, Dâu thứ n, Dâu út, Rể…, Bố vợ/Mẹ vợ/Bố chồng/Mẹ chồng; hồ sơ hiện bố/mẹ vợ/chồng; thông gia không còn thành gốc cây.
- Vợ/chồng hiểu hai chiều (hồ sơ vợ cũng thấy chồng).
- Form sửa: thêm con/anh chị em ngay trong form; nút Xoá hồ sơ trùng (chỉ Admin, có gộp liên kết, ghi nhật ký kèm bản chụp). Cơ sở dữ liệu thật vẫn cấm xoá (xem migration 0003).
- Hồ sơ: thẻ "Trạng thái" (Còn sống / Đã mất · ngày).
- Quay lại danh sách/cây/sơ đồ: tự cuộn/đưa vào giữa người vừa xem.
- Bản đồ: bỏ kinh độ/vĩ độ; nhập địa chỉ cụ thể → khung Google Maps nhúng (chỉ hiện khi chạy bản độc lập; khung xem của Claude chặn nên tự đổi sang nút Mở Google Maps) + Chỉ đường, Waze, Apple Maps, lộ trình nhiều điểm. Bỏ KML/GPX.
- Chính tả: tọa, húy, thụy, hòa, tùy…

## v1.7.0
- Hồ sơ: thêm mục "Dâu / Rể" trong phần Gia đình (kèm nhãn dâu trưởng/thứ/út, rể… và "của <con>").
- Bộ lọc hiển thị cho Cây, Sơ đồ, Mindmap, Bong bóng: tối giản, ẩn nút đóng/mở (cây), ẩn dâu, rể, con trai/gái, nam, nữ, cháu trai/gái. Con/cháu tính theo người gốc đang xem.
- Xuất file: Danh sách (.csv, theo bộ lọc), Cây (.txt), Sơ đồ (.svg/.png), Thống kê (.csv), Lịch (.ics), Di tích (.csv), Hồ sơ (.txt).
- Danh sách theo đời được chia theo gia đình (cha/mẹ), có nút "Thêm thành viên" từng gia đình; thêm bộ lọc Vai trò (ruột/dâu/rể/thông gia).
- Bấm một người ở danh sách, cây, sơ đồ → mở cửa sổ hồ sơ đầy đủ ngay tại trang (Esc/✕/nút Back đóng; link trong cửa sổ đi tiếp được; "Mở trang riêng" để sang trang hồ sơ).
- Kiểm thử: node --test 52 đạt; tests/v17.js, v14, flow, map, browser đạt.

## v1.8.0
- Ba sơ đồ (Cặp vợ chồng, Tư duy, Bong bóng): bấm một người mở **cùng cửa sổ hồ sơ đầy đủ** như Danh sách/Cây (thay cho cửa sổ nhỏ cũ). Esc/✕/Back đóng; link trong cửa sổ đi tiếp được; nhánh vừa chọn vẫn sáng.
- Cửa sổ có thêm nút "Lấy làm gốc sơ đồ" (chỉ hiện khi người đó có con và đang ở trang sơ đồ).
- Kiểm thử: node --test 52 đạt; tests/v14, v17, flow, map đạt (browser.js chỉ báo lỗi tải font ngoài do môi trường không có mạng).
- Lịch (cửa sổ ngày) và Thống kê (cửa sổ danh sách): bấm tên → mở cửa sổ hồ sơ phía trên; Esc chỉ đóng cửa sổ hồ sơ, cửa sổ ngày/danh sách vẫn còn để xem tiếp người khác.

## v1.9.0 — bản công khai (chỉ cần link)
- Thêm `src/publish.js` (lọc dữ liệu theo quyền KHÁCH, dùng chung hàm `privacy.project`), `tools/make_public.js`, và `build.py` sinh thêm `dist/public/` (index.html, data.json, 404, manifest, .nojekyll, _headers, img). Hướng dẫn: `docs/DANG_LEN_MANG.md`.
- Bản công khai: không có ô đổi vai, khách chỉ xem, không ghi gì vào trình duyệt; tự đọc `data.json` cạnh trang (không tải được thì dùng bản nhúng); dải thông báo riêng, ghi ngày cập nhật ở chân trang.
- Bản đầy đủ: trang Dữ liệu có nút "Xuất bản công khai (data.json)" cho Quản trị + ô tích "đưa mức Gia tộc lên công khai".
- Kiểm thử: node --test 56 đạt (thêm tests/publish.test.js); tests/public.js (máy chủ tĩnh + file://) đạt.
- Chưa làm được: triển khai thật (cần tài khoản hosting của Kent), đăng nhập/sửa chung qua mạng (Supabase), ảnh thật.

## v1.9.1 — nhập một ô, nhiều ô tự liên kết; nhẹ và gọn hơn
- Biểu mẫu thông minh (`src/ui_smart.js`): chọn/gõ cha hoặc mẹ → tự điền họ, chi, đời, thứ tự con (tính theo mẹ nếu có) và người còn lại nếu cha/mẹ chỉ có một vợ/chồng; năm sinh ≤ năm nay−100 → tự chọn "Đã mất"; ngày mất dương → tự tính giỗ âm lịch (mất ghi âm → giỗ trùng); đã mất → mức hiển thị mặc định "Gia tộc"; gõ "Thị"/"Văn" đoán giới tính; ô đồng ý trẻ em chỉ hiện khi dưới 18 tuổi. Ô tự điền nền vàng, có dòng ghi rõ; ô đã gõ tay không bao giờ bị ghi đè.
- Gõ cả họ tên vào ô "Tên": khi lưu tự tách họ / tên đệm / tên.
- Tên húy, thụy, Hán Nôm, đạo hiệu gom vào mục thu gọn; lưới 2 cột trên điện thoại, ngày/tháng/năm một hàng.
- Nhẹ: ảnh nhúng chuyển WebP (≈660 KB → ≈45 KB); `dist/index.html` 1,1 MB → 0,5 MB; bỏ 404.html thừa; biểu tượng PWA vuông (192/512), ảnh xem trước `og.jpg`.
- Đầu trang điện thoại gọn (≈380 px → ≈205 px). Hồ sơ riêng tư với khách không còn ghi nhầm "đã ẩn, có thể khôi phục".
- Kiểm thử: node --test 56 đạt; tests/smart.js mới; v14, flow, v17, map, public, browser đạt (browser.js chỉ báo lỗi tải font ngoài do môi trường không có mạng).

## v1.10.0 — gia đình nhiều đời, nội/ngoại tộc, xoá, bộ lọc gọn
- Lỗi chung đã sửa: con rể không còn thành "gốc" riêng; con của con gái nằm chung nhà với con rể (hàm `U.famKids` = con của người này + con của vợ/chồng). Dùng chung cho Cây, Sơ đồ, Tư duy, Bong bóng.
- Sơ đồ / Tư duy / Bong bóng hiện đủ con, cháu, chắt… đến đời 9 và xa hơn; có dải/nhãn "Đời n" theo từng tầng (vòng cho Bong bóng) và thanh "Từ đời 1 đến đây" để lần ngược về tổ.
- Danh sách tách hai bảng Nội tộc / Ngoại tộc, mỗi bảng xếp theo đời → gia đình; vợ/chồng đứng ngay cạnh nhau; dâu/rể chưa ghi đời lấy đời của bạn đời.
- Nút xoá 🗑 (Quản trị) trên từng dòng và trang hồ sơ, có hộp xác nhận ngay trong trang; "Gộp vào hồ sơ khác…" dẫn tới trang sửa.
- Bộ lọc gộp: ô tìm + Nội/Ngoại tộc + Sắp xếp ở hàng đầu, các lọc phụ gom vào "Bộ lọc" có huy hiệu đếm. Bộ lọc cây/sơ đồ cũng thu gọn.
- Định nghĩa dùng: Nội tộc = con trai, con gái trong họ và cháu nội; Ngoại tộc = dâu, rể, thông gia, cháu ngoại (con của con gái). Có thể ép bằng ô "Vai trò" trong hồ sơ. CẦN Kent xác nhận.
- Kiểm thử: 56 logic + `tests/gen.js` (gia đình 9 đời) + browser/flow/map/v14/v17/smart/public đều đạt.

## v1.10.1 — sửa lỗi không lưu được khi sửa hồ sơ
- Nguyên nhân: `clone(undefined)` ném lỗi khi hồ sơ cũ thiếu ô mới (vd. "vai"); nay đã an toàn. Thêm `tests/edit.js` (admin + biên tập, lưu rồi tải lại).

## v1.11.0
- Trang chủ: 4 ô số liệu (người, đời, chi, đã mất) bấm ra danh sách ngay trong trang; chuyển xuống dưới các mục chức năng.
- Lịch: cửa sổ xem ngày thêm năm âm lịch can chi (vd. Bính Ngọ) và tháng/ngày can chi.
- Dữ liệu: nút "Xuất file xem chung (1 tệp)" — tệp .html có nhúng dữ liệu hiện tại (đã lọc riêng tư), mở được ở máy khác. `tests/share.js`.
- Bảng Excel nhập liệu (Người / Vợ chồng / Lăng mộ) + hướng dẫn GitHub Pages cho tài khoản quangmorehome.
- Chưa làm: nối Supabase (cần URL dự án + anon key do Kent cung cấp), nạp file Excel vào ứng dụng.

## v1.12.0
- Nạp Excel (.xlsx) thẳng vào web (Dữ liệu → Nhập): đọc ngay trên máy, xem trước, "Cập nhật theo Mã" (cùng Mã thì ghi đè kể cả ô trống, Mã mới thì thêm, không xoá ai) hoặc "Thay toàn bộ". Đọc cả sheet Vợ chồng và Lăng mộ. `src/xlsx.js`, `store.syncImport`, `tests/excel.js`.
- Hồ sơ cá nhân (Quản trị): hiện ngày sinh/mất dương lịch + âm lịch (kèm can chi) và ngày giỗ âm.
- Danh sách: 5 ô số liệu (tổng, nam, nữ, còn sống, đã mất) bấm ra danh sách.
- Bỏ giao diện Cây (gộp vào Sơ đồ; #cay tự chuyển sang #so-do). Sửa màu chữ Nội/Ngoại tộc và nút chọn ở nền tối.

## v1.13.0 — đăng nhập + lưu chung Supabase
- Mã đăng nhập/lưu chung (`src/cloud.js`, `src/ui_cloud.js`, migration `0004_tai_lieu_json.sql`) đã gắn dự án hardwxqiagzlthfdwkbu qua `cloud.config.json` (khoá publishable). Khách đọc `gp_cong_khai`; admin/editor đăng nhập đọc-ghi `gp_rieng` (khoá phiên bản chống ghi đè); admin tự đăng bản công khai đã lọc.
- Chưa thử với máy chủ Supabase thật (môi trường dựng không có mạng); kiểm thử bằng máy chủ giả `tests/cloud.js`.
- Sửa khoá i18n động `cl.tt_*` để bài kiểm tra i18n đạt.

## v1.13.1 — khách chỉ thấy người đã mất
- Bản công khai (data.json, file xem chung, gp_cong_khai) nay LOẠI HẲN người còn sống, trẻ em và người chưa rõ tình trạng (không còn "chỉ còn tên"). Khách chỉ thấy người đã mất được đặt mức Công khai. Bỏ liên kết cha/mẹ trỏ tới người ẩn và tên mẹ gõ tay. Test `publish.test.js` cập nhật.
- Sửa lỗi Biên tập đăng nhập không sửa được ai (chi rỗng) trong chế độ lưu chung.

## v1.14.0 — khách chỉ thấy tên + năm; Biên tập theo chi
- Khách: họ tên, giới tính, năm sinh/mất, đời, chi, quan hệ. Ẩn người mất dưới 10 năm/chưa rõ năm mất trừ khi tick "Cho khách xem" (`hien_khach`). Test trong `publish.test.js`.
- Biên tập chỉ sửa chi được giao (`gp_vai_tro.chi`, migration 0005). Giới hạn do ứng dụng kiểm soát, chưa phải RLS.

## v1.15.0
- Nạp Excel/CSV tự gỡ dữ liệu mẫu (trước đó người mẫu lẫn vào làm sơ đồ chọn nhầm gốc, trông như đứt đời); nút "Xoá người mẫu" ở trang Dữ liệu cho bản đã lẫn.
- Sơ đồ / tư duy / bong bóng: "Bắt đầu từ đời N" + "Người gốc" (hoặc "Tất cả người đời N" qua gốc ảo). Đời tự tính theo cha/mẹ khi Excel bỏ trống cột Đời.
- Bỏ khái niệm chi: cả dòng họ là một cây; Excel mẫu bỏ cột Chi (file cũ vẫn nạp được, cột chi bị bỏ qua). Biên tập sửa được cả dòng họ.
- Quản lý Quản trị/Biên tập trên web: migration 0006 (gp_ds_thanh_vien, gp_dat_vai_tro), trang Hệ thống → Quản trị. Chưa thử trên Supabase thật.

## v1.18.0
- Form sửa hồ sơ có nút Xoá (quản trị) / Ẩn hồ sơ (biên tập viên).
- "Thêm con": thêm mới hoặc chọn người đã có (lọc theo tên, chỉ hiện người chưa có cha/mẹ tương ứng).
- Tự nối: con có đủ cha + mẹ → cha mẹ thành vợ chồng; thiếu một bên mà chỉ có một vợ/chồng → tự điền; có thông báo khi hệ thống tự nối.
- Dâu/rể nhận diện theo cấu trúc cây (kể cả khi đã nhập cha mẹ của dâu/rể) → gia đình ngoại tộc có sơ đồ riêng (3 kiểu xem).
- Danh sách: "Tất cả" xếp theo gia đình; lọc Nội/Ngoại mới tách nhóm. Logo/tên về trang chủ.
- Hình nền phong cảnh làng quê theo 7 nhóm trang (SVG, sáng/tối).
- Kiểm thử: tests/v18.js mới; 58 unit + 14 bộ Playwright đều qua.

## v1.19.0
- Xuất Excel (.xlsx) cùng định dạng bảng nhập (3 sheet Người / Vợ chồng / Lăng mộ, cùng cột) → xuất ra có thể nhập lại nguyên vẹn. Nút ở Dữ liệu → Xuất.
- Biệt danh (tên thường gọi) hiện cạnh tên ở danh sách, hồ sơ, cửa sổ sơ đồ.
- Test mới: tests/xlsx_out.js.

## v1.20.0
- Biệt danh hiện cả trong ô sơ đồ (dòng phụ).
- Lăng mộ: hiện trạng (tốt/cần tu sửa/xuống cấp, có ngày cập nhật), danh sách người an táng (liên kết 2 chiều với hồ sơ), nút chỉ đường sẵn có.
- Nhắc giỗ: nút thêm giỗ vào lịch điện thoại (.ics) từ hồ sơ người, từ khu lăng mộ và từ trang Lịch; có báo trước 7 ngày + 1 ngày, kèm địa điểm mộ.
- Excel: sheet Lăng mộ nhập/xuất thêm hiện trạng và người an táng.
- Test mới: tests/v19.js.

## v1.21.0
- Vai trò Người nhà (member): tài khoản gắn với 1 hồ sơ cá nhân; Quản trị soạn bản dữ liệu đã lọc riêng cho từng người (bảng gp_nguoi_nha, RLS chỉ đọc dòng của mình). Người nhà chỉ xem, không sửa. Migration 0007.
- Test mới: tests/member.js.

## v1.22.0
- Mục "Văn bản & bài viết" nạp sẵn 3 văn bản dòng họ, đều ghi nhãn **Sưu tầm** và dòng Nguồn: Quy ước, Quy chế, Nghi thức tế lễ hàng năm (nguồn: src/vanban/*.md). Quản trị sửa/xoá được, xoá rồi không nạp lại.
- Hiển thị tiêu đề, gạch đầu dòng, danh sách đánh số trong bài.
- Sửa lỗi: đường dẫn #bai-viet trước đó bị hiểu nhầm là một bài tên "viet".
- Test mới: tests/vanban.js.

## v1.23.0
- Người nhà tự thấy người thân theo cây (không cần đặt mức hiển thị từng người): tổ tiên (cha mẹ, ông bà…), con cháu mọi đời nội/ngoại, vợ/chồng + dâu/rể, bố mẹ và tổ tiên bên vợ/chồng, anh chị em cùng cha/mẹ cùng con và vợ/chồng của họ. Người xa vẫn bị ẩn/rút gọn.
- Người nhà ngoại tộc mở sơ đồ ở chế độ Ngoại tộc, thấy trọn con cháu; có sơ đồ cây, tư duy, bong bóng và đọc văn bản chung.
- Quản trị mở web là tự cập nhật lại bản cho người nhà (bắt kịp thay đổi do Biên tập viên nhập).
- Test mới: tests/member2.js.

## v1.23.1
- Quản trị: nút "Cập nhật dữ liệu cho người nhà" (Thành viên) hiện báo cáo từng tài khoản (số hồ sơ, lỗi, thiếu gắn hồ sơ, chưa chạy SQL bước 3); lỗi không còn bị nuốt im lặng.
- Người nhà: nếu bản dữ liệu của mình là bản cũ (trước quy tắc người thân) sẽ có cảnh báo trên thanh đầu trang.

## v1.24.0
- Mọi tài khoản (Quản trị, Biên tập, Người nhà) phải gắn với một hồ sơ cá nhân; chưa gắn thì có cảnh báo trên thanh đầu trang; trang chủ có "Hồ sơ của tôi" cho mọi vai trò. Migration 0008.

## v1.25.0
- Bản đồ: dán link Google Maps của từng khu → tự lấy toạ độ (link đầy đủ), xem trước ngay; nút Chỉ đường mở Google Maps theo toạ độ chính xác; link rút gọn vẫn lưu và mở được.
- Bản đồ chung: Quản trị dán link Google My Maps → hiện bản đồ Google có tất cả điểm; nút "Cho khách xem tất cả các khu".
- Nhắc tảo mộ định kỳ theo từng khu (Thanh minh, 25 tháng Chạp, ngày âm tuỳ chọn): danh sách sắp tới + xuất lịch .ics báo trước 7 ngày và 1 ngày.
- Excel Lăng mộ thêm cột Link Google Maps; khu nhập từ Excel mặc định công khai (khách vãng lai xem được).
- Test mới: tests/map2.js.

## v1.26.0 – v1.27.0
- v1.26: Biên tập/Quản trị tự gắn tài khoản với hồ sơ ở trang "Tài khoản" (SQL `0009_tu_gan_ho_so.sql`, chạy 1 lần); mọi tài khoản đăng nhập thấy sinh nhật (ngày/tháng) và giỗ trong lịch (trường `cal` ở bản cơ bản; NN_VER=4 → Quản trị bấm "Cập nhật dữ liệu cho người nhà").
- v1.27: điện thoại có thanh điều hướng đáy + bảng Menu, nút/ô nhập to; trang Bản đồ khung lớn (vệ tinh/bản đồ), danh sách địa điểm, gán người đã mất ngay trên trang, thẻ "Nơi an táng" trong hồ sơ; bảng "Ngày tháng" dương/âm gọn (sửa lỗi hiện mã `<span>`); form tự quy đổi âm ⇄ dương, nhận tháng nhuận.

## v1.28.0
- Cài như ứng dụng điện thoại (PWA): `manifest.webmanifest`, `sw.js`, `img/` (bản dist/app); thẻ "Cài về điện thoại" ở Trang chủ (Android có nút cài, iPhone có hướng dẫn Safari).
- Đề xuất & góp ý: người có tài khoản gửi, Quản trị duyệt (bảng `gp_de_xuat`, SQL `0010_de_xuat.sql`); nút "Đề xuất sửa thông tin" ở hồ sơ.
- Tảo mộ cuối năm đổi thành 23 tháng Chạp.

## v1.29.0
- Kho tư liệu (`ui_kho.js`, SQL `0011_kho_tu_lieu.sql`): ảnh/PDF/video/ghi âm ≤25 MB hoặc link YouTube/Drive; người nhà gửi → Quản trị duyệt; ghi nguồn, người cung cấp, ngày thu thập, gắn người/địa điểm; hiện ở hồ sơ cá nhân và trang địa điểm; link xem tạm 1 giờ (bucket riêng tư); chấm đỏ gộp đề xuất + tư liệu chờ duyệt.

## v1.30.0
- Lịch: hôm nay tô màu nổi bật; 3 ô Giỗ/Sinh nhật/Lễ bấm để lọc danh sách trong tháng.
- Bỏ nhắc "chưa ghi nguồn" khỏi mục kiểm tra dữ liệu.
- Excel địa điểm: thêm cột Tảo mộ, Ngày tảo mộ riêng, Giờ thăm viếng, Năm xây; thêm loại Nhà riêng/Chùa/Khác; file mẫu `Mau-nhap-dia-diem-Ho-Tong.xlsx` (nhập bằng "Đồng bộ theo Mã", không đụng danh sách người).

## v1.30.1
- Sửa khung bản đồ bị co hẹp (trùng lớp CSS .big); Thêm/Sửa di tích dùng form đầy đủ của trang Bản đồ (hết hiện mã rf.*).

## v1.30.2
- Sửa gốc lỗi giao diện điện thoại: trang đưa lên GitHub nay có doctype + viewport (trước đó iPhone hiển thị khổ máy tính 980px, không có thanh menu dưới).
- Lịch sử chỉnh sửa trong hồ sơ người: thu gọn thành mục nhỏ, chỉ Quản trị/Biên tập thấy, mặc định đóng.
- Thẻ "Cài như ứng dụng": iPhone không có nút cài (Safari không hỗ trợ) → hiện hướng dẫn rõ; Android/Chrome hiện nút bấm.

## v1.30.3
- Giỗ luôn tính từ ngày mất đầy đủ (trước đây ưu tiên ô giỗ đã lưu nên lệch, vd mất 25/3/2021 = 13/2 âm nhưng hiện 10/8). Thêm cảnh báo "giỗ lệch" và nút "Đồng bộ giỗ theo ngày mất" (Quản trị, mục Dữ liệu) sửa cho tất cả.

## v1.30.4
- Giỗ: nhập tay được giữ nguyên; để trống thì tự tính từ ngày mất đầy đủ, trước 1 ngày âm lịch (tập tục). Chỉnh số ngày bằng settings.gio_truoc_ngay (mặc định 1). Bỏ nút đồng bộ giỗ của v1.30.3.

## v1.31.0
- Văn bản: 4 sườn chi tiết dự thảo (Quy ước 45 điều, Quy chế Hội đồng Gia tộc & Quỹ, Gia huấn, Lịch sinh hoạt) nạp vào Bài viết (tách bằng cờ vanban_v2); trình bày bài viết hỗ trợ **đậm**, bảng, ghi chú.
- Trang chủ: "Hôm nay trong dòng họ" (giỗ, sinh nhật, ngày này năm xưa, lời dặn).
- Trang "Thiệp & thẻ chia sẻ" (#thiep): vẽ ảnh PNG mời giỗ / họp họ / thẻ nhớ người / tự do; tải về hoặc chia sẻ (Zalo) trên điện thoại.

## v1.31.1
- "Nhắc nhở của tôi" (trang Lịch): chọn loại (giỗ/sinh nhật/lễ) và nhắc trước 7/3/1/đúng ngày; khối "Cần nhớ" trên trang chủ; thông báo khi mở web (nếu cho phép); lịch .ics có báo thức theo cài đặt. Lưu trên máy từng người. Chưa có đẩy thông báo khi không mở web (cần máy chủ).

## v1.32.0
- Mục "Pháp luật gia tộc" (#phap-luat): 7 bài (bản đồ pháp luật, thừa kế, di sản thờ cúng, đất đai, hộ tịch, di tích & dữ liệu cá nhân, việc nên làm) có nguồn, cảnh báo không phải tư vấn pháp lý, cập nhật 11/2026. Nạp theo vanban_ver=3.
- Di tích: thẻ đầy đủ (loại, hiện trạng, địa chỉ, người an táng, tư liệu, chỉ đường), lọc theo loại. Phòng ảnh: hiện ảnh đã duyệt của cả họ từ Kho tư liệu.
- Lịch đăng ký vào iPhone/Android: Quản trị tạo lich-ho-tong.ics (giỗ người công khai, 3 năm), tải lên cùng index.html; mọi người đăng ký webcal một lần.
- Logo iPhone: apple-touch-icon nhúng thẳng trong index.html (không phụ thuộc thư mục img), icon nền đặc 180px.

## v1.33.0
- Logo iPhone: dùng file PNG thật ở thư mục gốc (apple-touch-icon.png, icon-192.png, icon-512.png, favicon.png); phải tải lên CẢ các file này cùng index.html, rồi xoá icon cũ trên màn hình chính và thêm lại.
- Bản đồ: chỉ nhúng đúng địa chỉ/toạ độ đã lưu (không còn đoán theo tên); chưa có vị trí thì báo và có nút "Sửa vị trí"; bỏ nút "Mở Google Maps" thừa. "Sửa vị trí" (địa chỉ + link Google Maps) ở Di tích, Bản đồ, trang cá nhân; trang cá nhân còn thêm nơi an táng mới.
- Xưng hô: thêm quan hệ hôn nhân (dâu/rể, anh chị em dâu rể, bố mẹ/anh chị em vợ chồng, đồng hao, chị em dâu, thông gia/sui, họ hàng bên vợ/chồng) và lựa chọn "Miền Trung" (Ba/Bọ, Mạ/Má/Mự, Mệ, O, Dì, Dượng).
- Danh sách người: lưới nhiều cột, gọn; Lịch: lưới tháng, rồi ô giỗ/sinh nhật/lễ, rồi bảng sự kiện trong tháng.
- Bài viết: gộp bài trùng (ẩn bản tóm lược Quy ước/Quy chế, Lịch sinh hoạt, Việc nên làm; đổi tên bản chi tiết); chỉ ẩn nếu Quản trị chưa sửa nội dung. Pháp luật còn 6 bài.
- Cây gia phả trên điện thoại: bộ chọn gốc/lọc thu gọn, khung cây cao hơn.
- Sửa gốc lỗi logo iPhone: các thẻ icon/manifest trước đây nằm trong <body>; nay nằm đúng trong <head> (hàm wrap trong build.py).

## v1.34.0
- Trang "Danh nhân & thành tích" (#danh-nhan): hồ sơ do Quản trị/người được giao viết (bài nhóm danh_nhan, có nguồn, chờ duyệt) + danh sách nghề nghiệp ghi trong gia phả. Chưa có dữ liệu thật: cần nhập.
- Dòng thời gian: thêm công tắc "mốc lịch sử đất nước" (1802–2007, tham khảo) xen cùng các sự kiện của dòng họ.

## v1.35.0 — Giao diện PC + thông tin khu mộ + Donate
- PC (≥1000px): trang full chiều rộng; menu các mục lớn dạng cột dọc bên trái; Cài đặt (hiển thị & ngôn ngữ) và thẻ Ủng hộ ở góc dưới trái.
- Donate: nút nhỏ ở trang chủ → cửa sổ có mã QR (VietQR), chủ tài khoản, số tài khoản (sao chép), nút mở app ngân hàng, lời cảm ơn. Quản trị nhập thông tin ở trang Ủng hộ. Lưu ý: thông tin này công khai.
- Di tích/Bản đồ: thêm tỉnh/thành, diện tích, số mộ, chỗ trống, duy tu/bảo trì/hoàn thành, người trông coi (tên, tuổi, SĐT, quan hệ), tọa độ. Tên/tuổi/SĐT người trông coi bị loại khỏi bản công khai (người nhà đăng nhập vẫn thấy).
- Chưa làm: (5) lớp phủ trên ngôi mộ có chỉnh độ mờ — cần sơ đồ khu mộ/ảnh mặt bằng làm nền; (6) AI trợ lý pháp luật — kế hoạch tương lai.

## v1.36.0 — Sơ đồ nội/ngoại tộc theo đời liền trước
- Sơ đồ, tư duy, bong bóng: nhánh nội tộc chỉ mở khi cha (đời liền trước) là người họ Tống; con của con gái gả ra ngoài (cháu ngoại) chuyển sang tab Ngoại tộc.
- v1.36.1: khi có nhiều cụm gia đình, sơ đồ/tư duy/bong bóng mặc định chỉ vẽ cụm đông nhất (vẫn chọn "Tất cả" được); trên điện thoại "Bắt đầu từ đời" + "Người gốc" hiện ngay, không nằm trong mục thu gọn.

## v1.37.0
- Logo to hơn trên điện thoại (54px).
- Bản đồ: bản đồ + thông tin bên lề cạnh nhau trên PC (xếp dọc trên điện thoại); thêm lớp OSM (OpenStreetMap embed chính thức, cần có tọa độ). OpenTopoMap/Leaflet/lớp phủ mộ: chờ bản sau.
- Sơ đồ/tư duy/bong bóng: Nội tộc = mang họ Tống hoặc có cha/mẹ họ Tống (kể cả con của con gái) và hiển thị đủ các đời sau; gia đình không có cha/mẹ họ Tống (thông gia) chỉ ở tab Ngoại tộc; mặc định chỉ vẽ một cụm.
- Xưng hô: vợ/chồng của cậu, bác, chú… bên vợ/chồng → "Mợ/Bác gái/Thím… bên vợ"; họ hàng của người thông gia → "<quan hệ> của <xưng hô> (thông gia)".

## v1.38.0
- Logo dùng ảnh nét (cắt vuông giữa), 64–68px trên điện thoại. Menu trái PC giữ vị trí cuộn và tự cuộn tới mục đang xem.
- Danh nhân & thành tích: chỉ biên tập viên + quản trị thấy (menu, trang chủ, trang, bài); không xuất ra bản công khai/người nhà.
- Bản đồ: 3 cột trên PC (danh sách | bản đồ | thông tin bên lề), xếp dọc trên điện thoại; bên lề luôn hiện 3 ô số (số mộ, chỗ trống, diện tích) + tỉnh, duy tu, người trông coi, tọa độ ("Chưa cập nhật" nếu trống).
- v1.38.1: bản đồ OSM/Địa hình tự vẽ ô vuông (tile.openstreetmap.org, tile.opentopomap.org, có ghi nguồn; thay khung nhúng bị OSM từ chối); Google My Maps chung thu gọn ở cuối trang; chống tràn ngang; cột lề phải gọn; vẽ lại giữ vị trí cuộn từng cột; nút "Gỡ tất cả" người an táng (bấm 2 lần xác nhận).

## v1.39.0
- Bỏ "Bản đồ chung các khu lăng mộ (My Maps)" và "Lập lộ trình thăm viếng" (cùng ô tick chọn).
- Sửa lỗi 3 nút kiểu bản đồ cùng sáng: nay chỉ nút đang dùng sáng.
- Lưu vị trí mới (link Google Maps) sẽ xóa tọa độ cũ; link rút gọn không đọc được tọa độ → báo rõ, không còn hiện vị trí cũ.
- Tỉnh/thành tự nhận từ địa chỉ (chính xác) hoặc từ tọa độ (ước tính theo tâm tỉnh gần nhất, ghi chú "ước tính"); có thể sửa tay.

## v1.39.1
- Biểu tượng ứng dụng (iPhone/PWA) và logo đầu trang: cắt sát huy hiệu (≈86% khung) để hình to như app thường. Cần xóa biểu tượng cũ trên màn hình chính rồi "Thêm vào MH chính" lại để iPhone nạp icon mới.

## v1.40.0 — Trang trí
- Họa tiết hồi văn mờ làm nền, dải hoa văn kim cương dưới đầu trang, viền góc cho khung chào, tiêu đề kèm gạch trang trí, nút chính có chiều sâu.
- Hiệu ứng nhẹ: nội dung trượt hiện khi chuyển trang (không lặp khi lọc/gõ), nổi nhẹ khi rê chuột, tôn trọng "giảm chuyển động".

## v1.41.0 — Đại sảnh sơn son thếp vàng
- Sửa lỗi họa tiết v1.40 không hiện (dấu nháy trong SVG làm hỏng CSS) → hồi văn nền, dải hoa văn, viền góc nay hiện.
- Đầu trang + thanh trái PC: nền sơn son, chữ vàng, mục đang xem sáng vàng. Hero trang chủ: khung vàng, hoành phi "Uống nước nhớ nguồn", đèn lồng đung đưa, huy hiệu viền vàng. Dải số liệu vàng đồng, ô tính năng viền vàng, tờ lịch ngày hôm nay.

## v1.42.0
- Nền trang: bỏ cây + nhà; thay bằng đồi sương mờ và họa tiết trống đồng chìm (trang nhã).
- Trang "Cây sống" (Gia phả → Cây sống): cây thật — gốc là tổ tiên, cành là các đời, lá là người (xanh=nam, xanh nhạt=nữ, vàng=đã mất), bấm lá mở hồ sơ, chọn gốc, phóng to/thu nhỏ.
- Trang "Gia huấn" (Tư liệu): bia đá + 2 vế câu đối + 10 điều dạy (dự thảo do Claude soạn); Quản trị/Biên tập sửa được, lưu trong cài đặt.

## v1.43.0 — Rà soát lỗi
- Cây sống: sửa cành thẳng đứng (con duy nhất / thẳng hàng cha) bị mất do dải màu theo khung bao của đường (khung rộng 0) → dùng dải màu theo tọa độ toàn cây. Lúc mở trang, cây cuộn để gốc nằm giữa khung; tên người gốc đặt dưới mặt đất, không đè thân cây.
- Sơ đồ / Tư duy / Bong bóng: căn khung theo kích thước bố cục (không bị méo bởi hiệu ứng trượt vào trang), tự căn lại khi khung đổi cỡ nếu chưa kéo/phóng; cho thu nhỏ tới 4% để cây lớn vừa màn hình điện thoại.
- Gia huấn: bia chính vòm có bệ đá và khung khắc chìm; 2 câu đối dạng treo có thanh gỗ vàng; 10 điều dạy là 10 tấm bia đứng có bệ (5 cột PC, 2 cột máy tính bảng, 1 cột điện thoại), số thứ tự khắc trên ấn đỏ; cả trang căn giữa.
- Thêm tests/v39.js.

## v1.44.0 / v1.45.0
- v1.44: hồ sơ người dạng bài vị (khung vàng, ảnh, tên lớn, đời, cha mẹ / vợ chồng / con, nút "Xem trên cây" nhảy tới đúng lá, tô sáng); giao diện thứ ba "Đêm thắp hương" (data-theme="huong", vòng sáng → tối → đêm thắp hương); Cây sống có vợ/chồng cạnh lá, lá rụng (màu thu, đung đưa) cho người đã mất, bấm cành hoặc nút −/+ để thu gọn/mở nhánh, "Thu gọn/Mở hết"; thẻ "Hôm nay trong dòng họ" (hôm nay + lời dạy ngẫu nhiên, nút "Lời khác"); thẻ chia sẻ: ảnh vuông 1080 hoặc dọc 1080×1350, 3 màu, khung hoa văn, chép lời nhắn, in thiệp.
- v1.45 sửa lỗi: ô tìm hồ sơ ở trang chủ (chữ rõ sáng/tối/đêm hương, danh sách không bị khung cắt, đè lên các thẻ dưới); sidebar hover không còn xuống dòng/nhảy (bỏ padding-left, dùng transform); danh mục con trên điện thoại giữ vị trí cuộn ngang; ô thống kê Địa điểm/Khu mộ/Cần tu sửa ở trang Di tích bấm để lọc; "Tảo mộ sắp tới" của từng khu hiện ngày kế tiếp của mỗi loại (không trùng tiêu đề "định kỳ"); Bong bóng/Tư duy trên điện thoại: chạm lần 1 sáng cả nhánh + thanh tên, chạm lần 2/nút Hồ sơ mới mở hồ sơ; sửa nhãn "{n} con cháu"; lọc Lịch giỗ không còn cuộn trang quá mục chọn. Thêm tests/v40.js, v41.js.

## v1.46.0
- Màn chào khi mở ứng dụng: logo, tên họ, "Uống nước nhớ nguồn", đèn lồng đung đưa, chạm để vào (tự đóng sau ~2 giây, mỗi phiên chỉ 1 lần; tắt hiệu ứng khi máy bật "giảm chuyển động"; không hiện khi chạy kiểm thử tự động).
- Thiệp & thẻ chia sẻ: có đại từ nhân xưng (Cụ ông/Cụ bà/Ông/Bà/Anh/Chị… tự chọn theo giới tính và khoảng cách đời, đổi tay được hoặc bỏ xưng), dòng "Kính gửi", người mời (ký tên), lời mời giỗ trang trọng, dòng "Đời thứ N" trên thẻ nhớ người.

## v1.46.1
- Sơ đồ / Tư duy / Bong bóng: quay lại sau khi lướt nhiều trang không còn bị đẩy lệch khung. Nguyên nhân: mỗi lần mở lại, sơ đồ tự phóng và dời khung tới "người vừa xem gần nhất" (kể cả người xem ở trang khác). Nay chỉ làm sáng người đó; chỉ dời khung khi quay lại bằng nút Back mà người đó nằm ngoài khung. Thêm tests/v42.js.

## v1.46.2
- Thanh bên trái: hết nháy khi đặt chuột giữa hai mục. Nguyên nhân: hiệu ứng rê chuột dịch mục sang phải 3px nên chuột sát mép/khe giữa liên tục vào–ra vùng mục. Nay chỉ đổi nền + vạch vàng bên trái, không dịch chuyển, không đổi kích thước, khe giữa các mục bằng 0 nên luôn rõ mục nào đang chọn.

## v1.47.0
- Quản trị sửa "Đời" của một người: mọi con cháu (và dâu/rể) đã ghi số đời tự dời theo cùng số đời; ô Đời để trống thì vẫn tự tính từ cha/mẹ. Có thông báo "đã dời đời của N người". (ui_people.js `U.descIds`, test v43)
- Thanh bên trái (v1.46.3): hiệu ứng rê chuột bằng lớp phủ, không còn nháy.
- Lịch: cửa sổ khi bấm ngày có tiêu đề màu/biểu tượng riêng theo dịp (sinh nhật, giỗ, Tết, Rằm/mùng 1, Trung thu, Vu lan, Thanh minh/Giỗ Tổ, ngày thường).
- Thiệp tự tạo trong từng ngày (ui_lichthiep.js, `U.cardDraw`): sinh nhật (bóng bay, pháo giấy), giỗ (hương, sen, ánh nến; tự điền ngày dương – âm, giờ, nơi), Tết (hoa mai, đèn lồng), Rằm (trăng, sen), Trung thu (đèn ông sao), Vu lan (sen), Thanh minh (liễu, đồi cỏ). Nhiều người trong một ngày: chọn từng người bằng nút; sửa giờ / địa điểm / lời nhắn; tải ảnh hoặc gửi Zalo. Giờ & địa điểm nhớ cho lần sau. (test v44)
