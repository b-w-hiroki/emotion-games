(()=>{'use strict';
const root=document.getElementById('app'),slug=document.body.dataset.game||'',base=slug?'../':'./';
const games=[
{slug:'girigiri',title:'ぎりぎり。',emotion:'緊張',subtitle:'止めたあとも、水は落ちてくる。',mechanic:'指を離すタイミングがすべて。',theme:'aqua',number:'01',duration:'30秒'},
{slug:'ato-hitotsu',title:'あと1個。',emotion:'ハラハラ',subtitle:'まだ積める。たぶん。',mechanic:'動くブロックを、落とすだけ。',theme:'amber',number:'02',duration:'45秒'},
{slug:'micha-dame',title:'みちゃだめ。',emotion:'恐怖',subtitle:'扉の向こうを、見てはいけない。',mechanic:'12秒間、指を離さず耐えろ。',theme:'violet',number:'03',duration:'20秒'},
{slug:'kienaide',title:'きえないで。',emotion:'切なさ',subtitle:'この灯りを、あの窓まで。',mechanic:'風を読んで炎をかばい、凪いだら手を離して息をする。',theme:'ember',number:'04',duration:'約90秒'}
];
games.push(...(window.EmotionMissions?.games||[]));
const game=games.find(g=>g.slug===slug);
const endings={
 girigiri:[
  {id:'empty',title:'からっぽ。',desc:'何も注がず、空っぽのまま終わった。',hint:'注がずに待つと？'},
  {id:'one-drop',title:'たった一滴。',desc:'ほんの少しの水だけを受け取った。',hint:'ほんの少しだけ注いで止める'},
  {id:'normal',title:'まだ注げた。',desc:'あふれる前に、ちゃんと止まれた。',hint:'普通に止めてみる'},
  {id:'perfect',title:'ぎりぎり。',desc:'水面がフチで揺れている。あと一滴も入らない。',hint:'満杯寸前の絶妙なタイミング'},
  {id:'overflow',title:'あふれた！',desc:'欲張ったぶんだけ、床が濡れた。',hint:'100%を超えると…'}
 ],
 'ato-hitotsu':[
  {id:'wait',title:'積まない。',desc:'動くものに手を出さない勇気。',hint:'一度も積まずに待つ'},
  {id:'rush',title:'せっかち。',desc:'慌てて次の一手を打ってしまった。',hint:'最初の一個の直後にもう一度'},
  {id:'collapse',title:'がらがら。',desc:'塔は崩れた。でもまだ諦めない。',hint:'どこかで失敗すると？'},
  {id:'precision',title:'職人の手。',desc:'正確に3回も揃えるなんて。',hint:'ズレをほとんど作らず3回'},
  {id:'sky',title:'てっぺん。',desc:'10段を積み切った。崩れる予感に勝った。',hint:'10段を積み切る'}
 ],
 'micha-dame':[
  {id:'ignore',title:'何も起きない。',desc:'扉は最初から、あなたを待っていたのかもしれない。',hint:'扉に触れず待つ'},
  {id:'knock',title:'叩き返された。',desc:'三回叩いたら、向こうから四回返ってきた。',hint:'扉の絵は触れられる'},
  {id:'peek',title:'見てしまった。',desc:'ほんの一瞬、見えてはいけないものが見えた。',hint:'途中で手を離す'},
  {id:'whisper',title:'名前を呼ばれた。',desc:'ちょうど半分のところで手を離した。',hint:'途中まで耐えた後で…'},
  {id:'resist',title:'見なかった。',desc:'12秒、目を閉じたように耐え抜いた。',hint:'最後まで押さえ続ける'}
 ],
 kienaide:[
  {id:'blown',title:'風にさらわれた。',desc:'暗闇に立ち尽くした。けれど、あの窓までの道は覚えている。',hint:'風の予兆を見落とすと…'},
  {id:'smother',title:'守りすぎた。',desc:'大切に囲い込んだ光は、あなたの手の中で息を止めた。',hint:'強く守り続けるだけでは届かない'},
  {id:'wish',title:'わすれない。',desc:'三つの記憶を拾った。光が消えても、約束は消えなかった。',hint:'道に浮かぶ三つの記憶に触れる'},
  {id:'survive',title:'まだ、ここに。',desc:'震える灯りを抱いて、朝の扉を叩いた。',hint:'炎と呼吸を残して夜を越える'},
  {id:'dawn',title:'おかえり。',desc:'窓の向こうの手が、あなたの灯りを包んだ。長い夜が終わった。',hint:'記憶を集め、明るい炎のまま届ける'}
 ]
};

Object.assign(endings,window.EmotionMissions?.endings||{});
const endingList=endings[slug]||[];
const rewardSets={
 girigiri:{
  three:{title:'水面の記憶',text:'水は、最後の一滴まで気まぐれ。待つ勇気も、攻める勇気も、ひとつの答え。'},
  all:{title:'一滴の魔術師',text:'あふれた日も、空っぽの日も。五つの水面を見届けた証。',symbol:'◒'}
 },
 'ato-hitotsu':{
  three:{title:'積み木の記憶',text:'崩れた瞬間に笑えて、次の一手で真剣になる。それが積み続ける理由。'},
  all:{title:'塔の語り部',text:'触れなかった一手も、十段目の一手も。すべてを積み上げた証。',symbol:'▤'}
 },
 'micha-dame':{
  three:{title:'扉の記憶',text:'開けなかった扉にも、物語がある。知らないことを選んだのは誰？'},
  all:{title:'向こう側の証人',text:'見たものと、見なかったもの。どちらもあなたの記憶になった。',symbol:'◇'}
 },
 kienaide:{
  three:{title:'灯りの中の手紙',text:'「暗くなっても、帰る場所は忘れないで」。炎に残った言葉。'},
  all:{title:'夜を渡るひと',text:'失った夜も、守り抜いた朝も。すべての道を歩いた証。',symbol:'✺'}
 }
};
Object.assign(rewardSets,window.EmotionMissions?.rewards||{});
let collected=[];try{const raw=JSON.parse(localStorage.getItem('emotion-endings-v1-'+slug)||'[]');if(Array.isArray(raw))collected=raw.filter(id=>endingList.some(e=>e.id===id))}catch(_){}
let lastEnding='';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mark(event,data){try{window.emotionTrack?.(event,{game_id:slug,...data})}catch(_){}}
function currentUrl(){const u=new URL(location.href);for(const x of ['utm_source','utm_medium','utm_campaign','utm_content','study'])u.searchParams.delete(x);return u.href}
async function share(score){mark('share_tap',{ending_id:lastEnding});const ending=endingList.find(e=>e.id===lastEnding);const text=game.title+'｜'+(ending?ending.title:'')+(candle&&state.rescue?' 【奇跡の灯り】':'')+' 【結末 '+collected.length+'/'+endingList.length+'】 '+(score?'記録 '+score+'。':'')+' あなたはどんな結末になる？';const url=currentUrl();if(navigator.share){try{await navigator.share({title:game.title,text,url});return}catch(e){if(e.name==='AbortError')return}}window.open('https://twitter.com/intent/tweet?'+new URLSearchParams({text,url}).toString(),'_blank','noopener,noreferrer')}

async function openShare(text,title){
 const url=currentUrl();
 if(navigator.share){try{await navigator.share({title,text,url});return}catch(e){if(e.name==='AbortError')return}}
 window.open('https://twitter.com/intent/tweet?'+new URLSearchParams({text,url}).toString(),'_blank','noopener,noreferrer');
}
function shareComplete(){
 const badge=rewardSets[slug].all;
 mark('completion_share_tap',{found_count:collected.length});
 return openShare(game.title+'を全5結末コンプリート。称号「'+badge.title+'」を獲得。あなたも遊んでみて。',game.title+'｜コンプリート');
}
function collectionCount(id){
 try{const raw=JSON.parse(localStorage.getItem('emotion-endings-v1-'+id)||'[]');return Array.isArray(raw)?new Set(raw.filter(key=>endings[id].some(x=>x.id===key))).size:0}catch(_){return 0}
}
function top(){return '<header class="top"><a class="logo" href="'+base+'">birdman<span>studio</span><small>EMOTION GAMES</small></a><a class="follow" href="https://x.com/toriihiroki4649" target="_blank" rel="noopener noreferrer">X / 最新作 ↗</a></header>'}
if(!game){
 const totalFound=games.reduce((sum,g)=>sum+collectionCount(g.slug),0),totalEndings=games.reduce((sum,g)=>sum+endings[g.slug].length,0);
 root.innerHTML=top()+'<main class="home"><section class="hero"><p class="eyebrow">SMALL GAMES. BIG FEELINGS.</p><h1>感情を、<br><em>遊ぶ。</em></h1><p>ドキドキ。ハラハラ。ゾクッ。<br>たった数秒で、心が動く。</p><div class="hero-meta">'+games.length+' SHORT GAMES <span>•</span> FREE TO PLAY <span>•</span> NO LOGIN <span>•</span> ENDINGS <b>'+totalFound+' / '+totalEndings+'</b></div><div class="archive-progress" aria-label="全'+totalEndings+'結末の収集進捗"><div class="archive-progress-head"><span>COLLECT THE FEELINGS</span><strong>'+totalFound+'/'+totalEndings+'</strong></div><div class="archive-track"><span style="width:'+(totalFound/totalEndings*100)+'%"></span></div><p>'+(totalFound===totalEndings?'全'+totalEndings+'結末を発見。感情のアーカイブが完成しました。':'まだ見ぬ結末が、'+(totalEndings-totalFound)+'種類。')+'</p>'+(totalFound===totalEndings?'<div class="archive-award"><strong>✦ EMOTION ARCHIVIST</strong><span>'+totalEndings+'の感情をすべて見届けた証</span><button id="share-archive" type="button">コンプリートをXに共有 ↗</button></div>':'')+'</div></section><div class="section-head"><h2>どれから遊ぶ？</h2><span>PLAY IN SECONDS ↓</span></div><section class="cards">'+games.map(g=>'<a class="card '+g.theme+'" style="--tone:'+esc(g.accent||'#e9a76f')+'" href="./'+g.slug+'/"><div class="card-art"><span class="art-icon">'+({girigiri:'◓','ato-hitotsu':'▤','micha-dame':'▯',kienaide:'✺'}[g.slug]||g.symbol||'◈')+'</span><span class="art-num">'+g.number+'</span></div><div class="card-info"><span class="emotion">'+g.emotion+' / '+g.duration+' / 結末 '+collectionCount(g.slug)+'/5</span><h3>'+g.title+'</h3><p>'+g.mechanic+'</p><span class="card-cta">いま遊ぶ <b>↗</b></span></div></a>').join('')+'</section><section class="manifesto"><span>OUR CONCEPT</span><h2>感情が動く、その一瞬を。</h2><p>物語でも、物理でも、ホラーでも。プレイヤー自身の行動で心が動く体験を作ります。</p></section></main><footer class="foot"><a href="https://x.com/toriihiroki4649">Follow @toriihiroki4649 ↗</a><a href="./privacy.html">プライバシー</a><span>© birdman studio</span></footer>';
 if(totalFound===totalEndings){document.getElementById('share-archive').addEventListener('click',()=>{mark('series_completion_share_tap',{found_count:totalEndings});openShare('Emotion Games 全'+totalEndings+'結末をコンプリート。「感情を、遊ぶ。」あなたは何個見つけられる？','Emotion Games｜全'+totalEndings+'結末コンプリート')})}
 return;
}
const candle=slug==='kienaide';
root.innerHTML=top()+'<main class="game-shell '+game.theme+'" style="--tone:'+esc(game.accent||'#e9a76f')+'"><div class="game-heading"><div class="label">EMOTION '+game.number+' <span>/ '+game.emotion+'</span></div><h1>'+game.title+'</h1><p>'+game.subtitle+'</p></div><div class="hud"><div><small>'+(candle?'LIGHT':'RECORD')+'</small><strong id="record">—</strong></div><div><small>'+(candle?'MEMORY':'BEST')+'</small><strong id="best">'+(candle?'0 / 3':'—')+'</strong></div><div><small>'+(candle?'DAWN':'TIME')+'</small><strong id="timer">'+(candle?'01:30':'00:00')+'</strong></div></div><div class="collect-bar"><span id="collection-progress" aria-live="polite"></span><button id="open-collection" type="button">結末図鑑を見る ↗</button></div><div class="arena"><canvas id="stage" width="360" height="400" aria-label="'+game.title+' のゲーム画面"></canvas>'+(candle?'<div class="story-beat" id="story-beat" role="status" aria-live="polite"><small>第一章　雪の路地</small><strong>窓の灯りが、帰り道の目印だった。</strong></div><button class="sound-toggle" id="sound-toggle" type="button" aria-pressed="true">音 ON</button>':'')+'<div class="curtain" id="curtain"><span class="eyebrow" id="curtain-kicker">'+(candle?'A SHORT NIGHT JOURNEY':'ONE IDEA GAME')+'</span><h2 id="curtain-title">'+game.title+'</h2><p id="curtain-description">'+(candle?'吹雪の町を歩き、たったひとつの灯りを家まで届ける。風の線が強くなったら長押しでかばい、凪いだら離して呼吸を戻そう。':game.mechanic)+'</p><div class="discovery-result" id="discovery-result" role="status" aria-live="polite" hidden><span class="discovery-glyph" aria-hidden="true">✦</span><span class="discovery-info"><strong id="discovery-state">NEW ENDING</strong><small id="discovery-counter"></small><small id="discovery-milestone"></small></span><span class="discovery-sparks" aria-hidden="true">✧ ✦ ✧</span></div><button class="btn" id="play">'+(candle?'夜を歩く →':'プレイ開始 →')+'</button><button class="share-btn" id="share" hidden>結果をXで共有 ↗</button>'+(candle?'<button class="moment-save" id="moment-save" type="button" hidden>結末カードを保存・共有 ↗</button>':'')+'<a class="related" id="related" href="'+('../'+games[(games.findIndex(g=>g.slug===slug)+1)%games.length].slug+'/')+'" hidden>次のゲームを遊ぶ →</a></div><section class="collection-panel" id="collection-panel" hidden role="dialog" aria-modal="true" aria-label="結末図鑑"><div class="collection-head"><strong>結末図鑑</strong><button id="close-collection" type="button">閉じる ✕</button></div><p>予想外の操作にも、結末が隠れている。</p><div class="collection-track" role="progressbar" aria-label="結末の回収率" aria-valuemin="0" aria-valuemax="5" aria-valuenow="0"><span id="collection-track-fill"></span></div><ol id="collection-list"></ol><div id="collection-awards"></div></section></div><div class="play-controls"><p id="hint">'+(slug==='girigiri'?'長押しで注ぐ。離すと落下中の水が残る。':slug==='ato-hitotsu'?'タイミングよく落として高く積もう。':candle?'風が強まったら長押し。凪いだら離して、息を戻す。':window.EmotionMissions?.endings[slug]?game.mechanic:'指を離したら扉が開いてしまう。')+'</p><button class="action" id="action" disabled>'+(slug==='girigiri'?'長押しで注ぐ':slug==='ato-hitotsu'?'ここで落とす！':candle?'長押しで灯りをかばう':window.EmotionMissions?.endings[slug]?({timing:'ここで止める！',balance:'長押しで調節',rhythm:'リズムをタップ！',choice:'左を選ぶ（右は画面）'}[game.theme]):'扉を押さえ続ける')+'</button><div class="controls-bottom"><button id="reset">最初から</button><a href="../">ゲーム一覧へ</a><a href="https://x.com/toriihiroki4649" target="_blank" rel="noopener noreferrer">新作を見る ↗</a></div></div></main>';
const canvas=document.getElementById('stage'),ctx=canvas.getContext('2d'),curtain=document.getElementById('curtain'),action=document.getElementById('action');
const $=id=>document.getElementById(id),record=$('record'),best=$('best'),timer=$('timer');
let mode='intro',last=0,elapsed=0,answer='',points=0,high=0,down=false,raf=0;
try{high=Number(localStorage.getItem('emotion-v1-'+slug))||0}catch(_){}if(!candle)best.textContent=high?String(high):'—';
const state={};
const sceneNames=['snow-street','wind-tunnel','frozen-bridge','dawn-village'];
const backdrops=candle?sceneNames.map(name=>{
 const img=new Image();
 img.src=base+'assets/kienaide-'+name+'.svg';
 return img;
}):[];
let audio=null,audioEnabled=true;
function initCandleAudio(){
 if(!candle||audio)return;
 const AC=window.AudioContext||window.webkitAudioContext;if(!AC)return;
 const ac=new AC(),master=ac.createGain();master.gain.value=.13;master.connect(ac.destination);
 const noise=ac.createBufferSource(),buffer=ac.createBuffer(1,ac.sampleRate*2,ac.sampleRate);
 const data=buffer.getChannelData(0);for(let i=0;i<data.length;i++)data[i]=Math.random()*2-1;
 noise.buffer=buffer;noise.loop=true;const filter=ac.createBiquadFilter(),windGain=ac.createGain();filter.type='lowpass';filter.frequency.value=950;windGain.gain.value=.02;noise.connect(filter).connect(windGain).connect(master);noise.start();
 const fireOsc=ac.createOscillator(),fireGain=ac.createGain(),fireFilter=ac.createBiquadFilter();
 fireOsc.type='triangle';fireOsc.frequency.value=210;fireFilter.type='lowpass';fireFilter.frequency.value=600;fireGain.gain.value=0;
 fireOsc.connect(fireFilter).connect(fireGain).connect(master);fireOsc.start();
 audio={ac,master,windGain,fireOsc,fireGain,fireFilter,lastPulse:0};
}
function candleTone(freq=620,duration=.22,volume=.18){
 if(!audio||!audioEnabled)return;const {ac,master}=audio,o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.setValueAtTime(freq,ac.currentTime);g.gain.setValueAtTime(volume,ac.currentTime);g.gain.exponentialRampToValueAtTime(.001,ac.currentTime+duration);o.connect(g).connect(master);o.start();o.stop(ac.currentTime+duration);
}
function candleChord(){
 if(!audio||!audioEnabled)return;
 const {ac,master}=audio,now=ac.currentTime;
 for(const [i,freq] of [392,493.88,587.33,783.99].entries()){
  const o=ac.createOscillator(),g=ac.createGain();o.type='sine';o.frequency.value=freq;
  const start=now+i*.18;g.gain.setValueAtTime(.0001,start);g.gain.exponentialRampToValueAtTime(.085,start+.16);
  g.gain.exponentialRampToValueAtTime(.0001,start+1.8);o.connect(g).connect(master);o.start(start);o.stop(start+1.9);
 }
}
function flameExpression(s){
 if(s.rescue)return 'hope';
 if((s.oxygen??100)<24)return 'suffocating';
 if((s.flame??72)<31)return 'afraid';
 if(s.shield)return 'comfort';
 if((s.wind??0)>.58)return 'afraid';
 return 'calm';
}
function setStory(chapter,text){
 if(!candle)return;const el=$('story-beat');if(!el||state.story===chapter)return;state.story=chapter;el.classList.remove('show');void el.offsetWidth;el.innerHTML='<small>'+chapter+'</small><strong>'+text+'</strong>';el.classList.add('show');candleTone(440+state.chapter*70,.45,.12);
}
if(candle){
 const sound=$('sound-toggle');sound.addEventListener('click',()=>{initCandleAudio();audioEnabled=!audioEnabled;sound.setAttribute('aria-pressed',String(audioEnabled));sound.textContent=audioEnabled?'音 ON':'音 OFF';if(audio)audio.master.gain.value=audioEnabled ? .13 : 0});
}

function canTriggerMiracle(s,time){
 return !s.rescue && time>=70 && time<=89 &&
   (s.memories||0)>=2 && s.flame>0 && s.flame<=29 && s.oxygen>=30 &&
   !s.shield && time-s.releaseAt>=0 && time-s.releaseAt<=1.3 &&
   s.wind<.46;
}
if(candle){
 const save=$('moment-save');
 save.addEventListener('click',async()=>{
  if(mode!=='end')return;
  const card=document.createElement('canvas');card.width=900;card.height=1200;
  const g=card.getContext('2d');
  const gradient=g.createLinearGradient(0,0,0,1200);
  gradient.addColorStop(0,'#111a32');gradient.addColorStop(.6,'#182a40');gradient.addColorStop(1,'#101524');
  g.fillStyle=gradient;g.fillRect(0,0,900,1200);
  g.fillStyle='#d3c9ba';g.font='bold 27px system-ui,sans-serif';g.textAlign='center';g.fillText('BIRDMAN STUDIO   /   EMOTION GAMES',450,66);
  g.font='bold 67px system-ui,sans-serif';g.fillStyle='#ffe0a2';g.fillText('きえないで。',450,152);
  const box={x:90,y:208,w:720,h:800};
  g.save();g.beginPath();g.roundRect(box.x,box.y,box.w,box.h,25);g.clip();g.drawImage(canvas,box.x,box.y,box.w,box.h);g.restore();
  g.strokeStyle='#b9a18b';g.lineWidth=3;g.strokeRect(box.x,box.y,box.w,box.h);
  g.fillStyle='#fff0d7';g.font='bold 35px system-ui,sans-serif';
  const ending=endingList.find(e=>e.id===lastEnding);
  g.fillText(ending?.title||'あなたの夜',450,1071);
  g.font='24px system-ui,sans-serif';g.fillStyle='#e7caad';
  const memoryText='記憶 '+(state.memories||0)+'/3'+(state.rescue?'   •   奇跡の灯り':'');
  g.fillText(memoryText,450,1111);
  g.font='20px system-ui,sans-serif';g.fillStyle='#b8becd';
  g.fillText('play.birdman-studio.com/kienaide/',450,1163);
  const blob=await new Promise(ok=>card.toBlob(ok,'image/png'));
  if(!blob)return;
  mark('moment_card_created',{ending_id:lastEnding,rescue:!!state.rescue});
  const filename='kienaide-'+(lastEnding||'ending')+'.png';
  const file=new File([blob],filename,{type:'image/png'});
  if(navigator.canShare?.({files:[file]})&&navigator.share){
   try{await navigator.share({title:'きえないで。',files:[file],text:'私の夜の結末。あなたならどう守る？ '+currentUrl()});return}
   catch(e){if(e.name==='AbortError')return}
  }
  const url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download=filename;document.body.append(a);a.click();a.remove();
  setTimeout(()=>URL.revokeObjectURL(url),3000);
 });
}
function renderCollection(){
 $('collection-progress').textContent='結末 '+collected.length+' / '+endingList.length;
 const track=$('collection-panel').querySelector('.collection-track');
 track.setAttribute('aria-valuenow',String(collected.length));
 $('collection-track-fill').style.width=(collected.length/endingList.length*100)+'%';
 const reward=rewardSets[slug];
 const earnedThree=collected.length>=3,earnedAll=collected.length===endingList.length;
 $('collection-awards').innerHTML='<div class="award-card '+(earnedThree?'earned':'locked')+'"><span class="award-symbol">✧</span><div><small>3 / 5　余韻の手紙</small><strong>'+(earnedThree?esc(reward.three.title):'未解放')+'</strong><p>'+(earnedThree?esc(reward.three.text):'あと'+Math.max(0,3-collected.length)+'結末で解放')+'</p></div></div>'
  +'<div class="award-card '+(earnedAll?'earned':'locked')+'"><span class="award-symbol">'+esc(reward.all.symbol)+'</span><div><small>5 / 5　コンプリート称号</small><strong>'+(earnedAll?esc(reward.all.title):'未解放')+'</strong><p>'+(earnedAll?esc(reward.all.text):'残り'+(endingList.length-collected.length)+'結末で解放')+'</p>'+(earnedAll?'<button type="button" class="completion-share" data-share-completion>称号をXに共有 ↗</button>':'')+'</div></div>';
 $('collection-list').innerHTML=endingList.map((e,i)=>'<li class="'+(collected.includes(e.id)?'found':'locked')+'"><span class="ending-number">NO.'+String(i+1).padStart(2,'0')+'</span><span class="ending-info"><strong>'+(collected.includes(e.id)?esc(e.title):'？？？')+'</strong><small>'+(collected.includes(e.id)?esc(e.desc):'ヒント：'+esc(e.hint))+'</small></span><span class="ending-mark">'+(collected.includes(e.id)?'✓':'?')+'</span></li>').join('');
}
function unlock(id){
 if(collected.includes(id))return false;
 collected.push(id);
 try{localStorage.setItem('emotion-endings-v1-'+slug,JSON.stringify(collected))}catch(_){}
 renderCollection();
 mark('ending_discovered',{ending_id:id,found_count:collected.length});
 return true;
}
renderCollection();
$('collection-awards').addEventListener('click',event=>{if(event.target.closest('[data-share-completion]'))shareComplete()});
$('open-collection').addEventListener('click',()=>{renderCollection();$('collection-panel').hidden=false;$('close-collection').focus();mark('collection_open')});
$('close-collection').addEventListener('click',()=>{ $('collection-panel').hidden=true;$('open-collection').focus()});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('collection-panel').hidden=true});
canvas.addEventListener('click',e=>{
 if(mode!=='play')return;
 const s=state;
 if(slug==='micha-dame'){if(!s.knocks||elapsed-s.knockTime>1.3)s.knocks=0;s.knocks++;s.knockTime=elapsed;if(s.knocks>=3)finish('knock',75)}
 if(state.micro){const box=canvas.getBoundingClientRect();const x=(e.clientX-box.left)*360/box.width,y=(e.clientY-box.top)*400/box.height;window.EmotionMissions.canvasTap(state.micro,x,y,elapsed,finish)}
 if(slug==='kienaide'){
  const box=canvas.getBoundingClientRect(),x=(e.clientX-box.left)*360/box.width,y=(e.clientY-box.top)*400/box.height;
  const mote=s.mote;if(!mote||mote.got||Math.hypot(x-mote.x,y-mote.y)>38)return;
  mote.got=true;s.memoryGot.add(mote.id);s.memories++;s.storyPause=elapsed+4;best.textContent=s.memories+' / 3';candleTone(660+s.memories*120,.55,.2);mark('memory_collected',{memory_id:mote.id,count:s.memories});
  setStory(['','記憶　赤いマフラー','記憶　ふたりの食卓','記憶　帰る約束'][s.memories],['','「寒い日は、半分こ」','「灯りがあれば、同じ場所」','「遅くなっても、帰っておいで」'][s.memories]);
 }
});

