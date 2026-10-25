import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import * as pw from 'playwright';

const engine=process.argv[2]||'chromium';
assert.ok(['chromium','webkit'].includes(engine));
const build=spawnSync(process.execPath,['scripts/build.mjs'],{encoding:'utf8',env:{...process.env,GA4_MEASUREMENT_ID:'G-TEST123'}});
assert.equal(build.status,0,build.stderr);
const root=path.resolve('dist');
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const server=http.createServer((req,res)=>{
 const part=decodeURIComponent(new URL(req.url,'http://localhost').pathname).replace(/^\//,'');
 const target=path.resolve(root,part.endsWith('/')?part+'index.html':part||'index.html');
 if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 try{res.writeHead(200,{'content-type':types[path.extname(target)]||'application/octet-stream'});res.end(fs.readFileSync(target))}
 catch(_){res.writeHead(404);res.end()}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port+'/';
const browser=await pw[engine].launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}:{})});
try{
 const context=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await context.newPage();const errors=[];let tagRequests=0;
 page.on('pageerror',error=>errors.push(error.message));
 await page.route('**/www.googletagmanager.com/**',route=>{tagRequests++;return route.fulfill({status:200,contentType:'text/javascript',body:''})});
 await page.goto(origin,{waitUntil:'networkidle'});
 assert.equal(tagRequests,0,'no Google request before consent');
 assert.ok(await page.locator('#analytics-choice').isVisible());
 let details=await page.locator('#home-details-open').boundingBox(),banner=await page.locator('#analytics-choice').boundingBox();
 assert.ok(details.y+details.height<=banner.y,'consent must not cover the detail action at 390x844');
 fs.mkdirSync('artifacts/analytics',{recursive:true});
 await page.screenshot({path:`artifacts/analytics/${engine}-390-consent.png`});
 await page.setViewportSize({width:360,height:640});
 details=await page.locator('#home-details-open').boundingBox();banner=await page.locator('#analytics-choice').boundingBox();
 assert.ok(details.y+details.height<=banner.y,'consent must not cover the detail action at 360x640');
 const buttons=await page.locator('#analytics-choice button').evaluateAll(items=>items.map(item=>{const r=item.getBoundingClientRect();return {height:r.height,left:r.left,right:r.right,bottom:r.bottom}}));
 for(const button of buttons)assert.ok(button.height>=44&&button.left>=0&&button.right<=360&&button.bottom<=640,'consent action fits 360x640: '+JSON.stringify(button));
 await page.screenshot({path:`artifacts/analytics/${engine}-360-consent.png`});
 await page.locator('[data-choice="no"]').click();
 await page.goto(origin+'kienaide/');
 assert.equal(await page.locator('#analytics-choice').count(),0);
 assert.equal(tagRequests,0,'decline is respected across routes');
 await page.goto(origin+'privacy.html');
 assert.match(await page.locator('#analytics-settings').innerText(),/拒否/);
 await page.locator('#analytics-settings').click();
 await page.locator('[data-choice="yes"]').click();
 await page.waitForFunction(()=>document.querySelector('script[src*="googletagmanager.com"]'));
 assert.equal(tagRequests,1,'Google tag loads only after opt-in');
 await page.goto(origin+'micha-dame/');
 await page.locator('#play').click();
 for(let i=0;i<3;i++)await page.locator('#stage').click();
 const events=await page.evaluate(()=>window.dataLayer.filter(x=>x[0]==='event').map(x=>({name:x[1],params:x[2]})));
 assert.ok(events.some(e=>e.name==='game_start'&&e.params.game_id==='micha-dame'));
 assert.ok(events.some(e=>e.name==='game_complete'&&e.params.game_id==='micha-dame'&&e.params.ending_id));
 assert.ok(events.some(e=>e.name==='ending_discovered'&&e.params.found_count===1));
 await page.evaluate(()=>localStorage.setItem('emotion-kienaide-intro-v1','1'));
 await page.goto(origin+'kienaide/');await page.waitForFunction(()=>!document.querySelector('#play').disabled);await page.locator('#play').click();
 await page.waitForFunction(()=>window.dataLayer.some(x=>x[0]==='event'&&x[1]==='chapter_reached'&&x[2].chapter==='2'),null,{timeout:35000});
 const chapter=await page.evaluate(()=>window.dataLayer.filter(x=>x[0]==='event'&&x[1]==='chapter_reached').map(x=>x[2]));
 assert.deepEqual(chapter,[{game_id:'kienaide',chapter:'2'}],'actual play reaches chapter 2 with a one-based chapter label');
 await page.evaluate(()=>window.emotionTrack('finale_window',{game_id:'kienaide',level:'bright',gust_shield:2.7,silence_release:0.8,flame:82}));
 const finale=await page.evaluate(()=>window.dataLayer.filter(x=>x[0]==='event'&&x[1]==='finale_window').map(x=>x[2]));
 assert.deepEqual(finale.at(-1),{game_id:'kienaide',level:'bright',gust_shield:2.7,silence_release:0.8});
 await page.goto(origin+'chahan/');await page.locator('#start').click();
 assert.ok(await page.evaluate(()=>window.dataLayer.some(x=>x[0]==='event'&&x[1]==='game_start'&&x[2].game_id==='chahan')));
 await page.goto(origin+'fishing-battle/');await page.locator('#reel').click();
 assert.ok(await page.evaluate(()=>window.dataLayer.some(x=>x[0]==='event'&&x[1]==='game_start'&&x[2].game_id==='fishing-battle')));
 assert.deepEqual(errors,[]);
 await context.close();
 const excluded=await browser.newContext({viewport:{width:360,height:640},hasTouch:true,isMobile:true});
 await excluded.addInitScript(()=>localStorage.setItem('emotion-analytics-consent-v1','yes'));
 const excludedPage=await excluded.newPage();let excludedRequests=0;
 await excludedPage.route('**/www.googletagmanager.com/**',route=>{excludedRequests++;return route.abort()});
 for(const suffix of ['kienaide/?study=1','kienaide/?qa=1']){
  await excludedPage.goto(origin+suffix);
  assert.equal(await excludedPage.evaluate(()=>Boolean(document.querySelector('script[src*="googletagmanager.com"]'))),false,'Google tag is disabled in '+suffix);
 }
 assert.equal(excludedRequests,0);
 await excluded.close();
 console.log('PASS '+engine+' GA4 consent, common events, standalone titles, excluded QA/study');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve))}
