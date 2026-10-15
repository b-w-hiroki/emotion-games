(()=>{'use strict';
const root=document.getElementById('app'),slug=document.body.dataset.game||'',base=slug?'../':'./';
const games=[
{slug:'girigiri',title:'ぎりぎり。',emotion:'緊張',subtitle:'止めたあとも、水は落ちてくる。',mechanic:'指を離すタイミングがすべて。',theme:'aqua',number:'01',duration:'30秒'},
{slug:'ato-hitotsu',title:'あと1個。',emotion:'ハラハラ',subtitle:'まだ積める。たぶん。',mechanic:'動くブロックを、落とすだけ。',theme:'amber',number:'02',duration:'45秒'},
{slug:'micha-dame',title:'みちゃだめ。',emotion:'恐怖',subtitle:'扉の向こうを、見てはいけない。',mechanic:'12秒間、指を離さず耐えろ。',theme:'violet',number:'03',duration:'20秒'},
{slug:'kienaide',title:'きえないで。',emotion:'切なさ',subtitle:'小さな炎を、朝まで守れる？',mechanic:'風が強い時だけ長押し。守りすぎても消えてしまう。',theme:'ember',number:'04',duration:'20秒'}
];
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
  {id:'blown',title:'風にさらわれた。',desc:'風の音だけが残った。炎はもう戻らない。',hint:'風を受け続けると…'},
  {id:'smother',title:'守りすぎた。',desc:'囲い込んだぬくもりは、息ができなくなった。',hint:'離さず守り続けると？'},
  {id:'wish',title:'ひとつの願い。',desc:'炎にふれずに、願いだけを二度届けた。',hint:'燃えている炎にそっと触れてみる'},
  {id:'survive',title:'まだ、ここに。',desc:'夜の終わりまで、小さな光は残っていた。',hint:'風と呼吸を見ながら夜を越える'},
  {id:'dawn',title:'朝のぬくもり。',desc:'守った灯りが、夜明けの色と重なった。',hint:'炎をほとんど弱らせず朝まで守る'}
 ]
};

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
  three:{title:'消えなかった手紙',text:'かすかな光は、誰かの手の中で少しだけ長く生きた。'},
  all:{title:'灯火の守り人',text:'吹き消した風も、守りすぎた夜も。全部の炎を見届けた証。',symbol:'✺'}
 }
};
let collected=[];try{const raw=JSON.parse(localStorage.getItem('emotion-endings-v1-'+slug)||'[]');if(Array.isArray(raw))collected=raw.filter(id=>endingList.some(e=>e.id===id))}catch(_){}
let lastEnding='';

