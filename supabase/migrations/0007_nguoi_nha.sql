-- Gia phả số v1.21: vai trò "Người nhà" (member) – đăng nhập xem thông tin theo hồ sơ cá nhân được gán.
-- Cách hoạt động an toàn: Quản trị (trên web) tự soạn cho MỖI người nhà một bản dữ liệu đã lọc riêng tư theo
-- đúng quan hệ của người đó, lưu ở bảng gp_nguoi_nha. Người nhà chỉ ĐỌC được dòng của chính mình (RLS),
-- tuyệt đối không đọc được bản đầy đủ gp_rieng. Chạy một lần trong Supabase → SQL Editor.

alter table public.gp_vai_tro drop constraint if exists gp_vai_tro_vai_tro_check;
alter table public.gp_vai_tro add constraint gp_vai_tro_vai_tro_check check (vai_tro in ('admin','editor','member'));
alter table public.gp_vai_tro add column if not exists nguoi_id text;   -- mã hồ sơ cá nhân gắn với tài khoản (chỉ dùng cho 'member')

create table if not exists public.gp_nguoi_nha (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);
alter table public.gp_nguoi_nha enable row level security;
drop policy if exists nn_doc_cua_toi on public.gp_nguoi_nha;
drop policy if exists nn_admin_ghi on public.gp_nguoi_nha;
create policy nn_doc_cua_toi on public.gp_nguoi_nha for select to authenticated using (user_id = auth.uid());
create policy nn_admin_ghi on public.gp_nguoi_nha for all to authenticated
  using (public.gp_vai_tro_cua_toi() = 'admin') with check (public.gp_vai_tro_cua_toi() = 'admin');

drop function if exists public.gp_ds_thanh_vien();
create or replace function public.gp_ds_thanh_vien()
returns table (r_user_id uuid, r_email text, r_vai_tro text, r_ten text, r_tao_luc timestamptz, r_nguoi_id text)
language plpgsql stable security definer set search_path = public, auth as
$$
begin
  if public.gp_vai_tro_cua_toi() is distinct from 'admin' then
    raise exception 'Chỉ Quản trị mới xem được danh sách thành viên' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, v.vai_tro, v.ten, u.created_at, v.nguoi_id
    from auth.users u left join public.gp_vai_tro v on v.user_id = u.id
    order by case v.vai_tro when 'admin' then 0 when 'editor' then 1 when 'member' then 2 else 3 end, u.created_at;
end
$$;

drop function if exists public.gp_dat_vai_tro(uuid, text, text);
create or replace function public.gp_dat_vai_tro(p_user uuid, p_vai_tro text, p_ten text default null, p_nguoi text default null)
returns void
language plpgsql security definer set search_path = public, auth as
$$
declare cu text; n_admin int;
begin
  if public.gp_vai_tro_cua_toi() is distinct from 'admin' then
    raise exception 'Chỉ Quản trị mới đổi được vai trò' using errcode = '42501';
  end if;
  if p_vai_tro not in ('admin', 'editor', 'member', 'none') then raise exception 'Vai trò không hợp lệ'; end if;
  if p_vai_tro = 'member' and coalesce(trim(p_nguoi), '') = '' then raise exception 'Người nhà phải được gán với một hồ sơ cá nhân'; end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'Không có tài khoản này'; end if;
  select vai_tro into cu from public.gp_vai_tro where user_id = p_user;
  if cu = 'admin' and p_vai_tro <> 'admin' then
    select count(*) into n_admin from public.gp_vai_tro where vai_tro = 'admin';
    if n_admin <= 1 then raise exception 'Phải còn ít nhất một Quản trị'; end if;
  end if;
  if p_vai_tro = 'none' or p_vai_tro <> 'member' then delete from public.gp_nguoi_nha where user_id = p_user; end if;
  if p_vai_tro = 'none' then
    delete from public.gp_vai_tro where user_id = p_user;
  else
    insert into public.gp_vai_tro (user_id, vai_tro, ten, nguoi_id)
    values (p_user, p_vai_tro, nullif(trim(coalesce(p_ten, '')), ''), case when p_vai_tro = 'member' then trim(p_nguoi) end)
    on conflict (user_id) do update
      set vai_tro = excluded.vai_tro, ten = coalesce(excluded.ten, public.gp_vai_tro.ten),
          nguoi_id = case when excluded.vai_tro = 'member' then excluded.nguoi_id end;
  end if;
end
$$;

revoke all on function public.gp_ds_thanh_vien() from public, anon;
revoke all on function public.gp_dat_vai_tro(uuid, text, text, text) from public, anon;
grant execute on function public.gp_ds_thanh_vien() to authenticated;
grant execute on function public.gp_dat_vai_tro(uuid, text, text, text) to authenticated;
