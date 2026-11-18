-- Gia phả số v1.26: Quản trị / Biên tập tự gắn tài khoản của mình với một hồ sơ cá nhân.
-- Chạy một lần trong Supabase → SQL Editor (sau bước 4). Người nhà KHÔNG tự gắn được (do Quản trị gắn).
create or replace function public.gp_gan_ho_so_minh(p_nguoi text)
returns void
language plpgsql security definer set search_path = public, auth as
$$
declare vt text;
begin
  vt := public.gp_vai_tro_cua_toi();
  if vt is null or vt not in ('admin', 'editor') then
    raise exception 'Chỉ Quản trị hoặc Biên tập mới tự gắn hồ sơ được' using errcode = '42501';
  end if;
  if coalesce(trim(p_nguoi), '') = '' then raise exception 'Chưa chọn hồ sơ cá nhân'; end if;
  update public.gp_vai_tro set nguoi_id = trim(p_nguoi) where user_id = auth.uid();
end
$$;
revoke all on function public.gp_gan_ho_so_minh(text) from public, anon;
grant execute on function public.gp_gan_ho_so_minh(text) to authenticated;
