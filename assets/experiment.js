/* Research mode is explicitly opt-in: add ?study=1 to a game's URL.
   No data is sent anywhere; users can export the JSON and clear it locally. */
(()=>{
'use strict';
const query=new URL(location.href).searchParams;
if(query.get('study')!=='1')return;
document.documentElement.dataset.study='1';
const KEY='emotion-games-study-v1';
const allowed=['緊張','驚き','達成感','安心','切なさ','楽しさ','何も感じない'];
const questions=[
 {key:'felt',label:'いま、一番近い気持ちは？',options:allowed},
 {key:'understood',label:'遊び方は、いつ分かった？',options:[['immediate','すぐ分かった'],['during','途中で分かった'],['unclear','最後まで迷った']]},
 {key:'intensity',label:'気持ちは、どのくらい動いた？',options:[[1,'1'],[2,'2'],[3,'3'],[4,'4'],[5,'5']]},
 {key:'replay_reason',label:'もう一度遊ぶなら、いちばん近い理由は？',options:[['other-ending','別の結末'],['improve','うまくなりたい'],['collection','集めたい'],['experience-again','もう一度感じたい'],['no-retry','今は遊ばない']]}
];
let records=[];
try{const raw=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(raw))records=raw.slice(-300)}catch(_){}
let current=null,attempt=0;
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(records.slice(-300)))}catch(_){}};
function exportJson(){
 const blob=new Blob([JSON.stringify({version:2,mode:'opt-in-local-only',exported_at:new Date().toISOString(),records},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='emotion-games-study.json';link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function menu(){
 const el=document.querySelector('.hero');
 if(!el)return;
 const panel=document.createElement('section');panel.className='study-dashboard';
 panel.innerHTML='<strong>検証モード / RESEARCH</strong><p>初見理解・感情・再プレイ動機を、1プレイごとに任意で記録できます。データはこの端末内だけに保存され、送信されません。</p><div class="study-actions"><span id="study-count"></span><button type="button" id="study-export">結果JSONを保存</button><button type="button" id="study-clear">記録を削除</button></div>';
 el.append(panel);panel.querySelector('#study-export').addEventListener('click',exportJson);
 panel.querySelector('#study-clear').addEventListener('click',()=>{if(!window.confirm('この端末の検証記録を削除しますか？'))return;records=[];save();panel.querySelector('#study-count').textContent='0 回のプレイ'});
 panel.querySelector('#study-count').textContent=records.length+' 回のプレイ';
 document.querySelectorAll('.card').forEach(a=>{const u=new URL(a.href);u.searchParams.set('study','1');a.href=u.toString()});
}
function optionPairs(options){return options.map(option=>Array.isArray(option)?option:[option,option])}
function survey(){
 const curtain=document.getElementById('curtain');
 if(!curtain)return;
 const panel=document.createElement('section');panel.className='study-feedback';panel.hidden=true;panel.id='study-feedback';
 panel.innerHTML='<details><summary>今回の体験を記録（任意・4問）</summary><div class="study-questions"></div></details><small id="study-saved" aria-live="polite"></small>';
 const actions=curtain.querySelector('#share');actions.parentElement.insertBefore(panel,actions);
 const wrap=panel.querySelector('.study-questions');
 for(const q of questions){
  const field=document.createElement('fieldset');field.dataset.question=q.key;field.innerHTML='<legend>'+q.label+'</legend><div class="study-options"></div>';
  for(const [value,label] of optionPairs(q.options)){const b=document.createElement('button');b.type='button';b.textContent=label;b.dataset.value=String(value);b.addEventListener('click',()=>{
    if(!current||!current.completed)return;
    current.answers[q.key]=value;
    const entry=records.find(e=>e.id===current.id);if(entry){entry[q.key]=value;entry.answered=Object.keys(current.answers).length>0;save()}
    field.querySelectorAll('button').forEach(x=>{x.classList.toggle('selected',x===b);x.setAttribute('aria-pressed',x===b?'true':'false')});
    const count=Object.keys(current.answers).length;panel.querySelector('#study-saved').textContent=count===questions.length?'4問を記録しました。ご協力ありがとうございます。':count+' / '+questions.length+' 問を記録しました。';
   });b.setAttribute('aria-pressed','false');field.querySelector('.study-options').appendChild(b)}
  wrap.appendChild(field);
 }
 return panel;
}
if(!document.body.dataset.game){menu();return}
const game=document.body.dataset.game;const panel=survey();
const links=document.querySelectorAll('.related,.logo,.controls-bottom a');
links.forEach(a=>{if(!a.href||!new URL(a.href).host.endsWith(location.host))return;const u=new URL(a.href);u.searchParams.set('study','1');a.href=u.toString()});
document.querySelector('#stage')?.addEventListener('pointerdown',()=>{if(current)current.inputs++});
document.querySelector('#action')?.addEventListener('pointerdown',()=>{if(current)current.inputs++});
document.querySelector('#action')?.addEventListener('click',()=>{if(current&&current.inputs===0)current.inputs++});
const prior=window.emotionTrack;
window.emotionTrack=(name,payload)=>{
 if(typeof prior==='function')prior(name,payload);
 if(name==='game_start'){
  attempt++;
  current={id:Date.now()+'-'+Math.round(Math.random()*1e7),slug:game,target:document.querySelector('.game-heading .label span')?.textContent?.replace('/','').trim()||null,start:performance.now(),inputs:0,completed:false,answers:{}};
  records.push({id:current.id,schema_version:2,game_id:game,target:current.target,mode:'blind',attempt_index:attempt,duration_ms:null,inputs:0,ending_id:null,score:null,completed:false,answered:false,felt:null,understood:null,intensity:null,replay_reason:null});
  records=records.slice(-300);save();
  panel.hidden=true;panel.querySelector('summary').textContent='今回の体験を記録（任意・4問）';panel.querySelector('details').open=false;panel.querySelector('#study-saved').textContent='';panel.querySelectorAll('button').forEach(x=>{x.classList.remove('selected');x.setAttribute('aria-pressed','false')});
 }
 if(name==='game_complete'&&current&&!current.completed){
  current.completed=true;
  const entry=records.find(e=>e.id===current.id);
  if(entry){
   entry.duration_ms=Math.round(performance.now()-current.start);entry.inputs=current.inputs;entry.ending_id=payload?.ending_id||null;entry.score=payload?.score??null;entry.completed=true;
   for(const key of ['outcome','memories','chapter','miracle','lowest_flame'])if(payload?.[key]!==undefined)entry[key]=payload[key];
   save();
  }
  panel.hidden=false;
 }
};
})();
