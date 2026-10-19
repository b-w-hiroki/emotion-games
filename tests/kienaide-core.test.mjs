// Behavioural contract for 004「きえないで。」: rules are replayed in Node, input → outcome.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../assets/kienaide-core.js';
const K=globalThis.KienaideCore;
const DT=1/30;
// Replays a whole night. policy(state,time,holding) → holding; collect=true taps every memory.
function play(seed,policy,{collect=false,until=95,route}={}){
 const s=K.create({seed}),log=[];let t=0,hold=false;
 while(!s.ended&&t<until){const was=hold;hold=!!policy(s,t,hold);for(const e of K.step(s,t,DT,{shield:hold,wasShield:was}))log.push({...e,t});if(s.routeChoice==='pending'){if(route)K.chooseRoute(s,route,t);else s.routeChoice='legacy-test'}if(collect&&s.mote)K.collect(s,s.mote.id);t+=DT}
 return {s,log};
}
const tele=(s,t,h)=>(!h&&s.wind>.61)?true:(h&&(s.wind<.44||s.oxygen<28))?false:h;
function delayed(lat){let want=false,since=0;return (s,t,h)=>{const w=tele(s,t,want);if(w!==want){want=w;since=t}return t-since>=lat?want:h}}

test('same seed and same inputs always reach the same ending',()=>{
 for(const seed of [1,7,99]){const a=play(seed,delayed(.6),{collect:true}),b=play(seed,delayed(.6),{collect:true});assert.equal(a.s.ended,b.s.ended);assert.equal(a.s.flame,b.s.flame)}
});
test('the five endings are reachable by distinct play styles',()=>{
 assert.equal(play(3,()=>false).s.ended,'blown','never protecting lets the wind take the flame');
 assert.equal(play(3,()=>true).s.ended,'smother','protecting forever uses up the breath');
 assert.equal(play(3,tele).s.ended,'survive','reading the wind without memories survives');
 assert.equal(play(1,tele,{collect:true}).s.ended,'dawn','memories + a bright flame reach おかえり');
 const d=delayed(.6),wish=play(2,(s,t,h)=>s.finalePhase==='silence'?true:d(s,t,h),{collect:true});
 assert.equal(wish.s.memories,3);assert.equal(wish.s.ended,'wish','memories without the window reply stay わすれない');
});
test('ending resolution is the single gallery source of truth',()=>{
 assert.equal(K.arrivalEnding({memories:3,flame:68,replyLevel:'bright'}),'dawn');
 assert.equal(K.arrivalEnding({memories:3,flame:67,replyLevel:'bright'}),'wish');
 assert.equal(K.arrivalEnding({memories:3,flame:100,replyLevel:'faint'}),'wish','a missed silence cannot become a homecoming through flame alone');
 assert.equal(K.arrivalEnding({memories:3,flame:100,replyLevel:'dark'}),'wish');
 assert.equal(K.arrivalEnding({memories:2,flame:100,replyLevel:'bright'}),'survive');
});
test('opening the hands in the final silence changes the ending with the same memories and ample flame',()=>{
 const run=open=>{const s=K.create({seed:5});Object.assign(s,{flame:100,oxygen:100,memories:3});let holding=false;
  for(let t=79;t<=90.1&&!s.ended;t+=DT){const before=holding;holding=t>=81.5&&(!open||t<87);K.step(s,t,DT,{shield:holding,wasShield:before})}return s};
 const closed=run(false),opened=run(true);
 assert.ok(closed.flame>=68&&opened.flame>=68,'both paths must have enough light to isolate the input decision');
 assert.equal(closed.replyLevel,'faint');assert.equal(closed.ended,'wish');
 assert.equal(opened.replyLevel,'bright');assert.equal(opened.ended,'dawn');
});
test('finale phases follow the contract timing and storm strength',()=>{
 assert.deepEqual([79.9,80,81.9,82,86.9,87,88.4,88.5].map(t=>K.finalePhaseAt(t)),['approach','gust-warning','gust-warning','gust-active','gust-active','silence','silence','window-reply']);
 const s=K.create({seed:4});K.step(s,84,DT,{shield:true});assert.equal(s.wind,1.15);
 const q=K.create({seed:4});K.step(q,87.5,DT,{shield:false});assert.ok(q.wind<.1,'silence drops the wind');
});
test('finale input paths: no input / hold all / alternate produce explainable differences',()=>{
 const run=policy=>{const s=K.create({seed:5});Object.assign(s,{flame:60,oxygen:90,memories:3});let h=false;for(let t=79;t<90&&!s.ended;t+=DT){const w=h;h=policy(t);K.step(s,t,DT,{shield:h,wasShield:w})}return s};
 const none=run(()=>false),all=run(()=>true),alt=run(t=>t>=81.5&&t<87);
 assert.equal(none.ended,'blown','an unprotected flame does not survive the last gust');
 assert.ok(all.gustShield>4&&all.silenceRelease===0,'holding through silence never shows the window the flame');
 assert.ok(['faint','dark'].includes(all.replyLevel));
 assert.equal(alt.replyLevel,'bright','guard the gust, then open the hands in the silence');
 const guardedOnly=run(t=>t>=81.5);
 assert.equal(guardedOnly.replyLevel,'faint');
 assert.ok(alt.flame>guardedOnly.flame+8,'opening the hands returns more light: '+alt.flame+' vs '+guardedOnly.flame);
 assert.ok(all.oxygen<alt.oxygen-40,'holding the whole time costs the breath');
 assert.ok(alt.gustShield>=2.5&&alt.silenceRelease>=.45);
});
test('a dead flame never gets a rescue reply',()=>{
 const s=K.create({seed:6});Object.assign(s,{flame:0.01,oxygen:90,memories:3,silenceRelease:1,gustShield:5});
 K.step(s,88.49,DT,{shield:false});
 assert.notEqual(s.replyLevel,'bright');
});
test("near-extinction recovery comes from the player's timely release, not RNG",()=>{
 const eligible=K.canTriggerMiracle,base={rescue:false,memories:2,flame:21,oxygen:51,shield:false,wind:.29,releaseAt:78.5};
 assert.equal(eligible(base,79),true);
 assert.equal(eligible({...base,releaseAt:60},79),false,'old release does not count');
 assert.equal(eligible({...base,shield:true},79),false,'cannot trigger while protected');
 assert.equal(eligible({...base,memories:1},79),false,'player must gather memories');
 assert.equal(eligible({...base,oxygen:12},79),false,'must leave oxygen');
 assert.equal(eligible({...base,wind:.9},79),false,'release must meet a lull');
 assert.equal(eligible({...base,flame:60},79),false,'needs a real near miss');
 assert.equal(eligible({...base,rescue:true},79),false,'once per play');
 assert.equal(eligible(base,40),false,'no arbitrary early shortcut');
 assert.equal(eligible({...base,journey:98,releaseAt:93},93.5),true,'the rest route keeps its late rescue opportunity');
 assert.equal(eligible({...base,journey:82,releaseAt:83},83.5),false,'the shortcut cannot trigger a rescue after arrival');
 const s=K.create({seed:2});Object.assign(s,{flame:20,oxygen:60,memories:2});
 K.step(s,75,DT,{shield:true,wasShield:false});K.step(s,75.1,DT,{shield:false,wasShield:true});
 assert.equal(s.releaseAt,75.1,'releasing the button records the moment');
});
test('chapters change play conditions: tunnel shelter, bridge exposure, foreshadowed rescue',()=>{
 assert.deepEqual([0,19.9,20,44.9,45,70].map(K.chapterAt),[0,0,1,1,2,3]);
 const shield=(ch,t)=>{const s=K.create({seed:9});s.events=[];s.chapter=ch;K.step(s,t,1,{shield:true});return 100-s.oxygen};
 assert.ok(shield(2,50)>shield(0,10)-0.5,'the bridge costs extra breath when protecting');
 const tunnel=play(9,tele,{until:46});assert.ok(tunnel.log.some(e=>e.type==='shelter'),'the tunnel offers a shelter');
 const near=K.create({seed:9});Object.assign(near,{flame:30,memories:2});const ev=K.step(near,72,DT,{shield:false});
 assert.ok(ev.some(e=>e.type==='foreshadow'));
});
test('small events: every kind once per run, seeded order, no kind dominating the opening',()=>{
 const firsts={};
 for(let seed=1;seed<=400;seed++){
  const list=K.eventSchedule(seed);
  assert.deepEqual(list.map(e=>e.kind).sort(),Object.keys(K.EVENT_KINDS).sort());
  for(let i=1;i<list.length;i++)assert.ok(list[i].warnAt>list[i-1].end,'events never overlap');
  assert.ok(list.every(e=>e.end<80),'events stay clear of the finale');
  firsts[list[0].kind]=(firsts[list[0].kind]||0)+1;
 }
 for(const n of Object.values(firsts))assert.ok(n>60&&n<140,'opening event is balanced: '+JSON.stringify(firsts));
});
test('events have real effects on the rules',()=>{
 const at=kind=>{const s=K.create({seed:3});const e=s.events.find(x=>x.kind===kind);s.chapter=K.chapterAt(e.at+.5);return {s,t:e.at+.5}};
 {const {s,t}=at('gust');K.step(s,t,DT,{shield:false});assert.ok(s.wind>=.6,'gusts raise the wind')}
 {const {s,t}=at('lull');const b=K.create({seed:3});b.events=[];b.chapter=s.chapter;K.step(s,t,DT,{});K.step(b,t,DT,{});assert.ok(s.wind<b.wind,'lulls calm the wind')}
 {const {s,t}=at('eddy');s.oxygen=80;const b=K.create({seed:3});b.events=[];b.chapter=s.chapter;b.oxygen=80;K.step(s,t,1,{shield:true});K.step(b,t,1,{shield:true});assert.ok(s.oxygen<b.oxygen,'eddies make holding cost more breath')}
 {const {s,t}=at('lantern');s.flame=50;const b=K.create({seed:3});b.events=[];b.chapter=s.chapter;b.flame=50;K.step(s,t,1,{});K.step(b,t,1,{});if(b.wind<=.5)assert.ok(s.flame>b.flame,'a neighbour lantern warms the flame')}
});
test('memories: seeded positions in reach, collected only while shown, and once',()=>{
 for(let seed=1;seed<50;seed++)for(const m of K.memorySlots(seed)){assert.ok(m.u>=.2&&m.u<=.8);assert.ok(m.y>150&&m.y<300)}
 const s=K.create({seed:4});K.step(s,s.slots[0].at+.2,DT,{});
 assert.ok(s.mote);assert.equal(K.collect(s,s.mote.id),true);assert.equal(s.memories,1);
 assert.equal(K.collect(s,s.slots[0].id),false,'no double collection');
});
test('memory expiry reports one missed chance but never reports a collected memory as lost',()=>{
 const missed=K.create({seed:4});missed.events=[];const slot=missed.slots[0];
 K.step(missed,slot.at+.1,DT,{});assert.equal(missed.mote.expiresAt,slot.at+8);
 assert.equal(K.step(missed,slot.at+7.9,DT,{}).some(e=>e.type==='memory-lost'),false);
 assert.deepEqual(K.step(missed,slot.at+8.01,DT,{}).filter(e=>e.type==='memory-lost').map(e=>e.id),[slot.id]);
 assert.equal(K.step(missed,slot.at+8.1,DT,{}).some(e=>e.type==='memory-lost'),false);
 const saved=K.create({seed:4});saved.events=[];K.step(saved,slot.at+.1,DT,{});assert.equal(K.collect(saved,slot.id),true);
 assert.equal(K.step(saved,slot.at+8.01,DT,{}).some(e=>e.type==='memory-lost'),false);
});

