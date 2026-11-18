-- Gia phả số v1.28: người trong họ gửi ĐỀ XUẤT sửa/bổ sung; Quản trị xem và duyệt. Chạy một lần trong Supabase → SQL Editor (sau bước 5).
create table if not exists public.gp_de_xuat (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ten text,
  nguoi_id text,
  loai text not null,
  noi_dung text not null check (length(trim(noi_dung)) >= 5),
  trang_thai text not null default 'moi' check (trang_thai in ('moi', 'da_xu_ly', 'tu_choi')),
  ghi_chu text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);
alter table public.gp_de_xuat enable row level security;
drop policy if exists dx_gui on public.gp_de_xuat;
drop policy if exists dx_xem on public.gp_de_xuat;
drop policy if exists dx_duyet on public.gp_de_xuat;
create policy dx_gui on public.gp_de_xuat for insert to authenticated
  with check (user_id = auth.uid() and trang_thai = 'moi' and public.gp_vai_tro_cua_toi() is not null);
create policy dx_xem on public.gp_de_xuat for select to authenticated
  using (user_id = auth.uid() or public.gp_vai_tro_cua_toi() = 'admin');
create policy dx_duyet on public.gp_de_xuat for update to authenticated
  using (public.gp_vai_tro_cua_toi() = 'admin') with check (public.gp_vai_tro_cua_toi() = 'admin');
grant select, insert, update on public.gp_de_xuat to authenticated;
