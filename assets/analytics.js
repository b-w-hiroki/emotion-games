/* GA4 is loaded only after an explicit choice and only when a measurement ID is configured. */
(()=>{
'use strict';
const id=document.currentScript?.dataset.measurementId||'';
if(!/^G-[A-Z0-9]+$/.test(id))return;
const query=new URL(location.href).searchParams;
if(query.has('qa')||query.get('study')==='1')return;
const KEY='emotion-analytics-consent-v1';
const fields={
 game_start:[],game_complete:['ending_id','outcome','score','found_count','memories','miracle','lowest_flame','route','chapter','gust_shield','silence_release','rice_pct','mix_pct','doneness_pct','seasoning_pct','fish_id','opening_hits','bad_reels'],
 ending_discovered:['ending_id','found_count'],game_retry:[],share_tap:['ending_id'],
 route_selected:['route'],memory_collected:['count'],finale_window:['level','gust_shield','silence_release'],
 chapter_reached:['chapter'],finale_warning:[],finale_gust:[],finale_silence:[],journey_exit:['destination']
};
const kienaideOnly=new Set(['chapter_reached','finale_warning','finale_gust','finale_silence','journey_exit']);
const numeric=new Set(['score','found_count','memories','lowest_flame','gust_shield','silence_release','rice_pct','mix_pct','doneness_pct','seasoning_pct','opening_hits','bad_reels','count']);
let consent='';try{consent=localStorage.getItem(KEY)||''}catch(_){}
let active=false;
const starts=new Map();
const prior=window.emotionTrack;
function start(){
 if(active)return;
 active=true;
 window.dataLayer=window.dataLayer||[];
 window.gtag=function(){window.dataLayer.push(arguments)};
 window.gtag('js',new Date());
 window.gtag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false});
 const tag=document.createElement('script');tag.async=true;tag.src='https://www.googletagmanager.com/gtag/js?id='+encodeURIComponent(id);document.head.appendChild(tag);
}
function track(name,payload){
 if(typeof prior==='function')prior(name,payload);
 if(!Object.hasOwn(fields,name)||!payload||typeof payload.game_id!=='string'||!(/^[a-z][a-z0-9-]{0,39}$/).test(payload.game_id))return;
 const game=payload.game_id;
 if(kienaideOnly.has(name)&&game!=='kienaide')return;
 if(name==='chapter_reached'&&(!Number.isInteger(payload.chapter)||payload.chapter<2||payload.chapter>4))return;
 if(name==='journey_exit'&&!['home','title'].includes(payload.destination))return;
 if(!active)return;
 if(name==='game_start')starts.set(game,performance.now());
 if(['game_complete','ending_discovered','route_selected','memory_collected','finale_window'].includes(name)||kienaideOnly.has(name)){
  if(!starts.has(game))return;
 }
 const params={game_id:game};
 for(const key of fields[name]){
  const value=payload[key];
  if(key==='chapter'){
   // The core stores a zero-based chapter; chapter_reached already passes a one-based label.
   const chapter=name==='game_complete'?(game==='kienaide'?value+1:NaN):value;
   if(Number.isInteger(chapter)&&chapter>=1&&chapter<=4)params[key]=String(chapter);
  }
  else if(numeric.has(key)){if(typeof value==='number'&&Number.isFinite(value))params[key]=value}
  else if(key==='miracle'){if(typeof value==='boolean')params[key]=value?'yes':'no'}
  else if(typeof value==='string'&&/^[a-z][a-z0-9-]{0,39}$/.test(value))params[key]=value;
 }
 if(name==='game_complete'){
  const started=starts.get(game);if(Number.isFinite(started))params.duration_ms=Math.round(performance.now()-started);
  starts.delete(game);
 }
 window.gtag('event',name,params);
}
window.emotionTrack=track;
function choice(value){
 consent=value;
 try{localStorage.setItem(KEY,value)}catch(_){}
 document.getElementById('analytics-choice')?.remove();
 if(value==='yes')start();
 else if(active)location.reload();
}
function controls(){
 const settings=document.getElementById('analytics-settings');
 if(settings){settings.textContent='計測設定：'+(consent==='yes'?'許可':consent==='no'?'拒否':'未選択');settings.addEventListener('click',()=>{consent='';showChoice()})}
 if(consent==='yes')start();
 else if(consent!=='no')showChoice();
}
function showChoice(){
 if(document.getElementById('analytics-choice'))return;
 const box=document.createElement('aside');box.id='analytics-choice';box.setAttribute('aria-label','利用状況の計測');
 box.innerHTML='<p>改善のためプレイ回数と結末をGA4で集計します。許可しますか？氏名・回答は送信しません。<a href="'+(document.body.dataset.game?'../':'./')+'privacy.html">詳細</a></p><div><button type="button" data-choice="no">送信しない</button><button type="button" data-choice="yes">許可する</button></div>';
 const style=document.createElement('style');style.textContent='#analytics-choice{position:fixed;z-index:10000;inset:auto 10px max(10px,env(safe-area-inset-bottom));max-width:620px;margin:auto;padding:9px 12px;border:1px solid #b9a78b;border-radius:12px;background:#101b2bf5;color:#fff5e9;box-shadow:0 10px 35px #0009;font:12px/1.4 system-ui,sans-serif}#analytics-choice p{margin:0 0 6px}#analytics-choice a{text-decoration:underline;color:#f8c788}#analytics-choice div{display:flex;gap:8px;justify-content:flex-end}#analytics-choice button{min-height:44px;padding:6px 14px;border:1px solid #aaacb0;border-radius:8px;background:#24344b;color:#fff;cursor:pointer}#analytics-choice button[data-choice=yes]{border-color:#f8c788;color:#ffe0af}';
 document.head.appendChild(style);box.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>choice(button.dataset.choice)));document.body.appendChild(box);
}
if(consent==='yes')start();
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',controls,{once:true});else controls();
})();
