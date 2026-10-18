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
  {id:'blown',title:'風にさらわれた。',desc:'炎の精は風に消え、家へ届けられなかった。少女は暗い雪道にひとり残された。',hint:'風の予兆を見落とすと…'},
  {id:'smother',title:'守りすぎた。',desc:'風から守り続けた代わりに少女の息が尽き、旅はそこで終わった。守るだけでは、ふたりとも帰れない。',hint:'強く守り続けるだけでは届かない'},
  {id:'wish',title:'わすれない。',desc:'三つの記憶は取り戻したが、炎は家へ届く前に消えた。約束だけが、次の夜への道しるべになった。',hint:'道に浮かぶ三つの記憶に触れる'},
  {id:'survive',title:'まだ、ここに。',desc:'炎の精を家まで届けた。しかし失った記憶が残り、窓の向こうで待つ相手を思い出せなかった。',hint:'炎と呼吸を残して夜を越える'},
  {id:'dawn',title:'おかえり。',desc:'三つの記憶と炎の精を家まで届けた。待っていた誰かが窓を開け、「おかえり」と迎えた。',hint:'記憶を集め、明るい炎のまま届ける'}
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
if(slug==='kienaide'){const unique=[...new Set(collected)];if(unique.length!==collected.length){collected=unique;try{localStorage.setItem('emotion-endings-v1-'+slug,JSON.stringify(collected))}catch(_){}}}
if(slug==='kienaide')try{const raw=JSON.parse(localStorage.getItem('kienaide-art-endings-v1')||'[]');if(Array.isArray(raw)){const merged=[...new Set([...collected,...raw.filter(id=>endingList.some(e=>e.id===id))])];if(merged.length!==collected.length){collected=merged;localStorage.setItem('emotion-endings-v1-'+slug,JSON.stringify(collected))}}}catch(_){}
let lastEnding='';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mark(event,data){try{window.emotionTrack?.(event,{game_id:slug,...data})}catch(_){}}
function currentUrl(){const u=new URL(location.href);for(const x of ['utm_source','utm_medium','utm_campaign','utm_content','study',...(slug==='kienaide'?['qa','seed','speed','t','mem','vital']:[])])u.searchParams.delete(x);return u.href}
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
const landscapeMode=candle?window.matchMedia('(orientation: landscape) and (max-height: 500px)'):null;
if(candle)document.body.insertAdjacentHTML('beforeend','<div class="orientation-notice" role="status" aria-live="polite"><span aria-hidden="true">↻</span><strong>縦向きに戻してね</strong><p>この旅は縦画面で遊べるように作られています。向きを戻すと、続きから再開します。</p></div>');
root.innerHTML=top()+'<main class="game-shell '+game.theme+'" style="--tone:'+esc(game.accent||'#e9a76f')+'"><div class="game-heading"><div class="label">EMOTION '+game.number+' <span>/ '+game.emotion+'</span></div><h1>'+game.title+'</h1><p>'+game.subtitle+'</p></div><div class="hud"><div><small>'+(candle?'LIGHT':'RECORD')+'</small><strong id="record">—</strong></div><div><small>'+(candle?'MEMORY':'BEST')+'</small><strong id="best">'+(candle?'0 / 3':'—')+'</strong></div><div><small>'+(candle?'DAWN':'TIME')+'</small><strong id="timer">'+(candle?'01:30':'00:00')+'</strong></div></div><div class="collect-bar"><span id="collection-progress" aria-live="polite"></span><button id="open-collection" type="button">結末図鑑を見る ↗</button></div><div class="arena"><canvas id="stage" width="360" height="400" aria-label="'+game.title+' のゲーム画面"></canvas>'+(candle?'<p class="sr-only" id="memory-live" aria-live="polite"></p><div class="story-beat" id="story-beat" role="status" aria-live="polite"><small>第一章　雪の路地</small><strong>窓の灯りが、帰り道の目印だった。</strong></div><button class="sound-toggle" id="sound-toggle" type="button" aria-pressed="true">音 ON</button>':'')+'<div class="curtain" id="curtain"><span class="eyebrow" id="curtain-kicker">'+(candle?'A SHORT NIGHT JOURNEY':'ONE IDEA GAME')+'</span><h2 id="curtain-title">'+game.title+'</h2><p id="curtain-description">'+(candle?'吹雪の町を歩き、たったひとつの灯りを家まで届ける。風の線が強くなったら長押しでかばい、凪いだら離して呼吸を戻そう。':game.mechanic)+'</p>'+(candle?'<div class="ending-meaning" id="ending-meaning" hidden><small>この結末になった理由</small><strong id="ending-outcome"></strong><span id="ending-reason"></span></div>':'')+'<div class="discovery-result" id="discovery-result" role="status" aria-live="polite" hidden><span class="discovery-glyph" aria-hidden="true">✦</span><span class="discovery-info"><strong id="discovery-state">NEW ENDING</strong><small id="discovery-counter"></small><small id="discovery-milestone"></small></span><span class="discovery-sparks" aria-hidden="true">✧ ✦ ✧</span></div>'+(candle?'<p class="next-hint" id="next-hint" hidden></p>':'')+'<button class="btn'+(candle?' art-start':'')+'" id="play">'+(candle?'はじめる':'プレイ開始 →')+'</button><button class="share-btn" id="share" hidden>結果をXで共有 ↗</button>'+(candle?'<button class="moment-save" id="moment-save" type="button" hidden>結末カードを保存・共有 ↗</button>':'')+''+(candle?'<label class="volume-row">音量<input id="volume" type="range" min="0" max="100" step="5" aria-label="音量"></label>':'')+'<a class="related" id="related" href="'+('../'+games[(games.findIndex(g=>g.slug===slug)+1)%games.length].slug+'/')+'" hidden>次のゲームを遊ぶ →</a></div><section class="collection-panel" id="collection-panel" hidden role="dialog" aria-modal="true" aria-label="結末図鑑"><div class="collection-head"><strong>結末図鑑</strong><button id="close-collection" type="button">閉じる ✕</button></div><p>予想外の操作にも、結末が隠れている。</p><div class="collection-track" role="progressbar" aria-label="結末の回収率" aria-valuemin="0" aria-valuemax="5" aria-valuenow="0"><span id="collection-track-fill"></span></div><ol id="collection-list"></ol><div id="collection-awards"></div></section></div><div class="play-controls"><p id="hint">'+(slug==='girigiri'?'長押しで注ぐ。離すと落下中の水が残る。':slug==='ato-hitotsu'?'タイミングよく落として高く積もう。':candle?'風が強まったら長押し。凪いだら離して、息を戻す。':window.EmotionMissions?.endings[slug]?game.mechanic:'指を離したら扉が開いてしまう。')+'</p><button class="action'+(candle?' art-hold':'')+'" id="action" disabled>'+(candle?'<span class="action-cue">凪いでいる — 息を戻す</span><span class="action-main"><i aria-hidden="true"></i><b>押さえる</b><em>灯りを守る</em></span>':slug==='girigiri'?'長押しで注ぐ':slug==='ato-hitotsu'?'ここで落とす！':window.EmotionMissions?.endings[slug]?({timing:'ここで止める！',balance:'長押しで調節',rhythm:'リズムをタップ！',choice:'左を選ぶ（右は画面）'}[game.theme]):'扉を押さえ続ける')+'</button><div class="controls-bottom"><button id="reset">最初から</button><a href="../">ゲーム一覧へ</a><a href="https://x.com/toriihiroki4649" target="_blank" rel="noopener noreferrer">新作を見る ↗</a></div></div></main>';
const canvas=document.getElementById('stage'),ctx=canvas.getContext('2d'),curtain=document.getElementById('curtain'),action=document.getElementById('action');
const $=id=>document.getElementById(id),record=$('record'),best=$('best'),timer=$('timer');
if(candle){
 document.body.classList.add('kienaide-title-screen');
 curtain.classList.add('journey-title');
 $('curtain-kicker').textContent='EMOTION 04　/　切なさ';
 $('curtain-description').innerHTML=guidanceMarkup('吹雪の町を抜け、消えかけた灯りを家まで届けよう。');
 const hero=document.createElement('img');hero.className='journey-title-hero';hero.src=base+'assets/kienaide-v3/traveller-flame.webp';hero.alt='';hero.setAttribute('aria-hidden','true');curtain.prepend(hero);
 const note=document.createElement('p');note.className='journey-title-note';note.textContent='風から灯りを守る　・　3つの記憶を拾う　・　約90秒の旅';
 $('play').before(note);
 const startArt=document.createElement('img');startArt.src=base+'assets/kienaide-v3/start-button.webp';startArt.alt='';startArt.setAttribute('aria-hidden','true');
 const startLabel=document.createElement('span');startLabel.className='sr-only';startLabel.textContent='旅をはじめる';
 $('play').replaceChildren(startArt,startLabel);
 $('play').disabled=true;$('play').setAttribute('aria-busy','true');
 const loading=document.createElement('p');loading.id='journey-loading';loading.className='journey-loading';loading.setAttribute('role','status');loading.textContent='絵を準備しています…';curtain.append(loading);
}
function clearKienaideTitle(){if(!candle)return;document.body.classList.remove('kienaide-title-screen');curtain.classList.remove('journey-title');curtain.querySelectorAll('.journey-title-hero,.journey-title-note').forEach(el=>el.remove())}
const actionCue=candle?action.querySelector('.action-cue'):null,actionMain=candle?action.querySelector('.action-main b'):null,actionSub=candle?action.querySelector('.action-main em'):null;
let mode='intro',last=0,elapsed=0,answer='',points=0,high=0,down=false,raf=0;
let distancePanel=null,distanceValue=null,distanceFill=null,routePanel=null;
let candleDialog=null,candleInert=[];
let collectionFromMenu=false,journeyMenuAction='';
function focusCandleAction(){(action.disabled?$('journey-menu-open'):action).focus()}
function setCandleDialog(panel,open){
 if(!candle||(open&&candleDialog))return;
 if(open){holdRelease();candleDialog=panel;const isolate=parent=>{for(const el of parent.children){if(el===panel)continue;if(el.contains(panel))isolate(el);else{candleInert.push([el,el.inert]);el.inert=true}}};isolate(document.querySelector('.game-shell'))}
 else{if(candleDialog!==panel)return;for(const [el,inert] of candleInert)el.inert=inert;candleInert=[];candleDialog=null}
 panel.hidden=!open;
}
document.addEventListener('keydown',e=>{
 if(!candleDialog)return;
 if(e.key==='Escape'){e.preventDefault();if(candleDialog.id==='collection-panel')$('close-collection').click();else if(candleDialog.id==='journey-menu'){if(journeyMenuAction)showJourneyMenuConfirm('');else $('pause-resume').click()}}
 if(e.key==='Tab'){const buttons=[...candleDialog.querySelectorAll('button:not([disabled]),a[href],input:not([disabled])')].filter(el=>el.getClientRects().length);if(buttons.length){e.preventDefault();const i=buttons.indexOf(document.activeElement);buttons[(i+(e.shiftKey?-1:1)+buttons.length)%buttons.length].focus()}}
});
if(candle){
 distancePanel=document.createElement('div');distancePanel.className='distance-panel';distancePanel.id='distance-panel';distancePanel.setAttribute('aria-label','家までの距離');
 distancePanel.innerHTML='<div class="distance-label">家まで</div><strong id="distance-value">100</strong><span>m</span><div class="distance-track" aria-hidden="true"><i></i></div><p class="sr-only" id="vital-live" aria-live="polite"></p><span class="sr-only" id="light-meter" role="meter" aria-label="灯り" aria-valuemin="0" aria-valuemax="100" aria-valuenow="72"></span><span class="sr-only" id="breath-meter" role="meter" aria-label="息" aria-valuemin="0" aria-valuemax="100" aria-valuenow="100"></span>';
 const track=distancePanel.querySelector('.distance-track i');distanceValue=distancePanel.querySelector('strong');distanceFill=track;document.querySelector('.arena').append(distancePanel);
 const controls=document.querySelector('.play-controls');routePanel=document.createElement('section');routePanel.className='route-choice';routePanel.id='route-choice';routePanel.hidden=true;routePanel.setAttribute('aria-label','道を選ぶ');routePanel.setAttribute('role','dialog');routePanel.setAttribute('aria-modal','true');
 routePanel.innerHTML='<p>この先、道が分かれている。</p><div><button type="button" data-route="shortcut"><strong>吹雪の近道</strong><small>8秒早く・強風8秒</small></button><button type="button" data-route="rest"><strong>軒先でひと息</strong><small id="route-rest-effect"></small></button></div>';
 action.before(routePanel);
 routePanel.addEventListener('click',e=>{const btn=e.target.closest('[data-route]');if(!btn||!K.chooseRoute(state,btn.dataset.route,elapsed))return;setCandleDialog(routePanel,false);document.body.classList.remove('has-route-choice');const shortcut=btn.dataset.route==='shortcut';setStory(shortcut?'吹雪の坂へ':'軒先のあかり',''+(shortcut?'近道へ踏み出した。風が強まる。':'戸口が開いた。胸の奥まで、やっと息を吸えた。'));state.storyPause=elapsed+3;mark('route_selected',{route:btn.dataset.route,flame:Math.round(state.flame),oxygen:Math.round(state.oxygen)});focusCandleAction()});
 const menuButton=document.createElement('button');menuButton.id='journey-menu-open';menuButton.className='journey-menu-open';menuButton.type='button';menuButton.textContent='休む';menuButton.setAttribute('aria-label','旅を休止してメニューを開く');menuButton.setAttribute('aria-haspopup','dialog');document.querySelector('.arena').append(menuButton);
 const tools=document.createElement('div');tools.className='journey-tools';tools.append(menuButton,$('sound-toggle'));document.querySelector('.arena').append(tools);
 const menu=document.createElement('section');menu.id='journey-menu';menu.className='journey-menu';menu.hidden=true;menu.setAttribute('role','dialog');menu.setAttribute('aria-modal','true');menu.setAttribute('aria-labelledby','journey-menu-title');
 menu.innerHTML='<div class="journey-menu-card"><small>PAUSE / 旅は止まっています</small><h2 id="journey-menu-title">ひと息つこう。</h2><div id="pause-normal"><p class="pause-guide">'+guidanceMarkup('強い風は長押しでかばう。凪いだら手を離して息を戻す。光る記憶はタップで拾う。')+'</p><button type="button" id="pause-resume" class="pause-primary">旅を続ける</button><div class="pause-audio"><button type="button" id="pause-sound">音 ON</button><label>音量<input id="pause-volume" type="range" min="0" max="100" step="5" aria-label="休止中の音量"></label></div><button type="button" id="pause-collection">結末図鑑を見る</button><button type="button" data-pause-action="restart">この旅をやり直す</button><button type="button" data-pause-action="title">タイトルへ戻る</button></div><div id="pause-confirm" hidden><p id="pause-confirm-text"></p><button type="button" id="pause-cancel" class="pause-primary">今の旅を残す</button><button type="button" id="pause-confirm-action"></button></div></div>';
 document.querySelector('.game-shell').append(menu);
 menuButton.addEventListener('click',openJourneyMenu);
 $('pause-resume').addEventListener('click',()=>{setCandleDialog(menu,false);last=0;if(!document.hidden&&!landscapeMode.matches)KA.resume();focusCandleAction()});
 menu.querySelectorAll('[data-pause-action]').forEach(button=>button.addEventListener('click',()=>showJourneyMenuConfirm(button.dataset.pauseAction)));
 $('pause-cancel').addEventListener('click',()=>showJourneyMenuConfirm(''));
 $('pause-confirm-action').addEventListener('click',()=>{const next=journeyMenuAction;if(!next)return;if(next==='title'){mark('journey_exit',{elapsed:Math.round(elapsed)});location.assign('./');return}setCandleDialog(menu,false);last=0;mark('game_retry',{source:'pause-menu'});run();action.focus()});
 $('pause-collection').addEventListener('click',()=>{setCandleDialog(menu,false);collectionFromMenu=true;renderCollection();setCandleDialog($('collection-panel'),true);$('close-collection').focus()});
}
function showJourneyMenuConfirm(next){journeyMenuAction=next;$('pause-normal').hidden=!!next;$('pause-confirm').hidden=!next;$('journey-menu-title').textContent=next?'今の旅を終えますか？':'ひと息つこう。';if(next){$('pause-confirm-text').innerHTML=guidanceMarkup('途中の記憶と進行は引き継ぎません。発見済みの結末は残ります。');$('pause-confirm-action').textContent=next==='restart'?'新しい旅をはじめる':'タイトルへ戻る';$('pause-cancel').focus()}else $('pause-resume').focus()}
function openJourneyMenu(){if(mode!=='play'||candleDialog)return;setCandleDialog($('journey-menu'),true);showJourneyMenuConfirm('');last=0;KA.suspend()}
try{high=Number(localStorage.getItem('emotion-v1-'+slug))||0}catch(_){}if(!candle)best.textContent=high?String(high):'—';
const state={};
// 004 uses dedicated modules: rules (kienaide-core.js), layered art (kienaide-view.js), sound (kienaide-audio.js).
const K=candle?window.KienaideCore:null,KV=candle?window.KienaideView.create(base):null,KA=candle?window.KienaideAudio.create():null;
if(candle){
 const titleImages=[...curtain.querySelectorAll('img')].map(img=>img.decode().then(()=>true,()=>false));
 Promise.all([KV.loaded,...titleImages]).then(results=>{const play=$('play');play.disabled=false;play.removeAttribute('aria-busy');if(results.every(Boolean))$('journey-loading').remove();else{$('journey-loading').textContent='絵を読み込めませんでした。通信を確認して読み直してください。';play.dataset.loadFailed='1';play.textContent='読み直す ↻'}});
}
const params=new URLSearchParams(location.search),qa=candle&&params.has('qa');
const reducedMotion=()=>!!window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
let endingAt=0,runCount=0;
function guidanceMarkup(text){return text.split(/(?<=[、。])|(?<= — )/u).map(part=>'<span class="guidance-phrase">'+esc(part)+'</span>').join('')}
function setStory(chapter,text){
 if(!candle)return;const el=$('story-beat');if(!el||state.story===chapter)return;state.story=chapter;el.classList.remove('show');void el.offsetWidth;el.innerHTML='<small>'+esc(chapter)+'</small><strong>'+guidanceMarkup(text)+'</strong>';el.classList.add('show');
}
if(candle){
 const sounds=[$('sound-toggle'),$('pause-sound')],volumes=[$('volume'),$('pause-volume')];
 const paint=()=>{const supported=!!(window.AudioContext||window.webkitAudioContext);for(const sound of sounds){sound.disabled=!supported;sound.setAttribute('aria-pressed',String(supported&&!KA.muted));sound.textContent=!supported?'音 非対応':KA.muted?'音 OFF':'音 ON'}for(const vol of volumes){vol.disabled=!supported;vol.value=String(Math.round((KA.muted?0:KA.volume)*100))}};
 const prepare=()=>{KA.init();if(candleDialog)KA.suspend();else KA.resume()};
 for(const sound of sounds)sound.addEventListener('click',()=>{prepare();KA.setMuted(!KA.muted);paint();mark('sound_toggle',{muted:KA.muted})});
 for(const vol of volumes)vol.addEventListener('input',()=>{prepare();KA.setVolume(Number(vol.value)/100);if(Number(vol.value)===0)KA.setMuted(true);paint()});
 paint();
 // Background tabs must not keep playing or double the timers when they come back.
 document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden)KA.suspend();else if((mode==='play'||mode==='intro')&&candleDialog?.id!=='journey-menu'&&!collectionFromMenu)KA.resume()});
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
  g.save();g.beginPath();g.roundRect(box.x,box.y,box.w,box.h,25);g.clip();{const cw=canvas.width,ch=canvas.height,k=Math.max(box.w/cw,box.h/ch),sw=box.w/k,sh=box.h/k;g.drawImage(canvas,(cw-sw)/2,(ch-sh)/2,sw,sh,box.x,box.y,box.w,box.h)}g.restore();
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
$('open-collection').addEventListener('click',()=>{renderCollection();if(candle)setCandleDialog($('collection-panel'),true);else $('collection-panel').hidden=false;$('close-collection').focus();mark('collection_open')});
$('close-collection').addEventListener('click',()=>{ if(candle)setCandleDialog($('collection-panel'),false);else $('collection-panel').hidden=true;if(collectionFromMenu){collectionFromMenu=false;openJourneyMenu();return}if(candle&&mode==='play')focusCandleAction();else $('open-collection').focus()});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&!candle)$('collection-panel').hidden=true});
canvas.addEventListener('click',e=>{
 if(mode!=='play'||(candle&&(candleDialog||document.hidden||landscapeMode.matches)))return;
 const s=state;
 if(slug==='micha-dame'){if(!s.knocks||elapsed-s.knockTime>1.3)s.knocks=0;s.knocks++;s.knockTime=elapsed;if(s.knocks>=3)finish('knock',75)}
 if(state.micro){const box=canvas.getBoundingClientRect();const x=(e.clientX-box.left)*360/box.width,y=(e.clientY-box.top)*400/box.height;window.EmotionMissions.canvasTap(state.micro,x,y,elapsed,finish)}
 if(slug==='kienaide'){
  const p=KV.toWorld(canvas,e.clientX,e.clientY),m=s.mote;
  if(!m||Math.hypot(p.x-m.u*KV.view.W,p.y-m.y)>40)return;
  if(!K.collect(s,m.id))return;
  s.storyPause=elapsed+4;best.textContent=s.memories+' / 3';KA.cues.memory(s.memories);mark('memory_collected',{memory_id:m.id,count:s.memories});
  setStory(m.title,m.line);
 }
});

