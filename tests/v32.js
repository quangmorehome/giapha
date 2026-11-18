const {chromium}=require('playwright'),assert=require('assert'),path=require('path');
(async()=>{const b=await chromium.launch();const ctx=await b.newContext({viewport:{width:430,height:900},acceptDownloads:true});const pg=await ctx.newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.addInitScript(()=>{try{localStorage.setItem('gp.viewer','u_admin')}catch(e){}});
await pg.goto('file://'+path.join(__dirname,'../dist/_khung_thu.html'));await pg.waitForTimeout(800);
// pháp luật
await pg.evaluate(()=>{location.hash='#phap-luat'});await pg.waitForTimeout(600);
let n=await pg.$$eval('.plc',e=>e.length);assert.strictEqual(n,6,"6 bài pháp luật: "+n);
assert(/Thừa kế/.test(await pg.innerText('main')));
await pg.click('.plc >> nth=1');await pg.waitForTimeout(400);
let tx=await pg.innerText('main');assert(/Điều 651/.test(tx)&&/Hàng thứ nhất/.test(tx),'nội dung thừa kế');
assert((await pg.$$('article table')).length>=1,'bảng');
// Bài viết không lẫn pháp luật
await pg.evaluate(()=>{location.hash='#bai-viet'});await pg.waitForTimeout(400);
assert(!/Thừa kế: ai được hưởng/.test(await pg.innerText('main')),'danh sách bài viết không chứa pháp luật');
// di tích
await pg.evaluate(()=>{location.hash='#di-tich'});await pg.waitForTimeout(500);
assert((await pg.$$('.dtc')).length>=1,'thẻ di tích');assert(await pg.$('.dtc [data-act=map-go]'));
await pg.click('.dtc [data-act=map-go] >> nth=0');await pg.waitForTimeout(400);assert(/ban-do/.test(await pg.evaluate(()=>location.hash)));
// lịch dòng họ
await pg.evaluate(()=>{location.hash='#lich'});await pg.waitForTimeout(500);
assert(await pg.$('#nhac-sync'),'thẻ đồng bộ lịch');
const [dl]=await Promise.all([pg.waitForEvent('download'),pg.click('[data-act=nhac-pub]')]);
assert.strictEqual(dl.suggestedFilename(),'lich-ho-tong.ics');
const ics=require('fs').readFileSync(await dl.path(),'utf8');
assert(/BEGIN:VCALENDAR/.test(ics)&&/BEGIN:VEVENT/.test(ics)&&/REFRESH-INTERVAL/.test(ics)&&/TRIGGER:-P7D/.test(ics),'ics đăng ký');
assert(!/Sinh nhật/.test(ics),'không đưa sinh nhật người còn sống');
assert.deepStrictEqual(errs,[]);console.log('✔ pháp luật, di tích, lịch đăng ký iPhone (.ics công khai)');await b.close()})().catch(e=>{console.error('✘',e.message);process.exit(1)})
