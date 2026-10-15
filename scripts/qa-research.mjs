import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const root=path.resolve('dist');
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.json':'application/json'};
const srv=http.createServer((req,res)=>{
 const u=new URL(req.url,'http://localhost');
 if(!u.pathname.startsWith('/emotion-games/')){res.writeHead(404);return res.end()}
 const part=decodeURIComponent(u.pathname.slice('/emotion-games/'.length));
 const target=path.resolve(root,part.endsWith('/')?part+'index.html':part||'index.html');
 if(!target.startsWith(root+path.sep)){res.writeHead(403);return res.end()}
 try{res.writeHead(200,{'content-type':types[path.extname(target)]||'application/octet-stream'});res.end(fs.readFileSync(target))}
 catch(_){res.writeHead(404);res.end()}
});
await new Promise(r=>srv.listen(0,'127.0.0.1',r));
const origin='http://127.0.0.1:'+srv.address().port+'/emotion-games/';
const browser=await chromium.launch({headless:true,args:['--no-sandbox']});
const errors=[];
try{
 const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
 const page=await ctx.newPage();page.on('pageerror',e=>errors.push(e.message));
 // A spatial catch differs from the center-stop timing variant.
 await page.goto(origin+'hikari-oikake/');
 await page.locator('#play').click();
 await page.locator('#stage').click({position:{x:80,y:100}});
 await page.waitForTimeout(500);
 assert.ok(await page.locator('#discovery-result').isVisible());
 assert.ok((await page.locator('#collection-progress').innerText()).includes('1 / 5'));
 console.log('PASS spatial light-catching gesture');
 // Umbrella is a three-scene left/right narrative with visible scene changes.
 await page.goto(origin+'kasa-o/');
 await page.locator('#play').click();
 assert.ok((await page.locator('.game-heading h1').innerText()).includes('かさ'));
 await page.locator('#stage').click({position:{x:80,y:190}});
 await page.waitForTimeout(100);
 await page.locator('#stage').click({position:{x:280,y:190}});
 await page.waitForTimeout(100);
 await page.locator('#stage').click({position:{x:80,y:190}});
 await page.waitForTimeout(130);
 assert.equal(await page.locator('#curtain-title').innerText(),'ふたりで濡れて帰った。');
 console.log('PASS choice-dependent story flow');
 // Only explicit research-mode visits create a feedback panel and a local observation.
 await page.goto(origin+'micha-dame/?study=1');
 assert.equal(await page.locator('.game-heading .label span').evaluate(x=>getComputedStyle(x).visibility),'hidden');
 await page.locator('#play').click();
 for(let i=0;i<3;i++)await page.locator('#stage').click();
 await page.waitForTimeout(100);
 assert.ok(await page.locator('#study-feedback').isVisible());
 await page.locator('#study-feedback summary').click();
 await page.locator('.study-feelings button').filter({hasText:'緊張'}).click();
 const observations=await page.evaluate(()=>JSON.parse(localStorage.getItem('emotion-games-study-v1')||'[]'));
 assert.equal(observations.length,1);
 assert.equal(observations[0].felt,'緊張');
 assert.equal(observations[0].answered,true);
 assert.equal(observations[0].game_id,'micha-dame');
 assert.ok(observations[0].duration_ms>=0);
 assert.ok(observations[0].inputs>=3);
 await page.reload();
 const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('emotion-games-study-v1')||'[]'));
 assert.equal(persisted.length,1);
 await page.goto(origin+'?study=1');
 assert.ok(await page.locator('#study-export').isVisible());
 assert.ok(await page.locator('#study-clear').isVisible());
 assert.ok((await page.locator('.study-dashboard').innerText()).includes('1 回のプレイ'));
 const first=await page.locator('.card').first().getAttribute('href');assert.ok(first.includes('study=1'));
 console.log('PASS blind research mode / one-tap feeling survey / local persistence / export UI');
 // No experimental data is added for a regular visitor.
 await page.goto(origin+'kasa-o/');
 assert.equal(await page.locator('#study-feedback').count(),0);
 assert.deepEqual(errors,[]);
 await ctx.close();
}finally{await browser.close();await new Promise(r=>srv.close(r))}
