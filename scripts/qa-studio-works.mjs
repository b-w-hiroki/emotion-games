import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium, webkit } from 'playwright';

const root=path.resolve('dist'),out=path.resolve('artifacts/studio');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.png':'image/png','.json':'application/json'};
const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost'),relative=decodeURIComponent(url.pathname.replace(/^\//,'')),file=path.resolve(root,relative.endsWith('/')||!relative?relative+'index.html':relative);if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end()}fs.readFile(file,(error,data)=>{if(error){res.writeHead(404);return res.end()}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(data)})});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=`http://127.0.0.1:${server.address().port}/`,catalog=JSON.parse(fs.readFileSync('catalog.json','utf8')).games;
try{
 for(const [engine,name] of [[chromium,'chromium'],[webkit,'webkit']].filter(([,name])=>!process.argv[2]||name===process.argv[2])){
  const browser=await engine.launch({headless:true});
  try{
   for(const [width,height] of [[390,844],[360,640],[1280,800]]){
    const context=await browser.newContext({viewport:{width,height},hasTouch:width<600,isMobile:name==='chromium'&&width<600}),page=await context.newPage(),errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    await page.goto(base);
    const carousel=page.locator('#studio-carousel'),cards=carousel.locator('.studio-work-card');
    assert.equal(await cards.count(),3,`${name} ${width}: three featured works`);
    assert.deepEqual(await cards.locator('strong').allTextContents(),['きえないで。','チャーハン大回転','AINAN 釣りバトル']);
    assert.equal(await page.locator('.chahan-shelf iframe').count(),1,'Chahan remains playable on the home page');
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${name} ${width}: no page overflow`);
    await carousel.scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,`home-carousel-${name}-${width}.png`)});
    if(width<600){
     assert.equal(await page.locator('.studio-carousel-controls').isVisible(),true);
     assert.equal(await page.locator('#studio-next').isEnabled(),true);
     await page.locator('#studio-next').click();
     await page.waitForFunction(()=>document.getElementById('studio-carousel').scrollLeft>10,null,{timeout:5000});
     await carousel.focus();await page.keyboard.press('ArrowRight');
     await page.waitForFunction(()=>{const e=document.getElementById('studio-carousel');return e.scrollLeft+e.clientWidth>=e.scrollWidth-3},null,{timeout:5000});
     await page.locator('#studio-prev').click();
     await page.waitForFunction(()=>{const e=document.getElementById('studio-carousel');return e.scrollLeft+e.clientWidth<e.scrollWidth-10},null,{timeout:5000});
    }else assert.equal(await page.locator('.studio-carousel-controls').isHidden(),true,'controls are hidden when every card fits');
    await page.locator('.studio-works-all').click();
    assert.equal(new URL(page.url()).pathname,'/works/');
    assert.equal(await page.locator('.studio-library h1').innerText(),'作品一覧');
    const index=page.locator('.studio-library-index');
    assert.equal(await index.locator('a').count(),2,'collection has two category links');
    assert.equal(await page.locator('.studio-library-shorts .studio-short-card').count(),catalog.length-1,'short games are grouped as compact cards');
    await index.getByRole('link',{name:'ショートゲームの試作 19'}).click();
    assert.equal(new URL(page.url()).hash,'#library-shorts','category link reaches the short games');
    assert.ok(await page.locator('#library-shorts').isVisible());
    const listed=page.locator('.studio-library .studio-work-card');
    assert.equal(await listed.count(),catalog.length+2,`${name} ${width}: all games and two standalone projects`);
    const hrefs=await listed.evaluateAll(links=>links.map(link=>link.href));
    assert.equal(new Set(hrefs).size,catalog.length+2,'every work appears once');
    for(const item of catalog)assert.ok(hrefs.some(href=>new URL(href).pathname==='/'+item.slug+'/'),`${item.slug} is listed`);
    assert.ok(hrefs.some(href=>new URL(href).pathname==='/fishing-battle/'));
    assert.ok(hrefs.some(href=>new URL(href).pathname==='/'&&new URL(href).hash==='#chahan-shelf'));
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),true,`${name} ${width}: collection has no horizontal overflow`);
    for(const href of hrefs){const response=await context.request.get(href);assert.equal(response.status(),200,`${name} ${width}: work route ${href}`)}
    const short=page.locator('.studio-library-shorts .studio-work-card').first();await short.scrollIntoViewIfNeeded();
    await short.locator('img').evaluate(async image=>{await image.decode();if(!image.naturalWidth)throw new Error('short-game image did not load')});
    await page.screenshot({path:path.join(out,`works-shorts-${name}-${width}.png`)});
    await page.locator('.studio-library-intro').scrollIntoViewIfNeeded();
    await page.screenshot({path:path.join(out,`works-${name}-${width}.png`),fullPage:true});
    await page.locator('.studio-library .studio-work-card').filter({hasText:'チャーハン大回転'}).click();
    await page.waitForFunction(()=>{const box=document.getElementById('chahan-shelf')?.getBoundingClientRect();return box&&box.top<innerHeight&&box.bottom>0},null,{timeout:5000});
    assert.equal(new URL(page.url()).hash,'#chahan-shelf','the collection opens the embedded game on the studio page');
    assert.ok(await page.locator('.chahan-shelf iframe').isVisible());
    await page.locator('.studio-works-all').click();await page.locator('.studio-library-back').click();assert.equal(new URL(page.url()).pathname,'/');
    await page.locator('.studio-work-card').filter({hasText:'チャーハン大回転'}).click();
    assert.equal(new URL(page.url()).hash,'#chahan-shelf','Chahan opens within the studio page');
    assert.ok(await page.locator('.chahan-shelf iframe').isVisible());
    if(width===390){
     await page.goto(base+'?study=1');await page.locator('.studio-works-all').click();
     assert.equal(new URL(page.url()).searchParams.get('study'),'1','collection keeps opt-in research mode');
     const researchHref=await page.locator('.studio-library .studio-work-card').filter({hasText:'きえないで。'}).getAttribute('href');
     assert.equal(new URL(researchHref,base).searchParams.get('study'),'1','game links keep opt-in research mode');
    }
    assert.deepEqual(errors,[],`${name} ${width}: no page errors`);
    await context.close();
   }
  }finally{await browser.close()}
 }
}finally{server.close()}
console.log('PASS studio carousel and full works collection');
