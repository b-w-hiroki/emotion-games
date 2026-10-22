import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import assert from 'node:assert/strict';
import * as pw from 'playwright';

const engine=process.argv[2]||'chromium';

const root=path.resolve('dist');
const types={'.js':'text/javascript','.css':'text/css','.html':'text/html','.png':'image/png','.svg':'image/svg+xml','.json':'application/json'};
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
const browser=await pw[engine].launch({headless:true,...(engine==='chromium'?{args:['--no-sandbox']}:{})});
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
 await page.locator('[data-question="felt"] button').filter({hasText:'緊張'}).click();
 await page.locator('[data-question="understood"] button').filter({hasText:'すぐ分かった'}).click();
 await page.locator('[data-question="intensity"] button').filter({hasText:'4',exact:true}).click();
 await page.locator('[data-question="replay_reason"] button').filter({hasText:'別の結末'}).click();
 const observations=await page.evaluate(()=>JSON.parse(localStorage.getItem('emotion-games-study-v1')||'[]'));
 assert.equal(observations.length,1);
 assert.equal(observations[0].felt,'緊張');
 assert.equal(observations[0].answered,true);
 assert.equal(observations[0].game_id,'micha-dame');
 assert.equal(observations[0].schema_version,2);
 assert.equal(observations[0].attempt_index,1);
 assert.equal(observations[0].understood,'immediate');
 assert.equal(observations[0].intensity,4);
 assert.equal(observations[0].replay_reason,'other-ending');
 assert.ok(observations[0].duration_ms>=0);
 assert.ok(observations[0].inputs>=3);
 // The flagship adds its loop telemetry and keeps the four questions usable at 390x844.
 await page.goto(origin+'kienaide/?study=1&qa=1&seed=2&speed=12');
 await page.evaluate(()=>localStorage.setItem('emotion-kienaide-intro-v1','1'));await page.reload();
 await page.locator('#play').click();
 await page.locator('#route-choice [data-route="rest"]').waitFor({state:'visible',timeout:10000});
 await page.locator('#route-choice [data-route="rest"]').click();
 const selected=(await page.evaluate(()=>JSON.parse(localStorage.getItem('emotion-games-study-v1')||'[]'))).at(-1);
 assert.equal(selected.route,'rest','the choice is saved before an ending, including if the player exits early');
 assert.equal(selected.completed,false);
 const decision=page.locator('#route-choice [data-decision]').first();
 const deadline=Date.now()+20000;
 while(Date.now()<deadline&&await page.locator('#study-feedback').isHidden()){
  if(await decision.isVisible())await decision.click();
  else await page.waitForTimeout(100);
 }
 await page.locator('#study-feedback').waitFor({state:'visible',timeout:1000});
 await page.locator('#study-feedback summary').click();
 assert.equal(await page.locator('.study-questions fieldset').count(),4);
 assert.match(await page.locator('[data-question="intensity"] legend').innerText(),/1:弱い／5:強い/);
 fs.mkdirSync('artifacts/screenshots',{recursive:true});
 for(const width of [390,360]){
  await page.setViewportSize({width,height:width===390?844:640});
  const targets=await page.locator('#study-feedback summary,.study-options button').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {width:r.width,height:r.height,left:r.left,right:r.right}}));
  for(const target of targets)assert.ok(target.width>=44&&target.height>=44&&target.left>=0&&target.right<=width,'survey control must fit a thumb and the screen: '+width+' '+JSON.stringify(target));
  const last=page.locator('[data-question="replay_reason"] button').last();await last.scrollIntoViewIfNeeded();await last.tap();
  assert.equal(await last.getAttribute('aria-pressed'),'true');
  await page.screenshot({path:'artifacts/screenshots/kienaide-study-survey-'+engine+'-'+width+'.png'});
 }
 await page.locator('[data-question="replay_reason"]').scrollIntoViewIfNeeded();
 assert.ok(await page.locator('[data-question="replay_reason"] button').last().isVisible());
 const flagship=(await page.evaluate(()=>JSON.parse(localStorage.getItem('emotion-games-study-v1')||'[]'))).at(-1);
 assert.equal(flagship.game_id,'kienaide');
 assert.equal(flagship.route,'rest');
 assert.equal(flagship.memories,0);
 assert.equal(flagship.miracle,false);
 assert.ok(Number.isFinite(flagship.lowest_flame));
 await page.reload();
 const persisted=await page.evaluate(()=>JSON.parse(localStorage.getItem('emotion-games-study-v1')||'[]'));
 assert.equal(persisted.length,2);
 await page.goto(origin+'kienaide/?study=1&qa=1&seed=2&speed=1&t=27');
 await page.locator('#play').click();
 const retried=(await page.evaluate(()=>JSON.parse(localStorage.getItem('emotion-games-study-v1')||'[]'))).at(-1);
 assert.equal(retried.attempt_index,2,'a reload must not silently reset the device-local attempt order');
 assert.equal(retried.route,null);
 await page.locator('#route-choice [data-route="shortcut"]').waitFor({state:'visible',timeout:10000});
 await page.locator('#route-choice [data-route="shortcut"]').click();
 const abandoned=(await page.evaluate(()=>JSON.parse(localStorage.getItem('emotion-games-study-v1')||'[]'))).at(-1);
 assert.equal(abandoned.route,'shortcut');
 assert.equal(abandoned.completed,false,'leaving after the choice must not be counted as a completed shortcut');
 await page.goto(origin+'?study=1');
 assert.ok(await page.locator('#study-export').isVisible());
 assert.ok(await page.locator('#study-clear').isVisible());
 assert.ok((await page.locator('.study-dashboard').innerText()).includes('3 回のプレイ'));
 await page.setViewportSize({width:360,height:640});
 const dashboardButtons=await page.locator('.study-actions button').evaluateAll(els=>els.map(el=>{const r=el.getBoundingClientRect();return {height:r.height,left:r.left,right:r.right}}));
 for(const button of dashboardButtons)assert.ok(button.height>=44&&button.left>=0&&button.right<=360,'study export and clear must be reachable on a narrow phone: '+JSON.stringify(button));
 assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2),false,'study home must not scroll sideways');
 await page.screenshot({path:'artifacts/screenshots/kienaide-study-home-'+engine+'-360.png',fullPage:true});
 const first=await page.locator('.kienaide-home-play').getAttribute('href');assert.ok(first.includes('study=1'));
 await page.locator('.kienaide-home-play').click();assert.equal(new URL(page.url()).searchParams.get('study'),'1');
 console.log('PASS blind research mode / four-question survey / local persistence / export UI');
 // No experimental data is added for a regular visitor.
 await page.goto(origin);assert.equal(await page.locator('.study-dashboard').count(),0);
 await page.goto(origin+'kasa-o/');
 assert.equal(await page.locator('#study-feedback').count(),0);
 assert.deepEqual(errors,[]);
 await ctx.close();
}finally{await browser.close();await new Promise(r=>srv.close(r))}
