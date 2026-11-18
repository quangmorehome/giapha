const { chromium } = require("playwright"); const path=require("path"), assert=require("assert");
(async()=>{const b=await chromium.launch();const pg=await b.newPage({viewport:{width:390,height:844}});const errs=[];pg.on("pageerror",e=>errs.push(e.message));
await pg.addInitScript(()=>{localStorage.setItem("gp.viewer","u_admin")});await pg.goto("file://"+path.resolve(__dirname,"../dist/_khung_thu.html")+"#lich");await pg.waitForTimeout(700);
assert.ok(await pg.$(".cd.today[aria-current=date]"));
for(const k of ["gio","sinh","le"]){await pg.click('.stiles [data-k="'+k+'"]');await pg.waitForTimeout(200);assert.strictEqual(await pg.getAttribute('.stiles [data-k="'+k+'"]',"aria-pressed"),"true");const n=await pg.$$eval("#cal-list li",e=>e.length);console.log(k,n);const bad=await pg.$$eval("#cal-list .badge,#cal-list li",()=>0);}
await pg.click('.stiles [data-k="le"]');await pg.waitForTimeout(100);console.log(errs);await pg.screenshot({path:"/tmp/claude-0/shots/cal.png"});await b.close();})().catch(e=>{console.error("FAIL",e.message);process.exit(1)});