const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mark(event,data){try{window.emotionTrack?.(event,{game_id:slug,...data})}catch(_){}}
function currentUrl(){const u=new URL(location.href);for(const x of ['utm_source','utm_medium','utm_campaign','utm_content'])u.searchParams.delete(x);return u.href}
async function share(score){mark('share_tap',{ending_id:lastEnding});const ending=endingList.find(e=>e.id===lastEnding);const text=game.title+'｜'+(ending?ending.title:'')+' 【結末 '+collected.length+'/'+endingList.length+'】 '+(score?'記録 '+score+'。':'')+' あなたはどんな結末になる？';const url=currentUrl();if(navigator.share){try{await navigator.share({title:game.title,text,url});return}catch(e){if(e.name==='AbortError')return}}window.open('https://twitter.com/intent/tweet?'+new URLSearchParams({text,url}).toString(),'_blank','noopener,noreferrer')}

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
 root.innerHTML=top()+'<main class="home"><section class="hero"><p class="eyebrow">SMALL GAMES. BIG FEELINGS.</p><h1>感情を、<br><em>遊ぶ。</em></h1><p>ドキドキ。ハラハラ。ゾクッ。<br>たった数秒で、心が動く。</p><div class="hero-meta">'+games.length+' SHORT GAMES <span>•</span> FREE TO PLAY <span>•</span> NO LOGIN <span>•</span> ENDINGS <b>'+totalFound+' / '+totalEndings+'</b></div><div class="archive-progress" aria-label="全15結末の収集進捗"><div class="archive-progress-head"><span>COLLECT THE FEELINGS</span><strong>'+totalFound+'/'+totalEndings+'</strong></div><div class="archive-track"><span style="width:'+(totalFound/totalEndings*100)+'%"></span></div><p>'+(totalFound===totalEndings?'全'+totalEndings+'結末を発見。感情のアーカイブが完成しました。':'まだ見ぬ結末が、'+(totalEndings-totalFound)+'種類。')+'</p>'+(totalFound===totalEndings?'<div class="archive-award"><strong>✦ EMOTION ARCHIVIST</strong><span>'+totalEndings+'の感情をすべて見届けた証</span><button id="share-archive" type="button">コンプリートをXに共有 ↗</button></div>':'')+'</div></section><div class="section-head"><h2>どれから遊ぶ？</h2><span>PLAY IN SECONDS ↓</span></div><section class="cards">'+games.map(g=>'<a class="card '+g.theme+'" href="./'+g.slug+'/"><div class="card-art"><span class="art-icon">'+({girigiri:'◓','ato-hitotsu':'▤','micha-dame':'▯',kienaide:'✺'}[g.slug])+'</span><span class="art-num">'+g.number+'</span></div><div class="card-info"><span class="emotion">'+g.emotion+' / '+g.duration+' / 結末 '+collectionCount(g.slug)+'/5</span><h3>'+g.title+'</h3><p>'+g.mechanic+'</p><span class="card-cta">いま遊ぶ <b>↗</b></span></div></a>').join('')+'</section><section class="manifesto"><span>OUR CONCEPT</span><h2>感情が動く、その一瞬を。</h2><p>物語でも、物理でも、ホラーでも。プレイヤー自身の行動で心が動く体験を作ります。</p></section></main><footer class="foot"><a href="https://x.com/toriihiroki4649">Follow @toriihiroki4649 ↗</a><a href="./privacy.html">プライバシー</a><span>© birdman studio</span></footer>';
 if(totalFound===totalEndings){document.getElementById('share-archive').addEventListener('click',()=>{mark('series_completion_share_tap',{found_count:totalEndings});openShare('Emotion Games 全'+totalEndings+'結末をコンプリート。「感情を、遊ぶ。」あなたは何個見つけられる？','Emotion Games｜全'+totalEndings+'結末コンプリート')})}
 return;
}
root.innerHTML=top()+'<main class="game-shell '+game.theme+'"><div class="game-heading"><div class="label">EMOTION '+game.number+' <span>/ '+game.emotion+'</span></div><h1>'+game.title+'</h1><p>'+game.subtitle+'</p></div><div class="hud"><div><small>RECORD</small><strong id="record">—</strong></div><div><small>BEST</small><strong id="best">—</strong></div><div><small>TIME</small><strong id="timer">00:00</strong></div></div><div class="collect-bar"><span id="collection-progress" aria-live="polite"></span><button id="open-collection" type="button">結末図鑑を見る ↗</button></div><div class="arena"><canvas id="stage" width="360" height="400" aria-label="'+game.title+' のゲーム画面"></canvas><div class="curtain" id="curtain"><span class="eyebrow" id="curtain-kicker">ONE IDEA GAME</span><h2 id="curtain-title">'+game.title+'</h2><p id="curtain-description">'+game.mechanic+'</p><div class="discovery-result" id="discovery-result" role="status" aria-live="polite" hidden><span class="discovery-glyph" aria-hidden="true">✦</span><span class="discovery-info"><strong id="discovery-state">NEW ENDING</strong><small id="discovery-counter"></small><small id="discovery-milestone"></small></span><span class="discovery-sparks" aria-hidden="true">✧ ✦ ✧</span></div><button class="btn" id="play">プレイ開始 →</button><button class="share-btn" id="share" hidden>結果をXで共有 ↗</button><a class="related" id="related" href="'+('../'+games[(games.findIndex(g=>g.slug===slug)+1)%games.length].slug+'/')+'" hidden>次のゲームを遊ぶ →</a></div><section class="collection-panel" id="collection-panel" hidden role="dialog" aria-modal="true" aria-label="結末図鑑"><div class="collection-head"><strong>結末図鑑</strong><button id="close-collection" type="button">閉じる ✕</button></div><p>予想外の操作にも、結末が隠れている。</p><div class="collection-track" role="progressbar" aria-label="結末の回収率" aria-valuemin="0" aria-valuemax="5" aria-valuenow="0"><span id="collection-track-fill"></span></div><ol id="collection-list"></ol><div id="collection-awards"></div></section></div><div class="play-controls"><p id="hint">'+(slug==='girigiri'?'長押しで注ぐ。離すと落下中の水が残る。':slug==='ato-hitotsu'?'タイミングよく落として高く積もう。':slug==='kienaide'?'風が強い時だけ長押しで守る。守りすぎも危険。':'指を離したら扉が開いてしまう。')+'</p><button class="action" id="action" disabled>'+(slug==='girigiri'?'長押しで注ぐ':slug==='ato-hitotsu'?'ここで落とす！':slug==='kienaide'?'長押しで炎を守る':'扉を押さえ続ける')+'</button><div class="controls-bottom"><button id="reset">最初から</button><a href="../">ゲーム一覧へ</a><a href="https://x.com/toriihiroki4649" target="_blank" rel="noopener noreferrer">新作を見る ↗</a></div></div></main>';
const canvas=document.getElementById('stage'),ctx=canvas.getContext('2d'),curtain=document.getElementById('curtain'),action=document.getElementById('action');
const $=id=>document.getElementById(id),record=$('record'),best=$('best'),timer=$('timer');
let mode='intro',last=0,elapsed=0,answer='',points=0,high=0,down=false,raf=0;
try{high=Number(localStorage.getItem('emotion-v1-'+slug))||0}catch(_){}best.textContent=high?String(high):'—';
const state={};
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
 if(slug==='kienaide'){
  const box=canvas.getBoundingClientRect(),x=(e.clientX-box.left)*360/box.width,y=(e.clientY-box.top)*400/box.height;
  if(x<120||x>240||y<115||y>278)return;
  if(elapsed-s.touchTime>1.4)s.touches=0;
  s.touchTime=elapsed;s.touches++;
  if(s.touches>=2)finish('wish',90);
 }
});

