# Gia phả Họ Tống — bản 1.0.0 (một tệp, dữ liệu mẫu GIẢ)

Mở `dist/index.html` bằng trình duyệt là dùng được (không cần mạng, trừ phông chữ).

## Có gì
Cây gia phả, danh sách và tìm không dấu, hồ sơ từng người (nguồn + độ chắc chắn từng thông tin, lịch sử sửa), 3 sơ đồ (cặp vợ chồng, tư duy, bong bóng), tìm xưng hô theo thứ bậc nhánh, lịch giỗ âm lịch (tháng nhuận, tháng thiếu, xuất .ics), thống kê, phòng ảnh (thu nhỏ + đóng dấu), dòng thời gian, di tích, bài viết (Biên tập nháp, Quản trị duyệt), ủng hộ (chỉ đăng thông tin), kiểm tra 21 loại mâu thuẫn (chỉ liệt kê, không tự sửa), xuất/nhập JSON-CSV-GEDCOM, sách gia phả để in, Quản trị, tài khoản (yêu cầu ẩn hồ sơ/xoá tài khoản), tiếng Việt/Anh/Trung, chữ to nhỏ, sáng/tối.

## Thư mục
- `src/` mã nguồn từng mô-đun; `build.py` ghép thành `dist/index.html`.
- `tests/` kiểm thử (`node --test tests/*.test.js`; `node tests/browser.js` và `node tests/flow.js` chạy trong Chromium sau khi build).
- `supabase/migrations/0001_khoi_tao.sql` cơ sở dữ liệu có phân quyền (RLS); `supabase/test/chay.sh` dựng PostgreSQL tạm để thử quyền.
- `docs/TINH_TRANG.md` việc đã làm / chưa làm / cần Kent quyết.

## Giới hạn quan trọng
Bản một tệp chỉ GIẢ LẬP phân quyền trong trình duyệt. Đừng nhập dữ liệu thật vào đó. Bảo vệ thật nằm ở cơ sở dữ liệu (thư mục `supabase/`), cần tài khoản Supabase của Kent mới triển khai được.
