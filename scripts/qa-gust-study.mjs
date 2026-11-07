import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {chromium,webkit} from 'playwright';
const engine=process.argv[2]||'chromium',root=path.resolve('dist');
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://local');const file=path.resolve(root,'.'+u.pathname+(u.pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}try{res.setHeader('Content-Type',({'.js':'text/javascript','.html':'text/html','.css':'text/css','.webp':'image/webp'})[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file))}catch{res.writeHead(404);res.end()}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));
let browser;
try{
 browser=await ({chromium,webkit})[engine].launch({headless:true});
 for(const width of [390,360])for(const sequence of ['AB','BA']){
 const context=await browser.newContext({viewport:{width,height:width===390?844:640},reducedMotion:'reduce'});
 await context.addInitScript(seq=>{if(!sessionStorage.getItem('kienaide-gust-study-v1'))sessionStorage.setItem('kienaide-gust-study-v1',JSON.stringify({schema:1,participant:'test',sequence:seq,period:1,runs:[]}));localStorage.setItem('emotion-kienaide-intro-v1','1')},sequence);
 const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 const base=`http://127.0.0.1:${server.address().port}/kienaide/`;
 await page.goto(base+'?study=1');await page.locator('#play').click();
 await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('kienaide-gust-study-v1')).runs.length===1);
 assert.equal(await page.locator('.gust-anticipation').count(),sequence[0]==='B'?1:0);
 await page.locator('#action').dispatchEvent('pointerdown',{pointerId:1});
 await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('kienaide-gust-study-v1')).runs[0].first_input_ms!==null);
 await page.locator('#action').dispatchEvent('pointercancel',{pointerId:1});
 // Wait for the actual recorded warning rather than assuming CI renders 8s of frames in 8s wall time.
 await page.waitForFunction(()=>JSON.parse(sessionStorage.getItem('kienaide-gust-study-v1')).runs[0].events.some(e=>e.warning),null,{timeout:30000});
 const record=await page.evaluate(()=>JSON.parse(sessionStorage.getItem('kienaide-gust-study-v1')).runs[0]);
 assert.ok(record.events.some(e=>e.warning),'first warning recorded');assert.ok(record.events.at(-1).t<12,'normal speed');
 const warning=record.events.find(e=>e.warning);
 assert.ok(Date.now()-record.started >= warning.t*1000-1000,'warning must not use accelerated game time');
 await page.reload();assert.equal(await page.evaluate(()=>window.KienaideGustStudy.variant),sequence[0]);
 await page.evaluate(()=>{const d=JSON.parse(sessionStorage.getItem('kienaide-gust-study-v1'));d.period=2;sessionStorage.setItem('kienaide-gust-study-v1',JSON.stringify(d))});await page.reload();assert.equal(await page.evaluate(()=>window.KienaideGustStudy.variant),sequence[1]);
 await page.goto(base+'?study=1&qa=1&t=7');assert.equal(await page.locator('#play').count(),0);assert.deepEqual(errors,[]);await context.close();
 }
 console.log(`${engine}: assignment, reload, input, warning, normal speed, crossover, invalid URL passed`);
}finally{await browser?.close();await new Promise(r=>server.close(r))}
