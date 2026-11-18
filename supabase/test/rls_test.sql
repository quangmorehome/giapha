-- Chạy: supabase/test/chay.sh. Mỗi tình huống in PASS/FAIL. Dữ liệu là GIẢ.
\set ON_ERROR_STOP off
\set QUIET on
create or replace function t_ket(ten text, ok boolean) returns void language plpgsql as $$ begin raise notice '% : %', case when ok then 'PASS' else 'FAIL' end, ten; end $$;
create or replace function t_as(uid text) returns void language plpgsql as $$ begin
  perform set_config('request.jwt.claim.sub', coalesce(uid,''), false);
  execute case when uid is null then 'set role anon' else 'set role authenticated' end; end $$;
create or replace function t_loi(sql text) returns boolean language plpgsql as $$ begin execute sql; return false; exception when others then return true; end $$;

-- Dữ liệu (chạy bằng quyền chủ)
reset role;
insert into auth.users(id) values ('00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000e1'),('00000000-0000-0000-0000-0000000000e2'),('00000000-0000-0000-0000-0000000000b1');
insert into persons(id,ten,ho,gioi_tinh,con_song,sinh,mat,chi,muc_hien_thi,the_thu) values
 ('10000000-0000-0000-0000-000000000001','Cụ Mẫu','Tống','nam',false,'{"nam":1900}','{"nam":1970}','A','cong_khai',1),
 ('10000000-0000-0000-0000-000000000002','Ông Mẫu','Tống','nam',true,'{"nam":1960}',null,'A','cong_khai',2),
 ('10000000-0000-0000-0000-000000000003','Bé Mẫu','Tống','nam',true,'{"nam":2020}',null,'A','cong_khai',3),
 ('10000000-0000-0000-0000-000000000004','Riêng Mẫu','Tống','nam',false,'{"nam":1950}','{"nam":2000}','A','rieng_tu',2),
 ('10000000-0000-0000-0000-000000000005','Chi B Mẫu','Tống','nu',false,'{"nam":1940}','{"nam":2010}','B','gia_toc',2),
 ('10000000-0000-0000-0000-000000000006','Ẩn Mẫu','Tống','nam',false,'{"nam":1930}','{"nam":1990}','A','cong_khai',2);
update persons set cha_id='10000000-0000-0000-0000-000000000001' where id in ('10000000-0000-0000-0000-000000000002');
update persons set cha_id='10000000-0000-0000-0000-000000000002' where id='10000000-0000-0000-0000-000000000003';
update persons set da_an=true where id='10000000-0000-0000-0000-000000000006';
update persons set tieu_su='bí mật' where id='10000000-0000-0000-0000-000000000002';
insert into profiles(id,ten_hien_thi,vai_tro,nhanh_chi,person_id) values
 ('00000000-0000-0000-0000-0000000000a1','Admin','admin','{}',null),
 ('00000000-0000-0000-0000-0000000000e1','Editor A','editor','{A}',null),
 ('00000000-0000-0000-0000-0000000000e2','Editor B','editor','{B}',null),
 ('00000000-0000-0000-0000-0000000000b1','Member','member','{}','10000000-0000-0000-0000-000000000002');
insert into events(tieu_de,muc_hien_thi) values ('Sự kiện công khai','cong_khai'),('Sự kiện riêng','rieng_tu');
insert into articles(tieu_de,trang_thai,muc_hien_thi) values ('Bài đã duyệt','da_duyet','cong_khai'),('Bài nháp','nhap','cong_khai');
insert into donations(ten,so_tien) values ('Người ủng hộ',100000);
insert into settings(khoa,gia_tri,cong_khai) values ('ung_ho','"tt"',true),('khoa_bi_mat','"x"',false);

