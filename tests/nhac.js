const {chromium}=require('playwright'),assert=require('assert'),path=require('path');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},acceptDownloads:true});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{try{localStorage.setItem('gp.viewer','u_admin')}catch(e){}});
await pg.goto('file://'+path.join(__dirname,'../dist/_khung_thu.html'));await pg.waitForTimeout(800);
await pg.evaluate(()=>{const S=GP.store,td=GP.ui.today(),j=GP.lunar.jdFromDate(td[0],td[1],td[2])+1,n=GP.lunar.jdToDate(j),l=GP.lunar.solarToLunar(n[0],n[1],n[2]);
 S.addPerson({ho:'Tống',ten:'Ngày Mai',gioi_tinh:'nam',con_song:false,sinh:{nam:1900},mat:{nam:1980},gio_ngay_am:l.day,gio_thang_am:l.month,gio_nhuan:!!l.leap,muc_hien_thi:'cong_khai'});GP.ui.invalidate&&GP.ui.invalidate();GP.ui.rerender()});
await pg.waitForTimeout(300);
let tx=await pg.innerText('main');assert(/Cần nhớ/.test(tx)&&/Ngày mai/.test(tx)&&/Ngày Mai/.test(tx),'nhắc ngày mai (mặc định 7,1 ngày)');
// bỏ nhắc trước 1 ngày → không còn
await pg.evaluate(()=>{location.hash='#lich'});await pg.waitForTimeout(500);
assert(await pg.$('#nhac-set'),'thẻ cài đặt');
await pg.uncheck('[data-on=nhac-lead][data-n="1"]');await pg.evaluate(()=>{location.hash='#trang-chu'});await pg.waitForTimeout(400);
assert(!/Cần nhớ/.test(await pg.innerText('main')),'tắt 1 ngày thì không nhắc');
// ics có báo thức theo cài đặt
await pg.evaluate(()=>{location.hash='#lich'});await pg.waitForTimeout(400);
await pg.check('[data-on=nhac-lead][data-n="3"]');
const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('#nhac-set [data-act=ics]')]);
const txt=require('fs').readFileSync(await dl.path(),'utf8');assert(/TRIGGER:-P3D/.test(txt)&&/TRIGGER:-P7D/.test(txt)&&!/TRIGGER:-P1D/.test(txt),'ics theo cài đặt');
assert.deepStrictEqual(errs,[]);console.log('✔ nhắc nhở: trang chủ, cài đặt, lịch .ics theo ngày nhắc');await b.close()})().catch(e=>{console.error('✘',e.message);process.exit(1)})
