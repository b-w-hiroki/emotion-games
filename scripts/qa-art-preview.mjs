import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';

const root=path.resolve('dist');
const mime={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.webp':'image/webp','.png':'image/png'};
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
  await page.screenshot({path:'artifacts/screenshots/kienaide-v3-playing-'+width+'.png'});
  // A legitimate unprotected run must end; it should never rely on a seeded fake ending.
  await page.waitForFunction(()=>!document.querySelector('#modal').hidden,null,{timeout:16000});
  assert.equal(await page.locator('#resultTitle').innerText(),'風にさらわれた。');
  assert.equal(await page.locator('#share').isVisible(),true);
  await page.locator('#galleryButton').click();
  assert.equal(await page.locator('#galleryList .item').count(),5);
  assert.equal(await page.locator('#galleryList .item:not(.locked)').count(),1);
  await page.locator('#galleryClose').click();
  await page.evaluate(()=>Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>false}));
  const [download]=await Promise.all([page.waitForEvent('download'),page.locator('#share').click()]);
  assert.equal(download.suggestedFilename(),'kienaide-blown.png');
  // A second run survives into the new event window and checks real-time visual feedback.
  await page.locator('#start').click();
  await page.locator('#hold').dispatchEvent('pointerdown',{pointerId:4});
  await page.waitForTimeout(1850); // 12x QA: reaches the 22-second gust window
  const eventState=await page.evaluate(()=>({
   cue:document.querySelector('#eventCue').textContent,
   shown:document.querySelector('#eventCue').classList.contains('visible'),
   gust:document.querySelector('#scene').classList.contains('gust'),
   wind:document.querySelector('#scene').style.getPropertyValue('--wind')
  }));
  assert.ok(eventState.shown&&eventState.cue.includes('突風'),JSON.stringify(eventState));
  assert.equal(eventState.gust,true);
  await page.screenshot({path:'artifacts/screenshots/kienaide-v3-gust-'+width+'.png'});
  await page.locator('#hold').dispatchEvent('pointerup',{pointerId:4});
  await page.waitForTimeout(300);
  assert.deepEqual(errors,[]);
  assert.deepEqual(errors,[]);
  await context.close();
  console.log('PASS illustrated playable Kienaide',width+'x'+height,'assets',assets.length,'ending, gallery and PNG export');
 }
}finally{await browser.close();await new Promise(ok=>srv.close(ok))}
