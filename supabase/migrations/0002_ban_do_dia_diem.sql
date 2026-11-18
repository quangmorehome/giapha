-- Migration 0002 · Toạ độ và chỉ dẫn cho địa điểm (nhà thờ tổ, mộ tổ, khu lăng mộ…).
-- Quyền xem vẫn theo RLS của bảng sites (muc_hien_thi). Toạ độ mộ phần là thông tin nhạy cảm: mặc định mức Riêng tư.
alter table sites
  add column vi_do double precision check (vi_do between -90 and 90),
  add column kinh_do double precision check (kinh_do between -180 and 180),
  add column td_chac muc_chac not null default 'chua_chac',      -- độ chắc chắn của toạ độ (đã ra tận nơi ghim GPS chưa)
  add column duong_di text, add column gio_tham_vieng text, add column lien_he text,
  add constraint sites_td_du check ((vi_do is null) = (kinh_do is null));  -- có cả hai hoặc không có
alter table sites alter column loai drop default;
alter table sites add constraint sites_loai check (loai is null or loai in ('nha_tho_to','tu_duong','nha_tho','mo_to','mo','khu_lang_mo','chua_dinh','nha_cu','khac'));
