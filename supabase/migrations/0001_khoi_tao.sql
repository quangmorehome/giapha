-- Gia phả số · Migration 0001 · khởi tạo bảng, quyền (RLS), view che thông tin, nhật ký chỉ-thêm.
-- TÌNH TRẠNG: đã chạy thử trên PostgreSQL 16 cục bộ với auth.uid() giả (xem supabase/test/). CHƯA chạy trên Supabase thật.
-- Nguyên tắc: bảo vệ nằm ở cơ sở dữ liệu (hiến chương 8–10), không dựa vào việc trình duyệt tự ẩn.
-- Không bao giờ tắt RLS "cho nhanh". Không có DELETE: chỉ ẩn (da_an).

create type vai_tro      as enum ('admin','editor','member');
create type muc_hien_thi as enum ('rieng_tu','gia_dinh_nho','dai_gia_dinh','gia_toc','cong_khai'); -- thứ tự = độ rộng tăng dần
create type muc_chac     as enum ('da_xac_minh','chua_chac','truyen_mieng');
create type gioi_tinh    as enum ('nam','nu');

-- ---------- Bảng ----------
create table persons (
  id uuid primary key default gen_random_uuid(),
  ho text, ten_dem text, ten text not null, ten_thuong_goi text, ten_huy text, ten_thuy text, ten_han_nom text, dao_hieu text,
  gioi_tinh gioi_tinh,
  sinh jsonb, mat jsonb,                       -- {nam, den_nam, thang, ngay, lich:'am'|'duong', nhuan, xap_xi}
  con_song boolean not null default true,
  gio_ngay_am smallint check (gio_ngay_am between 1 and 30), gio_thang_am smallint check (gio_thang_am between 1 and 12), gio_nhuan boolean default false,
  the_thu int, thu_tu_con int, chi text,       -- đời, thứ tự con, chi: do người nhập quyết định, hệ thống không suy ra
  cha_id uuid references persons(id), me_id uuid references persons(id), me_ten text,
  nghe text, noi_sinh text, noi_an_tang text, tieu_su text, anh_dai_dien text,
  nguon text, muc_chac_chan muc_chac not null default 'chua_chac', chung_cu jsonb,   -- chung_cu: nguồn/độ chắc theo từng trường
  muc_hien_thi muc_hien_thi not null default 'rieng_tu',                         -- bản ghi mới luôn Riêng tư
  da_dong_y_tre_em boolean not null default false,
  da_an boolean not null default false,
  tao_boi uuid, tao_luc timestamptz not null default now(), schema int not null default 2,
  check (cha_id is distinct from id and me_id is distinct from id)
);
create index on persons(cha_id); create index on persons(me_id); create index on persons(chi);

create table spouses (
  id uuid primary key default gen_random_uuid(),
  person_id uuid not null references persons(id), ten text, spouse_person_id uuid references persons(id),
  thu_tu int not null default 1, tinh_trang text not null default 'dang_o' check (tinh_trang in ('dang_o','da_mat','ly_hon')), ghi_chu text,
  da_an boolean not null default false
);
create table events  (id uuid primary key default gen_random_uuid(), nam_hien_thi text, nam_sap_xep int, tieu_de text not null, noi_dung text, nguon text, muc_chac_chan muc_chac not null default 'chua_chac', muc_hien_thi muc_hien_thi not null default 'rieng_tu', da_an boolean not null default false);
create table sites   (id uuid primary key default gen_random_uuid(), ten text not null, loai text, nam_xay text, dia_chi text, gioi_thieu text, nguon text, muc_chac_chan muc_chac not null default 'chua_chac', muc_hien_thi muc_hien_thi not null default 'rieng_tu', da_an boolean not null default false);
create table media   (id uuid primary key default gen_random_uuid(), tieu_de text not null, ai text, o_dau text, nam text, nguon text, loai text default 'anh', duong_dan_hien_thi text, duong_dan_goc text, muc_hien_thi muc_hien_thi not null default 'rieng_tu', chi text, da_an boolean not null default false);
create table articles(id uuid primary key default gen_random_uuid(), tieu_de text not null, noi_dung text, trang_thai text not null default 'nhap' check (trang_thai in ('nhap','da_duyet')), nguoi_duyet uuid, muc_hien_thi muc_hien_thi not null default 'gia_toc', tac_gia uuid, da_an boolean not null default false);
create table donations(id uuid primary key default gen_random_uuid(), ten text, so_tien numeric, ngay date, loi_nhan text, dong_y_hien_ten boolean not null default false, da_an boolean not null default false);
create table settings(khoa text primary key, gia_tri jsonb, cong_khai boolean not null default false);
create table profiles(id uuid primary key references auth.users(id), ten_hien_thi text not null, vai_tro vai_tro not null default 'member', nhanh_chi text[] not null default '{}', person_id uuid references persons(id), da_xoa boolean not null default false);
create table yeu_cau (id uuid primary key default gen_random_uuid(), loai text not null check (loai in ('an_ho_so','xoa_tai_khoan')), profile_id uuid references profiles(id), person_id uuid references persons(id), luc timestamptz not null default now(), xong boolean not null default false);
create table edit_history(id bigint generated always as identity primary key, bang text not null, ban_ghi_id text not null, hanh_dong text not null, thay_doi jsonb, ai uuid, luc timestamptz not null default now());

