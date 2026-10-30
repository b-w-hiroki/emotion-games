// Behavioural contract for 004「きえないで。」: rules are replayed in Node, input → outcome.
import test from 'node:test';
import assert from 'node:assert/strict';
import '../assets/kienaide-core.js';
const K=globalThis.KienaideCore;
const DT=1/30;
// Replays a whole night. policy(state,time,holding) → holding; collect=true taps every memory.
function play(seed,policy,{collect=false,until=95,route}={}){
 const s=K.create({seed}),log=[];let t=0,hold=false;
 while(!s.ended&&t<until){const was=hold;hold=!!policy(s,t,hold);for(const e of K.step(s,t,DT,{shield:hold,wasShield:was,releaseIntent:was&&!hold}))log.push({...e,t});if(s.routeChoice==='pending'){if(route)K.chooseRoute(s,route,t);else s.routeChoice='legacy-test'}if(s.decisionPending)K.chooseDecision(s,s.decisionPending==='hearth'?'feed':'shelter',t);if(collect&&s.mote)K.collect(s,s.mote.id);t+=DT}
 return {s,log};
}
const tele=(s,t,h)=>(!h&&s.wind>.61)?true:(h&&(s.wind<.44||s.oxygen<28))?false:h;
function delayed(lat){let want=false,since=0;return (s,t,h)=>{const w=tele(s,t,want);if(w!==want){want=w;since=t}return t-since>=lat?want:h}}

