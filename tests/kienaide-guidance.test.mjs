import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import '../assets/kienaide-core.js';

const app=readFileSync(new URL('../assets/app.js',import.meta.url),'utf8');
const start=app.indexOf('function candleCaption(s){'),end=app.indexOf('\nfunction drawCandle',start);
assert.ok(start>=0&&end>start,'caption function remains available for contract tests');
const caption=Function('elapsed','K',app.slice(start,end)+'\nreturn candleCaption;')(12,globalThis.KienaideCore);
const actionCopy=Function(app.slice(start,end)+'\nreturn candleActionCopy;')();
const base={flame:18,oxygen:80,wind:.2,chapter:0,bridgeFrost:0,finalePhase:'approach',shield:false,memories:0};

test('story reading and fade clocks stop together through interruptions without frames',()=>{
 const body=app.match(/function syncStoryAnimation\(\)\{([^\n]+)\}/)[1],el={style:{}};
 const c={candle:true,storyReadingTime:4.2,storyClockAt:1,storyPaused:false,now:501,document:{hidden:false},candleWindowFocused:true,landscapeMode:{matches:false},candleDialog:null,chapterLoading:false,$:()=>el};
 c.performance={now:()=>c.now};const sync=()=>vm.runInNewContext('(function(){'+body+'})()',c);
 c.candleDialog={id:'journey-menu'};sync();assert.equal(el.style.animationPlayState,'paused');
 c.now=5501;c.candleDialog=null;sync();assert.equal(c.storyReadingTime,3.7);assert.equal(el.style.animationPlayState,'running');
 c.now=6001;c.candleWindowFocused=false;sync();c.now=11001;c.candleWindowFocused=true;sync();
 assert.equal(c.storyReadingTime,3.2,'background time cannot consume reading time');
});

test('weak wind tells a weakened traveller to recover breath instead of wasting it',()=>{
 assert.deepEqual(caption({...base,shield:true}),['風が弱い — いま離して',false]);
 assert.deepEqual(caption(base),['風が弱い — 息を戻して',false]);
 const K=globalThis.KienaideCore,open=K.create({seed:1}),held=K.create({seed:1});
 open.flame=held.flame=18;open.oxygen=held.oxygen=55;
 K.step(open,0,1,{shield:false,wasShield:false,releaseIntent:false});
 K.step(held,0,1,{shield:true,wasShield:false,releaseIntent:false});
 assert.ok(open.flame>held.flame,'uncovered calm flame recovers faster');
 assert.ok(open.oxygen>held.oxygen,'breath also recovers while hands are open');
});

test('critical guidance still protects against wind and bridge frost',()=>{
 assert.match(caption({...base,wind:.7})[0],/かばって/);
 assert.match(caption({...base,chapter:2,bridgeFrost:.8})[0],/かばって/);
 assert.match(caption({...base,event:{kind:'gust',at:12.5}})[0],/かばって/,'a coming gust outranks a temporary lull');
 assert.match(caption({...base,oxygen:20})[0],/息が危ない/);
});

test('critical flame can recover across the entire non-damaging wind range',()=>{
 const K=globalThis.KienaideCore,open=K.create({seed:1}),held=K.create({seed:1});
 for(const s of [open,held]){s.events=[];s.flame=18;s.oxygen=55}
 K.step(open,7.1,1,{shield:false});K.step(held,7.1,1,{shield:true});
 assert.ok(open.wind>.44&&open.wind<=K.WIND_DAMAGE_THRESHOLD);
 assert.ok(open.flame>held.flame&&open.oxygen>held.oxygen,'opening recovers both resources faster');
 assert.match(caption(open)[0],/息を戻して/);
 assert.match(caption(held)[0],/いま離して/);
 assert.match(caption({...open,wind:.5})[0],/息を戻して/);
 assert.match(caption({...open,wind:.5001})[0],/かばって/);
 assert.match(caption({...open,chapter:2,bridgeFrost:.8})[0],/かばって/,'bridge frost remains dangerous');
});

test('low breath while shielding does not claim strong wind has calmed',()=>{
 const guarded={...base,flame:60,shield:true,wind:.57,oxygen:26};
 assert.deepEqual(caption(guarded),['息が苦しい — いま離して',true]);
 assert.deepEqual(caption({...guarded,oxygen:40,wind:.2}),['風が弱まった — いま離して',false]);
 assert.deepEqual(caption({...guarded,oxygen:40}),['灯りをかばっている',false]);
});

