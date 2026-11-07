/* Included only by KIENAIDE_GUST_STUDY=1. Local-only anonymous crossover. */
(()=>{'use strict';
const url=new URL(location.href);
if(url.search!=='?study=1'){
 document.addEventListener('DOMContentLoaded',()=>{document.body.textContent='試遊URLは /kienaide/?study=1 を使用してください。'});
 // Fail closed before app loads, including arbitrary QA/time/seed overrides.
 window.KienaideGustStudyBlocked=true;return;
}
const KEY='kienaide-gust-study-v1';
let data;
try{data=JSON.parse(sessionStorage.getItem(KEY)||'null')}catch{}
if(data&&(!['AB','BA'].includes(data.sequence)||![1,2].includes(data.period)||!Array.isArray(data.runs)))data=null;
if(!data){const random=new Uint32Array(2);crypto.getRandomValues(random);data={schema:1,participant:crypto.randomUUID(),sequence:random[0]%2?'AB':'BA',period:1,runs:[]};}
const persist=()=>{try{sessionStorage.setItem(KEY,JSON.stringify(data));return true}catch{window.KienaideGustStudyBlocked=true;window.alert?.('記録を保存できません。試遊を中止し、保存環境を確認してください。');return false}};
if(!persist()){document.addEventListener('DOMContentLoaded',()=>{document.body.textContent='試遊記録を保存できません。この環境では試遊を開始しないでください。'});window.KienaideGustStudyBlocked=true;return;}
const variant=data.sequence[data.period-1];let run=null,last=null;
window.KienaideGustStudy={variant,frame(t,s){
 if(!run)return;
 const snapshot={t:+t.toFixed(3),shield:!!s.shield,event:s.event?.id||null,warning:!!s.event&&t>=s.event.warnAt&&t<s.event.at,flame:Math.round(s.flame),oxygen:Math.round(s.oxygen)};
 const signature=JSON.stringify([snapshot.shield,snapshot.event,snapshot.warning]);
 if(signature!==last){last=signature;run.events.push(snapshot);persist()}
}};
document.addEventListener('DOMContentLoaded',()=>{
 const prior=window.emotionTrack;
 window.emotionTrack=(name,payload)=>{
  if(name==='game_start'){
   run={period:data.period,variant,attempt:data.runs.filter(r=>r.period===data.period).length+1,started:Date.now(),first_input_ms:null,completed:false,answers:{},events:[]};data.runs.push(run);last=null;persist();
   document.querySelectorAll('#result-more [aria-pressed]').forEach(x=>x.setAttribute('aria-pressed','false'));
  }
  if(name==='game_complete'&&run){run.completed=true;run.ending=payload?.ending_id;persist()}
  prior?.(name,payload);
 };
 for(const type of ['blur','focus','pagehide'])window.addEventListener(type,()=>{if(run){run.events.push({interruption:type,at_ms:Date.now()-run.started});persist()}});
 document.addEventListener('visibilitychange',()=>{if(run){run.events.push({interruption:document.hidden?'hidden':'visible',at_ms:Date.now()-run.started});persist()}});
 const action=document.querySelector('#action');
 const input=()=>{if(run&&run.first_input_ms===null){run.first_input_ms=Date.now()-run.started;persist()}};
 action.addEventListener('pointerdown',input);action.addEventListener('keydown',e=>{if(['Space','Enter'].includes(e.code))input()});
 const panel=document.createElement('details');panel.className='study-feedback';
 panel.innerHTML='<summary>試遊記録・保存（終了後）</summary><p>回答は任意です。記録はこのタブ内だけに保存し、自動送信しません。</p>';
 const questions=[['prediction','風が来る前、何が起きると思った？',['風が強くなる','押す時間が終わる','分からない','その他']],['line','ボタン下の線は何を表すと思った？',['風が来るまで','必要な長押し時間','残り体力','気づかなかった','分からない','その他']],['failure','結末の理由は？',['風を防げなかった','守りすぎた','届いたが記憶が足りない','分からない','その他']],['fair','結果に納得できた？',['1','2','3','4','5']],['fun','面白かった？',['1','2','3','4','5']]];
 for(const [key,label,options] of questions){const field=document.createElement('fieldset'),legend=document.createElement('legend');legend.textContent=label;field.append(legend);for(const value of options){const b=document.createElement('button');b.type='button';b.textContent=value;b.style.minHeight='44px';b.onclick=()=>{if(!run?.completed)return;run.answers[key]=value;persist();field.querySelectorAll('button').forEach(x=>x.setAttribute('aria-pressed',String(x===b)))};field.append(b)}panel.append(field)}
 const exportButton=document.createElement('button');exportButton.textContent='比較記録とstudy JSONを保存';exportButton.onclick=()=>{const blob=new Blob([JSON.stringify({...data,study:JSON.parse(localStorage.getItem('emotion-games-study-v1')||'[]')},null,2)],{type:'application/json'}),href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='gust-study-'+data.participant+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000)};panel.append(exportButton);
 const next=document.createElement('button');next.textContent='観察者用：次の比較へ';next.onclick=()=>{if(data.period!==1||!confirm('自由な再挑戦の観察とJSON保存は終了しましたか？'))return;data.period=2;persist();localStorage.removeItem('emotion-kienaide-intro-v1');location.reload()};panel.append(next);
 document.querySelector('#result-more').append(panel);
});
})();
