const W = 780, H = 900;
const backgrounds = new Map();
const paintedScenes = ['street', 'train', 'sky'].map(name => {
  const image = new Image();
  image.src = new URL(`./art/${name}.webp`, import.meta.url).href;
  return image;
});
const paintedWok = new Image();
paintedWok.src = new URL('./art/wok-v2.webp', import.meta.url).href;
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
function burner(ctx, t, heat) {
  glow(ctx,390,705,250*heat+60,'#f98445');
  ellipse(ctx,390,752,265,38,rgba('#0c1013',.48));ellipse(ctx,390,729,224,24,'#5c5147');ellipse(ctx,390,722,193,15,'#202729');
  if (heat > .05) for(let i=0;i<17;i++){const x=160+i*28,h=(34+i%4*13)*heat,w=(11+i%3*4)*heat;ctx.fillStyle=i%3?'#f39750':'#ffe3a4';ctx.beginPath();ctx.moveTo(x-w,722);ctx.quadraticCurveTo(x-w*.3,722-h*.7,x+Math.sin(t*4+i)*13,722-h);ctx.quadraticCurveTo(x+w*.5,722-h*.35,x+w,722);ctx.fill();}
}
function steam(ctx, t, heat, reduced) {
  ctx.save();ctx.globalAlpha=.1+heat*.14;ctx.strokeStyle='#fff5dd';ctx.lineWidth=9;ctx.lineCap='round';
  for(let i=0;i<5;i++){const x=235+i*81,shift=reduced?0:Math.sin(t*1.5+i)*13;ctx.beginPath();ctx.moveTo(x,405);ctx.bezierCurveTo(x-28+shift,352,x+25+shift,298,x+shift,240);ctx.stroke();}
  ctx.restore();
}
function wok(ctx, game, reduced) {
  const t=game.time,fly=reduced?0:Math.max(0,1-Math.abs(t-game.lastToss-.25)/.25)*Math.min(1.35,game.lastLift);
  ctx.save();ctx.translate(310,548+fly*19);ctx.scale(1+fly*.04,1+fly*.04);ctx.rotate(game.balance*.28);
  const hasPaintedWok = paintedWok.complete && paintedWok.naturalWidth;
  if (!hasPaintedWok) ellipse(ctx,0,145,295,82,'#0c1218');
  if (hasPaintedWok) ctx.drawImage(paintedWok,-310,-268,780,520);
  else {
  const shell=ctx.createLinearGradient(0,-48,0,158);shell.addColorStop(0,'#9da5a2');shell.addColorStop(.22,'#506773');shell.addColorStop(.72,'#1b3039');shell.addColorStop(1,'#0a151d');ellipse(ctx,0,45,290,118,shell);
  const inner=ctx.createRadialGradient(-100,-40,20,0,40,300);inner.addColorStop(0,'#536774');inner.addColorStop(.46,'#263842');inner.addColorStop(1,'#0a1820');ellipse(ctx,0,22,258,87,inner);
  }
  const amount=Math.sqrt(game.rice);const rice=ctx.createRadialGradient(-65,-3,10,0,26,210);rice.addColorStop(0,'#ffe4a9');rice.addColorStop(.5,game.cook>.65?'#eeb574':'#f2cf8e');rice.addColorStop(1,'#b9783e');ellipse(ctx,0,23,193*amount,57*amount,rice);
  ctx.save();ctx.beginPath();ctx.ellipse(0,20,234*amount,70*amount,0,0,7);ctx.clip();
  for(let i=0;i<230*game.rice;i++){const a=i*2.399,r=Math.sqrt((i+.5)/230)*187*amount,x=Math.cos(a)*r,y=Math.sin(a)*r*.27+21;const rise=fly*(72+(i%8)*13),side=fly*game.lastLean*(i%7)*12;const color=i%17===0?'#85b65e':i%13===0?'#f17e55':i%11===0?'#fff1b2':i%5===0?'#e2a859':'#fff1c6';ellipse(ctx,x+side,y-rise,5+i%3,2+i%2,color,a*.4);}
  ctx.restore();
  if(fly>.03) for(let i=0;i<42*game.rice;i++){const a=i*2.399,x=Math.cos(a)*178+game.lastLean*fly*65,y=Math.sin(a)*39+12-fly*(100+i%8*11);ellipse(ctx,x,y,5+i%3,2+i%2,i%7===0?'#89bd68':i%5===0?'#f6c15d':'#fff0bb',a*.4);}
  // Ingredients above the rice are larger and readable at phone size.
  for(let i=0;i<28*game.rice;i++){const a=i*2.39,r=Math.sqrt((i+.5)/28)*184*amount,x=Math.cos(a)*r,y=Math.sin(a)*r*.26+16-fly*(55+i%4*14);if(i%3===0)ellipse(ctx,x,y,10,5,'#f9c94d',a);else if(i%3===1)ellipse(ctx,x,y,7,4,'#e96d4d',a);else{ellipse(ctx,x,y,9,4,'#6eaa5e',a);ellipse(ctx,x+3,y-1,4,2,'#c9df78',a);}}
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
}
export function drawScene(ctx, game, reduced = false) {
  const stage=Math.min(game.stage,2),t=reduced?0:game.time;
  const painted = paintedScenes[stage];
  ctx.drawImage(painted.complete && painted.naturalWidth ? painted : background(stage),0,0,W,H);
  const vignette=ctx.createRadialGradient(390,420,170,390,420,610);vignette.addColorStop(0,'#0000');vignette.addColorStop(1,'#090a16a8');ctx.fillStyle=vignette;ctx.fillRect(0,0,W,H);
  burner(ctx,t,game.heat);steam(ctx,t,game.heat,reduced);wok(ctx,game,reduced);
  const lip=ctx.createLinearGradient(0,800,0,900);lip.addColorStop(0,'#452a24');lip.addColorStop(1,'#150f16');ctx.fillStyle=lip;ctx.fillRect(0,808,W,92);ctx.fillStyle='#c98754';ctx.fillRect(0,805,W,7);
}