test('wind that damages an exposed flame is not described as a lull',()=>{
 const K=globalThis.KienaideCore,s=K.create({seed:2});s.events=[];s.flame=72;s.oxygen=70;
 K.step(s,5,1,{shield:false,wasShield:false});
 assert.ok(s.wind>.5&&s.wind<.61,'the real wind lies in the previously unannounced damage range');
 assert.ok(s.flame<72,'that wind actually damages the exposed flame');
 assert.deepEqual(caption(s),['風が来る — 長押し',true]);
 assert.deepEqual(caption({...s,wind:.5}),['凪いでいる — 息を戻す',false]);
 assert.deepEqual(caption({...s,wind:.5001}),['風が来る — 長押し',true]);
 assert.match(caption({...s,oxygen:20})[0],/息が危ない/,'critical breath still takes priority');
});

test('the final storm and silence outrank a temporary calm wind',()=>{
 assert.match(caption({...base,finalePhase:'gust-warning'})[0],/最後の風.*長押し/);
 assert.match(caption({...base,finalePhase:'gust-active',wind:1.15})[0],/大突風/);
 assert.match(caption({...base,finalePhase:'silence',shield:true})[0],/いま離して/);
});

test('eddy guidance describes the opening as a consequence of release',()=>{
 const s={...base,flame:60,wind:.7,shield:true,event:{id:'eddy-1',kind:'eddy',at:10},eddyReleasedEvent:''};
 assert.deepEqual(caption(s),['手を離すと渦がほどける',false]);
 assert.deepEqual(caption({...s,shield:false,wind:.3,eddyReleasedEvent:'eddy-1'}),['渦の隙間 — 息を整える',false]);
});

test('an opened eddy does not hide damaging shortcut wind',()=>{
 const K=globalThis.KienaideCore,s=K.create({seed:5}),time=29.2;
 Object.assign(s,{routeChoice:'shortcut',shortcutUntil:36,decisionIndex:2,shelterReady:false});
 K.step(s,time,.1,{shield:false,wasShield:true,releaseIntent:true});
 assert.ok(s.wind>K.WIND_DAMAGE_THRESHOLD&&s.flame<72,'the real shortcut wind still damages the flame');
 const read=Function('elapsed','K',app.slice(start,end)+'\nreturn candleCaption;')(time,K);
 assert.match(read(s)[0],/近道の風.*かばって/);
 assert.match(read({...s,shield:true})[0],/近道の風/,'holding must not recommend releasing into the same wind');
 assert.match(read({...s,shield:true,oxygen:26})[0],/息が苦しい/,'low breath takes priority over sheltering');
});

test('the visible window reply cue tells a player still holding to recover breath',()=>{
 const reply={...base,finalePhase:'window-reply',shield:true,oxygen:35,reply:.45};
 assert.deepEqual(caption(reply),['窓の返事 — 手を離して息を',false]);
 assert.deepEqual(caption({...reply,reply:0}),['あと少し — 手を離して息を',false]);
 assert.deepEqual(caption({...reply,shield:false}),['窓が答えている',false]);
 assert.deepEqual(caption({...reply,shield:false,oxygen:18}),['窓の返事 — 手を離して息を',true]);
});

test('the final control names an open hand after release, including low breath and the window reply',()=>{
 assert.deepEqual(actionCopy({...base,finalePhase:'silence',shield:true}),['はなす','窓に灯りを見せる']);
 assert.deepEqual(actionCopy({...base,finalePhase:'silence',shield:false}),['手をひらいている','そのまま窓の返事を待つ']);
 assert.deepEqual(actionCopy({...base,finalePhase:'window-reply',shield:false,oxygen:18}),['手をひらいている','そのまま息を戻す']);
 assert.deepEqual(actionCopy({...base,finalePhase:'window-reply',shield:true}),['はなす','息を戻す']);
 assert.deepEqual(actionCopy({...base,finalePhase:'window-reply',shield:false,oxygen:80}),['手をひらいている','家まであと少し']);
 assert.deepEqual(actionCopy({...base,finalePhase:'gust-active',shield:false}),['押さえる','灯りを守る']);
});
