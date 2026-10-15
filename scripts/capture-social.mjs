import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { spawnSync } from 'node:child_process';
import { chromium } from 'playwright';

const root=path.resolve('dist');
const out=path.resolve('artifacts');
fs.mkdirSync(path.join(out,'social'),{recursive:true});
fs.mkdirSync(path.join(out,'screenshots'),{recursive:true});
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json; charset=utf-8','.png':'image/png'};
const server=http.createServer((req,res)=>{
 try{
  const url=new URL(req.url,'http://127.0.0.1');
  if(!url.pathname.startsWith('/emotion-games/')){res.writeHead(404);return res.end('not found')}
  const rel=decodeURIComponent(url.pathname.slice('/emotion-games/'.length));
  const file=path.resolve(root,rel.endsWith('/')?rel+'index.html':rel||'index.html');
  if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end('forbidden')}
  const data=fs.readFileSync(file);
  res.writeHead(200,{'content-type':types[path.extname(file)]||'application/octet-stream','cache-control':'no-store'});res.end(data)
 }catch(e){res.writeHead(404);res.end('not found')}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const port=server.address().port;
const site='http://127.0.0.1:'+port+'/emotion-games/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const results=[];
async function grab(slug,scenario){
 const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1,isMobile:true,hasTouch:true,recordVideo:{dir:path.join(out,'social'),size:{width:390,height:844}}});
 const page=await context.newPage();
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const url=site+(slug?slug+'/':'');
 await page.goto(url,{waitUntil:'load'});await page.waitForTimeout(450);
 const key=slug||'index';
 const heading=slug?'.game-heading h1':'.hero h1';
 if(!(await page.locator(heading).isVisible()))throw new Error(key+': heading missing');
 const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
 if(overflow)throw new Error(key+': horizontal overflow');
 await page.screenshot({path:path.join(out,'screenshots',key+'-before.png')});
 if(scenario){
  await page.locator('#play').click();
  await page.waitForTimeout(300);
  if(!(await page.locator('#action').isVisible()))throw new Error(key+': action button hidden');
  const box=await page.locator('#action').boundingBox();
  const x=box.x+box.width/2,y=box.y+box.height/2;
  if(slug==='girigiri'){
   await page.mouse.move(x,y);await page.mouse.down();await page.waitForTimeout(1950);await page.mouse.up();await page.waitForTimeout(2800);
   if(await page.locator('#curtain').evaluate(e=>e.classList.contains('hidden')))throw new Error('girigiri: no result');
  }else if(slug==='ato-hitotsu'){
   await page.waitForTimeout(600);await page.locator('#action').click();await page.waitForTimeout(550);
   const score=Number(await page.locator('#record').innerText());
   if(score<1)throw new Error('ato-hitotsu: first block did not land');
  }else if(slug==='kienaide'){
   await page.mouse.move(x,y);await page.mouse.down();await page.waitForTimeout(6100);await page.mouse.up();await page.waitForTimeout(350);
   if(!(await page.locator('#curtain-title').innerText()).includes('守りすぎた'))throw new Error('kienaide: all-hold ending missing');
  }else if(slug==='micha-dame'){
   await page.mouse.move(x,y);await page.mouse.down();await page.waitForTimeout(12450);await page.mouse.up();await page.waitForTimeout(300);
   if(!(await page.locator('#curtain-title').innerText()).includes('見なかった'))throw new Error('micha-dame: cannot clear by holding');
  }else{
   const kind=JSON.parse(fs.readFileSync('catalog.json','utf8')).games.find(g=>g.slug===slug)?.visual;
   if(kind==='timing'||kind==='rhythm'){await page.locator('#action').click();await page.locator('#action').click();}
   else if(kind==='balance'){for(let i=0;i<4;i++)await page.locator('#action').click();}
   else if(kind==='choice'){for(let i=0;i<3;i++)await page.locator('#action').click();}
   await page.waitForTimeout(340);
   if(await page.locator('#curtain').evaluate(e=>e.classList.contains('hidden')))throw new Error(key+': no result');
  }
  await page.screenshot({path:path.join(out,'screenshots',key+'-after.png')});
 }
 if(errors.length)throw new Error(key+' browser errors: '+errors.join('; '));
 const video=await page.video().path();
 await context.close();
 const videoDest=path.join(out,'social',key+'.webm');
 fs.renameSync(video,videoDest);
 const args=['-hide_banner','-loglevel','error','-y','-i',videoDest,'-vf','scale=1080:1920:force_original_aspect_ratio=decrease,pad=1080:1920:(ow-iw)/2:(oh-ih)/2','-r','24','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',path.join(out,'social',key+'.mp4')];
 const convert=spawnSync('ffmpeg',args,{encoding:'utf8'});
 results.push({slug:key,url,video:convert.status===0?'mp4+webm':'webm',errors});
 console.log('PASS',key);
}
try{
 await grab('',false);
 for(const slug of JSON.parse(fs.readFileSync('catalog.json','utf8')).games.map(g=>g.slug))await grab(slug,true);
 fs.writeFileSync(path.join(out,'QA_REPORT.json'),JSON.stringify({viewports:['390x844'],status:'passed',results},null,2));
}finally{await browser.close();await new Promise(r=>server.close(r))}