export function drawDish(ctx, game) {
  const w = ctx.canvas.width, h = ctx.canvas.height;
  ctx.clearRect(0, 0, w, h);
  const scoreCook = Math.min(1, game.cook / .86);
  const rice = Math.max(0, Math.min(1, game.rice));
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
  const amount = Math.sqrt(rice), mound = ctx.createRadialGradient(280, 139, 10, 320, 174, 196);
  mound.addColorStop(0, scoreCook > .75 ? '#ffe0a0' : '#f3d9a1');
  mound.addColorStop(.68, scoreCook > .75 ? '#e9a657' : '#d7b079');
  mound.addColorStop(1, game.cook > 1.1 ? '#ad653b' : '#b77b4e');
  ellipse(ctx, 320, 165, 190 * amount, 59 * amount, mound);
  ctx.save(); ctx.beginPath(); ctx.ellipse(320, 163, 195 * amount, 63 * amount, 0, 0, Math.PI * 2); ctx.clip();
  const count = Math.round(300 * rice);
  for (let i = 0; i < count; i++) {
    const angle = i * 2.399, radius = Math.sqrt((i + .5) / Math.max(1, count));
    const x = 320 + Math.cos(angle) * radius * 183 * amount;
    const y = 162 + Math.sin(angle) * radius * 48 * amount;
    const color = i % 19 === 0 ? '#77a45c' : i % 17 === 0 ? '#ef7650' : i % 11 === 0 ? '#f9ca5a' : i % 5 === 0 ? '#f2bc74' : '#fff0ba';
    ellipse(ctx, x, y, 6 + i % 3, 2.2 + i % 2, color, angle * .22);
  }
  for (let i = 0; i < 24 * rice; i++) {
    const angle = i * 2.399, radius = Math.sqrt((i + .5) / 24);
    const x = 320 + Math.cos(angle) * radius * 160 * amount, y = 158 + Math.sin(angle) * radius * 36 * amount;
    ellipse(ctx, x, y, i % 3 ? 8 : 10, i % 3 ? 3 : 5, i % 3 === 0 ? '#75a856' : i % 3 === 1 ? '#f1bf54' : '#e8754a', angle);
  }
  if (game.seasoned) for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = rgba('#754025', .22 + game.seasoning * .3); ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(206 + i * 42, 162, 16, .2, 2.3); ctx.stroke();
  }
  ctx.restore();
  if (rice > .3 && scoreCook > .55) {
    ctx.save(); ctx.globalAlpha = .2 + Math.min(1, game.heat) * .18; ctx.lineWidth = 6; ctx.strokeStyle = '#fff0d7'; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) { const x = 222 + i * 67; ctx.beginPath(); ctx.moveTo(x, 105); ctx.bezierCurveTo(x - 16, 77, x + 20, 54, x, 25); ctx.stroke(); }
    ctx.restore();
  }
  ctx.strokeStyle = '#fff2ce'; ctx.lineWidth = 5; ctx.beginPath(); ctx.ellipse(320, 178, 247, 71, 0, .1, 2.6); ctx.stroke();
}
