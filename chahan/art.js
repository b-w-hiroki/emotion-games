import { dishAppearance } from '../assets/chahan-core.js';

const W = 780, H = 900;
const backgrounds = new Map();
const paintedScenes = ['street', 'train', 'sky'].map(name => {
  const image = new Image();
  image.src = new URL(`./art/${name}.webp`, import.meta.url).href;
  return image;
});
const paintedWok = new Image();
paintedWok.src = new URL('./art/wok-v2.webp', import.meta.url).href;
const paintedRice = new Image();
paintedRice.src = new URL('./art/rice-v2.webp', import.meta.url).href;
const paintedRiceEgg = new Image();
paintedRiceEgg.src = new URL('./art/rice-egg-v1.webp', import.meta.url).href;
const paintedFlight = new Image();
paintedFlight.src = new URL('./art/flight-v3.webp', import.meta.url).href;
const paintedFlightEgg = new Image();
paintedFlightEgg.src = new URL('./art/flight-egg-v1.webp', import.meta.url).href;
const riceFinishes = new WeakMap();
function finishedRice(image, finish) {
  if (!image.complete || !image.naturalWidth) return image;
  let variants = riceFinishes.get(image);
  if (!variants) { variants = {}; riceFinishes.set(image, variants); }
  if (variants[finish]) return variants[finish];
  const canvas = document.createElement('canvas');
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(image, 0, 0);
  const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = pixels.data;
  for (let i = 0; i < data.length; i += 4) {
    if (!data[i + 3]) continue;
    if (finish === 'raw') {
      data[i] += (255 - data[i]) * .28;
      data[i + 1] += (245 - data[i + 1]) * .47;
      data[i + 2] += (222 - data[i + 2]) * .44;
    } else {
      data[i] = data[i] * .69 + 28;
      data[i + 1] = data[i + 1] * .56 + 20;
      data[i + 2] = data[i + 2] * .48 + 16;
    }
  }
  ctx.putImageData(pixels, 0, 0);
  variants[finish] = canvas;
  return canvas;
}
function drawCookingRice(ctx, image, args, cook) {
  ctx.drawImage(image, ...args);
  const raw = Math.max(0, Math.min(1, (.68 - cook) / .68));
  const burnt = Math.max(0, Math.min(1, (cook - 1.05) / .3));
  if (raw || burnt) {
    ctx.save(); ctx.globalAlpha *= raw || burnt;
    ctx.drawImage(finishedRice(image, raw ? 'raw' : 'burnt'), ...args);
    ctx.restore();
  }
}
const rgba = (hex, alpha) => { const n = parseInt(hex.slice(1), 16); return `rgba(${n >> 16 & 255},${n >> 8 & 255},${n & 255},${alpha})`; };
function ellipse(ctx, x, y, rx, ry, color, rotation = 0) { ctx.fillStyle = color; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, rotation, 0, Math.PI * 2); ctx.fill(); }
function line(ctx, points, color, width = 2) { ctx.strokeStyle = color; ctx.lineWidth = width; ctx.beginPath(); ctx.moveTo(...points[0]); for (const point of points.slice(1)) ctx.lineTo(...point); ctx.stroke(); }
function glow(ctx, x, y, radius, color) { const g = ctx.createRadialGradient(x, y, 0, x, y, radius); g.addColorStop(0, rgba(color, .55)); g.addColorStop(1, rgba(color, 0)); ellipse(ctx, x, y, radius, radius, g); }
function grain(ctx, tint, count = 80) { for (let i = 0; i < count; i++) { const x = (i * 127.7 + 13) % W, y = (i * 211.3 + 17) % H; ellipse(ctx, x, y, i % 4 ? 1 : 2, 1, rgba(tint, .055)); } }
function lantern(ctx, x, y, scale = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  glow(ctx, 0, 20, 100, '#ffb46d');
  line(ctx, [[0,-100],[0,-35]], '#51382e', 5);
  const g = ctx.createLinearGradient(-34,0,34,0); g.addColorStop(0,'#842f30');g.addColorStop(.5,'#f5a058');g.addColorStop(1,'#8f302d');
  ellipse(ctx, 0, 4, 38, 52, g); line(ctx,[[-36,0],[36,0]],'#8e3c34',3); line(ctx,[[-30,-25],[30,-25]],'#8e3c34',3);line(ctx,[[-30,32],[30,32]],'#8e3c34',3);
  ellipse(ctx,0,-48,28,7,'#382a28');ellipse(ctx,0,56,28,7,'#382a28');line(ctx,[[0,56],[0,80]],'#dc9855',3);
  ctx.restore();
}
function street(ctx) {
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#1a2032');g.addColorStop(.55,'#5e302c');g.addColorStop(1,'#211a1b');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  glow(ctx,575,172,330,'#d88449');
  for(let i=0;i<8;i++){const x=i*123-34,h=235+(i%4)*55;ctx.fillStyle=i%2?'#382d32':'#2d2930';ctx.fillRect(x,150,W/6,h);ctx.fillStyle='#d08a54';for(let j=0;j<3;j++)ctx.fillRect(x+22+j*27,190+(i%4)*21,12,17);}
  ctx.fillStyle='#3e2524';ctx.beginPath();ctx.moveTo(0,262);ctx.lineTo(390,220);ctx.lineTo(W,268);ctx.lineTo(W,316);ctx.lineTo(0,316);ctx.fill();
  ctx.fillStyle='#b55f3f';ctx.beginPath();ctx.moveTo(0,245);ctx.lineTo(390,205);ctx.lineTo(W,246);ctx.lineTo(W,275);ctx.lineTo(390,235);ctx.lineTo(0,280);ctx.fill();
  for(let i=0;i<11;i++){ctx.fillStyle=i%2?'#c87a4e':'#a74e39';ctx.fillRect(i*76,272,76,43);}
  lantern(ctx,132,180,.82);lantern(ctx,654,194,.94);
  ctx.fillStyle='#8c3d30';ctx.fillRect(537,293,112,165);ctx.strokeStyle='#db9a57';ctx.lineWidth=7;ctx.strokeRect(537,293,112,165);ctx.fillStyle='#f9d89b';ctx.font='bold 80px serif';ctx.textAlign='center';ctx.fillText('炒',593,402);
  grain(ctx,'#f4c88e');
}
function train(ctx) {
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#153f49');g.addColorStop(.52,'#215861');g.addColorStop(1,'#152129');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.fillStyle='#102b35';ctx.fillRect(0,119,W,440);ctx.fillStyle='#6d9d9a';ctx.fillRect(0,122,W,15);ctx.fillRect(0,545,W,18);
  for(let i=0;i<3;i++){const x=45+i*263;const wg=ctx.createLinearGradient(x,0,x+225,0);wg.addColorStop(0,'#1b5969');wg.addColorStop(.55,'#479eaa');wg.addColorStop(1,'#173f53');ctx.fillStyle=wg;ctx.fillRect(x,165,216,303);ctx.fillStyle='#d8e9d7';for(let j=0;j<8;j++){const yy=211+j*27;ctx.fillRect(x+(j*77+i*22)%200,yy,48,5);}ctx.strokeStyle='#9bc2b8';ctx.lineWidth=12;ctx.strokeRect(x,165,216,303);}
  ctx.fillStyle='#7daaa4';ctx.fillRect(0,82,W,24);for(let i=0;i<5;i++){const x=70+i*154;line(ctx,[[x,105],[x,172]],'#a7c5b6',6);ctx.strokeStyle='#d5dcc8';ctx.lineWidth=9;ctx.beginPath();ctx.ellipse(x,192,31,38,0,0,7);ctx.stroke();}
  glow(ctx,395,520,270,'#7bd0bd');ctx.fillStyle='#1b343a';ctx.fillRect(0,563,W,H-563);grain(ctx,'#ccf6e7');
}
function sky(ctx) {
  const g=ctx.createLinearGradient(0,0,0,H);g.addColorStop(0,'#242752');g.addColorStop(.52,'#665879');g.addColorStop(1,'#30293d');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  glow(ctx,625,185,310,'#e2a9a5');ellipse(ctx,618,148,67,67,'#f4dbc7');
  for(let i=0;i<39;i++){const x=(i*139.7+44)%W,y=(i*67.8+21)%510;ellipse(ctx,x,y,i%4?2:3,i%4?2:3,rgba('#f9e4d2',.25+(i%4)*.14));}
  for(let i=0;i<7;i++){const x=i*147-80,y=285+(i%3)*95;ellipse(ctx,x,y,115,30,'#a9a3ba');ellipse(ctx,x+62,y+8,124,27,'#b9b4c8');ellipse(ctx,x-39,y-8,61,26,'#d1bfd1');}
  ctx.fillStyle='#4c4056';ctx.beginPath();ctx.moveTo(0,515);ctx.bezierCurveTo(205,470,488,530,W,485);ctx.lineTo(W,640);ctx.lineTo(0,640);ctx.fill();
  glow(ctx,350,530,320,'#ef9d86');ctx.fillStyle='#282338';ctx.fillRect(0,622,W,H-622);grain(ctx,'#edd5ec');
}
function background(stage) {
  if (backgrounds.has(stage)) return backgrounds.get(stage);
  const canvas=document.createElement('canvas');canvas.width=W;canvas.height=H;const ctx=canvas.getContext('2d');
  [street,train,sky][stage](ctx);backgrounds.set(stage,canvas);return canvas;
}
function burner(ctx, heat) {
  glow(ctx,390,705,250*heat+60,'#f98445');
  ellipse(ctx,390,752,265,38,rgba('#0c1013',.48));ellipse(ctx,390,729,224,24,'#5c5147');ellipse(ctx,390,722,193,15,'#202729');
  if (heat > .05) {
    ctx.save();ctx.globalAlpha=.65;ctx.filter='blur(7px)';
    ellipse(ctx,390,708,207*heat,22*heat,rgba('#e77037',.6));
    ellipse(ctx,390,709,173*heat,12*heat,rgba('#ffce83',.65));
    ctx.restore();
  }
}
function steam(ctx, t, heat, reduced) {
  ctx.save();ctx.globalAlpha=.1+heat*.14;ctx.strokeStyle='#fff5dd';ctx.lineWidth=9;ctx.lineCap='round';
  for(let i=0;i<5;i++){const x=235+i*81,shift=reduced?0:Math.sin(t*1.5+i)*13;ctx.beginPath();ctx.moveTo(x,405);ctx.bezierCurveTo(x-28+shift,352,x+25+shift,298,x+shift,240);ctx.stroke();}
  ctx.restore();
}
function atmosphere(ctx, game, reduced) {
  const pulse=reduced?1:.88+Math.sin(game.time*3.1)*.12;
  ctx.save();ctx.globalAlpha=.13*pulse;ctx.globalCompositeOperation='screen';
  if(game.stage===0){glow(ctx,135,185,150,'#ff9b4a');glow(ctx,654,200,170,'#ffae62');}
  else if(game.stage===1){glow(ctx,510,365,250,'#8bd9d2');glow(ctx,210,160,125,'#ffe6ac');}
  else{glow(ctx,615,160,230,'#ffc7a6');glow(ctx,320,380,210,'#d3b4ed');}
  const drift=reduced?0:game.time;
  ctx.globalAlpha=.3;
  for(let i=0;i<9;i++){
    if(game.stage===0){
      const x=75+(i*137)%640,y=260+(i*91)%230+(reduced?0:Math.sin(drift*1.5+i)*10);
      ellipse(ctx,x,y,2+i%2,2,rgba('#ffc479',.32+i%3*.11));
    }else if(game.stage===1){
      const x=330+((i*83+drift*62)%380),y=182+i*27;
      line(ctx,[[x-28,y],[x+18,y-2]],rgba('#d1ffec',.16),2);
    }else{
      const x=80+(i*103)%640,y=135+(i*73)%290-(reduced?0:Math.sin(drift*.7+i)*7);
      ellipse(ctx,x,y,2+i%3,2,rgba('#fff0dd',.32));
    }
  }
  ctx.restore();
}
function worktop(ctx) {
  const wood=ctx.createLinearGradient(0,710,0,900);
  wood.addColorStop(0,'#422c25');wood.addColorStop(.2,'#2e201e');wood.addColorStop(1,'#171315');
  ctx.fillStyle=wood;ctx.beginPath();ctx.moveTo(0,742);ctx.quadraticCurveTo(390,713,780,742);ctx.lineTo(780,900);ctx.lineTo(0,900);ctx.fill();
  line(ctx,[[0,742],[190,726],[390,720],[590,726],[780,742]],rgba('#e4a66f',.3),5);
  for(let i=0;i<9;i++)line(ctx,[[0,760+i*18],[780,774+i*17]],rgba('#a76a48',.045+i%3*.012),2);
  ellipse(ctx,390,771,280,28,rgba('#070b0e',.38));
  for(let i=0;i<13;i++){
    const x=70+(i*127)%650,y=778+(i*47)%106;
    ellipse(ctx,x,y,4+i%3,2,i%5===0?rgba('#9cbb69',.45):rgba('#f1ca83',.5),i*.31);
  }
}
function frontSteam(ctx, game, reduced) {
  if(game.heat<.08)return;
  ctx.save();ctx.globalAlpha=.05+game.heat*.09;ctx.strokeStyle='#fff5df';ctx.lineWidth=7;ctx.lineCap='round';
  for(let i=0;i<4;i++){
    const x=225+i*105,drift=reduced?0:Math.sin(game.time*1.3+i*2)*14;
    ctx.beginPath();ctx.moveTo(x,548);ctx.bezierCurveTo(x-28+drift,506,x+26+drift,460,x+drift,416);ctx.stroke();
  }
  ctx.restore();
}
function fillingPiece(ctx,x,y,kind,i,scale=1,cook=0){
  if(kind==='pork'){
    ctx.save();ctx.translate(x,y);ctx.rotate(i*.53);ctx.fillStyle=cook>1.05?'#4f2924':cook>.48?'#8b4126':'#b8664d';ctx.fillRect(-8*scale,-5*scale,16*scale,10*scale);ctx.fillStyle=cook>1.05?'#8a5638':cook>.48?'#efa55e':'#e8a087';ctx.fillRect(-6*scale,-4*scale,12*scale,3*scale);ctx.restore();
  }else if(kind==='shrimp'){
    ctx.save();ctx.translate(x,y);ctx.rotate(i*.41);ctx.fillStyle=cook>.72?'#b05737':cook>.23?'#ff9b74':'#d8aaa0';ctx.beginPath();ctx.ellipse(0,0,10*scale,6*scale,-.3,0,Math.PI*2);ctx.fill();ctx.strokeStyle='#fff1d8';ctx.lineWidth=2*scale;ctx.beginPath();ctx.arc(1*scale,-1*scale,6*scale,.2,2.4);ctx.stroke();ctx.restore();
  }else{
    ctx.save();ctx.strokeStyle=cook>.52?'#846d41':i%3===0?'#c7df7c':'#5d9c4d';ctx.lineWidth=3*scale;ctx.beginPath();ctx.ellipse(x,y,6*scale,3*scale,i*.4,0,Math.PI*2);ctx.stroke();ctx.restore();
  }
}
function wok(ctx, game, reduced) {
  const t=game.time,age=t-game.lastToss;
  const arc=reduced||age<0||age>.72?0:Math.sin(Math.PI*age/.72);
  const hasRice=game.ingredients.rice;
  const fly=!hasRice||game.tossOutcome==='weak'?0:arc*Math.min(1.35,game.lastLift);
  const escaping=game.tossOutcome==='spilled'&&age>=0&&age<.9&&!reduced;
  const escapeSide=Math.sign(game.lastLean)||1;
  const push=game.panPush||0;
  ctx.save();ctx.translate(310,548-push*54+fly*44);ctx.scale(1-push*.09+fly*.09,1-push*.06+fly*.05);ctx.rotate(-push*.08+fly*.18);
  const hasPaintedWok = paintedWok.complete && paintedWok.naturalWidth;
  if (!hasPaintedWok) ellipse(ctx,0,145,295,82,'#0c1218');
  if (hasPaintedWok) ctx.drawImage(paintedWok,-310,-268,780,520);
  else {
  const shell=ctx.createLinearGradient(0,-48,0,158);shell.addColorStop(0,'#9da5a2');shell.addColorStop(.22,'#506773');shell.addColorStop(.72,'#1b3039');shell.addColorStop(1,'#0a151d');ellipse(ctx,0,45,290,118,shell);
  const inner=ctx.createRadialGradient(-100,-40,20,0,40,300);inner.addColorStop(0,'#536774');inner.addColorStop(.46,'#263842');inner.addColorStop(1,'#0a1820');ellipse(ctx,0,22,258,87,inner);
  }
  const amount=Math.sqrt(game.rice);
  const mixed=Math.max(0,Math.min(1,game.mix));
  const hasEggRice=game.ingredients.egg&&paintedRiceEgg.complete&&paintedRiceEgg.naturalWidth;
  const hasColoredRice=game.ingredients.veg&&paintedRice.complete&&paintedRice.naturalWidth;
  const hasFlight=hasRice&&(game.ingredients.egg?paintedFlightEgg.complete&&paintedFlightEgg.naturalWidth:paintedFlight.complete&&paintedFlight.naturalWidth);
  const flyingPortion=hasFlight?Math.min(1,fly*1.55):0;
  if (game.ingredients.egg && !hasRice) {
    const cooked=Math.max(0,Math.min(1,game.eggCook)),raw=Math.max(0,1-cooked/.28),burnt=Math.max(0,Math.min(1,(cooked-.72)/.35));
    if(cooked<.28){
      const egg=ctx.createRadialGradient(-48,3,4,0,27,170);egg.addColorStop(0,'#fff8c9');egg.addColorStop(.65,'#efb644');egg.addColorStop(1,'#a9612f');
      ellipse(ctx,-25,24,117,38,egg,-.07);
      ctx.save();ctx.globalAlpha=raw*.82;ellipse(ctx,-20,19,33,17,'#f5ab31',-.1);ellipse(ctx,-28,13,12,5,'#fff8c5',-.1);ctx.restore();
    } else {
      ellipse(ctx,-25,29,105,30,rgba('#c68533',.5+burnt*.2));
      for(let i=0;i<24;i++){
      const x=-114+(i*71)%220,y=3+(i*37)%49,rotation=i*.67,rx=17+i%4*4;
      ellipse(ctx,x,y+3,rx+2,7,rgba('#61351e',.4+burnt*.25),rotation);
      ellipse(ctx,x,y,rx,8+i%3,burnt>.4&&i%4===0?'#9a5b32':i%3?'#f5c669':'#ffe7a3',rotation);
      ellipse(ctx,x-3,y-3,rx*.45,2,rgba('#fff6cf',.55-burnt*.25),rotation);
      }
    }
    if(burnt>0)for(let i=0;i<20;i++){const x=-111+(i*43)%206,y=9+(i*17)%34;ellipse(ctx,x,y,4+i%3,2,rgba('#6a3827',burnt*.65),i*.37);}
  }
  if (!hasRice && game.ingredients.veg) for(let i=0;i<28;i++) {
    const x=-125+(i*47)%255,y=10+(i*29)%46;
    fillingPiece(ctx,x,y,game.filling,i,.9,game.fillingCook);
  }
  if(hasRice){ctx.save();}
  if (hasRice && (hasEggRice || hasColoredRice)) {
    // The rice on the pan floor is the same rice shown in the airborne layer.
    // Clear the pan as it rises, then restore the mound as it lands.
    ctx.save();ctx.globalAlpha*=1-flyingPortion;
    ellipse(ctx,0,36,178*amount,42*amount,rgba('#1b100d',.35));
    ctx.save();
    ctx.translate(escaping?escapeSide*fly*28:0,hasFlight?0:-fly*155);
    ctx.rotate(-game.lastLean*fly*.14);
    const baseScale=hasFlight?1-fly*.22:1;
    const riceArgs=[-198*amount*baseScale,-46*amount*baseScale,396*amount*baseScale,132*amount*baseScale];
    if(hasEggRice)drawCookingRice(ctx,paintedRiceEgg,riceArgs,game.cook);
    if(hasColoredRice){ctx.save();ctx.globalAlpha*=hasEggRice?mixed:1;drawCookingRice(ctx,paintedRice,riceArgs,game.cook);ctx.restore();}
    if(game.ingredients.veg){
      for(let i=0;i<26*mixed*game.rice;i++){const a=i*2.399,r=Math.sqrt((i+.5)/26),x=Math.cos(a)*165*r*amount,y=17+Math.sin(a)*36*r*amount;fillingPiece(ctx,x,y,game.filling,i,amount*baseScale,game.fillingCook);}
      for(let i=0;i<20*(1-mixed)*game.rice;i++){const x=77+(i%5)*12,y=12+Math.floor(i/5)*9;fillingPiece(ctx,x*amount*baseScale,y*amount*baseScale,game.filling,i,amount*baseScale,game.fillingCook);}
    }
    ctx.restore();
    ctx.restore();
  } else if (hasRice) {
  const rice=ctx.createRadialGradient(-65,-3,10,0,26,210);rice.addColorStop(0,'#ffe4a9');rice.addColorStop(.5,game.cook>.65?'#eeb574':'#f2cf8e');rice.addColorStop(1,'#b9783e');ellipse(ctx,0,23,193*amount,57*amount,rice);
  ctx.save();ctx.beginPath();ctx.ellipse(0,20,234*amount,70*amount,0,0,7);ctx.clip();
  for(let i=0;i<230*game.rice;i++){const a=i*2.399,r=Math.sqrt((i+.5)/230)*187*amount,x=Math.cos(a)*r,y=Math.sin(a)*r*.27+21;const rise=fly*(72+(i%8)*13),side=fly*game.lastLean*(i%7)*12;const color=game.ingredients.egg&&i%11===0?'#f8c658':i%5===0?'#e2a859':'#fff1c6';ellipse(ctx,x+side,y-rise,5+i%3,2+i%2,color,a*.4);}
  ctx.restore();
  // Ingredients above the rice are larger and readable at phone size.
  for(let i=0;i<(game.ingredients.veg?28:game.ingredients.egg?12:0)*game.rice;i++){const a=i*2.39,r=Math.sqrt((i+.5)/28)*184*amount,x=Math.cos(a)*r,y=Math.sin(a)*r*.26+16-fly*(55+i%4*14);if(i%3===0)ellipse(ctx,x,y,10,5,'#f9c94d',a);else if(i%3===1)ellipse(ctx,x,y,7,4,game.ingredients.veg?'#e96d4d':'#f9d47b',a);else if(game.ingredients.veg){ellipse(ctx,x,y,9,4,'#6eaa5e',a);ellipse(ctx,x+3,y-1,4,2,'#c9df78',a);}}
  }
  if(hasRice)ctx.restore();
  if(hasFlight&&fly>.04){
    ctx.save();ctx.globalAlpha=Math.min(1,fly*1.5);
    ctx.translate(game.lastLean*fly*76+(escaping?escapeSide*fly*50:0),-fly*145);
    ctx.rotate(-game.lastLean*fly*.12);
    ctx.scale(amount,amount);
    if(game.ingredients.egg&&paintedFlightEgg.complete&&paintedFlightEgg.naturalWidth)drawCookingRice(ctx,paintedFlightEgg,[-242,-105,484,160],game.cook);
    if(game.ingredients.veg&&paintedFlight.complete&&paintedFlight.naturalWidth){ctx.globalAlpha*=game.ingredients.egg?mixed:1;drawCookingRice(ctx,paintedFlight,[-242,-105,484,160],game.cook);}ctx.restore();
  }
  if(fly>.03) for(let i=0;i<(hasFlight?20:56)*game.rice;i++){const a=i*2.399,x=Math.cos(a)*178*amount+game.lastLean*fly*65,y=Math.sin(a)*34*amount+12-fly*(135+i%8*15);ellipse(ctx,x,y,5+i%3,2+i%2,game.ingredients.veg&&i%7===0?'#89bd68':i%5===0?'#f6c15d':'#fff0bb',a*.4);}
  if(escaping) {
    const progress=Math.min(1,age/.9), count=Math.max(8,Math.round(game.tossSpill*180));
    for(let i=0;i<count;i++){
      const spread=(i%7-3)*18, x=escapeSide*(160+progress*(150+i%5*19))+spread;
      const y=-70-progress*(95+i%6*17)+progress*progress*(190+i%4*25);
      ellipse(ctx,x,y,5+i%3,2+i%2,game.ingredients.veg&&i%9===0?'#8bb667':game.ingredients.veg&&i%7===0?'#e67d4c':'#fff0bb',i*.43);
    }
  }
  if(game.seasoned){ctx.strokeStyle=rgba('#834623',.25+game.seasoning*.2);ctx.lineWidth=8;for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(-75+i*47,16,24,.2,2.3);ctx.stroke();}}
  if (!hasPaintedWok) {
  ctx.strokeStyle='#cad1c5';ctx.lineWidth=16;ctx.beginPath();ctx.ellipse(0,28,283,103,0,0,7);ctx.stroke();ctx.strokeStyle='#f9e5ba';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(0,24,272,96,0,Math.PI*1.04,Math.PI*1.93);ctx.stroke();
  const handle=ctx.createLinearGradient(235,0,500,0);handle.addColorStop(0,'#aeb8b0');handle.addColorStop(.12,'#303a3c');handle.addColorStop(.5,'#141d20');handle.addColorStop(1,'#394249');ctx.fillStyle=handle;ctx.beginPath();ctx.roundRect(237,55,300,45,20);ctx.fill();ctx.strokeStyle='#8b9c9a';ctx.lineWidth=5;ctx.strokeRect(269,63,170,4);
  // The cook's sleeve and gloved hand anchor the pull towards the viewer.
  ctx.fillStyle='#472b2c';ctx.beginPath();ctx.moveTo(520,82);ctx.lineTo(377,71);ctx.lineTo(358,143);ctx.lineTo(520,188);ctx.fill();
  ctx.fillStyle='#ead1ad';ctx.beginPath();ctx.ellipse(329,91,55,35,-.1,0,7);ctx.fill();for(let i=0;i<4;i++)ellipse(ctx,302+i*18,73,13,24,'#f1dcb9',-.18);
  ctx.strokeStyle='#e9a86a';ctx.lineWidth=10;ctx.beginPath();ctx.moveTo(382,62);ctx.lineTo(395,117);ctx.stroke();
  }
  ctx.restore();
  if(age>=0&&age<1.05&&game.tossOutcome!=='none'&&(!game.seasoned||game.time-game.seasonedAt>=1.35)){
    const perfect=game.tossOutcome==='caught'&&game.lastTossQuality>=.82;
    const label=perfect?'会心の返し！':game.tossOutcome==='caught'?'ふわっ！':game.tossOutcome==='weak'?'弱すぎた':'こぼれた！';
    ctx.save();ctx.textAlign='center';ctx.font='bold 35px sans-serif';ctx.lineWidth=7;ctx.strokeStyle='#322022';ctx.fillStyle=perfect?'#fff6aa':game.tossOutcome==='caught'?'#fff0bd':'#fff9e9';
    const lift=reduced?0:Math.min(age, .5)*42;
    const labelY=game.tossOutcome==='caught'&&hasFlight?278:348;
    ctx.strokeText(label,390,labelY-lift);ctx.fillText(label,390,labelY-lift);ctx.restore();
  }
}
function seasoningEffect(ctx, game, reduced) {
  const age=game.time-game.seasonedAt;
  if(!game.seasoned||age<0||age>1.35)return;
  const good=game.seasoning>=.7, progress=reduced?0:Math.min(1,age/.85);
  ctx.save();
  glow(ctx,390,510,good?185:95,good?'#ffc875':'#c77a4d');
  if(!reduced) for(let i=0;i<28;i++){
    const fraction=(i*.618)%1, x=600+(270+fraction*60-600)*progress+(i%5-2)*18*progress;
    const y=245+(530+fraction*45-245)*progress-90*Math.sin(Math.PI*progress);
    ellipse(ctx,x,y,4+i%3,3+i%2,i%6===0?'#fff4c5':good?'#e7a047':'#9d613c',i*.37);
  }
  ctx.textAlign='center';ctx.font='bold 34px sans-serif';ctx.lineWidth=7;ctx.strokeStyle='#322022';ctx.fillStyle=good?'#fff0ba':'#ffe0b5';
  const label=good?'ジュワッ！ いい香り':'味付けが偏った';
  const rise=reduced?0:Math.min(age,.6)*35;
  ctx.strokeText(label,390,348-rise);ctx.fillText(label,390,348-rise);
  ctx.restore();
}
function ingredientEffect(ctx, game, reduced) {
  const age=game.time-game.lastAddedAt;
  if(!game.lastAdded||age<0||age>1.1)return;
  const names={egg:'卵',rice:'ごはん',veg:'具材'};
  const colors={egg:['#ffe49a','#f5bf4e'],rice:['#fff4cc','#e6cda1'],veg:['#81b861','#e77e51']};
  ctx.save();
  if(!reduced) for(let i=0;i<22;i++){
    const progress=Math.min(1,age/.72),x=550+(350+(i%7-3)*19-550)*progress;
    const y=270+(535+(i%5)*7-270)*progress-95*Math.sin(Math.PI*progress);
    ellipse(ctx,x,y,game.lastAdded==='rice'?6:8,game.lastAdded==='egg'?4:3,colors[game.lastAdded][i%2],i*.58);
  }
  ctx.textAlign='center';ctx.font='bold 33px sans-serif';ctx.lineWidth=7;ctx.strokeStyle='#322022';ctx.fillStyle='#fff0c3';
  const label=`${names[game.lastAdded]}を投入！`,rise=reduced?0:Math.min(age,.6)*28;
  ctx.strokeText(label,390,335-rise);ctx.fillText(label,390,335-rise);
  ctx.restore();
}
function pullPreview(ctx, game) {
  const preview = game.pullPreview;
  if (!preview || !game.ingredients.rice || game.phase !== 'playing') return;
  const safe = preview.state === 'safe';
  const color = safe ? '#ffe4a0' : preview.state === 'weak' ? '#e9cfaa' : '#ffad89';
  const lift = Math.min(1.4, preview.lift);
  const startX = 390, startY = 525;
  const endX = startX + preview.lean * 155, endY = startY - 70 - lift * 180;
  const controlX = startX + preview.lean * 90, controlY = startY - 110 - lift * 240;
  ctx.save();
  ctx.lineCap = 'round'; ctx.setLineDash([12, 12]); ctx.lineWidth = 6;
  ctx.strokeStyle = color; ctx.shadowColor = color; ctx.shadowBlur = 15;
  ctx.beginPath(); ctx.moveTo(startX, startY); ctx.quadraticCurveTo(controlX, controlY, endX, endY); ctx.stroke();
  ctx.setLineDash([]); ctx.shadowBlur = 0;
  for (const fraction of [.32, .57, .8]) {
    const x = (1-fraction)**2*startX+2*(1-fraction)*fraction*controlX+fraction**2*endX;
    const y = (1-fraction)**2*startY+2*(1-fraction)*fraction*controlY+fraction**2*endY;
    ellipse(ctx, x, y, 8, 4, '#fff0c5', fraction * 2);
  }
  const labelX = Math.max(120, Math.min(660, endX));
  const labelY = Math.max(195, endY - 42);
  ctx.font = 'bold 27px sans-serif'; ctx.textAlign = 'center';
  const labelWidth = ctx.measureText(preview.cue).width + 34;
  ctx.fillStyle = '#2c211fdc'; ctx.strokeStyle = color; ctx.lineWidth = 2;
  ctx.beginPath(); ctx.roundRect(labelX-labelWidth/2,labelY-30,labelWidth,43,20); ctx.fill(); ctx.stroke();
  ctx.fillStyle = color; ctx.fillText(preview.cue,labelX,labelY);
  ctx.restore();
}
export function drawScene(ctx, game, reduced = false) {
  const stage=Math.min(game.stage,2),t=reduced?0:game.time;
  const painted = paintedScenes[stage];
  ctx.drawImage(painted.complete && painted.naturalWidth ? painted : background(stage),0,0,W,H);
  const vignette=ctx.createRadialGradient(390,420,170,390,420,610);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#090a16a8');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
  atmosphere(ctx,game,reduced);worktop(ctx);
  burner(ctx,game.heat);steam(ctx,t,game.heat,reduced);wok(ctx,game,reduced);frontSteam(ctx,game,reduced);ingredientEffect(ctx,game,reduced);seasoningEffect(ctx,game,reduced);pullPreview(ctx,game);
}

