import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
test('finale phases and deterministic storm are present',()=>{
 for(const phase of ['approach','gust-warning','gust-active','silence','window-reply']){
  assert.ok(app.includes("'"+phase+"'"),phase);
 }
 assert.match(app,/const finaleTime=elapsed-80/);
 assert.match(app,/finaleTime<2/);
 assert.match(app,/finaleTime<7/);
 assert.match(app,/finaleTime<8\.5/);
 assert.match(app,/s\.wind=s\.finalePhase==='gust-active'\?1\.15/);
});
test('existing ending flow and accessibility hooks remain',()=>{
 assert.match(app,/finish\(s\.memories===3\?/);
 assert.match(app,/if\(s\.flame<=0\)/);
 assert.match(app,/if\(s\.oxygen<=0\)/);
 assert.match(app,/prefers-reduced-motion|reducedMotion/);
});
