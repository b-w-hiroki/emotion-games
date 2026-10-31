// The game page wires the deterministic core into presentation without changing gallery IDs.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const app=readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
const core=readFileSync(new URL('../assets/kienaide-core.js',import.meta.url),'utf8');
test('the ending clock excludes focus and gallery interruptions even without frames',()=>{
 const clock=app.match(/function syncEndingClock\(\)\{([^\n]+)\}/)[1];
 const s={mode:'end',endingAt:1,endingTime:0,endingClockAt:0,endingPaused:false,document:{hidden:false},candleWindowFocused:true,landscapeMode:{matches:false},candleDialog:null,now:0};
 s.performance={now:()=>s.now};const sync=()=>vm.runInNewContext('(function(){'+clock+'})()',s);
 s.now=500;s.candleWindowFocused=false;sync();s.now=4500;s.candleWindowFocused=true;sync();
 s.now=5000;s.candleDialog={id:'collection-panel'};sync();s.now=8000;s.candleDialog=null;sync();
 s.now=8500;sync();assert.equal(s.endingTime,1.5,'only visible, focused time advances the ending');
});
test('finale phases are produced by the core and drive story, sound and analytics',()=>{
 for(const phase of ['approach','gust-warning','gust-active','silence','window-reply'])assert.ok(core.includes("'"+phase+"'"),phase);
 for(const hook of ["e.phase==='gust-warning'","e.phase==='silence'","e.type==='reply'","KA.cues.reply(e.level)","mark('finale_window'"])assert.ok(app.includes(hook),hook);
 for(const event of ['finale_window','game_complete']){
  const line=app.split('\n').find(part=>part.includes("mark('"+event+"'"));
  assert.match(line,/gust_shield:[^,}]+/);
  assert.match(line,/silence_release:[^,}]+/);
 }
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
