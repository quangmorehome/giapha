-- Gia phả số v1.24: MỌI tài khoản (Quản trị, Biên tập, Người nhà) đều phải gắn với một hồ sơ cá nhân.
-- Chạy một lần trong Supabase → SQL Editor (sau bước 3).
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
  if p_vai_tro <> 'none' and coalesce(trim(p_nguoi), '') = '' then raise exception 'Tài khoản phải được gắn với một hồ sơ cá nhân'; end if;
  if not exists (select 1 from auth.users where id = p_user) then raise exception 'Không có tài khoản này'; end if;
  select vai_tro into cu from public.gp_vai_tro where user_id = p_user;
  if cu = 'admin' and p_vai_tro <> 'admin' then
    select count(*) into n_admin from public.gp_vai_tro where vai_tro = 'admin';
    if n_admin <= 1 then raise exception 'Phải còn ít nhất một Quản trị'; end if;
  end if;
  if p_vai_tro <> 'member' then delete from public.gp_nguoi_nha where user_id = p_user; end if;
  if p_vai_tro = 'none' then
    delete from public.gp_vai_tro where user_id = p_user;
  else
    insert into public.gp_vai_tro (user_id, vai_tro, ten, nguoi_id)
    values (p_user, p_vai_tro, nullif(trim(coalesce(p_ten, '')), ''), trim(p_nguoi))
    on conflict (user_id) do update
      set vai_tro = excluded.vai_tro, ten = coalesce(excluded.ten, public.gp_vai_tro.ten), nguoi_id = excluded.nguoi_id;
  end if;
end
$$;
revoke all on function public.gp_dat_vai_tro(uuid, text, text, text) from public, anon;
grant execute on function public.gp_dat_vai_tro(uuid, text, text, text) to authenticated;
