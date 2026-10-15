/* Four deliberately different interaction models for the AI × emotion benchmark.
   Keep the rest of the series unchanged; distinguish implementation from artwork swaps. */
(()=>{
'use strict';
const M=window.EmotionMissions;
if(!M)return;
const pilotIds=['hikari-oikake','tobo','hibiki','kasa-o'];
const isPilot=s=>pilotIds.includes(s.slug);
const old={makeState:M.makeState,down:M.down,up:M.up,tap:M.tap,canvasTap:M.canvasTap,frame:M.frame};
const close=(s,id,score,finish)=>{if(s.completed)return;s.completed=true;finish(id,score)};
const lightPos=t=>({x:180+105*Math.sin(t*2.4),y:208+74*Math.cos(t*1.77)});
function attemptLight(s,x,y,t){const p=lightPos(t),distance=Math.hypot(x-p.x,y-p.y);s.pending={at:t,distance};s.started=true;}
const scenes=[
{caption:'帰り道、雨にぬれた子がいる。',left:'傘を渡す',right:'声をかける'},
{caption:'バス停には、お年寄りがひとり。',left:'いっしょに待つ',right:'先を急ぐ'},
{caption:'自分の家まで、あと少し。',left:'誰かを迎えに行く',right:'自分を温める'}
];
M.makeState=slug=>{
 const s=old.makeState(slug);
 if(slug==='hikari-oikake')s.special={kind:'chase',pending:null,lastTap:-100};
 if(slug==='tobo')s.special={kind:'glide',height:178,speed:22,x:42,gravity:0,flutters:0,lastDown:-100};
 if(slug==='hibiki')s.special={kind:'echo',taps:[],lastTap:-100,learned:[]};
 if(slug==='kasa-o')s.special={kind:'narrative',choices:[],lastTap:-100,center:0};
 return s;
};
M.down=(s,t)=>{
 if(!isPilot(s))return old.down(s,t);
 s.started=true;
 if(s.slug==='tobo'){s.hold=true;const p=s.special;p.flutters=t-p.lastDown<.75?p.flutters+1:1;p.lastDown=t}
};
M.up=s=>{if(!isPilot(s))return old.up(s);s.hold=false};
function selectUmbrella(s,n,t,finish){
 const p=s.special;p.choices.push(n);s.started=true;
 if(p.choices.length>=3){
  const sum=p.choices.reduce((a,b)=>a+b,0);
  const id=sum===0?'left':sum===3?'right':'mixed';
  close(s,id,sum===0?86:sum===3?48:78,finish);
 }
}
M.tap=(s,t,finish)=>{
 if(!isPilot(s))return old.tap(s,t,finish);
 const p=s.special;s.started=true;
 if(s.slug==='hikari-oikake'){
  if(p.pending&&t-p.lastTap<.34){close(s,'double',85,finish);return}
  attemptLight(s,180,208,t);p.lastTap=t;
 }else if(s.slug==='hibiki'){
  if(p.taps.length&&t-p.lastTap<.22){close(s,'secret',89,finish);return}
  p.taps.push(t);p.lastTap=t;
  if(p.taps.length===4){
   const expected=[4.1,4.9,5.45,6.55];
   const e=p.taps.reduce((a,x,i)=>a+Math.abs(x-expected[i]),0)/4;
   close(s,e<.18?'perfect':e<.62?'near':'miss',Math.max(0,Math.round(100-e*25)),finish);
  }
 }else if(s.slug==='kasa-o'){selectUmbrella(s,0,t,finish)}
};
M.canvasTap=(s,x,y,t,finish)=>{
 if(!isPilot(s))return old.canvasTap(s,x,y,t,finish);
 s.started=true;const p=s.special;
 if(s.slug==='hikari-oikake'){
  if(p.pending&&t-p.lastTap<.34){close(s,'double',85,finish);return}
  attemptLight(s,x,y,t);p.lastTap=t;
 }else if(s.slug==='hibiki'){M.tap(s,t,finish)}
 else if(s.slug==='kasa-o'){
  if(x>136&&x<224&&y>116&&y<285){
   p.center=t-p.lastTap<.55?p.center+1:1;p.lastTap=t;
   if(p.center>=4){close(s,'secret',94,finish)}
  }else selectUmbrella(s,x<180?0:1,t,finish);
 }
};
M.frame=(ctx,s,t,dt,finish)=>{
 if(!isPilot(s))return old.frame(ctx,s,t,dt,finish);
 const p=s.special,g=M.games.find(x=>x.slug===s.slug),accent=g.accent;
 const bg=ctx.createLinearGradient(0,0,360,400);bg.addColorStop(0,'#101d31');bg.addColorStop(1,'#25243a');ctx.fillStyle=bg;ctx.fillRect(0,0,360,400);
 const words=(a,x,y,size=15,color='#f1f0f7')=>{ctx.fillStyle=color;ctx.font='700 '+size+'px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText(a,x,y)};
 const dot=(x,y,r,c)=>{ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fillStyle=c;ctx.fill()};
 const rect=(x,y,w,h,c)=>{ctx.fillStyle=c;ctx.fillRect(x,y,w,h)};
 if(s.completed)return;
 if(s.slug==='hikari-oikake'){
  const pos=lightPos(t);
  ctx.strokeStyle='#9dbbd555';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(180,208,120,90,0,0,Math.PI*2);ctx.stroke();
  dot(pos.x,pos.y,33,'#86c5ff33');dot(pos.x,pos.y,17,accent);dot(pos.x,pos.y,6,'#fff');
  words('光は止まらない。指でつかまえて。',180,82,14);
  words('画面の光を直接タップ',180,352,14,'#a9c7e0');
  if(p.pending&&t-p.pending.at>=.34){
   const d=p.pending.distance;
   close(s,d<28?'perfect':d<73?'near':'miss',Math.max(0,100-Math.round(d*.55)),finish);
  }
  if(!s.started&&t>=9)close(s,'idle',15,finish);
 }else if(s.slug==='tobo'){
  if(!s.started&&t>=8){close(s,'idle',20,finish);return}
  if(s.started){
   p.gravity+=(s.hold?-55:28)*dt;
   p.gravity=Math.max(-38,Math.min(38,p.gravity));
   p.height+=p.gravity*dt;
   p.x+=21*dt;
   if(p.flutters>=4){close(s,'secret',94,finish);return}
   if(p.height<45){close(s,'low',0,finish);return}
   if(p.height>320){close(s,'high',0,finish);return}
   if(t>=13)close(s,'stable',Math.max(0,Math.round(100-Math.abs(p.height-180)*.35)),finish);
  }
  ctx.fillStyle='#65a1ba50';ctx.fillRect(0,340,360,60);
  words('風の中を、飛び続けよう。',180,71,16);
  for(let i=0;i<7;i++){const x=(i*67+t*17)%400-30;rect(x,130+i*27,38,2,'#a4c5d655')}
  ctx.save();ctx.translate(Math.min(320,p.x),390-p.height);
  ctx.rotate(p.gravity*.008);
  ctx.fillStyle='#d7eff6';ctx.beginPath();ctx.moveTo(0,-16);ctx.lineTo(-30,17);ctx.lineTo(0,6);ctx.lineTo(30,17);ctx.closePath();ctx.fill();ctx.restore();
  words('長押しで上昇、離して滑空',180,372,13,'#e7c5a2');
 }else if(s.slug==='hibiki'){
  words('最初の光を覚えて。同じ間隔で返そう。',180,76,14);
  const beats=[.9,1.7,2.25,3.35];
  const glow=beats.some(b=>Math.abs(t-b)<.19);
  dot(180,194,glow?79:58,glow?'#a994fd80':'#624b8b66');
  dot(180,194,glow?44:27,glow?'#d9d1ff':'#8e7bb2');
  words(t<3.6?'きいて': 'こたえて',180,207,20,t<3.6?'#302241':'#f5e6ff');
  words('返事 '+p.taps.length+'/4',180,310,23,'#d1c4ed');
  words(t<3.6?'音の間隔に注目':'光の順番を覚えてタップ',180,362,13);
  if(!s.started&&t>=11)close(s,'idle',10,finish);
  if(s.started&&t>=12)close(s,'miss',10,finish);
 }else if(s.slug==='kasa-o'){
  const index=Math.min(2,p.choices.length),scene=scenes[index];
  words('雨の日、最後の一本。',180,65,16);
  words(scene.caption,180,115,14,'#e1e6ef');
  rect(20,155,147,142,'#32485d');rect(193,155,147,142,'#655066');
  words('◁',93,210,42,accent);words('▷',267,210,42,'#ffd1c4');
  words(scene.left,93,260,12);words(scene.right,267,260,12);
  words('場面 '+(index+1)+'/3',180,343,15);
  if(!s.started&&t>=11)close(s,'idle',12,finish);
 }
};
M.pilotIds=pilotIds;
M.pilotScenes=scenes;
M.lightPosition=lightPos;
})();