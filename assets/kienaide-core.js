// 004「きえないで。」 simulation core. Pure state + rules, no DOM, so the whole night can be
// replayed deterministically in Node tests (same seed + same input → same ending).
(function(root){'use strict';
const JOURNEY=90;
const WIND_DAMAGE_THRESHOLD=.5;
const CHAPTERS=[
 {at:0,label:'第一章　雪の路地',line:'窓の灯りが、帰り道の目印だった。'},
 {at:20,label:'第二章　風のトンネル',line:'「灯りがあれば、きっと帰れる」'},
 {at:45,label:'第三章　凍った橋',line:'向こう岸の窓に、小さな影が見えた。'},
 {at:70,label:'最終章　夜明け前',line:'あと少し。名前を呼ぶ声がした。'}
];
const MEMORIES=[
 {id:'scarf',at:12,u:.24,y:205,title:'記憶　赤いマフラー',line:'「寒い日は、半分こ」'},
 {id:'table',at:37,u:.76,y:232,title:'記憶　ふたりの食卓',line:'「灯りがあれば、同じ場所」'},
 {id:'promise',at:62,u:.26,y:262,title:'記憶　帰る約束',line:'「遅くなっても、帰っておいで」'}
];
// Small wind events. Each run draws every kind once in a seeded order (a shuffle bag), so no
// kind can dominate a run and the order changes between retries.
const EVENT_KINDS={
 gust:{label:'突風',tip:'風が来る — 長押しでかばって',warn:1.2,length:1.8},
 eddy:{label:'渦風',tip:'渦巻く風 — 短くかばって、息苦しくなる前に離す',warn:.8,length:3},
 lull:{label:'ぬくい追い風',tip:'追い風だ — 手を離すと火が育つ',warn:0,length:3.2},
 lantern:{label:'誰かの灯り',tip:'窓が風をさえぎる。今は息を戻そう。',warn:0,length:3.4}
};
const EVENT_SLOTS=[7,27,38,66];
function rng(seed){let a=seed>>>0||1;return()=>{a=a+0x6d2b79f5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function eventSchedule(seed){
 const r=rng(seed),bag=Object.keys(EVENT_KINDS).filter(kind=>kind!=='lantern');
 for(let i=bag.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}
 bag.splice(2,0,'lantern');
 return EVENT_SLOTS.map((at,i)=>{const kind=bag[i],k=EVENT_KINDS[kind],start=at+Math.round(r()*20)/10;return {id:kind+'-'+i,kind,label:k.label,tip:k.tip,warnAt:start-k.warn,at:start,end:start+k.length}});
}
function memorySlots(seed){
 const r=rng(seed^0x9e3779b9);
 return MEMORIES.map(m=>({...m,at:m.at+Math.round((r()*3-1.5)*10)/10,u:Math.min(.8,Math.max(.2,m.u+(r()-.5)*.12)),y:m.y+Math.round((r()-.5)*24)}));
}
function create(opts={}){
 const seed=(opts.seed>>>0)||1;
 return {seed,shield:false,flame:72,oxygen:100,wind:.18,memories:0,chapter:0,mote:null,memoryGot:new Set(),journey:JOURNEY,
  story:'',storyPause:0,shelterReady:true,shelterUntil:-1,bridgeFrost:0,miracleHint:false,rescue:false,rescueAt:-100,releaseAt:-100,companionSeen:false,companionUntil:-1,companionGain:0,
  routeChoice:'none',routeChoiceAt:null,routeStartMeters:100,shortcutUntil:-1,restUntil:-1,decisionIndex:0,decisionPending:'',decisions:[],emberRiskUntil:-1,
  lowestFlame:72,peakWind:0,events:eventSchedule(seed),slots:memorySlots(seed),event:null,eventSeen:new Set(),eddyReleasedEvent:'',
  finalePhase:'approach',previousFinalePhase:'approach',gustShield:0,gustExposed:0,silenceRelease:0,reply:0,replyLevel:'',
  previousChapter:0,sceneChangedAt:-999,shieldTime:0,ended:''};
}
function flameExpression(s){
 if(s.flame<=0)return 'out';
 if(s.rescue||s.reply>0)return 'hope';
 if((s.oxygen??100)<24)return 'suffocating';
 if((s.flame??72)<31)return 'afraid';
 if(s.shield)return 'comfort';
 if((s.wind??0)>.58)return 'afraid';
 return 'calm';
}
function vitalState(s){
 if((s.flame??100)<=20)return 'flame-critical';
 if((s.oxygen??100)<=22)return 'breath-critical';
 if((s.flame??100)<=34)return 'flame-warning';
 if((s.oxygen??100)<=36)return 'breath-warning';
 return '';
}
function canTriggerMiracle(s,time){
 return !s.rescue && time>=(s.journey||JOURNEY)-20 && time<=(s.journey||JOURNEY)-1 &&
   (s.memories||0)>=2 && s.flame>0 && s.flame<=29 && s.oxygen>=30 &&
   !s.shield && time-s.releaseAt>=0 && time-s.releaseAt<=1.3 &&
   s.wind<.46;
}
function chapterAt(time,journey=JOURNEY){let c=0;for(let i=1;i<CHAPTERS.length;i++)if(time>=(i===3?journey-20:CHAPTERS[i].at))c=i;return c}
function finalePhaseAt(time,journey=JOURNEY){const f=time-(journey-10);return f<0?'approach':f<2?'gust-warning':f<7?'gust-active':f<8.5?'silence':'window-reply'}
// The ending is resolved by one function so new presentation can never drift from the gallery IDs.
function arrivalEnding(s){return s.memories===3?(s.flame>=68&&s.replyLevel==='bright'?'dawn':'wish'):'survive'}
function baseWind(time,chapter){
 const gustWave=Math.pow((Math.sin(time*(.42+chapter*.055)-.9)+1)/2,2.3);
 const crossWind=Math.pow((Math.sin(time*.19+1.8)+1)/2,4);
 // Chapters change play conditions, not only scenery: tunnel gusts, bridge exposure, the last lull.
 const tunnelGust=chapter===1?Math.pow((Math.sin(time*.83)+1)/2,6)*.24:0;
 return .12+gustWave*(.43+chapter*.105)+crossWind*.14+tunnelGust;
}
// Advance the night by dt seconds of game time. Returns a list of things the presentation should react to.
function step(s,time,dt,input){
 const out=[];const emit=(type,data={})=>out.push({type,...data});
 if(s.ended)return out;
 if(s.routeChoice==='pending'||s.decisionPending)return out;
 if(s.routeChoice==='none'&&time>=28&&time<30){s.routeChoice='pending';s.shield=false;emit('route-choice');return out}
 const decisionTimes=[42,56];
 if(s.routeChoice!=='none'&&s.decisionIndex<decisionTimes.length&&time>=decisionTimes[s.decisionIndex]){s.decisionPending=s.decisionIndex===0?'hearth':'bridge';s.shield=false;emit('decision-choice',{kind:s.decisionPending});return out}
 s.shield=!!input.shield;
 if(s.shield){s.shieldTime+=dt;s.releaseAt=-100;}
 const chapter=chapterAt(time,s.journey);
 if(chapter!==s.chapter){s.previousChapter=s.chapter;s.chapter=chapter;s.sceneChangedAt=time;emit('chapter',{chapter});}
 let wind=baseWind(time,chapter);
 // Seeded small events.
 const ev=s.events.find(e=>time>=e.warnAt&&time<e.end)||null;
 if(ev&&!s.eventSeen.has(ev.id)){s.eventSeen.add(ev.id);emit('event',{event:ev});}
 s.event=ev;
 const live=ev&&time>=ev.at;
 // Apply a deliberate release before calculating this frame's wind and damage.
 if(!s.shield&&input.wasShield&&input.releaseIntent&&live&&ev.kind==='eddy')s.eddyReleasedEvent=ev.id;
 if(live&&ev.kind==='gust')wind+=.55;
 if(live&&ev.kind==='eddy')wind=s.eddyReleasedEvent===ev.id?Math.min(wind,.38):Math.max(wind,.5+Math.abs(Math.sin(time*7))*.35);
 if(live&&ev.kind==='lull')wind*=.3;
 if(live&&ev.kind==='lantern'&&s.routeChoice!=='shortcut')wind*=.2;
 if(s.routeChoice==='shortcut'&&time<s.shortcutUntil)wind=Math.min(1.15,wind+.2);
 if(time<s.emberRiskUntil)wind=Math.min(1.15,wind+.24);
 // Finale: deterministic storm tied to the player's shielding decision.
 const phase=finalePhaseAt(time,s.journey);s.finalePhase=phase;
 // A frame can straddle a phase boundary. Count only its overlap with each
 // interval, including the final slice of silence before judging the reply.
 const finaleStart=s.journey-10,frameStart=time-Math.max(0,dt);
 const overlap=(from,to)=>Math.max(0,Math.min(time,to)-Math.max(frameStart,from));
 const gustTime=overlap(finaleStart+2,finaleStart+7),silenceTime=overlap(finaleStart+7,finaleStart+8.5);
 // A frame can begin during the warning and finish in the storm. Resolve
 // the pre-storm slice using its actual wind before applying the gust.
 const warningTime=phase==='gust-active'?Math.max(0,Math.min(dt,finaleStart+2-frameStart)):0;
 if(warningTime>0){
  const sheltered=time<s.restUntil||time<s.shelterUntil;
  const warningWind=Math.min(1.15,wind)*(sheltered?.2:1);s.wind=warningWind;s.peakWind=Math.max(s.peakWind,warningWind);
  if(s.shield){const cost=live&&ev.kind==='eddy'?1.6:1;s.oxygen=Math.max(0,s.oxygen-(4.5+warningWind*3.8)*cost*warningTime);s.flame=Math.min(100,s.flame+(.7-warningWind*.25)*warningTime)}
  else{const warm=(live&&ev.kind==='lantern'&&s.routeChoice!=='shortcut'?2.6:0)+(live&&ev.kind==='lull'?3.5:0);s.oxygen=Math.min(100,s.oxygen+(sheltered||(live&&ev.kind==='lull')?23:15)*warningTime);s.flame=Math.max(0,Math.min(100,s.flame+(warningWind>WIND_DAMAGE_THRESHOLD?-(7+warningWind*8):1.3+warm)*warningTime))}
  s.lowestFlame=Math.min(s.lowestFlame,s.flame);
  if(s.oxygen<=0||s.flame<=0){s.finalePhase='gust-warning';s.ended=s.oxygen<=0?'smother':'blown';emit('end',{ending:s.ended});return out}
  dt=Math.max(0,dt-warningTime);
 }
 if(s.shield)s.gustShield+=gustTime;else s.gustExposed+=gustTime;
 // Resolve the last slice of the storm before applying the silence to the
 // rest of a boundary-crossing frame. A flame or traveller lost in that slice
 // cannot be restored by the following calm.
 if(phase==='silence'&&gustTime>0){
  const storm=1.15;s.wind=storm;s.peakWind=Math.max(s.peakWind,storm);
  if(s.shield){s.oxygen=Math.max(0,s.oxygen-(4.5+storm*3.8)*gustTime);s.flame=Math.min(100,s.flame+(.7-storm*.25)*gustTime)}
  else{s.oxygen=Math.min(100,s.oxygen+15*gustTime);s.flame=Math.max(0,s.flame-(7+storm*8)*gustTime)}
  s.lowestFlame=Math.min(s.lowestFlame,s.flame);
  if(s.oxygen<=0||s.flame<=0){s.finalePhase='gust-active';s.ended=s.oxygen<=0?'smother':'blown';emit('end',{ending:s.ended});return out}
  dt=Math.max(0,dt-gustTime);
 }
 if(!s.shield)s.silenceRelease+=silenceTime;
 if(phase==='gust-active')wind=1.15;else if(phase==='silence'||phase==='window-reply')wind=.08;
 if(phase!==s.previousFinalePhase){s.previousFinalePhase=phase;emit('finale',{phase});
  if(phase==='window-reply'){
   // The window answers what the player did: protected through the gust, and opened the hands in the silence.
   const opened=s.silenceRelease>=.45,guarded=s.gustShield>=2.5;
   s.replyLevel=s.flame<=0?'dark':opened&&guarded?'bright':opened||guarded?'faint':'dark';
   s.reply=s.replyLevel==='bright'?1:s.replyLevel==='faint'?.45:0;
   if(s.reply>0)s.flame=Math.min(100,s.flame+(s.replyLevel==='bright'?22:8));
   emit('reply',{level:s.replyLevel});
  }
 }
 s.wind=Math.min(1.15,wind);
 const resting=time<s.restUntil;
 if(chapter===1&&!resting&&s.shelterReady&&s.wind<.44&&!s.shield&&input.wasShield&&input.releaseIntent&&!(live&&ev.kind==='lantern')){s.shelterReady=false;s.shelterUntil=Math.min(time+3.5,CHAPTERS[2].at);emit('shelter');}
 const sheltered=resting||time<s.shelterUntil;if(sheltered)s.wind*=.2;
 // Exposed hands let bridge frost creep inward; protecting the flame clears it but costs breath.
 s.bridgeFrost=chapter===2?Math.max(0,Math.min(1,s.bridgeFrost+(s.shield?-.3:s.wind>.42?(s.wind-.42)*.35:-.06)*dt)):0;
 const bridgeCold=chapter===2?.85+s.bridgeFrost*.55:1;
 if(s.shield){
  const eddyCost=live&&ev.kind==='eddy'?1.6:1;
  s.oxygen=Math.max(0,s.oxygen-(4.5+s.wind*3.8+(chapter===2?1.2:0))*eddyCost*dt);
  s.flame=Math.min(100,s.flame+(.7-s.wind*.25)*dt);
 }else{
  s.oxygen=Math.min(100,s.oxygen+(sheltered||(live&&ev.kind==='lull')?23:15)*dt);
  const warm=(live&&ev.kind==='lantern'&&s.routeChoice!=='shortcut'?2.6:0)+(live&&ev.kind==='lull'?3.5:0);
  s.flame=Math.max(0,Math.min(100,s.flame+(s.wind>WIND_DAMAGE_THRESHOLD?-(7+s.wind*8)*bridgeCold:1.3-(chapter===2?.45+s.bridgeFrost*1.4:0)+warm)*dt));
 }
 // The rescue remembers a release only if the air was calm at that exact moment.
 if(!s.shield&&input.wasShield&&input.releaseIntent&&s.wind<.46)s.releaseAt=time;
 // A deliberate release in calm air lets the flame look after the traveller once.
 // Blur, cancellation and releases in a gust cannot claim this moment.
 if(!s.companionSeen&&time<s.journey-20&&!s.shield&&input.wasShield&&input.releaseIntent&&s.wind<.44&&s.flame>=25&&s.oxygen<=94){
  const before=s.oxygen;s.oxygen=Math.min(100,s.oxygen+6);s.companionGain=+(s.oxygen-before).toFixed(1);
  s.companionSeen=true;s.companionUntil=time+2.4;emit('companion-warmth',{oxygenGain:s.companionGain});
 }
 if(chapter===3&&!s.miracleHint&&s.flame<36&&s.memories>=2){s.miracleHint=true;emit('foreshadow');}
 s.lowestFlame=Math.min(s.lowestFlame,s.flame);s.peakWind=Math.max(s.peakWind,s.wind);
 if(canTriggerMiracle(s,time)){s.rescue=true;s.rescueAt=time;s.flame=Math.min(100,s.flame+24);emit('miracle');}
 const previousMote=s.mote,slot=s.slots.find(m=>time>=m.at&&time<m.at+8&&!s.memoryGot.has(m.id));
 s.mote=slot?{id:slot.id,u:slot.u,y:slot.y,title:slot.title,line:slot.line,expiresAt:slot.at+8}:null;
 if(previousMote&&previousMote.id!==s.mote?.id&&!s.memoryGot.has(previousMote.id))emit('memory-lost',{id:previousMote.id});
 if(s.oxygen<=0){s.ended='smother';emit('end',{ending:'smother'});return out}
 if(s.flame<=0){s.ended='blown';emit('end',{ending:'blown'});return out}
 if(time>=s.journey){s.ended=arrivalEnding(s);emit('end',{ending:s.ended});}
 return out;
}
function collect(s,id){
 if(!s.mote||s.mote.id!==id||s.memoryGot.has(id))return false;
 s.memoryGot.add(id);s.memories++;s.mote=null;return true;
}
function chooseRoute(s,choice,time){
 if(s.routeChoice!=='pending'||!['shortcut','rest'].includes(choice))return false;
 const remaining=Math.max(0,100*(s.journey-time)/s.journey);
 s.routeChoice=choice;s.routeChoiceAt=time;
 if(choice==='shortcut'){
  s.routeStartMeters=remaining;s.shortcutUntil=time+8;s.journey=JOURNEY-8;
 }else{
  s.routeStartMeters=remaining;s.oxygen=Math.min(100,s.oxygen+28);s.restUntil=time+4;s.journey=JOURNEY+8;
 }
 return true;
}
function chooseDecision(s,choice,time){
 const kind=s.decisionPending;
 if(kind==='hearth'&&!['feed','breathe'].includes(choice))return false;
 if(kind==='bridge'&&!['spark','shelter'].includes(choice))return false;
 if(!kind)return false;
 if(choice==='feed'){s.flame=Math.min(100,s.flame+14);s.oxygen=Math.max(1,s.oxygen-18)}
 if(choice==='breathe'){s.oxygen=Math.min(100,s.oxygen+28);s.restUntil=time+3}
 if(choice==='spark'){s.flame=Math.min(100,s.flame+10);s.emberRiskUntil=time+6}
 if(choice==='shelter'){s.oxygen=Math.min(100,s.oxygen+15);s.shelterUntil=time+3}
 s.decisions.push({kind,choice,time});s.decisionIndex++;s.decisionPending='';return true;
}
function routeDistance(s,time){
 const fraction=s.routeChoiceAt==null?time/s.journey:(time-s.routeChoiceAt)/(s.journey-s.routeChoiceAt);
 return Math.max(0,Math.ceil((s.routeChoiceAt==null?100:s.routeStartMeters)*(1-Math.max(0,Math.min(1,fraction)))));
}
function score(s){return Math.round(s.flame*.65+s.oxygen*.15+s.memories*7)}
const api={JOURNEY,WIND_DAMAGE_THRESHOLD,CHAPTERS,MEMORIES,EVENT_KINDS,create,step,collect,chooseRoute,chooseDecision,routeDistance,score,flameExpression,vitalState,canTriggerMiracle,chapterAt,finalePhaseAt,arrivalEnding,eventSchedule,memorySlots,baseWind};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.KienaideCore=api;
})(typeof window!=='undefined'?window:globalThis);