export function drawDish(ctx, game, reveal = 1) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  const progress = Math.max(0, Math.min(1, reveal));
  ctx.clearRect(0, 0, w, h);
  const look = dishAppearance(game);
  const backdrop = ctx.createRadialGradient(w / 2, h * .4, 12, w / 2, h * .5, w * .55);
  backdrop.addColorStop(0, '#8c5038'); backdrop.addColorStop(1, '#231e25');
  ctx.fillStyle = backdrop; ctx.fillRect(0, 0, w, h);
  glow(ctx, w / 2, h * .5, 220, '#eeb16c');
  // The finished dish sits on a separate ceramic plate, not in the gameplay wok.
  ellipse(ctx, w / 2, 219, 263, 40, '#100f17');
  ellipse(ctx, w / 2, 181, 265, 82, '#d2bfa1');
  ellipse(ctx, w / 2, 178, 248, 71, '#f4e3c1');
  ellipse(ctx, w / 2, 179, 220, 58, '#334b51');
  ellipse(ctx, w / 2, 171, 209, 53, '#f8e8c3');
  // Keep the plate fixed while the food lands. The same state-dependent art
  // renders at every frame, so the reveal cannot change the scored outcome.
  ctx.save();
  ctx.globalAlpha = Math.min(1, progress * 3);
  ctx.translate(0, -90 * (1 - progress) ** 2);
  const amount = look.portion;
  if (game.ingredients.egg && paintedRiceEgg.complete && paintedRiceEgg.naturalWidth) {
    ctx.save();
    ctx.filter = `saturate(${Math.max(.2, 1 - look.pale * .2)}) brightness(${1 + look.pale * .13 - look.char * .2}) sepia(${look.char * .36})`;
    const riceArgs=[320 - 197 * amount, 103, 394 * amount, 132 * amount];
    ctx.drawImage(paintedRiceEgg,...riceArgs);
    if(game.ingredients.veg&&paintedRice.complete&&paintedRice.naturalWidth){ctx.globalAlpha*=1-look.unmixed;ctx.drawImage(paintedRice,...riceArgs);}
    ctx.restore();
  } else {
  const mound = ctx.createRadialGradient(280, 139, 10, 320, 174, 196);
  mound.addColorStop(0, look.pale < .25 ? '#ffe0a0' : '#f3d9a1');
  mound.addColorStop(.68, look.pale < .25 ? '#e9a657' : '#d7b079');
  mound.addColorStop(1, game.cook > 1.1 ? '#ad653b' : '#b77b4e');
  ellipse(ctx, 320, 165, 190 * amount, 59 * amount, mound);
  ctx.save(); ctx.beginPath(); ctx.ellipse(320, 163, 195 * amount, 63 * amount, 0, 0, Math.PI * 2); ctx.clip();
  const count = Math.round(300 * amount * amount);
  for (let i = 0; i < count; i++) {
    const angle = i * 2.399, radius = Math.sqrt((i + .5) / Math.max(1, count));
    const x = 320 + Math.cos(angle) * radius * 183 * amount;
    const y = 162 + Math.sin(angle) * radius * 48 * amount;
    const color = game.ingredients.veg && i % 19 === 0 ? '#77a45c' : game.ingredients.veg && i % 17 === 0 ? '#ef7650' : game.ingredients.egg && i % 11 === 0 ? '#f9ca5a' : i % 5 === 0 ? '#f2bc74' : '#fff0ba';
    ellipse(ctx, x, y, 6 + i % 3, 2.2 + i % 2, color, angle * .22);
  }
  for (let i = 0; i < (game.ingredients.veg ? 24 : game.ingredients.egg ? 9 : 0) * amount * amount; i++) {
    const angle = i * 2.399, radius = Math.sqrt((i + .5) / 24);
    const x = 320 + Math.cos(angle) * radius * 160 * amount, y = 158 + Math.sin(angle) * radius * 36 * amount;
    ellipse(ctx, x, y, i % 3 ? 8 : 10, i % 3 ? 3 : 5, !game.ingredients.veg ? '#f1bf54' : i % 3 === 0 ? '#75a856' : i % 3 === 1 ? '#f1bf54' : '#e8754a', angle);
  }
  ctx.restore();
  }
  // All finishing details sit above either the painted image or the procedural fallback.
  ctx.save(); ctx.beginPath(); ctx.ellipse(320, 165, 190 * amount, 58 * amount, 0, 0, Math.PI * 2); ctx.clip();
  if (look.pale > 0) { ctx.fillStyle = rgba('#fff0ca', look.pale * .25); ctx.fillRect(118, 100, 404, 130); }
  if (look.glaze > 0) {
    ctx.globalAlpha *= look.glaze * .5;
    for (let i = 0; i < 8; i++) {
      const x = 184 + i * 38, y = 141 + (i % 3) * 19;
      ellipse(ctx, x, y, 24, 5, '#b95e29', -.14 + i % 3 * .17);
      ellipse(ctx, x - 3, y - 4, 18, 2, '#ffe19a', -.14 + i % 3 * .17);
    }
    ctx.globalAlpha = Math.min(1, progress * 3);
  }
  for (let i = 0; i < (game.ingredients.veg ? look.mixedIngredients : 0); i++) {
    const x = 320 + Math.cos(i * 2.399) * Math.sqrt((i + .5) / 25) * 165 * amount;
    const y = 160 + Math.sin(i * 2.399) * Math.sqrt((i + .5) / 25) * 39 * amount;
    fillingPiece(ctx,x,y,game.filling,i,amount,game.fillingCook);
  }
  for (let i = 0; i < (game.ingredients.veg ? look.scatteredIngredients : 0); i++) {
    if(i===0)ellipse(ctx,391,169,64*amount,18*amount,rgba('#3c3023',look.unmixed*.25));
    const x = 346 + (i % 5) * 23 * amount, y = 145 + Math.floor(i / 5) * 12 * amount;
    fillingPiece(ctx,x,y,game.filling,i,amount,game.fillingCook);
  }
  for (let i = 0; i < Math.round(look.char * 23 * amount); i++) {
    const x = 320 + Math.cos(i * 2.399) * 170 * amount * Math.sqrt((i + .5) / 23);
    const y = 165 + Math.sin(i * 2.399) * 43 * amount * Math.sqrt((i + .5) / 23);
    ellipse(ctx, x, y, 8, 2.5, rgba('#59352a', .35 + look.char * .55), i * .4);
  }
  ctx.restore();
  if (look.steam > 0) {
    ctx.save(); ctx.globalAlpha *= look.steam * (.2 + Math.min(1, game.heat) * .18); ctx.lineWidth = 6; ctx.strokeStyle = '#fff0d7'; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const x = 222 + i * 67; ctx.beginPath(); ctx.moveTo(x, 105); ctx.bezierCurveTo(x - 16, 77, x + 20, 54, x, 25); ctx.stroke(); }
    ctx.restore();
  }
  ctx.restore();
  if (progress > .25 && progress < 1 && amount > .1) {
    const scatter = Math.sin(Math.PI * progress);
    ctx.save(); ctx.globalAlpha = scatter * .8;
    for (let i = 0; i < 18; i++) {
      const x = 320 + Math.cos(i * 2.399) * (80 + i * 7) * scatter;
      const y = 149 + Math.sin(i * 2.399) * (20 + i * 2) * scatter - 35 * (1 - progress);
      ellipse(ctx, x, y, 5 + i % 3, 2, i % 5 === 0 ? '#f4c45e' : '#ffe6a3', i * .42);
    }
    ctx.restore();
  }
  ctx.strokeStyle = '#fff2ce'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(320, 178, 247, 71, 0, .1, 2.6); ctx.stroke();
}
