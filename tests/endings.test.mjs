import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { spawnSync } from 'node:child_process';

const app=fs.readFileSync('assets/app.js','utf8');
const match=app.match(/const endings=(\{[\s\S]*?\});\s*const endingList=/);
assert.ok(match,'Ending catalog must be defined and readable');
const endings=vm.runInNewContext('('+match[1]+')');

test('all games offer at least five unique collectible outcomes',()=>{
 for(const slug of ['girigiri','ato-hitotsu','micha-dame']){
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
test('runtime passes syntax validation',()=>{
 const r=spawnSync(process.execPath,['--check','assets/app.js'],{encoding:'utf8'});
 assert.equal(r.status,0,r.stderr);
});
