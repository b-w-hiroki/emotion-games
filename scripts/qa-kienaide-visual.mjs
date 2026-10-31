// Visual QA for 004「きえないで。」: every chapter, the prologue and all five ending scenes at
// 390x844 and 360x640, with layout assertions. Screenshots go to artifacts/kienaide/.
// Usage: node scripts/qa-kienaide-visual.mjs [chromium|webkit]
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
import sharp from 'sharp';import * as pw from 'playwright';
const engine=process.argv[2]||'chromium';
const root=path.resolve('dist'),out=path.resolve('artifacts/kienaide');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.webp':'image/webp','.avif':'image/avif'};
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(!u.pathname.startsWith('/emotion-games/')){res.writeHead(404);return res.end()}const rel=decodeURIComponent(u.pathname.slice(15)),file=path.resolve(root,rel.endsWith('/')||!rel?rel+'index.html':rel);if(!file.startsWith(root)){res.writeHead(403);return res.end()}fs.readFile(file,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(d)})});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/emotion-games/kienaide/';
const browser=await pw[engine].launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}:{})});
const sizes=[{width:390,height:844},{width:360,height:640}];
const results=[];
const appSource=fs.readFileSync('assets/app.js','utf8');
const guidanceSource=appSource.match(/^function guidanceMarkup\(text\)\{.*\}$/m)[0];
const storyCopy=[...appSource.slice(appSource.indexOf('function candleEvents('),appSource.indexOf('function candleCaption(')).matchAll(/'([^']*[\u3040-\u9fff][^']*)'/g)].map(m=>m[1]).filter(s=>!s.includes('<'));
const captionCopy=[...appSource.slice(appSource.indexOf('function candleCaption('),appSource.indexOf('function drawCandle(')).matchAll(/'([^']*[\u3040-\u9fff][^']*)'/g)].map(m=>m[1]);
const done=x=>{results.push(x);console.log('step ok:',x)};
const warmth=page=>page.evaluate(()=>{const c=document.querySelector('#stage'),[x,y]=c.dataset.flame.split(',').map(Number),k=c.width/c.getBoundingClientRect().width;
 const d=c.getContext('2d').getImageData(Math.round((x-40)*k),Math.round((y-50)*k),Math.round(80*k),Math.round(80*k)).data;let w=0;for(let i=0;i<d.length;i+=4)w+=d[i]-d[i+2];return w/(d.length/4)});
