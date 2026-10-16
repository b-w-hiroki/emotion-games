// Release check against the public site: the deployed page serves the 004 modules and layers,
// the night starts, a memory can be touched and the hold changes the state. No local server.
// Usage: node scripts/qa-production.mjs [https://play.birdman-studio.com]
import assert from 'node:assert/strict';import {chromium} from 'playwright';
const origin=(process.argv[2]||'https://play.birdman-studio.com').replace(/\/$/,'');
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await ctx.newPage(),errors=[],failed=[];
 page.on('pageerror',e=>errors.push(e.message));page.on('response',r=>{if(r.status()>=400)failed.push(r.status()+' '+r.url())});
 await page.goto(origin+'/kienaide/?qa=1&seed=4',{waitUntil:'load'});
 const scripts=await page.evaluate(()=>[...document.scripts].map(s=>s.getAttribute('src')));
 for(const m of ['kienaide-core','kienaide-view','kienaide-audio'])assert.ok(scripts.some(s=>s&&s.includes(m+'.js')),m+' deployed');
 await page.locator('#play').click();
 if(await page.locator('#kienaide-intro').count())await page.locator('#kienaide-intro button').click();
 await page.waitForFunction(()=>document.querySelector('#stage').dataset.chapter==='1',null,{timeout:10000});
 const layers=await page.evaluate(async()=>{const names=['ch1-sky','ch1-mid','ch4-lights','hero-body','hero-rim'];return Promise.all(names.map(n=>new Promise(ok=>{const i=new Image();i.onload=()=>ok(i.naturalWidth>0);i.onerror=()=>ok(false);i.src='../assets/kienaide/'+n+'.svg'})))});
 assert.deepEqual(layers,[true,true,true,true,true],'layers served');
 await page.waitForFunction(()=>document.querySelector('#stage').dataset.mote,null,{timeout:15000});
 const [x,y]=(await page.locator('#stage').getAttribute('data-mote')).split(',').map(Number),b=await page.locator('#stage').boundingBox();
 await page.mouse.click(b.x+x,b.y+y);
 assert.equal(await page.locator('#best').innerText(),'1 / 3','memory tap works on production');
 const a=await page.locator('#action').boundingBox();await page.mouse.move(a.x+a.width/2,a.y+a.height/2);await page.mouse.down();await page.waitForTimeout(300);
 assert.match(await page.locator('#hint').innerText(),/かば|離して/);await page.mouse.up();
 await page.screenshot({path:'artifacts/production-kienaide.png'});
 assert.deepEqual(errors,[]);assert.deepEqual(failed,[]);
 console.log('PASS production',origin+'/kienaide/');
}finally{await browser.close()}
