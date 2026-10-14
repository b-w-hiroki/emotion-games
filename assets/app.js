(()=>{'use strict';
const root=document.getElementById('app'),slug=document.body.dataset.game||'',base=slug?'../':'./';
const games=[
{slug:'girigiri',title:'ぎりぎり。',emotion:'緊張',subtitle:'止めたあとも、水は落ちてくる。',mechanic:'指を離すタイミングがすべて。',theme:'aqua',number:'01',duration:'30秒'},
{slug:'ato-hitotsu',title:'あと1個。',emotion:'ハラハラ',subtitle:'まだ積める。たぶん。',mechanic:'動くブロックを、落とすだけ。',theme:'amber',number:'02',duration:'45秒'},
{slug:'micha-dame',title:'みちゃだめ。',emotion:'恐怖',subtitle:'扉の向こうを、見てはいけない。',mechanic:'12秒間、指を離さず耐えろ。',theme:'violet',number:'03',duration:'20秒'}
];
const game=games.find(g=>g.slug===slug);
const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function mark(event,data){try{window.emotionTrack?.(event,{game_id:slug,...data})}catch(_){}}
function currentUrl(){const u=new URL(location.href);for(const x of ['utm_source','utm_medium','utm_campaign','utm_content'])u.searchParams.delete(x);return u.href}
async function share(score){mark('share_tap');const text=game.title+' を遊んだ。'+(score?'記録 '+score+'。':'')+' あなたも挑戦する？';const url=currentUrl();if(navigator.share){try{await navigator.share({title:game.title,text,url});return}catch(e){if(e.name==='AbortError')return}}window.open('https://twitter.com/intent/tweet?'+new URLSearchParams({text,url}).toString(),'_blank','noopener,noreferrer')}
function top(){return '<header class="top"><a class="logo" href="'+base+'">birdman<span>studio</span><small>EMOTION GAMES</small></a><a class="follow" href="https://x.com/toriihiroki4649" target="_blank" rel="noopener noreferrer">X / 最新作 ↗</a></header>'}
if(!game){
 root.innerHTML=top()+'<main class="home"><section class="hero"><p class="eyebrow">SMALL GAMES. BIG FEELINGS.</p><h1>感情を、<br><em>遊ぶ。</em></h1><p>ドキドキ。ハラハラ。ゾクッ。<br>たった数秒で、心が動く。</p><div class="hero-meta">3 SHORT GAMES <span>•</span> FREE TO PLAY <span>•</span> NO LOGIN</div></section><div class="section-head"><h2>どれから遊ぶ？</h2><span>PLAY IN SECONDS ↓</span></div><section class="cards">'+games.map(g=>'<a class="card '+g.theme+'" href="./'+g.slug+'/"><div class="card-art"><span class="art-icon">'+({girigiri:'◓','ato-hitotsu':'▤','micha-dame':'▯'}[g.slug])+'</span><span class="art-num">'+g.number+'</span></div><div class="card-info"><span class="emotion">'+g.emotion+' / '+g.duration+'</span><h3>'+g.title+'</h3><p>'+g.mechanic+'</p><span class="card-cta">いま遊ぶ <b>↗</b></span></div></a>').join('')+'</section><section class="manifesto"><span>OUR CONCEPT</span><h2>感情が動く、その一瞬を。</h2><p>物語でも、物理でも、ホラーでも。プレイヤー自身の行動で心が動く体験を作ります。</p></section></main><footer class="foot"><a href="https://x.com/toriihiroki4649">Follow @toriihiroki4649 ↗</a><a href="./privacy.html">プライバシー</a><span>© birdman studio</span></footer>';
 return;
}
root.innerHTML=top()+'<main class="game-shell '+game.theme+'"><div class="game-heading"><div class="label">EMOTION '+game.number+' <span>/ '+game.emotion+'</span></div><h1>'+game.title+'</h1><p>'+game.subtitle+'</p></div><div class="hud"><div><small>RECORD</small><strong id="record">—</strong></div><div><small>BEST</small><strong id="best">—</strong></div><div><small>TIME</small><strong id="timer">00:00</strong></div></div><div class="arena"><canvas id="stage" width="360" height="400" aria-label="'+game.title+' のゲーム画面"></canvas><div class="curtain" id="curtain"><span class="eyebrow" id="curtain-kicker">ONE IDEA GAME</span><h2 id="curtain-title">'+game.title+'</h2><p id="curtain-description">'+game.mechanic+'</p><button class="btn" id="play">プレイ開始 →</button><button class="share-btn" id="share" hidden>結果をXで共有 ↗</button><a class="related" id="related" href="'+(game.slug==='girigiri'?'../ato-hitotsu/':game.slug==='ato-hitotsu'?'../micha-dame/':'../girigiri/')+'" hidden>次のゲームを遊ぶ →</a></div></div><div class="play-controls"><p id="hint">'+(slug==='girigiri'?'長押しで注ぐ。離すと落下中の水が残る。':slug==='ato-hitotsu'?'タイミングよく落として高く積もう。':'指を離したら扉が開いてしまう。')+'</p><button class="action" id="action" disabled>'+(slug==='girigiri'?'長押しで注ぐ':slug==='ato-hitotsu'?'ここで落とす！':'扉を押さえ続ける')+'</button><div class="controls-bottom"><button id="reset">最初から</button><a href="../">ゲーム一覧へ</a><a href="https://x.com/toriihiroki4649" target="_blank" rel="noopener noreferrer">新作を見る ↗</a></div></div></main>';
const canvas=document.getElementById('stage'),ctx=canvas.getContext('2d'),curtain=document.getElementById('curtain'),action=document.getElementById('action');
const $=id=>document.getElementById(id),record=$('record'),best=$('best'),timer=$('timer');
let mode='intro',last=0,elapsed=0,answer='',points=0,high=0,down=false,raf=0;
try{high=Number(localStorage.getItem('emotion-v1-'+slug))||0}catch(_){}best.textContent=high?String(high):'—';
const state={};
function store(n){if(n<=high)return;high=n;best.textContent=String(high);try{localStorage.setItem('emotion-v1-'+slug,String(high))}catch(_){}}
function display(title,description,kicker='YOUR RESULT'){mode='end';down=false;action.disabled=true;curtain.classList.remove('hidden');$('curtain-kicker').textContent=kicker;$('curtain-title').textContent=title;$('curtain-description').textContent=description;$('play').textContent='もう一度遊ぶ ↻';$('share').hidden=false;$('related').hidden=false;answer=title;mark('game_complete',{score:points,outcome:points>0?'success':'lose'})}
function run(){mode='play';down=false;elapsed=0;points=0;answer='';record.textContent='0';action.disabled=false;curtain.classList.add('hidden');Object.keys(state).forEach(x=>delete state[x]);if(slug==='girigiri')Object.assign(state,{fill:0,drips:[],spawner:0,pour:false,stopping:0,spill:0});if(slug==='ato-hitotsu')Object.assign(state,{tower:[{x:72,y:340,w:216}],moving:{x:0,y:316,w:216},velocity:158,level:0});if(slug==='micha-dame')Object.assign(state,{hold:false,held:0,eyes:0,failed:false});mark('game_start');$('hint').textContent=slug==='girigiri'?'注ぐのを止めるタイミングを見極めろ':slug==='ato-hitotsu'?'タップしてブロックを落とす':'長押しで扉を押さえろ'}
function done(n,title,message){points=Math.max(0,Math.floor(n));record.textContent=String(points);store(points);display(title,message)}
$('play').addEventListener('click',()=>{if(mode==='end')mark('game_retry');run()});
$('reset').addEventListener('click',()=>{if(mode!=='intro')mark('game_retry');run()});
$('share').addEventListener('click',()=>share(points?points+'点':''));
function holdRelease(){if(!down)return;down=false;if(mode!=='play')return;if(slug==='girigiri'&&state.pour){state.pour=false;state.stopping=elapsed}if(slug==='micha-dame'){state.hold=false;if(state.held<12)done(0,'見てしまった。','指を離した瞬間、扉が開いた。')}}
action.addEventListener('pointerdown',e=>{if(mode!=='play'||down||e.button!==0)return;e.preventDefault();down=true;action.setPointerCapture?.(e.pointerId);if(slug==='girigiri')state.pour=true;if(slug==='micha-dame')state.hold=true});
action.addEventListener('pointerup',holdRelease);action.addEventListener('pointercancel',holdRelease);
action.addEventListener('click',()=>{if(mode!=='play')return;if(slug==='ato-hitotsu')drop()});
window.addEventListener('blur',holdRelease);document.addEventListener('visibilitychange',()=>{if(document.hidden)holdRelease()});
action.addEventListener('contextmenu',e=>e.preventDefault());
function drop(){const a=state.moving,b=state.tower.at(-1),left=Math.max(a.x,b.x),right=Math.min(a.x+a.w,b.x+b.w),width=right-left;if(width<9){done(state.level*10,'崩れた！','積めたのは '+state.level+' 個。もう一度挑戦。');return}state.level++;state.tower.push({x:left,y:a.y,w:width});record.textContent=String(state.level);if(state.level>=10){done(100,'積み切った！','10段クリア。限界まで積んだ！');return}state.moving={x:0,y:a.y-24,w:width};state.velocity=(158+state.level*28)*(state.level%2?-1:1);if(state.velocity<0)state.moving.x=360-width}
function bg(color){ctx.fillStyle=color;ctx.fillRect(0,0,360,400)}
function textAt(t,x,y,font,color,align='center'){ctx.textAlign=align;ctx.fillStyle=color;ctx.font=font;ctx.fillText(t,x,y)}
function rr(x,y,w,h,r,color){ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(x,y,w,h,r);ctx.fill()}
function drawG(dt){
 bg('#092b3b');ctx.fillStyle='#0c3848';for(let i=0;i<9;i++){ctx.fillRect(i*48-10,0,1,400)}
 const s=state;if(mode==='play'){if(s.pour){s.spawner+=dt;while(s.spawner>.037){s.spawner-=.037;s.drips.push({x:165+Math.random()*30,y:-6,vy:0,r:3+Math.random()*2.5})}}for(let i=s.drips.length-1;i>=0;i--){let d=s.drips[i];d.vy+=750*dt;d.y+=d.vy*dt;const waterY=350-s.fill*2.6;if(d.y>=Math.min(350,waterY)){s.fill+=1.09;if(s.fill>100){s.spill=s.fill-100}s.drips.splice(i,1)}}if(s.stopping&&elapsed-s.stopping>1.8&&s.drips.length===0){const f=s.fill;done(f>100?0:Math.max(0,100-Math.abs(98-f)*8),f>100?'あふれた！':f>=94?'ギリギリ！':'まだ注げた。','水量 '+f.toFixed(1)+'%。'+(f>100?'ちょっと欲張りすぎた。':'離すタイミングを極めよう。'))}if(elapsed>25){done(0,'時間切れ','止める勇気が必要だった。')}}ctx.fillStyle='#123d4b';ctx.fillRect(0,356,360,44);
 ctx.save();ctx.beginPath();ctx.moveTo(90,102);ctx.lineTo(270,102);ctx.lineTo(258,351);ctx.lineTo(102,351);ctx.closePath();ctx.clip();const h=Math.max(0,s.fill||0)*2.6;ctx.fillStyle=s.fill>100?'#ff967c':'#4cc9df';ctx.beginPath();ctx.moveTo(92,350-h);for(let x=92;x<=269;x+=5)ctx.lineTo(x,350-h+Math.sin(x*.09+elapsed*9)*Math.min(5,1+h*.02));ctx.lineTo(270,354);ctx.lineTo(90,354);ctx.fill();ctx.restore();
 ctx.strokeStyle='#c8faff';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(90,100);ctx.lineTo(270,100);ctx.lineTo(258,353);ctx.quadraticCurveTo(180,365,102,353);ctx.closePath();ctx.stroke();
 ctx.strokeStyle='#ffcf7a';ctx.setLineDash([5,7]);ctx.beginPath();ctx.moveTo(105,102+247*.06);ctx.lineTo(254,102+247*.06);ctx.stroke();ctx.setLineDash([]);
 for(const d of s.drips||[]){ctx.fillStyle='#7fe6f6';ctx.beginPath();ctx.arc(d.x,d.y,d.r,0,7);ctx.fill()}textAt('STOP BEFORE IT SPILLS',180,54,'11px system-ui','#9ed4e0');
 if((s.fill||0)>100){ctx.fillStyle='#66d5e7';for(let i=0;i<6;i++){let x=105+i*30;ctx.beginPath();ctx.arc(x,362+Math.sin(elapsed*12+i)*5,2.5,0,7);ctx.fill()}}
}
function drawStack(dt){bg('#262035');const s=state;ctx.fillStyle='#352941';for(let y=0;y<400;y+=46)ctx.fillRect(0,y,360,1);ctx.fillStyle='#5b486c';ctx.fillRect(0,364,360,36);
 if(mode==='play'){let b=s.moving;b.x+=s.velocity*dt;if(b.x<0){b.x=0;s.velocity=Math.abs(s.velocity)}if(b.x+b.w>360){b.x=360-b.w;s.velocity=-Math.abs(s.velocity)}}
 const all=s.tower||[{x:72,y:340,w:216}];for(let i=0;i<all.length;i++){const b=all[i],y=Math.max(35,b.y+Math.max(0,all.length-8)*18);rr(b.x,y,b.w,23,4,i%2?'#ffbd79':'#f58d79');rr(b.x+5,y+3,Math.max(0,b.w-10),4,2,'#ffd9b2')}if(s.moving&&mode==='play'){const b=s.moving;rr(b.x,Math.max(20,b.y+Math.max(0,all.length-8)*18),b.w,23,4,'#f7d8ad')}
 textAt('STACK WITHOUT FALLING',180,47,'11px system-ui','#d2b8df');textAt(String(s.level||0)+' / 10',180,90,'bold 30px system-ui','#fff2d9');
}
function drawDoor(dt){bg('#11121c');const s=state;ctx.fillStyle='#1a1926';for(let i=0;i<14;i++)ctx.fillRect(i*32,0,1,400);let gap=mode==='end'&&points===0?48:Math.sin(elapsed*2)*2;rr(88,55,184,310,3,'#383444');rr(99+gap,66,158-gap,285,3,'#241e2b');ctx.strokeStyle='#665967';ctx.lineWidth=3;ctx.strokeRect(99+gap,66,158-gap,285);rr(221+gap*.4,207,10,10,5,'#b8a178');
 const r=Math.min(1,(s.held||0)/12);ctx.strokeStyle='#6c6175';ctx.lineWidth=5;ctx.beginPath();ctx.arc(180,25,19,-Math.PI/2,Math.PI*1.5);ctx.stroke();ctx.strokeStyle='#e6a8bc';ctx.beginPath();ctx.arc(180,25,19,-Math.PI/2,-Math.PI/2+Math.PI*2*r);ctx.stroke();textAt(String(Math.ceil(Math.max(0,12-(s.held||0))))+'s',180,28,'bold 13px system-ui','#f5e2ed');
 if(mode==='play'&&s.held>4&&Math.sin(elapsed*8)>0.9){ctx.fillStyle='#cc5670';ctx.beginPath();ctx.arc(158,170,3,0,7);ctx.arc(198,170,3,0,7);ctx.fill()}
 if(mode==='end'&&points===0){rr(110,90,135,240,3,'#09070d');ctx.fillStyle='#ff6975';ctx.beginPath();ctx.arc(157,167,5,0,7);ctx.arc(199,167,5,0,7);ctx.fill()}
 textAt('DO NOT LOOK',180,387,'11px system-ui','#9d899f');
 if(mode==='play'&&s.hold){s.held+=dt;record.textContent=s.held.toFixed(1)+'s';if(s.held>=12){done(100,'見なかった。','扉の向こうの音が消えた。あなたは最後まで耐えた。')}}}
function tick(now){const dt=last?Math.min((now-last)/1000,.035):0;last=now;if(mode==='play'){elapsed+=dt;timer.textContent='00:'+String(Math.floor(elapsed)).padStart(2,'0')}if(slug==='girigiri')drawG(dt);else if(slug==='ato-hitotsu')drawStack(dt);else drawDoor(dt);raf=requestAnimationFrame(tick)}
raf=requestAnimationFrame(tick);
})();