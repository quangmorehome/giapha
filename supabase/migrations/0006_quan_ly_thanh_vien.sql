-- Gia phả số v1.15: Quản trị tự thêm / đổi / thu hồi vai trò Quản trị, Biên tập ngay trên web (không cần gõ SQL nữa).
-- Tài khoản (email + mật khẩu) vẫn tạo ở Supabase → Authentication → Users → Add user.
-- Hai hàm dưới đây chỉ chạy được khi người gọi đang là Quản trị (kiểm tra ngay trong hàm).

create or replace function public.gp_ds_thanh_vien()
returns table (r_user_id uuid, r_email text, r_vai_tro text, r_ten text, r_tao_luc timestamptz)
language plpgsql stable security definer set search_path = public, auth as
$$
begin
  if public.gp_vai_tro_cua_toi() is distinct from 'admin' then
    raise exception 'Chỉ Quản trị mới xem được danh sách thành viên' using errcode = '42501';
  end if;
  return query
    select u.id, u.email::text, v.vai_tro, v.ten, u.created_at
    from auth.users u
    left join public.gp_vai_tro v on v.user_id = u.id
    order by case v.vai_tro when 'admin' then 0 when 'editor' then 1 else 2 end, u.created_at;
end
$$;

create or replace function public.gp_dat_vai_tro(p_user uuid, p_vai_tro text, p_ten text default null)
returns void
language plpgsql security definer set search_path = public, auth as
$$
declare
  cu text;
  n_admin int;
begin
  if public.gp_vai_tro_cua_toi() is distinct from 'admin' then
    raise exception 'Chỉ Quản trị mới đổi được vai trò' using errcode = '42501';
  end if;
  if p_vai_tro not in ('admin', 'editor', 'none') then
    raise exception 'Vai trò không hợp lệ';
  end if;
  if not exists (select 1 from auth.users where id = p_user) then
    raise exception 'Không có tài khoản này';
  end if;
  select vai_tro into cu from public.gp_vai_tro where user_id = p_user;
  if cu = 'admin' and p_vai_tro <> 'admin' then
    select count(*) into n_admin from public.gp_vai_tro where vai_tro = 'admin';
    if n_admin <= 1 then
      raise exception 'Phải còn ít nhất một Quản trị';
    end if;
  end if;
  if p_vai_tro = 'none' then
    delete from public.gp_vai_tro where user_id = p_user;
  else
    insert into public.gp_vai_tro (user_id, vai_tro, ten)
    values (p_user, p_vai_tro, nullif(trim(coalesce(p_ten, '')), ''))
    on conflict (user_id) do update
      set vai_tro = excluded.vai_tro,
          ten = coalesce(excluded.ten, public.gp_vai_tro.ten);
  end if;
end
$$;

revoke all on function public.gp_ds_thanh_vien() from public, anon;
revoke all on function public.gp_dat_vai_tro(uuid, text, text) from public, anon;
grant execute on function public.gp_ds_thanh_vien() to authenticated;
grant execute on function public.gp_dat_vai_tro(uuid, text, text) to authenticated;