async function open(size,query,{intro=false,reduced=false,audioProbe=false}={}){
 const ctx=await browser.newContext({viewport:size,isMobile:engine==='chromium',hasTouch:true,reducedMotion:reduced?'reduce':'no-preference'});
 if(!intro)await ctx.addInitScript(()=>localStorage.setItem('emotion-kienaide-intro-v1','1'));
 if(audioProbe)await ctx.addInitScript(()=>{
  window.audioStarts={steps:0,melody:0};
  const Audio=window.AudioContext||window.webkitAudioContext;if(!Audio)return;
  const proto=Audio.prototype;
  for(const method of ['createBufferSource','createOscillator']){
   const create=proto[method];proto[method]=function(...args){const source=create.apply(this,args),start=source.start;source.start=function(...args){if(method==='createBufferSource'&&!this.loop)window.audioStarts.steps++;if(method==='createOscillator'&&this.type==='sine')window.audioStarts.melody++;return start.apply(this,args)};return source};
  }
 });
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('page crashed'));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(base+query);return {ctx,page,errors};
}
async function layout(page,size){
 return page.evaluate(({h})=>{const a=document.querySelector('#action').getBoundingClientRect(),st=document.querySelector('#stage').getBoundingClientRect(),hud=document.querySelector('.hud').getBoundingClientRect();
  return {actionBottom:a.bottom,actionTop:a.top,actionH:a.height,stageTop:st.top,stageBottom:st.bottom,stageH:st.height,stageW:st.width,hudDisplay:getComputedStyle(document.querySelector('.hud')).display,topDisplay:getComputedStyle(document.querySelector('.top')).display,hudBottom:hud.bottom,scrollW:document.documentElement.scrollWidth,vw:innerWidth,fits:a.bottom<=h+1}},{h:size.height});
}
try{
 for(const size of sizes){
  const tag=size.width+'x'+size.height;
  // A paused journey must not consume the reading time of its first guidance.
  {
   const story=await open(size,'?qa=1&seed=3&speed=.0001');await story.page.locator('#play').click();
   await story.page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#story-beat')).opacity)>.7);
   const text=await story.page.locator('#story-beat strong').innerText();
   await story.page.locator('#journey-menu-open').click();await story.page.waitForTimeout(4500);
   await story.page.locator('#pause-resume').click();
   assert.ok(await story.page.locator('#story-beat').evaluate(el=>el.classList.contains('show')),'pause must preserve the guidance '+tag);
   assert.ok(await story.page.locator('#story-beat').evaluate(el=>Number(getComputedStyle(el).opacity)>.5),'guidance must remain visible after pause '+tag);
   assert.equal(await story.page.locator('#story-beat strong').innerText(),text);
   await story.page.screenshot({path:path.join(out,`${engine}-${tag}-story-after-pause.png`)});
   await story.page.evaluate(()=>window.dispatchEvent(new Event('blur')));await story.page.waitForTimeout(4500);
   assert.ok(await story.page.locator('#story-beat').evaluate(el=>el.classList.contains('show')),'lost focus must preserve the guidance '+tag);
   await story.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   assert.ok(await story.page.locator('#story-beat').evaluate(el=>Number(getComputedStyle(el).opacity)>.5),'guidance must remain visible after focus returns '+tag);
   await story.page.waitForFunction(()=>!document.querySelector('#story-beat').classList.contains('show'),null,{timeout:7000});
   assert.deepEqual(story.errors,[]);await story.ctx.close();done('story reading time survives interruptions '+tag);
  }
  // The ending tableau must not advance past its music while focus is lost.
  {
   const ending=await open(size,'?qa=1&seed=2&speed=1&t=89&mem=3&vital=flame-full');await ending.page.locator('#play').click();
   await ending.page.waitForFunction(()=>!!document.querySelector('#stage').dataset.ending,null,{timeout:8000});
   await ending.page.evaluate(()=>window.dispatchEvent(new Event('blur')));
   await ending.page.waitForTimeout(3200);
   assert.ok(await ending.page.locator('#curtain').evaluate(el=>el.classList.contains('hidden')),'the ending must not reveal its result while interrupted '+tag);
   await ending.page.screenshot({path:path.join(out,`${engine}-${tag}-ending-focus-paused.png`)});
   await ending.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await ending.page.waitForFunction(()=>!document.querySelector('#curtain').classList.contains('hidden'),null,{timeout:6000});
   assert.deepEqual(ending.errors,[]);await ending.ctx.close();done('ending pauses with lost focus '+tag);
  }
  // A critical flame still recovers in the upper part of the weak-wind range.
  {
   const calm=await open(size,'?qa=1&seed=1&speed=.0001&t=7.1&vital=flame');await calm.page.locator('#play').click();
   await calm.page.waitForFunction(()=>{const w=Number(document.querySelector('#stage').dataset.wind);return w>.44&&w<=.5},null,{timeout:3000});
   assert.match(await calm.page.locator('.action-cue').innerText(),/息を戻して/,'weak wind permits recovery '+tag);
   await calm.page.locator('#action').focus();await calm.page.keyboard.down('Space');
   await calm.page.waitForFunction(()=>document.querySelector('#action').classList.contains('is-held'));
   assert.match(await calm.page.locator('.action-cue').innerText(),/いま離して/,'holding should prompt release '+tag);
   await calm.page.keyboard.up('Space');await calm.page.waitForFunction(()=>!document.querySelector('#action').classList.contains('is-held'));
   await calm.page.screenshot({path:path.join(out,`${engine}-${tag}-critical-weak-wind.png`)});
   assert.deepEqual(calm.errors,[]);await calm.ctx.close();done('critical flame recovery in weak wind '+tag);
  }
  // An opened eddy cannot make the still-dangerous shortcut wind safe.
  {
   const eddy=await open(size,'?qa=1&seed=5&speed=.1&t=29.2&vital=flame-full');await eddy.page.locator('#play').click();
   await eddy.page.locator('#route-choice [data-route="shortcut"]').click();
   await eddy.page.waitForFunction(()=>document.querySelector('#stage').dataset.event==='eddy',null,{timeout:3000});
   await eddy.page.locator('#action').focus();await eddy.page.keyboard.down('Space');
   await eddy.page.waitForFunction(()=>document.querySelector('#action').classList.contains('is-held'));
   await eddy.page.keyboard.up('Space');
   await eddy.page.waitForFunction(()=>Number(document.querySelector('#stage').dataset.wind)>.5&&document.querySelector('.action-cue').textContent.includes('近道の風'),null,{timeout:3000});
   const before=Number(await eddy.page.locator('#light-meter').getAttribute('aria-valuenow'));
   await eddy.page.waitForFunction(n=>Number(document.querySelector('#light-meter').getAttribute('aria-valuenow'))<n,before,{timeout:5000});
   assert.match(await eddy.page.locator('.action-cue').innerText(),/近道の風.*かばって/,'damaging shortcut remains visible after opening the eddy '+tag);
   await eddy.page.screenshot({path:path.join(out,`${engine}-${tag}-eddy-shortcut-warning.png`)});
   assert.deepEqual(eddy.errors,[]);await eddy.ctx.close();done('eddy opening preserves shortcut wind warning '+tag);
  }
  // The warning must match the wind that actually damages an exposed flame.
  {
   const wind=await open(size,'?qa=1&seed=2&speed=.25&t=5&vital=flame-full');await wind.page.locator('#play').click();
   await wind.page.waitForFunction(()=>{const s=document.querySelector('#stage');return Number(s.dataset.wind)>.5&&Number(s.dataset.wind)<.61&&document.querySelector('.action-cue').textContent.includes('風が来る')},null,{timeout:5000});
   await wind.page.waitForFunction(()=>Number(document.querySelector('#light-meter').getAttribute('aria-valuenow'))<=97,null,{timeout:8000});
   assert.match(await wind.page.locator('.action-cue').innerText(),/風が来る.*長押し/,'damaging wind asks the player to shield '+tag);
   await wind.page.screenshot({path:path.join(out,`${engine}-${tag}-wind-damage-warning.png`)});
   await wind.page.locator('#action').focus();await wind.page.keyboard.down('Space');await wind.page.waitForFunction(()=>document.querySelector('#action').classList.contains('is-held'));
   const guarded=Number(await wind.page.locator('#light-meter').getAttribute('aria-valuenow'));await wind.page.waitForTimeout(1000);
   assert.ok(Number(await wind.page.locator('#light-meter').getAttribute('aria-valuenow'))>=guarded,'shielding prevents the flame loss '+tag);
   await wind.page.keyboard.up('Space');assert.deepEqual(wind.errors,[]);await wind.ctx.close();done('damaging wind warning and protection '+tag);
  }
  // A second touch can collect a memory without releasing the first hold.
  {
   const memory=await open(size,'?qa=1&seed=2&speed=0.0001&t=14.5');await memory.page.locator('#play').click();
   await memory.page.locator('#memory-touch').waitFor({state:'visible'});
   await memory.page.evaluate(()=>{const a=document.querySelector('#memory-touch'),r=a.getBoundingClientRect();a.dispatchEvent(new PointerEvent('pointerdown',{pointerId:30,pointerType:'touch',isPrimary:false,button:0,clientX:r.x+r.width/2,clientY:r.y+r.height/2,bubbles:true}))});
   await memory.page.locator('#journey-menu-open').click();await memory.page.locator('#pause-resume').click();await memory.page.locator('#memory-touch').waitFor({state:'visible'});
   await memory.page.evaluate(()=>{const a=document.querySelector('#memory-touch'),r=a.getBoundingClientRect();a.dispatchEvent(new PointerEvent('pointerup',{pointerId:30,pointerType:'touch',isPrimary:false,button:0,clientX:r.x+r.width/2,clientY:r.y+r.height/2,bubbles:true}))});
   assert.equal(await memory.page.locator('#best').innerText(),'0 / 3','pause clears an unfinished touch '+tag);
   await memory.page.locator('#action').focus();await memory.page.keyboard.down('Space');
   await memory.page.waitForFunction(()=>document.querySelector('#action').classList.contains('is-held'));
   await memory.page.evaluate(()=>{const a=document.querySelector('#memory-touch'),r=a.getBoundingClientRect(),x=r.x+r.width/2,y=r.y+r.height/2;const p=(type,id,px=x,py=y)=>new PointerEvent(type,{pointerId:id,pointerType:'touch',isPrimary:false,button:0,clientX:px,clientY:py,bubbles:true});a.dispatchEvent(p('pointerdown',31));a.dispatchEvent(p('pointercancel',31));a.dispatchEvent(p('pointerup',31));a.dispatchEvent(p('pointerdown',32));a.dispatchEvent(p('pointerup',32,r.right+20,y))});
   assert.equal(await memory.page.locator('#best').innerText(),'0 / 3','canceled and outside touches do not collect '+tag);
   await memory.page.evaluate(()=>{const a=document.querySelector('#memory-touch'),r=a.getBoundingClientRect(),p=type=>new PointerEvent(type,{pointerId:33,pointerType:'touch',isPrimary:false,button:0,clientX:r.x+r.width/2,clientY:r.y+r.height/2,bubbles:true});a.dispatchEvent(p('pointerdown'));a.dispatchEvent(p('pointerup'))});
   await memory.page.waitForFunction(()=>document.querySelector('#best').textContent==='1 / 3',null,{timeout:3000});
   assert.equal(await memory.page.locator('#action').evaluate(el=>el.classList.contains('is-held')),true,'collecting with another pointer keeps the hold '+tag);
   await memory.page.waitForFunction(()=>!document.querySelector('#stage').dataset.mote,null,{timeout:3000});
   await memory.page.screenshot({path:path.join(out,`${engine}-${tag}-held-memory.png`)});await memory.page.keyboard.up('Space');
   assert.deepEqual(memory.errors,[]);await memory.ctx.close();
   const scene=await open(size,'?qa=1&seed=2&speed=0.0001&t=14.5');await scene.page.locator('#play').click();await scene.page.waitForFunction(()=>document.querySelector('#stage').dataset.mote);
   await scene.page.locator('#action').focus();await scene.page.keyboard.down('Space');await scene.page.waitForFunction(()=>document.querySelector('#action').classList.contains('is-held'));
   await scene.page.evaluate(()=>{const a=document.querySelector('#stage'),r=a.getBoundingClientRect(),[mx,my]=a.dataset.mote.split(',').map(Number),x=r.x+mx,y=r.y+my;const p=(type,id,px=x,py=y)=>new PointerEvent(type,{pointerId:id,pointerType:'touch',isPrimary:false,button:0,clientX:px,clientY:py,bubbles:true});a.dispatchEvent(p('pointerdown',41));a.dispatchEvent(p('pointercancel',41));a.dispatchEvent(p('pointerup',41));a.dispatchEvent(p('pointerdown',42));a.dispatchEvent(p('pointerup',42,x+100,y))});
   assert.equal(await scene.page.locator('#best').innerText(),'0 / 3','canceled or dragged-away scene touches do not collect '+tag);
   await scene.page.evaluate(()=>{const a=document.querySelector('#stage'),r=a.getBoundingClientRect(),[x,y]=a.dataset.mote.split(',').map(Number),p=type=>new PointerEvent(type,{pointerId:43,pointerType:'touch',isPrimary:false,button:0,clientX:r.x+x,clientY:r.y+y,bubbles:true});a.dispatchEvent(p('pointerdown'));a.dispatchEvent(p('pointerup'))});
   await scene.page.waitForFunction(()=>document.querySelector('#best').textContent==='1 / 3',null,{timeout:3000});
   assert.equal(await scene.page.locator('#action').evaluate(el=>el.classList.contains('is-held')),true,'collecting from the scene keeps the hold '+tag);
   await scene.page.waitForFunction(()=>!document.querySelector('#stage').dataset.mote,null,{timeout:3000});
   await scene.page.screenshot({path:path.join(out,`${engine}-${tag}-held-scene-memory.png`)});await scene.page.keyboard.up('Space');assert.deepEqual(scene.errors,[]);await scene.ctx.close();
   if(engine==='chromium'){
    const touch=await open(size,'?qa=1&seed=2&speed=0.0001&t=14.5');await touch.page.locator('#play').click();await touch.page.locator('#memory-touch').waitFor({state:'visible'});
    const a=await touch.page.locator('#action').boundingBox(),m=await touch.page.locator('#memory-touch').boundingBox(),cdp=await touch.ctx.newCDPSession(touch.page);
    const first={x:Math.round(a.x+a.width/2),y:Math.round(a.y+a.height/2),id:1},second={x:Math.round(m.x+m.width/2),y:Math.round(m.y+m.height/2),id:2};
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first]});await touch.page.waitForFunction(()=>document.querySelector('#action').classList.contains('is-held'));
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[first,second]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[second]});
    await touch.page.waitForFunction(()=>document.querySelector('#best').textContent==='1 / 3',null,{timeout:3000});
    assert.equal(await touch.page.locator('#action').evaluate(el=>el.classList.contains('is-held')),true,'the first finger remains held after the second collects '+tag);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[first]});await touch.page.waitForFunction(()=>!document.querySelector('#action').classList.contains('is-held'));
    assert.deepEqual(touch.errors,[]);await touch.ctx.close();
    const canvasTouch=await open(size,'?qa=1&seed=2&speed=0.0001&t=14.5');await canvasTouch.page.locator('#play').click();await canvasTouch.page.waitForFunction(()=>document.querySelector('#stage').dataset.mote);
    const hold=await canvasTouch.page.locator('#action').boundingBox(),point=await canvasTouch.page.evaluate(()=>{const e=document.querySelector('#stage'),r=e.getBoundingClientRect(),[x,y]=e.dataset.mote.split(',').map(Number);return {x:Math.round(r.x+x),y:Math.round(r.y+y)}}),session=await canvasTouch.ctx.newCDPSession(canvasTouch.page);
    const finger={x:Math.round(hold.x+hold.width/2),y:Math.round(hold.y+hold.height/2),id:1},other={...point,id:2};
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger]});await canvasTouch.page.waitForFunction(()=>document.querySelector('#action').classList.contains('is-held'));
    await session.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[finger,other]});await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[other]});
    await canvasTouch.page.waitForFunction(()=>document.querySelector('#best').textContent==='1 / 3',null,{timeout:3000});
    assert.equal(await canvasTouch.page.locator('#action').evaluate(el=>el.classList.contains('is-held')),true,'touching the memory in the scene keeps the first finger held '+tag);
    await session.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[finger]});await canvasTouch.page.waitForFunction(()=>!document.querySelector('#action').classList.contains('is-held'));
    assert.deepEqual(canvasTouch.errors,[]);await canvasTouch.ctx.close();
   }
   done('held memory collection with another touch '+tag);
  }
  {
   const warning=await open(size,'?qa=1&seed=2&speed=0.0001&t=5&vital=breath-warning');await warning.page.locator('#play').click();
   await warning.page.waitForFunction(()=>Number(document.querySelector('#breath-meter').getAttribute('aria-valuenow'))===26,null,{timeout:3000});
   await warning.page.locator('#action').focus();await warning.page.keyboard.down('Space');
   await warning.page.waitForFunction(()=>document.querySelector('.action-cue').textContent.includes('息が苦しい'),null,{timeout:3000});
   assert.ok(Number(await warning.page.locator('#stage').getAttribute('data-wind'))>.44,'breath warning must be tested while wind remains strong '+tag);
   assert.match(await warning.page.locator('.action-cue').innerText(),/息が苦しい.*離して/);
   await warning.page.screenshot({path:path.join(out,`${engine}-${tag}-breath-warning.png`)});
   await warning.page.keyboard.up('Space');assert.deepEqual(warning.errors,[]);await warning.ctx.close();done('low breath guidance names the reason '+tag);
  }
  {
   const touch=await open(size,'?qa=1&seed=2&speed=0.0001&t=2.2&vital=breath');await touch.page.locator('#play').click();
   await touch.page.waitForFunction(()=>document.querySelector('#action').disabled);
   const touchBox=await touch.page.locator('#action').boundingBox();await touch.page.touchscreen.tap(touchBox.x+touchBox.width/2,touchBox.y+touchBox.height/2);
   await touch.page.waitForTimeout(250);
   assert.equal(await touch.page.locator('#action').isDisabled(),true,'a tap cannot bypass the breath lock '+tag);
   assert.doesNotMatch(await touch.page.locator('#story-beat').innerText(),/息が少し戻る/,'a blocked touch cannot earn a release reward '+tag);
   assert.deepEqual(touch.errors,[]);await touch.ctx.close();
   const breath=await open(size,'?qa=1&seed=2&speed=.25&t=2.2&vital=breath');await breath.page.locator('#play').click();
   await breath.page.waitForFunction(()=>document.querySelector('#action').disabled);
   await breath.page.screenshot({path:path.join(out,`${engine}-${tag}-breath-disabled.png`)});
   const box=await breath.page.locator('#action').boundingBox();await breath.page.mouse.move(box.x+box.width/2,box.y+box.height/2);await breath.page.mouse.down();
   await breath.page.waitForTimeout(250);
   assert.equal(await breath.page.locator('#action').evaluate(el=>el.classList.contains('is-held')),false,'disabled breath control must not shield '+tag);
   await breath.page.waitForFunction(()=>!document.querySelector('#action').disabled,null,{timeout:8000});
   assert.equal(await breath.page.locator('#action').evaluate(el=>el.classList.contains('is-held')),false,'a blocked hold must not start after recovery '+tag);
   await breath.page.mouse.up();await breath.page.mouse.down();
   await breath.page.waitForFunction(()=>document.querySelector('#action').classList.contains('is-held'),null,{timeout:3000});
   await breath.page.mouse.up();assert.deepEqual(breath.errors,[]);await breath.ctx.close();done('critical breath blocks pointer until recovery '+tag);
  }
  // Every full-screen phase offers an exit. During play, leaving requires confirmation.
  {
   const title=await open(size,'?qa=1&speed=0.0001');
   assert.equal(await title.page.locator('.journey-back').getAttribute('href'),'../works/');
   await title.page.locator('.journey-back').click();
   await title.page.waitForURL(url=>url.pathname==='/emotion-games/works/');
   assert.deepEqual(title.errors,[]);await title.ctx.close();
   const intro=await open(size,'?qa=1&speed=0.0001',{intro:true});
   await intro.page.locator('#play').click();await intro.page.locator('.intro-back').click();
   await intro.page.waitForURL(url=>url.pathname==='/emotion-games/works/');
   assert.deepEqual(intro.errors,[]);await intro.ctx.close();
   const play=await open(size,'?qa=1&speed=0.0001');
   await play.page.locator('#play').click();
   await play.page.locator('#journey-back-play').click();
   assert.equal(await play.page.locator('#pause-confirm-action').innerText(),'作品一覧へ戻る');
   await play.page.screenshot({path:path.join(out,`${engine}-${tag}-return-confirm.png`)});
   await play.page.locator('#pause-cancel').click();
   await play.page.locator('#pause-resume').click();
   assert.equal(new URL(play.page.url()).pathname,'/emotion-games/kienaide/');
   await play.page.locator('#journey-back-play').click();
   await play.page.locator('#pause-confirm-action').click();
   await play.page.waitForURL(url=>url.pathname==='/emotion-games/works/');
   assert.deepEqual(play.errors,[]);await play.ctx.close();done('full-screen return routes '+tag);
  }
  {
   const guide=await open(size,'?qa=1&seed=2&speed=0.0001');
   await guide.page.locator('#play').click();
   assert.match(await guide.page.locator('#story-beat').innerText(),/長押し.*離して/,'the opening teaches both actions');
   assert.match(await guide.page.locator('#story-beat').innerText(),/凪や息苦しい時/,'the opening explains both reasons to release');
   await guide.page.waitForFunction(()=>document.querySelector('.action-cue').textContent.includes('凪では離す'));
   await guide.page.screenshot({path:path.join(out,`${engine}-${tag}-first-play-guidance.png`)});
   assert.deepEqual(guide.errors,[]);await guide.ctx.close();
   const {ctx,page,errors}=await open(size,'?qa=1&seed=2&speed=0.0001&t=2.2&vital=breath-mid');
   await page.locator('#play').click();
   await page.waitForFunction(()=>Number(document.querySelector('#breath-meter').getAttribute('aria-valuenow'))===80);
   const breathBefore=Number(await page.locator('#breath-meter').getAttribute('aria-valuenow'));
   await page.locator('#action').focus();await page.keyboard.down('Space');
   await page.waitForFunction(()=>document.querySelector('#action').classList.contains('is-held'));
   await page.keyboard.up('Space');
   await page.waitForFunction(()=>document.querySelector('.action-cue').textContent.includes('火の子が手を温めた'));
   assert.match(await page.locator('#story-beat').innerText(),/息が少し戻る/);
   assert.ok(Number(await page.locator('#breath-meter').getAttribute('aria-valuenow'))>=breathBefore+5,'the warmth restores actual breath');
   await page.screenshot({path:path.join(out,`${engine}-${tag}-companion-warmth.png`)});
   assert.deepEqual(errors,[]);await ctx.close();done('first-play guidance and companion response '+tag);
  }
  // Down and up can both arrive before the next animation frame on a slow device.
  {
   const fast=await open(size,'?qa=1&seed=2&speed=0.0001&t=2.2&vital=breath-mid');await fast.page.locator('#play').click();
   await fast.page.waitForFunction(()=>Number(document.querySelector('#breath-meter').getAttribute('aria-valuenow'))===80);
   await fast.page.locator('#action').focus();
   await fast.page.evaluate(()=>{const a=document.querySelector('#action');a.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}));window.dispatchEvent(new Event('blur'));document.dispatchEvent(new KeyboardEvent('keyup',{key:' ',bubbles:true}))});
   await fast.page.waitForTimeout(200);
   assert.doesNotMatch(await fast.page.locator('#story-beat').innerText(),/息が少し戻る/,'a same-frame cancellation must not earn warmth '+tag);
   await fast.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await fast.page.locator('#action').focus();
   await fast.page.evaluate(()=>{const a=document.querySelector('#action');a.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}));document.dispatchEvent(new KeyboardEvent('keyup',{key:' ',bubbles:true}))});
   await fast.page.waitForFunction(()=>document.querySelector('.action-cue').textContent.includes('火の子が手を温めた'),null,{timeout:3000});
   assert.ok(Number(await fast.page.locator('#breath-meter').getAttribute('aria-valuenow'))>=85,'a same-frame deliberate release restores breath '+tag);
   await fast.page.screenshot({path:path.join(out,`${engine}-${tag}-fast-release.png`)});
   assert.deepEqual(fast.errors,[]);await fast.ctx.close();
   const touch=await open(size,'?qa=1&seed=9&speed=0.0001&t=22.5');await touch.page.locator('#play').click();
   await touch.page.waitForFunction(()=>Number(document.querySelector('#stage').dataset.wind)>.1);
   await touch.page.evaluate(()=>{const a=document.querySelector('#action');a.setPointerCapture=()=>{};a.hasPointerCapture=()=>false;const p=type=>new PointerEvent(type,{pointerId:11,pointerType:'touch',button:0,bubbles:true});a.dispatchEvent(p('pointerdown'));a.dispatchEvent(p('pointercancel'))});
   await touch.page.waitForTimeout(200);
   assert.doesNotMatch(await touch.page.locator('#story-beat').innerText(),/建物の陰/,'a same-frame touch cancellation must not earn shelter '+tag);
   await touch.page.evaluate(()=>{const a=document.querySelector('#action'),p=type=>new PointerEvent(type,{pointerId:12,pointerType:'touch',button:0,bubbles:true});a.dispatchEvent(p('pointerdown'));a.dispatchEvent(p('pointerup'))});
   await touch.page.waitForFunction(()=>document.querySelector('#story-beat').textContent.includes('建物の陰'),null,{timeout:3000});
   assert.ok(Number(await touch.page.locator('#stage').getAttribute('data-wind'))<.1,'a same-frame touch release earns shelter '+tag);
   assert.deepEqual(touch.errors,[]);await touch.ctx.close();done('same-frame keyboard and touch release and cancellation '+tag);
  }
  // A tunnel lull becomes a safe place only after a deliberate release.
  {
   const {ctx,page,errors}=await open(size,'?qa=1&seed=9&speed=0.0001&t=22.5');
   await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#stage').dataset.wind);
   const idle=Number(await page.locator('#stage').getAttribute('data-wind'));
   assert.ok(idle>.1,'idling alone must not grant tunnel shelter '+tag);
   await page.locator('#action').focus();await page.keyboard.down('Space');
   await page.waitForFunction(()=>document.querySelector('.action-cue').textContent.includes('軒先の陰'));
   await page.waitForTimeout(500);
   await page.screenshot({path:path.join(out,`${engine}-${tag}-shelter-release-hint.png`)});
   await page.keyboard.up('Space');
   await page.waitForFunction(()=>document.querySelector('#story-beat').textContent.includes('建物の陰'));
   assert.ok(Number(await page.locator('#stage').getAttribute('data-wind'))<idle*.25,'the deliberate release must reach actual shelter '+tag);
   const distance=await page.locator('#distance-panel').evaluate(el=>({visible:getComputedStyle(el).visibility,text:el.textContent,box:el.getBoundingClientRect().toJSON()}));
   assert.equal(distance.visible,'visible','distance stays visible during shelter '+tag);
   assert.match(distance.text,/\d+m/,'distance remains readable during shelter '+tag);
   assert.ok(distance.box.width>=170,'the shelter must not shrink the journey marker '+tag);
   await page.waitForFunction(()=>getComputedStyle(document.querySelector('#story-beat')).opacity>.8);
   await page.waitForTimeout(500);
   await page.screenshot({path:path.join(out,`${engine}-${tag}-shelter-earned.png`)});
   assert.deepEqual(errors,[]);await ctx.close();done('earned tunnel shelter '+tag);
   const canceled=await open(size,'?qa=1&seed=9&speed=0.0001&t=22.5');
   await canceled.page.locator('#play').click();await canceled.page.locator('#action').focus();await canceled.page.keyboard.down('Space');
   await canceled.page.waitForFunction(()=>document.querySelector('.action-cue').textContent.includes('軒先の陰'));
   await canceled.page.locator('#stage').focus();await canceled.page.keyboard.up('Space');await canceled.page.waitForTimeout(150);
   assert.ok(Number(await canceled.page.locator('#stage').getAttribute('data-wind'))>.1,'losing focus must not claim the shelter '+tag);
   assert.doesNotMatch(await canceled.page.locator('#story-beat').innerText(),/建物の陰/);
   await canceled.page.locator('#action').focus();await canceled.page.keyboard.down('Space');
   await canceled.page.waitForFunction(()=>document.querySelector('.action-cue').textContent.includes('軒先の陰'));
   await canceled.page.evaluate(()=>window.dispatchEvent(new Event('blur')));await canceled.page.keyboard.up('Space');await canceled.page.waitForTimeout(150);
   assert.ok(Number(await canceled.page.locator('#stage').getAttribute('data-wind'))>.1,'window blur must not claim the shelter '+tag);
   assert.doesNotMatch(await canceled.page.locator('#story-beat').innerText(),/建物の陰/);
   assert.deepEqual(canceled.errors,[]);await canceled.ctx.close();done('cancelled hold keeps shelter available '+tag);
  }
  // The neighbour's window is a real place to release, but the shortcut passes it by.
  {
   const {ctx,page,errors}=await open(size,'?qa=1&seed=19&speed=12&t=27&vital=flame-full');
   await page.locator('#play').click();await page.locator('#route-choice [data-route="rest"]').waitFor({state:'visible'});await page.locator('#route-choice [data-route="rest"]').click();await page.waitForFunction(()=>document.querySelector('#stage').dataset.event==='lantern',null,{timeout:8000});
   const reading=await page.evaluate(()=>{const stage=document.querySelector('#stage');return {wind:Number(stage.dataset.wind),base:window.KienaideCore.baseWind(Number(stage.dataset.elapsed),1),caption:document.querySelector('.action-cue').textContent}});
   assert.ok(reading.wind<reading.base*.25,'the lantern must visibly shelter the player '+tag);
   assert.match(reading.caption,/息を戻そう/,'the prompt should explain the safe release '+tag);
   await page.screenshot({path:path.join(out,`${engine}-${tag}-lantern-shelter.png`)});
   assert.deepEqual(errors,[]);await ctx.close();done('lantern shelter '+tag);
  }
  {
   const {ctx,page,errors}=await open(size,'?qa=1&seed=19&speed=12&t=27&vital=flame-full');
   await page.locator('#play').click();await page.locator('#route-choice [data-route="shortcut"]').waitFor({state:'visible'});await page.locator('#route-choice [data-route="shortcut"]').click();
   await page.waitForFunction(()=>document.querySelector('#stage').dataset.event==='lantern',null,{timeout:8000});
   const reading=await page.evaluate(()=>{const stage=document.querySelector('#stage');return {wind:Number(stage.dataset.wind),base:window.KienaideCore.baseWind(Number(stage.dataset.elapsed),1),caption:document.querySelector('.action-cue').textContent,story:document.querySelector('#story-beat').textContent}});
   assert.ok(reading.wind>reading.base*.9,'the shortcut must pass the post-fork window without shelter '+tag);
   assert.doesNotMatch(reading.caption,/窓が風をさえぎる/,'the shortcut cannot offer the skipped shelter '+tag);
   assert.match(reading.story,/近道からは、あの窓に寄れない/,'story should explain the missed shelter '+tag);
   await page.screenshot({path:path.join(out,`${engine}-${tag}-lantern-shortcut.png`)});
   assert.deepEqual(errors,[]);await ctx.close();done('lantern shortcut tradeoff '+tag);
  }
  // Measure rendered character lines, not just CSS properties: no <=5-character orphan.
  if(size.width===390){
   const warm=await open(size,'?qa=1&seed=1&speed=0.0001&t=8.3');await warm.page.locator('#play').click();
   await warm.page.waitForFunction(()=>document.querySelector('#stage').dataset.event==='lull',null,{timeout:3000});
   assert.match(await warm.page.locator('.action-cue').innerText(),/追い風/,'the beneficial wind must ask for release');
   await warm.page.screenshot({path:path.join(out,`${engine}-warm-tailwind.png`)});
   assert.deepEqual(warm.errors,[]);await warm.ctx.close();done('warm wind visual cue and release guidance');
  }
  {
   const {ctx,page,errors}=await open(size,'?qa=1&seed=3&speed=0.0001&t=8');
   await page.locator('#play').click();await page.waitForTimeout(500);
   const violations=await page.evaluate(({storyCopy,captionCopy,guidanceSource})=>{
    const markup=new Function('esc',guidanceSource+';return guidanceMarkup;')(text=>{const span=document.createElement('span');span.textContent=text;return span.innerHTML});
    const K=window.KienaideCore,events=Array.from({length:8},(_,i)=>K.eventSchedule(i+1)).flat().map(e=>e.tip);
    const story=[...storyCopy,...K.CHAPTERS.map(c=>c.line),...events];
    const failures=[];
    for(const [selector,texts] of [['#story-beat strong',story],['.action-cue',[...captionCopy,...events]]]){
     const el=document.querySelector(selector),original=el.innerHTML;
     for(const text of new Set(texts)){
      el.innerHTML=markup(text);const lines=[],walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
      if(el.textContent!==text)failures.push({selector,text,reason:'copy changed'});
      for(let node=walker.nextNode();node;node=walker.nextNode())for(let i=0;i<node.length;i++){
       const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);
       const rect=range.getBoundingClientRect();if(rect.left<0||rect.right>innerWidth)failures.push({selector,text,reason:'glyph clipped'});let line=lines.find(l=>Math.abs(l.top-rect.top)<1);
       if(!line){line={top:rect.top,text:''};lines.push(line)}line.text+=node.textContent[i];
      }
      const box=el.getBoundingClientRect();
      if(el.scrollWidth>el.clientWidth+1||box.right>innerWidth||box.left<0)failures.push({selector,text,reason:'overflow'});
      if(lines.length>1&&lines.at(-1).text.trim().length<=5)failures.push({selector,text,lines:lines.map(l=>l.text)});
     }
     el.innerHTML=original;
    }
    return failures;
   },{storyCopy,captionCopy,guidanceSource});
   assert.deepEqual(violations,[],'guidance must retain readable type without short orphan lines '+tag);
   await page.screenshot({path:path.join(out,`${engine}-${tag}-guidance-wrap.png`)});
   assert.deepEqual(errors,[]);await ctx.close();done('guidance line balance '+tag);
  }
  // Narrative beats leave the painting clear after one reading, including reduced motion.
  {
   const reduced=size.width===360,{ctx,page,errors}=await open(size,'?qa=1&seed=3&speed=0.0001&t=8',{reduced});
   await page.locator('#play').click();await page.waitForFunction(()=>getComputedStyle(document.querySelector('#story-beat')).opacity>.5);
   await page.waitForFunction(()=>!document.querySelector('#story-beat').classList.contains('show'),null,{timeout:6000});
   assert.ok(Number(await page.locator('#story-beat').evaluate(el=>getComputedStyle(el).opacity))<.05,'story text must clear the painting '+tag);
   await page.waitForTimeout(250);assert.ok(await page.locator('#story-beat').evaluate(el=>!el.classList.contains('show')),'unchanged chapter text must not reappear each frame');
   await page.screenshot({path:path.join(out,`${engine}-${tag}-story-cleared.png`)});
   assert.deepEqual(errors,[]);await ctx.close();done('story clears '+tag+(reduced?' reduced':''));
  }
  // Interrupted holds must release; unrelated fingers/keys must not release the owner.
  {
   const {ctx,page,errors}=await open(size,'?qa=1&seed=7&speed=0.0001&t=8');
   await page.locator('#play').click();const action=page.locator('#action');await action.focus();
   await page.keyboard.down('Space');await page.waitForFunction(()=>document.querySelector('#action').classList.contains('is-held'));
   await page.keyboard.press('Enter');await page.waitForTimeout(80);
   assert.ok(await action.evaluate(el=>el.classList.contains('is-held')),'another key must not release Space');
   await page.keyboard.press('Tab');
   await page.waitForFunction(()=>!document.querySelector('#action').classList.contains('is-held'),null,{timeout:3000});
   await page.keyboard.up('Space');
   const box=await action.boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
   await page.waitForFunction(()=>document.querySelector('#action').classList.contains('is-held'));
   assert.equal(await page.evaluate(()=>document.hasFocus()),true,'the first pointer press restores window focus and starts the hold');
   await action.dispatchEvent('pointerup',{pointerId:999,pointerType:'touch'});await page.waitForTimeout(80);
   assert.ok(await action.evaluate(el=>el.classList.contains('is-held')),'another finger must not release the active hold');
   const released=await action.evaluate(el=>{for(let id=1;id<10;id++)if(el.hasPointerCapture(id)){el.releasePointerCapture(id);return true}return false});
   assert.equal(released,true,'the test must release a real captured pointer');
   await page.mouse.move(1,1);
   await page.waitForFunction(()=>!document.querySelector('#action').classList.contains('is-held'),null,{timeout:3000});
   await page.mouse.up();
   await action.focus();await page.keyboard.press('Space');await page.waitForTimeout(80);
   assert.ok(await action.evaluate(el=>!el.classList.contains('is-held')),'input remains usable after interruption');
   await page.screenshot({path:path.join(out,`${engine}-${tag}-input-recovered.png`)});
   assert.deepEqual(errors,[]);await ctx.close();done('hold ownership and interruption '+tag);
  }
  // Chapters: frozen at a moment inside each chapter (speed=0.0001 keeps the frame still).
  for(const [i,t] of [[1,8],[2,30],[3,56],[4,76]]){
   const {ctx,page,errors}=await open(size,'?qa=1&seed=3&speed=0.0001&t='+t);
   await page.locator('#play').click();
   await page.waitForFunction(n=>document.querySelector('#stage').dataset.chapter===String(n),i,{timeout:5000});
   await page.waitForTimeout(500);
   const pose=await page.locator('#stage').getAttribute('data-pose');
   assert.ok(pose&&pose.startsWith('hero-'),'chapter must select a playable hero pose: '+pose);
   const vfx=await page.locator('#stage').getAttribute('data-vfx');
   assert.match(vfx,/grade/,'paintings must share the cinematic colour grade');
   assert.match(vfx,/grain/,'paper grain must unify the separate painted layers');
   assert.match(vfx,/snow-depth/,'snow must be split around the traveller for depth');
   if(i===3)assert.match(vfx,/frost/,'the cold bridge must visibly frost the frame');
   const l=await layout(page,size);
   assert.ok(l.fits,'hold button must be on screen '+tag+' '+JSON.stringify(l));
   assert.ok(l.scrollW<=l.vw+1,'no horizontal scroll '+tag);
   assert.ok(l.actionTop>=l.stageTop&&l.actionBottom<=l.stageBottom+1,'hold button must sit inside the scene '+tag+' '+JSON.stringify(l));
   assert.ok(l.actionH>=90,'primary action must be a substantial thumb deck '+tag+' '+JSON.stringify(l));
   assert.ok(l.stageH>=size.height*.98,'arena should fill the screen ('+l.stageH+'px) '+tag);
   assert.ok(l.stageW>=size.width-1,'arena should fill the screen width ('+l.stageW+'px) '+tag);
   assert.equal(l.hudDisplay,'none','duplicate outer HUD must be hidden '+tag);
   assert.equal(l.topDisplay,'none','site header must not squeeze the game '+tag);
   const distance=await page.locator('#distance-panel').evaluate(el=>({box:el.getBoundingClientRect().toJSON(),font:getComputedStyle(el.querySelector('strong')).fontSize}));
   assert.ok(parseFloat(distance.font)>=30,'journey distance must be readable at a glance '+tag+' '+distance.font);
   assert.ok(distance.box.width>=170,'journey marker should feel like a signpost, not a tiny caption '+tag);
   const loaded=await page.evaluate(()=>[...document.images].length);void loaded;
   await page.screenshot({path:path.join(out,`${engine}-${tag}-chapter${i}.png`)});
   assert.deepEqual(errors,[]);await ctx.close();done('chapter '+i+' '+tag);
  }
  // Bridge frost is earned by exposed play and recedes when the player spends breath to shield.
  {
   const {ctx,page,errors}=await open(size,'?qa=1&seed=9&speed=3&t=62');
   await page.locator('#play').click();
   await page.waitForFunction(()=>Number(document.querySelector('#stage').dataset.bridgeFrost)>.32,null,{timeout:6000});
   const frosted=Number(await page.locator('#stage').getAttribute('data-bridge-frost'));
   assert.match(await page.locator('.action-cue').innerText(),/橋の霜/,'the bridge explains the accumulating danger '+tag);
   await page.screenshot({path:path.join(out,`${engine}-${tag}-bridge-frost-exposed.png`)});
   const breath=Number(await page.locator('#breath-meter').getAttribute('aria-valuenow'));
   await page.locator('#action').focus();await page.keyboard.down('Space');
   await page.waitForFunction(before=>Number(document.querySelector('#stage').dataset.bridgeFrost)<before-.15,frosted,{timeout:4000});
   assert.ok(Number(await page.locator('#breath-meter').getAttribute('aria-valuenow'))<breath,'clearing frost must consume breath '+tag);
   await page.screenshot({path:path.join(out,`${engine}-${tag}-bridge-frost-shielded.png`)});
   await page.keyboard.up('Space');assert.deepEqual(errors,[]);await ctx.close();done('bridge frost responds to play '+tag);
  }
 // Chapter changes are masked by a short blizzard passage rather than a naked image swap.
 if(size.width===390){
  const finale=await open(size,'?qa=1&seed=3&speed=3&t=79&mem=3&vital=flame-full');await finale.page.locator('#play').click();
  await finale.page.waitForFunction(()=>document.querySelector('#stage').dataset.phase==='gust-warning');
  assert.match(await finale.page.locator('#story-beat strong').innerText(),/次の一息に備えて/);
  await finale.page.waitForFunction(()=>document.querySelector('#stage').dataset.phase==='gust-active');
  assert.match(await finale.page.locator('#story-beat strong').innerText(),/守るか、息を残すか/,'the active gust must replace the warning even though the heading is unchanged');
  await finale.page.waitForFunction(()=>getComputedStyle(document.querySelector('#story-beat')).opacity>.5);
  await finale.page.screenshot({path:path.join(out,`${engine}-finale-gust-story.png`)});
  assert.deepEqual(finale.errors,[]);await finale.ctx.close();done('finale warning becomes active guidance');
  const {ctx,page,errors}=await open(size,'?qa=1&seed=3&speed=.5&t=19.8');
  await page.locator('#play').click();
  await page.waitForFunction(()=>document.querySelector('#stage').dataset.transition==='blizzard',{timeout:4000});
  await page.waitForTimeout(1800);
  assert.equal(await page.locator('#stage').getAttribute('data-transition'),'blizzard');
  await page.screenshot({path:path.join(out,`${engine}-chapter-transition.png`)});
  assert.deepEqual(errors,[]);await ctx.close();done('chapter transition');
  if(size.width===390)for(const [route,boundary] of [['shortcut',62],['rest',78]]){
   const fork=await open(size,'?qa=1&seed=4&speed=3&t=27&vital=flame-full');
   await fork.page.evaluate(()=>{
    const stage=document.querySelector('#stage');
    window.__firstFinalEntry=null;
    new MutationObserver(()=>{
     if(!window.__firstFinalEntry&&stage.dataset.chapter==='4') window.__firstFinalEntry=Number(stage.dataset.elapsed);
    }).observe(stage,{attributes:true,attributeFilter:['data-chapter']});
   });
   await fork.page.locator('#play').click();
   await fork.page.locator('#route-choice [data-route="'+route+'"]').waitFor({state:'visible',timeout:10000});await fork.page.locator('#route-choice [data-route="'+route+'"]').click();
   let held=false,scene=null;
   for(let i=0;i<700;i++){
    const decision=fork.page.locator('#route-choice [data-decision]');if(await decision.first().isVisible()){if(held){await fork.page.keyboard.up('Space');held=false}await decision.first().click()}
    scene=await fork.page.locator('#stage').evaluate(el=>({chapter:el.dataset.chapter,elapsed:Number(el.dataset.elapsed),wind:Number(el.dataset.wind),ending:el.dataset.ending}));
    if(scene.chapter==='4'||scene.ending)break;
    const oxygen=Number(await fork.page.locator('#breath-meter').getAttribute('aria-valuenow'));
    const next=held?!(scene.wind<.42||oxygen<30):scene.wind>.54;
    if(next!==held){held=next;if(held)await fork.page.keyboard.down('Space');else await fork.page.keyboard.up('Space')}
    await fork.page.waitForTimeout(40);
   }
   assert.equal(scene.chapter,'4',route+' must reach the last painting before the flame goes out');
   const entry=await fork.page.evaluate(()=>window.__firstFinalEntry);
   assert.ok(entry>=boundary&&entry<boundary+.7,route+' chapter begins at '+entry+' (observed later at '+scene.elapsed+')');
   assert.doesNotMatch(await fork.page.locator('#story-beat small').innerText(),/最終章/,'the next chapter text waits until its painting appears');
   await fork.page.screenshot({path:path.join(out,`${engine}-route-final-entry-${route}.png`)});
   await fork.page.waitForFunction(target=>Number(document.querySelector('#stage').dataset.elapsed)>=target,boundary+1.4,{timeout:3000});
   assert.match(await fork.page.locator('#story-beat small').innerText(),/最終章/);
   await fork.page.screenshot({path:path.join(out,`${engine}-route-final-visible-${route}.png`)});
   assert.deepEqual(fork.errors,[]);await fork.ctx.close();done('route-specific final chapter '+route);
  }
  for(const routeSize of sizes){
  const suffix=routeSize.width===390?'':'-360',choice=routeSize.width===390?'shortcut':'rest';
  const fork=await open(routeSize,'?qa=1&seed=3&speed=1&t=25');await fork.page.locator('#play').click();
  const actionBox=await fork.page.locator('#action').boundingBox();await fork.page.mouse.move(actionBox.x+actionBox.width/2,actionBox.y+actionBox.height/2);await fork.page.mouse.down();
  await fork.page.locator('#route-choice [data-route="shortcut"]').waitFor({state:'visible',timeout:10000});
  await fork.page.mouse.up();
  const before=Number(await fork.page.locator('#distance-value').textContent()),remaining=await fork.page.locator('#timer').innerText();
  assert.match(await fork.page.locator('#route-choice [data-route="shortcut"] small').innerText(),/8秒早く・強風8秒/,'shortcut must explain its time and wind tradeoff');
  const restEffect=await fork.page.locator('#route-choice [data-route="rest"] small').innerText();
  assert.match(restEffect,/8秒遅く・風よけ4秒・息\+\d+%/,'rest must lead with its shelter and show capped breath recovery');
  await fork.page.waitForTimeout(350);assert.equal(await fork.page.locator('#timer').innerText(),remaining,'route decision pauses the countdown');
  assert.equal(await fork.page.locator('#story-beat small').innerText(),'分かれ道','the fork instructions must remain while the player decides');
  await fork.page.screenshot({path:path.join(out,`${engine}-route-choice${suffix}.png`)});
  const targets=await fork.page.locator('#route-choice button').evaluateAll(buttons=>buttons.map(el=>{const r=el.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height,right:r.right,bottom:r.bottom,title:parseFloat(getComputedStyle(el.querySelector('strong')).fontSize),detail:parseFloat(getComputedStyle(el.querySelector('small')).fontSize),reachable:el.contains(document.elementFromPoint(r.x+r.width/2,r.y+r.height/2))}}));
  for(const target of targets){assert.ok(target.width>=280&&target.height>=80,'choices need large thumb targets: '+JSON.stringify(target));assert.ok(target.y>=routeSize.height*.5&&target.bottom<=routeSize.height-24,'choices must sit in the lower half, clear of the bottom edge');assert.ok(target.x>=16&&target.right<=routeSize.width-16,'choices must stay inside the screen');assert.ok(target.title>=16&&target.detail>=12,'choice text must remain legible');assert.ok(target.reachable,'choice centre must receive the tap')}
  assert.ok(targets[1].y-targets[0].bottom>=10,'stacked choices need a gap against accidental taps');
  await fork.page.locator('#route-choice [data-route="'+choice+'"]').tap();
  await fork.page.locator('#route-choice').waitFor({state:'hidden'});await fork.page.waitForTimeout(100);
  const after=Number(await fork.page.locator('#distance-value').textContent());assert.ok(after<=before&&after>=before-1,'route choice must not teleport the distance: '+before+' → '+after);
  const seconds=text=>{const [m,s]=text.split(':').map(Number);return m*60+s};
  const arrival=seconds(await fork.page.locator('#timer').innerText());assert.ok(choice==='shortcut'?arrival<=seconds(remaining)-8:arrival>=seconds(remaining)+7,'the tapped choice must change actual arrival time');
  assert.equal(await fork.page.locator('#route-choice').isVisible(),false);
  await fork.page.screenshot({path:path.join(out,`${engine}-${choice}-after-choice${suffix}.png`)});
  if(choice==='rest')assert.ok(Number(await fork.page.locator('#stage').getAttribute('data-wind'))<=.23,'rest must shelter from actual wind after choosing');
  assert.deepEqual(fork.errors,[]);await fork.ctx.close();done('route choice touch targets '+routeSize.width);
  }
  if(size.width===390){
   const choices=await open(size,'?qa=1&seed=3&speed=12&t=27&vital=flame-full');await choices.page.locator('#play').click();await choices.page.locator('#route-choice [data-route="rest"]').click();
   await choices.page.locator('#route-choice [data-decision="feed"]').waitFor({state:'visible',timeout:10000});
   const before=await choices.page.locator('#timer').innerText();await choices.page.waitForTimeout(250);assert.equal(await choices.page.locator('#timer').innerText(),before,'the hearth choice pauses the clock');
   await choices.page.screenshot({path:path.join(out,`${engine}-hearth-choice.png`)});await choices.page.locator('#route-choice [data-decision="feed"]').click();
   await choices.page.locator('#route-choice [data-decision="spark"]').waitFor({state:'visible',timeout:10000});
   assert.equal(await choices.page.locator('#route-choice button').count(),2);await choices.page.screenshot({path:path.join(out,`${engine}-bridge-choice.png`)});
   await choices.page.locator('#route-choice [data-decision="shelter"]').click();assert.equal(await choices.page.locator('#route-choice').isVisible(),false);
   assert.deepEqual(choices.errors,[]);await choices.ctx.close();done('three playable choices');
  }
  const full=await open(sizes[1],'?qa=1&seed=3&speed=1&t=27');await full.page.locator('#play').click();
  await full.page.locator('#route-choice [data-route="rest"]').waitFor({state:'visible',timeout:10000});
  assert.equal(await full.page.locator('#route-rest-effect').innerText(),'8秒遅く・風よけ4秒・息は満タン','rest must not present full breath as an empty reward');
  await full.page.locator('#route-choice [data-route="rest"]').tap();
  await full.page.waitForFunction(()=>Number(document.querySelector('#stage').dataset.wind)<=.23,null,{timeout:2000});
  await full.page.screenshot({path:path.join(out,`${engine}-rest-full-breath.png`)});
  assert.deepEqual(full.errors,[]);await full.ctx.close();done('rest shelters at full breath');
  if(size.width===390)for(const choice of ['shortcut','rest']){
   const chosen=await open(sizes[0],'?qa=1&seed=19&speed=0.0001&t=28.9&vital=flame-full');await chosen.page.locator('#play').click();await chosen.page.locator('#route-choice [data-route="'+choice+'"]').click();
   await chosen.page.waitForFunction(()=>document.querySelector('#stage').dataset.event!=='',null,{timeout:3000});
   assert.match(await chosen.page.locator('#story-beat strong').innerText(),choice==='shortcut'?/近道へ踏み出した/:/戸口が開いた/,'a simultaneous wind event must not erase the chosen route');
   assert.match(await chosen.page.locator('.action-cue').innerText(),/風|息/,'wind instructions remain available in the control deck');
   await chosen.page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#story-beat')).opacity)>.7,null,{timeout:1500});
   await chosen.page.screenshot({path:path.join(out,`${engine}-route-feedback-${choice}.png`)});
   assert.deepEqual(chosen.errors,[]);await chosen.ctx.close();done('route feedback '+choice);
  }
  for(const [vital,danger] of [['flame','flame-critical'],['breath','breath-critical']]){
   const warning=await open(size,'?qa=1&seed=3&speed=0.0001&t=12&vital='+vital);await warning.page.locator('#play').click();
   await warning.page.waitForFunction(d=>document.querySelector('#stage').dataset.danger===d,danger,{timeout:3000});
   assert.ok(await warning.page.locator('#action').evaluate((el,c)=>el.classList.contains(c),vital==='flame'?'is-life-critical':'is-breath-critical'));
   assert.equal(await warning.page.locator('#distance-panel').getAttribute('data-danger'),danger,'distance signpost must echo the critical state');
   assert.match(await warning.page.locator('#distance-panel').evaluate(el=>getComputedStyle(el).animationName),/kienaide-distance-(life|breath)/,'critical distance state needs a distinct gentle pulse');
   if(vital==='breath'){assert.equal(await warning.page.locator('#action').isDisabled(),true);assert.match(await warning.page.locator('.action-main').innerText(),/ひと休み|はなす/)}
   assert.deepEqual(warning.errors,[]);await warning.ctx.close();
  }
  for(const finalSize of sizes){
   const finalTag=finalSize.width+'x'+finalSize.height;
   const quiet=await open(finalSize,'?qa=1&seed=3&speed=.2&t=87&mem=3&vital=flame');await quiet.page.locator('#play').click();
   await quiet.page.waitForFunction(()=>document.querySelector('#stage').dataset.phase==='silence',null,{timeout:3000});
   await quiet.page.locator('#action').focus();await quiet.page.keyboard.down('Space');
   await quiet.page.waitForFunction(()=>document.querySelector('.action-cue').textContent.includes('いま離して'),null,{timeout:3000});
   assert.equal(await quiet.page.locator('.action-main b').innerText(),'はなす','the held control agrees with the final release cue '+finalTag);
   assert.equal(await quiet.page.locator('#stage').getAttribute('data-danger'),'flame-critical','the flame warning remains visible during the final release '+finalTag);
   await quiet.page.screenshot({path:path.join(out,`${engine}-${finalTag}-critical-final-silence.png`)});
   await quiet.page.keyboard.up('Space');
   await quiet.page.waitForFunction(()=>document.querySelector('.action-main b').textContent==='手をひらいている',null,{timeout:3000});
   assert.match(await quiet.page.locator('.action-main em').innerText(),/そのまま窓の返事を待つ/,'the open hand remains legible after release '+finalTag);
   await quiet.page.screenshot({path:path.join(out,`${engine}-${finalTag}-open-hand-final-silence.png`)});
   await quiet.page.waitForFunction(()=>document.querySelector('#story-beat strong').textContent.includes('手を離した瞬間'),null,{timeout:3000});
   assert.deepEqual(quiet.errors,[]);await quiet.ctx.close();done('critical flame does not hide final release '+finalTag);
   const breath=await open(finalSize,'?qa=1&seed=3&speed=.2&t=87&vital=breath');await breath.page.locator('#play').click();
   await breath.page.waitForFunction(()=>document.querySelector('#stage').dataset.phase==='silence',null,{timeout:3000});
   assert.match(await breath.page.locator('.action-cue').innerText(),/手をひらいて/,'low breath and final reply need the same release '+finalTag);
   assert.equal(await breath.page.locator('.action-main b').innerText(),'手をひらいている','critical breath must not invite another hold '+finalTag);
   assert.equal(await breath.page.locator('#stage').getAttribute('data-danger'),'breath-critical');
   assert.deepEqual(breath.errors,[]);await breath.ctx.close();done('critical breath keeps final release cue '+finalTag);
   const reply=await open(finalSize,'?qa=1&seed=3&speed=.2&t=88.5&vital=breath');await reply.page.locator('#play').click();
   await reply.page.waitForFunction(()=>document.querySelector('#stage').dataset.phase==='window-reply',null,{timeout:3000});
   assert.match(await reply.page.locator('.action-cue').innerText(),/窓の返事.*手を離して息を/,'the reply keeps urgent breathing advice without hiding the scene '+finalTag);
   assert.match(await reply.page.locator('.action-main b').innerText(),/手をひらいている/,'the window reply keeps the hand open '+finalTag);
   assert.deepEqual(reply.errors,[]);await reply.ctx.close();done('critical breath during window reply '+finalTag);
  }
  if(size.width===390){
   const reduced=await open(size,'?qa=1&seed=3&speed=0.0001&t=12&vital=flame',{reduced:true});await reduced.page.locator('#play').click();
   await reduced.page.waitForFunction(()=>document.querySelector('#stage').dataset.danger==='flame-critical',{timeout:3000});
   assert.equal(await reduced.page.locator('#distance-panel').evaluate(el=>getComputedStyle(el).animationName),'none','reduced-motion must disable the distance pulse');
   assert.deepEqual(reduced.errors,[]);await reduced.ctx.close();
   const window=await open(size,'?qa=1&seed=3&speed=0.0001&t=72&mem=2&vital=flame');await window.page.locator('#play').click();
   await window.page.locator('#action').focus();await window.page.keyboard.down('Space');
   await window.page.waitForFunction(()=>document.querySelector('.action-cue').textContent.includes('いま手を離して'),null,{timeout:3000});
   assert.equal(await window.page.locator('#stage').getAttribute('data-danger'),'flame-critical','the visible danger state stays honest while the action cue changes');
   await window.page.screenshot({path:path.join(out,`${engine}-rescue-release-cue.png`)});
   await window.page.keyboard.up('Space');await window.page.waitForFunction(()=>document.querySelector('#story-beat strong').textContent.includes('手を離した瞬間'),null,{timeout:3000});
   assert.deepEqual(window.errors,[]);await window.ctx.close();done('critical flame rescue cue and actual release');
   // Exercise input handlers between frames with an earlier release still eligible but low breath.
   for(const kind of ['keyboard','pointer']){
    const fastCancel=await open(size,'?qa=1&seed=2&speed=.25&t=75&mem=2&vital=flame');
    await fastCancel.page.evaluate(()=>{const core=window.KienaideCore,step=core.step;core.step=(state,...args)=>{window.qaRescueState=state;return step(state,...args)}});
    await fastCancel.page.locator('#play').click();
    await fastCancel.page.waitForFunction(()=>window.qaRescueState&&Number(document.querySelector('#stage').dataset.wind)<.46);
    const recorded=await fastCancel.page.evaluate(kind=>{
     const s=window.qaRescueState,a=document.querySelector('#action');a.focus();
     s.releaseAt=Number(document.querySelector('#stage').dataset.elapsed);s.oxygen=29.9;s.flame=21;s.rescue=false;
     if(kind==='keyboard'){a.dispatchEvent(new KeyboardEvent('keydown',{key:' ',bubbles:true}));window.dispatchEvent(new Event('blur'))}
     else{a.setPointerCapture=()=>{};a.hasPointerCapture=()=>false;const p=type=>new PointerEvent(type,{pointerId:21,pointerType:'touch',button:0,bubbles:true});a.dispatchEvent(p('pointerdown'));a.dispatchEvent(p('pointercancel'))}
     return s.releaseAt;
    },kind);
    assert.equal(recorded,-100,'a same-frame '+kind+' hold invalidates the earlier release immediately');
    if(kind==='keyboard')await fastCancel.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
    await fastCancel.page.waitForFunction(()=>window.qaRescueState.oxygen>=30,null,{timeout:5000});
    assert.equal(await fastCancel.page.evaluate(()=>window.qaRescueState.rescue),false,'cancellation cannot reuse the earlier release');
    assert.deepEqual(fastCancel.errors,[]);await fastCancel.ctx.close();
   }
   done('same-frame interrupted holds cannot reuse rescue release');
   // The late eddy responds to the player's release, not a lost input.
   const eddy=await open(size,'?qa=1&seed=1&speed=.0001&t=67.1');await eddy.page.locator('#play').click();
   await eddy.page.waitForFunction(()=>{const s=document.querySelector('#stage').dataset;return s.event==='eddy'&&Number(s.wind)>.5},null,{timeout:3000});
   await eddy.page.locator('#action').focus();await eddy.page.keyboard.down('Space');
   await eddy.page.waitForFunction(()=>document.querySelector('#action').classList.contains('is-held'));
   await eddy.page.evaluate(()=>window.dispatchEvent(new Event('blur')));await eddy.page.keyboard.up('Space');
   await eddy.page.waitForFunction(()=>!document.querySelector('#action').classList.contains('is-held'));
   await eddy.page.waitForTimeout(200);
   assert.ok(Number(await eddy.page.locator('#stage').getAttribute('data-wind'))>.5,'an interrupted hold leaves the eddy strong');
   assert.doesNotMatch(await eddy.page.locator('#hint').innerText(),/渦の隙間/,'interruption does not announce a discovered opening');
   await eddy.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await eddy.page.screenshot({path:path.join(out,`${engine}-eddy-interrupted.png`)});
   await eddy.page.locator('#action').focus();await eddy.page.keyboard.down('Space');
   await eddy.page.waitForFunction(()=>document.querySelector('#action').classList.contains('is-held'));await eddy.page.keyboard.up('Space');
   await eddy.page.waitForFunction(()=>Number(document.querySelector('#stage').dataset.wind)<=.38,null,{timeout:3000});
   assert.match(await eddy.page.locator('#hint').innerText(),/渦の隙間/,'a deliberate release opens the eddy');
   await eddy.page.screenshot({path:path.join(out,`${engine}-eddy-release.png`)});
   assert.deepEqual(eddy.errors,[]);await eddy.ctx.close();done('eddy interruption and deliberate release');
   const gust=await open(size,'?qa=1&seed=2&speed=.25&t=80.8&mem=2&vital=flame');await gust.page.locator('#play').click();
   await gust.page.waitForFunction(()=>Number(document.querySelector('#stage').dataset.wind)>.55,null,{timeout:3000});
   await gust.page.locator('#action').focus();await gust.page.keyboard.down('Space');await gust.page.waitForTimeout(150);
   const beforeRelease=Number(await gust.page.locator('#stage').getAttribute('data-elapsed'));
   await gust.page.keyboard.up('Space');
   await gust.page.waitForFunction(before=>Number(document.querySelector('#stage').dataset.elapsed)>before,beforeRelease,{timeout:3000});
   assert.ok(Number(await gust.page.locator('#stage').getAttribute('data-wind'))>.46,'the processed release happens in strong wind');
   await gust.page.waitForFunction(()=>{const s=document.querySelector('#stage').dataset;return Number(s.elapsed)>81.65&&Number(s.wind)<.4},null,{timeout:9000});
   assert.doesNotMatch(await gust.page.locator('#story-beat strong').innerText(),/手を離した瞬間/,'a later lull cannot retroactively rescue the gust release');
   await gust.page.screenshot({path:path.join(out,`${engine}-gust-release-no-rescue.png`)});
   assert.deepEqual(gust.errors,[]);await gust.ctx.close();
   const calmRelease=await open(size,'?qa=1&seed=2&speed=.0001&t=81.8&mem=2&vital=flame');await calmRelease.page.locator('#play').click();
   await calmRelease.page.waitForFunction(()=>Number(document.querySelector('#stage').dataset.wind)<.46,null,{timeout:3000});
   await calmRelease.page.locator('#action').focus();await calmRelease.page.keyboard.down('Space');await calmRelease.page.waitForTimeout(150);await calmRelease.page.keyboard.up('Space');
   await calmRelease.page.waitForFunction(()=>document.querySelector('#story-beat strong').textContent.includes('手を離した瞬間'),null,{timeout:3000});
   assert.deepEqual(calmRelease.errors,[]);await calmRelease.ctx.close();done('gust release cannot rescue later; a calm release can');
  }
 }
  const calm=await open(size,'?qa=1&seed=3&speed=.0001&vital=flame');await calm.page.locator('#play').click();
  await calm.page.waitForFunction(()=>document.querySelector('.action-cue').textContent.includes('息を戻して'),null,{timeout:3000});
  assert.equal(await calm.page.locator('#stage').getAttribute('data-danger'),'flame-critical','safe guidance must not hide the life warning '+tag);
  await calm.page.locator('#action').focus();await calm.page.keyboard.down('Space');
  await calm.page.waitForFunction(()=>document.querySelector('.action-cue').textContent.includes('いま離して'),null,{timeout:3000});
  await calm.page.screenshot({path:path.join(out,`${engine}-${tag}-critical-calm-recovery.png`)});
  await calm.page.keyboard.up('Space');assert.deepEqual(calm.errors,[]);await calm.ctx.close();done('critical flame calm recovery cue '+tag);
  const warned=await open(size,'?qa=1&seed=1&speed=.0001&t=27.85&vital=flame');await warned.page.locator('#play').click();
  await warned.page.waitForFunction(()=>document.querySelector('#stage').dataset.event==='gust',null,{timeout:3000});
  assert.match(await warned.page.locator('.action-cue').innerText(),/かばって/,'an incoming gust outranks calm recovery '+tag);
  assert.deepEqual(warned.errors,[]);await warned.ctx.close();done('critical flame keeps gust warning '+tag);
  // Shielding pose and flame light under a held button.
  {
   const {ctx,page,errors}=await open(size,'?qa=1&seed=3&speed=0.0001&t=30');
   await page.locator('#play').click();await page.waitForTimeout(300);
   const b=await page.locator('#action').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();
   await page.waitForFunction(()=>document.querySelector('#stage').dataset.poseTransition==='dissolve',{timeout:1000});
   await page.waitForTimeout(400);
   assert.equal(await page.locator('#stage').getAttribute('data-pose'),'hero-shield','holding must replace the full body with the shielding pose');
   assert.ok(await page.locator('#action').evaluate(el=>el.classList.contains('is-held')),'control deck must visibly react to the held state');
   await page.screenshot({path:path.join(out,`${engine}-${tag}-shield.png`)});
   assert.equal(await page.locator('#hint').innerText().then(x=>x.includes('かば')||x.includes('離して')),true);
   await page.mouse.up();assert.deepEqual(errors,[]);await ctx.close();done('shield '+tag);
  }
 }
 // Migrate the old high-resolution preview collection into the formal game's save without loss.
 {
  const ctx=await browser.newContext({viewport:sizes[0],isMobile:engine==='chromium',hasTouch:true});
  await ctx.addInitScript(()=>{localStorage.setItem('kienaide-art-endings-v1',JSON.stringify(['dawn','survive','not-an-ending']));localStorage.setItem('emotion-endings-v1-kienaide',JSON.stringify(['survive']))});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base);await page.locator('#open-collection').evaluate(el=>el.click());
  assert.equal(await page.locator('#collection-list .found').count(),2,'legacy and current discoveries are deduplicated');
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('emotion-endings-v1-kienaide'))),['survive','dawn']);
  assert.deepEqual(await page.evaluate(()=>JSON.parse(localStorage.getItem('kienaide-art-endings-v1'))),['dawn','survive','not-an-ending'],'legacy data remains untouched');
  assert.deepEqual(errors,[]);await ctx.close();done('ending save migration');
 }
 // Two open production-route tabs must retain each other's discoveries and old preview saves.
 {
  const ctx=await browser.newContext({viewport:sizes[0]});
  await ctx.addInitScript(()=>localStorage.setItem('emotion-kienaide-intro-v1','1'));
  const first=await ctx.newPage(),second=await ctx.newPage(),repeat=await ctx.newPage(),errors=[];
  for(const p of [first,second,repeat])p.on('pageerror',e=>errors.push(e.message));
  await first.goto(base);await first.evaluate(()=>{localStorage.setItem('emotion-endings-v1-kienaide',JSON.stringify(['blown']));localStorage.setItem('kienaide-art-endings-v1',JSON.stringify(['dawn']))});
  await first.goto(base+'?qa=1&seed=2&speed=6&t=89&mem=3&vital=flame-full');
  await second.goto(base+'?qa=1&seed=2&speed=6&t=89&vital=flame-full');
  await repeat.goto(base+'?qa=1&seed=2&speed=6&t=89&mem=3&vital=flame-full');
  await first.bringToFront();await first.locator('#play').click();await first.waitForFunction(()=>document.querySelector('#stage').dataset.ending==='wish',null,{timeout:10000});
  await second.bringToFront();await second.locator('#play').click();await second.waitForFunction(()=>document.querySelector('#stage').dataset.ending==='survive',null,{timeout:10000});
  const saved=await second.evaluate(()=>JSON.parse(localStorage.getItem('emotion-endings-v1-kienaide')));
  assert.deepEqual([...saved].sort(),['blown','dawn','survive','wish'],'a later tab must keep both discoveries and migrated endings');
  assert.deepEqual(await second.evaluate(()=>JSON.parse(localStorage.getItem('kienaide-art-endings-v1'))),['dawn'],'the old collection key remains intact');
  await repeat.bringToFront();await repeat.locator('#play').click();await repeat.waitForFunction(()=>document.querySelector('#stage').dataset.ending==='wish',null,{timeout:10000});
  assert.match(await repeat.locator('#discovery-state').innerText(),/発見済み/,'an ending discovered in another tab is not new');
  await first.waitForFunction(()=>!document.querySelector('#curtain').classList.contains('hidden'));
  await first.locator('#open-collection').evaluate(el=>el.click());
  assert.equal(await first.locator('#collection-list .found').count(),4,'opening an older tab refreshes the collection');
  assert.deepEqual(await second.evaluate(()=>JSON.parse(localStorage.getItem('emotion-kienaide-journeys-v1'))),{started:3,completed:3},'all three journeys remain recorded across tabs');
  await second.reload();await second.locator('#open-collection').evaluate(el=>el.click());
  assert.equal(await second.locator('#collection-list .found').count(),4,'all discoveries remain after reload');
  await second.screenshot({path:path.join(out,`${engine}-concurrent-collection.png`)});
  assert.deepEqual(errors,[]);await ctx.close();done('concurrent collection preserves migrated and new endings');
 }
 // Run the boundary contract in the browser against the shipped core for every route.
 {
  const {ctx,page,errors}=await open(sizes[0],'?qa=1&speed=.0001');
  const results=await page.evaluate(()=>[82,90,98].map(journey=>{
   const K=window.KienaideCore,run=elapsed=>{
    const state=K.create({seed:1});Object.assign(state,{journey,routeChoice:'legacy-test',decisionIndex:2,events:[],flame:80,oxygen:80,memories:3,previousFinalePhase:'silence',gustShield:2.5,silenceRelease:elapsed});
    K.step(state,journey-1.48,.12,{shield:false,wasShield:false});
    return {reply:state.replyLevel,ending:K.arrivalEnding(state),silence:state.silenceRelease};
   };
   const storm=shield=>{const s=K.create({seed:1});Object.assign(s,{journey,chapter:3,routeChoice:'legacy-test',decisionIndex:2,events:[],previousFinalePhase:'gust-active',flame:shield?80:.2,oxygen:shield?.2:80});const events=K.step(s,journey-2.99,.035,{shield});return {ending:s.ended,phase:s.finalePhase,silence:events.some(e=>e.type==='finale'&&e.phase==='silence')}};
   const s=K.create({seed:1});Object.assign(s,{journey,chapter:3,routeChoice:'legacy-test',decisionIndex:2,events:[],previousFinalePhase:'silence',flame:80,oxygen:.05,gustShield:3,silenceRelease:.5});
   const events=K.step(s,journey-1.49,.035,{shield:true});
   return {journey,enough:run(.4),short:run(.34),blown:storm(false),smother:storm(true),silenceExhaustion:{ending:s.ended,phase:s.finalePhase,reply:events.some(e=>e.type==='reply')}};
  }));
  for(const result of results){
   assert.equal(result.enough.reply,'bright','last slice of silence counts for route '+result.journey);
   assert.equal(result.enough.ending,'dawn');
   assert.equal(result.short.reply,'faint','less than .45s stays faint');
   assert.equal(result.short.ending,'wish');
   assert.deepEqual(result.blown,{ending:'blown',phase:'gust-active',silence:false},'the final gust still reaches the exposed flame on route '+result.journey);
   assert.deepEqual(result.smother,{ending:'smother',phase:'gust-active',silence:false},'the final gust still costs breath on route '+result.journey);
   assert.deepEqual(result.silenceExhaustion,{ending:'smother',phase:'silence',reply:false},'breath can run out before the window replies on route '+result.journey);
  }
  assert.deepEqual(errors,[]);await ctx.close();done('finale boundary timing for all routes');
 }
 // Every ending scene, reached through real play rules (QA speed only).
 const size=sizes[0];
 const routes={
  blown:{query:'?qa=1&seed=2',policy:'none'},
  smother:{query:'?qa=1&seed=2',policy:'hold'},
  survive:{query:'?qa=1&seed=2&speed=3',policy:'tele',route:'shortcut'},
  wish:{query:'?qa=1&seed=2&speed=6',policy:'tele',collect:true,skipReply:true},
  // Keep the brief silence long enough for real input to register under a loaded CI runner.
  dawn:{query:'?qa=1&seed=1&speed=1',policy:'tele',collect:true}
 };
 const endingFacts={blown:['届けられなかった','灯り 0%'],smother:['息が尽き','息 0%'],wish:['記憶は戻った','記憶 3 / 3'],survive:['記憶が欠けていた','道の記憶を取りこぼした'],dawn:['待つ人のもとへ届いた','ふたりで夜を越えた']};
 for(const [id,r] of Object.entries(routes)){
  const {ctx,page,errors}=await open(size,r.query);
  await page.locator('#play').click();
  const box=await page.locator('#action').boundingBox();let holding=false;const phases=new Set(),trace=[];
  const press=async on=>{if(on===holding||(on&&await page.locator('#action').isDisabled()))return;holding=on;if(on){await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down()}else await page.mouse.up()};
  if(r.policy==='hold')await press(true);
  for(let i=0;i<4000&&!(await page.locator('#stage').getAttribute('data-ending'));i++){
   if(await page.locator('#route-choice').isVisible()){
    const route=r.route||(id==='blown'?'shortcut':'rest');await press(false);await page.locator('#route-choice [data-route="'+route+'"],#route-choice [data-decision]').first().click();
    if(r.policy==='hold')await press(true);
   }
   if(r.policy==='tele'){
   const st=await page.evaluate(()=>{const c=document.querySelector('#stage');return {at:performance.now(),hint:document.querySelector('#hint').textContent,mote:c.dataset.mote,phase:c.dataset.phase,reply:c.dataset.reply,timer:document.querySelector('#timer').textContent,light:document.querySelector('#record').textContent,breath:document.querySelector('#breath-meter').getAttribute('aria-valuenow'),held:document.querySelector('#action').classList.contains('is-held')}});
    trace.push({...st,driverHeld:holding});if(trace.length>200)trace.shift();
    phases.add(st.phase);
    if(r.collect&&st.mote){const [x,y]=st.mote.split(',').map(Number);await press(false);await page.locator('#stage').click({position:{x,y},timeout:3000})}
    // Drive the finale from its explicit phases, not transient prose that may update
    // between automation frames. Wish intentionally stays shielded through silence.
    if(st.phase==='gust-warning')await press(false);
    else if(st.phase==='gust-active')await press(true);
    else if(st.phase==='silence')await press(!!r.skipReply);
    else if(st.phase==='window-reply')await press(false);
    else if(st.hint.includes('長押し')||(st.hint.includes('かばって')&&!st.hint.includes('息苦しくなる前に離す')))await press(true);
    else if(st.hint.includes('離して')||st.hint.includes('はなして')||st.hint.includes('ひらいて')||st.hint.includes('息を'))await press(false);
   }
   await page.waitForTimeout(25);
  }
  await press(false);
  const got=await page.locator('#stage').getAttribute('data-ending');
  if(got!==id){fs.writeFileSync(path.join(out,`${engine}-${id}-input-failure.json`),JSON.stringify({expected:id,actual:got,query:r.query,trace},null,2));await page.screenshot({path:path.join(out,`${engine}-${id}-input-failure.png`)})}
  assert.equal(got,id,'route for '+id+' reached '+got);
   if(id==='dawn')assert.equal(trace.findLast(st=>st.phase==='window-reply')?.reply,'bright','dawn requires the bright window reply');
  if(r.policy==='tele'){for(const phase of ['gust-warning','gust-active','silence','window-reply'])assert.ok(phases.has(phase),'route '+(r.route||'rest')+' must keep '+phase);assert.equal(await page.locator('#timer').innerText(),'00:00','arrival resolves at the route-specific deadline')}
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('#stage').getAttribute('data-pose'),'end-'+id,'ending must use its dedicated character painting');
  const scenePath=path.join(out,`${engine}-ending-${id}-scene.png`);
  await page.screenshot({path:scenePath});
  await page.waitForFunction(()=>!document.querySelector('#curtain').classList.contains('hidden'),null,{timeout:6000});
  assert.equal(await page.locator('.journey-back').getAttribute('href'),'../works/','the ending can return to the game list');
  const heading=await page.locator('#curtain-title').evaluate(el=>({height:el.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(el).lineHeight),overflow:el.scrollWidth>el.clientWidth+1}));
  assert.ok(heading.height<heading.lineHeight*1.5&&!heading.overflow,id+' ending headline must fit one line immediately: '+JSON.stringify(heading));
  await page.waitForTimeout(400);
  await page.waitForFunction(()=>document.querySelector('#moment-save').dataset.state==='ready');
  assert.ok(await page.locator('#moment-save').isEnabled(),id+' ending PNG must be prepared before sharing');
  const explanation=await page.locator('#ending-meaning').innerText();
  for(const fact of endingFacts[id])assert.ok(explanation.includes(fact),id+' must explain '+fact+': '+explanation);
  const copy=await page.locator('#curtain-description').evaluate(el=>{
   const lines=[],walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);
   for(let node=walker.nextNode();node;node=walker.nextNode())for(let i=0;i<node.length;i++){const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);const box=range.getBoundingClientRect();let line=lines.find(l=>Math.abs(l.top-box.top)<1);if(!line){line={top:box.top,text:''};lines.push(line)}line.text+=node.textContent[i]}
   return {overflow:el.scrollWidth>el.clientWidth+1,lines:lines.map(l=>l.text.trim())};
  });
  assert.equal(copy.overflow,false,id+' ending copy must fit');
  assert.ok(copy.lines.length<=1||copy.lines.at(-1).length>5,id+' ending must not strand a short tail: '+JSON.stringify(copy.lines));
  const cardPath=path.join(out,`${engine}-ending-${id}-card.png`);
  await page.screenshot({path:cardPath});
  await page.setViewportSize({width:360,height:640});
  const narrowHeading=await page.locator('#curtain-title').evaluate(el=>({height:el.getBoundingClientRect().height,lineHeight:parseFloat(getComputedStyle(el).lineHeight),overflow:el.scrollWidth>el.clientWidth+1}));
  assert.ok(narrowHeading.height<narrowHeading.lineHeight*1.5&&!narrowHeading.overflow,id+' ending headline must fit at 360x640: '+JSON.stringify(narrowHeading));
  if(id==='blown')await page.screenshot({path:path.join(out,`${engine}-360x640-ending-blown-card.png`)});
  // The result copy may frame the painting, but it must not veil its central character.
  const crop={left:105,top:350,width:180,height:200};
  const [scenePixels,cardPixels]=await Promise.all([scenePath,cardPath].map(file=>sharp(file).extract(crop).removeAlpha().raw().toBuffer()));
  let difference=0;for(let i=0;i<scenePixels.length;i++)difference+=Math.abs(scenePixels[i]-cardPixels[i]);
  const meanDifference=difference/scenePixels.length;
  assert.ok(meanDifference<35,id+' result obscures its painting: '+meanDifference.toFixed(1));
  assert.deepEqual(errors,[]);await ctx.close();done('ending '+id);
 }
 // Guarding the last gust without opening the hands must not award the homecoming,
 // even when all memories and enough flame survive the night.
 for(const routeSize of sizes){
  const {ctx,page,errors}=await open(routeSize,'?qa=1&seed=5&speed=3&t=82&mem=3&vital=flame-full');
  await page.locator('#play').click();
  await page.waitForFunction(()=>document.querySelector('#stage').dataset.phase==='gust-active');
  const box=await page.locator('#action').boundingBox();await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await page.waitForFunction(()=>document.querySelector('#stage').dataset.reply==='faint');await page.mouse.up();
  await page.waitForFunction(()=>!!document.querySelector('#stage').dataset.ending);
  assert.equal(await page.locator('#stage').getAttribute('data-ending'),'wish');
  await page.waitForFunction(()=>!document.querySelector('#curtain').classList.contains('hidden'));
  const reason=await page.locator('#ending-reason').innerText();
  assert.match(reason,/静寂で手を開かなかった/);
  assert.ok(Number(reason.match(/灯り (\d+)%/)?.[1])>=70,'the final flame is ample; only the missed reply determines this ending: '+reason);
  const lines=await page.locator('#ending-reason').evaluate(el=>{const rows=[],walker=document.createTreeWalker(el,NodeFilter.SHOW_TEXT);for(let node=walker.nextNode();node;node=walker.nextNode())for(let i=0;i<node.length;i++){const range=document.createRange();range.setStart(node,i);range.setEnd(node,i+1);const box=range.getBoundingClientRect();let row=rows.find(r=>Math.abs(r.top-box.top)<1);if(!row){row={top:box.top,text:''};rows.push(row)}row.text+=node.textContent[i]}return rows.map(r=>r.text.trim())});
  assert.ok(lines.length<=1||lines.at(-1).length>5,'ending reason must not strand a short tail: '+JSON.stringify(lines));
  await page.waitForFunction(()=>document.querySelector('#moment-save').dataset.state==='ready');await page.waitForTimeout(400);
  await page.screenshot({path:path.join(out,`${engine}-${routeSize.width}-ending-unanswered-window.png`)});
  assert.deepEqual(errors,[]);await ctx.close();done('unanswered window cannot award dawn '+routeSize.width);
 }
 // Sound: OFF and volume persist across reloads; play still works with sound off.
 {
  const {ctx,page,errors}=await open(size,'?qa=1&seed=2');
  await page.locator('#play').click();await page.locator('#journey-menu-open').click();
  if(await page.locator('#pause-sound').isEnabled()){
   await page.locator('#pause-sound').click();assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'false');
   await page.reload();assert.equal(await page.locator('#sound-toggle').innerText(),'音 OFF','mute survives reload');
   await page.locator('#play').click();await page.locator('#journey-menu-open').click();await page.locator('#pause-volume').fill('40');
   assert.equal(await page.locator('#sound-toggle').innerText(),'音 ON','raising the volume unmutes');
   await page.reload();assert.equal(await page.locator('#volume').inputValue(),'40','volume survives reload');
  }else{assert.equal(await page.locator('#pause-sound').innerText(),'音 非対応');assert.ok(await page.locator('#pause-volume').isDisabled());await page.reload()}
  await page.locator('#play').click();await page.waitForTimeout(400);assert.ok(await page.locator('#action').isEnabled());
  assert.deepEqual(errors,[]);await ctx.close();done('sound settings');
 }
 // A new journey must cancel ending notes that are still sounding or scheduled.
 {
  const {ctx,page,errors}=await open(size,'?qa=1&seed=2&speed=0.0001');
  await page.locator('#play').click();
  const outcome=await page.evaluate(()=>{
   const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;
   const proto=AC.prototype,original=proto.createOscillator,voices=[];
   proto.createOscillator=function(){const o=original.call(this),stop=o.stop;const record={stops:[]};voices.push(record);o.stop=function(t){record.stops.push(t);return stop.call(this,t)};return o};
   try{
    const audio=window.KienaideAudio.create();if(!audio.init())return null;audio.resume();
    audio.cues.ending('dawn');const notes=voices.filter(v=>v.stops.length);
    audio.startJourney();
    return {notes:notes.length,canceled:notes.filter(v=>v.stops.length===2&&v.stops[1]<v.stops[0]).length};
   }finally{proto.createOscillator=original}
  });
  if(outcome){assert.ok(outcome.notes>=12,'the dawn ending schedules its notes');assert.equal(outcome.canceled,outcome.notes,'retry cancels every sounding or future ending note')}
  assert.deepEqual(errors,[]);await ctx.close();done('retry cancels earlier ending audio');
 }
 // A completed run must not leave the next run waiting on the previous audio clock.
 {
  const {ctx,page,errors}=await open(size,'?qa=1&seed=2&speed=3',{audioProbe:true});
  await page.locator('#play').click();
  const action=await page.locator('#action').boundingBox();
  await page.mouse.move(action.x+action.width/2,action.y+action.height/2);await page.mouse.down();
  await page.waitForFunction(()=>!document.querySelector('#curtain').classList.contains('hidden'),null,{timeout:30000});
  await page.mouse.up();
  const before=await page.evaluate(()=>({...window.audioStarts}));
  await page.locator('#play').click();
  assert.ok(await page.locator('#action').isEnabled(),'retry restores the playable scene');
  if(await page.locator('#pause-sound').isEnabled())await page.waitForFunction(previous=>window.audioStarts.steps>previous.steps&&window.audioStarts.melody>previous.melody,before,{timeout:2500});
  assert.deepEqual(errors,[]);await ctx.close();done('retry restores footsteps and melody');
 }
 // Keyboard: Space holds the shield, M touches a visible memory.
 {
  const {ctx,page,errors}=await open(size,'?qa=1&seed=4&speed=1&t=11.5');
  await page.locator('#play').click();await page.locator('#action').focus();
  await page.keyboard.down('Space');await page.waitForTimeout(300);
  assert.ok((await page.locator('#hint').innerText()).match(/かば|離して/),'Space shields');
  await page.keyboard.up('Space');
  await page.waitForFunction(()=>document.querySelector('#stage').dataset.mote,null,{timeout:8000});
  await page.keyboard.press('m');
  assert.equal(await page.locator('#best').innerText(),'1 / 3','M collects the memory');
  assert.ok((await page.locator('#memory-live').innerText()).includes('記憶'));
  assert.deepEqual(errors,[]);await ctx.close();done('keyboard play');
 }
 // Prologue frames, skip, reduced motion.
 for(const reduced of [false,true]){
  const {ctx,page,errors}=await open(size,'?qa=1&speed=0.0001',{intro:true,reduced});
  await page.locator('#play').click();
  await page.waitForSelector('#kienaide-intro canvas');
  const introRows=await page.evaluate(()=>{const ctx=document.createElement('canvas').getContext('2d');return window.KienaideView.INTRO.map(cue=>{ctx.font=cue.at===16.5?'bold 38px system-ui,sans-serif':'600 15px system-ui,sans-serif';return {at:cue.at,text:cue.text,rows:cue.rows,widths:cue.rows.map(row=>ctx.measureText(row).width)}})});
  for(const cue of introRows){assert.equal(cue.rows.join(''),cue.text,'prologue screen-reader and painted copy must match');for(let i=0;i<cue.rows.length;i++){assert.ok([...cue.rows[i]].length>5,'prologue leaves a short line at '+cue.at+': '+JSON.stringify(cue.rows));assert.ok(cue.widths[i]<=324,'prologue line overflows 360px canvas at '+cue.at+': '+JSON.stringify(cue))}}
  let waited=0;for(const at of [2.4,6,9,12.5,15.5]){const ms=at/6*1000-waited;waited+=ms;await page.waitForTimeout(ms);await page.screenshot({path:path.join(out,`${engine}-intro-${reduced?'reduced-':''}${at}.png`)})}
  await page.locator('#kienaide-intro button').click({timeout:3000}).catch(()=>{});
  assert.equal(await page.locator('#kienaide-intro').count(),0,'prologue must end (skip or completion)');
  assert.ok(await page.locator('#action').isEnabled());
  assert.deepEqual(errors,[]);await ctx.close();done('intro '+(reduced?'reduced':'motion'));
 }
 if(size.width===390){
  const {ctx,page,errors}=await open(size,'?qa=1&seed=7&speed=1&t=8');
  await page.locator('#play').click();await page.waitForFunction(()=>document.querySelector('#action').disabled===false);
  await page.waitForTimeout(1100);const before=await page.locator('#timer').innerText();
  await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>getComputedStyle(document.querySelector('.orientation-notice')).display==='flex');
  await page.screenshot({path:path.join(out,engine+'-landscape-pause.png')});await page.waitForTimeout(1400);
  assert.equal(await page.locator('#timer').innerText(),before,'the journey pauses while the phone is sideways');
  await page.setViewportSize(size);await page.waitForFunction(()=>getComputedStyle(document.querySelector('.orientation-notice')).display==='none');
  await page.waitForFunction(t=>document.querySelector('#timer').innerText!==t,before,{timeout:3000});
  assert.deepEqual(errors,[]);await ctx.close();done('landscape pause and portrait resume');
 }
 if(engine==='chromium'){
  const ctx=await browser.newContext({viewport:size});
  await ctx.addInitScript(()=>{const proto=Object.getPrototypeOf(new AudioContext()),resume=proto.resume,suspend=proto.suspend;window.__audioLifecycle={resume:0,suspend:0};proto.resume=function(...args){window.__audioLifecycle.resume++;return resume.apply(this,args)};proto.suspend=function(...args){window.__audioLifecycle.suspend++;return suspend.apply(this,args)}});
  const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'?qa=1&speed=6');await page.locator('#play').click();await page.waitForSelector('#kienaide-intro canvas');await page.waitForTimeout(2100);
  const before=await page.evaluate(()=>window.__audioLifecycle.resume);await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'))});await page.waitForTimeout(1000);
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'))});await page.waitForTimeout(450);
  assert.ok((await page.evaluate(()=>window.__audioLifecycle.suspend))>0,'backgrounding suspends audio');assert.ok((await page.evaluate(()=>window.__audioLifecycle.resume))>before,'returning during the prologue resumes audio');assert.equal(await page.locator('#kienaide-intro').count(),1,'background time must not consume the prologue');assert.deepEqual(errors,[]);await ctx.close();done('intro background audio and clock');
 }
 // Check representative real-time performance after capturing all functional/layout evidence.
 {
  const {ctx,page,errors}=await open(sizes[0],'?qa=1&seed=2&speed=1');
  await page.locator('#play').click();await page.waitForTimeout(1200);
  const alive=await warmth(page);await page.waitForTimeout(2000);
  const fps=await page.evaluate(()=>new Promise(ok=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<3000)requestAnimationFrame(f);else ok(n/((performance.now()-t0)/1000))};requestAnimationFrame(f)}));
  fs.writeFileSync(path.join(out,engine+'-perf.json'),JSON.stringify({fps:Math.round(fps*10)/10,quality:Number(await page.locator('#stage').getAttribute('data-quality')),warmAlive:Math.round(alive)},null,1));
  assert.ok(fps>=30,'frame rate '+fps.toFixed(1));
  await page.goto(base+'?qa=1&seed=2&speed=12');await page.locator('#play').click();
  await page.locator('#route-choice [data-route="shortcut"]').waitFor({state:'visible',timeout:5000});await page.locator('#route-choice [data-route="shortcut"]').click();
  await page.waitForFunction(()=>document.querySelector('#stage').dataset.ending==='blown',null,{timeout:20000});await page.waitForTimeout(800);
  const dead=await warmth(page);assert.ok(alive>dead+18,'flame light must disappear with the flame: alive '+alive.toFixed(1)+' dead '+dead.toFixed(1));
  assert.deepEqual(errors,[]);await ctx.close();done('light separation (warm '+alive.toFixed(0)+'→'+dead.toFixed(0)+'), '+fps.toFixed(0)+'fps');
 }
 console.log('PASS kienaide visual QA ('+engine+'): '+results.join(', '));
}finally{await browser.close();server.close()}
