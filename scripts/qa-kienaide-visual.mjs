// Visual QA for 004「きえないで。」: every chapter, the prologue and all five ending scenes at
// 390x844 and 360x640, with layout assertions. Screenshots go to artifacts/kienaide/.
// Usage: node scripts/qa-kienaide-visual.mjs [chromium|webkit]
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';
import * as pw from 'playwright';
const engine=process.argv[2]||'chromium';
const root=path.resolve('dist'),out=path.resolve('artifacts/kienaide');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.webp':'image/webp'};
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(!u.pathname.startsWith('/emotion-games/')){res.writeHead(404);return res.end()}const rel=decodeURIComponent(u.pathname.slice(15)),file=path.resolve(root,rel.endsWith('/')||!rel?rel+'index.html':rel);if(!file.startsWith(root)){res.writeHead(403);return res.end()}fs.readFile(file,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(d)})});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/emotion-games/kienaide/';
const browser=await pw[engine].launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}:{})});
const sizes=[{width:390,height:844},{width:360,height:640}];
const results=[];
const done=x=>{results.push(x);console.log('step ok:',x)};
async function open(size,query,{intro=false,reduced=false}={}){
 const ctx=await browser.newContext({viewport:size,isMobile:engine==='chromium',hasTouch:true,reducedMotion:reduced?'reduce':'no-preference'});
 if(!intro)await ctx.addInitScript(()=>localStorage.setItem('emotion-kienaide-intro-v1','1'));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('crash',()=>errors.push('page crashed'));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
 await page.goto(base+query);return {ctx,page,errors};
}
async function layout(page,size){
 return page.evaluate(({h})=>{const a=document.querySelector('#action').getBoundingClientRect(),st=document.querySelector('#stage').getBoundingClientRect(),hud=document.querySelector('.hud').getBoundingClientRect();
  return {actionBottom:a.bottom,actionTop:a.top,stageTop:st.top,stageBottom:st.bottom,stageH:st.height,hudBottom:hud.bottom,scrollW:document.documentElement.scrollWidth,vw:innerWidth,fits:a.bottom<=h+1}},{h:size.height});
}
try{
 for(const size of sizes){
  const tag=size.width+'x'+size.height;
  // Chapters: frozen at a moment inside each chapter (speed=0.0001 keeps the frame still).
  for(const [i,t] of [[1,8],[2,30],[3,56],[4,76]]){
   const {ctx,page,errors}=await open(size,'?qa=1&seed=3&speed=0.0001&t='+t);
   await page.locator('#play').click();
   await page.waitForFunction(n=>document.querySelector('#stage').dataset.chapter===String(n),i,{timeout:5000});
   await page.waitForTimeout(500);
   const pose=await page.locator('#stage').getAttribute('data-pose');
   assert.ok(pose&&pose.startsWith('hero-'),'chapter must select a playable hero pose: '+pose);
   const l=await layout(page,size);
   assert.ok(l.fits,'hold button must be on screen '+tag+' '+JSON.stringify(l));
   assert.ok(l.scrollW<=l.vw+1,'no horizontal scroll '+tag);
   assert.ok(l.stageBottom<=l.actionTop+1,'arena must not overlap the button '+tag);
   assert.ok(l.stageH>=size.height*.42,'arena should use the screen ('+l.stageH+'px) '+tag);
   const loaded=await page.evaluate(()=>[...document.images].length);void loaded;
   await page.screenshot({path:path.join(out,`${engine}-${tag}-chapter${i}.png`)});
   assert.deepEqual(errors,[]);await ctx.close();done('chapter '+i+' '+tag);
  }
  // Shielding pose and flame light under a held button.
  {
   const {ctx,page,errors}=await open(size,'?qa=1&seed=3&speed=0.0001&t=30');
   await page.locator('#play').click();await page.waitForTimeout(300);
   const b=await page.locator('#action').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);await page.mouse.down();await page.waitForTimeout(400);
   assert.equal(await page.locator('#stage').getAttribute('data-pose'),'hero-shield','holding must replace the full body with the shielding pose');
   await page.screenshot({path:path.join(out,`${engine}-${tag}-shield.png`)});
   assert.equal(await page.locator('#hint').innerText().then(x=>x.includes('かば')||x.includes('離して')),true);
   await page.mouse.up();assert.deepEqual(errors,[]);await ctx.close();done('shield '+tag);
  }
 }
 // Light separation measured on pixels: warm light around the flame while burning, none once it is out.
 const warmth=page=>page.evaluate(()=>{const c=document.querySelector('#stage'),[x,y]=c.dataset.flame.split(',').map(Number),k=c.width/c.getBoundingClientRect().width;
  const d=c.getContext('2d').getImageData(Math.round((x-40)*k),Math.round((y-50)*k),Math.round(80*k),Math.round(80*k)).data;let w=0;for(let i=0;i<d.length;i+=4)w+=d[i]-d[i+2];return w/(d.length/4)});
 {
  const {ctx,page,errors}=await open(sizes[0],'?qa=1&seed=2&speed=1');
  await page.locator('#play').click();await page.waitForTimeout(1200);
  const alive=await warmth(page);
  // FPS at real speed over 3 s, after the renderer has had 2 s to settle its resolution.
  await page.waitForTimeout(2000);
  const fps=await page.evaluate(()=>new Promise(ok=>{let n=0;const t0=performance.now();const f=()=>{n++;if(performance.now()-t0<3000)requestAnimationFrame(f);else ok(n/((performance.now()-t0)/1000))};requestAnimationFrame(f)}));
  fs.writeFileSync(path.join(out,engine+'-perf.json'),JSON.stringify({fps:Math.round(fps*10)/10,quality:Number(await page.locator('#stage').getAttribute('data-quality')),warmAlive:Math.round(alive)},null,1));
  assert.ok(fps>=30,'frame rate '+fps.toFixed(1));
  await page.goto(base+'?qa=1&seed=2&speed=12');await page.locator('#play').click();
  await page.waitForFunction(()=>document.querySelector('#stage').dataset.ending==='blown',null,{timeout:20000});await page.waitForTimeout(800);
  const dead=await warmth(page);
  assert.ok(alive>dead+18,'flame light must disappear with the flame: alive '+alive.toFixed(1)+' dead '+dead.toFixed(1));
  assert.deepEqual(errors,[]);await ctx.close();done('light separation (warm '+alive.toFixed(0)+'→'+dead.toFixed(0)+'), '+fps.toFixed(0)+'fps');
 }
 // Every ending scene, reached through real play rules (QA speed only).
 const size=sizes[0];
 const routes={
  blown:{query:'?qa=1&seed=2',policy:'none'},
  smother:{query:'?qa=1&seed=2',policy:'hold'},
  survive:{query:'?qa=1&seed=2&speed=6',policy:'tele'},
  wish:{query:'?qa=1&seed=2&speed=6',policy:'tele',collect:true,skipReply:true},
  dawn:{query:'?qa=1&seed=1&speed=3',policy:'tele',collect:true}
 };
 for(const [id,r] of Object.entries(routes)){
  const {ctx,page,errors}=await open(size,r.query);
  await page.locator('#play').click();
  const box=await page.locator('#action').boundingBox();let holding=false;
  const press=async on=>{if(on===holding)return;holding=on;if(on){await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down()}else await page.mouse.up()};
  if(r.policy==='hold')await press(true);
  for(let i=0;i<4000&&!(await page.locator('#stage').getAttribute('data-ending'));i++){
   if(r.policy==='tele'){
    const st=await page.evaluate(()=>{const c=document.querySelector('#stage');return {hint:document.querySelector('#hint').textContent,mote:c.dataset.mote,phase:c.dataset.phase}});
    if(r.collect&&st.mote){const [x,y]=st.mote.split(',').map(Number);await press(false);await page.locator('#stage').click({position:{x,y},timeout:3000})}
    // wish: keep holding through the silence so the window does not answer.
    if(r.skipReply&&st.phase==='silence'){await press(true)}
    else if(st.hint.includes('長押し')||st.hint.includes('かばって'))await press(true);
    else if(st.hint.includes('離して')||st.hint.includes('ひらいて')||st.hint.includes('息を'))await press(false);
   }
   await page.waitForTimeout(25);
  }
  await press(false);
  const got=await page.locator('#stage').getAttribute('data-ending');
  assert.equal(got,id,'route for '+id+' reached '+got);
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('#stage').getAttribute('data-pose'),'end-'+id,'ending must use its dedicated character painting');
  await page.screenshot({path:path.join(out,`${engine}-ending-${id}-scene.png`)});
  await page.waitForFunction(()=>!document.querySelector('#curtain').classList.contains('hidden'),null,{timeout:6000});
  await page.waitForTimeout(400);
  await page.screenshot({path:path.join(out,`${engine}-ending-${id}-card.png`)});
  assert.deepEqual(errors,[]);await ctx.close();done('ending '+id);
 }
 // Sound: OFF and volume persist across reloads; play still works with sound off.
 {
  const {ctx,page,errors}=await open(size,'?qa=1&seed=2');
  await page.locator('#play').click();await page.locator('#sound-toggle').click();
  assert.equal(await page.locator('#sound-toggle').getAttribute('aria-pressed'),'false');
  await page.reload();
  assert.equal(await page.locator('#sound-toggle').innerText(),'音 OFF','mute survives reload');
  await page.locator('#volume').fill('40');
  assert.equal(await page.locator('#sound-toggle').innerText(),'音 ON','raising the volume unmutes');
  await page.reload();assert.equal(await page.locator('#volume').inputValue(),'40','volume survives reload');
  await page.locator('#play').click();await page.waitForTimeout(400);assert.ok(await page.locator('#action').isEnabled());
  assert.deepEqual(errors,[]);await ctx.close();done('sound settings');
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
  let waited=0;for(const at of [2.4,6,9,12.5,15.5]){const ms=at/6*1000-waited;waited+=ms;await page.waitForTimeout(ms);await page.screenshot({path:path.join(out,`${engine}-intro-${reduced?'reduced-':''}${at}.png`)})}
  await page.locator('#kienaide-intro button').click({timeout:3000}).catch(()=>{});
  assert.equal(await page.locator('#kienaide-intro').count(),0,'prologue must end (skip or completion)');
  assert.ok(await page.locator('#action').isEnabled());
  assert.deepEqual(errors,[]);await ctx.close();done('intro '+(reduced?'reduced':'motion'));
 }
 console.log('PASS kienaide visual QA ('+engine+'): '+results.join(', '));
}finally{await browser.close();server.close()}