-- ---------- Hàm trợ giúp (security definer: đọc profiles bất kể RLS) ----------
create function gp_role() returns text language sql stable security definer set search_path=public as
$$ select coalesce((select vai_tro::text from profiles where id = auth.uid() and not da_xoa), 'khach') $$;
create function gp_chi() returns text[] language sql stable security definer set search_path=public as
$$ select coalesce((select nhanh_chi from profiles where id = auth.uid() and not da_xoa), '{}') $$;
create function gp_me() returns uuid language sql stable security definer set search_path=public as
$$ select (select person_id from profiles where id = auth.uid() and not da_xoa) $$;

-- Gia đình nhỏ của người xem: bản thân, cha mẹ, con, anh chị em, vợ chồng
create function gp_gia_dinh_nho(pid uuid) returns boolean language sql stable security definer set search_path=public as $$
  select exists (select 1 from persons m where m.id = gp_me() and (
      m.id = pid or m.cha_id = pid or m.me_id = pid
      or exists (select 1 from persons q where q.id = pid and (q.cha_id = m.id or q.me_id = m.id
          or (m.cha_id is not null and q.cha_id = m.cha_id) or (m.me_id is not null and q.me_id = m.me_id)))
      or exists (select 1 from spouses s where not s.da_an and ((s.person_id = m.id and s.spouse_person_id = pid) or (s.spouse_person_id = m.id and s.person_id = pid)))));
$$;

-- Độ gần: admin -2, editor trong nhánh -1, bản thân 0, gia đình nhỏ 1, cùng chi 2, đã đăng nhập 3, khách 4 (giống src/privacy.js)
create function gp_gan(p persons) returns int language plpgsql stable security definer set search_path=public as $$
declare r text := gp_role(); me uuid := gp_me(); mychi text[] := gp_chi(); mp persons;
begin
  if r = 'admin' then return -2; end if;
  if r = 'editor' and p.chi = any(mychi) then return -1; end if;
  if me is not null and me = p.id then return 0; end if;
  if me is not null and gp_gia_dinh_nho(p.id) then return 1; end if;
  if me is not null then select * into mp from persons where id = me; end if;
  if p.chi is not null and (p.chi = any(mychi) or (mp.id is not null and mp.chi = p.chi)) then return 2; end if;
  return case when r = 'khach' then 4 else 3 end;
end $$;

create function gp_bac(m muc_hien_thi) returns int language sql immutable as
$$ select case m when 'rieng_tu' then 0 when 'gia_dinh_nho' then 1 when 'dai_gia_dinh' then 2 when 'gia_toc' then 3 else 4 end $$;

create function gp_la_tre(p persons) returns boolean language sql stable as
$$ select p.con_song and (p.sinh->>'nam') ~ '^[0-9]+$' and extract(year from now())::int - (p.sinh->>'nam')::int < 18 $$;

-- Mức xem: 'none' | 'hidden' | 'basic' | 'full'
create function gp_muc_xem(p persons) returns text language plpgsql stable security definer set search_path=public as $$
declare r text := gp_role(); c int;
begin
  if p.da_an and r not in ('admin','editor') then return 'none'; end if;
  c := gp_gan(p);
  if p.da_an and c > -1 then return 'none'; end if;       -- editor ngoài nhánh cũng không thấy hồ sơ ẩn
  if c > gp_bac(p.muc_hien_thi) then return 'hidden'; end if;
  if (p.con_song or gp_la_tre(p)) and not p.da_dong_y_tre_em and c >= 3 then return 'basic'; end if;
  return 'full';
