-- Gia phả số v1.13.1: Biên tập chỉ sửa các chi được giao.
-- Cột chi liệt kê tên chi/nhánh mà Biên tập được sửa (trùng đúng tên chi trong web). Quản trị không cần.
alter table public.gp_vai_tro add column if not exists chi text[] not null default '{}';

-- Ví dụ giao Chi 1 và Chi 2 cho một Biên tập:
-- update public.gp_vai_tro set chi = array['Chi 1','Chi 2'] where user_id = (select id from auth.users where email = 'EMAIL_BIEN_TAP@gmail.com');