-- 1. KHÁCH
select t_as(null);
select t_ket('Khách: chỉ thấy người công khai, không thấy riêng tư/ẩn', (select count(*) from persons_xem where id in ('10000000-0000-0000-0000-000000000004','10000000-0000-0000-0000-000000000006')) = 1 and (select level from persons_xem where id='10000000-0000-0000-0000-000000000004')='hidden');
select t_ket('Khách: người đã mất công khai thấy đầy đủ', (select level='full' and tieu_su is null from persons_xem where id='10000000-0000-0000-0000-000000000001'));
select t_ket('Khách: người còn sống chỉ thấy cơ bản (không có sinh/tiểu sử)', (select level='basic' and sinh is null and tieu_su is null and ten='Ông Mẫu' from persons_xem where id='10000000-0000-0000-0000-000000000002'));
select t_ket('Khách: trẻ dưới 18 chỉ thấy cơ bản', (select level='basic' and sinh is null from persons_xem where id='10000000-0000-0000-0000-000000000003'));
select t_ket('Khách: hồ sơ đã ẩn không hiện', not exists (select 1 from persons_xem where id='10000000-0000-0000-0000-000000000006'));
select t_ket('Khách: không đọc được bảng persons gốc', t_loi('select * from persons') or (select count(*) from persons)=0);
select t_ket('Khách: không ghi được', t_loi($$insert into persons(ten) values ('x')$$));
select t_ket('Khách: chỉ thấy sự kiện công khai', (select count(*) from events)=1);
select t_ket('Khách: không thấy bài viết, donations, edit_history', t_loi('select 1 from articles') and t_loi('select 1 from donations') and t_loi('select 1 from edit_history'));
select t_ket('Khách: chỉ thấy cài đặt công khai', (select count(*) from settings)=1);
-- 2. MEMBER (liên kết với p2 = Ông Mẫu, chi A)
select t_as('00000000-0000-0000-0000-0000000000b1');
select t_ket('Member: thấy đầy đủ chính mình', (select level='full' and tieu_su='bí mật' from persons_xem where id='10000000-0000-0000-0000-000000000002'));
select t_ket('Member: thấy đầy đủ con mình (gia đình nhỏ)', (select level='full' from persons_xem where id='10000000-0000-0000-0000-000000000003'));
select t_ket('Member: người riêng tư chỉ hiện khung', (select level='hidden' from persons_xem where id='10000000-0000-0000-0000-000000000004'));
select t_ket('Member: chi khác mức gia tộc xem được', (select level='full' from persons_xem where id='10000000-0000-0000-0000-000000000005'));
select t_ket('Member: không ghi persons', t_loi($$update persons set ten='sửa' where id='10000000-0000-0000-0000-000000000002'$$) or (select ten from persons where id='10000000-0000-0000-0000-000000000002')<>'sửa');
select t_ket('Member: không tự nâng vai trò', t_loi($$update profiles set vai_tro='admin' where id='00000000-0000-0000-0000-0000000000b1'$$) or (select vai_tro from profiles where id='00000000-0000-0000-0000-0000000000b1')='member');
select t_ket('Member: chỉ đọc bài đã duyệt', (select count(*) from articles)=1);
select t_ket('Member: không thấy donations', (select count(*) from donations)=0);
select t_ket('Member: gửi được yêu cầu ẩn hồ sơ của mình', not t_loi($$insert into yeu_cau(loai,profile_id,person_id) values ('an_ho_so','00000000-0000-0000-0000-0000000000b1','10000000-0000-0000-0000-000000000002')$$));
select t_ket('Member: không gửi yêu cầu thay người khác', t_loi($$insert into yeu_cau(loai,profile_id) values ('xoa_tai_khoan','00000000-0000-0000-0000-0000000000a1')$$));
-- 3. EDITOR chi A
select t_as('00000000-0000-0000-0000-0000000000e1');
select t_ket('Editor A: sửa được người chi A', not t_loi($$update persons set nghe='thợ mộc' where id='10000000-0000-0000-0000-000000000002'$$));
select t_ket('Editor A: không sửa được người chi B', (with u as (update persons set nghe='x' where id='10000000-0000-0000-0000-000000000005' returning 1) select count(*) from u)=0);
select t_ket('Editor A: thêm người chi A', not t_loi($$insert into persons(ten,chi) values ('Mới','A')$$));
select t_ket('Editor A: người mới mặc định riêng tư', (select muc_hien_thi='rieng_tu' from persons where ten='Mới'));
select t_ket('Editor A: không thêm người chi B', t_loi($$insert into persons(ten,chi) values ('Lạc','B')$$));
select t_ket('Editor A: thấy hồ sơ đã ẩn trong chi mình', exists (select 1 from persons_xem where id='10000000-0000-0000-0000-000000000006'));
select t_ket('Editor A: chỉ viết nháp, không duyệt', not t_loi($$insert into articles(tieu_de,trang_thai) values ('N','nhap')$$) and t_loi($$insert into articles(tieu_de,trang_thai) values ('D','da_duyet')$$));
select t_ket('Editor A: không ghi settings/events/donations', t_loi($$insert into settings(khoa,gia_tri) values ('k','1')$$) and t_loi($$insert into events(tieu_de) values ('e')$$) and t_loi($$insert into donations(ten) values ('d')$$));
select t_ket('Editor A: không đổi vai trò', t_loi($$update profiles set vai_tro='admin'$$) or (select count(*) from profiles where vai_tro='admin' and id<>'00000000-0000-0000-0000-0000000000a1')=0);
select t_ket('Editor A: không đọc nhật ký', (select count(*) from edit_history)=0);
select t_ket('Không tạo vòng cha-con (cụ làm con của cháu)', t_loi($$update persons set cha_id='10000000-0000-0000-0000-000000000003' where id='10000000-0000-0000-0000-000000000001'$$));
select t_ket('Không tự làm cha mình', t_loi($$update persons set cha_id=id where id='10000000-0000-0000-0000-000000000002'$$));
-- 4. ADMIN
select t_as('00000000-0000-0000-0000-0000000000a1');
select t_ket('Admin: thấy mọi người kể cả đã ẩn', (select count(*) from persons)>=7);
select t_ket('Admin: ẩn hồ sơ được (không xoá)', not t_loi($$update persons set da_an=true where id='10000000-0000-0000-0000-000000000005'$$));
select t_ket('Admin: KHÔNG xoá được persons', t_loi($$delete from persons where id='10000000-0000-0000-0000-000000000005'$$) and (select count(*) from persons where id='10000000-0000-0000-0000-000000000005')=1);
select t_ket('Admin: không truncate', t_loi('truncate persons'));
select t_ket('Admin: duyệt bài được', not t_loi($$update articles set trang_thai='da_duyet' where tieu_de='Bài nháp'$$));
select t_ket('Admin: đổi vai trò được', not t_loi($$update profiles set vai_tro='editor' where id='00000000-0000-0000-0000-0000000000b1'$$));
select t_ket('Admin: nhật ký có dòng sửa với ai/cũ/mới', exists (select 1 from edit_history where bang='persons' and hanh_dong='update' and ai='00000000-0000-0000-0000-0000000000a1' and thay_doi ? 'cu' and thay_doi ? 'moi'));
select t_ket('Admin: KHÔNG sửa/xoá được nhật ký', t_loi('update edit_history set bang=''x''') and t_loi('delete from edit_history'));
select t_ket('Admin: đọc donations', (select count(*) from donations)=1);
-- 5. Ảnh gốc
reset role;
insert into media(tieu_de,duong_dan_hien_thi,duong_dan_goc,muc_hien_thi) values ('Ảnh','hien.jpg','goc.jpg','cong_khai');
select t_as(null);
select t_ket('Khách: không đọc được đường dẫn ảnh gốc (cột bị chặn)', t_loi('select duong_dan_goc from media') and (select duong_dan_goc is null from media_xem limit 1));
select t_as('00000000-0000-0000-0000-0000000000a1');
select t_ket('Admin: đọc được đường dẫn ảnh gốc qua media_xem', (select duong_dan_goc='goc.jpg' from media_xem limit 1));

