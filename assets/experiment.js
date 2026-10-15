/* Research mode is explicitly opt-in: add ?study=1 to a game's URL.
   No data is sent anywhere; users can export the JSON and clear it locally. */
(()=>{
'use strict';
const query=new URL(location.href).searchParams;
if(query.get('study')!=='1')return;
document.documentElement.dataset.study='1';
const KEY='emotion-games-study-v1';
const allowed=['緊張','驚き','達成感','安心','切なさ','楽しさ','何も感じない'];
let records=[];
try{const raw=JSON.parse(localStorage.getItem(KEY)||'[]');if(Array.isArray(raw))records=raw.slice(-300)}catch(_){}
let current=null;
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(records.slice(-300)))}catch(_){}};
function exportJson(){
 const blob=new Blob([JSON.stringify({version:1,mode:'opt-in-local-only',records},null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),link=document.createElement('a');link.href=url;link.download='emotion-games-study.json';link.click();
 setTimeout(()=>URL.revokeObjectURL(url),1000);
}
function menu(){
 const el=document.querySelector('.hero');
 if(!el)return;
 const panel=document.createElement('section');panel.className='study-dashboard';
 panel.innerHTML='<strong>検証モード / RESEARCH</strong><p>狙った感情が動くかを、1プレイ1回答で記録できます。データはこの端末内だけに保存され、送信されません。</p><div class="study-actions"><span id="study-count"></span><button type="button" id="study-export">結果JSONを保存</button><button type="button" id="study-clear">記録を削除</button></div>';
 el.append(panel);panel.querySelector('#study-export').addEventListener('click',exportJson);
 panel.querySelector('#study-clear').addEventListener('click',()=>{if(!window.confirm('この端末の検証記録を削除しますか？'))return;records=[];save();panel.querySelector('#study-count').textContent='0 回のプレイ'});
 panel.querySelector('#study-count').textContent=records.length+' 回のプレイ';
 for(const a of document.querySelectorAll('a.card'))a.searchParams; // URL assignment below retains the opt-in flag.
 document.querySelectorAll('.card').forEach(a=>{const u=new URL(a.href);u.searchParams.set('study','1');a.href=u.toString()});
}
function survey(){
 const curtain=document.getElementById('curtain');
 if(!curtain)return;
 const panel=document.createElement('section');panel.className='study-feedback';panel.hidden=true;panel.id='study-feedback';
 panel.innerHTML='<p>いま、一番近い気持ちは？ <span>任意の1タップ</span></p><div class="study-feelings"></div><small id="study-saved" aria-live="polite"></small>';
 const actions=curtain.querySelector('#share');actions.parentElement.insertBefore(panel,actions);
 const options=panel.querySelector('.study-feelings');
 for(const emotion of allowed){const b=document.createElement('button');b.type='button';b.textContent=emotion;b.addEventListener('click',()=>{
   if(!current||current.recorded)return;
   current.recorded=true;current.felt=emotion;current.answered=true;
   const e=records.find(e=>e.id===current.id);if(e){e.felt=emotion;e.answered=true;save()}
   panel.querySelector('#study-saved').textContent='記録しました。ご協力ありがとうございます。';
   options.querySelectorAll('button').forEach(x=>x.disabled=true);
 });options.appendChild(b)}
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
  current={id:Date.now()+'-'+Math.round(Math.random()*1e7),slug:game,target:document.querySelector('.game-heading .label span')?.textContent?.replace('/','').trim()||null,start:performance.now(),inputs:0,recorded:false};
  panel.hidden=true;panel.querySelector('#study-saved').textContent='';panel.querySelectorAll('button').forEach(x=>x.disabled=false);
 }
 if(name==='game_complete'&&current&&!current.recorded){
  const entry={id:current.id,game_id:game,target:current.target,mode:'blind',duration_ms:Math.round(performance.now()-current.start),inputs:current.inputs,ending_id:payload?.ending_id||null,score:payload?.score??null,answered:false,felt:null};
  records.push(entry);records=records.slice(-300);save();current.recorded=false;
  panel.hidden=false;
 }
};
})();