function store(n){if(n<=high)return;high=n;best.textContent=String(high);try{localStorage.setItem('emotion-v1-'+slug,String(high))}catch(_){}}
function display(title,description,kicker='YOUR RESULT'){mode='end';down=false;$('collection-panel').hidden=true;action.disabled=true;curtain.classList.remove('hidden');$('curtain-kicker').textContent=kicker;$('curtain-title').textContent=title;$('curtain-description').textContent=description;$('play').textContent='もう一度遊ぶ ↻';$('share').hidden=false;$('related').hidden=false;answer=title;mark('game_complete',{score:points,ending_id:lastEnding,outcome:points>0?'success':'lose'})}
function run(){mode='play';curtain.classList.remove('found-new');$('discovery-result').hidden=true;down=false;elapsed=0;points=0;answer='';lastEnding='';$('collection-panel').hidden=true;record.textContent='0';action.disabled=false;curtain.classList.add('hidden');Object.keys(state).forEach(x=>delete state[x]);if(slug==='girigiri')Object.assign(state,{fill:0,drips:[],spawner:0,pour:false,stopping:null,spill:0,started:false});if(slug==='ato-hitotsu')Object.assign(state,{tower:[{x:72,y:340,w:216}],moving:{x:0,y:316,w:216},velocity:158,level:0,streak:0,lastDrop:-1});if(slug==='micha-dame')Object.assign(state,{hold:false,held:0,eyes:0,failed:false,knocks:0,knockTime:-1,started:false});if(slug==='kienaide')Object.assign(state,{shield:false,flame:75,oxygen:100,wind:.25,touches:0,touchTime:-100,shimmer:0});mark('game_start');$('hint').textContent=slug==='girigiri'?'注ぐのを止めるタイミングを見極めろ':slug==='ato-hitotsu'?'タップしてブロックを落とす':slug==='kienaide'?'風が強い時に押す。弱まったら離して呼吸させる。':'長押しで扉を押さえろ'}
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
function holdRelease(){if(!down)return;down=false;if(mode!=='play')return;if(slug==='girigiri'&&state.pour){state.pour=false;state.stopping=elapsed}if(slug==='micha-dame'){state.hold=false;if(state.held<12)finish(state.held>=5.5?'whisper':'peek',0)}if(slug==='kienaide')state.shield=false}
action.addEventListener('pointerdown',e=>{if(mode!=='play'||down||e.button!==0)return;e.preventDefault();down=true;action.setPointerCapture?.(e.pointerId);if(slug==='girigiri'){state.pour=true;state.started=true}if(slug==='micha-dame'){state.hold=true;state.started=true}if(slug==='kienaide')state.shield=true});
action.addEventListener('pointerup',holdRelease);action.addEventListener('pointercancel',holdRelease);
action.addEventListener('click',()=>{if(mode!=='play')return;if(slug==='ato-hitotsu')drop()});
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
 const s=state,shield=s.shield||false;
 bg('#181d31');
 // Night sky, snowy rooftops and faint light from the little flame.
 const horizon=ctx.createLinearGradient(0,0,0,400);
 horizon.addColorStop(0,'#121b32');horizon.addColorStop(.7,'#304057');horizon.addColorStop(1,'#172034');
 ctx.fillStyle=horizon;ctx.fillRect(0,0,360,400);
 for(let i=0;i<16;i++){
  const x=(i*79+27)%360,y=(i*57+13)%230;
  ctx.fillStyle='rgba(232,235,243,.35)';ctx.fillRect(x,y,2,2);
 }
 ctx.fillStyle='#142233';ctx.fillRect(0,329,360,71);
 ctx.fillStyle='#4e6078';ctx.beginPath();ctx.moveTo(0,330);ctx.lineTo(88,282);ctx.lineTo(151,326);ctx.lineTo(237,284);ctx.lineTo(360,330);ctx.fill();
 if(mode==='play'){
  s.wind=.22+.83*Math.pow((Math.sin(elapsed*1.32-.75)+1)/2,1.8);
  if(shield){s.oxygen=Math.max(0,s.oxygen-(15+5*s.wind)*dt);s.flame=Math.min(100,s.flame+1.6*dt)}
  else{s.oxygen=Math.min(100,s.oxygen+21*dt);s.flame=Math.max(0,Math.min(100,s.flame+(s.wind>.55?-(19+9*s.wind):4)*dt))}
  if(s.oxygen<=0){finish('smother',0);return}
  if(s.flame<=0){finish('blown',0);return}
  if(elapsed>=14){finish(s.flame>=85&&s.oxygen>=30?'dawn':'survive',Math.round(s.flame));return}
  record.textContent=Math.max(0,Math.round(s.flame))+'%';
 }
 const wind=s.wind||.25,health=s.flame===undefined?75:s.flame;
 const x=180+Math.sin(elapsed*5.1)*(shield?3:wind*17),fireHeight=Math.max(13,44*(health/100));
 // Light halo.
 const halo=ctx.createRadialGradient(x,203,2,x,208,110);
 halo.addColorStop(0,'rgba(255,213,133,.34)');halo.addColorStop(1,'rgba(255,176,99,0)');
 ctx.fillStyle=halo;ctx.fillRect(45,85,270,280);
 // Candle and wax.
 rr(159,214,42,104,7,'#e8d7c3');rr(165,225,9,83,5,'#fff0d8');
 ctx.fillStyle='#4c3739';ctx.fillRect(179,203,3,16);
 ctx.beginPath();ctx.moveTo(x,219);ctx.bezierCurveTo(x-27,205,x-8,181-fireHeight/3,x+Math.sin(elapsed*2)*5,201-fireHeight);
 ctx.bezierCurveTo(x+25,182,x+18,212,x,219);ctx.fillStyle=health>15?'#ffae4c':'#a0a8bc';ctx.fill();
 ctx.beginPath();ctx.moveTo(x,216);ctx.quadraticCurveTo(x-11,199,x,207-fireHeight*.32);ctx.quadraticCurveTo(x+10,202,x,216);ctx.fillStyle='#fff2c5';ctx.fill();
 // Gust trails reveal the hazard before it hits.
 ctx.lineWidth=2;ctx.strokeStyle='rgba(212,224,238,'+(wind*.44)+')';
 for(let i=0;i<6;i++){
  const y=105+i*34,x0=((elapsed*(100+wind*120)+i*99)%520)-130;
  ctx.beginPath();ctx.moveTo(x0,y);ctx.quadraticCurveTo(x0+65,y-6,x0+108,y);ctx.stroke();
 }
 if(shield){
  ctx.fillStyle='rgba(245,188,147,.32)';ctx.beginPath();ctx.ellipse(123,226,30,80,-.3,0,Math.PI*2);ctx.fill();
  ctx.beginPath();ctx.ellipse(237,226,30,80,.3,0,Math.PI*2);ctx.fill();
 }
 const meter=(label,value,y,color)=>{
  textAt(label,31,y,'bold 12px system-ui','#d9dee7','left');
  rr(31,y+10,298,9,5,'#263247');rr(31,y+10,298*Math.max(0,value)/100,9,5,color);
 };
 meter('炎',health,19,'#ffb15b');meter('息',s.oxygen===undefined?100:s.oxygen,53,'#a4cee2');
 textAt('風の強さ '+Math.round(wind*100)+'%',180,365,'bold 14px system-ui',wind>.55?'#ffce91':'#c4d4e4');
 textAt(shield?'守っている — 息が苦しい':'風にさらされている',180,388,'12px system-ui','#d7c8c4');
}
function tick(now){let dt=last?Math.min((now-last)/1000,.035):0;last=now;if(mode==='play'&&$('collection-panel').hidden){elapsed+=dt;timer.textContent='00:'+String(Math.floor(elapsed)).padStart(2,'0')}else if(!$('collection-panel').hidden){dt=0}if(slug==='girigiri')drawG(dt);else if(slug==='ato-hitotsu')drawStack(dt);else if(slug==='kienaide')drawCandle(dt);else drawDoor(dt);raf=requestAnimationFrame(tick)}
raf=requestAnimationFrame(tick);
})();