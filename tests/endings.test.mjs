import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const app=fs.readFileSync('assets/app.js','utf8');
const match=app.match(/const endings=(\{[\s\S]*?\});\s*Object.assign\(endings/);
assert.ok(match,'Ending catalog must be defined and readable');
const endings=vm.runInNewContext('('+match[1]+')');

test('all games offer at least five unique collectible outcomes',()=>{
 for(const slug of ['girigiri','ato-hitotsu','micha-dame','kienaide']){
  const list=endings[slug];
  assert.equal(list.length,5,slug);
  assert.equal(new Set(list.map(x=>x.id)).size,list.length);
  for(const entry of list){
   assert.match(entry.id,/^[a-z][a-z0-9-]+$/);
   assert.ok(entry.title.length>0);
   assert.ok(entry.desc.length>0);
   assert.ok(entry.hint.length>0);
  }
 }
});
test('hidden input branches exist in each title',()=>{
 for(const marker of ["finish('empty'","finish('wait'","finish('ignore'","finish('knock'","finish('rush'","finish('precision'","finish('resist'"])assert.ok(app.includes(marker),marker);
});
test('collection saves discoveries and remains separate from score',()=>{
 for(const marker of ["emotion-endings-v1-","localStorage.setItem('emotion-endings-v1-","function renderCollection()","ending_discovered","ending_id:lastEnding","collection_open"])assert.ok(app.includes(marker),marker);
});

test('Kienaide imports valid preview discoveries without overwriting either collection',()=>{
 assert.ok(app.includes("if(slug==='kienaide')try{const raw=JSON.parse(localStorage.getItem('kienaide-art-endings-v1')||'[]')"));
 assert.ok(app.includes("new Set([...collected,...raw.filter(id=>endingList.some(e=>e.id===id))])"));
 assert.ok(app.includes("localStorage.setItem('emotion-endings-v1-'+slug,JSON.stringify(collected))"));
});
test('runtime passes syntax validation',()=>{
 const r=spawnSync(process.execPath,['--check','assets/app.js'],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
});

test('milestone rewards are defined for every game and are independent of score',()=>{
 const match=app.match(/const rewardSets=(\{[\s\S]*?\});\s*Object.assign\(rewardSets/);
 assert.ok(match,'reward catalog must exist');
 const rewards=vm.runInNewContext('('+match[1]+')');
 assert.deepEqual(Object.keys(rewards).sort(),Object.keys(endings).sort());
 for(const game of Object.keys(rewards)){
  assert.ok(rewards[game].three.title.length>=3);
  assert.ok(rewards[game].three.text.length>=10);
  assert.ok(rewards[game].all.title.length>=3);
  assert.ok(rewards[game].all.text.length>=10);
  assert.ok(rewards[game].all.symbol);
 }
 for(const required of ['reward_unlocked','series_completion_share_tap','completion_share_tap','collected.length>=3','collected.length===endingList.length','const newly=unlock(id)','curtain.classList.toggle'])assert.ok(app.includes(required),required);
});

test('microgame library declares sixteen runnable games with 80 varied endings and reward sets',()=>{
 const js=fs.readFileSync('assets/microgames.js','utf8');
 const scope={window:{}};
 vm.runInNewContext(js,scope,{timeout:500});
 const lib=scope.window.EmotionMissions;
 assert.ok(lib);
 assert.equal(lib.games.length,16);
 assert.equal(new Set(lib.games.map(g=>g.slug)).size,16);
 const catalog=JSON.parse(fs.readFileSync('catalog.json','utf8')).games;
 assert.equal(catalog.length,20);
 for(const g of lib.games){
  const endingList=lib.endings[g.slug];
  assert.equal(endingList.length,5,g.slug);
  assert.equal(new Set(endingList.map(e=>e.id)).size,5,g.slug);
  assert.ok(lib.rewards[g.slug].all.title);
  assert.ok(lib.rewards[g.slug].three.title);
  const state=lib.makeState(g.slug);
  assert.equal(state.type,g.theme);
  assert.equal(typeof lib.frame,'function');
  assert.equal(typeof lib.canvasTap,'function');
 }
 assert.equal(Object.values(lib.endings).flat().length,80);
 const r=spawnSync(process.execPath,['--check','assets/microgames.js'],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
});
