const {chromium}=require('playwright'),assert=require('assert'),path=require('path');
(async()=>{const b=await chromium.launch();const pg=await (await b.newContext()).newPage();const errs=[];pg.on('pageerror',e=>errs.push(e.message));
await pg.goto('file://'+path.join(__dirname,'../dist/_khung_thu.html'));await pg.waitForTimeout(800);
const r=await pg.evaluate(()=>{const S=GP.store;S.setViewer({role:'admin'});const mk=(o)=>S.addPerson(Object.assign({ho:'Tống',ten:'Thử',gioi_tinh:'nam',con_song:false,sinh:{nam:1950}},o));
const a=mk({mat:{nam:2021,thang:3,ngay:25}}),b=mk({mat:{nam:2021,thang:3,ngay:25},gio_ngay_am:10,gio_thang_am:8}),c=mk({mat:{nam:2021,thang:2,ngay:12}}),d=mk({mat:{nam:2020,thang:1,ngay:1,lich:'am'}});
const gi=(x)=>{const g=GP.io.gioInfo(S.S.data.persons.find(y=>y.id===x.id));return g&&[g.ngay,g.thang,!!g.suyRa]};
return{a:gi(a),b:gi(b),c:gi(c),d:gi(d),len:GP.lunar.monthLength?GP.lunar.monthLength(12,2019):null}});
console.log(JSON.stringify(r));
assert.deepStrictEqual(r.a,[12,2,true]);          // 25/3/2021 = 13/2 âm → giỗ 12/2
assert.deepStrictEqual(r.b,[10,8,false]);         // nhập tay thì giữ nguyên
assert.strictEqual(r.c[2],true);
assert.strictEqual(r.d[1],12);assert.ok(r.d[0]>=29);  // 1/1 âm → cuối tháng Chạp
assert.ok(!errs.length,errs.join());console.log('✔ giỗ: nhập tay được giữ; để trống tự tính trước ngày mất 1 ngày');await b.close()})()
