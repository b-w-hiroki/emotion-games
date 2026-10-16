// 004「きえないで。」 renderer. Draws layered chapter art, the traveller, the living flame and its
// light as separate layers. Everything here is presentation; rules live in kienaide-core.js.
(function(root){'use strict';
const H=480,ART=480,VP={x:240,y:252};
const CHAPTER_KEYS=['ch1','ch2','ch3','ch4'];
const LAYERS=['sky','far','mid','fore'];
// How strongly each plane moves with the camera. Far planes barely move; the foreground leads.
const DEPTH={sky:.02,far:.07,mid:.22,fore:.55};
const ZOOM={sky:0,far:.025,mid:.09,fore:.16};
function create(base){
 const imgs={},cache=new Map();
 const src=name=>base+'assets/kienaide/'+name+'.svg';
 const names=[];for(const c of CHAPTER_KEYS)for(const l of [...LAYERS,'lights'])names.push(c+'-'+l);
 names.push('intro-room','intro-lights','hero-body','hero-hands-hold','hero-hands-shield','hero-rim');
 let failed=0;
 for(const n of names){const img=new Image();img.decoding='async';img.onerror=()=>{failed++};img.src=src(n);imgs[n]=img}
 const ready=n=>{const i=imgs[n];return !!(i&&i.complete&&i.naturalWidth>0)};
 // SVG layers are rasterised once per size into offscreen canvases, so each frame is a cheap blit.
 function raster(n,w,h,tint){
  if(!ready(n))return null;
  const key=n+'|'+w+'|'+h+'|'+(tint||'');
  if(cache.has(key))return cache.get(key);
  const c=document.createElement('canvas');c.width=Math.max(1,Math.round(w));c.height=Math.max(1,Math.round(h));
  const g=c.getContext('2d');g.drawImage(imgs[n],0,0,c.width,c.height);
  if(tint){g.globalCompositeOperation='source-in';g.fillStyle=tint;g.fillRect(0,0,c.width,c.height)}
  if(cache.size>80)cache.clear();
  cache.set(key,c);return c;
 }
 const view={W:360,scale:1,ox:0,oy:0,dpr:1,cssW:0,cssH:0};
 function resize(canvas){
  const box=canvas.getBoundingClientRect(),cssW=Math.max(1,box.width),cssH=Math.max(1,box.height);
  const dpr=Math.min(2,root.devicePixelRatio||1);
  const W=Math.max(300,Math.min(ART,cssW/cssH*H));
  const scale=Math.min(cssW/W,cssH/H);
  if(cssW===view.cssW&&cssH===view.cssH&&dpr===view.dpr)return view;
  Object.assign(view,{W,scale,dpr,cssW,cssH,ox:(cssW-W*scale)/2,oy:(cssH-H*scale)/2});
  canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);cache.clear();
  return view;
 }
 // Convert a pointer position to logical world coordinates.
 function toWorld(canvas,clientX,clientY){const b=canvas.getBoundingClientRect();return {x:(clientX-b.left-view.ox)/view.scale,y:(clientY-b.top-view.oy)/view.scale}}
 function toCss(x,y){return {x:view.ox+x*view.scale,y:view.oy+y*view.scale}}
 function begin(ctx){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#070b14';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);const k=view.dpr*view.scale;ctx.setTransform(k,0,0,k,view.dpr*view.ox,view.dpr*view.oy);ctx.save();ctx.beginPath();ctx.rect(0,0,view.W,H);ctx.clip()}
 function end(ctx){ctx.restore()}
 // Draw one chapter's stack with depth-dependent zoom and sway around the shared vanishing point.
 function drawChapter(ctx,ci,cam,alpha=1,lightAlpha=1){
  const W=view.W,k=CHAPTER_KEYS[ci],px=view.dpr*view.scale;
  ctx.save();ctx.globalAlpha=alpha;
  const plane=(layer,zoom,depth,composite)=>{
   const z=1.04+zoom*cam.p+ (layer==='fore'?cam.breath*.006:0),size=ART*z;
   const c=raster(k+'-'+layer,ART*1.25*px,ART*1.25*px);if(!c)return false;
   const x=W/2-VP.x*z+cam.sway*depth*14+cam.push*depth*10,y=VP.y-VP.y*z+cam.bob*depth*3;
   if(composite)ctx.globalCompositeOperation=composite;
   ctx.drawImage(c,x,y,size,size);ctx.globalCompositeOperation='source-over';return true;
  };
  let ok=plane('sky',ZOOM.sky,DEPTH.sky);
  ok=plane('far',ZOOM.far,DEPTH.far)&&ok;
  ok=plane('mid',ZOOM.mid,DEPTH.mid)&&ok;
  ctx.globalAlpha=alpha*lightAlpha;plane('lights',ZOOM.mid,DEPTH.mid,'lighter');ctx.globalAlpha=alpha;
  ctx.restore();
  return ok;
 }
 function drawFore(ctx,ci,cam,alpha=1){
  const W=view.W,k=CHAPTER_KEYS[ci],px=view.dpr*view.scale,z=1.04+ZOOM.fore*cam.p,size=ART*z;
  const c=raster(k+'-fore',ART*1.25*px,ART*1.25*px);if(!c)return;
  ctx.save();ctx.globalAlpha=alpha;ctx.drawImage(c,W/2-VP.x*z+cam.sway*DEPTH.fore*14+cam.push*DEPTH.fore*10,VP.y-VP.y*z+cam.bob*DEPTH.fore*3,size,size);ctx.restore();
 }
 function fallbackSky(ctx,ci){const W=view.W,g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,['#0b1326','#0a1222','#070d1c','#1a2244'][ci]);g.addColorStop(1,['#2c3a55','#1d2940','#22324f','#d8a483'][ci]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
 // Snow is simulated in three depth bands; reduced motion keeps it sparse and slow.
 const flakes=Array.from({length:90},(_,i)=>({x:(i*97.13)%1,y:(i*57.31)%1,d:i%3,s:.6+((i*13)%7)/7}));
 function snow(ctx,t,wind,reduced,dir=1){
  const W=view.W,n=reduced?36:flakes.length;
  for(let i=0;i<n;i++){const f=flakes[i],speed=(14+f.d*16)*(reduced?.4:1),drift=(10+wind*120)*(1+f.d*.6)*(reduced?.3:1)*dir;
   const x=((f.x*W+t*drift)%(W+20)+W+20)%(W+20)-10,y=((f.y*H+t*speed*f.s)%(H+10)+H+10)%(H+10)-5;
   ctx.fillStyle='rgba(236,244,252,'+(.35+f.d*.2)+')';ctx.beginPath();ctx.arc(x,y,.7+f.d*.7,0,6.283);ctx.fill()}
 }
 function windLines(ctx,t,wind,warn,reduced){
  const W=view.W,strength=Math.max(0,wind-.25)+warn*.5;if(strength<=0)return;
  ctx.save();ctx.lineCap='round';
  for(let i=0;i<8;i++){const y=110+i*36+Math.sin(i*2.1)*12,len=50+strength*90,speed=reduced?60:150+strength*260;
   const x0=((t*speed+i*137)%(W+len*2))-len;
   ctx.strokeStyle='rgba(222,232,245,'+Math.min(.55,.1+strength*.45)+')';ctx.lineWidth=1+strength*2;
   ctx.beginPath();ctx.moveTo(x0,y);ctx.quadraticCurveTo(x0+len*.5,y-6-strength*10,x0+len,y);ctx.stroke()}
  ctx.restore();
 }
 // ---------- traveller and flame ----------
 const HERO={w:220,h:280,scale:.95};
 function heroBox(){const s=HERO.scale,w=HERO.w*s,h=HERO.h*s;return {x:view.W/2-104*s-8,y:H-h+4,s,w,h}}
 function flameAnchor(){const b=heroBox();return {x:b.x+172*b.s,y:b.y+150*b.s}}
 function scarfTail(ctx,b,t,wind,reduced){
  const sx=b.x+140*b.s,sy=b.y+128*b.s,len=(34+wind*44)*b.s,wave=reduced?0:Math.sin(t*(4+wind*6));
  ctx.save();ctx.fillStyle='#b25a63';ctx.beginPath();ctx.moveTo(sx,sy);
  ctx.bezierCurveTo(sx+len*.4,sy+4+wave*4,sx+len*.7,sy-6-wave*6,sx+len,sy+2+wave*5);
  ctx.lineTo(sx+len-2,sy+12+wave*4);ctx.bezierCurveTo(sx+len*.6,sy+6-wave*4,sx+len*.3,sy+16+wave*3,sx,sy+12);ctx.closePath();ctx.fill();
  ctx.strokeStyle='rgba(231,168,168,.6)';ctx.lineWidth=1;ctx.stroke();ctx.restore();
 }
 function drawTraveller(ctx,st){
  const b=heroBox(),px=view.dpr*view.scale,bob=st.reduced||!st.walking?0:Math.abs(Math.sin(st.t*2.6))*-2.2;
  const body=raster('hero-body',b.w*px,b.h*px),hands=raster(st.shield?'hero-hands-shield':'hero-hands-hold',b.w*px,b.h*px);
  // Pool of firelight on the snow, drawn before the figure so it sits on the ground.
  if(st.light>0){const g=ctx.createRadialGradient(b.x+120*b.s,H-14,4,b.x+120*b.s,H-14,90+st.light*60);g.addColorStop(0,'rgba(255,184,104,'+(.32*st.light)+')');g.addColorStop(1,'rgba(255,170,90,0)');ctx.fillStyle=g;ctx.fillRect(0,H-150,view.W,150)}
  ctx.save();ctx.translate(0,bob);
  scarfTail(ctx,b,st.t,st.wind,st.reduced);
  if(body)ctx.drawImage(body,b.x,b.y,b.w,b.h);else{ctx.fillStyle='#253149';ctx.beginPath();ctx.ellipse(b.x+104*b.s,b.y+190*b.s,58*b.s,80*b.s,0,0,6.283);ctx.fill();ctx.beginPath();ctx.arc(b.x+104*b.s,b.y+86*b.s,40*b.s,0,6.283);ctx.fill()}
  // Rim light exists only while the flame burns; it is a separate mask tinted by the flame colour.
  if(st.light>0){const rim=raster('hero-rim',b.w*px,b.h*px,'#ffc27a');if(rim){ctx.save();ctx.globalAlpha=Math.min(1,st.light*1.05);ctx.globalCompositeOperation='lighter';ctx.drawImage(rim,b.x,b.y,b.w,b.h);ctx.restore()}}
  if(hands)ctx.drawImage(hands,b.x,b.y,b.w,b.h);
  ctx.restore();
  return bob;
 }
 function drawFlame(ctx,st,at){
  const a=at||flameAnchor(),health=Math.max(0,st.flame),y0=a.y+st.bob;
  if(health<=0){
   // A thin wisp of smoke instead of any glow: flame=0 must never emit light.
   if(st.smoke>0){ctx.save();ctx.strokeStyle='rgba(190,198,214,'+(.5*st.smoke)+')';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,y0);for(let i=1;i<8;i++)ctx.lineTo(a.x+Math.sin(st.t*2+i)*4*i*.4,y0-i*7);ctx.stroke();ctx.restore()}
   return;
  }
  const size=8+26*Math.pow(health/100,.7),lean=st.reduced?0:Math.max(-1,Math.min(1,st.wind*(st.shield?.15:.9)))*size*.5,flick=st.reduced?0:Math.sin(st.t*13)*1.4+Math.sin(st.t*7.3)*1.1;
  const light=Math.min(1,health/100)*(st.hope?1.2:1);
  // Halo first (additive) so the flame lights the air around it.
  ctx.save();ctx.globalCompositeOperation='lighter';
  const halo=ctx.createRadialGradient(a.x,y0-size*.4,1,a.x,y0-size*.4,size*2.4+health*.6);
  halo.addColorStop(0,'rgba(255,214,140,'+(.55*light)+')');halo.addColorStop(.4,'rgba(255,170,90,'+(.18*light)+')');halo.addColorStop(1,'rgba(255,150,80,0)');
  ctx.fillStyle=halo;ctx.fillRect(a.x-200,y0-220,400,400);ctx.restore();
  const tip={x:a.x+lean+flick*.4,y:y0-size*1.55-flick};
  const shape=(w,h,fill)=>{ctx.beginPath();ctx.moveTo(a.x-w,y0-h*.25);ctx.bezierCurveTo(a.x-w*1.05,y0-h*.85,tip.x-w*.25,tip.y+h*.35,tip.x,tip.y+(1-h/size)*size*.6);ctx.bezierCurveTo(tip.x+w*.35,tip.y+h*.4,a.x+w*1.1,y0-h*.8,a.x+w,y0-h*.25);ctx.quadraticCurveTo(a.x,y0+h*.18,a.x-w,y0-h*.25);ctx.fillStyle=fill;ctx.fill()};
  const outer=ctx.createLinearGradient(0,tip.y,0,y0);outer.addColorStop(0,'#ffcf7a');outer.addColorStop(.6,'#f58a45');outer.addColorStop(1,'#d9573c');
  shape(size*.62,size,outer);
  const inner=ctx.createLinearGradient(0,tip.y,0,y0);inner.addColorStop(0,'#fff0b8');inner.addColorStop(1,'#ffc864');
  shape(size*.4,size*.72,inner);
  shape(size*.2,size*.4,'#fffbe6');
  // A personality, revealed in small eyes: calm, comfort, afraid, suffocating, hope.
  if(health>6){
   const ex=a.x+lean*.25,ey=y0-size*.55,e=st.expression,blink=!st.reduced&&Math.sin(st.t*1.7)>.985,look=st.lookAt||0;
   ctx.fillStyle=e==='suffocating'?'#6b6f80':'#6e3d2a';
   if(blink){ctx.fillRect(ex-6+look,ey,4,1.3);ctx.fillRect(ex+2+look,ey,4,1.3)}
   else{const ry=e==='afraid'?2.4:e==='comfort'?1.1:1.8;ctx.beginPath();ctx.ellipse(ex-4+look,ey,1.5,ry,0,0,6.283);ctx.ellipse(ex+4+look,ey,1.5,ry,0,0,6.283);ctx.fill()}
   ctx.strokeStyle='#7d4632';ctx.lineWidth=1;ctx.beginPath();
   if(e==='afraid'||e==='suffocating')ctx.arc(ex+look,ey+6,1.8,Math.PI,0);else ctx.arc(ex+look,ey+3,3,.15*Math.PI,.85*Math.PI);
   ctx.stroke();
  }
  if(st.hope&&!st.reduced){for(let i=0;i<8;i++){const ang=i*.785+st.t*1.2,r=size*1.1+i;ctx.fillStyle='rgba(255,236,186,.7)';ctx.fillRect(a.x+Math.cos(ang)*r,y0-size*.5+Math.sin(ang)*r,2,2)}}
 }
 function cupHand(ctx,st,at){
  const a=at||flameAnchor(),y=a.y+(st.bob||0),lit=Math.max(0,Math.min(1,st.flame/100));
  ctx.save();ctx.translate(a.x-15,y-6);ctx.rotate(-.35);
  const g=ctx.createLinearGradient(14,0,-10,0);g.addColorStop(0,'rgb('+Math.round(122+lit*110)+','+Math.round(62+lit*70)+','+Math.round(72+lit*40)+')');g.addColorStop(1,'#5e2e38');
  ctx.fillStyle=g;ctx.beginPath();ctx.ellipse(0,0,8,17,0,0,6.283);ctx.fill();
  ctx.strokeStyle='rgba(255,214,170,'+(.2+lit*.6)+')';ctx.lineWidth=1.6;ctx.beginPath();ctx.arc(0,0,8,-1.2,1.2);ctx.stroke();
  ctx.restore();
 }
 // Darkness closes in as the flame weakens; light sources drawn after it stay readable.
 function vignette(ctx,light,center){
  const W=view.W,r0=40+light*150,g=ctx.createRadialGradient(center.x,center.y,r0*.25,center.x,center.y,r0+220);
  g.addColorStop(0,'rgba(4,7,15,0)');g.addColorStop(.45,'rgba(4,7,15,'+(.18+(1-light)*.25)+')');g.addColorStop(1,'rgba(4,7,15,'+(.5+(1-light)*.38)+')');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 }
 function windowGlow(ctx,cam,level,t){
  if(level<=0)return;
  const z=1.04+ZOOM.mid*cam.p,x=view.W/2-VP.x*z+280*z+cam.sway*DEPTH.mid*14+cam.push*DEPTH.mid*10,y=VP.y-VP.y*z+251*z;
  ctx.save();ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(x,y,2,x,y,36+level*100);g.addColorStop(0,'rgba(255,226,160,'+(.5*Math.min(1,level))+')');g.addColorStop(1,'rgba(255,180,100,0)');
  ctx.fillStyle=g;ctx.fillRect(x-200,y-200,400,400);ctx.restore();
  return {x,y};
 }
 function memoryMote(ctx,m,t,reduced){
  const x=m.u*view.W,y=m.y,p=reduced?1:1+Math.sin(t*5)*.16;
  ctx.save();ctx.translate(x,y);ctx.scale(p,p);ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(0,0,1,0,0,30);g.addColorStop(0,'rgba(255,236,186,.95)');g.addColorStop(1,'rgba(255,190,110,0)');ctx.fillStyle=g;ctx.fillRect(-32,-32,64,64);ctx.restore();
  ctx.save();ctx.fillStyle='#fff3cf';ctx.font='bold 22px system-ui,sans-serif';ctx.textAlign='center';ctx.fillText('✦',x,y+7);
  ctx.font='bold 11px system-ui,sans-serif';ctx.fillStyle='#fff1cf';ctx.shadowColor='#000';ctx.shadowBlur=4;ctx.fillText('記憶にふれる',x,y+40);ctx.restore();
 }
 function hud(ctx,s){
  ctx.save();ctx.fillStyle='rgba(5,10,20,.55)';ctx.beginPath();ctx.roundRect(8,10,166,58,10);ctx.fill();ctx.restore();
  const meter=(label,value,y,color)=>{ctx.fillStyle='#e9ecf2';ctx.font='bold 11px system-ui,sans-serif';ctx.textAlign='left';ctx.fillText(label,16,y);ctx.fillStyle='rgba(20,30,46,.8)';ctx.beginPath();ctx.roundRect(46,y-8,118,8,4);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(46,y-8,118*Math.max(0,Math.min(100,value))/100,8,4);ctx.fill()};
  meter('灯り',s.flame,24,'#ffb15b');meter('息',s.oxygen,42,s.oxygen<28?'#e98a8a':'#a4cee2');
  for(let i=0;i<3;i++){const x=24+i*16,y=58;ctx.strokeStyle='#eacb91';ctx.lineWidth=1.5;ctx.beginPath();ctx.arc(x,y,5,0,6.283);ctx.stroke();if(i<s.memories){ctx.fillStyle='#ffd98d';ctx.beginPath();ctx.arc(x,y,3.2,0,6.283);ctx.fill()}}
 }
 function caption(ctx,text,sub,warn){
  const W=view.W;ctx.save();ctx.textAlign='center';
  const g=ctx.createLinearGradient(0,H-74,0,H);g.addColorStop(0,'rgba(4,8,16,0)');g.addColorStop(1,'rgba(4,8,16,.72)');ctx.fillStyle=g;ctx.fillRect(0,H-74,W,74);
  ctx.font='bold 15px system-ui,sans-serif';ctx.fillStyle=warn?'#ffd39a':'#e3eaf3';ctx.shadowColor='#000';ctx.shadowBlur=6;ctx.fillText(text,W/2,H-30);
  if(sub){ctx.font='11px system-ui,sans-serif';ctx.fillStyle='#bac8d6';ctx.fillText(sub,W/2,H-12)}ctx.restore();
 }
 // ---------- one gameplay frame ----------
 function frame(ctx,s,t,o){
  begin(ctx);
  const W=view.W,ci=s.chapter,since=t-(s.sceneChangedAt??-999);
  const chapterStart=[0,20,45,70][ci],chapterEnd=[20,45,70,90][ci],p=Math.max(0,Math.min(1,(t-chapterStart)/(chapterEnd-chapterStart)));
  const reduced=o.reduced,wind=s.wind??.2;
  const cam={p,sway:reduced?0:Math.sin(t*.35)*.6,push:reduced?0:Math.min(1,wind)*.8,bob:reduced?0:Math.sin(t*2.6),breath:reduced?0:Math.sin(t*.8)};
  const light=Math.max(0,Math.min(1,s.flame/100))*(s.rescue||s.reply>0?1.15:1);
  const lightAlpha=ci===3?.35+.65*Math.max(s.reply||0,.25):.9;
  if(!drawChapter(ctx,ci,cam,1,lightAlpha))fallbackSky(ctx,ci);
  if(since>=0&&since<1.35&&s.previousChapter!==ci)drawChapter(ctx,s.previousChapter,{...cam,p:1},1-since/1.35);
  const a=flameAnchor();
  vignette(ctx,light,{x:a.x,y:a.y});
  // Destination window: dim through the night, answers in the finale.
  if(ci===3)windowGlow(ctx,cam,s.reply>0?s.reply*(s.replyLevel==='bright'?1:.6):s.rescue?.6:.12,t);
  if(s.rescue&&t-s.rescueAt<6&&ci===3){const w=windowGlow(ctx,cam,Math.max(0,1-(t-s.rescueAt)/6),t);if(w)beam(ctx,w,a,Math.max(0,1-(t-s.rescueAt)/6))}
  if(s.replyLevel==='bright'&&ci===3){const w=windowGlow(ctx,cam,1,t);if(w)beam(ctx,w,a,.8)}
  if(s.event&&t>=s.event.at&&s.event.kind==='lantern'){const g=ctx.createRadialGradient(W*.15,250,4,W*.15,250,120);g.addColorStop(0,'rgba(255,214,150,.5)');g.addColorStop(1,'rgba(255,190,110,0)');ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.fillRect(0,120,W,260);ctx.restore()}
  const quiet=s.finalePhase==='silence'||s.finalePhase==='window-reply';
  snow(ctx,t,quiet?.02:wind,reduced,s.event?.kind==='eddy'&&t>=s.event.at?Math.sin(t*3):1);
  const warn=(s.event&&t<s.event.at&&(s.event.kind==='gust'||s.event.kind==='eddy'))||s.finalePhase==='gust-warning'?1:0;
  windLines(ctx,t,quiet?0:wind,warn,reduced);
  const bob=drawTraveller(ctx,{t,shield:s.shield,wind,reduced,light,walking:o.playing});
  drawFlame(ctx,{t,flame:s.flame,wind,shield:s.shield,reduced,expression:o.expression,hope:o.expression==='hope',bob,smoke:1,lookAt:ci===3&&quiet?2:0});
  if(s.shield)cupHand(ctx,{flame:s.flame,bob});
  drawFore(ctx,ci,cam);
  if(s.mote)memoryMote(ctx,s.mote,t,reduced);
  if(ci===1&&t<s.shelterUntil){ctx.fillStyle='rgba(255,222,165,.08)';ctx.fillRect(0,90,W,300);caption(ctx,'風をよけられる — 今のうちに息を戻す','',false)}
  else caption(ctx,o.caption,'家まで '+Math.max(0,Math.ceil((1-Math.min(1,t/90))*100))+'m',o.warn);
  hud(ctx,s);
  end(ctx);
 }
 function beam(ctx,from,to,strength){
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.strokeStyle='rgba(255,226,170,'+(.35*strength)+')';ctx.lineWidth=3+strength*5;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.quadraticCurveTo((from.x+to.x)/2,Math.min(from.y,to.y)-40,to.x,to.y);ctx.stroke();ctx.restore();
 }
 // ---------- ending tableaus: each ending has its own last image ----------
 function endingFrame(ctx,s,ending,te,o){
  begin(ctx);
  const W=view.W,reduced=o.reduced,ci=ending==='dawn'||ending==='survive'||ending==='wish'?3:s.chapter;
  const cam={p:ending==='dawn'?1:.8,sway:0,push:0,bob:0,breath:0};
  const k=Math.min(1,te/2.4);
  const a=flameAnchor();
  if(!drawChapter(ctx,ci,cam,1,ci===3?(ending==='dawn'?1:.35):.9))fallbackSky(ctx,ci);
  if(ending==='dawn'){
   // Sunrise rises behind the house and the window light pours toward the flame.
   const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(255,190,140,0)');g.addColorStop(.55,'rgba(255,196,140,'+(.28*k)+')');g.addColorStop(1,'rgba(255,220,180,'+(.18*k)+')');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
   const w=windowGlow(ctx,cam,.6+k*.6,te);if(w)beam(ctx,w,a,k);
   vignette(ctx,1,a);
  }else if(ending==='survive'){
   const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'rgba(140,150,200,0)');g.addColorStop(1,'rgba(220,170,150,'+(.12*k)+')');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
   windowGlow(ctx,cam,.25+.15*Math.sin(te*2),te);vignette(ctx,.45,a);
  }else if(ending==='wish'){
   windowGlow(ctx,cam,.3,te);vignette(ctx,.25,a);
  }else{
   vignette(ctx,0,a);
   // Even in loss, the far lights and the way home stay visible.
   ctx.save();ctx.globalAlpha=.6;drawChapter(ctx,ci,cam,0,1);ctx.restore();
  }
  snow(ctx,te,ending==='blown'?.9:ending==='smother'?.15:.05,reduced);
  if(ending==='blown')windLines(ctx,te,.9,0,reduced);
  const flame=ending==='dawn'?90:ending==='survive'?22+Math.sin(te*6)*4:ending==='smother'?Math.max(0,30*(1-te/1.6)):0;
  const bob=drawTraveller(ctx,{t:te,shield:ending==='smother',wind:ending==='blown'?.9:.1,reduced,light:flame/100,walking:false});
  if(ending==='smother')cupHand(ctx,{flame,bob});
  drawFlame(ctx,{t:te,flame,wind:ending==='blown'?.9:.05,shield:ending==='smother',reduced,expression:ending==='dawn'?'hope':ending==='survive'?'afraid':'calm',hope:ending==='dawn',bob,smoke:ending==='blown'||ending==='smother'?Math.max(0,1-te/4):0,lookAt:ending==='dawn'?2:0});
  if(ending==='wish'){
   // The three memories rise from the empty hands and become stars.
   for(let i=0;i<3;i++){const q=Math.min(1,Math.max(0,(te-i*.45)/2.2)),x=a.x+(i-1)*42*q,y=a.y-q*(220+i*14);ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(x,y,1,x,y,18);g.addColorStop(0,'rgba(255,236,186,.95)');g.addColorStop(1,'rgba(255,190,110,0)');ctx.fillStyle=g;ctx.fillRect(x-20,y-20,40,40);ctx.restore()}
  }
  if(ending==='smother'&&te<2){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<6;i++){const q=te/2,x=a.x+Math.sin(i*1.7)*16*q,y=a.y-q*40-i*4;ctx.fillStyle='rgba(255,170,100,'+(.7*(1-q))+')';ctx.fillRect(x,y,2,2)}ctx.restore()}
  drawFore(ctx,ci,cam);
  end(ctx);
 }
 // ---------- prologue「最後の灯り」 ----------
 const INTRO=[
  {at:0,text:'雪の夜。町の明かりが、ひとつずつ消えた。'},
  {at:4,text:'暖炉に、小さな灯りがひとつ残っていた。'},
  {at:8,text:'灯りは、少女の手に飛び込んだ。'},
  {at:11.5,text:'遠い窓を、じっと見つめている。'},
  {at:14,text:'「……あそこに、帰りたいの？」'},
  {at:16.5,text:'きえないで。'}
 ];
 const INTRO_LENGTH=19;
 function introFrame(ctx,t,o){
  begin(ctx);
  const W=view.W,reduced=o.reduced,px=view.dpr*view.scale,ease=x=>x<0?0:x>1?1:x*x*(3-2*x);
  if(t<11){
   // Room → push in toward the hearth.
   const z=reduced?1.04:1.04+ease((t-3)/5)*.5,size=ART*z,fx=340,fy=300;
   const room=raster('intro-room',ART*1.6*px,ART*1.6*px),lights=raster('intro-lights',ART*1.6*px,ART*1.6*px);
   const x=W/2-fx*z+(reduced?0:ease((t-3)/5)*(fx-240)*.9),y=H/2-fy*z+(reduced?0:ease((t-3)/5)*40)+60;
   if(room)ctx.drawImage(room,x,y,size,size);else{ctx.fillStyle='#2a2024';ctx.fillRect(0,0,W,H)}
   const ember=t<8?1:Math.max(0,1-(t-8)/1.2);
   if(lights){ctx.save();ctx.globalAlpha=.35+.4*ember;ctx.globalCompositeOperation='lighter';ctx.drawImage(lights,x,y,size,size);ctx.restore()}
   // Outside lights go out one by one in the room window.
   const hx=x+340*z,hy=y+302*z;
   const fl=t<4?Math.min(1,t/2)*25:t<8?30:t<9.6?30:0;
   if(t<9.6)drawFlame(ctx,{t,flame:fl,wind:.05,shield:false,reduced,expression:t>5.5?'calm':'afraid',hope:false,bob:0,smoke:0},{x:hx,y:hy});
   if(t>=8){const q=ease((t-8)/1.6),sx=hx,sy=hy,ex=W/2,ey=H*.62;const fx2=sx+(ex-sx)*q,fy2=sy+(ey-sy)*q-Math.sin(q*Math.PI)*90;
    drawFlame(ctx,{t,flame:32,wind:.1,shield:false,reduced,expression:'calm',hope:false,bob:0,smoke:0},{x:fx2,y:fy2});
    if(t>=9.4)mittens(ctx,W/2,H*.62+6,ease((t-9.4)/.8));}
   ctx.fillStyle='rgba(4,7,15,'+(.25+(t<1.5?(1.5-t)/1.5*.75:0))+')';ctx.fillRect(0,0,W,H);
  }else{
   // Through the window: the far house, a figure in its window, then the snowy road.
   const q=reduced?1:ease((t-11)/3),ci=t<16?3:0,cam={p:t<16?.4+q*.2:ease((t-16)/3)*.3,sway:0,push:0,bob:0,breath:0};
   drawChapter(ctx,ci,cam,1,ci===3?.55:.9);
   if(ci===3){const w=windowGlow(ctx,cam,.55,t);if(w&&t>12.4&&t<13.3){ctx.fillStyle='rgba(30,26,40,.85)';ctx.beginPath();ctx.ellipse(w.x+2,w.y+2,3.2,5.5,0,0,6.283);ctx.fill()}}
   vignette(ctx,.55,{x:W/2,y:H*.62});
   snow(ctx,t,.25,reduced);
   const nod=t>14.6&&t<15.6&&!reduced?Math.sin((t-14.6)*Math.PI*2)*3:0;
   if(t<16){mittens(ctx,W/2,H*.7+6,1);drawFlame(ctx,{t,flame:34,wind:.1,shield:false,reduced,expression:'calm',hope:t>14.6,bob:nod,smoke:0,lookAt:2},{x:W/2,y:H*.7})}
   else{const bob=drawTraveller(ctx,{t,shield:false,wind:.25,reduced,light:.34,walking:true});drawFlame(ctx,{t,flame:34,wind:.2,shield:false,reduced,expression:'calm',hope:false,bob,smoke:0});drawFore(ctx,0,cam)}
   if(t<11.8){ctx.fillStyle='rgba(4,7,15,'+(1-(t-11)/.8)+')';ctx.fillRect(0,0,W,H)}
  }
  const line=[...INTRO].reverse().find(l=>t>=l.at);
  if(line){const age=t-line.at,alpha=Math.min(1,age/.6);ctx.save();ctx.globalAlpha=alpha;ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=10;
   if(line.at===16.5){ctx.font='bold 38px system-ui,sans-serif';ctx.fillStyle='#ffe3a8';ctx.fillText(line.text,W/2,150)}
   else{ctx.font='600 15px system-ui,sans-serif';ctx.fillStyle='#fff2d8';wrap(ctx,line.text,W-36).forEach((row,i)=>ctx.fillText(row,W/2,64+i*24))}ctx.restore()}
  end(ctx);
 }
 // Break Japanese text after punctuation first, then by width.
 function wrap(ctx,text,max){
  if(ctx.measureText(text).width<=max)return [text];
  const rows=[];let row='';
  for(const ch of text){if(ctx.measureText(row+ch).width>max&&row){rows.push(row);row=''}row+=ch;if((ch==='、'||ch==='。')&&ctx.measureText(row).width>max*.45&&rows.length<2){rows.push(row);row=''}}
  if(row)rows.push(row);return rows;
 }
 function mittens(ctx,x,y,q){
  if(q<=0)return;ctx.save();ctx.globalAlpha=Math.min(1,q);ctx.fillStyle='#8a4652';
  ctx.beginPath();ctx.ellipse(x-17,y+14-(1-q)*30,15,10,-.5,0,6.283);ctx.ellipse(x+17,y+14-(1-q)*30,15,10,.5,0,6.283);ctx.fill();
  ctx.strokeStyle='#c97d84';ctx.lineWidth=1.4;ctx.beginPath();ctx.moveTo(x-28,y+8-(1-q)*30);ctx.quadraticCurveTo(x,y+26-(1-q)*30,x+28,y+8-(1-q)*30);ctx.stroke();ctx.restore();
 }
 return {view,resize,toWorld,toCss,frame,endingFrame,introFrame,INTRO,INTRO_LENGTH,flameAnchor,ready,imgs,failed:()=>failed,names};
}
root.KienaideView={create};
})(typeof window!=='undefined'?window:globalThis);
