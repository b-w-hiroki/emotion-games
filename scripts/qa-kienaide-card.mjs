// Real ending buttons + real PNG download; native share is stubbed, never posted externally.
import fs from 'node:fs';import path from 'node:path';import http from 'node:http';import assert from 'node:assert/strict';import sharp from 'sharp';import * as pw from 'playwright';
const engine=process.argv[2]||'chromium',remote=process.argv[3],root=path.resolve('dist'),out=path.resolve('artifacts/kienaide');fs.mkdirSync(out,{recursive:true});
const mime={'.js':'text/javascript','.css':'text/css','.html':'text/html','.json':'application/json','.webp':'image/webp','.png':'image/png'};
const server=http.createServer((req,res)=>{const rel=new URL(req.url,'http://localhost').pathname.replace(/^\/emotion-games\//,''),file=path.resolve(root,rel.endsWith('/')?rel+'index.html':rel);if(!file.startsWith(root+path.sep)){res.writeHead(404);return res.end()}fs.readFile(file,(e,data)=>{res.writeHead(e?404:200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(e?'':data)})});
if(!remote)await new Promise(ok=>server.listen(0,'127.0.0.1',ok));
const base=remote?remote.replace(/\/$/,'')+'/kienaide/':'http://127.0.0.1:'+server.address().port+'/emotion-games/kienaide/';
const browser=await pw[engine].launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}:{})});
async function ending(size,{nullBlob=false,delayBlob=false,missingModule=false}={}){
 const ctx=await browser.newContext({viewport:size,hasTouch:true,isMobile:engine==='chromium',acceptDownloads:true});
 if(missingModule)await ctx.route('**/kienaide-card.js',route=>route.abort());
 await ctx.addInitScript(({nullBlob,delayBlob})=>{
  localStorage.setItem('emotion-kienaide-intro-v1','1');window.cardCalls=0;
  const toBlob=HTMLCanvasElement.prototype.toBlob;
  HTMLCanvasElement.prototype.toBlob=function(done,...args){if(this.width===900&&this.height===1200){if(nullBlob){done(null);return}if(delayBlob){window.completeCard=()=>toBlob.call(this,done,...args);return}}return toBlob.call(this,done,...args)};
  window.restoreCardEncoder=()=>{HTMLCanvasElement.prototype.toBlob=toBlob};
  Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>true});
  Object.defineProperty(navigator,'share',{configurable:true,value:payload=>{window.cardCalls++;window.sharedCard={filename:payload.files[0].name,type:payload.files[0].type,size:payload.files[0].size,text:payload.text,active:navigator.userActivation?.isActive};return new Promise(resolve=>{window.closeCardShare=resolve})}});
 },{nullBlob,delayBlob});
 const page=await ctx.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.goto(base+'?qa=1&seed=2&speed=12&mem=3&utm_source=card-test');
 await page.locator('#play').click();const action=await page.locator('#action').boundingBox();await page.mouse.move(action.x+action.width/2,action.y+action.height/2);await page.mouse.down();
 await page.waitForFunction(()=>document.querySelector('#stage').dataset.ending==='smother',null,{timeout:15000});await page.mouse.up();await page.waitForFunction(()=>!document.querySelector('#curtain').classList.contains('hidden'));
 return {ctx,page,errors};
}
async function ready(page){await page.waitForFunction(()=>document.querySelector('#moment-save').dataset.state==='ready');assert.ok(await page.locator('#moment-save').isEnabled())}
try{
 for(const size of [{width:390,height:844},{width:360,height:640}]){
  const {ctx,page,errors}=await ending(size);await ready(page);const button=page.locator('#moment-save');await button.click();
  await button.dispatchEvent('click');assert.equal(await page.evaluate(()=>window.cardCalls),1,'busy guard prevents duplicate share sheets');assert.ok(await button.isDisabled());
  const shared=await page.evaluate(()=>window.sharedCard);assert.equal(shared.filename,'kienaide-smother.png');assert.equal(shared.type,'image/png');assert.ok(shared.size>50000);assert.ok(shared.active!==false,'native share begins in transient user activation');assert.ok(!/[?&](qa|seed|speed|mem|utm_source)=/.test(shared.text));
  await page.evaluate(()=>window.closeCardShare());await ready(page);assert.match(await page.locator('#moment-status').innerText(),/共有の操作/);
  let cancelledDownloads=0;const cancelledDownload=()=>{cancelledDownloads++};page.on('download',cancelledDownload);
  await page.evaluate(()=>Object.defineProperty(navigator,'share',{configurable:true,value:()=>Promise.reject(new DOMException('cancel','AbortError'))}));await button.click();await ready(page);assert.match(await page.locator('#moment-status').innerText(),/取り消し/);assert.equal(cancelledDownloads,0,'cancel must not force a download');page.off('download',cancelledDownload);
  await page.evaluate(()=>Object.defineProperty(navigator,'canShare',{configurable:true,value:()=>{throw new Error('unsupported')}}));
  const downloadPromise=page.waitForEvent('download');await button.click();const download=await downloadPromise;assert.equal(download.suggestedFilename(),'kienaide-smother.png');
  const file=path.join(out,`${engine}-${size.width}-ending-card.png`);await download.saveAs(file);const metadata=await sharp(file).metadata();assert.equal(metadata.width,900);assert.equal(metadata.height,1200);assert.equal(metadata.format,'png');
  assert.match(await page.locator('#moment-status').innerText(),/ダウンロードを開始/);assert.ok(await button.evaluate(el=>el.scrollWidth<=el.clientWidth+1));
  await page.screenshot({path:path.join(out,`${engine}-${size.width}-card-feedback.png`)});
  const geometry=await page.locator('#curtain').evaluate(el=>({scrollable:el.scrollHeight>el.clientHeight,overflow:getComputedStyle(el).overflowY}));assert.equal(geometry.overflow,'auto');
  await page.locator('#curtain').evaluate(el=>{document.querySelector('#curtain-description').textContent+=' 夜の道を歩き、灯りを届ける。'.repeat(30);el.scrollTop=el.scrollHeight});assert.ok(await page.locator('#curtain').evaluate(el=>el.scrollTop>0),'long result remains scrollable instead of clipping its actions');
  await page.locator('#play').click();assert.ok(await page.locator('#moment-status').isHidden());assert.equal(await button.getAttribute('data-state'),'idle');
  const action=await page.locator('#action').boundingBox();await page.mouse.move(action.x+action.width/2,action.y+action.height/2);await page.mouse.down();await page.waitForFunction(()=>document.querySelector('#stage').dataset.ending==='smother',null,{timeout:15000});await page.mouse.up();await ready(page);assert.equal(await page.locator('#curtain').evaluate(el=>el.scrollTop),0,'the next result starts at its heading, not the previous scroll position');
  assert.deepEqual(errors,[]);await ctx.close();console.log('PASS card native gesture, busy guard, PNG download, feedback and retry',size.width,geometry);
 }
 {
  const {ctx,page,errors}=await ending({width:360,height:640},{nullBlob:true});await page.waitForFunction(()=>document.querySelector('#moment-save').dataset.state==='error');
  assert.match(await page.locator('#moment-status').innerText(),/作れません/);await page.evaluate(()=>window.restoreCardEncoder());await page.locator('#moment-save').focus();await page.keyboard.press('Enter');await ready(page);assert.equal(await page.evaluate(()=>window.cardCalls),0,'creation retry does not auto-share');assert.ok(await page.locator('#moment-save').evaluate(el=>el===document.activeElement),'retry restores keyboard focus');
  await page.locator('#moment-save').click();assert.equal(await page.evaluate(()=>window.cardCalls),1);
  await page.locator('#play').click();await page.evaluate(()=>window.closeCardShare());await page.waitForTimeout(150);assert.equal(await page.locator('#moment-save').getAttribute('data-state'),'idle');assert.ok(await page.locator('#moment-status').isHidden());
  assert.deepEqual(errors,[]);await ctx.close();console.log('PASS PNG failure recovery and late native-share reset');
 }
 {
  const {ctx,page,errors}=await ending({width:390,height:844},{delayBlob:true});assert.ok(await page.locator('#moment-save').isDisabled());await page.locator('#play').click();await page.evaluate(()=>{window.restoreCardEncoder();window.completeCard()});await page.waitForTimeout(300);
  assert.equal(await page.locator('#moment-save').getAttribute('data-state'),'idle');assert.ok(await page.locator('#moment-status').isHidden());assert.deepEqual(errors,[]);await ctx.close();console.log('PASS late PNG callback cannot change the next journey');
 }
 {
  const {ctx,page,errors}=await ending({width:360,height:640},{missingModule:true});await page.waitForFunction(()=>document.querySelector('#moment-save').dataset.state==='unavailable');assert.ok(await page.locator('#moment-save').isDisabled());assert.match(await page.locator('#moment-status').innerText(),/ページを読み直して/);assert.ok((await page.evaluate(()=>JSON.parse(localStorage.getItem('emotion-endings-v1-kienaide')))).includes('smother'));
  await page.locator('#play').click();assert.ok(await page.locator('#moment-status').isHidden());assert.ok(await page.locator('#action').isEnabled());assert.deepEqual(errors,[]);await ctx.close();console.log('PASS missing export module does not break play, discovery saves or retry');
 }
 console.log('PASS Kienaide card QA',engine,remote||'local');
}finally{await browser.close();if(!remote)server.close()}
