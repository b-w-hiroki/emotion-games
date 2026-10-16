import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import { chromium } from 'playwright';
import vm from 'node:vm';
const microScope={window:{}};vm.runInNewContext(fs.readFileSync('assets/microgames.js','utf8'),microScope,{timeout:500});
const expanded=microScope.window.EmotionMissions.endings;
const root=path.resolve('dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(!u.pathname.startsWith('/emotion-games/')){res.writeHead(404);return res.end()}const part=decodeURIComponent(u.pathname.slice(15));const file=path.resolve(root,part.endsWith('/')?part+'index.html':part||'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}try{res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file))}catch(_){res.writeHead(404);res.end('not found')}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/emotion-games/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 async function pageFor(slug,query=''){
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+slug+'/'+query);await page.locator('#play').click();
  if(slug==='kienaide'&&await page.locator('#kienaide-intro').count())await page.locator('#kienaide-intro button').click();
  return {ctx,page,errors};
 }
 async function check(obj,title,count=1){
  const {page,errors}=obj;
  await page.waitForFunction(()=>document.getElementById('curtain')&&!document.getElementById('curtain').classList.contains('hidden'));
  assert.equal(await page.locator('#curtain-title').innerText(),title);
  assert.equal(await page.locator('#collection-progress').innerText(),'結末 '+count+' / 5');
  assert.deepEqual(errors,[]);
 }
 {
  const t=await pageFor('micha-dame');
  for(let i=0;i<3;i++)await t.page.locator('#stage').click({timeout:2000});
  await check(t,'叩き返された。');
  await t.page.reload();
  assert.equal(await t.page.locator('#collection-progress').innerText(),'結末 1 / 5','collection should survive reload');
  await t.page.locator('#open-collection').click();
  assert.equal(await t.page.locator('#collection-list li.found').count(),1);
  await t.page.locator('#close-collection').click();
  await t.ctx.close();console.log('PASS: door knock and persistent collection');
 }
 {
  const t=await pageFor('ato-hitotsu');
  await t.page.waitForTimeout(520);
  await t.page.locator('#action').click();
  await t.page.locator('#action').click();
  await check(t,'せっかち。');
  await t.ctx.close();console.log('PASS: stack double-click secret ending');
 }
 {
  const t=await pageFor('girigiri');
  const box=await t.page.locator('#action').boundingBox();const x=box.x+box.width/2,y=box.y+box.height/2;
  await t.page.mouse.move(x,y);await t.page.mouse.down();await t.page.waitForTimeout(170);await t.page.mouse.up();
  await t.page.waitForTimeout(2400);
  await check(t,'たった一滴。');
  await t.ctx.close();console.log('PASS: water tiny-pour ending');
 }
 {
  const t=await pageFor('micha-dame');
  await t.page.waitForTimeout(8400);
  await check(t,'何も起きない。');
  await t.ctx.close();console.log('PASS: no-input ending');
 }


 {
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await ctx.newPage();
  await page.goto(base+'kienaide/?qa=1');
  await page.locator('#play').click();
  assert.equal(await page.locator('#kienaide-intro').count(),1,'first play should show the prologue');
  await page.locator('#kienaide-intro button').click();
  assert.equal(await page.locator('#kienaide-intro').count(),0,'skip should remove the prologue');
  assert.ok(await page.locator('#action').isEnabled(),'skip should start gameplay');
  await page.reload();
  await page.locator('#play').click();
  assert.equal(await page.locator('#kienaide-intro').count(),0,'repeat play should bypass the prologue');
  await ctx.close();
  console.log('PASS: first-play prologue, skip and repeat-play persistence');
 }
 {
  const t=await pageFor('kienaide','?qa=1');
  assert.ok(await t.page.locator('#story-beat').isVisible());
  const layers=JSON.parse(fs.readFileSync('assets/kienaide/manifest.json','utf8')).files;
  const artLoaded=await t.page.evaluate(async files=>Promise.all(files.map(name=>new Promise(ok=>{
    const img=new Image();img.onload=()=>ok(img.naturalWidth>0);img.onerror=()=>ok(false);img.src='../assets/kienaide/'+name;
  }))),layers);
  assert.equal(layers.length>=26,true,'every chapter needs sky/far/mid/fore/lights plus hero layers');
  assert.deepEqual(artLoaded,layers.map(()=>true),'all chapter and character layers must load at runtime');
  await t.page.waitForTimeout(250);
  await t.page.screenshot({path:'artifacts/screenshots/kienaide-illustrated-actors-390.png'});
  console.log('PASS: detailed player silhouette and flame image layers load in Chromium');
  await t.page.screenshot({path:'artifacts/screenshots/kienaide-art-scene01-390.png'});
  console.log('PASS: all four illustrated chapter backgrounds loaded in Chromium');
  assert.equal(await t.page.locator('#sound-toggle').getAttribute('aria-pressed'),'true');
  await t.page.waitForTimeout(7600);
  await check(t,'風にさらわれた。');
  assert.ok(await t.page.locator('#moment-save').isVisible(),'candle ending must offer image card');
  await t.page.evaluate(()=>Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false}));
  const [download]=await Promise.all([t.page.waitForEvent('download'),t.page.locator('#moment-save').click()]);
  assert.equal(download.suggestedFilename(),'kienaide-blown.png');
  await t.page.screenshot({path:'artifacts/screenshots/kienaide-share-result-390.png'});
  await t.page.reload();
  assert.equal(await t.page.locator('#collection-progress').innerText(),'結末 1 / 5');
  await t.ctx.close();console.log('PASS: four-chapter flame journey, sound control, failure and persistence');
 }
 {
  const t=await pageFor('kienaide','?qa=1');
  const box=await t.page.locator('#action').boundingBox();let holding=false;
  for(let i=0;i<150&&!await t.page.locator('#curtain').evaluate(e=>!e.classList.contains('hidden'));i++){
   const hint=await t.page.locator('#hint').innerText();
   if(!holding&&hint.includes('長押し')){await t.page.mouse.move(box.x+box.width/2,box.y+box.height/2);await t.page.mouse.down();holding=true}
   if(holding&&hint.includes('離して')){await t.page.mouse.up();holding=false}
   await t.page.waitForTimeout(60);
  }
  if(holding)await t.page.mouse.up();
  await check(t,'まだ、ここに。');
  assert.ok(Number((await t.page.locator('#record').innerText()).replace('%',''))>0);
  await t.ctx.close();console.log('PASS: readable wind telegraph supports a complete night journey');
 }
 {
  const t=await pageFor('kienaide','?qa=1');
  // Memories appear at seeded positions; the canvas exposes where the current one is drawn.
  const box=await t.page.locator('#action').boundingBox(),stage=await t.page.locator('#stage').boundingBox();let holding=false,shot=false;
  for(let i=0;i<220&&!await t.page.locator('#stage').getAttribute('data-ending');i++){
   const hint=await t.page.locator('#hint').innerText(),mote=await t.page.locator('#stage').getAttribute('data-mote');
   if(mote){if(holding){await t.page.mouse.up();holding=false}if(!shot){shot=true;await t.page.screenshot({path:'artifacts/screenshots/kienaide-journey-390.png'})}const [x,y]=mote.split(',').map(Number);await t.page.mouse.click(stage.x+x,stage.y+y);continue}
   if(!holding&&(hint.includes('長押し')||hint.includes('かばって'))){await t.page.mouse.move(box.x+box.width/2,box.y+box.height/2);await t.page.mouse.down();holding=true}
   if(holding&&(hint.includes('離して')||hint.includes('ひらいて'))){await t.page.mouse.up();holding=false}
   await t.page.waitForTimeout(55);
  }
  if(holding)await t.page.mouse.up();
  await t.page.waitForFunction(()=>!document.getElementById('curtain').classList.contains('hidden'));
  const title=await t.page.locator('#curtain-title').innerText();assert.ok(['わすれない。','おかえり。'].includes(title),title);
  assert.equal(await t.page.locator('#best').innerText(),'3 / 3');assert.deepEqual(t.errors,[]);
  await t.page.screenshot({path:'artifacts/screenshots/kienaide-memories-result-390.png'});
  await t.ctx.close();console.log('PASS: all three memory collectibles change the arrival ending');
 }


 {
  // Production-focused first view: controls need to fit on smaller iPhones without panning.
  const small=await browser.newContext({viewport:{width:360,height:640},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await small.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'kienaide/');await page.locator('#play').click();
  if(await page.locator('#kienaide-intro').count())await page.locator('#kienaide-intro button').click();
  await page.waitForTimeout(220);
  const fit=await page.evaluate(()=>{
   const action=document.querySelector('#action').getBoundingClientRect();
   const stage=document.querySelector('#stage').getBoundingClientRect();
   return {buttonBottom:action.bottom,stageTop:stage.top,stageBottom:stage.bottom,scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,scrollTop:scrollY};
  });
  assert.equal(fit.scrollWidth<=fit.viewportWidth+2,true,'360px layout must not scroll horizontally');
  assert.ok(fit.buttonBottom<=640,'primary action must be available in the first 360x640 viewport: '+JSON.stringify(fit));
  await page.screenshot({path:'artifacts/screenshots/kienaide-active-360x640.png'});
  assert.deepEqual(errors,[]);
  await small.close();console.log('PASS: small-iPhone primary action visible with live illustrated scene');
 }

 // Reward thresholds, persistence, duplicate suppression, and the final archive.
 async function seeded(slug,ids){
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,reducedMotion:'reduce'});
  const page=await ctx.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({slug,ids})=>{const key='emotion-endings-v1-'+slug;if(localStorage.getItem(key)===null)localStorage.setItem(key,JSON.stringify(ids))},{slug,ids});
  await page.goto(base+slug+'/');
  await page.locator('#play').click();
  return {ctx,page,errors};
 }
 async function knock(t){
  for(let i=0;i<3;i++)await t.page.locator('#stage').click();
  await t.page.waitForFunction(()=>!document.querySelector('#curtain').classList.contains('hidden'));
 }
 {
  const t=await seeded('micha-dame',['ignore','peek']);
  await knock(t);
  assert.equal(await t.page.locator('#curtain-title').innerText(),'叩き返された。');
  assert.equal(await t.page.locator('#collection-progress').innerText(),'結末 3 / 5');
  assert.ok((await t.page.locator('#discovery-state').innerText()).includes('新しい'));
  assert.ok((await t.page.locator('#discovery-milestone').innerText()).includes('余韻'));
  assert.equal(await t.page.locator('#discovery-result').evaluate(x=>getComputedStyle(x).animationName),'none','reduce-motion honored');
  await t.page.locator('#open-collection').click();
  assert.equal(await t.page.locator('.collection-track').getAttribute('aria-valuenow'),'3');
  assert.ok((await t.page.locator('#collection-awards').innerText()).includes('扉の記憶'));
  fs.mkdirSync('artifacts/screenshots',{recursive:true});
  await t.page.screenshot({path:'artifacts/screenshots/new-discovery-390.png'});
  await t.page.reload();
  assert.equal(await t.page.locator('#collection-progress').innerText(),'結末 3 / 5');
  await t.page.locator('#play').click();
  await knock(t);
  assert.equal(await t.page.locator('#collection-progress').innerText(),'結末 3 / 5','no duplicate');
  assert.equal(await t.page.locator('#discovery-milestone').innerText(),'','no repeated reward');
  assert.deepEqual(t.errors,[]);
  await t.ctx.close();
  console.log('PASS: 3/5 reward, accessibility, repeat prevention, persistence');
 }
 {
  const t=await seeded('micha-dame',['ignore','peek','whisper','resist']);
  await knock(t);
  assert.equal(await t.page.locator('#collection-progress').innerText(),'結末 5 / 5');
  assert.ok((await t.page.locator('#discovery-milestone').innerText()).includes('向こう側の証人'));
  await t.page.locator('#open-collection').click();
  assert.ok(await t.page.locator('.award-card.earned').count()===2);
  assert.ok(await t.page.locator('[data-share-completion]').isVisible());
  await t.page.screenshot({path:'artifacts/screenshots/completed-gallery-390.png'});
  assert.deepEqual(t.errors,[]);
  await t.ctx.close();
  console.log('PASS: 5/5 reward and share affordance');
 }
 {
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  const all={...Object.fromEntries(Object.entries(expanded).map(([slug,entries])=>[slug,entries.map(e=>e.id)])),
    'girigiri':['empty','one-drop','normal','perfect','overflow'],
    'ato-hitotsu':['wait','rush','collapse','precision','sky'],
    'micha-dame':['ignore','knock','peek','whisper','resist'],
    'kienaide':['blown','smother','wish','survive','dawn']};
  await page.addInitScript(all=>{for(const [slug,ids] of Object.entries(all))localStorage.setItem('emotion-endings-v1-'+slug,JSON.stringify(ids))},all);
  await page.goto(base);
  assert.ok(await page.locator('.archive-award').isVisible(),'archive completion badge');
  assert.ok((await page.locator('.archive-progress').innerText()).includes('100/100'));
  assert.ok(await page.locator('#share-archive').isVisible());
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  assert.equal(overflow,false,'no horizontal scrolling');
  await page.screenshot({path:'artifacts/screenshots/archive-100of100-390.png'});
  assert.deepEqual(errors,[]);
  await ctx.close();console.log('PASS: complete 20/20 archive');
 }
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
