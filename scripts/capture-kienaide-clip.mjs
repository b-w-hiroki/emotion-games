// Records the 6–12 s vertical social clip for 004: the last gust → hands open in the silence →
// the window answers → おかえり. Output: artifacts/kienaide/clip-finale.webm (+ .mp4 1080x1920 when ffmpeg exists).
// The clip starts at the finale (QA-only start time and memory preset); the rules are the real game.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import {spawnSync} from 'node:child_process';import {chromium} from 'playwright';
const root=path.resolve('dist'),out=path.resolve('artifacts/kienaide');fs.mkdirSync(out,{recursive:true});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.svg':'image/svg+xml','.json':'application/json','.webp':'image/webp','.avif':'image/avif'};
const server=http.createServer((req,res)=>{const u=new URL(req.url,'http://localhost');const rel=decodeURIComponent(u.pathname.replace(/^\/emotion-games\//,'')),file=path.resolve(root,rel.endsWith('/')||!rel?rel+'index.html':rel);if(!file.startsWith(root))return res.end();fs.readFile(file,(e,d)=>{if(e){res.writeHead(404);return res.end()}res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(d)})});
await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true,recordVideo:{dir:out,size:{width:390,height:844}}});
 await ctx.addInitScript(()=>localStorage.setItem('emotion-kienaide-intro-v1','1'));
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://127.0.0.1:'+server.address().port+'/emotion-games/kienaide/?qa=1&seed=1&speed=1&t=80.4&mem=3');
 const t0=Date.now();await page.locator('#play').click();
 const b=await page.locator('#action').boundingBox();await page.mouse.move(b.x+b.width/2,b.y+b.height/2);
 const phase=()=>page.locator('#stage').getAttribute('data-phase');
 await page.waitForFunction(()=>document.querySelector('#stage').dataset.phase==='gust-active',null,{timeout:10000});
 await page.mouse.down();
 await page.waitForFunction(()=>document.querySelector('#stage').dataset.phase==='silence',null,{timeout:10000});
 await page.waitForTimeout(250);await page.mouse.up();
 await page.waitForFunction(()=>document.querySelector('#stage').dataset.ending,null,{timeout:10000});
 const ending=await page.locator('#stage').getAttribute('data-ending'),reply=await page.locator('#stage').getAttribute('data-reply');
 await page.waitForFunction(()=>!document.querySelector('#curtain').classList.contains('hidden'),null,{timeout:8000});
 await page.locator('#moment-save[data-state="ready"]').waitFor({timeout:10000});
 // The recording is a standalone asset: include a readable route to the real
 // game, not the local QA server or a QA-parameterized URL.
 const destination='https://play.birdman-studio.com/kienaide/';
 await page.evaluate(url=>{
  const link=document.createElement('a');link.id='clip-play-link';link.href=url;
  link.textContent='きえないで。を遊ぶ  ›  play.birdman-studio.com/kienaide/';
  Object.assign(link.style,{position:'fixed',left:'12px',right:'12px',bottom:'18px',zIndex:'99999',padding:'13px 10px',border:'1px solid #e9c98c',borderRadius:'14px',background:'rgba(12,22,36,.96)',color:'#fff3db',font:'700 12px system-ui, sans-serif',textAlign:'center',textDecoration:'none',boxSizing:'border-box'});
  document.body.append(link);
 },destination);
 const clipLink=page.locator('#clip-play-link');
 if(await clipLink.getAttribute('href')!==destination||!(await clipLink.isVisible()))throw new Error('release clip must show the playable game URL');
 const linkBox=await clipLink.boundingBox();if(!linkBox||linkBox.x<0||linkBox.y<0||linkBox.x+linkBox.width>390||linkBox.y+linkBox.height>844)throw new Error('release clip URL must fit in the viewport');
 await page.waitForTimeout(2200);void phase;
 const length=(Date.now()-t0)/1000;
 const video=await page.video().path();await ctx.close();
 const webm=path.join(out,'clip-finale.webm');fs.renameSync(video,webm);
 if(errors.length)throw new Error(errors.join('; '));
 if(ending!=='dawn'||reply!=='bright')throw new Error('clip must show the window answering: '+ending+'/'+reply);
 const mp4=path.join(out,'clip-finale.mp4');
 // Drop pre-play loading, fit the complete excerpt into ten seconds and hold
 // the last frame for two seconds so the destination remains readable even
 // when a busy runner makes the source recording unusually long.
 const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',webm],{encoding:'utf8'}),total=Number(probe.stdout)||length,start=Math.max(0,total-length),rate=Math.min(1,9.8/length);
 // Keep every pixel of the narrow game viewport; fill the wider 9:16 canvas with
 // a dimmed, blurred copy of the same shot instead of black bars or a UI crop.
 const fill='[0:v]split=2[back][front];[back]scale=1080:1920:force_original_aspect_ratio=increase,crop=1080:1920,boxblur=30:4,eq=brightness=-0.20:saturation=0.65[bg];[front]scale=1080:1920:force_original_aspect_ratio=decrease[game];[bg][game]overlay=(W-w)/2:(H-h)/2,format=yuv420p,setpts='+rate+'*(PTS-STARTPTS),tpad=stop_mode=clone:stop_duration=2';
 const r=spawnSync('ffmpeg',['-hide_banner','-loglevel','error','-y','-ss',String(start),'-i',webm,'-t','12','-filter_complex',fill,'-r','30','-c:v','libx264','-pix_fmt','yuv420p','-movflags','+faststart',mp4],{encoding:'utf8'});
 fs.writeFileSync(path.join(out,'clip-finale.json'),JSON.stringify({ending,reply,recordedSeconds:Math.round(length*10)/10,mp4:r.status===0},null,1));
 if(r.status!==0&&process.env.CI)throw new Error('Release clip requires MP4: '+(r.stderr||r.error?.message||r.status));
 if(r.status===0){const probe=spawnSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',mp4],{encoding:'utf8'}),seconds=Number(probe.stdout);if(!(seconds>=6&&seconds<=12.1))throw new Error('Release MP4 must be 6–12 seconds: '+seconds)}
 console.log('PASS kienaide finale capture:',ending,reply,length.toFixed(1)+'s',r.status===0?'verified 6–12s mp4':'raw webm only — release MP4 not verified');
}finally{await browser.close();server.close()}
