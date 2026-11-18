# Đưa Gia phả số lên mạng — ai có link cũng xem được (miễn phí)

Thư mục `dist/public/` (hoặc tệp `gia-pha-ho-tong-public.zip`) là **trọn bộ trang web**. Chỉ cần đưa thư mục này lên một nơi lưu trữ web miễn phí, bạn sẽ có một đường link dạng `https://ten-ban-chon.netlify.app`.

## Cách 1 — Netlify Drop (dễ nhất, khoảng 5 phút)
1. Vào https://app.netlify.com/drop và đăng ký tài khoản miễn phí (bằng Google/Email).
2. Giải nén `gia-pha-ho-tong-public.zip`, **kéo cả thư mục** vừa giải nén thả vào khung trên trang.
3. Vài giây sau có link. Vào *Site configuration → Change site name* để đặt tên dễ nhớ, ví dụ `giapha-hotong`.
4. Gửi link cho cả họ (Zalo, Facebook…). Trên điện thoại có thể bấm "Thêm vào màn hình chính" để có biểu tượng như ứng dụng.

## Cách 2 — GitHub Pages
1. Tạo tài khoản https://github.com, tạo kho mới (New repository), đặt tên `gia-pha`, chọn *Public*.
2. Bấm *Add file → Upload files*, kéo **toàn bộ nội dung bên trong** thư mục `public` (nhớ cả tệp `.nojekyll`) rồi *Commit*.
3. *Settings → Pages → Branch: main / root → Save*. Sau 1–2 phút link là `https://<tên-tài-khoản>.github.io/gia-pha/`.

## Cách 3 — Cloudflare Pages
Vào https://pages.cloudflare.com → *Create → Direct Upload* → kéo thư mục `public` vào.

## Cập nhật nội dung sau này (không cần làm lại cả trang)
1. Mở bản đầy đủ của ứng dụng (tệp `index.html` ở thư mục `dist`, hoặc bản trên Claude) và đăng nhập vai **Quản trị**.
2. Vào trang **Dữ liệu → Xuất bản công khai (data.json)**. Có thể bỏ tích ô "đưa lên công khai mức Gia tộc" nếu muốn chặt hơn. Tệp tải về luôn tên `data.json`.
3. Trên Netlify: *Deploys → kéo thả lại thư mục* (thay `data.json` trong thư mục rồi thả lại). Trên GitHub: *Add file → Upload files* tệp `data.json` mới, ghi đè.
4. Người xem mở lại trang là thấy dữ liệu mới (trang tự đọc `data.json` mỗi lần mở).

## Ai thấy gì (quan trọng)
- Tệp `data.json` **là công khai**. Chương trình đã loại sẵn: hồ sơ Riêng tư, hồ sơ đã ẩn, tài khoản, nhật ký sửa, danh sách ủng hộ.
- **Người còn sống và trẻ dưới 18 tuổi** (chưa có đồng ý) chỉ hiện họ tên, giới tính, đời và quan hệ cha mẹ; không có ngày sinh, tiểu sử, nơi ở.
- Muốn một người **không hiện** cả tên: đặt mức hiển thị của hồ sơ đó là *Riêng tư* hoặc *Gia đình nhỏ* trước khi xuất.
- Muốn người đã mất hiện đầy đủ: đặt mức *Công khai* hoặc *Gia tộc* (và để ô tích ở bước 2).
- Hiện bản công khai đang chứa **dữ liệu mẫu giả**. Khi nhập gia phả thật, xuất lại `data.json` rồi thay vào.

## Giới hạn hiện tại
- Chỉ **xem**. Việc nhập/sửa vẫn làm ở bản đầy đủ rồi xuất lại (chưa có đăng nhập chung qua mạng; cần Supabase — việc Q-05).
- Dữ liệu nhập ở bản đầy đủ lưu **trong trình duyệt của máy đó**; nhớ xuất bản sao lưu (JSON) đều đặn.
- Ảnh tải lên không đưa lên mạng ở bản này (chỉ ảnh nhúng sẵn).
- Trang chặn công cụ tìm kiếm (`noindex`) để chỉ người có link mới vào; muốn cho Google tìm thấy, xóa dòng `robots` trong `index.html`.
- Link xem trước trên Zalo/Facebook (ảnh biểu trưng) cần địa chỉ ảnh đầy đủ: sau khi có link chính thức, sửa `og:image` thành `https://<link>/img/og.jpg`.
