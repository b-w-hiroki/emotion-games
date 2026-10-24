import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import * as pw from 'playwright';

const engine=process.argv[2]||'chromium';
const root=path.resolve('dist'),out=path.resolve('artifacts/kienaide');
fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 const rel=url.pathname.replace(/^\/emotion-games\//,'');
 const file=path.resolve(root,!rel||rel.endsWith('/')?rel+'index.html':rel);
 if(!file.startsWith(root+path.sep)){res.writeHead(404);return res.end()}
 fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(error?'':data)});
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/emotion-games/`;
const browser=await pw[engine].launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}:{})});
try{
 for(const size of [{width:390,height:844},{width:360,height:640},{width:720,height:800},{width:1280,height:800}]){
  const context=await browser.newContext({viewport:size,hasTouch:size.width<600,isMobile:engine==='chromium'&&size.width<600});
  const page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));
  await page.goto(base);
  assert.ok(await page.locator('.kienaide-home-play').isVisible());
  assert.ok(await page.locator('#home-details-open').isVisible());
  assert.ok(await page.locator('.kienaide-home-bottom').evaluate(element=>element.scrollWidth<=element.clientWidth+1),'home actions must fit viewport');
  if(size.width<600){
   const home=await page.evaluate(()=>({height:document.documentElement.scrollHeight,viewport:innerHeight,footer:document.querySelector('.foot').getBoundingClientRect().bottom}));
   assert.ok(home.height<=home.viewport+1&&home.footer<=home.viewport,`mobile home including art and footer must fit one screen: ${JSON.stringify(home)}`);
  }
  await page.screenshot({path:path.join(out,`detail-home-${engine}-${size.width}.png`)});
  assert.equal(new URL(await page.locator('.kienaide-home-play').getAttribute('href'),base).pathname,'/emotion-games/kienaide/');
  await page.locator('#home-details-open').click();
  assert.ok(await page.locator('#game-detail').isVisible());
  assert.equal(await page.locator('#game-detail-position').innerText(),'1 / 3');
  assert.ok(await page.locator('#game-detail-prev').isDisabled());
  await page.waitForFunction(()=>{const image=document.getElementById('game-detail-image');return image.complete&&image.naturalWidth>0});
  await page.screenshot({path:path.join(out,`detail-${engine}-${size.width}.png`)});
  if(size.width<600){
   const layout=await page.evaluate(()=>{
    const modal=document.getElementById('game-detail');
    const selectors=['#game-detail-title','#game-detail-intro','#game-detail-more','#game-detail-image','.game-detail-gallery-nav','#game-detail-caption','.game-detail-play'];
    return {scrollHeight:modal.scrollHeight,clientHeight:modal.clientHeight,viewport:innerHeight,items:selectors.map(selector=>{const box=document.querySelector(selector).getBoundingClientRect();return {selector,top:box.top,bottom:box.bottom}})};
   });
   assert.ok(layout.scrollHeight<=layout.clientHeight+1,`mobile detail must fit without scrolling: ${JSON.stringify(layout)}`);
   for(const item of layout.items)assert.ok(item.top>=0&&item.bottom<=layout.viewport,`${item.selector} must fit in ${size.width}×${size.height}: ${JSON.stringify(item)}`);
   await page.locator('#game-detail-more').click();
   assert.equal(await page.locator('#game-detail-more').getAttribute('aria-expanded'),'true');
   assert.ok(await page.locator('#game-detail-extra').isVisible(),'full story and controls remain available on demand');
   await page.locator('#game-detail-more').click();
   assert.equal(await page.locator('#game-detail-more').getAttribute('aria-expanded'),'false');
  }
  await page.locator('#game-detail-next').click();
  assert.equal(await page.locator('#game-detail-position').innerText(),'2 / 3');
  await page.locator('.game-detail-gallery').evaluate(element=>{
   for(const [type,x] of [['touchstart',280],['touchend',100]]){
    const event=new Event(type,{bubbles:true});
    Object.defineProperty(event,'changedTouches',{value:[{clientX:x,clientY:200}]});
    element.dispatchEvent(event);
   }
  });
  assert.equal(await page.locator('#game-detail-position').innerText(),'3 / 3');
  assert.ok(await page.locator('#game-detail-next').isDisabled());
  await page.waitForFunction(()=>{const image=document.getElementById('game-detail-image');return image.complete&&image.naturalWidth>0});
  await page.locator('#game-detail-prev').click();
  assert.equal(await page.locator('#game-detail-position').innerText(),'2 / 3');
  assert.ok(await page.locator('.game-detail-play').isVisible());
  const bounds=await page.locator('#game-detail').evaluate(element=>({scroll:element.scrollWidth,client:element.clientWidth}));
  assert.ok(bounds.scroll<=bounds.client+1,'detail must not overflow horizontally');
  await page.keyboard.press('Escape');
  assert.ok(await page.locator('#game-detail').isHidden());
  await page.waitForFunction(()=>document.activeElement.id==='home-details-open');
  assert.equal(await page.evaluate(()=>document.activeElement.id),'home-details-open');
  assert.ok(await page.locator('.kienaide-home-play').isVisible());
  await page.locator('.kienaide-home-play').click();
  assert.equal(new URL(page.url()).pathname,'/emotion-games/kienaide/');
  assert.deepEqual(errors,[]);
  await context.close();
  console.log(`PASS ${engine} ${size.width}×${size.height}: direct play, gallery, touch, close and focus`);
 }
 const context=await browser.newContext({viewport:{width:390,height:844}});
 const page=await context.newPage();
 await page.goto(base+'?study=1');
 await page.locator('#home-details-open').click();
 assert.equal(new URL(await page.locator('.game-detail-play').getAttribute('href'),base).searchParams.get('study'),'1');
 await page.locator('.game-detail-play').click();
 assert.equal(new URL(page.url()).pathname,'/emotion-games/kienaide/');
 assert.equal(new URL(page.url()).searchParams.get('study'),'1');
 await context.close();
 console.log(`PASS ${engine}: modal play keeps research mode`);
}finally{await browser.close();server.close()}
