import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import { chromium } from 'playwright';
const root=path.resolve('dist');
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');if(!u.pathname.startsWith('/emotion-games/')){res.writeHead(404);return res.end()}const part=decodeURIComponent(u.pathname.slice(15));const file=path.resolve(root,part.endsWith('/')?part+'index.html':part||'index.html');if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}try{res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(fs.readFileSync(file))}catch(_){res.writeHead(404);res.end('not found')}});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base='http://127.0.0.1:'+server.address().port+'/emotion-games/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 async function pageFor(slug){
  const ctx=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  const page=await ctx.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(base+slug+'/');await page.locator('#play').click();
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
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