-- 6. Toạ độ địa điểm (migration 0002)
reset role;
insert into sites(id,ten,loai,vi_do,kinh_do,muc_hien_thi) values ('20000000-0000-0000-0000-000000000001','Nhà thờ tổ mẫu','nha_tho_to',21.0285,105.8542,'cong_khai'),('20000000-0000-0000-0000-000000000002','Mộ tổ mẫu','mo_to',21.06,105.81,'rieng_tu');
select t_as(null);
select t_ket('Khách: chỉ thấy toạ độ địa điểm công khai', (select count(*) from sites where vi_do is not null)=1);
select t_as('00000000-0000-0000-0000-0000000000a1');
select t_ket('Admin: thấy cả toạ độ riêng tư', (select count(*) from sites where vi_do is not null)=2);
select t_ket('Toạ độ phải đủ cặp vĩ-kinh độ', t_loi($$update sites set vi_do=null where ten='Nhà thờ tổ mẫu'$$));
select t_ket('Vĩ độ ngoài khoảng bị từ chối', t_loi($$update sites set vi_do=123 where ten='Nhà thờ tổ mẫu'$$));
select t_ket('Loại địa điểm lạ bị từ chối', t_loi($$update sites set loai='la' where ten='Nhà thờ tổ mẫu'$$));