test('the route fork pauses for a real choice; shortcut trades distance for wind, shelter restores breath at a distance cost',()=>{
 const a=K.create({seed:11}),b=K.create({seed:11});
 assert.equal(K.step(a,27.9,DT,{}).some(e=>e.type==='route-choice'),false);
 assert.equal(K.step(a,28,DT,{}).some(e=>e.type==='route-choice'),true);
 assert.equal(a.routeChoice,'pending');assert.equal(K.step(a,28,DT,{}).length,0);
 assert.equal(K.chooseRoute(a,'shortcut',28),true);assert.equal(K.routeDistance(a,28),Math.ceil(100*(90-28)/90)-16);
 a.shelterReady=false;a.shelterUntil=-1;const beforeWind=K.baseWind(29,1);K.step(a,29,DT,{});assert.ok(a.wind>beforeWind,'the shortcut exposes the flame to harsher wind');
 b.flame=60;b.oxygen=60;K.step(b,28,DT,{});const oldFlame=b.flame,oldOxygen=b.oxygen,shortDistance=K.routeDistance(a,28);
 assert.equal(K.chooseRoute(b,'rest',28),true);assert.equal(b.flame,oldFlame);assert.ok(b.oxygen>oldOxygen);assert.ok(K.routeDistance(b,28)>shortDistance);
 assert.equal(K.chooseRoute(b,'shortcut',28),false,'a fork is resolved once');
});
test('rest shields from wind for four seconds even at full breath, without consuming the natural shelter',()=>{
 const s=K.create({seed:4});s.events=[];s.oxygen=100;K.step(s,28,DT,{});
 assert.equal(K.chooseRoute(s,'rest',28),true);assert.equal(s.oxygen,100);assert.equal(s.restUntil,32);
 K.step(s,29,DT,{});assert.ok(s.wind<K.baseWind(29,1)*.21,'rest must lower actual wind');assert.equal(s.shelterReady,true);
 K.step(s,31.9,DT,{});assert.ok(s.wind<K.baseWind(31.9,1)*.21,'rest lasts through the fourth second');
 s.shelterReady=false;s.shelterUntil=-1;K.step(s,32.1,DT,{});assert.equal(s.wind,K.baseWind(32.1,1),'rest shelter expires');
});
test('both routes change actual arrival time and preserve all memories and the complete finale',()=>{
 const policy=(s,t,h)=>{const phase=K.finalePhaseAt(t,s.journey);return phase==='gust-active'?true:phase==='gust-warning'||phase==='silence'||phase==='window-reply'?false:tele(s,t,h)};
 for(const route of ['shortcut','rest']){
  const expected=route==='shortcut'?82:98;
  const {s,log}=play(1,policy,{collect:true,until:105,route});
  assert.ok(['dawn','wish'].includes(s.ended),route+' must arrive alive with memories: '+s.ended);
  assert.equal(s.journey,expected);assert.equal(s.memories,3);assert.equal(s.replyLevel,'bright');
  assert.deepEqual(log.filter(e=>e.type==='finale').map(e=>e.phase),['gust-warning','gust-active','silence','window-reply']);
  const arrival=log.find(e=>e.type==='end').t;assert.ok(arrival>=expected&&arrival<expected+DT*2,route+' arrival at '+arrival);
  assert.equal(K.routeDistance(s,arrival),0);
  assert.equal(log.find(e=>e.type==='finale').t>=70,true,'finale starts after the final chapter');
 }
});
test('flame personality follows state and shows nothing when out',()=>{
 assert.equal(K.flameExpression({flame:0}),'out');
 assert.equal(K.flameExpression({flame:50,rescue:true}),'hope');
 assert.equal(K.flameExpression({flame:50,oxygen:10}),'suffocating');
 assert.equal(K.flameExpression({flame:20,oxygen:80}),'afraid');
 assert.equal(K.flameExpression({flame:50,oxygen:80,shield:true}),'comfort');
});
test('near-empty flame and breath have separate accessible danger states',()=>{
 assert.equal(K.vitalState({flame:20,oxygen:100}),'flame-critical');
 assert.equal(K.vitalState({flame:80,oxygen:22}),'breath-critical');
 assert.equal(K.vitalState({flame:34,oxygen:80}),'flame-warning');
 assert.equal(K.vitalState({flame:80,oxygen:36}),'breath-warning');
 assert.equal(K.vitalState({flame:35,oxygen:37}),'');
});