end $$;

-- Quyền theo mức hiển thị cho bảng không gắn người
create function gp_xem_muc(m muc_hien_thi, chi text default null) returns boolean language sql stable security definer set search_path=public as $$
  select case gp_role() when 'admin' then true when 'editor' then true
         when 'member' then gp_bac(m) >= 3 or (chi is not null and chi = any(gp_chi()))
         else gp_bac(m) >= 4 end $$;
create function gp_admin() returns boolean language sql stable as $$ select gp_role() = 'admin' $$;
create function gp_editor_nhanh(c text) returns boolean language sql stable as $$ select gp_role() = 'admin' or (gp_role() = 'editor' and c = any(gp_chi())) $$;

-- ---------- Bật RLS (mọi bảng) ----------
alter table persons enable row level security;   alter table spouses enable row level security;  alter table events enable row level security;
alter table sites enable row level security;     alter table media enable row level security;    alter table articles enable row level security;
alter table donations enable row level security; alter table settings enable row level security; alter table profiles enable row level security;
alter table yeu_cau enable row level security;   alter table edit_history enable row level security;
alter table persons force row level security;    alter table edit_history force row level security;

-- persons: bảng gốc chỉ trả hàng người xem được xem ĐẦY ĐỦ; phần cơ bản/khung đi qua view persons_xem
create policy persons_doc on persons for select using (gp_muc_xem(persons) = 'full');
create policy persons_them on persons for insert with check (gp_role() in ('admin','editor') and gp_editor_nhanh(chi) and muc_hien_thi = 'rieng_tu' or gp_admin());
create policy persons_sua  on persons for update using (gp_editor_nhanh(chi)) with check (gp_editor_nhanh(chi));
-- spouses
create policy spouses_doc on spouses for select using (exists (select 1 from persons p where p.id = person_id and gp_muc_xem(p) = 'full') and not da_an or gp_role() in ('admin','editor'));
create policy spouses_ghi on spouses for insert with check (exists (select 1 from persons p where p.id = person_id and gp_editor_nhanh(p.chi)));
create policy spouses_sua on spouses for update using (exists (select 1 from persons p where p.id = person_id and gp_editor_nhanh(p.chi))) with check (exists (select 1 from persons p where p.id = person_id and gp_editor_nhanh(p.chi)));
-- events, sites: đọc theo mức; chỉ Admin ghi
create policy events_doc on events for select using ((not da_an and gp_xem_muc(muc_hien_thi)) or gp_admin());
create policy events_ghi on events for insert with check (gp_admin());  create policy events_sua on events for update using (gp_admin()) with check (gp_admin());
create policy sites_doc on sites for select using ((not da_an and gp_xem_muc(muc_hien_thi)) or gp_admin());
create policy sites_ghi on sites for insert with check (gp_admin());    create policy sites_sua on sites for update using (gp_admin()) with check (gp_admin());
-- media: Editor ghi trong nhánh được giao
create policy media_doc on media for select using ((not da_an and gp_xem_muc(muc_hien_thi, chi)) or gp_editor_nhanh(chi));
create policy media_ghi on media for insert with check (gp_editor_nhanh(chi));  create policy media_sua on media for update using (gp_editor_nhanh(chi)) with check (gp_editor_nhanh(chi));
-- articles: Editor chỉ viết bản nháp, Admin duyệt
create policy articles_doc on articles for select using ((not da_an and trang_thai = 'da_duyet' and gp_xem_muc(muc_hien_thi)) or gp_role() in ('admin','editor'));
create policy articles_ghi on articles for insert with check (gp_admin() or (gp_role() = 'editor' and trang_thai = 'nhap'));
create policy articles_sua on articles for update using (gp_admin() or (gp_role() = 'editor' and trang_thai = 'nhap')) with check (gp_admin() or (gp_role() = 'editor' and trang_thai = 'nhap'));
-- donations, profiles, settings
create policy donations_admin on donations for all using (gp_admin()) with check (gp_admin());
create policy settings_doc on settings for select using (cong_khai or gp_admin());
create policy settings_ghi on settings for insert with check (gp_admin());  create policy settings_sua on settings for update using (gp_admin()) with check (gp_admin());
create policy profiles_doc on profiles for select using (id = auth.uid() or gp_admin());
create policy profiles_ghi on profiles for insert with check (gp_admin());  create policy profiles_sua on profiles for update using (gp_admin()) with check (gp_admin());
-- yêu cầu của người dùng (ẩn hồ sơ / xoá tài khoản)
create policy yc_doc on yeu_cau for select using (profile_id = auth.uid() or gp_admin());
create policy yc_gui on yeu_cau for insert with check (profile_id = auth.uid() and gp_role() <> 'khach');
create policy yc_xuly on yeu_cau for update using (gp_admin()) with check (gp_admin());
-- nhật ký: chỉ Admin đọc; ghi chỉ qua trigger
create policy nk_doc on edit_history for select using (gp_admin());

