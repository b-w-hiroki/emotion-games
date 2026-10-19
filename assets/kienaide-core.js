// 004「きえないで。」 simulation core. Pure state + rules, no DOM, so the whole night can be
// replayed deterministically in Node tests (same seed + same input → same ending).
(function(root){'use strict';
const JOURNEY=90;
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
 lull:{label:'凪',tip:'凪いだ — いま手を離して息を',warn:0,length:3.2},
 lantern:{label:'誰かの灯り',tip:'窓が風をさえぎる。今は息を戻そう。',warn:0,length:3.4}
};
const EVENT_SLOTS=[7,27,51,66];
function rng(seed){let a=seed>>>0||1;return()=>{a=a+0x6d2b79f5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function eventSchedule(seed){
 const r=rng(seed),bag=Object.keys(EVENT_KINDS);
 for(let i=bag.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[bag[i],bag[j]]=[bag[j],bag[i]]}
 return EVENT_SLOTS.map((at,i)=>{const kind=bag[i],k=EVENT_KINDS[kind],start=at+Math.round(r()*20)/10;return {id:kind+'-'+i,kind,label:k.label,tip:k.tip,warnAt:start-k.warn,at:start,end:start+k.length}});
}
function memorySlots(seed){
 const r=rng(seed^0x9e3779b9);
 return MEMORIES.map(m=>({...m,at:m.at+Math.round((r()*3-1.5)*10)/10,u:Math.min(.8,Math.max(.2,m.u+(r()-.5)*.12)),y:m.y+Math.round((r()-.5)*24)}));
}
function create(opts={}){
 const seed=(opts.seed>>>0)||1;
 return {seed,shield:false,flame:72,oxygen:100,wind:.18,memories:0,chapter:0,mote:null,memoryGot:new Set(),journey:JOURNEY,
  story:'',storyPause:0,shelterReady:true,shelterUntil:-1,miracleHint:false,rescue:false,rescueAt:-100,releaseAt:-100,
  routeChoice:'none',routeChoiceAt:null,routeStartMeters:100,shortcutUntil:-1,
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
 return !s.rescue && time>=70 && time<=(s.journey||JOURNEY)-1 &&
   (s.memories||0)>=2 && s.flame>0 && s.flame<=29 && s.oxygen>=30 &&
   !s.shield && time-s.releaseAt>=0 && time-s.releaseAt<=1.3 &&
   s.wind<.46;
}
function chapterAt(time){let c=0;for(let i=1;i<CHAPTERS.length;i++)if(time>=CHAPTERS[i].at)c=i;return c}
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
 if(s.routeChoice==='pending')return out;
 if(s.routeChoice==='none'&&time>=28&&time<29){s.routeChoice='pending';s.shield=false;emit('route-choice');return out}
 s.shield=!!input.shield;
 if(s.shield)s.shieldTime+=dt;
 const chapter=chapterAt(time);
 if(chapter!==s.chapter){s.previousChapter=s.chapter;s.chapter=chapter;s.sceneChangedAt=time;emit('chapter',{chapter});}
 let wind=baseWind(time,chapter);
 // Seeded small events.
 const ev=s.events.find(e=>time>=e.warnAt&&time<e.end)||null;
 if(ev&&!s.eventSeen.has(ev.id)){s.eventSeen.add(ev.id);emit('event',{event:ev});}
 s.event=ev;
 const live=ev&&time>=ev.at;
 if(live&&ev.kind==='gust')wind+=.55;
 if(live&&ev.kind==='eddy')wind=s.eddyReleasedEvent===ev.id?Math.min(wind,.38):Math.max(wind,.5+Math.abs(Math.sin(time*7))*.35);
 if(live&&ev.kind==='lull')wind*=.3;
 if(s.routeChoice==='shortcut'&&time<s.shortcutUntil)wind=Math.min(1.15,wind+.2);
 // Finale: deterministic storm tied to the player's shielding decision.
 const phase=finalePhaseAt(time,s.journey);s.finalePhase=phase;
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
 if(phase==='gust-active'){if(s.shield)s.gustShield+=dt;else s.gustExposed+=dt}
 if(phase==='silence'&&!s.shield)s.silenceRelease+=dt;
 s.wind=Math.min(1.15,wind);
 if(chapter===1&&s.shelterReady&&s.wind<.29&&!s.shield){s.shelterReady=false;s.shelterUntil=time+3.5;emit('shelter');}
 const sheltered=time<s.shelterUntil;if(sheltered)s.wind*=.2;
 const bridgeCold=chapter===2?.62:1;
 if(s.shield){
  const eddyCost=live&&ev.kind==='eddy'?1.6:1;
  s.oxygen=Math.max(0,s.oxygen-(4.5+s.wind*3.8+(chapter===2?1.2:0))*eddyCost*dt);
  s.flame=Math.min(100,s.flame+(.7-s.wind*.25)*dt);
 }else{
  s.oxygen=Math.min(100,s.oxygen+(sheltered||(live&&ev.kind==='lull')?23:15)*dt);
  const warm=live&&ev.kind==='lantern'?2.6:0;
  s.flame=Math.max(0,Math.min(100,s.flame+(s.wind>.5?-(7+s.wind*8)*bridgeCold:1.3-(chapter===2?.45:0)+warm)*dt));
 }
 if(!s.shield&&input.wasShield)s.releaseAt=time;
 if(!s.shield&&input.wasShield&&live&&ev.kind==='eddy')s.eddyReleasedEvent=ev.id;
 if(chapter===3&&!s.miracleHint&&s.flame<36&&s.memories>=2){s.miracleHint=true;emit('foreshadow');}
 s.lowestFlame=Math.min(s.lowestFlame,s.flame);s.peakWind=Math.max(s.peakWind,s.wind);
 if(canTriggerMiracle(s,time)){s.rescue=true;s.rescueAt=time;s.flame=Math.min(100,s.flame+24);emit('miracle');}
 const slot=s.slots.find(m=>time>=m.at&&time<m.at+8&&!s.memoryGot.has(m.id));
 s.mote=slot?{id:slot.id,u:slot.u,y:slot.y,title:slot.title,line:slot.line}:null;
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
  s.routeStartMeters=Math.max(0,remaining-16);s.shortcutUntil=time+8;s.journey=JOURNEY-8;
 }else{
  s.routeStartMeters=remaining+16;s.oxygen=Math.min(100,s.oxygen+28);s.journey=JOURNEY+8;
 }
 return true;
}
function routeDistance(s,time){
 const fraction=s.routeChoiceAt==null?time/s.journey:(time-s.routeChoiceAt)/(s.journey-s.routeChoiceAt);
 return Math.max(0,Math.ceil((s.routeChoiceAt==null?100:s.routeStartMeters)*(1-Math.max(0,Math.min(1,fraction)))));
}
function score(s){return Math.round(s.flame*.65+s.oxygen*.15+s.memories*7)}
const api={JOURNEY,CHAPTERS,MEMORIES,EVENT_KINDS,create,step,collect,chooseRoute,routeDistance,score,flameExpression,vitalState,canTriggerMiracle,chapterAt,finalePhaseAt,arrivalEnding,eventSchedule,memorySlots,baseWind};
if(typeof module!=='undefined'&&module.exports)module.exports=api;
root.KienaideCore=api;
})(typeof window!=='undefined'?window:globalThis);