function store(n){if(n<=high)return;high=n;if(!candle)best.textContent=String(high);try{localStorage.setItem('emotion-v1-'+slug,String(high))}catch(_){}}
function display(title,description,kicker='YOUR RESULT'){mode='end';down=false;$('collection-panel').hidden=true;action.disabled=true;curtain.classList.remove('hidden');$('curtain-kicker').textContent=kicker;$('curtain-title').textContent=title;$('curtain-description').textContent=description;$('play').textContent=candle?'もう一度、夜を歩く ↻':'もう一度遊ぶ ↻';$('share').hidden=false;$('related').hidden=false;if(candle){$('moment-save').hidden=false;$('story-beat').classList.remove('show');$('hint').textContent='夜の記憶は、結末図鑑に残った。';if(audio)audio.windGain.gain.setTargetAtTime(0,audio.ac.currentTime,.4)}answer=title;mark('game_complete',{score:points,ending_id:lastEnding,outcome:points>0?'success':'lose',memories:state.memories||0,chapter:state.chapter||0,miracle:!!state.rescue,lowest_flame:state.lowestFlame??null})}
function run(){mode='play';curtain.classList.remove('found-new');$('discovery-result').hidden=true;down=false;elapsed=0;points=0;answer='';lastEnding='';$('collection-panel').hidden=true;record.textContent='0';action.disabled=false;curtain.classList.add('hidden');Object.keys(state).forEach(x=>delete state[x]);if(slug==='girigiri')Object.assign(state,{fill:0,drips:[],spawner:0,pour:false,stopping:null,spill:0,started:false});if(slug==='ato-hitotsu')Object.assign(state,{tower:[{x:72,y:340,w:216}],moving:{x:0,y:316,w:216},velocity:158,level:0,streak:0,lastDrop:-1});if(slug==='micha-dame')Object.assign(state,{hold:false,held:0,eyes:0,failed:false,knocks:0,knockTime:-1,started:false});if(slug==='kienaide'){initCandleAudio();audio?.ac.resume();$('moment-save').hidden=true;Object.assign(state,{shield:false,flame:72,oxygen:100,wind:.18,memories:0,chapter:0,mote:null,memoryGot:new Set(),journey:90,qaSpeed:new URLSearchParams(location.search).has('qa')?12:1,story:'',storyPause:0,shelterReady:true,shelterUntil:-1,bridgeChill:0,miracleHint:false,rescue:false,rescueAt:-1,releaseAt:-100,lowestFlame:72,peakWind:0});best.textContent='0 / 3';setStory('第一章　雪の路地','窓の灯りが、帰り道の目印だった。')}if(window.EmotionMissions?.endings[slug])state.micro=window.EmotionMissions.makeState(slug);mark('game_start');$('hint').textContent=state.micro?game.mechanic:(slug==='girigiri'?'注ぐのを止めるタイミングを見極めろ':slug==='ato-hitotsu'?'タップしてブロックを落とす':slug==='kienaide'?'風の線が濃くなったら長押し。凪いだら離す。':'長押しで扉を押さえろ')}
function finish(id,n,description){
 if(mode!=='play')return;
 const ending=endingList.find(e=>e.id===id);if(!ending)throw Error('Unknown ending '+id);
 lastEnding=id;points=Math.max(0,Math.floor(n));record.textContent=String(points);store(points);
 const newly=unlock(id),count=collected.length;
 display(ending.title,description||ending.desc,newly?'NEW ENDING DISCOVERED':'ENDING COLLECTED');
 $('discovery-result').hidden=false;
 $('discovery-state').textContent=newly?'✦ 新しい結末を発見':'発見済みの結末';
 $('discovery-counter').textContent='COLLECTION　'+count+' / '+endingList.length;
 const milestone=newly&&count===3?'「余韻の手紙」解放':newly&&count===5?'「'+rewardSets[slug].all.title+'」獲得':'';
 $('discovery-milestone').textContent=milestone;
 curtain.classList.toggle('found-new',newly);
 if(milestone)mark('reward_unlocked',{tier:count===3?'three':'complete',found_count:count});
}
$('play').addEventListener('click',()=>{if(mode==='end')mark('game_retry');run()});
$('reset').addEventListener('click',()=>{if(mode!=='intro')mark('game_retry');run()});
$('share').addEventListener('click',()=>share(points?points+'点':''));
function holdRelease(){if(!down)return;down=false;if(mode!=='play')return;if(slug==='girigiri'&&state.pour){state.pour=false;state.stopping=elapsed}if(slug==='micha-dame'){state.hold=false;if(state.held<12)finish(state.held>=5.5?'whisper':'peek',0)}if(slug==='kienaide'){state.shield=false;state.releaseAt=elapsed}if(state.micro)window.EmotionMissions.up(state.micro)}
action.addEventListener('pointerdown',e=>{if(mode!=='play'||down||e.button!==0)return;e.preventDefault();down=true;action.setPointerCapture?.(e.pointerId);if(slug==='girigiri'){state.pour=true;state.started=true}if(slug==='micha-dame'){state.hold=true;state.started=true}if(slug==='kienaide')state.shield=true;if(state.micro)window.EmotionMissions.down(state.micro,elapsed)});
action.addEventListener('pointerup',holdRelease);action.addEventListener('pointercancel',holdRelease);
action.addEventListener('click',()=>{if(mode!=='play')return;if(slug==='ato-hitotsu')drop();if(state.micro)window.EmotionMissions.tap(state.micro,elapsed,finish)});
window.addEventListener('blur',holdRelease);document.addEventListener('visibilitychange',()=>{if(document.hidden)holdRelease()});
action.addEventListener('contextmenu',e=>e.preventDefault());
function drop(){const s=state;if(s.level>=1&&s.lastDrop>=0&&elapsed-s.lastDrop<.38){finish('rush',s.level*10);return}s.lastDrop=elapsed;const a=s.moving,b=s.tower.at(-1),left=Math.max(a.x,b.x),right=Math.min(a.x+a.w,b.x+b.w),width=right-left;if(width<9){finish('collapse',state.level*10,'積めたのは '+state.level+' 個。もう一度挑戦。');return}state.streak=Math.abs(a.x-b.x)<5?state.streak+1:0;state.level++;state.tower.push({x:left,y:a.y,w:width});record.textContent=String(state.level);if(state.streak>=3){finish('precision',95);return}if(state.level>=10){finish('sky',100);return}state.moving={x:0,y:a.y-24,w:width};state.velocity=(158+state.level*28)*(state.level%2?-1:1);if(state.velocity<0)state.moving.x=360-width}
function bg(color){ctx.fillStyle=color;ctx.fillRect(0,0,360,400)}
function textAt(t,x,y,font,color,align='center'){ctx.textAlign=align;ctx.fillStyle=color;ctx.font=font;ctx.fillText(t,x,y)}
function rr(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function drawG(dt){
 bg('#092b3b');ctx.fillStyle='#0c3848';for(let i=0;i<9;i++){ctx.fillRect(i*48-10,0,1,400)}
 const s=state;if(mode==='play'){if(s.pour){s.spawner+=dt;while(s.spawner>.037){s.spawner-=.037;s.drips.push({x:165+Math.random()*30,y:-6,vy:0,r:3+Math.random()*2.5})}}for(let i=s.drips.length-1;i>=0;i--){let d=s.drips[i];d.vy+=750*dt;d.y+=d.vy*dt;const waterY=350-s.fill*2.6;if(d.y>=Math.min(350,waterY)){s.fill+=1.09;if(s.fill>100){s.spill=s.fill-100}s.drips.splice(i,1)}}if(!s.started&&elapsed>=8)finish('empty',40);if(s.stopping!==null&&elapsed-s.stopping>1.8&&s.drips.length===0){const f=s.fill;finish(f>100?'overflow':f<=12?'one-drop':f>=94?'perfect':'normal',f>100?0:f<=12?35:Math.max(0,100-Math.abs(98-f)*8),'水量 '+f.toFixed(1)+'%。')}if(elapsed>25&&mode==='play'){finish('overflow',0,'止める勇気が必要だった。')}}ctx.fillStyle='#123d4b';ctx.fillRect(0,356,360,44);
 ctx.save();ctx.beginPath();ctx.moveTo(90,102);ctx.lineTo(270,102);ctx.lineTo(258,351);ctx.lineTo(102,351);ctx.closePath();ctx.clip();const h=Math.max(0,s.fill||0)*2.6;ctx.fillStyle=s.fill>100?'#ff967c':'#4cc9df';ctx.beginPath();ctx.moveTo(92,350-h);for(let x=92;x<=269;x+=5)ctx.lineTo(x,350-h+Math.sin(x*.09+elapsed*9)*Math.min(5,1+h*.02));ctx.lineTo(270,354);ctx.lineTo(90,354);ctx.fill();ctx.restore();
 ctx.strokeStyle='#c8faff';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(90,100);ctx.lineTo(270,100);ctx.lineTo(258,353);ctx.quadraticCurveTo(180,365,102,353);ctx.closePath();ctx.stroke();
 ctx.strokeStyle='#ffcf7a';ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(105,102+247*.06);ctx.lineTo(254,102+247*.06);ctx.stroke();ctx.setLineDash([]);
 for(const d of s.drips||[]){ctx.fillStyle='#7fe6f6';ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,7);ctx.fill()}textAt('STOP BEFORE IT SPILLS',180,54,'11px system-ui','#9ed4e0');
 if((s.fill||0)>100){ctx.fillStyle='#66d5e7';for(let i=0;i<6;i++){let x=105+i*30;ctx.beginPath();ctx.arc(x,362+Math.sin(elapsed*12+i)*5,2.5,0,7);ctx.fill()}}
}
function drawStack(dt){bg('#262035');const s=state;ctx.fillStyle='#352941';for(let y=0;y<400;y+=46)ctx.fillRect(0,y,360,1);ctx.fillStyle='#5b486c';ctx.fillRect(0,364,360,36);
 if(mode==='play'){if(s.level===0&&elapsed>=8)finish('wait',40);let b=s.moving;b.x+=s.velocity*dt;if(b.x<0){b.x=0;s.velocity=Math.abs(s.velocity)}if(b.x+b.w>360){b.x=360-b.w;s.velocity=-Math.abs(s.velocity)}}
 const all=s.tower||[{x:72,y:340,w:216}];for(let i=0;i<all.length;i++){const b=all[i],y=Math.max(35,b.y+Math.max(0,all.length-8)*18);rr(b.x,y,b.w,23,4,i%2?'#ffbd79':'#f58d79');rr(b.x+5,y+3,Math.max(0,b.w-10),4,2,'#ffd9b2')}if(s.moving&&mode==='play'){const b=s.moving;rr(b.x,Math.max(20,b.y+Math.max(0,all.length-8)*18),b.w,23,4,'#f7d8ad')}
 textAt('STACK WITHOUT FALLING',180,47,'11px system-ui','#d2b8df');textAt(String(s.level||0)+' / 10',180,90,'bold 30px system-ui','#fff2d9');
}
function drawDoor(dt){bg('#11121c');const s=state;ctx.fillStyle='#1a1926';for(let i=0;i<14;i++)ctx.fillRect(i*32,0,1,400);let gap=mode==='end'&&points===0?48:Math.sin(elapsed*2)*2;rr(88,55,184,310,3,'#383444');rr(99+gap,66,158-gap,285,3,'#241e2b');ctx.strokeStyle='#665967';ctx.lineWidth=3;ctx.strokeRect(99+gap,66,158-gap,285);rr(221+gap*.4,207,10,10,5,'#b8a178');
 const r=Math.min(1,(s.held||0)/12);ctx.strokeStyle='#6c6175';ctx.lineWidth=5;ctx.beginPath();ctx.arc(180,25,19,-Math.PI/2,Math.PI*1.5);ctx.stroke();ctx.strokeStyle='#e6a8bc';ctx.beginPath();ctx.arc(180,25,19,-Math.PI/2,-Math.PI/2+Math.PI*2*r);ctx.stroke();textAt(String(Math.ceil(Math.max(0,12-(s.held||0))))+'s',180,28,'bold 13px system-ui','#f5e2ed');
 if(mode==='play'&&s.held>4&&Math.sin(elapsed*8)>0.9){ctx.fillStyle='#cc5670';ctx.beginPath();ctx.arc(158,170,3,0,7);ctx.arc(198,170,3,0,7);ctx.fill()}
 if(mode==='end'&&points===0){rr(110,90,135,240,3,'#09070d');ctx.fillStyle='#ff6975';ctx.beginPath();ctx.arc(157,167,5,0,7);ctx.arc(199,167,5,0,7);ctx.fill()}
 textAt('DO NOT LOOK',180,387,'11px system-ui','#9d899f');
 if(mode==='play'&&!s.started&&elapsed>=8){finish('ignore',40)}if(mode==='play'&&s.hold){s.held+=dt;record.textContent=s.held.toFixed(1)+'s';if(s.held>=12){finish('resist',100)}}}