-- ---------- View che thông tin: người còn sống / dưới 18 chỉ lộ họ tên và quan hệ ----------
create view persons_xem as
select p.id,
  m.muc as level,
  case when m.muc <> 'none' then p.cha_id end as cha_id,
  case when m.muc <> 'none' then p.me_id end as me_id,
  case when m.muc in ('basic','full') then p.ho end as ho, case when m.muc in ('basic','full') then p.ten_dem end as ten_dem, case when m.muc in ('basic','full') then p.ten end as ten,
  case when m.muc in ('basic','full') then p.gioi_tinh end as gioi_tinh, case when m.muc in ('basic','full') then p.the_thu end as the_thu,
  case when m.muc in ('basic','full') then p.chi end as chi, case when m.muc in ('basic','full') then p.thu_tu_con end as thu_tu_con, case when m.muc in ('basic','full') then p.con_song end as con_song,
  case when m.muc in ('basic','full') then p.muc_hien_thi end as muc_hien_thi, case when m.muc in ('basic','full') then p.da_an end as da_an,
  case when m.muc = 'full' then p.ten_thuong_goi end as ten_thuong_goi, case when m.muc = 'full' then p.ten_huy end as ten_huy, case when m.muc = 'full' then p.ten_thuy end as ten_thuy,
  case when m.muc = 'full' then p.ten_han_nom end as ten_han_nom, case when m.muc = 'full' then p.dao_hieu end as dao_hieu,
  case when m.muc = 'full' then p.sinh end as sinh, case when m.muc = 'full' then p.mat end as mat,
  case when m.muc = 'full' then p.gio_ngay_am end as gio_ngay_am, case when m.muc = 'full' then p.gio_thang_am end as gio_thang_am, case when m.muc = 'full' then p.gio_nhuan end as gio_nhuan,
  case when m.muc = 'full' then p.me_ten end as me_ten, case when m.muc = 'full' then p.nghe end as nghe, case when m.muc = 'full' then p.noi_sinh end as noi_sinh,
  case when m.muc = 'full' then p.noi_an_tang end as noi_an_tang, case when m.muc = 'full' then p.tieu_su end as tieu_su, case when m.muc = 'full' then p.anh_dai_dien end as anh_dai_dien,
  case when m.muc = 'full' then p.nguon end as nguon, case when m.muc = 'full' then p.muc_chac_chan end as muc_chac_chan, case when m.muc = 'full' then p.chung_cu end as chung_cu
from persons p cross join lateral (select gp_muc_xem(p) as muc) m
where m.muc <> 'none';
-- p được đọc bằng quyền chủ view (bỏ qua RLS bảng gốc) vì lọc đã nằm trong gp_muc_xem. KHÔNG đặt security_invoker.

-- ---------- Quyền ở mức bảng ----------
revoke all on all tables in schema public from anon, authenticated;
grant select on persons_xem to anon, authenticated;
grant select on persons, spouses, events, sites, media, articles, settings, profiles, yeu_cau, edit_history to authenticated;
grant insert, update on persons, spouses, events, sites, media, articles, settings, profiles, yeu_cau, donations to authenticated;
grant select on donations to authenticated;
grant select on events, sites, settings to anon;      -- RLS vẫn giới hạn hàng; khách chỉ thấy mức công khai
grant select on spouses to anon;
-- KHÔNG có quyền delete cho ai.