test('the flame returns warmth only after an intentional calm release',()=>{
 const make=()=>{const s=K.create({seed:2});s.events=[];s.oxygen=60;return s};
 const calm=make();K.step(calm,2,DT,{shield:true,wasShield:false});
 const before=calm.oxygen;
 const response=K.step(calm,2.1,DT,{shield:false,wasShield:true,releaseIntent:true});
 assert.equal(response.filter(e=>e.type==='companion-warmth').length,1);
 assert.ok(calm.oxygen>before+6,'the response restores breath beyond normal recovery');
 assert.equal(calm.companionSeen,true);
 K.step(calm,2.2,DT,{shield:true,wasShield:false});
 assert.equal(K.step(calm,2.3,DT,{shield:false,wasShield:true,releaseIntent:true}).some(e=>e.type==='companion-warmth'),false,'only one response per journey');
 const canceled=make();K.step(canceled,2,DT,{shield:true,wasShield:false});
 assert.equal(K.step(canceled,2.1,DT,{shield:false,wasShield:true,releaseIntent:false}).some(e=>e.type==='companion-warmth'),false);
 const gust=make();gust.events=[{id:'test-gust',kind:'gust',label:'突風',tip:'風',warnAt:8,at:8,end:10}];K.step(gust,2,DT,{shield:true,wasShield:false});
 assert.equal(K.step(gust,9,DT,{shield:false,wasShield:true,releaseIntent:true}).some(e=>e.type==='companion-warmth'),false,'the response needs a lull');
 const finale=make();finale.events=[];finale.chapter=3;
 assert.equal(K.step(finale,88,DT,{shield:false,wasShield:true,releaseIntent:true}).some(e=>e.type==='companion-warmth'),false,'the companion does not interrupt the final silence');
});

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
test('three choices pause the night and trade flame, breath and exposure',()=>{
 const s=K.create({seed:7});K.step(s,28,DT,{});assert.equal(K.chooseRoute(s,'rest',28),true);
 assert.equal(K.step(s,42,DT,{}).some(e=>e.type==='decision-choice'&&e.kind==='hearth'),true);
 assert.deepEqual(K.step(s,42,DT,{}),[],'the clock stays frozen until a choice');
 const flame=s.flame,oxygen=s.oxygen;assert.equal(K.chooseDecision(s,'feed',42),true);assert.equal(s.flame,flame+14);assert.equal(s.oxygen,oxygen-18);
 assert.equal(K.step(s,56,DT,{}).some(e=>e.type==='decision-choice'&&e.kind==='bridge'),true);
 assert.equal(K.chooseDecision(s,'spark',56),true);assert.equal(s.flame,Math.min(100,flame+24));assert.equal(s.emberRiskUntil,62);
 const exposed=K.create({seed:7});exposed.routeChoice='rest';exposed.decisionIndex=2;K.step(exposed,57,DT,{});K.step(s,57,DT,{});assert.ok(s.wind>exposed.wind,'fire recovery exposes the hands to stronger wind');
 assert.equal(s.decisions.length,2);assert.equal(K.chooseDecision(s,'shelter',57),false);
});
test('a warm tailwind rewards release rather than shielding',()=>{
 const one=K.create({seed:3}),event=one.events.find(e=>e.kind==='lull');one.events=[event];one.routeChoice='rest';one.decisionIndex=2;const two=K.create({seed:3});two.events=[event];two.routeChoice='rest';two.decisionIndex=2;
 K.step(one,event.at+.1,1,{shield:false});K.step(two,event.at+.1,1,{shield:true});assert.ok(one.flame>two.flame+2.5);assert.ok(one.oxygen>two.oxygen);
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
test('finale counts only the time inside each phase before deciding the window reply',()=>{
 for(const journey of [82,90,98]){
  const s=K.create({seed:1});Object.assign(s,{journey,routeChoice:'legacy-test',decisionIndex:2,events:[],flame:80,oxygen:80,memories:3,previousFinalePhase:'silence',gustShield:2.5,silenceRelease:.4});
  const transition=journey-1.5;
  const events=K.step(s,transition+.02,.12,{shield:false,wasShield:false});
  assert.ok(Math.abs(s.silenceRelease-.5)<1e-9,'the last tenth of silence is counted before the reply');
  assert.equal(events.find(e=>e.type==='reply')?.level,'bright','a real .5 seconds of open hands earns the bright reply');
  const edge=K.create({seed:1});Object.assign(edge,{journey,routeChoice:'legacy-test',decisionIndex:2,events:[],flame:80,oxygen:80,previousFinalePhase:'gust-active'});
  K.step(edge,journey-2.96,.1,{shield:false,wasShield:false});
  assert.ok(Math.abs(edge.gustExposed-.06)<1e-9,'only the part before silence counts as gust exposure');
  assert.ok(Math.abs(edge.silenceRelease-.04)<1e-9,'only the part after the gust counts as silence');
  const warning=K.create({seed:1});Object.assign(warning,{journey,routeChoice:'legacy-test',decisionIndex:2,events:[],flame:80,oxygen:80,previousFinalePhase:'gust-warning'});
  K.step(warning,journey-7.96,.1,{shield:true,wasShield:true});
  assert.ok(Math.abs(warning.gustShield-.04)<1e-9,'warning time does not count as guarding the gust');
 }
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
 assert.equal(eligible({...base,journey:98,releaseAt:77},77.5),false,'rest cannot receive the final-window rescue while still on the bridge');
 assert.equal(eligible({...base,journey:98,releaseAt:78},78),true,'rest may receive the rescue after entering the final chapter');
 assert.equal(eligible({...base,journey:82,releaseAt:62},62),true,'shortcut opens the rescue at its own final-chapter boundary');
 assert.equal(eligible({...base,journey:98,releaseAt:93},93.5),true,'the rest route keeps its late rescue opportunity');
 assert.equal(eligible({...base,journey:82,releaseAt:83},83.5),false,'the shortcut cannot trigger a rescue after arrival');
 const s=K.create({seed:2});Object.assign(s,{flame:20,oxygen:60,memories:2});
 K.step(s,75,DT,{shield:true,wasShield:false});K.step(s,75.1,DT,{shield:false,wasShield:true});
 assert.equal(s.releaseAt,-100,'a forced release does not count as a deliberate rescue');
 K.step(s,75.2,DT,{shield:true,wasShield:false});K.step(s,75.3,DT,{shield:false,wasShield:true,releaseIntent:true});
 assert.equal(s.releaseAt,75.3,'deliberately releasing the button records the moment');
});
test('blur or canceled input cannot trigger the near-extinction rescue',()=>{
 for(const releaseIntent of [false,undefined]){
  const s=K.create({seed:2});s.events=[];s.routeChoice='rest';s.decisionIndex=2;
  Object.assign(s,{flame:20,oxygen:60,memories:2,chapter:3});
  s.journey=98;
  const events=K.step(s,84,DT,{shield:false,wasShield:true,releaseIntent});
  assert.equal(events.some(e=>e.type==='miracle'),false);
  assert.equal(s.rescue,false);
 }
 const s=K.create({seed:2});s.events=[];s.routeChoice='rest';s.decisionIndex=2;
 Object.assign(s,{flame:20,oxygen:60,memories:2,chapter:3});
 s.journey=98;
 const events=K.step(s,84,DT,{shield:false,wasShield:true,releaseIntent:true});
 assert.equal(events.some(e=>e.type==='miracle'),true);
});
test('holding again invalidates a previous calm release before an input cancellation',()=>{
 const s=K.create({seed:2});Object.assign(s,{routeChoice:'legacy-test',decisionIndex:2,events:[],memories:2,flame:21,oxygen:28});
 K.step(s,75,DT,{shield:false,wasShield:true,releaseIntent:true});
 assert.equal(s.releaseAt,75,'the calm release is recorded while breath is still too low for rescue');
 assert.equal(s.rescue,false);
 K.step(s,75.1,DT,{shield:true,wasShield:false});
 assert.equal(s.releaseAt,-100,'a new hold ends the earlier release opportunity');
 const events=K.step(s,75.2,.2,{shield:false,wasShield:true,releaseIntent:false});
 assert.ok(s.oxygen>=30,'breath has recovered enough to otherwise qualify');
 assert.equal(events.some(e=>e.type==='miracle'),false,'cancellation cannot reuse an earlier release');
 assert.equal(s.rescue,false);
});
test('releasing in a gust cannot claim a rescue when the wind calms a second later',()=>{
 const make=()=>{const s=K.create({seed:2});s.events=[];Object.assign(s,{routeChoice:'rest',decisionIndex:2,journey:98,chapter:3,flame:20,oxygen:60,memories:2});return s};
 const gust=make();
 assert.equal(K.step(gust,80.8,DT,{shield:false,wasShield:true,releaseIntent:true}).some(e=>e.type==='miracle'),false);
 assert.ok(gust.wind>.46,'the hand opened into strong wind');
 assert.equal(gust.releaseAt,-100,'the strong-wind release is not stored for a later lull');
 assert.equal(K.step(gust,81.8,DT,{shield:false,wasShield:false}).some(e=>e.type==='miracle'),false);
 assert.ok(gust.wind<.46,'the wind really did calm within the old rescue window');
 const calm=make();
 assert.equal(K.step(calm,81.8,DT,{shield:false,wasShield:true,releaseIntent:true}).some(e=>e.type==='miracle'),true);
 assert.equal(calm.releaseAt,81.8,'a deliberate release in that lull still earns the rescue');
});
test('chapters change play conditions: tunnel shelter, bridge exposure, foreshadowed rescue',()=>{
 assert.deepEqual([0,19.9,20,44.9,45,70].map(t=>K.chapterAt(t)),[0,0,1,1,2,3]);
 const shield=(ch,t)=>{const s=K.create({seed:9});s.events=[];s.chapter=ch;K.step(s,t,1,{shield:true});return 100-s.oxygen};
 assert.ok(shield(2,50)>shield(0,10)-0.5,'the bridge costs extra breath when protecting');
 const tunnel=play(9,tele,{until:46});assert.ok(tunnel.log.some(e=>e.type==='shelter'),'the tunnel offers a shelter');
 const near=K.create({seed:9});Object.assign(near,{flame:30,memories:2});const ev=K.step(near,72,DT,{shield:false});
 assert.ok(ev.some(e=>e.type==='foreshadow'));
});
test('bridge frost makes prolonged exposure costly and shielding clears it at a breath cost',()=>{
 const exposed=K.create({seed:9}),protectedRun=K.create({seed:9});
 for(const s of [exposed,protectedRun]){s.events=[];s.chapter=2;s.flame=90;s.oxygen=90}
 for(let t=62;t<65;t+=DT)K.step(exposed,t,DT,{shield:false});
 assert.ok(exposed.bridgeFrost>.3,'wind should visibly build frost on the bridge');
 const fresh=K.create({seed:9});fresh.events=[];fresh.chapter=2;fresh.flame=exposed.flame;fresh.oxygen=exposed.oxygen;
 K.step(exposed,65,DT,{shield:false});K.step(fresh,65,DT,{shield:false});
 assert.ok(exposed.flame<fresh.flame,'accumulated frost makes the next exposed gust more dangerous');
 protectedRun.bridgeFrost=exposed.bridgeFrost;
 const frostBefore=protectedRun.bridgeFrost,breathBefore=protectedRun.oxygen;
 for(let t=65;t<66;t+=DT)K.step(protectedRun,t,DT,{shield:true});
 assert.ok(protectedRun.bridgeFrost<frostBefore,'shielding melts the buildup');
 assert.ok(protectedRun.oxygen<breathBefore,'the safer choice spends breath');
 K.step(protectedRun,70,DT,{shield:false});assert.equal(protectedRun.bridgeFrost,0,'bridge frost cannot follow the player into the finale');
});
test('small events: every kind once, the neighbour window after the fork, no kind dominating the opening',()=>{
 const firsts={};
 for(let seed=1;seed<=400;seed++){
  const list=K.eventSchedule(seed);
  assert.deepEqual(list.map(e=>e.kind).sort(),Object.keys(K.EVENT_KINDS).sort());
  const window=list.find(e=>e.kind==='lantern');assert.ok(window.warnAt>=38&&window.end<45,'the window stays beyond the fork but inside the inhabited tunnel');
  for(let i=1;i<list.length;i++)assert.ok(list[i].warnAt>list[i-1].end,'events never overlap');
  assert.ok(list.every(e=>e.end<80),'events stay clear of the finale');
  firsts[list[0].kind]=(firsts[list[0].kind]||0)+1;
 }
 assert.equal(firsts.lantern,undefined,'the neighbour window cannot shelter both routes before they split');
 for(const n of Object.values(firsts))assert.ok(n>100&&n<165,'opening event is balanced: '+JSON.stringify(firsts));
});
test('events have real effects on the rules',()=>{
 const at=kind=>{const s=K.create({seed:3});const e=s.events.find(x=>x.kind===kind);s.chapter=K.chapterAt(e.at+.5);s.routeChoice='legacy-test';return {s,t:e.at+.5}};
 {const {s,t}=at('gust');K.step(s,t,DT,{shield:false});assert.ok(s.wind>=.6,'gusts raise the wind')}
 {const {s,t}=at('lull');const b=K.create({seed:3});b.events=[];b.chapter=s.chapter;K.step(s,t,DT,{});K.step(b,t,DT,{});assert.ok(s.wind<b.wind,'lulls calm the wind')}
 {const {s,t}=at('eddy');s.oxygen=80;const b=K.create({seed:3});b.events=[];b.chapter=s.chapter;b.oxygen=80;K.step(s,t,1,{shield:true});K.step(b,t,1,{shield:true});assert.ok(s.oxygen<b.oxygen,'eddies make holding cost more breath')}
 {const {s,t}=at('lantern');s.flame=50;s.oxygen=50;const b=K.create({seed:3});b.events=[];b.chapter=s.chapter;b.flame=50;b.oxygen=50;K.step(s,t,1,{});K.step(b,t,1,{});assert.ok(s.wind<b.wind*.21,'a neighbour lantern actually blocks the wind');assert.ok(s.flame>b.flame,'the shelter keeps the flame warmer');assert.ok(s.oxygen>=b.oxygen,'releasing remains safe for breath recovery')}
});
test('eddy eases only after an intentional release, not an interrupted hold',()=>{
 const make=()=>{const s=K.create({seed:1});s.routeChoice='legacy-test';s.decisionIndex=2;return s};
 const t=67.1,dt=1/60,canceled=make(),released=make();
 for(const s of [canceled,released])K.step(s,t,dt,{shield:true,wasShield:false});
 K.step(canceled,t+.1,dt,{shield:false,wasShield:true,releaseIntent:false});
 K.step(released,t+.1,dt,{shield:false,wasShield:true,releaseIntent:true});
 K.step(canceled,t+.2,dt,{shield:false,wasShield:false});
 K.step(released,t+.2,dt,{shield:false,wasShield:false});
 assert.equal(canceled.eddyReleasedEvent,'','input cancellation must not claim the opening');
 assert.ok(canceled.wind>.5,'the interrupted hold leaves the eddy active');
 assert.equal(released.eddyReleasedEvent,'eddy-3');
 assert.ok(released.wind<=.38,'a deliberate release creates the opening');
});
test('lantern shelter ends on time and does not consume the tunnel shelter',()=>{
 const s=K.create({seed:3}),e=s.events.find(x=>x.kind==='lantern');s.events=[{...e,at:30,end:33,warnAt:30}];s.chapter=1;
 const active=K.step(s,30.5,DT,{});assert.equal(active.some(x=>x.type==='shelter'),false);
 assert.equal(s.shelterReady,true,'the separate tunnel shelter remains available');
 assert.ok(s.wind<K.baseWind(30.5,1)*.21,'lantern shelter applies only while active');
 s.shelterReady=false;K.step(s,33.1,DT,{});
 assert.equal(s.wind,K.baseWind(33.1,1),'wind returns to the normal chapter pattern');
});
test('the tunnel shelter is earned by releasing into a lull, not by idling in one',()=>{
 const s=K.create({seed:9});s.events=[];s.chapter=1;
 assert.ok(K.baseWind(22.5,1)<.44);
 assert.equal(K.step(s,22.5,DT,{shield:false,wasShield:false}).some(e=>e.type==='shelter'),false);
 assert.equal(s.shelterReady,true,'idle breathing does not spend the one shelter');
 K.step(s,22.55,DT,{shield:true,wasShield:false});
 assert.equal(K.step(s,22.6,DT,{shield:false,wasShield:true,releaseIntent:true}).filter(e=>e.type==='shelter').length,1);
 assert.equal(s.shelterReady,false);assert.ok(s.wind<K.baseWind(22.6,1)*.21);
 assert.equal(K.step(s,22.7,DT,{shield:false,wasShield:false}).some(e=>e.type==='shelter'),false);
 const canceled=K.create({seed:9});canceled.events=[];canceled.chapter=1;
 assert.equal(K.step(canceled,22.6,DT,{shield:false,wasShield:true,releaseIntent:false}).some(e=>e.type==='shelter'),false,'a forced hold cancellation cannot claim the shelter');
 const exposed=K.create({seed:9});exposed.events=[];exposed.chapter=1;
 assert.ok(K.baseWind(20,1)>.44);
 assert.equal(K.step(exposed,20,DT,{shield:false,wasShield:true}).some(e=>e.type==='shelter'),false,'a release into stronger wind does not discover safety');
});
test('the tunnel shelter cannot protect the exposed bridge',()=>{
 const s=K.create({seed:9});s.events=[];s.chapter=1;
 // A lull at the tunnel exit lets the player discover shelter just before the bridge.
 s.events=[{id:'exit-lull',kind:'lull',at:44.8,end:45,warnAt:44.8}];
 const found=K.step(s,44.9,DT,{shield:false,wasShield:true,releaseIntent:true});
 assert.equal(found.filter(e=>e.type==='shelter').length,1);
 assert.equal(s.shelterUntil,45,'the shelter ends at the chapter boundary');
 K.step(s,45.1,DT,{shield:false,wasShield:false});
 assert.equal(s.chapter,2);assert.equal(s.wind,K.baseWind(45.1,2),'the bridge starts fully exposed');
});
test('the shortcut passes the lantern without sheltering from its promised strong wind',()=>{
 const s=K.create({seed:3}),e=s.events.find(x=>x.kind==='lantern');s.events=[{...e,at:29,end:32,warnAt:29}];s.chapter=1;s.routeChoice='shortcut';s.shortcutUntil=36;s.shelterReady=false;
 K.step(s,29.5,DT,{});
 assert.ok(s.wind>K.baseWind(29.5,1),'the faster exposed route retains its wind cost');
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

test('the route fork preserves visible distance; shortcut speeds progress, rest slows it while restoring breath',()=>{
 const a=K.create({seed:11}),b=K.create({seed:11});
 assert.equal(K.step(a,27.9,DT,{}).some(e=>e.type==='route-choice'),false);
 assert.equal(K.step(a,28,DT,{}).some(e=>e.type==='route-choice'),true);
 const skipped=K.create({seed:11});assert.equal(K.step(skipped,29.2,DT,{}).some(e=>e.type==='route-choice'),true,'a delayed frame cannot skip the fork');
 assert.equal(a.routeChoice,'pending');assert.equal(K.step(a,28,DT,{}).length,0);
 const before=K.routeDistance(a,28);assert.equal(K.chooseRoute(a,'shortcut',28),true);assert.equal(K.routeDistance(a,28),before);
 a.events=[];a.shelterReady=false;a.shelterUntil=-1;const beforeWind=K.baseWind(29,1);K.step(a,29,DT,{});assert.ok(a.wind>beforeWind,'the shortcut exposes the flame to harsher wind');
 b.flame=60;b.oxygen=60;K.step(b,28,DT,{});const oldFlame=b.flame,oldOxygen=b.oxygen;
 assert.equal(K.chooseRoute(b,'rest',28),true);assert.equal(b.flame,oldFlame);assert.ok(b.oxygen>oldOxygen);assert.equal(K.routeDistance(b,28),before);
 for(const time of [29,36,50,70]){const near=K.routeDistance(a,time),far=K.routeDistance(b,time);assert.ok(near<=far,'shortcut must not lag behind at '+time);if(time>29)assert.ok(near<far,'shortcut must make faster progress at '+time);assert.ok(near<=before&&far<=before,'distance must never jump backward')}
 assert.equal(K.chooseRoute(b,'shortcut',28),false,'a fork is resolved once');
});
test('rest shields from wind for four seconds even at full breath, without consuming the natural shelter',()=>{
 const s=K.create({seed:4});s.events=[];s.oxygen=100;K.step(s,28,DT,{});
 assert.equal(K.chooseRoute(s,'rest',28),true);assert.equal(s.oxygen,100);assert.equal(s.restUntil,32);
 K.step(s,29,DT,{});assert.ok(s.wind<K.baseWind(29,1)*.21,'rest must lower actual wind');assert.equal(s.shelterReady,true);
 K.step(s,31.9,DT,{});assert.ok(s.wind<K.baseWind(31.9,1)*.21,'rest lasts through the fourth second');
 s.shelterReady=false;s.shelterUntil=-1;K.step(s,32.1,DT,{});assert.equal(s.wind,K.baseWind(32.1,1),'rest shelter expires');
});
test('both routes give the final chapter twenty seconds before arrival',()=>{
 assert.equal(K.chapterAt(69.9),2);assert.equal(K.chapterAt(70),3,'the unbranched night keeps its chapter boundary');
 for(const [route,arrival] of [['shortcut',82],['rest',98]]){
  const s=K.create({seed:4});s.events=[];K.step(s,28,DT,{});K.chooseRoute(s,route,28);
  s.decisionIndex=2;
  const boundary=arrival-20;
  assert.equal(K.chapterAt(boundary-.1,s.journey),2);assert.equal(K.chapterAt(boundary,s.journey),3);
  s.chapter=2;s.bridgeFrost=.8;
  assert.equal(K.step(s,boundary-.1,DT,{}).some(e=>e.type==='chapter'&&e.chapter===3),false);
  assert.equal(K.step(s,boundary,DT,{}).some(e=>e.type==='chapter'&&e.chapter===3),true,route+' enters the finale chapter at '+boundary);
  assert.equal(s.bridgeFrost,0,'bridge frost clears when the painted bridge is behind the player');
  assert.equal(K.finalePhaseAt(boundary,s.journey),'approach','the final chapter has ten seconds before the gust warning');
 }
});
test('both routes change actual arrival time and preserve all memories and the complete finale',()=>{
 const policy=(s,t,h)=>{const phase=K.finalePhaseAt(t,s.journey);return phase==='gust-active'?true:phase==='gust-warning'||phase==='silence'||phase==='window-reply'?false:tele(s,t,h)};
 for(const route of ['shortcut','rest']){
  const expected=route==='shortcut'?82:98;
  const {s,log}=play(1,policy,{collect:true,until:105,route});
  assert.ok(['dawn','wish'].includes(s.ended),route+' must arrive alive with memories: '+s.ended);
  assert.equal(s.journey,expected);assert.equal(s.memories,3);assert.equal(s.replyLevel,'bright');
  assert.deepEqual(log.filter(e=>e.type==='finale').map(e=>e.phase),['gust-warning','gust-active','silence','window-reply']);
  assert.ok(Math.abs(log.find(e=>e.type==='chapter'&&e.chapter===3).t-(expected-20))<DT*2,route+' must show the final painting for twenty seconds');
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
