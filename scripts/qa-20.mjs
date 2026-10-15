import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import vm from 'node:vm';import { chromium } from 'playwright';
const catalog=JSON.parse(fs.readFileSync('catalog.json','utf8')).games;
const sandbox={window:{}};vm.runInNewContext(fs.readFileSync('assets/microgames.js','utf8'),sandbox,{timeout:500});
const extras=sandbox.window.EmotionMissions.games;
const out='artifacts/screenshots';fs.mkdirSync(out,{recursive:true});
const root=path.resolve('dist'),mime={'.js':'application/javascript','.css':'text/css','.html':'text/html','.png':'image/png'};
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(!u.pathname.startsWith('/emotion-games/')){res.writeHead(404);return res.end('Not found')}const rel=decodeURIComponent(u.pathname.slice('/emotion-games/'.length));const f=path.resolve(root,rel.endsWith('/')?rel+'index.html':rel||'index.html');if(!f.startsWith(root+path.sep)){res.writeHead(403);return res.end()}try{res.writeHead(200,{'content-type':mime[path.extname(f)]||'text/plain'});res.end(fs.readFileSync(f))}catch(_){res.writeHead(404);res.end('missing')}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));const base='http://127.0.0.1:'+server.address().port+'/emotion-games/';const browser=await chromium.launch({headless:true,args:['--no-sandbox']});const issues=[];
try{
 assert.equal(catalog.length,20);
 const browserContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
 const page=await browserContext.newPage();page.on('pageerror',e=>issues.push('PAGEERROR '+e.message));
 for(const game of extras){
  await page.goto(base+game.slug+'/',{waitUntil:'load'});
  assert.equal(await page.locator('.game-heading h1').innerText(),game.title);
  assert.ok(await page.locator('#play').isVisible());
  assert.equal(await page.locator('#collection-progress').innerText(),'結末 0 / 5');
  const pre=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  assert.equal(pre,false,game.slug+' horizontal scroll');
  await page.locator('#play').click();
  await page.waitForTimeout(110);
  const button=page.locator('#action');assert.ok(await button.isVisible());
  if(game.theme==='timing'){await button.click();await button.click();}
  else if(game.theme==='balance'){for(let i=0;i<4;i++)await button.click();}
  else if(game.theme==='rhythm'){await button.click();await button.click();}
  else{for(let i=0;i<3;i++)await button.click();}
  await page.waitForFunction(()=>{const n=document.querySelector('#curtain');return n&&!n.classList.contains('hidden')},{timeout:4000});
  assert.equal(await page.locator('#collection-progress').innerText(),'結末 1 / 5');
  assert.ok(await page.locator('#discovery-result').isVisible());
  await page.locator('#open-collection').click();
  assert.equal(await page.locator('#collection-list li.found').count(),1);
  assert.ok(await page.locator('#collection-awards').isVisible());
  await page.locator('#close-collection').click();
  await page.screenshot({path:path.join(out,game.slug+'-result-390.png')});
  await page.reload();
  assert.equal(await page.locator('#collection-progress').innerText(),'結末 1 / 5',game.slug+' persistence');
  console.log('PASS',game.slug,game.theme);
 }
 await page.goto(base);
 assert.ok((await page.locator('.archive-progress').innerText()).includes(' / 100')||(await page.locator('.archive-progress').innerText()).includes('/100'));
 assert.equal(await page.locator('.card').count(),20);
 await page.screenshot({path:path.join(out,'all-20-hub-390.png'),fullPage:true});
 await browserContext.close();
 // Compact phone should not clip the primary controls.
 const small=await browser.newContext({viewport:{width:360,height:640},isMobile:true,hasTouch:true});
 const p=await small.newPage();p.on('pageerror',e=>issues.push(e.message));
 for(const g of [catalog[4],catalog[8],catalog[12],catalog[16]]){
  await p.goto(base+g.slug+'/');assert.ok(await p.locator('#play').isVisible());
  const over=await p.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);assert.equal(over,false,g.slug+' narrow overflow');
  await p.screenshot({path:path.join(out,g.slug+'-360.png')});
 }
 await small.close();
 assert.deepEqual(issues,[]);
 console.log('PASS all sixteen games / collection persistence / full hub / small-phone layout');
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