function drawCandle(dt){
 const s=state,shield=s.shield||false,step=dt*(s.qaSpeed||1),progress=Math.min(1,elapsed/(s.journey||90));
 const chapters=[
  {at:0,label:'第一章　雪の路地',line:'窓の灯りが、帰り道の目印だった。'},
  {at:20,label:'第二章　風のトンネル',line:'「灯りがあれば、きっと帰れる」'},
  {at:45,label:'第三章　凍った橋',line:'向こう岸の窓に、小さな影が見えた。'},
  {at:70,label:'最終章　夜明け前',line:'あと少し。名前を呼ぶ声がした。'}
 ];
 let chapter=0;for(let i=1;i<chapters.length;i++)if(elapsed>=chapters[i].at)chapter=i;
 if(mode==='play'&&chapter!==s.chapter){s.previousChapter=s.chapter;s.chapter=chapter;s.sceneChangedAt=elapsed;mark('chapter_reached',{chapter:chapter+1})}
 if(mode==='play'&&elapsed>(s.storyPause||0))setStory(chapters[chapter].label,chapters[chapter].line);
 const gustWave=Math.pow((Math.sin(elapsed*(.42+chapter*.055)-.9)+1)/2,2.3);
 const crossWind=Math.pow((Math.sin(elapsed*.19+1.8)+1)/2,4);
 // Four chapters change play conditions, not just words: shelter, crosswind, cold and the last lull.
 const tunnelGust=chapter===1?Math.pow((Math.sin(elapsed*.83)+1)/2,6)*.24:0;
 const bridgeCold=chapter===2?.62:1;
 const baseWind=.12+gustWave*(.43+chapter*.105)+crossWind*.14+tunnelGust;
 s.wind=Math.min(1.15,baseWind);
 if(chapter===1&&s.shelterReady&&s.wind<.29&&!shield){
  s.shelterReady=false;s.shelterUntil=elapsed+3.5;mark('shelter_discovered',{chapter:2});
  setStory('風のトンネル　建物の陰','風が止まった。息を取り戻すなら今。');s.storyPause=elapsed+3;
 }
 const sheltered=elapsed<s.shelterUntil;
 if(sheltered)s.wind*=.2;
 if(mode==='play'){
  if(shield){s.oxygen=Math.max(0,s.oxygen-(4.5+s.wind*3.8+(chapter===2?1.2:0))*step);s.flame=Math.min(100,s.flame+(1.35-s.wind*.35)*step)}
  else{s.oxygen=Math.min(100,s.oxygen+(sheltered?23:15)*step);s.flame=Math.max(0,Math.min(100,s.flame+(s.wind>.5?-(7+s.wind*8)*bridgeCold:2.25-(chapter===2?.65:0))*step))}
  if(chapter===3&&!s.miracleHint&&s.flame<36&&s.memories>=2){
   s.miracleHint=true;setStory('夜明け前　小さな予感','向こうの窓が、こちらの灯りを見ている。');
   s.storyPause=elapsed+4;mark('rescue_foreshadowed',{flame:Math.round(s.flame)});
  }
  s.lowestFlame=Math.min(s.lowestFlame??100,s.flame);
  s.peakWind=Math.max(s.peakWind||0,s.wind);
  if(canTriggerMiracle(s,elapsed)){
   s.rescue=true;s.rescueAt=elapsed;s.flame=Math.min(100,s.flame+24);
   s.storyPause=elapsed+6;
   setStory('夜明け前　窓の向こう','手を離した瞬間、あの窓から光が返ってきた。');
   candleChord();mark('miracle_triggered',{memories:s.memories,lowest_flame:Math.round(s.lowestFlame)});
  }
  const slots=[{id:'scarf',at:12,x:82,y:145},{id:'table',at:37,x:278,y:178},{id:'promise',at:62,x:92,y:213}];
  const active=slots.find(m=>elapsed>=m.at&&elapsed<m.at+8&&!s.memoryGot.has(m.id));s.mote=active?{...active,got:false}:null;
  if(audio&&audioEnabled){
   const now=audio.ac.currentTime,emotion=flameExpression(s),quiet=s.rescue&&elapsed-s.rescueAt<.48;
   audio.windGain.gain.setTargetAtTime(quiet?0:.02+s.wind*.13,now,.09);
   audio.fireGain.gain.setTargetAtTime(quiet?0:emotion==='comfort'?.035:emotion==='afraid'?.012:.021,now,.14);
   audio.fireOsc.frequency.setTargetAtTime(emotion==='afraid'?147:emotion==='hope'?310:emotion==='suffocating'?95:220,now,.15);
   audio.fireFilter.frequency.setTargetAtTime(emotion==='suffocating'?220:emotion==='hope'?860:520,now,.18);
   if(s.oxygen<24&&elapsed-audio.lastPulse>.75){audio.lastPulse=elapsed;candleTone(110,.16,.22)}
  }
  if(s.oxygen<=0){finish('smother',0);return}
  if(s.flame<=0){finish('blown',0);return}
  if(elapsed>=s.journey){timer.textContent='00:00';const score=Math.round(s.flame*.65+s.oxygen*.15+s.memories*7);finish(s.memories===3?(s.flame>=68?'dawn':'wish'):'survive',score);return}
  record.textContent=Math.max(0,Math.round(s.flame))+'%';const remaining=Math.max(0,Math.ceil(s.journey-elapsed));timer.textContent=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');
 }
 const wind=s.wind||.2,health=s.flame===undefined?72:s.flame;
 const scene=backdrops[chapter];
 const artReady=!!(scene?.complete&&scene.naturalWidth);
 const homeScale=.62+progress*.58,homeX=artReady&&chapter===3?253:270-progress*34,homeY=artReady&&chapter===3?266:236-progress*30;
 if(artReady){
  ctx.drawImage(scene,0,0,360,400);
  // Crossing into a new chapter briefly retains the previous one for a cinematic dissolve.
  const transition=elapsed-(s.sceneChangedAt??-999);
  const prev=backdrops[s.previousChapter];
  if(transition>=0&&transition<1.35&&prev?.complete&&prev.naturalWidth&&s.previousChapter!==chapter){
   ctx.save();ctx.globalAlpha=Math.max(0,1-transition/1.35);ctx.drawImage(prev,0,0,360,400);ctx.restore();
  }
 }else{
 const horizon=ctx.createLinearGradient(0,0,0,400);
 horizon.addColorStop(0,`rgb(${Math.round(14+progress*58)},${Math.round(23+progress*45)},${Math.round(47+progress*43)})`);horizon.addColorStop(.72,`rgb(${Math.round(38+progress*92)},${Math.round(50+progress*58)},${Math.round(72+progress*48)})`);horizon.addColorStop(1,'#182334');ctx.fillStyle=horizon;ctx.fillRect(0,0,360,400);
 for(let i=0;i<22;i++){const x=(i*79+27+elapsed*(8+wind*28))%390-15,y=(i*53+13+Math.sin(i)*8)%255;ctx.fillStyle='rgba(239,242,249,'+(.22+wind*.34)+')';ctx.beginPath();ctx.arc(x,y,1+wind*1.2,0,7);ctx.fill()}
 // The destination grows closer in every chapter.

 ctx.save();ctx.translate(homeX,homeY);ctx.scale(homeScale,homeScale);ctx.fillStyle='#172233';ctx.fillRect(-34,-42,68,64);ctx.beginPath();ctx.moveTo(-42,-42);ctx.lineTo(0,-72);ctx.lineTo(42,-42);ctx.fill();ctx.fillStyle='#ffd58c';ctx.fillRect(7,-27,15,18);ctx.fillStyle='rgba(255,211,137,'+(s.rescue?'.55':'.16')+')';ctx.fillRect(s.rescue?-15:1,-33,s.rescue?53:27,s.rescue?50:30);ctx.restore();

 }
 if(artReady){
  // Moving snow remains an independent foreground layer, even when the scenery is static.
  for(let i=0;i<28;i++){
   const xx=(i*67+elapsed*(9+wind*41))%387-15;
   const yy=(i*59+Math.sin(i*4.3)*18+elapsed*(9+i%3*5))%419-10;
   ctx.fillStyle='rgba(230,243,250,'+(.24+wind*.22)+')';
   ctx.beginPath();ctx.arc(xx,yy,(i%4===0?1.9:1),0,Math.PI*2);ctx.fill();
  }
 }
 if(s.rescue){
  const since=elapsed-s.rescueAt,flare=Math.max(0,1-since/6);
  const glow=ctx.createRadialGradient(homeX,homeY,0,homeX,homeY,flare*200+55);
  glow.addColorStop(0,'rgba(255,230,156,'+(.4+flare*.5)+')');
  glow.addColorStop(1,'rgba(255,184,91,0)');
  ctx.fillStyle=glow;ctx.fillRect(0,20,360,320);
  if(since>=0&&since<6){
   for(let i=0;i<14;i++){const r=i*1.7+since*4,a=i*2.4+since*.8;
    ctx.fillStyle='rgba(255,221,158,'+Math.max(0,.9-since*.13)+')';
    ctx.fillRect(homeX+Math.cos(a)*r,homeY+Math.sin(a)*r,2.5,2.5)}
   textAt('手を離したら、光が返ってきた。',180,94,'bold 15px system-ui','#ffe7af');
  }
 }
 if(sheltered&&mode==='play'){
  ctx.fillStyle='rgba(255,222,165,.12)';ctx.fillRect(0,92,360,245);
  textAt('風をよけられる — 今のうちに息を戻す',180,114,'bold 11px system-ui','#ffe0ad');
 }
 if(chapter===2&&mode==='play'){
  ctx.strokeStyle='rgba(191,234,255,.38)';ctx.lineWidth=2;
  for(let k=0;k<6;k++){ctx.beginPath();ctx.moveTo(k*73-30,320);ctx.lineTo(k*73+26,291);ctx.stroke()}
 }
 if(!artReady){ctx.fillStyle='#142233';ctx.fillRect(0,318,360,82);ctx.fillStyle='#536277';ctx.beginPath();ctx.moveTo(0,331);ctx.lineTo(86,286);ctx.lineTo(151,326);ctx.lineTo(235,284);ctx.lineTo(360,329);ctx.lineTo(360,348);ctx.lineTo(0,348);ctx.fill()}
 ctx.strokeStyle='rgba(214,224,237,'+(.18+wind*.5)+')';ctx.lineWidth=1.5+wind*1.8;
 for(let i=0;i<7;i++){const y=96+i*31,x0=((elapsed*(86+wind*145)+i*93)%520)-135;ctx.beginPath();ctx.moveTo(x0,y);ctx.quadraticCurveTo(x0+63,y-9-wind*8,x0+119,y);ctx.stroke()}
 const x=180+Math.sin(elapsed*5.1)*(shield?2:wind*15),fireHeight=Math.max(10,45*(health/100));
 const character=flameExpression(s),motionReduced=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches||false;
 const lightStrength=Math.min(1,health/100)*(s.rescue?1.25:1);
 // The flame is a real light source: its intensity changes the nearby traveller and the path.
 const floorLight=ctx.createRadialGradient(x,263,5,x,263,150);
 floorLight.addColorStop(0,'rgba(255,181,96,'+(.22*lightStrength)+')');
 floorLight.addColorStop(1,'rgba(255,170,87,0)');
 ctx.fillStyle=floorLight;ctx.fillRect(15,110,330,260);
 const halo=ctx.createRadialGradient(x,220,2,x,220,80+health*.45);halo.addColorStop(0,'rgba(255,218,148,.48)');halo.addColorStop(1,'rgba(255,176,99,0)');ctx.fillStyle=halo;ctx.fillRect(35,80,290,290);
 // Traveller, coat, hands and candle. Layered fabric and scarf give the protagonist a readable silhouette.
 const faceBounce=window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches?0:Math.sin(elapsed*1.9)*1.2;
 const litAmount=Math.min(1,health/82);
 ctx.fillStyle='rgba(0,0,0,.24)';ctx.beginPath();ctx.ellipse(181,324,70,11,0,0,7);ctx.fill();
 ctx.fillStyle='#293c56';ctx.beginPath();ctx.moveTo(144,218);ctx.lineTo(126,285);ctx.lineTo(141,338);ctx.lineTo(224,338);ctx.lineTo(231,286);ctx.lineTo(216,212);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#658197';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(148,239);ctx.lineTo(159,317);ctx.moveTo(212,239);ctx.lineTo(205,318);ctx.stroke();
 ctx.fillStyle='#9a6470';ctx.beginPath();ctx.moveTo(144,207);ctx.quadraticCurveTo(177,221,215,207);ctx.lineTo(222,231);ctx.quadraticCurveTo(188,241,151,230);ctx.closePath();ctx.fill();
 ctx.strokeStyle='rgba(253,196,137,'+(.22+litAmount*.28)+')';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(154,221);ctx.quadraticCurveTo(179,233,208,220);ctx.stroke();
 ctx.fillStyle='#20283a';ctx.beginPath();ctx.arc(180,170+faceBounce,29,0,7);ctx.fill();
 ctx.fillStyle='rgba(255,182,112,'+(.12+.36*lightStrength)+')';ctx.beginPath();ctx.arc(180,170,29,Math.PI*.15,Math.PI*.85);ctx.lineTo(180,170);ctx.fill();ctx.beginPath();ctx.moveTo(142,315);ctx.quadraticCurveTo(147,205,180,199);ctx.quadraticCurveTo(217,207,220,315);ctx.fill();
 rr(162,229,36,86,6,'#e8d7c3');rr(167,237,8,68,4,'#fff0d8');ctx.fillStyle='#49363a';ctx.fillRect(179,216,3,18);
 ctx.beginPath();ctx.moveTo(x,235);ctx.bezierCurveTo(x-24,219,x-8,197-fireHeight/3,x+Math.sin(elapsed*2)*5,218-fireHeight);ctx.bezierCurveTo(x+23,198,x+17,227,x,235);ctx.fillStyle=health>14?'#ffad4c':'#93a0b7';ctx.fill();ctx.beginPath();ctx.moveTo(x,232);ctx.quadraticCurveTo(x-9,216,x,223-fireHeight*.3);ctx.quadraticCurveTo(x+9,220,x,232);ctx.fillStyle='#fff1bf';ctx.fill();
 // Personality is revealed through small expressive eyes rather than a large mascot face.
 if(health>6){
  const eyey=227-fireHeight*.43,blink=!motionReduced&&Math.sin(elapsed*1.9)>.993;
  ctx.fillStyle=character==='suffocating'?'#687386':'#714631';
  if(blink){ctx.fillRect(x-7,eyey,4,1.4);ctx.fillRect(x+3,eyey,4,1.4)}
  else{ctx.beginPath();ctx.ellipse(x-5,eyey,1.65,character==='afraid'?2.5:1.8,0,0,7);ctx.ellipse(x+5,eyey,1.65,character==='afraid'?2.5:1.8,0,0,7);ctx.fill()}
  ctx.strokeStyle='#81513b';ctx.lineWidth=1;
  ctx.beginPath();
  if(character==='afraid'||character==='suffocating')ctx.arc(x,eyey+7,2,0,Math.PI);
  else ctx.arc(x,eyey+5,4,.15*Math.PI,.85*Math.PI);
  ctx.stroke();
 }
 if(character==='hope'){
  for(let i=0;i<7;i++){
   const angle=i*2.4+elapsed*(motionReduced?0:1.1),radius=21+i*2;
   ctx.fillStyle='rgba(255,235,180,.65)';ctx.fillRect(x+Math.cos(angle)*radius,215+Math.sin(angle)*radius,2.3,2.3);
  }
 }
 if(shield){ctx.fillStyle='rgba(238,177,139,'+(.23+.5*lightStrength)+')';ctx.beginPath();ctx.ellipse(132,236,27,76,-.32,0,7);ctx.fill();ctx.beginPath();ctx.ellipse(228,236,27,76,.32,0,7);ctx.fill()}
 if(s.mote){const m=s.mote,pulse=1+Math.sin(elapsed*5)*.18;ctx.save();ctx.translate(m.x,m.y);ctx.scale(pulse,pulse);const glow=ctx.createRadialGradient(0,0,1,0,0,31);glow.addColorStop(0,'rgba(255,235,180,.95)');glow.addColorStop(1,'rgba(255,193,104,0)');ctx.fillStyle=glow;ctx.fillRect(-34,-34,68,68);textAt('✦',0,7,'bold 24px system-ui','#fff0bf');ctx.restore();textAt('記憶にふれる',m.x,m.y+42,'bold 10px system-ui','#fff1cf')}
 const meter=(label,value,y,color)=>{textAt(label,24,y,'bold 10px system-ui','#e5e7ec','left');rr(24,y+8,132,7,4,'#263247');rr(24,y+8,132*Math.max(0,value)/100,7,4,color)};
 meter('灯り',health,18,'#ffb15b');meter('息',s.oxygen===undefined?100:s.oxygen,43,'#a4cee2');
 const pips=3;for(let i=0;i<pips;i++){ctx.strokeStyle='#eacb91';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(312+i*16,31,5,0,7);ctx.stroke();if(i<(s.memories||0)){ctx.fillStyle='#ffd98d';ctx.beginPath();ctx.arc(312+i*16,31,3.2,0,7);ctx.fill()}}
 const warning=wind>.61&&!shield?'風が来る — 長押し':'凪いでいる — 息を戻す';if(mode==='play')$('hint').textContent=shield?(wind<.44||s.oxygen<28?'風が弱まった — いま離して':'灯りをかばっている'):warning;textAt(shield?'手の中で守っている':warning,180,370,'bold 13px system-ui',wind>.61?'#ffd39a':'#d6e0eb');textAt('家まで '+Math.max(0,Math.ceil((1-progress)*100))+'m',180,390,'11px system-ui','#bac8d6');
}
function tick(now){let dt=last?Math.min((now-last)/1000,.035):0;last=now;if(mode==='play'&&$('collection-panel').hidden){elapsed+=dt*(candle?(state.qaSpeed||1):1);if(!candle)timer.textContent='00:'+String(Math.floor(elapsed)).padStart(2,'0')}else if(!$('collection-panel').hidden){dt=0}if(slug==='girigiri')drawG(dt);else if(slug==='ato-hitotsu')drawStack(dt);else if(slug==='kienaide')drawCandle(dt);else if(state.micro)window.EmotionMissions.frame(ctx,state.micro,elapsed,dt,finish);else drawDoor(dt);raf=requestAnimationFrame(tick)}
raf=requestAnimationFrame(tick);
})();
