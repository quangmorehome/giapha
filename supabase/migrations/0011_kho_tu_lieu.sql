-- Gia phả số v1.29: KHO TƯ LIỆU (ảnh, PDF, video, ghi âm) có nguồn; người nhà tải lên → Quản trị duyệt mới hiện.
-- Chạy một lần trong Supabase → SQL Editor (sau bước 6).
create table if not exists public.gp_tu_lieu (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  ten_nguoi_gui text,
  tieu_de text not null check (length(trim(tieu_de)) >= 2),
  mo_ta text,
  nguon text not null check (length(trim(nguon)) >= 2),
  nguoi_cung_cap text,
  ngay_thu_thap date,
  loai text not null check (loai in ('anh', 'pdf', 'video', 'am_thanh', 'link')),
  duong_dan text,
  link_ngoai text,
  mime text,
  kich_thuoc bigint,
  nguoi_ids text[] not null default '{}',
  dia_diem_id text,
  muc_hien_thi text not null default 'gia_toc' check (muc_hien_thi in ('rieng_tu', 'gia_toc')),
  trang_thai text not null default 'cho' check (trang_thai in ('cho', 'da_duyet', 'tu_choi')),
  duyet_boi text,
  duyet_luc timestamptz,
  created_at timestamptz not null default now(),
  check (duong_dan is not null or link_ngoai is not null)
);
alter table public.gp_tu_lieu enable row level security;
drop policy if exists tl_gui on public.gp_tu_lieu; drop policy if exists tl_xem on public.gp_tu_lieu;
drop policy if exists tl_duyet on public.gp_tu_lieu; drop policy if exists tl_xoa on public.gp_tu_lieu;
create policy tl_gui on public.gp_tu_lieu for insert to authenticated
  with check (user_id = auth.uid() and trang_thai = 'cho' and muc_hien_thi = 'gia_toc' and public.gp_vai_tro_cua_toi() is not null
              and (duong_dan is null or duong_dan like auth.uid()::text || '/%'));
create policy tl_xem on public.gp_tu_lieu for select to authenticated
  using (user_id = auth.uid() or public.gp_vai_tro_cua_toi() = 'admin'
         or (trang_thai = 'da_duyet' and muc_hien_thi = 'gia_toc' and public.gp_vai_tro_cua_toi() is not null));
create policy tl_duyet on public.gp_tu_lieu for update to authenticated
  using (public.gp_vai_tro_cua_toi() = 'admin') with check (public.gp_vai_tro_cua_toi() = 'admin');
create policy tl_xoa on public.gp_tu_lieu for delete to authenticated
  using (public.gp_vai_tro_cua_toi() = 'admin' or (user_id = auth.uid() and trang_thai = 'cho'));
grant select, insert, update, delete on public.gp_tu_lieu to authenticated;

-- Kho chứa tệp (riêng tư; tối đa 25 MB / tệp). Đường dẫn: <id người tải>/<tên tệp>
insert into storage.buckets (id, name, public, file_size_limit)
values ('gp-tu-lieu', 'gp-tu-lieu', false, 26214400)
on conflict (id) do update set public = false, file_size_limit = 26214400;
drop policy if exists kho_up on storage.objects; drop policy if exists kho_doc on storage.objects; drop policy if exists kho_xoa on storage.objects;
create policy kho_up on storage.objects for insert to authenticated
  with check (bucket_id = 'gp-tu-lieu' and (storage.foldername(name))[1] = auth.uid()::text and public.gp_vai_tro_cua_toi() is not null);
create policy kho_doc on storage.objects for select to authenticated
  using (bucket_id = 'gp-tu-lieu' and (
    (storage.foldername(name))[1] = auth.uid()::text or public.gp_vai_tro_cua_toi() = 'admin'
    or exists (select 1 from public.gp_tu_lieu t where t.duong_dan = name and t.trang_thai = 'da_duyet' and t.muc_hien_thi = 'gia_toc' and public.gp_vai_tro_cua_toi() is not null)));
create policy kho_xoa on storage.objects for delete to authenticated
  using (bucket_id = 'gp-tu-lieu' and (public.gp_vai_tro_cua_toi() = 'admin'
    or ((storage.foldername(name))[1] = auth.uid()::text and exists (select 1 from public.gp_tu_lieu t where t.duong_dan = name and t.trang_thai = 'cho' and t.user_id = auth.uid()))));