-- ---------- Không xoá ----------
create function gp_cam_xoa() returns trigger language plpgsql as $$ begin raise exception 'Không được xoá dữ liệu: chỉ ẩn (da_an). Bảng %', tg_table_name using errcode = '42501'; end $$;
create trigger khong_xoa before delete or truncate on persons    for each statement execute function gp_cam_xoa();
create trigger khong_xoa_r before delete on persons    for each row execute function gp_cam_xoa();
create trigger khong_xoa before delete on spouses    for each row execute function gp_cam_xoa();
create trigger khong_xoa before delete on events     for each row execute function gp_cam_xoa();
create trigger khong_xoa before delete on sites      for each row execute function gp_cam_xoa();
create trigger khong_xoa before delete on media      for each row execute function gp_cam_xoa();
create trigger khong_xoa before delete on articles   for each row execute function gp_cam_xoa();
create trigger khong_xoa before delete on donations  for each row execute function gp_cam_xoa();
create trigger khong_xoa before delete on profiles   for each row execute function gp_cam_xoa();
create trigger khong_xoa before delete on edit_history for each row execute function gp_cam_xoa();
create trigger khong_sua before update on edit_history for each row execute function gp_cam_xoa();

-- ---------- Không tạo vòng cha/mẹ ----------
create function gp_chong_vong() returns trigger language plpgsql as $$
declare cur uuid; n int := 0;
begin
  foreach cur in array array[new.cha_id, new.me_id] loop
    while cur is not null and n < 1000 loop
      if cur = new.id then raise exception 'Cha/mẹ tạo thành vòng tròn' using errcode = '23514'; end if;
      select coalesce(cha_id, me_id) into cur from persons where id = cur; n := n + 1;
    end loop;
    n := 0;
  end loop;
  return new;
end $$;
create trigger chong_vong before insert or update of cha_id, me_id on persons for each row execute function gp_chong_vong();

-- ---------- Nhật ký tự ghi (ai, lúc nào, cũ, mới) ----------
create function gp_ghi_nhat_ky() returns trigger language plpgsql security definer set search_path=public as $$
declare k text;
begin
  k := case tg_op when 'INSERT' then (to_jsonb(new)->>'id') else (to_jsonb(new)->>'id') end;
  insert into edit_history(bang, ban_ghi_id, hanh_dong, thay_doi, ai)
  values (tg_table_name, coalesce(k, to_jsonb(new)->>'khoa'), lower(tg_op),
          jsonb_build_object('cu', case when tg_op = 'UPDATE' then to_jsonb(old) end, 'moi', to_jsonb(new)), auth.uid());
  return new;
end $$;
create trigger nk after insert or update on persons  for each row execute function gp_ghi_nhat_ky();
create trigger nk after insert or update on spouses  for each row execute function gp_ghi_nhat_ky();
create trigger nk after insert or update on events   for each row execute function gp_ghi_nhat_ky();
create trigger nk after insert or update on sites    for each row execute function gp_ghi_nhat_ky();
create trigger nk after insert or update on media    for each row execute function gp_ghi_nhat_ky();
create trigger nk after insert or update on articles for each row execute function gp_ghi_nhat_ky();
create trigger nk after insert or update on donations for each row execute function gp_ghi_nhat_ky();
create trigger nk after insert or update on profiles for each row execute function gp_ghi_nhat_ky();
create trigger nk after insert or update on settings for each row execute function gp_ghi_nhat_ky();
create trigger nk after insert or update on yeu_cau  for each row execute function gp_ghi_nhat_ky();
-- người tạo
create function gp_tao_boi() returns trigger language plpgsql as $$ begin new.tao_boi := coalesce(new.tao_boi, auth.uid()); return new; end $$;
create trigger tao_boi before insert on persons for each row execute function gp_tao_boi();
-- Editor không được tự nâng vai trò: profiles chỉ Admin ghi (policy ở trên).
-- Ảnh gốc (media.duong_dan_goc): chỉ Admin được đọc cột này -> lộ qua view media_xem, không qua bảng gốc.
create view media_xem as select id, tieu_de, ai, o_dau, nam, nguon, loai, duong_dan_hien_thi, muc_hien_thi, chi, da_an,
  case when gp_admin() then duong_dan_goc end as duong_dan_goc from media;
grant select on media_xem to anon, authenticated;
revoke select (duong_dan_goc) on media from authenticated;
