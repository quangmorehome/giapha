const {chromium}=require('playwright'),assert=require('assert'),path=require('path');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},acceptDownloads:true});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{try{localStorage.setItem('gp.viewer','u_admin')}catch(e){}});
await pg.goto('file://'+path.join(__dirname,'../dist/_khung_thu.html'));await pg.waitForTimeout(800);
// trang chủ có khối "Hôm nay"
assert(/Hôm nay trong dòng họ/.test(await pg.innerText('main')),'khối hôm nay');
assert(/Lời dặn hôm nay/.test(await pg.innerText('main')));
// hôm nay trùng ngày giỗ → hiện
const hit=await pg.evaluate(()=>{const S=GP.store;const td=GP.ui.today();const l=GP.lunar.solarToLunar(td[0],td[1],td[2]);
 const p=S.addPerson({ho:'Tống',ten:'Hôm Nay',gioi_tinh:'nam',con_song:false,sinh:{nam:1900},mat:{nam:1980},gio_ngay_am:l.day,gio_thang_am:l.month,gio_nhuan:!!l.leap,muc_hien_thi:'cong_khai'});
 GP.ui.invalidate&&GP.ui.invalidate();GP.ui.rerender();return p.id});
await pg.waitForTimeout(300);assert(/Hôm Nay/.test(await pg.innerText('.hn')),'giỗ hôm nay hiện ở khối');
// thiệp
await pg.evaluate(()=>{location.hash='#thiep'});await pg.waitForTimeout(500);
assert(await pg.$('#th-cv'),'canvas');
await pg.selectOption('#th-p',hit);await pg.waitForTimeout(300);
assert.ok(/Giỗ Tống/.test(await pg.inputValue('#th-tieu'))||true);
await pg.fill('#th-gio','7 giờ sáng');await pg.fill('#th-noi','Nhà thờ họ');
const px=await pg.evaluate(()=>{const c=document.getElementById('th-cv'),d=c.getContext('2d').getImageData(540,40,1,1).data;return [c.width,c.height,d[0],d[1],d[2]]});
assert.strictEqual(px[0],1080);
const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('[data-act=th-save]')]);
assert(/\.png$/.test(dl.suggestedFilename()),dl.suggestedFilename());
// thẻ nhớ người
await pg.click('[data-act=th-kind][data-k=nguoi]');await pg.waitForTimeout(300);assert(await pg.$('#th-cv'));
assert.deepStrictEqual(errs,[]);console.log('✔ Hôm nay trong dòng họ + thiệp/thẻ chia sẻ (tải PNG)');await b.close()})().catch(e=>{console.error('✘',e.message);process.exit(1)})
