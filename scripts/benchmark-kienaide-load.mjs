// Compare the previous all-at-once loader with the current opening-first loader on one build.
// Diagnostic only: network emulation is not a physical-device or public-network measurement.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {execFileSync} from 'node:child_process';
import {chromium} from 'playwright';

const root=path.resolve('dist');
const baseline=execFileSync('git',['show','0a3a25e:assets/kienaide-view.js'],{encoding:'utf8'});
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.webp':'image/webp','.avif':'image/avif','.png':'image/png'};
const server=http.createServer((req,res)=>{
 const rel=new URL(req.url,'http://localhost').pathname.replace(/^\/emotion-games\//,'');
 const file=path.resolve(root,rel.endsWith('/')?rel+'index.html':rel);
 if(!file.startsWith(root+path.sep)){res.writeHead(404);return res.end()}
 fs.readFile(file,(error,data)=>{res.writeHead(error?404:200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});res.end(error?'':data)});
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
try{
 for(const [label,view] of [['all-at-once',baseline],['opening-first',null]]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
  if(view)await context.route('**/assets/kienaide-view.js',route=>route.fulfill({status:200,contentType:'text/javascript',body:view}));
  const page=await context.newPage(),session=await context.newCDPSession(page);
  await session.send('Network.enable');
  await session.send('Network.emulateNetworkConditions',{offline:false,latency:80,downloadThroughput:125000,uploadThroughput:125000});
  const start=performance.now();
  await page.goto(`http://127.0.0.1:${server.address().port}/emotion-games/kienaide/`,{waitUntil:'domcontentloaded'});
  await page.waitForFunction(()=>!document.querySelector('#play').disabled,null,{timeout:120000});
  const seconds=(performance.now()-start)/1000;
  const resources=await page.evaluate(()=>performance.getEntriesByType('resource').filter(entry=>entry.name.includes('/paint/')&&/\.(?:avif|webp)$/.test(entry.name)));
  const bytes=resources.reduce((sum,item)=>sum+item.transferSize,0);
  console.log(JSON.stringify({label,seconds:+seconds.toFixed(1),paintRequests:resources.length,paintTransferBytes:bytes}));
  await context.close();
 }
}finally{await browser.close();server.close()}
