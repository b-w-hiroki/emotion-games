import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import * as pw from 'playwright';
const engine=process.argv[2]||'chromium',root=path.resolve('dist'),out=path.resolve('artifacts/gust-cue');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost'),file=path.resolve(root,'.'+decodeURIComponent(u.pathname)+(u.pathname.endsWith('/')?'index.html':''));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}fs.readFile(file,(e,data)=>{if(e){res.writeHead(404);res.end();return}res.setHeader('Content-Type',({'.html':'text/html','.js':'text/javascript','.css':'text/css','.webp':'image/webp','.avif':'image/avif','.png':'image/png','.json':'application/json'})[path.extname(file)]||'application/octet-stream');res.end(data)})});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await pw[engine].launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox'],...(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{})}:{})});
const results=[];
async function open(size,query,reduced=false){const context=await browser.newContext({viewport:size,hasTouch:true,isMobile:engine==='chromium',reducedMotion:reduced?'reduce':'no-preference'});await context.addInitScript(()=>{localStorage.setItem('emotion-kienaide-intro-v1','1');localStorage.setItem('emotion-kienaide-audio-v1',JSON.stringify({muted:true,volume:0.8}))});const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(`http://127.0.0.1:${server.address().port}/kienaide/${query}`);await page.locator('#play').click();return {context,page,errors}}
try{
 for(const size of [{width:390,height:844},{width:360,height:640}]){
  const tag=`${engine}-${size.width}x${size.height}`;
  for(const variant of ['baseline','anticipation'])for(const reduced of [false,true]){
   const q=await open(size,`?qa=1&seed=5&speed=.0001&t=6.7${variant==='anticipation'?'&gustCue=anticipation':''}`,reduced);
   const cue=q.page.locator('.gust-anticipation');
   if(variant==='baseline')assert.equal(await cue.count(),0);
   else{
    await cue.waitFor({state:'visible'});
    const bounds=await cue.boundingBox(),button=await q.page.locator('#action').boundingBox();
    assert.ok(bounds.x>=button.x&&bounds.x+bounds.width<=button.x+button.width+1&&bounds.y>=button.y&&bounds.y+bounds.height<=button.y+button.height+1);
    assert.equal(await cue.evaluate(el=>getComputedStyle(el).pointerEvents),'none');
    const value=await cue.evaluate(el=>Number(el.style.getPropertyValue('--gust-progress')));assert.ok(value>.4&&value<.5);
   }
   await q.page.screenshot({path:path.join(out,`${tag}-${variant}-${reduced?'reduced':'normal'}.png`)});
   await q.page.locator('#action').focus();await q.page.keyboard.down('Space');await q.page.waitForFunction(()=>document.querySelector('#action').classList.contains('is-held'));
   await q.page.screenshot({path:path.join(out,`${tag}-${variant}-${reduced?'reduced':'normal'}-held.png`)});
   await q.page.evaluate(()=>window.dispatchEvent(new Event('blur')));
   await q.page.waitForFunction(()=>!document.querySelector('#action').classList.contains('is-held'));
   await q.page.evaluate(()=>window.dispatchEvent(new Event('focus')));
   await q.page.keyboard.up('Space');
   const target=await q.page.locator('#action').boundingBox();
   await q.page.mouse.move(target.x+target.width/2,target.y+target.height/2);await q.page.mouse.down();
   await q.page.waitForFunction(()=>document.querySelector('#action').classList.contains('is-held'));
   await q.page.locator('#action').dispatchEvent('pointercancel',{pointerId:1,pointerType:'mouse'});
   await q.page.waitForFunction(()=>!document.querySelector('#action').classList.contains('is-held'));
   await q.page.mouse.up();
   await q.page.locator('#reset').evaluate(el=>el.click());
   await q.page.waitForFunction(()=>!document.querySelector('#action').classList.contains('is-held'));
   if(variant==='anticipation')await cue.waitFor({state:'visible'});
   assert.deepEqual(q.errors,[]);await q.context.close();results.push(`${tag} ${variant} ${reduced?'reduced':'normal'} layout/input`);
  }
  const normal=await open(size,'?gustCue=anticipation');assert.equal(await normal.page.locator('.gust-anticipation').count(),0);assert.deepEqual(normal.errors,[]);await normal.context.close();
  const moving=await open(size,'?qa=1&seed=5&speed=1&t=6.25&gustCue=anticipation');await moving.page.locator('.gust-anticipation').waitFor({state:'visible'});await moving.page.locator('.gust-anticipation').waitFor({state:'hidden',timeout:5000});assert.deepEqual(moving.errors,[]);await moving.context.close();results.push(`${tag} gate and warning boundary`);
 }
 fs.writeFileSync(path.join(out,`${engine}-results.json`),JSON.stringify({engine,results,humanPlaytest:'not-run',physicalDevice:'not-run'},null,2));console.log(results.join('\n'));
}finally{await browser.close();await new Promise(ok=>server.close(ok))}