function store(n){if(n<=high)return;high=n;if(!candle)best.textContent=String(high);try{localStorage.setItem('emotion-v1-'+slug,String(high))}catch(_){}}
function candleEndingMeaning(id,s){const flame=Math.max(0,Math.round(s.flame||0)),mem=s.memories||0;return {
 blown:{outcome:'炎の精を、家へ届けられなかった',reason:'灯り 0%　風の中で手を離していた'},
 smother:{outcome:'少女の息が尽き、旅を続けられなかった',reason:'息 0%　長くかばい続けて呼吸を失った'},
 wish:{outcome:'記憶は戻ったが、灯りは届かなかった',reason:'記憶 3 / 3　灯り '+flame+'%　家へ届くには弱かった'},
 survive:{outcome:'炎の精は届いたが、大切な記憶が欠けていた',reason:'記憶 '+mem+' / 3　灯り '+flame+'%　道の記憶を取りこぼした'},
 dawn:{outcome:'記憶も灯りも、待つ人のもとへ届いた',reason:'記憶 3 / 3　灯り '+flame+'%　ふたりで夜を越えた'}
 }[id]||{outcome:'夜はひとつの結末を迎えた',reason:'あなたの操作が、この夜を選んだ'}}
function renderCandleEndingMeaning(){if(!candle)return;const el=$('ending-meaning');if(!lastEnding){el.hidden=true;return}const m=candleEndingMeaning(lastEnding,state);$('ending-outcome').textContent=m.outcome;$('ending-reason').textContent=m.reason;el.hidden=false}
function display(title,description,kicker='YOUR RESULT'){mode='end';if(candle){clearKienaideTitle();document.body.classList.remove('kienaide-playing')}down=false;$('collection-panel').hidden=true;action.disabled=true;curtain.classList.remove('hidden');$('curtain-kicker').textContent=kicker;$('curtain-title').textContent=title;if(candle)$('curtain-description').innerHTML=guidanceMarkup(description);else $('curtain-description').textContent=description;$('play').textContent=candle?'もう一度、夜を歩く ↻':'もう一度遊ぶ ↻';$('play').classList.remove('art-start');$('share').hidden=false;$('related').hidden=false;if(candle){renderCandleEndingMeaning();$('moment-save').hidden=false;$('story-beat').classList.remove('show');$('hint').textContent='夜の記憶は、結末図鑑に残った。';candleEnding()}answer=title;mark('game_complete',{score:points,ending_id:lastEnding,outcome:points>0?'success':'lose',memories:state.memories||0,chapter:state.chapter||0,miracle:!!state.rescue,lowest_flame:state.lowestFlame??null})}
function run(){mode='play';if(candle){if(candleDialog)setCandleDialog(candleDialog,false);clearKienaideTitle();document.body.classList.add('kienaide-playing');document.body.classList.remove('has-route-choice');routePanel.hidden=true;distanceValue.textContent='100';distanceFill.style.width='0%'}curtain.classList.remove('found-new');$('discovery-result').hidden=true;if(candle)$('ending-meaning').hidden=true;down=false;elapsed=0;points=0;answer='';lastEnding='';$('collection-panel').hidden=true;record.textContent='0';action.disabled=false;curtain.classList.add('hidden');Object.keys(state).forEach(x=>delete state[x]);if(slug==='girigiri')Object.assign(state,{fill:0,drips:[],spawner:0,pour:false,stopping:null,spill:0,started:false});if(slug==='ato-hitotsu')Object.assign(state,{tower:[{x:72,y:340,w:216}],moving:{x:0,y:316,w:216},velocity:158,level:0,streak:0,lastDrop:-1});if(slug==='micha-dame')Object.assign(state,{hold:false,held:0,eyes:0,failed:false,knocks:0,knockTime:-1,started:false});if(slug==='kienaide')startCandle();if(window.EmotionMissions?.endings[slug])state.micro=window.EmotionMissions.makeState(slug);mark('game_start');$('hint').textContent=state.micro?game.mechanic:(slug==='girigiri'?'注ぐのを止めるタイミングを見極めろ':slug==='ato-hitotsu'?'タップしてブロックを落とす':slug==='kienaide'?'風の線が濃くなったら長押し。凪いだら離す。':'長押しで扉を押さえろ')}
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
// The first journey starts with the prologue「最後の灯り」(about 19 s). It can be skipped at any time and
// is skipped automatically on later plays. Audio starts only because the player pressed Play.
const introKey='emotion-kienaide-intro-v1';
let introRaf=0;
function showKienaideIntro(){
 if(!candle)return run();
 clearKienaideTitle();
 let seen=false;try{seen=localStorage.getItem(introKey)==='1'}catch(_){}
 if(seen)return run();
 KA.init();KA.resume();
 const overlay=document.createElement('div');overlay.id='kienaide-intro';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','導入　最後の灯り');
 const stage=document.createElement('canvas');stage.setAttribute('aria-hidden','true');
 const line=document.createElement('p');line.className='intro-line';line.setAttribute('aria-live','polite');
 const skip=document.createElement('button');skip.type='button';skip.textContent='スキップして遊ぶ';
 overlay.append(stage,line,skip);document.body.append(overlay);setCandleDialog(overlay,true);
 const iv=window.KienaideView.create(base),g=stage.getContext('2d'),reduced=reducedMotion(),speed=qa?6:1;
 let t0=0,hiddenAt=0,introTime=0,wasHidden=false,finished=false,shown='';const voiced=[0,0];
 const done=()=>{if(finished)return;finished=true;cancelAnimationFrame(introRaf);setCandleDialog(overlay,false);overlay.remove();try{localStorage.setItem(introKey,'1')}catch(_){}mark('intro_end',{skipped:introTime<iv.INTRO_LENGTH});run()};
 skip.addEventListener('click',done,{once:true});
 overlay.addEventListener('keydown',e=>{if(e.key==='Escape')done()});
 const loop=now=>{if(finished)return;if(!t0)t0=now;const paused=document.hidden||landscapeMode?.matches;if(paused&&!wasHidden){hiddenAt=now;wasHidden=true}else if(!paused&&wasHidden){t0+=now-hiddenAt;wasHidden=false}const t=((wasHidden?hiddenAt:now)-t0)/1000*speed;introTime=t;iv.resize(stage);iv.introFrame(g,t,{reduced});
  const cur=[...iv.INTRO].reverse().find(l=>t>=l.at);if(cur&&cur.text!==shown){shown=cur.text;line.textContent=cur.text}
  KA.ambient(t<11?.02:.32,t<8?Math.min(1,t/3)*.8:.4);if(!voiced[0]&&t>=5){voiced[0]=1;KA.cues.voice()}if(!voiced[1]&&t>=14.7){voiced[1]=1;KA.cues.voice()}
  if(t>=iv.INTRO_LENGTH)return done();introRaf=requestAnimationFrame(loop)};
 introRaf=requestAnimationFrame(loop);skip.focus({preventScroll:true});mark('intro_start');
}
$('play').addEventListener('click',()=>{if(candle&&$('play').dataset.loadFailed){location.reload();return}if(mode==='end'){mark('game_retry');run()}else if(candle)showKienaideIntro();else run()});
$('reset').addEventListener('click',()=>{if(mode!=='intro')mark('game_retry');run()});
$('share').addEventListener('click',()=>share(points?points+'点':''));
let candlePointer=null,candleKey=null;
function releaseCandleInput(){const pointer=candlePointer;candlePointer=null;candleKey=null;if(pointer!==null&&action.hasPointerCapture?.(pointer))action.releasePointerCapture(pointer)}
function holdRelease(){if(!down)return;down=false;if(candle)releaseCandleInput();if(mode!=='play')return;if(slug==='girigiri'&&state.pour){state.pour=false;state.stopping=elapsed}if(slug==='micha-dame'){state.hold=false;if(state.held<12)finish(state.held>=5.5?'whisper':'peek',0)}if(slug==='kienaide'){state.shield=false;KA.cues.shield(false)}if(state.micro)window.EmotionMissions.up(state.micro)}
landscapeMode?.addEventListener('change',e=>{if(e.matches)holdRelease()});
action.addEventListener('pointerdown',e=>{if(mode!=='play'||down||e.button!==0||(candle&&(landscapeMode.matches||candleDialog||document.hidden)))return;e.preventDefault();down=true;if(candle)candlePointer=e.pointerId;action.setPointerCapture?.(e.pointerId);if(slug==='girigiri'){state.pour=true;state.started=true}if(slug==='micha-dame'){state.hold=true;state.started=true}if(slug==='kienaide'){state.shield=true;KA.init();KA.resume();KA.cues.shield(true)}if(state.micro)window.EmotionMissions.down(state.micro,elapsed)});
const pointerRelease=e=>{if(!candle||e.pointerId===candlePointer)holdRelease()};
action.addEventListener('pointerup',pointerRelease);action.addEventListener('pointercancel',pointerRelease);
if(candle){
 action.addEventListener('lostpointercapture',pointerRelease);
 window.addEventListener('pointerup',pointerRelease);window.addEventListener('pointercancel',pointerRelease);
 // Some WebKit versions defer lostpointercapture; the next owner move is a fallback.
 window.addEventListener('pointermove',e=>{if(e.pointerId===candlePointer&&!action.hasPointerCapture?.(e.pointerId))holdRelease()});
}
action.addEventListener('click',()=>{if(mode!=='play')return;if(slug==='ato-hitotsu')drop();if(state.micro)window.EmotionMissions.tap(state.micro,elapsed,finish)});
window.addEventListener('blur',holdRelease);document.addEventListener('visibilitychange',()=>{if(document.hidden)holdRelease()});
action.addEventListener('contextmenu',e=>e.preventDefault());
// Keyboard play for 004: hold Space/Enter on the button to shield, M (or Enter on the scene) to touch a memory.
if(candle){
 const press=e=>{if((e.key===' '||e.key==='Enter')&&!e.repeat&&mode==='play'&&!down&&!action.disabled&&!candleDialog&&!document.hidden&&!landscapeMode.matches){e.preventDefault();down=true;candleKey=e.key;state.shield=true;KA.init();KA.resume();KA.cues.shield(true)}};
 const lift=e=>{if(e.key===candleKey){e.preventDefault();holdRelease()}};
 action.addEventListener('keydown',press);document.addEventListener('keyup',lift);
 action.addEventListener('blur',()=>{if(candleKey!==null)holdRelease()});
 const touchMemory=()=>{const s=state,m=s.mote;if(mode!=='play'||candleDialog||document.hidden||landscapeMode.matches||!m||!K.collect(s,m.id))return;s.storyPause=elapsed+4;best.textContent=s.memories+' / 3';KA.cues.memory(s.memories);mark('memory_collected',{memory_id:m.id,count:s.memories,input:'key'});setStory(m.title,m.line)};
 canvas.tabIndex=0;canvas.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();touchMemory()}});
 document.addEventListener('keydown',e=>{if((e.key==='m'||e.key==='M')&&!e.repeat)touchMemory()});
}
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

