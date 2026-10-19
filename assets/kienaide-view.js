// 004「きえないで。」 renderer. Painted layers in the art-bible style (assets/kienaide-v3) are composed
// at runtime: chapter plates split into sky/far/mid/fore + an additive lights layer, the traveller,
// her hands, the flame spirit sprite and every light it casts are separate,
// so nothing glows when the flame is out. Rules live in kienaide-core.js; this file only draws.
(function(root){'use strict';
const H=480,PW=900,PH=1200;
const CH=['ch1','ch2','ch3','ch4'],BANDS=['sky','far','mid','fore'];
// Weighted premultiplied layers keep their opaque overlap solid instead of leaking the scenery.
function blendPose(g,previous,current,fade){g.clearRect(0,0,g.canvas.width,g.canvas.height);g.save();g.globalAlpha=1-fade;g.drawImage(previous,0,0,g.canvas.width,g.canvas.height);g.globalCompositeOperation='lighter';g.globalAlpha=fade;g.drawImage(current,0,0,g.canvas.width,g.canvas.height);g.restore()}
const HERO_POSES=['hero-shield','hero-blink','hero-walk','hero-brace','hero-cold','hero-breathless','hero-relief','hero-lookup'];
const END_POSES=['end-blown','end-smother','end-wish','end-survive','end-dawn'];
const FLAME_POSES=['flame-calm','flame-afraid','flame-comfort','flame-suffocating','flame-hope'];
// Extra zoom per band while walking through a chapter: the foreground leads, the sky barely moves.
const DEPTH={sky:0,far:.012,mid:.03,fore:.06};
// Focal point of each plate (vanishing point / destination) in plate pixels; the camera keeps it framed.
const FOCUS=[{x:540,y:640},{x:672,y:650},{x:452,y:430},{x:486,y:592}];
const WINDOW={x:486,y:592};
const LAMP={x:810,y:534};
const INTRO=[
 {at:0,text:'雪の夜。小さな家の暖炉が、消えかけていた。',rows:['雪の夜。小さな家の暖炉が、','消えかけていた。']},
 {at:4,text:'灰の中で、最後の灯りだけが震えていた。',rows:['灰の中で、最後の灯りだけが','震えていた。']},
 {at:8,text:'灯りは、少女の手に飛び込んだ。',rows:['灯りは、少女の手に','飛び込んだ。']},
 {at:11.5,text:'遠い窓を、じっと見つめている。',rows:['遠い窓を、じっと','見つめている。']},
 {at:14,text:'「……あそこに、帰りたいの？」',rows:['「……あそこに、帰りたいの？」']},
 {at:16.5,text:'きえないで。',rows:['きえないで。']}
];
function create(base){
 const imgs={},cache=new Map();let manifest=null,failed=0;
 const dir=base+'assets/kienaide/paint/';
 const names=[];for(const c of CH)for(const l of [...BANDS,'lights'])names.push(c+'-'+l);
 names.push('intro-room','frost-edge','hero-body','hero-hands','hero-rim','flame',...HERO_POSES,...END_POSES,...FLAME_POSES);
 const pending=[];
 for(const n of names){const img=new Image();img.decoding='async';pending.push(new Promise(resolve=>{img.onload=()=>resolve(true);img.onerror=()=>{failed++;resolve(false)}}));img.src=dir+n+'.webp';imgs[n]=img}
 pending.push(fetch(dir+'manifest.json').then(r=>{if(!r.ok)throw new Error('manifest');return r.json()}).then(m=>{manifest=m;return true}).catch(()=>{failed++;return false}));
 const loaded=Promise.all(pending).then(results=>results.every(Boolean));
 const ready=n=>{const i=imgs[n];return !!(i&&i.complete&&i.naturalWidth>0)};
 // A fixed paper grain helps separately generated paintings sit inside the same film.
 // Keep it fixed: stepping the tile made fine painted edges appear to crawl.
 const grain=document.createElement('canvas');grain.width=grain.height=64;
 const grainCtx=grain.getContext('2d'),grainData=grainCtx.createImageData(64,64);let grainSeed=90421;
 for(let i=0;i<grainData.data.length;i+=4){grainSeed=(grainSeed*1664525+1013904223)>>>0;const v=112+(grainSeed>>>24)%96;grainData.data[i]=v;grainData.data[i+1]=v+3;grainData.data[i+2]=v+8;grainData.data[i+3]=34}
 grainCtx.putImageData(grainData,0,0);
 // Tinted copies are cached for any state-specific colour treatment.
 function tinted(n,color){const key='tint|'+n+'|'+color;if(cache.has(key))return cache.get(key);if(!ready(n))return null;const i=imgs[n],c=document.createElement('canvas');c.width=i.naturalWidth;c.height=i.naturalHeight;const g=c.getContext('2d');g.drawImage(i,0,0);g.globalCompositeOperation='source-in';g.fillStyle=color;g.fillRect(0,0,c.width,c.height);cache.set(key,c);return c}
 // Adaptive resolution: if frames stay slow, render fewer pixels instead of dropping frames.
 const perf={ema:16,frames:0,quality:1};
 function sample(ms){
  if(!(ms>0&&ms<250))return;perf.ema=perf.ema*.92+ms*.08;perf.frames++;
  if(perf.frames>45&&perf.ema>26&&perf.quality>.5){perf.quality=Math.max(.5,perf.quality*.8);perf.frames=0;view.cssW=0}
 }
 const view={W:360,scale:1,ox:0,oy:0,dpr:1,cssW:0,cssH:0};
 function resize(canvas){
  const box=canvas.getBoundingClientRect(),cssW=Math.max(1,box.width),cssH=Math.max(1,box.height);
  const dpr=Math.max(.8,Math.min(2,root.devicePixelRatio||1)*perf.quality);
  // Follow the actual portrait aspect ratio. The previous 300px floor letterboxed tall phones,
  // leaving large black bands above and below the painting.
  const W=Math.max(220,Math.min(480,cssW/cssH*H));
  const scale=Math.min(cssW/W,cssH/H);
  if(cssW===view.cssW&&cssH===view.cssH&&dpr===view.dpr)return view;
  Object.assign(view,{W,scale,dpr,cssW,cssH,ox:(cssW-W*scale)/2,oy:(cssH-H*scale)/2});
  canvas.width=Math.round(cssW*dpr);canvas.height=Math.round(cssH*dpr);
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='low';
  return view;
 }
 function toWorld(canvas,clientX,clientY){const b=canvas.getBoundingClientRect();return {x:(clientX-b.left-view.ox)/view.scale,y:(clientY-b.top-view.oy)/view.scale}}
 function toCss(x,y){return {x:view.ox+x*view.scale,y:view.oy+y*view.scale}}
 function begin(ctx){ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#070b14';ctx.fillRect(0,0,ctx.canvas.width,ctx.canvas.height);const k=view.dpr*view.scale;ctx.setTransform(k,0,0,k,view.dpr*view.ox,view.dpr*view.oy);ctx.save();ctx.beginPath();ctx.rect(0,0,view.W,H);ctx.clip()}
 function end(ctx){ctx.restore()}
 // ---------- plates ----------
 // Cover-fit the 900x1200 plate, zooming toward the chapter's focal point as the walk progresses.
 function plateTransform(ci,p,extra=0,swayPx=0){
  const W=view.W,f=FOCUS[ci],s0=Math.max(W/PW,H/PH),z=s0*(1.03+.07*p+extra);
  const clamp=(v,lo,hi)=>Math.min(hi,Math.max(lo,v));
  const x0u=clamp(W/2-f.x*s0,W-PW*s0,0),y0u=clamp(H*.5-f.y*s0,H-PH*s0,0);
  const fxs=x0u+f.x*s0,fys=y0u+f.y*s0;
  return {z,x:clamp(fxs-f.x*z+swayPx,W-PW*z,0),y:clamp(fys-f.y*z,H-PH*z,0)};
 }
 function toScreen(ci,cam,px,py,band='mid'){const t=plateTransform(ci,cam.p,DEPTH[band]*cam.p,cam.sway*DEPTH[band]*40);return {x:t.x+px*t.z,y:t.y+py*t.z,z:t.z}}
 function drawPlate(ctx,ci,cam,alpha=1,lightAlpha=1,bands=BANDS){
  const k=CH[ci],m=manifest?.chapters?.[k];if(!m||!bands.every(b=>ready(k+'-'+b)))return false;
  ctx.save();ctx.globalAlpha=alpha;
  for(const b of bands){const t=plateTransform(ci,cam.p,DEPTH[b]*cam.p,cam.sway*DEPTH[b]*40),r=m.bands[b];ctx.drawImage(imgs[k+'-'+b],t.x,t.y+r.top*t.z,PW*t.z,(r.bottom-r.top)*t.z)}
  if(lightAlpha>0&&ready(k+'-lights')&&bands.includes('mid')){const t=plateTransform(ci,cam.p,DEPTH.mid*cam.p,cam.sway*DEPTH.mid*40);ctx.globalAlpha=alpha*lightAlpha;ctx.globalCompositeOperation='lighter';ctx.drawImage(imgs[k+'-lights'],t.x,t.y,PW*t.z,PH*t.z)}
  ctx.restore();return true;
 }
 function drawIntroRoom(ctx,t,reduced){
  if(!ready('intro-room'))return null;
  const q=reduced?1:Math.max(0,Math.min(1,t/9)),z=Math.max(view.W/PW,H/PH)*(1.02+.035*q);
  const focus={x:470+(710-470)*q,y:610+(825-610)*q};
  const x=Math.min(0,Math.max(view.W-PW*z,view.W/2-focus.x*z)),y=Math.min(0,Math.max(H-PH*z,H/2-focus.y*z));
  ctx.drawImage(imgs['intro-room'],x,y,PW*z,PH*z);
  return {x:x+708*z,y:y+828*z,z};
 }
 function fallbackSky(ctx,ci){const W=view.W,g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,['#0b1326','#0a1222','#070d1c','#1a2244'][ci]);g.addColorStop(1,['#2c3a55','#1d2940','#22324f','#6e5a7a'][ci]);ctx.fillStyle=g;ctx.fillRect(0,0,W,H)}
 // Dawn: the sky warms from the horizon while the night stays at the top.
 function dawnGrade(ctx,k){
  if(k<=0)return;const W=view.W;ctx.save();ctx.globalCompositeOperation='soft-light';
  const g=ctx.createLinearGradient(0,0,0,H*.75);g.addColorStop(0,'rgba(40,50,120,'+(.3*k)+')');g.addColorStop(.7,'rgba(255,170,150,'+(.55*k)+')');g.addColorStop(1,'rgba(255,200,170,'+(.3*k)+')');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();
 }
 // ---------- weather ----------
 const flakes=Array.from({length:144},(_,i)=>({x:(i*97.13)%1,y:(i*57.31)%1,d:i%4,s:.6+((i*13)%7)/7}));
 function snow(ctx,t,wind,reduced,dir=1,layer='front'){
  const W=view.W,n=reduced?64:flakes.length;ctx.save();ctx.lineCap='round';
  for(let i=0;i<n;i++){const f=flakes[i],front=f.d>=2;if((layer==='back'&&front)||(layer==='front'&&!front))continue;
   const speed=(10+f.d*15)*(reduced?.25:1),drift=(7+wind*135)*(1+f.d*.48)*(reduced?.2:1)*dir;
   const x=((f.x*W+t*drift)%(W+34)+W+34)%(W+34)-17,y=((f.y*H+t*speed*f.s)%(H+18)+H+18)%(H+18)-9;
   const r=.45+f.d*.62,alpha=.16+f.d*.11;
   if(f.d===3&&wind>.42&&!reduced){ctx.strokeStyle='rgba(236,243,252,'+Math.min(.52,alpha+wind*.12)+')';ctx.lineWidth=r*.62;ctx.beginPath();ctx.moveTo(x-r*4*dir,y-r*.9);ctx.lineTo(x+r*2*dir,y+r*.25);ctx.stroke()}
   else{ctx.fillStyle='rgba(236,243,252,'+alpha+')';ctx.beginPath();ctx.ellipse(x,y,r*(f.d===3?1.45:1),r,0,0,6.283);ctx.fill()}
   if(f.d===3){ctx.fillStyle='rgba(225,235,250,.055)';ctx.beginPath();ctx.arc(x,y,r*3.8,0,6.283);ctx.fill()}}
  ctx.restore();
 }
 function windLines(ctx,t,wind,warn,reduced){
  const W=view.W,strength=Math.max(0,wind-.25)+warn*.5;if(strength<=0)return;
  ctx.save();ctx.lineCap='round';
  for(let i=0;i<8;i++){const y=100+i*38+Math.sin(i*2.1)*12,len=60+strength*100,speed=reduced?60:150+strength*260;
   const x0=((t*speed+i*137)%(W+len*2))-len,g=ctx.createLinearGradient(x0,0,x0+len,0);
   g.addColorStop(0,'rgba(210,225,245,0)');g.addColorStop(.5,'rgba(220,232,248,'+Math.min(.45,.08+strength*.38)+')');g.addColorStop(1,'rgba(210,225,245,0)');
   ctx.strokeStyle=g;ctx.lineWidth=1+strength*2.4;ctx.beginPath();ctx.moveTo(x0,y);ctx.quadraticCurveTo(x0+len*.5,y-6-strength*10,x0+len,y);ctx.stroke()}
  ctx.restore();
 }
 function breath(ctx,st){
  const cold=st.ci===2?.9:st.ci===3?.45:.28,need=Math.max(0,(48-(st.oxygen??100))/48),amount=Math.min(1,cold+need*.55);
  if(amount<.2)return false;const b=heroBox(),phase=st.reduced?.68:((st.t*.42)%1),visible=Math.sin(Math.PI*Math.min(1,phase*1.7));if(visible<.08)return false;
  const x=b.x+b.w*.59,y=b.y+b.h*.205+(st.bob||0),wind=st.wind??.2;
  ctx.save();ctx.globalCompositeOperation='screen';
  for(let i=0;i<(st.reduced?2:4);i++){const q=Math.max(0,Math.min(1,phase+i*.13)),dx=q*(17+wind*32),dy=-q*(5+i*2),r=3+q*9+i;
   const g=ctx.createRadialGradient(x+dx,y+dy,0,x+dx,y+dy,r);g.addColorStop(0,'rgba(225,235,248,'+(.15*amount*visible)+')');g.addColorStop(1,'rgba(205,220,240,0)');ctx.fillStyle=g;ctx.fillRect(x+dx-r,y+dy-r,r*2,r*2)}
  ctx.restore();return true;
 }
 function embers(ctx,st){
  if(!(st.flame>0)||st.reduced)return false;const a=flameAnchor(),energy=Math.min(1,st.flame/70)*(st.shield?.55:Math.min(1,.2+(st.wind||0)));
  ctx.save();ctx.globalCompositeOperation='lighter';
  for(let i=0;i<7;i++){const age=((st.t*.42+i*.173)%1),curl=Math.sin(st.t*2.1+i*2.7);const x=a.x+curl*(5+age*10)+(st.wind||0)*age*15,y=a.y+(st.bob||0)-8-age*(22+i*2);ctx.globalAlpha=(1-age)*energy;ctx.fillStyle=i%3?'#ffc477':'#fff0b4';ctx.fillRect(x,y,i%3?1.4:2,i%3?2.6:2)}
  ctx.restore();return true;
 }
 function frost(ctx,st){
  const oxygen=Math.max(0,(42-(st.oxygen??100))/42),flame=Math.max(0,(32-(st.flame??100))/32),chapter=st.ci===2?.2:0,amount=Math.min(.78,chapter+oxygen*.46+flame*.34);
  if(amount<.08)return false;const W=view.W;ctx.save();
  const edge=ctx.createRadialGradient(W/2,H*.52,Math.min(W,H)*.3,W/2,H*.52,Math.max(W,H)*.72);edge.addColorStop(.48,'rgba(215,231,248,0)');edge.addColorStop(1,'rgba(205,225,245,'+(amount*.22)+')');ctx.fillStyle=edge;ctx.fillRect(0,0,W,H);
  if(ready('frost-edge')){ctx.globalCompositeOperation='screen';ctx.globalAlpha=amount*.5;ctx.drawImage(imgs['frost-edge'],0,0,W,H)}
  else{ctx.strokeStyle='rgba(225,239,252,'+(amount*.28)+')';ctx.lineWidth=.7;for(let i=0;i<10;i++){const left=i%2===0,x=left?0:W,y=22+(i*67)%430,len=(12+(i*11)%28)*amount,sgn=left?1:-1;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+sgn*len,y+(i%3-1)*7);ctx.lineTo(x+sgn*len*.62,y-8);ctx.stroke()}}
  ctx.restore();return true;
 }
 function cinematicGrade(ctx,ci,light,t,reduced){
  const W=view.W;ctx.save();ctx.globalCompositeOperation='soft-light';
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,['rgba(26,36,76,.36)','rgba(20,31,70,.4)','rgba(21,29,72,.48)','rgba(48,38,82,.32)'][ci]||'rgba(24,32,70,.35)');g.addColorStop(.58,'rgba(18,25,58,.11)');g.addColorStop(1,'rgba(102,73,116,.18)');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);ctx.restore();
  if(light>0){const a=flameAnchor(),flicker=reduced?1:.96+Math.sin(t*7.3)*.025;ctx.save();ctx.globalCompositeOperation='screen';const warm=ctx.createRadialGradient(a.x,a.y,2,a.x,a.y,70+light*65);warm.addColorStop(0,'rgba(255,173,90,'+(.055*light*flicker)+')');warm.addColorStop(1,'rgba(255,150,70,0)');ctx.fillStyle=warm;ctx.fillRect(a.x-150,a.y-150,300,300);ctx.restore()}
 }
 function paperGrain(ctx,t,reduced){
  const W=view.W;ctx.save();ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=.06;const p=ctx.createPattern(grain,'repeat');ctx.fillStyle=p;ctx.fillRect(0,0,W,H);ctx.restore();
 }
 // ---------- traveller ----------
 // The traveller is the emotional focal point, not a small marker inside a background plate.
 function heroBox(){
  const t=manifest?.traveller,w0=t?t.size[0]:556,h0=t?t.size[1]:900,h=Math.min(H*.76,view.W*1.25),k=h/h0,w=w0*k;
  return {x:view.W/2-w*.5,y:H-h+6,w,h,k,t};
 }
 function flameAnchor(){const b=heroBox(),h=b.t?.hands||{x:311,y:229,w:94,h:78};return {x:b.x+(h.x+h.w*.55)*b.k,y:b.y+(h.y+h.h*.32)*b.k}}
 // Each chapter's ambient light is multiplied into the painted figure so she sits inside the scene.
 const AMBIENT=['#b9c3dd','#a9b3d4','#94a6d6','#c1b5d0'];
 function heroLit(name,ci){
  if(!ready(name))return null;const i=imgs[name],h=Math.min(i.naturalHeight,Math.ceil(heroBox().h*view.scale*view.dpr/128)*128),key='hero|'+name+'|'+ci;
  if(cache.has(key)&&cache.get(key).height===h)return cache.get(key);
  // Prefilter once near the display size. Per-frame high-quality resampling is too costly in WebKit.
  const c=document.createElement('canvas');c.width=Math.round(h*i.naturalWidth/i.naturalHeight);c.height=h;const g=c.getContext('2d');g.imageSmoothingEnabled=true;g.imageSmoothingQuality='high';
  g.drawImage(i,0,0,c.width,c.height);g.globalCompositeOperation='multiply';g.fillStyle=AMBIENT[ci]||'#fff';g.fillRect(0,0,c.width,c.height);g.globalCompositeOperation='destination-in';g.drawImage(i,0,0,c.width,c.height);
  cache.set(key,c);return c;
 }
 function heroPose(st){
  if(st.pose&&ready(st.pose))return st.pose;
  if(st.shield&&ready('hero-shield'))return 'hero-shield';
  if(st.finalePhase==='window-reply'&&ready('hero-lookup'))return 'hero-lookup';
  if(st.finalePhase==='silence'&&ready('hero-relief'))return 'hero-relief';
  if((st.oxygen??100)<30&&ready('hero-breathless'))return 'hero-breathless';
  if(!st.shield&&((st.event&&st.event.kind==='lull')||(st.t||0)-(st.releaseAt??-100)<.7)&&ready('hero-relief'))return 'hero-relief';
  if(st.ci===2&&(st.wind??0)>.42&&ready('hero-cold'))return 'hero-cold';
  if((st.wind??0)>.72&&ready('hero-brace'))return 'hero-brace';
  // Walking motion comes from the camera and body bob. Alternating whole paintings here made the
  // traveller appear to teleport between different anatomy every few frames.
  return 'hero-body';
 }
 const poseFx={current:'',previous:'',changedAt:0};
 const poseMix=document.createElement('canvas');poseMix.width=PW;poseMix.height=PH;const poseMixCtx=poseMix.getContext('2d');
 function drawTraveller(ctx,st){
  const b=heroBox(),pose=heroPose(st),pb={x:view.W/2-b.h*(PW/PH)/2,y:b.y,w:b.h*(PW/PH),h:b.h},bob=st.reduced||!st.walking?0:Math.abs(Math.sin(st.t*2.6))*-2.2;
  const now=(root.performance?.now?.()??Date.now())/1000;
  if(!poseFx.current){poseFx.current=pose;poseFx.changedAt=now}
  else if(pose!==poseFx.current){poseFx.previous=poseFx.current;poseFx.current=pose;poseFx.changedAt=now}
  const q=st.reduced?1:Math.max(0,Math.min(1,(now-poseFx.changedAt)/.24)),fade=q*q*(3-2*q);
  ctx.canvas.dataset.pose=pose;
  ctx.canvas.dataset.poseTransition=fade<1?'dissolve':'';
  ctx.save();ctx.translate(0,bob);
  // Soft contact shadow so she stands on the snow, not on top of the picture.
  ctx.fillStyle='rgba(6,10,22,.45)';ctx.beginPath();ctx.ellipse(b.x+b.w*.5,H-4,b.w*.38,7,0,0,6.283);ctx.fill();
  const body=heroLit(pose,st.ci??0)||heroLit('hero-body',st.ci??0);
  if(body){const previous=poseFx.previous&&fade<1?heroLit(poseFx.previous,st.ci??0):null;if(previous){if(poseMix.height!==body.height){poseMix.width=body.width;poseMix.height=body.height}blendPose(poseMixCtx,previous,body,fade);ctx.drawImage(poseMix,pb.x,pb.y,pb.w,pb.h)}else ctx.drawImage(body,pb.x,pb.y,pb.w,pb.h)}
  else{ctx.fillStyle='#1b2338';ctx.beginPath();ctx.ellipse(b.x+b.w*.5,b.y+b.h*.6,b.w*.32,b.h*.38,0,0,6.283);ctx.fill()}
  ctx.restore();
  return bob;
 }
 // Everything the flame lights on her and on the snow, added after the darkness. Zero when out.
 function drawFirelight(ctx,st){
  if(!(st.light>0))return;const b=heroBox(),a=st.at||flameAnchor();
  ctx.save();ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(a.x,H-10,4,a.x,H-10,90+st.light*80);g.addColorStop(0,'rgba(255,184,104,'+(.3*st.light)+')');g.addColorStop(1,'rgba(255,170,90,0)');ctx.fillStyle=g;ctx.fillRect(0,H-170,view.W,170);
  // The old full-body rim used the neutral silhouette for every pose, creating a conspicuous
  // human-shaped outline around moving paintings. Local flame spill provides the light instead.
  ctx.restore();
 }
 // Hands: the same painted mittens, raised and closed around the flame while shielding.
 function drawHands(ctx,st){
  const b=heroBox(),hd=b.t?.hands;if(!hd||!ready('hero-hands'))return;
  const s=st.shield?1.12:1,lift=st.shield?-5:0,cx=b.x+(hd.x+hd.w/2)*b.k,cy=b.y+(hd.y+hd.h/2)*b.k+lift+(st.bob||0),w=hd.w*b.k*s,h=hd.h*b.k*s;
  ctx.save();ctx.drawImage(imgs['hero-hands'],cx-w/2,cy-h/2,w,h);
  if(st.light>0){ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(cx,cy-h*.3,1,cx,cy-h*.3,w*.6);g.addColorStop(0,'rgba(255,180,110,'+(.35*st.light)+')');g.addColorStop(1,'rgba(255,160,90,0)');ctx.fillStyle=g;ctx.fillRect(cx-w,cy-h,w*2,h*2)}
  ctx.restore();
 }
 // ---------- flame spirit ----------
 function drawFlame(ctx,st,at){
  const a=at||flameAnchor(),health=Math.max(0,st.flame),y0=a.y+(st.bob||0);
  if(health<=0){
   // A thin wisp of smoke and nothing else: flame=0 never emits light.
   if(st.smoke>0){ctx.save();ctx.strokeStyle='rgba(190,198,214,'+(.5*st.smoke)+')';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(a.x,y0);for(let i=1;i<8;i++)ctx.lineTo(a.x+Math.sin(st.t*2+i)*4*i*.4,y0-i*7);ctx.stroke();ctx.restore()}
   return;
  }
  const e=st.expression||'calm',exposure=st.exposure??1,light=Math.min(1,health/100)*(st.hope?1.2:1)*exposure,sprite=ready('flame-'+e)?imgs['flame-'+e]:imgs.flame;
  const size=(16+32*Math.pow(health/100,.7))*(st.scale||1),lean=st.reduced?0:Math.max(-1,Math.min(1,(st.wind||0)*(st.shield?.15:.9)))*.32;
  const tremble=st.reduced?0:(e==='afraid'?Math.sin(st.t*31)*1.2:e==='suffocating'?Math.sin(st.t*9)*.8:0);
  const breathe=st.reduced?1:1+Math.sin(st.t*(e==='comfort'?2.2:4.2))*.035;
  // Halo first (additive) so the flame lights the air around it.
  ctx.save();ctx.globalCompositeOperation='lighter';
  const halo=ctx.createRadialGradient(a.x,y0-size*.45,1,a.x,y0-size*.45,size*2.2+health*.7);
  halo.addColorStop(0,'rgba(255,214,140,'+(.5*light)+')');halo.addColorStop(.4,'rgba(255,170,90,'+(.16*light)+')');halo.addColorStop(1,'rgba(255,150,80,0)');
  ctx.fillStyle=halo;ctx.fillRect(a.x-220,y0-240,440,440);ctx.restore();
  // The art-bible flame spirit; posture carries the feeling (lean, shrink, tremble, glow).
  if(sprite&&sprite.complete&&sprite.naturalWidth>0){
   const w=size*1.15*breathe,h=size*1.25*(e==='afraid'?.9:1)*breathe;
   ctx.save();ctx.translate(a.x+tremble,y0);ctx.rotate(lean+(st.lookAt?.08:0));
   ctx.globalAlpha=(e==='suffocating'?.72:1)*Math.min(1,.72+.28*exposure);
    ctx.drawImage(sprite,-w/2,-h*.92,w,h);ctx.restore();
  }else{
   const g=ctx.createRadialGradient(a.x,y0-size*.5,1,a.x,y0-size*.5,size*.6);g.addColorStop(0,'#fff3c4');g.addColorStop(1,'rgba(245,140,70,0)');ctx.fillStyle=g;ctx.fillRect(a.x-size,y0-size*1.4,size*2,size*1.6);
  }
  if(st.hope&&!st.reduced){for(let i=0;i<9;i++){const ang=i*.7+st.t*1.2,r=size*.9+i*1.6;ctx.fillStyle='rgba(255,236,186,.7)';ctx.fillRect(a.x+Math.cos(ang)*r,y0-size*.5+Math.sin(ang)*r,2,2)}}
 }
 // Darkness closes in as the flame weakens; the window and lamps stay readable on top.
 function vignette(ctx,light,center){
  const W=view.W,r0=50+light*150,g=ctx.createRadialGradient(center.x,center.y,r0*.25,center.x,center.y,r0+230);
  g.addColorStop(0,'rgba(4,7,18,0)');g.addColorStop(.45,'rgba(4,7,18,'+(.12+(1-light)*.28)+')');g.addColorStop(1,'rgba(4,7,18,'+(.42+(1-light)*.4)+')');
  ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
 }
 function windowGlow(ctx,cam,level){
  const w=toScreen(3,cam,WINDOW.x,WINDOW.y);if(level<=0)return w;
  ctx.save();ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(w.x,w.y,2,w.x,w.y,22+level*90);g.addColorStop(0,'rgba(255,226,160,'+(.55*Math.min(1,level))+')');g.addColorStop(1,'rgba(255,180,100,0)');
  ctx.fillStyle=g;ctx.fillRect(w.x-200,w.y-200,400,400);ctx.restore();
  return w;
 }
 function beam(ctx,from,to,strength){
  ctx.save();ctx.globalCompositeOperation='lighter';
  const g=ctx.createLinearGradient(from.x,from.y,to.x,to.y);g.addColorStop(0,'rgba(255,226,170,'+(.4*strength)+')');g.addColorStop(1,'rgba(255,200,140,'+(.12*strength)+')');
  ctx.strokeStyle=g;ctx.lineWidth=2+strength*6;ctx.lineCap='round';
  ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.quadraticCurveTo((from.x+to.x)/2,Math.min(from.y,to.y)-40,to.x,to.y);ctx.stroke();ctx.restore();
 }
 function memoryMote(ctx,m,t,reduced){
  const x=m.u*view.W,y=m.y,p=reduced?1:1+Math.sin(t*5)*.16;
  ctx.save();ctx.translate(x,y);ctx.scale(p,p);ctx.globalCompositeOperation='lighter';
  const g=ctx.createRadialGradient(0,0,1,0,0,30);g.addColorStop(0,'rgba(255,236,186,.95)');g.addColorStop(1,'rgba(255,190,110,0)');ctx.fillStyle=g;ctx.fillRect(-32,-32,64,64);ctx.restore();
  const remaining=Math.max(0,Math.min(1,(m.expiresAt-t)/8));
  ctx.save();ctx.strokeStyle='rgba(255,221,159,.9)';ctx.lineWidth=2.5;ctx.shadowColor='rgba(255,185,96,.75)';ctx.shadowBlur=6;ctx.beginPath();ctx.arc(x,y,22,-Math.PI/2,-Math.PI/2+Math.PI*2*remaining);ctx.stroke();ctx.restore();
  if(ready('flame')){ctx.save();ctx.globalAlpha=.85;ctx.drawImage(imgs.flame,x-11,y-14,22,24);ctx.restore()}
 }
 // A collected memory flies into the flame as a small spark.
 const fx={mem:-1,from:null,t0:0};
 function memoryFlight(ctx,s,t){
  if(fx.mem<0)fx.mem=s.memories;
  if(s.mote)fx.from={x:s.mote.u*view.W,y:s.mote.y};
  if(s.memories>fx.mem&&fx.from){fx.mem=s.memories;fx.t0=t;fx.start=fx.from}
  const q=(t-fx.t0)/.9;if(!fx.start||q<0||q>1)return;
  const a=flameAnchor(),x=fx.start.x+(a.x-fx.start.x)*q,y=fx.start.y+(a.y-fx.start.y)*q-Math.sin(q*Math.PI)*50;
  ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(x,y,1,x,y,18);g.addColorStop(0,'rgba(255,240,200,'+(1-q*.5)+')');g.addColorStop(1,'rgba(255,190,110,0)');ctx.fillStyle=g;ctx.fillRect(x-20,y-20,40,40);ctx.restore();
 }
 function hud(ctx,s){
  const u=Math.min(1,view.W/300),panelW=166*u,panelH=58*u,x0=8*u,y0=10*u;
  const meter=(label,value,y,color)=>{ctx.save();ctx.shadowColor='rgba(0,0,0,.9)';ctx.shadowBlur=5*u;ctx.fillStyle='#f2f4f7';ctx.font='bold '+(11*u)+'px system-ui,sans-serif';ctx.textAlign='left';ctx.fillText(label,16*u,y*u);ctx.restore();ctx.fillStyle='rgba(7,13,25,.62)';ctx.beginPath();ctx.roundRect(46*u,(y-8)*u,118*u,8*u,4*u);ctx.fill();ctx.fillStyle=color;ctx.beginPath();ctx.roundRect(46*u,(y-8)*u,118*u*Math.max(0,Math.min(100,value))/100,8*u,4*u);ctx.fill()};
  meter('灯り',s.flame,24,'#ffb15b');meter('息',s.oxygen,42,s.oxygen<28?'#e98a8a':'#a4cee2');
  for(let i=0;i<3;i++){const x=(24+i*16)*u,y=58*u;ctx.strokeStyle='#eacb91';ctx.lineWidth=1.5*u;ctx.beginPath();ctx.arc(x,y,5*u,0,6.283);ctx.stroke();if(i<s.memories){ctx.fillStyle='#ffd98d';ctx.beginPath();ctx.arc(x,y,3.2*u,0,6.283);ctx.fill()}}
 }
 function caption(ctx,text,sub,warn){
  const W=view.W,u=Math.min(1,W/300);ctx.save();ctx.textAlign='center';
  ctx.font='600 '+(11*u)+'px system-ui,sans-serif';ctx.fillStyle='#e6eaf0';ctx.shadowColor='#03060c';ctx.shadowBlur=9*u;
  if(sub)ctx.fillText(sub,W/2,H-82);ctx.restore();
 }
 function chapterVeil(ctx,q,reduced){
  if(q<=0||q>=1)return;const W=view.W,peak=1-Math.abs(q*2-1),dir=q<.5?q*2:(1-q)*2;
  ctx.save();const g=ctx.createLinearGradient(0,0,W,0);g.addColorStop(0,'rgba(8,15,31,'+(.18+.76*peak)+')');g.addColorStop(.48,'rgba(157,177,207,'+(.1+.78*peak)+')');g.addColorStop(1,'rgba(7,12,26,'+(.22+.74*peak)+')');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  if(!reduced){ctx.strokeStyle='rgba(226,235,247,'+(.12+.34*peak)+')';ctx.lineWidth=1.2;ctx.lineCap='round';for(let i=0;i<18;i++){const y=(i*31+(q*190))%(H+30)-15,x=((i*79+q*W*2.2)%(W+120))-60;ctx.beginPath();ctx.moveTo(x-45*dir,y+8);ctx.lineTo(x+58*dir,y-5);ctx.stroke()}}
  ctx.restore();
 }
 // ---------- one gameplay frame ----------
 function frame(ctx,s,t,o){
  begin(ctx);
  const W=view.W,ci=s.chapter,since=t-(s.sceneChangedAt??-999);
  const chapterStart=[0,20,45,70][ci],chapterEnd=[20,45,70,s.journey||90][ci],p=Math.max(0,Math.min(1,(t-chapterStart)/(chapterEnd-chapterStart)));
  const reduced=o.reduced,wind=s.wind??.2;
  const cam={p,sway:reduced?0:Math.sin(t*.35)*.6+Math.min(1,wind)*.5};
  const light=Math.max(0,Math.min(1,s.flame/100))*(s.rescue||s.reply>0?1.15:1);
  // Chapter 4's window is dim through the night and answers in the finale; other lamps stay lit.
  const reply=s.reply>0?s.reply*(s.replyLevel==='bright'?1:.6):s.rescue?.6:0;
  const lightAlpha=ci===3?.25+.75*reply:1;
  const changing=since>=0&&since<2.1&&s.previousChapter!==ci,q=changing?since/2.1:1,m0=Math.max(0,Math.min(1,(q-.44)/.12)),mix=m0*m0*(3-2*m0);
  ctx.canvas.dataset.transition=changing?'blizzard':'';
  if(changing){if(!drawPlate(ctx,s.previousChapter,{...cam,p:1},1-mix,1,['sky','far','mid']))fallbackSky(ctx,s.previousChapter);drawPlate(ctx,ci,{...cam,p:0},mix,lightAlpha,['sky','far','mid'])}
  else if(!drawPlate(ctx,ci,cam,1,lightAlpha,['sky','far','mid']))fallbackSky(ctx,ci);
  snow(ctx,t,wind,reduced,s.event?.kind==='eddy'&&t>=s.event.at?Math.sin(t*3):1,'back');
  if(ci===3)dawnGrade(ctx,Math.max(0,(t-70)/20)*.6);
  const a=flameAnchor();
  const bob=drawTraveller(ctx,{...s,t,ci,reduced,light,walking:o.playing});
  vignette(ctx,light,{x:a.x,y:a.y});
  drawFirelight(ctx,{light,bob});
  if(ci===3){
   const w=windowGlow(ctx,cam,reply>0?reply:.08);
   if(s.rescue&&t-s.rescueAt<6)beam(ctx,w,a,Math.max(0,1-(t-s.rescueAt)/6));
   if(s.replyLevel==='bright')beam(ctx,w,a,.8);
  }
  if(s.event&&t>=s.event.at&&s.event.kind==='lantern'){const g=ctx.createRadialGradient(W*.15,250,4,W*.15,250,120);g.addColorStop(0,'rgba(255,214,150,.45)');g.addColorStop(1,'rgba(255,190,110,0)');ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=g;ctx.fillRect(0,120,W,260);ctx.restore()}
  const quiet=s.finalePhase==='silence'||s.finalePhase==='window-reply';
  const warn=(s.event&&t<s.event.at&&(s.event.kind==='gust'||s.event.kind==='eddy'))||s.finalePhase==='gust-warning'?1:0;
  drawFlame(ctx,{t,flame:s.flame,wind,shield:s.shield,reduced,expression:o.expression,hope:o.expression==='hope',bob,smoke:1,lookAt:ci===3&&quiet?1:0});
  // Hands over the flame while shielding, so the gesture visibly closes around it.
  if(s.shield&&!ready('hero-shield'))drawHands(ctx,{shield:true,light,bob});
  if(changing){drawPlate(ctx,s.previousChapter,{...cam,p:1},1-mix,0,['fore']);drawPlate(ctx,ci,{...cam,p:0},mix,0,['fore']);chapterVeil(ctx,q,reduced)}
  else drawPlate(ctx,ci,cam,1,0,['fore']);
  cinematicGrade(ctx,ci,light,t,reduced);
  const hasBreath=breath(ctx,{...s,t,ci,reduced,bob,wind});
  const hasEmbers=embers(ctx,{...s,t,reduced,bob,wind});
  snow(ctx,t,quiet?.02:wind,reduced,s.event?.kind==='eddy'&&t>=s.event.at?Math.sin(t*3):1,'front');
  windLines(ctx,t,quiet?0:wind,warn,reduced);
  const hasFrost=frost(ctx,{...s,ci});paperGrain(ctx,t,reduced);
  ctx.canvas.dataset.vfx=['grade','grain','snow-depth',hasBreath&&'breath',hasEmbers&&'embers',hasFrost&&'frost'].filter(Boolean).join(' ');
  if(s.mote)memoryMote(ctx,s.mote,t,reduced);
  memoryFlight(ctx,s,t);
  if(ci===1&&t<s.shelterUntil){ctx.fillStyle='rgba(255,222,165,.07)';ctx.fillRect(0,90,W,300);caption(ctx,'風をよけられる — 今のうちに息を戻す','',false)}
  else caption(ctx,o.caption,s.routeChoice==='pending'?'':'家まで '+root.KienaideCore.routeDistance(s,t)+'m',o.warn);
  hud(ctx,s);
  end(ctx);
 }
 // ---------- ending tableaus: light, figure, flame, place and colour temperature differ ----------
 function endingFrame(ctx,s,ending,te,o){
  begin(ctx);
  const W=view.W,reduced=o.reduced,ci=ending==='dawn'||ending==='survive'||ending==='wish'?3:s.chapter;
  const cam={p:ending==='dawn'?1:.8,sway:0};
  const k=Math.min(1,te/2.4),a=flameAnchor();
  const lightAlpha=ci===3?(ending==='dawn'?1:ending==='survive'?.5:.3):1;
  if(!drawPlate(ctx,ci,cam,1,lightAlpha,['sky','far','mid']))fallbackSky(ctx,ci);
  snow(ctx,te,ending==='blown'?.9:ending==='smother'?.15:.05,reduced,1,'back');
  const flame=ending==='dawn'?92:ending==='survive'?24+Math.sin(te*6)*4:ending==='smother'?Math.max(0,30*(1-te/1.6)):0;
  const endingExposure=ending==='dawn'?.34:1,flameAt=ending==='dawn'?{x:a.x+8,y:a.y+26}:a;
  // The responding window belongs behind the traveller. Painting this additive glow after her
  // washed out the face and made the ending feel like a generated bloom effect.
  let dawnWindow=null;
  if(ending==='dawn'){dawnGrade(ctx,.6+.4*k);dawnWindow=windowGlow(ctx,cam,.7+k*.5)}
  const bob=drawTraveller(ctx,{t:te,ci,pose:'end-'+ending,shield:false,wind:ending==='blown'?.9:.1,reduced,light:flame/100,walking:false});
  if(ending==='dawn'){beam(ctx,dawnWindow,flameAt,k);vignette(ctx,1,flameAt)}
  else if(ending==='survive'){dawnGrade(ctx,.45*k);windowGlow(ctx,cam,.25+.12*Math.sin(te*2));vignette(ctx,.45,a)}
  else if(ending==='wish'){windowGlow(ctx,cam,.25);vignette(ctx,.25,a)}
  else{
   // Loss: the world goes cold and dark, but the far lights and the way home remain.
   ctx.save();ctx.globalCompositeOperation='multiply';ctx.fillStyle=ending==='blown'?'rgb(120,140,190)':'rgb(150,140,170)';ctx.fillRect(0,0,W,H);ctx.restore();
   vignette(ctx,0,a);
   ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.7;const kk=CH[ci];if(ready(kk+'-lights')){const t=plateTransform(ci,cam.p,DEPTH.mid*cam.p);ctx.drawImage(imgs[kk+'-lights'],t.x,t.y,PW*t.z,PH*t.z)}ctx.restore();
  }
  drawFirelight(ctx,{light:flame/100*endingExposure,bob,at:flameAt});
  drawFlame(ctx,{t:te,flame,wind:ending==='blown'?.9:.05,shield:ending==='smother',reduced,expression:ending==='dawn'?'hope':ending==='survive'?'afraid':'calm',hope:ending==='dawn',exposure:endingExposure,scale:ending==='dawn'?.72:1,bob,smoke:ending==='blown'||ending==='smother'?Math.max(0,1-te/4):0,lookAt:ending==='dawn'?1:0},flameAt);
  if(ending==='smother'&&!ready('end-smother'))drawHands(ctx,{shield:true,light:flame/100,bob});
  if(ending==='wish'){
   // The three memories rise from the empty hands and become stars over the house.
   for(let i=0;i<3;i++){const q=Math.min(1,Math.max(0,(te-i*.45)/2.2)),x=a.x+(i-1)*48*q,y=a.y-q*(230+i*16);ctx.save();ctx.globalCompositeOperation='lighter';const g=ctx.createRadialGradient(x,y,1,x,y,20);g.addColorStop(0,'rgba(255,236,186,.95)');g.addColorStop(1,'rgba(255,190,110,0)');ctx.fillStyle=g;ctx.fillRect(x-22,y-22,44,44);ctx.restore()}
  }
  if(ending==='smother'&&te<2){ctx.save();ctx.globalCompositeOperation='lighter';for(let i=0;i<6;i++){const q=te/2,x=a.x+Math.sin(i*1.7)*16*q,y=a.y-q*40-i*4;ctx.fillStyle='rgba(255,170,100,'+(.7*(1-q))+')';ctx.fillRect(x,y,2,2)}ctx.restore()}
  drawPlate(ctx,ci,cam,1,0,['fore']);
  cinematicGrade(ctx,ci,flame/100,te,reduced);breath(ctx,{t:te,ci,oxygen:s.oxygen,wind:ending==='blown'?.9:.05,reduced,bob});embers(ctx,{t:te,flame,wind:ending==='blown'?.9:.05,reduced,bob});
  snow(ctx,te,ending==='blown'?.9:ending==='smother'?.15:.05,reduced,1,'front');
  if(ending==='blown')windLines(ctx,te,.9,0,reduced);
  frost(ctx,{ci,oxygen:s.oxygen,flame});paperGrain(ctx,te,reduced);ctx.canvas.dataset.vfx='grade grain snow-depth ending';
  end(ctx);
 }
 // ---------- prologue「最後の灯り」 ----------
 const INTRO_LENGTH=19;
 function introFrame(ctx,t,o){
  begin(ctx);
  const W=view.W,reduced=o.reduced,ease=x=>x<0?0:x>1?1:x*x*(3-2*x);
  if(t<11){
   // Inside the last warm room, the ember leaves the hearth and chooses the traveller.
   const cam={p:.2,sway:0},lamp=drawIntroRoom(ctx,t,reduced)||toScreen(0,cam,LAMP.x,LAMP.y);
   if(!ready('intro-room')&&!drawPlate(ctx,0,cam,1,1,['sky','far','mid','fore']))fallbackSky(ctx,0);
   vignette(ctx,.45-.2*ease(t/5),lamp);
   const heroIn=ease((t-7.6)/1.2);
   if(heroIn>0){ctx.save();ctx.globalAlpha=heroIn;const hb=drawTraveller(ctx,{t,ci:0,shield:false,wind:.1,reduced,walking:false});if(t>9.6)drawFirelight(ctx,{light:.32,bob:hb});ctx.restore()}
   const a=flameAnchor();
   if(t>=3.2&&t<8)drawFlame(ctx,{t,flame:Math.min(32,(t-3.2)*16),wind:.05,reduced,expression:t<5.5?'afraid':'calm',scale:.7},lamp);
   if(t>=8){const q=ease((t-8)/1.6),x=lamp.x+(a.x-lamp.x)*q,y=lamp.y+(a.y-lamp.y)*q-Math.sin(q*Math.PI)*70;drawFlame(ctx,{t,flame:32,wind:.1,reduced,expression:'calm',scale:.7+.3*q},{x,y})}
   cinematicGrade(ctx,0,.32,t,reduced);paperGrain(ctx,t,reduced);ctx.canvas.dataset.vfx='grade grain intro';
   ctx.fillStyle='rgba(4,7,15,'+(t<1.5?(1.5-t)/1.5*.85:0)+')';ctx.fillRect(0,0,W,H);
  }else{
   // The distant window, a figure in it for a heartbeat, then the road home and the title.
   const q=reduced?1:ease((t-11)/3),ci=t<16?3:0,cam={p:t<16?.3+q*.3:ease((t-16)/3)*.3,sway:0};
   drawPlate(ctx,ci,cam,1,ci===3?.45:1,['sky','far','mid']);
   snow(ctx,t,.25,reduced,1,'back');
   if(ci===3){const w=windowGlow(ctx,cam,.35);if(t>12.4&&t<13.3){ctx.fillStyle='rgba(28,24,40,.8)';ctx.beginPath();ctx.ellipse(w.x+2*w.z,w.y,6*w.z,13*w.z,0,0,6.283);ctx.fill()}}
   const nod=t>14.6&&t<15.6&&!reduced?Math.sin((t-14.6)*Math.PI*2)*3:0;
   const bob=drawTraveller(ctx,{t,ci,shield:false,wind:.2,reduced,walking:t>=16});
   vignette(ctx,.55,flameAnchor());drawFirelight(ctx,{light:.34,bob});
   drawFlame(ctx,{t,flame:34,wind:.15,reduced,expression:'calm',hope:t>14.6&&t<16,bob:bob+nod,lookAt:t<16?1:0});
   drawPlate(ctx,ci,cam,1,0,['fore']);
   cinematicGrade(ctx,ci,.34,t,reduced);breath(ctx,{t,ci,oxygen:80,wind:.15,reduced,bob});embers(ctx,{t,flame:34,wind:.15,reduced,bob});snow(ctx,t,.25,reduced,1,'front');paperGrain(ctx,t,reduced);ctx.canvas.dataset.vfx='grade grain snow-depth breath intro';
   if(t<11.8){ctx.fillStyle='rgba(4,7,15,'+(1-(t-11)/.8)+')';ctx.fillRect(0,0,W,H)}
  }
  const line=[...INTRO].reverse().find(l=>t>=l.at);
  if(line){const age=t-line.at,alpha=Math.min(1,age/.6);ctx.save();ctx.globalAlpha=alpha;ctx.textAlign='center';ctx.shadowColor='#000';ctx.shadowBlur=10;
   if(line.at===16.5){ctx.font='bold 38px system-ui,sans-serif';ctx.fillStyle='#ffe3a8';ctx.fillText(line.text,W/2,130)}
   else{ctx.font='600 15px system-ui,sans-serif';ctx.fillStyle='#fff2d8';line.rows.forEach((row,i)=>ctx.fillText(row,W/2,64+i*24))}ctx.restore()}
  end(ctx);
 }
 return {view,sample,perf,resize,toWorld,toCss,frame,endingFrame,introFrame,INTRO,INTRO_LENGTH,flameAnchor,ready,loaded,imgs,failed:()=>failed,names,manifest:()=>manifest};
}
root.KienaideView={create,INTRO};
})(typeof window!=='undefined'?window:globalThis);
