-- Gia phả số v1.13: lưu chung bằng 1 "tài liệu" JSON (đơn giản, khớp với ứng dụng 1 tệp).
--  gp_rieng      : dữ liệu ĐẦY ĐỦ — chỉ Quản trị / Biên tập đã đăng nhập đọc và ghi được
--  gp_cong_khai  : bản đã lọc riêng tư — ai cũng đọc được, chỉ Quản trị ghi được
--  gp_vai_tro    : ai là Quản trị / Biên tập (chỉ Quản trị sửa được)

create table if not exists public.gp_vai_tro (
  user_id uuid primary key references auth.users(id) on delete cascade,
  vai_tro text not null check (vai_tro in ('admin','editor')),
  ten text,
  tao_luc timestamptz not null default now()
);
create table if not exists public.gp_rieng (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
create table if not exists public.gp_cong_khai (
  id int primary key default 1 check (id = 1),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.gp_vai_tro enable row level security;
alter table public.gp_rieng enable row level security;
alter table public.gp_cong_khai enable row level security;

-- hàm trả về vai trò của người đang đăng nhập (không bị chặn bởi RLS)
create or replace function public.gp_vai_tro_cua_toi() returns text
language sql stable security definer set search_path = public as
$$ select vai_tro from public.gp_vai_tro where user_id = auth.uid() $$;
revoke all on function public.gp_vai_tro_cua_toi() from public;
grant execute on function public.gp_vai_tro_cua_toi() to authenticated;

drop policy if exists vt_doc_cua_toi on public.gp_vai_tro;
drop policy if exists vt_admin_tat_ca on public.gp_vai_tro;
create policy vt_doc_cua_toi on public.gp_vai_tro for select to authenticated using (user_id = auth.uid());
create policy vt_admin_tat_ca on public.gp_vai_tro for all to authenticated
  using (public.gp_vai_tro_cua_toi() = 'admin') with check (public.gp_vai_tro_cua_toi() = 'admin');

drop policy if exists rieng_doc on public.gp_rieng;
drop policy if exists rieng_them on public.gp_rieng;
drop policy if exists rieng_sua on public.gp_rieng;
create policy rieng_doc on public.gp_rieng for select to authenticated using (public.gp_vai_tro_cua_toi() in ('admin','editor'));
create policy rieng_them on public.gp_rieng for insert to authenticated with check (public.gp_vai_tro_cua_toi() in ('admin','editor'));
create policy rieng_sua on public.gp_rieng for update to authenticated
  using (public.gp_vai_tro_cua_toi() in ('admin','editor')) with check (public.gp_vai_tro_cua_toi() in ('admin','editor'));
-- không có policy delete => không ai xoá được tài liệu

drop policy if exists ck_doc on public.gp_cong_khai;
drop policy if exists ck_them on public.gp_cong_khai;
drop policy if exists ck_sua on public.gp_cong_khai;
create policy ck_doc on public.gp_cong_khai for select to anon, authenticated using (true);
create policy ck_them on public.gp_cong_khai for insert to authenticated with check (public.gp_vai_tro_cua_toi() = 'admin');
create policy ck_sua on public.gp_cong_khai for update to authenticated
  using (public.gp_vai_tro_cua_toi() = 'admin') with check (public.gp_vai_tro_cua_toi() = 'admin');

-- BƯỚC CUỐI (chạy riêng sau khi đã tạo người dùng ở Authentication → Users):
-- insert into public.gp_vai_tro (user_id, vai_tro, ten)
-- select id, 'admin', 'Quản trị' from auth.users where email = 'EMAIL_CỦA_BẠN@gmail.com';