let lastShield=false;
function startCandle(){
 releaseCandleInput();KA.init();KA.resume();KA.startJourney();runCount++;
 const seed=qa?(Number(params.get('seed'))||1):((Date.now()^runCount*2654435761)>>>0);
 Object.assign(state,K.create({seed}),{qaSpeed:qa?(Number(params.get('speed'))||12):1});if(qa&&params.get('vital')==='flame')state.flame=18;if(qa&&params.get('vital')==='breath')state.oxygen=16;lastShield=false;endingAt=0;
 if(qa&&params.has('mem')){for(const m of state.slots.slice(0,Math.min(3,Number(params.get('mem'))||0)))state.memoryGot.add(m.id);state.memories=state.memoryGot.size}
 if(qa&&params.has('t')){elapsed=Math.max(0,Math.min(89,Number(params.get('t'))||0));state.chapter=state.previousChapter=K.chapterAt(elapsed)}
 $('moment-save').hidden=true;$('next-hint').hidden=true;delete canvas.dataset.ending;$('story-beat').hidden=false;curtain.classList.remove('tableau');best.textContent=state.memories+' / 3';
 setStory(K.CHAPTERS[0].label,K.CHAPTERS[0].line);action.focus({preventScroll:true});
}
// Turn simulation events into story beats, sound and analytics.
function candleEvents(list){
 const s=state;
 for(const e of list){
  if(e.type==='chapter'){mark('chapter_reached',{chapter:e.chapter+1});KA.cues.chapter()}
  if(e.type==='event'){mark('wind_event',{kind:e.event.kind});KA.cues.event(e.event.kind);if(e.event.kind==='gust'||e.event.kind==='eddy')navigator.vibrate?.(40);setStory(e.event.label,e.event.tip);s.storyPause=elapsed+3}
  if(e.type==='route-choice'){holdRelease();lastShield=false;$('route-rest-effect').textContent='8秒遅く・息+'+Math.min(28,Math.round(100-s.oxygen))+'%';setCandleDialog(routePanel,true);document.body.classList.add('has-route-choice');setStory('分かれ道','吹雪の坂を急ぐか、灯りを借りて休むか。');requestAnimationFrame(()=>routePanel.querySelector('button')?.focus())}
  if(e.type==='shelter'){mark('shelter_discovered',{chapter:2});setStory('風のトンネル　建物の陰','風が止まった。息を取り戻すなら今。');s.storyPause=elapsed+3}
  if(e.type==='foreshadow'){setStory('夜明け前　小さな予感','向こうの窓が、こちらの灯りを見ている。');s.storyPause=elapsed+4;mark('rescue_foreshadowed',{flame:Math.round(s.flame)})}
  if(e.type==='miracle'){s.storyPause=elapsed+6;setStory('夜明け前　窓の向こう','手を離した瞬間、あの窓から光が返ってきた。');KA.cues.miracle();mark('miracle_triggered',{memories:s.memories,lowest_flame:Math.round(s.lowestFlame)})}
  if(e.type==='finale'){
   if(e.phase==='gust-warning'){setStory('最後の風','風が変わる。次の一息に備えて。');s.storyPause=elapsed+2;KA.cues.gustWarning();navigator.vibrate?.([30,60,30]);mark('finale_warning',{})}
   if(e.phase==='gust-active'){setStory('最後の風','守るか、息を残すか。');s.storyPause=elapsed+5;mark('finale_gust',{})}
   if(e.phase==='silence'){setStory('静寂','風の音が、消えた。手をひらいて。');s.storyPause=elapsed+1.5;mark('finale_silence',{flame:Math.round(s.flame),oxygen:Math.round(s.oxygen)})}
  }
  if(e.type==='reply'){const text={bright:'ひらいた手の灯りに、窓が光で答えた。',faint:'遠い窓が、かすかに光った。',dark:'窓は、まだ暗い。'}[e.level];setStory('窓の向こう',text);s.storyPause=elapsed+3;KA.cues.reply(e.level);mark('finale_window',{level:e.level,flame:Math.round(s.flame),gust_shield:+s.gustShield.toFixed(1),silence_release:+s.silenceRelease.toFixed(1)})}
  if(e.type==='end'){timer.textContent=e.ending==='blown'||e.ending==='smother'?timer.textContent:'00:00';finish(e.ending,e.ending==='blown'||e.ending==='smother'?0:K.score(s));return}
 }
}
function candleCaption(s){
 const ev=s.event;
 if(s.oxygen<=22)return ['息が危ない — 手をはなして',true];
 if(s.flame<=20)return ['灯りが消えそう — 風からかばって',true];
 if(s.finalePhase==='gust-warning')return ['最後の風が来る — 長押しの準備',true];
 if(s.finalePhase==='gust-active')return [s.shield?'かばっている — 耐えて':'大突風 — 長押しでかばって',true];
 if(s.finalePhase==='silence')return [s.shield?'静かになった — いま離して':'手をひらいて、窓に灯りを見せて',false];
 if(s.finalePhase==='window-reply')return [s.reply>0?'窓が答えている':'あと少し',false];
 if(ev&&elapsed<ev.at)return [ev.tip,true];
 if(ev?.kind==='eddy'&&s.shield&&elapsed>=ev.at+1)return ['渦がほどけた — いま離して',false];
 if(ev?.kind==='eddy'&&s.eddyReleasedEvent===ev.id)return ['渦の隙間 — 息を整える',false];
 if(ev?.kind==='eddy'&&!s.shield&&elapsed>=ev.at)return ['渦風 — 一瞬かばって',true];
 if(s.shield)return [s.wind<.44||s.oxygen<28?'風が弱まった — いま離して':'灯りをかばっている',false];
 if(ev&&(ev.kind==='lull'||ev.kind==='lantern'))return [ev.tip,false];
 return s.wind>.5&&s.flame<60&&s.memories===2?['風が来る — 長押し',true]:s.wind>.61?['風が来る — 長押し',true]:['凪いでいる — 息を戻す',false];
}
function drawCandle(dt){
 const s=state;KV.resize(canvas);
 if(mode==='end'&&lastEnding){KV.endingFrame(ctx,s,lastEnding,(performance.now()-endingAt)/1000,{reduced:reducedMotion()});const fa=KV.flameAnchor(),fc=KV.toCss(fa.x,fa.y);canvas.dataset.flame=Math.round(fc.x)+','+Math.round(fc.y);return}
 if(mode!=='play'||!s.events){KV.frame(ctx,s.events?s:K.create({seed:1}),elapsed,{reduced:reducedMotion(),playing:false,caption:'',expression:'calm'});return}
 const paused=!!(document.hidden||landscapeMode.matches||candleDialog||s.routeChoice==='pending'),step=paused?0:dt*(s.qaSpeed||1);
 const events=paused?[]:K.step(s,elapsed,step,{shield:!!s.shield,wasShield:lastShield});if(!paused)lastShield=s.shield;
 if(!paused&&s.routeChoice!=='pending'&&elapsed>(s.storyPause||0)&&s.finalePhase==='approach')setStory(K.CHAPTERS[s.chapter].label,K.CHAPTERS[s.chapter].line);
 candleEvents(events);if(mode!=='play')return;
 const [text,warn]=candleCaption(s);
 $('hint').textContent=text;
  const mainText=s.oxygen<=22?(s.shield?'はなす':'ひと休み'):s.shield?'はなす':'押さえる',subText=s.oxygen<=22?'手を離して息を戻す':s.shield?'息を戻す':'灯りを守る',disableHold=s.oxygen<=22&&!s.shield;
  if(actionCue.textContent!==text)actionCue.innerHTML=guidanceMarkup(text);if(actionMain.textContent!==mainText)actionMain.textContent=mainText;if(actionSub.textContent!==subText)actionSub.textContent=subText;if(action.disabled!==disableHold)action.disabled=disableHold;
  action.classList.toggle('is-held',!!s.shield);action.classList.toggle('is-warning',!!warn);
 const recordText=Math.max(0,Math.round(s.flame))+'%',remaining=Math.max(0,Math.ceil(s.journey-elapsed)),timerText=String(Math.floor(remaining/60)).padStart(2,'0')+':'+String(remaining%60).padStart(2,'0');if(record.textContent!==recordText)record.textContent=recordText;if(timer.textContent!==timerText)timer.textContent=timerText;
 for(const [id,value] of [['light-meter',s.flame],['breath-meter',s.oxygen]]){const meter=$(id),n=String(Math.max(0,Math.round(value)));if(meter.getAttribute('aria-valuenow')!==n){meter.setAttribute('aria-valuenow',n);meter.setAttribute('aria-valuetext',n+'パーセント')}}
 const distance=K.routeDistance(s,elapsed);if(state.displayDistance!==distance){state.displayDistance=distance;distanceValue.textContent=String(distance);distancePanel.setAttribute('aria-label','家まで '+distance+' メートル');distanceFill.style.width=(100-Math.min(100,distance))+'%'}
 const danger=K.vitalState(s);if(state.displayDanger!==danger){state.displayDanger=danger;canvas.dataset.danger=danger;
  action.classList.toggle('is-life-critical',danger==='flame-critical');action.classList.toggle('is-breath-critical',danger==='breath-critical');action.classList.toggle('is-vital-warning',danger.endsWith('warning'));distancePanel.dataset.danger=danger;
  if(state.vitalAlert!==danger){state.vitalAlert=danger;if(danger)$('vital-live').textContent=danger.startsWith('flame')?'灯りが危険な状態です。':'息が危険な状態です。';else if($('vital-live').textContent)$('vital-live').textContent='灯りと息が落ち着きました。'}
 }
 KA.update(s,elapsed,{playing:true,paused,dt:step,ended:false});
 KV.frame(ctx,s,elapsed,{reduced:reducedMotion(),playing:true,caption:text,warn,expression:K.flameExpression(s)});
 // Test/QA hooks: plain data attributes, no globals.
 const m=s.mote?KV.toCss(s.mote.u*KV.view.W,s.mote.y):null;
 if(s.mote&&s.announced!==s.mote.id){s.announced=s.mote.id;$('memory-live').textContent='記憶が浮かんでいる。タップかMキーでふれる。'}canvas.dataset.chapter=String(s.chapter+1);canvas.dataset.quality=String(KV.perf.quality);canvas.dataset.phase=s.finalePhase;canvas.dataset.event=s.event&&elapsed>=s.event.warnAt?s.event.kind:'';canvas.dataset.mote=m?Math.round(m.x)+','+Math.round(m.y):'';canvas.dataset.reply=s.replyLevel||'';const fa=KV.flameAnchor(),fc=KV.toCss(fa.x,fa.y);canvas.dataset.flame=Math.round(fc.x)+','+Math.round(fc.y);
}
// Each ending plays its own short scene before the result card slides in.
function candleEnding(){
 const s=state,reduced=reducedMotion();endingAt=performance.now();curtain.classList.add('hidden','tableau');canvas.dataset.ending=lastEnding;$('story-beat').hidden=true;
 KA.update(s,elapsed,{playing:false,dt:0,ended:true});KA.cues.ending(lastEnding);
 const missing=endingList.filter(e=>!collected.includes(e.id));
 $('next-hint').hidden=!missing.length;if(missing.length){const next=missing[(runCount+missing.length)%missing.length];$('next-hint').textContent='まだ見ぬ結末のヒント：'+next.hint}
 const token=endingAt;setTimeout(()=>{if(mode==='end'&&endingAt===token)curtain.classList.remove('hidden')},reduced?500:2600);
}
function tick(now){let dt=last?Math.min((now-last)/1000,.035):0;last=now;const orientationPaused=!!(candle&&(landscapeMode.matches||document.hidden));if(orientationPaused)dt=0;if(mode==='play'&&$('collection-panel').hidden){if(!(candle&&(state.routeChoice==='pending'||orientationPaused||candleDialog)))elapsed+=dt*(candle?(state.qaSpeed||1):1);if(!candle)timer.textContent='00:'+String(Math.floor(elapsed)).padStart(2,'0')}else if(!$('collection-panel').hidden){dt=0}if(slug==='girigiri')drawG(dt);else if(slug==='ato-hitotsu')drawStack(dt);else if(slug==='kienaide'){drawCandle(dt);if(mode==='play')KV.sample(dt*1000)}else if(state.micro)window.EmotionMissions.frame(ctx,state.micro,elapsed,dt,finish);else drawDoor(dt);raf=requestAnimationFrame(tick)}
raf=requestAnimationFrame(tick);
})();
