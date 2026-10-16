import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=path.resolve('dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png','.svg':'image/svg+xml'};
const srv=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(!u.pathname.startsWith('/emotion-games/')){res.writeHead(404);return res.end('not found')}
 const rel=decodeURIComponent(u.pathname.slice('/emotion-games/'.length));
 const file=path.resolve(root,rel.endsWith('/')?rel+'index.html':rel||'index.html');
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 try{res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file))}
 catch(e){res.writeHead(404);res.end('not found')}
});
await new Promise(resolve=>srv.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+srv.address().port+'/emotion-games/kienaide-preview/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try {
 for(const [width,height] of [[390,844],[360,640]]){
  const context=await browser.newContext({viewport:{width,height},isMobile:true,hasTouch:true,acceptDownloads:true});
  const page=await context.newPage();
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+'?qa=1');
  const assets=await page.evaluate(async()=>{
   const els=[...document.images];
   await Promise.all(els.map(img=>img.decode().catch(()=>null)));
   return els.map(img=>({url:img.src.substring(img.src.lastIndexOf('/')+1),width:img.naturalWidth}));
  });
  assert.ok(assets.some(x=>x.url==='traveller-flame.webp'&&x.width>200),'missing high resolution traveller');
  assert.ok(assets.some(x=>x.url==='start-button.webp'&&x.width>200),'missing game UI');
  assert.ok(assets.every(x=>x.width>0),'missing art layer '+JSON.stringify(assets));
  assert.ok(await page.locator('#start').isVisible());
  await page.screenshot({path:'artifacts/screenshots/kienaide-v3-intro-'+width+'.png'});
  await page.locator('#start').click();
  await page.waitForTimeout(250);
  assert.ok(await page.locator('#hold').isVisible());
  const box=await page.locator('#hold').boundingBox();
  const fit=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,width:innerWidth,viewportHeight:innerHeight,buttonBottom:document.querySelector('#hold').getBoundingClientRect().bottom}));
  assert.ok(box&&box.height>=40,JSON.stringify(box));
  assert.ok(fit.scrollWidth<=fit.width+2,'horizontal overflow '+JSON.stringify(fit));
  assert.ok(fit.buttonBottom<=fit.viewportHeight+2,'action offscreen '+JSON.stringify(fit));
  const sceneLayout=await page.evaluate(()=>{
   const chapter=document.querySelector('#chapter').getBoundingClientRect();
   const hero=document.querySelector('#hero').getBoundingClientRect();
   const hud=document.querySelector('.hud').getBoundingClientRect();
   return {chapter:{left:chapter.left,right:chapter.right,top:chapter.top,bottom:chapter.bottom},heroCenter:hero.left+hero.width/2,hudBottom:hud.bottom};
  });
  assert.ok(sceneLayout.chapter.right < sceneLayout.heroCenter-16,
    'chapter text must be clear of the face: '+JSON.stringify(sceneLayout));
  assert.ok(sceneLayout.chapter.top>=sceneLayout.hudBottom-4,
    'chapter text must not overlap HUD: '+JSON.stringify(sceneLayout));
  await page.waitForFunction(()=>document.querySelector('#chapterImage').naturalWidth>0&&document.querySelector('#scene').classList.contains('scene-ready'),null,{timeout:5000});
  const firstScene=await page.locator('#chapterImage').getAttribute('src');
  assert.ok(firstScene.endsWith('kienaide-snow-street.svg'),firstScene);
  await page.screenshot({path:'artifacts/screenshots/kienaide-v3-playing-'+width+'.png'});
  // A legitimate unprotected run must end; it should never rely on a seeded fake ending.
  await page.waitForFunction(()=>!document.querySelector('#modal').hidden,null,{timeout:16000});
  assert.equal(await page.locator('#resultTitle').innerText(),'風にさらわれた。');
  await page.waitForFunction(()=>Number(getComputedStyle(document.querySelector('#flameSprite')).opacity)<.01,null,{timeout:2500});
  const separated=await page.evaluate(()=>{
   const sprite=document.querySelector('#flameSprite'),hero=document.querySelector('#hero');
   return {spriteLoaded:sprite.naturalWidth>0,masked:getComputedStyle(hero).maskImage!=='none',opacity:getComputedStyle(sprite).opacity,extinguished:document.querySelector('#scene').classList.contains('extinguished')};
  });
  assert.ok(separated.spriteLoaded&&separated.masked,'separate character and flame layers must load');
  assert.ok(separated.extinguished,'failed ending must actually extinguish flame');
  assert.ok(Number(separated.opacity)<.01,'flame sprite must vanish at zero flame');
  await page.screenshot({path:'artifacts/screenshots/kienaide-extinguished-'+width+'.png'});

  assert.equal(await page.locator('#share').isVisible(),true);
  await page.locator('#galleryButton').click();
  assert.equal(await page.locator('#galleryList .item').count(),5);
  assert.equal(await page.locator('#galleryList .item:not(.locked)').count(),1);
  await page.locator('#galleryClose').click();
  await page.evaluate(()=>Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false}));
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#share').click()]);
  assert.equal(download.suggestedFilename(),'kienaide-blown.png');
  // QA-only scenario selection starts just before each hazard: avoid timing races at 12x.
  for(const id of ['gust','tailwind','vortex','last-gust']){
   await page.goto(base+'?qa=1&qa_event='+id);
   await page.locator('#start').click();
   await page.waitForFunction(expected=>{
    const node=document.querySelector('#eventCue');
    const stage=document.querySelector('#scene');
    return !!node?.classList.contains('visible') && !!stage?.classList.contains(expected==='last-gust'?'gust':expected);
   },id,{timeout:5000,polling:'raf'});
   const state=await page.evaluate(()=>({cue:document.querySelector('#eventCue').textContent,active:document.querySelector('#eventCue').classList.contains('visible')}));
   assert.ok(state.active&&state.cue.length>3,id+': '+JSON.stringify(state));
   const expectedScene={gust:'wind-tunnel',tailwind:'wind-tunnel',vortex:'frozen-bridge','last-gust':'dawn-village'}[id];
   await page.waitForFunction(expected=>document.querySelector('#chapterImage')?.getAttribute('src')?.endsWith('kienaide-'+expected+'.svg')&&document.querySelector('#chapterImage').naturalWidth>0,expectedScene,{timeout:5000});
   const sceneReady=await page.locator('#scene').evaluate(el=>el.classList.contains('scene-ready'));
   assert.ok(sceneReady,id+' must render a chapter-specific image');
   await page.screenshot({path:'artifacts/screenshots/kienaide-v3-'+id+'-'+width+'.png'});
  }
  assert.deepEqual(errors,[]);
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS illustrated playable Kienaide',width+'x'+height,'assets',assets.length,'ending, gallery and PNG export');
 }
}finally{await browser.close();await new Promise(ok=>srv.close(ok))}
