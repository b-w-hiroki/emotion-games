// Focused release regression: modal isolation, pause, save upgrade, sharing and pose alpha.
// Optional third argument is the production origin; otherwise serve the current dist build.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import * as pw from 'playwright';
const engine=process.argv[2]||'chromium',remote=process.argv[3],root=path.resolve('dist'),out=path.resolve('artifacts/kienaide');fs.mkdirSync(out,{recursive:true});
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webp':'image/webp','.png':'image/png'};
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),rel=url.pathname.replace(/^\/emotion-games\//,''),file=path.resolve(root,rel.endsWith('/')?rel+'index.html':rel);if(!file.startsWith(root+path.sep)){res.writeHead(404);return res.end()}fs.readFile(file,(e,data)=>{res.writeHead(e?404:200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(e?'':data)})});
if(!remote)await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base=remote?remote.replace(/\/$/,'')+'/kienaide/':'http://127.0.0.1:'+server.address().port+'/emotion-games/kienaide/';
const browser=await pw[engine].launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}:{})});
async function open(size,query='',{save=false,noAudio=false,intro=false}={}){
 const ctx=await browser.newContext({viewport:size,hasTouch:true,isMobile:engine==='chromium'});
 await ctx.addInitScript(({save,noAudio,intro})=>{
  if(!intro)localStorage.setItem('emotion-kienaide-intro-v1','1');
  if(save){localStorage.setItem('emotion-endings-v1-kienaide','["dawn","dawn"]');localStorage.setItem('kienaide-art-endings-v1','["wish"]')}
  if(noAudio){window.AudioContext=undefined;window.webkitAudioContext=undefined}
  Object.defineProperty(navigator,'share',{configurable:true,value:data=>{window.sharedResult=data;return Promise.resolve()}});
 },{save,noAudio,intro});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+query);return {ctx,page,errors};
}
const facts=page=>page.evaluate(()=>({...Object.fromEntries(['timer','record','best','distance-value'].map(id=>[id,document.getElementById(id).textContent])),light:document.querySelector('#light-meter').getAttribute('aria-valuenow'),breath:document.querySelector('#breath-meter').getAttribute('aria-valuenow')}));
async function noShortTail(page,selector){
 assert.ok(await page.locator(selector).evaluate(el=>el.scrollWidth<=el.clientWidth+1),'text must not overflow '+selector);
 const lines=await page.locator(selector).evaluate(el=>{const rows=[],walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);for(let node=walker.nextNode();node;node=walker.nextNode())for(let i=0;i<node.length;i++){const r=document.createRange();r.setStart(node,i);r.setEnd(node,i+1);const box=r.getBoundingClientRect();let row=rows.find(l=>Math.abs(l.top-box.top)<1);if(!row){row={top:box.top,text:''};rows.push(row)}row.text+=node.textContent[i]}return rows.map(r=>r.text.trim())});
 assert.ok(lines.length<=1||lines.at(-1).length>5,selector+' has a short tail: '+JSON.stringify(lines));
}
try{
 {
  const ctx=await browser.newContext({viewport:{width:360,height:640}});await ctx.addInitScript(()=>localStorage.setItem('emotion-kienaide-intro-v1','1'));
  let release;const gate=new Promise(resolve=>{release=resolve});await ctx.route('**/hero-body.webp',async route=>{await gate;await route.continue()});
  const page=await ctx.newPage();await page.goto(base+'?qa=1&speed=1',{waitUntil:'domcontentloaded'});
  assert.ok(await page.locator('#play').isDisabled());assert.ok(await page.locator('#journey-loading').isVisible());
  await page.locator('#play').evaluate(el=>el.click());await page.waitForTimeout(250);
  assert.ok(await page.locator('body').evaluate(el=>el.classList.contains('kienaide-title-screen')),'loading must not spend the journey clock');
  release();await page.waitForFunction(()=>!document.querySelector('#play').disabled);
  assert.equal(await page.locator('#journey-loading').count(),0);await page.locator('#play').click();
  assert.ok(await page.locator('body').evaluate(el=>el.classList.contains('kienaide-playing')));
  await ctx.close();console.log('PASS delayed paintings gate the start without consuming play time');
 }
 for(const asset of ['hero-body.webp','manifest.json']){
  const ctx=await browser.newContext({viewport:{width:360,height:640}});await ctx.addInitScript(()=>{localStorage.setItem('emotion-kienaide-intro-v1','1');localStorage.setItem('emotion-endings-v1-kienaide','["dawn"]')});
  const pattern='**/paint/'+asset;await ctx.route(pattern,route=>route.abort());const page=await ctx.newPage();
  await page.goto(base,{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>document.querySelector('#play').dataset.loadFailed);
  assert.match(await page.locator('#journey-loading').innerText(),/読み込めません/);
  await page.screenshot({path:path.join(out,`${engine}-loading-error-${asset.replace('.','-')}.png`)});
  await ctx.unroute(pattern);await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#play').click()]);
  await page.waitForFunction(()=>!document.querySelector('#play').disabled&&!document.querySelector('#play').dataset.loadFailed);
  assert.equal(await page.locator('#collection-progress').innerText(),'結末 1 / 5');await ctx.close();console.log('PASS failed painting reload preserves discoveries',asset);
 }
 for(const size of [{width:390,height:844},{width:360,height:640}]){
  const tag=size.width+'x'+size.height;
  {
   const {ctx,page,errors}=await open(size,'?qa=1&seed=4&speed=1&t=12.8',{save:true});
   await page.evaluate(()=>{const AC=window.AudioContext||window.webkitAudioContext;if(AC){window.AudioContext=function(...args){const ac=new AC(...args);window.menuAudio=ac;return ac};window.AudioContext.prototype=AC.prototype}});
   await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#stage').dataset.mote);
   const menuButton=page.locator('#journey-menu-open'),menu=page.locator('#journey-menu');
   const box=await menuButton.boundingBox(),soundBox=await page.locator('#sound-toggle').boundingBox();
   assert.ok(box.width>=44&&box.height>=44&&box.x>=0&&box.y>=0&&box.x+box.width+8<=soundBox.x,'pause target is large and separate from sound: '+JSON.stringify({box,soundBox}));
   await page.locator('#action').focus();await page.keyboard.down('Space');await menuButton.click();await page.keyboard.up('Space');
   await page.waitForFunction(()=>!document.querySelector('#action').classList.contains('is-held'));
   assert.ok(await menu.isVisible());assert.equal(await menu.getAttribute('aria-modal'),'true');
   const layout=await menu.evaluate(el=>{const card=el.querySelector('.journey-menu-card'),b=card.getBoundingClientRect();return {fits:b.top>=0&&b.bottom<=innerHeight+1&&b.left>=0&&b.right<=innerWidth,targets:[...el.querySelectorAll('#pause-normal>button')].map(button=>{const r=button.getBoundingClientRect();return r.width>=200&&r.height>=52})}});
   assert.ok(layout.fits&&layout.targets.every(Boolean),'menu fits the viewport and primary actions have large touch targets');
   assert.ok(await page.locator('#stage').evaluate(el=>!!el.closest('[inert]')));
   await page.waitForFunction(()=>!window.menuAudio||window.menuAudio.state==='suspended');
   const paused=await facts(page);await page.keyboard.press('m');await page.waitForTimeout(1200);assert.deepEqual(await facts(page),paused,'menu freezes clock, life, breath, distance and memory');
   for(let i=0;i<10;i++){await page.keyboard.press(i%2?'Shift+Tab':'Tab');assert.ok(await menu.evaluate(el=>el.contains(document.activeElement)))}
   await noShortTail(page,'#pause-normal .pause-guide');
   assert.ok(await menu.locator('button').evaluateAll(buttons=>buttons.filter(button=>button.getClientRects().length).every(button=>button.scrollWidth<=button.clientWidth+1)),'menu button labels stay inside their targets');await noShortTail(page,'#pause-sound');
   await page.screenshot({path:path.join(out,`${engine}-${tag}-journey-menu.png`)});
   await page.locator('[data-pause-action="restart"]').click();assert.ok(await page.locator('#pause-confirm').isVisible());
   await page.keyboard.press('Escape');assert.ok(await page.locator('#pause-normal').isVisible());assert.deepEqual(await facts(page),paused,'cancel preserves this journey');
   await page.locator('#pause-collection').click();assert.ok(await page.locator('#collection-panel').isVisible());
   await page.keyboard.press('Escape');assert.ok(await menu.isVisible());assert.deepEqual(await facts(page),paused,'gallery returns to paused menu, not a running journey');
   const supported=await page.evaluate(()=>!!window.menuAudio);
   if(supported){await page.locator('#pause-volume').fill('35');await page.locator('#pause-volume').dispatchEvent('input');assert.equal(await page.locator('#volume').inputValue(),'35');await page.locator('#pause-sound').click();assert.equal(await page.locator('#sound-toggle').innerText(),'音 OFF');assert.equal(await page.evaluate(()=>window.menuAudio.state),'suspended')}
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))});
   assert.equal(await page.evaluate(()=>window.menuAudio?.state||'suspended'),'suspended','foregrounding must not resume a paused journey');
   await page.locator('#pause-resume').click();assert.ok(await page.locator('#action').evaluate(el=>el===document.activeElement));await page.waitForFunction(()=>!window.menuAudio||window.menuAudio.state==='running');
   await page.waitForFunction(t=>document.querySelector('#timer').textContent!==t,paused.timer,{timeout:3000});
   await menuButton.click();const beforeRestart=await facts(page);await page.locator('[data-pause-action="restart"]').click();await page.locator('#pause-confirm-action').click();
   await page.waitForFunction(before=>{const seconds=t=>t.split(':').reduce((n,x)=>n*60+Number(x),0);return seconds(document.querySelector('#timer').textContent)>seconds(before)},beforeRestart.timer);assert.equal(await page.locator('#best').innerText(),'0 / 3');
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('emotion-endings-v1-kienaide'))),['dawn','wish']);
   if(supported)assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('emotion-kienaide-audio-v1'))),{muted:true,volume:.35});
   await menuButton.click();await page.locator('[data-pause-action="title"]').click();await noShortTail(page,'#pause-confirm-text');
   await page.screenshot({path:path.join(out,`${engine}-${tag}-journey-confirm.png`)});
   await Promise.all([page.waitForEvent('domcontentloaded'),page.locator('#pause-confirm-action').click()]);
   assert.ok(await page.locator('body').evaluate(el=>el.classList.contains('kienaide-title-screen')));assert.ok(await menuButton.isHidden());assert.equal(new URL(page.url()).search,'');
   await page.locator('#open-collection').click();assert.equal(await page.locator('#collection-progress').innerText(),'結末 2 / 5');
   assert.deepEqual(errors,[]);await ctx.close();console.log('PASS journey pause, help, audio, gallery, cancel, restart and title',tag);
  }
  {
   const {ctx,page,errors}=await open(size,'',{save:true});
   assert.equal(await page.locator('#collection-progress').innerText(),'結末 2 / 5');
   assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('emotion-endings-v1-kienaide'))),['dawn','wish']);
   await page.waitForFunction(()=>!document.querySelector('#play').disabled&&!document.querySelector('#play').dataset.loadFailed);
   await noShortTail(page,'#curtain-description');
   const titleSpace=await page.evaluate(()=>({button:document.querySelector('#open-collection').getBoundingClientRect().bottom,kicker:document.querySelector('#curtain-kicker').getBoundingClientRect().top}));
   assert.ok(titleSpace.button+4<=titleSpace.kicker,'title menu must not overlap the title caption');
   await page.screenshot({path:path.join(out,`${engine}-${tag}-title-collection.png`)});
   await page.locator('#open-collection').click();
   for(let i=0;i<5;i++){await page.keyboard.press('Tab');assert.ok(await page.locator('#collection-panel').evaluate(el=>el.contains(document.activeElement)),'Tab stays in the collection')}
   assert.ok(await page.locator('#stage').evaluate(el=>!!el.closest('[inert]')));
   await page.keyboard.press('Escape');assert.equal(await page.locator('#collection-panel').isVisible(),false);
   assert.equal(await page.locator('#open-collection').evaluate(el=>el===document.activeElement),true);
   assert.deepEqual(errors,[]);await ctx.close();console.log('PASS unique save and collection focus',tag);
  }
  {
   const {ctx,page,errors}=await open(size,'?qa=1&seed=4&speed=1&t=12.8');await page.locator('#play').click();
   await page.waitForFunction(()=>document.querySelector('#stage').dataset.mote);
   await page.locator('#action').focus();await page.keyboard.down('Space');
   await page.waitForFunction(()=>document.querySelector('#action').classList.contains('is-held'));
   // The collection opener is hidden during immersive play; exercise its real handler directly.
   await page.locator('#open-collection').evaluate(el=>el.click());await page.keyboard.up('Space');
   await page.waitForFunction(()=>!document.querySelector('#action').classList.contains('is-held'));
   const before=await facts(page);await page.keyboard.press('m');await page.waitForTimeout(1200);
   assert.deepEqual(await facts(page),before,'collection freezes the journey and blocks memory hotkeys');
   await page.keyboard.press('Escape');assert.ok(await page.locator('#action').evaluate(el=>el===document.activeElement));
   await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,get:()=>true});document.dispatchEvent(new Event('visibilitychange'))});
   const hidden=await facts(page);await page.keyboard.press('m');await page.waitForTimeout(1200);
   assert.deepEqual(await facts(page),hidden,'hidden document stays frozen even when requestAnimationFrame keeps running');
   await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'))});
   await page.keyboard.press('m');await page.waitForFunction(()=>document.querySelector('#best').textContent==='1 / 3');
   await page.waitForFunction(t=>document.querySelector('#timer').textContent!==t,hidden.timer,{timeout:3000});
   await page.screenshot({path:path.join(out,`${engine}-${tag}-pause-recovery.png`)});
   assert.deepEqual(errors,[]);await ctx.close();console.log('PASS modal/background pause and recovery',tag);
  }
  {
   const {ctx,page,errors}=await open(size,'?qa=1&seed=2&speed=1&t=27.9');await page.locator('#play').click();
   await page.locator('#route-choice').waitFor({state:'visible'});
   assert.equal(await page.locator('#route-choice').getAttribute('role'),'dialog');
   assert.ok(await page.locator('#stage').evaluate(el=>!!el.closest('[inert]')));
   for(let i=0;i<5;i++){await page.keyboard.press('Tab');assert.ok(await page.locator('#route-choice').evaluate(el=>el.contains(document.activeElement)))}
   await page.keyboard.press('Escape');assert.ok(await page.locator('#route-choice').isVisible(),'mandatory route remains open');
   const before=await facts(page);await page.waitForTimeout(1100);assert.deepEqual(await facts(page),before);
   await page.locator('[data-route="rest"]').click();assert.ok(await page.locator('#action').evaluate(el=>!el.closest('[inert]')&&el===document.activeElement));
   assert.deepEqual(errors,[]);await ctx.close();console.log('PASS route dialog isolation and resume',tag);
  }
 }
 {
  const {ctx,page,errors}=await open({width:390,height:844},'?qa=1',{intro:true});await page.locator('#play').click();
  await page.locator('#kienaide-intro').waitFor({state:'visible'});
  for(let i=0;i<3;i++){await page.keyboard.press('Tab');assert.ok(await page.locator('#kienaide-intro').evaluate(el=>el.contains(document.activeElement)))}
  assert.ok(await page.locator('#stage').evaluate(el=>!!el.closest('[inert]')));
  await page.keyboard.press('Escape');assert.equal(await page.locator('#kienaide-intro').count(),0);
  assert.ok(await page.locator('#action').evaluate(el=>!el.closest('[inert]')&&el===document.activeElement));
  assert.deepEqual(errors,[]);await ctx.close();console.log('PASS prologue dialog isolation and focus recovery');
 }
 {
  const {ctx,page,errors}=await open({width:390,height:844},'?qa=1&seed=2&speed=12&mem=3&vital=breath&utm_source=qa');
  await page.locator('#play').click();const box=await page.locator('#action').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.waitForFunction(()=>!document.querySelector('#curtain').classList.contains('hidden'),null,{timeout:15000});await page.mouse.up();
  assert.equal(await page.locator('#distance-panel').isVisible(),false,'the journey sign must not cover ending actions');
  await noShortTail(page,'#curtain-description');
  await page.screenshot({path:path.join(out,`${engine}-ending-share-uncovered.png`)});
  await page.locator('#share').click();const shared=await page.evaluate(()=>window.sharedResult);
  assert.equal(new URL(shared.url).search,'','real result share strips all simulation presets');
  assert.match(shared.text,/きえないで。/);assert.deepEqual(errors,[]);await ctx.close();console.log('PASS clean public result URL');
 }
 {
  const {ctx,page,errors}=await open({width:360,height:640},'?qa=1&speed=0.0001',{noAudio:true});
  assert.equal(await page.locator('#sound-toggle').innerText(),'音 非対応');assert.ok(await page.locator('#sound-toggle').isDisabled());
  await page.locator('#play').click();assert.ok(await page.locator('#action').isEnabled());await page.locator('#journey-menu-open').click();assert.ok(await page.locator('#pause-sound').isDisabled());assert.ok(await page.locator('#pause-volume').isDisabled());assert.equal(await page.locator('#pause-sound').innerText(),'音 非対応');await page.locator('#pause-resume').click();
  await page.goto(base+'?qa=1&speed=0.0001&vital=breath');await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#action').disabled);
  await page.locator('#journey-menu-open').click();await page.locator('#pause-resume').click();assert.ok(await page.locator('#journey-menu-open').evaluate(el=>el===document.activeElement),'critical breath restores focus to an enabled control, not inside a hidden menu');
  await page.locator('#open-collection').evaluate(el=>el.click());await page.keyboard.press('Escape');assert.ok(await page.locator('#journey-menu-open').evaluate(el=>el===document.activeElement),'collection uses the same safe fallback');
  assert.deepEqual(errors,[]);await ctx.close();console.log('PASS playable without Web Audio and critical-breath focus recovery');
 }
 {
  const {ctx,page}=await open({width:390,height:844});
  const view=remote?await (await fetch(new URL('../assets/kienaide-view.js',base))).text():fs.readFileSync('assets/kienaide-view.js','utf8');
  const source=view.match(/^function blendPose\(.*$/m)[0];
  const samples=await page.evaluate(source=>{
   const blend=new Function(source+';return blendPose')(),canvas=()=>{const c=document.createElement('canvas');c.width=c.height=64;return c},a=canvas(),b=canvas(),out=canvas();
   a.getContext('2d').fillStyle='red';a.getContext('2d').fillRect(0,0,48,32);b.getContext('2d').fillStyle='blue';b.getContext('2d').fillRect(16,0,48,32);
   return [.1,.5,.9].map(fade=>{blend(out.getContext('2d'),a,b,fade);return Array.from(out.getContext('2d').getImageData(32,16,1,1).data)})
  },source);
  for(const rgba of samples)assert.equal(rgba[3],255,'overlapping opaque body pixels must not become transparent');
  await ctx.close();console.log('PASS opaque pose dissolve pixel contract');
 }
 console.log('PASS Kienaide release audit',engine,remote||'local');
}finally{await browser.close();if(!remote)server.close()}
