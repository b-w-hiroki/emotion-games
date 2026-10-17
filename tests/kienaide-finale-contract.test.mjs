// The game page wires the deterministic core into presentation without changing gallery IDs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const app=readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
const core=readFileSync(new URL('../assets/kienaide-core.js',import.meta.url),'utf8');
test('finale phases are produced by the core and drive story, sound and analytics',()=>{
 for(const phase of ['approach','gust-warning','gust-active','silence','window-reply'])assert.ok(core.includes("'"+phase+"'"),phase);
 for(const hook of ["e.phase==='gust-warning'","e.phase==='silence'","e.type==='reply'","KA.cues.reply(e.level)","mark('finale_window'"])assert.ok(app.includes(hook),hook);
});
test('existing ending flow, saves and accessibility hooks remain',()=>{
 // Gallery IDs and storage keys are the save format: they must never change.
 const ids=[...app.matchAll(/kienaide:\[\r?\n([\s\S]*?)\r?\n \]/g)][0][1].match(/id:'([a-z]+)'/g).map(x=>x.slice(4,-1));
 assert.deepEqual(ids,['blown','smother','wish','survive','dawn']);
 assert.ok(app.includes("localStorage.getItem('emotion-endings-v1-'+slug)"));
 assert.ok(app.includes("localStorage.setItem('emotion-endings-v1-'+slug,JSON.stringify(collected))"));
 assert.ok(app.includes("finish(e.ending,"));
 assert.match(app,/prefers-reduced-motion/);
});
test('every Kienaide ending explains both the consequence and the player condition',()=>{
 for(const id of ['blown','smother','wish','survive','dawn'])assert.match(app,new RegExp(id+":\\{outcome:'[^']+',reason:'[^']+"),id);
 for(const hook of ['ending-meaning','ending-outcome','ending-reason','renderCandleEndingMeaning()'])assert.ok(app.includes(hook),hook);
 for(const fact of ['灯り 0%','息 0%','記憶 3 / 3','道の記憶を取りこぼした','ふたりで夜を越えた'])assert.ok(app.includes(fact),fact);
});
