-- 0003: vai trò trong họ (ruột / dâu-rể / thông gia). Chỉ thêm cột; không đổi quyền.
-- LƯU Ý: bản web thử đã có nút "Xoá hồ sơ trùng" (chỉ Quản trị). Cơ sở dữ liệu thật VẪN CẤM xoá (trigger khong_xoa).
-- Muốn xoá thật phải có quyết định riêng của Kent (ví dụ: hàm SECURITY DEFINER chỉ cho Admin, có ghi nhật ký) — chưa làm.
alter table persons add column if not exists vai text not null default '' check (vai in ('', 'ruot', 'dau_re', 'thong_gia'));
