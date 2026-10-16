import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {spawnSync} from 'node:child_process';
const src=fs.readFileSync('previews/kienaide-v3.html','utf8');
const segment=src.match(/const dynamicEvents=\[[\s\S]*?\];\s*function eventAt\(time\)\{[\s\S]*?\}/);
assert.ok(segment,'wind event schedule must be defined');
const sandbox={};
vm.runInNewContext(segment[0]+';globalThis.getEvent=eventAt;globalThis.schedule=dynamicEvents;',sandbox,{timeout:1000});
test('wind events are separate, time-bounded and player-readable',()=>{
 const events=Array.from(sandbox.schedule);
 assert.deepEqual(events.map(e=>e.id),['gust','tailwind','vortex','last-gust']);
 for(const e of events){assert.ok(e.end>e.at);assert.ok(e.label&&e.tip)}
 assert.equal(sandbox.getEvent(21),null);
 assert.equal(sandbox.getEvent(22).id,'gust');
 assert.equal(sandbox.getEvent(35).id,'tailwind');
 assert.equal(sandbox.getEvent(54).id,'vortex');
 assert.equal(sandbox.getEvent(78).id,'last-gust');
 assert.equal(sandbox.getEvent(90),null);
});
test('visual and gameplay state react to events and memories',()=>{
 for(const marker of ["s.shelterUsed=true","const oxyCost=","event?.id==='vortex'?1.75:1","scene.classList.toggle('gust'","scene.classList.toggle('afraid'","$('memoryFlash').classList.add('active')","s.flame=Math.min(100,s.flame+3)","prefers-reduced-motion:reduce"]){
  assert.ok(src.includes(marker),marker);
 }
});
test('inline JavaScript parses',()=>{
 const script=src.match(/<script>([\s\S]*?)<\/script>/)?.[1];
 assert.ok(script);
 new vm.Script(script);
 const run=spawnSync(process.execPath,['--check','scripts/qa-art-preview.mjs'],{encoding:'utf8'});
 assert.equal(run.status,0,run.stderr);
});
