import { STAGES, createGame, advance, toss, addSeasoning, result } from '../assets/chahan-core.js';
const $ = id => document.getElementById(id);
const canvas = $('scene'), ctx = canvas.getContext('2d');
let game = createGame(), last = 0, animation = 0, soundOn = true, audio, gesture = null, dragSteer = 0;
const held = new Set();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function chirp(freq = 440, duration = .07, type = 'sine') {
  if (!soundOn) return;
  try {
    audio ||= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const o = audio.createOscillator(), g = audio.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, audio.currentTime); o.frequency.exponentialRampToValueAtTime(freq * .72, audio.currentTime + duration);
    g.gain.setValueAtTime(.09, audio.currentTime); g.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    o.connect(g).connect(audio.destination); o.start(); o.stop(audio.currentTime + duration);
  } catch { /* Audio is optional. */ }
}
function begin() { game = createGame(); game.phase = 'playing'; gesture = null; dragSteer = 0; $('overlay').hidden = true; last = performance.now(); cancelAnimationFrame(animation); animation = requestAnimationFrame(loop); chirp(660, .12); }
function finish() { const r = result(game); $('overlayTitle').innerHTML = `${r.title}<br><span>${r.score}点</span>`; $('overlayText').textContent = `混ざり ${Math.round(game.mix * 100)}% ／ 火の通り ${Math.round(r.doneness * 100)}% ／ 味付け ${Math.round(r.seasoning * 100)}% ／ 残ったごはん ${Math.round(game.rice * 100)}%。もう一皿、作ってみる？`; $('start').textContent = 'もう一度つくる'; $('overlay').hidden = false; chirp(r.score >= 70 ? 880 : 270, .35); }
function press(id, key) { const el = $(id); el.addEventListener('pointerdown', e => { e.preventDefault(); el.setPointerCapture(e.pointerId); held.add(key); if (key === 'toss') doToss(); }); for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) el.addEventListener(event, () => held.delete(key)); }
press('heatDown', 'down'); press('heatUp', 'up');
const zone = $('swipeZone');
zone.addEventListener('pointerdown', e => { if (game.phase !== 'playing' || gesture) return; e.preventDefault(); zone.setPointerCapture(e.pointerId); gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now(), currentX: e.clientX, currentY: e.clientY }; });
zone.addEventListener('pointermove', e => { if (!gesture || e.pointerId !== gesture.id) return; gesture.currentX = e.clientX; gesture.currentY = e.clientY; dragSteer = clamp((e.clientX - gesture.x) / 80, -1, 1); });
zone.addEventListener('pointerup', e => { if (!gesture || e.pointerId !== gesture.id) return; const dx = e.clientX - gesture.x, dy = gesture.y - e.clientY, ms = Math.max(60, performance.now() - gesture.at); if (dy > 25) doToss({ lift: clamp(dy / 120 * (300 / ms) ** .35 * .7, 0, 2), lean: clamp(dx / Math.max(80, dy), -1.5, 1.5) }); gesture = null; dragSteer = 0; });
for (const event of ['pointercancel','lostpointercapture']) zone.addEventListener(event, () => { gesture = null; dragSteer = 0; });
document.addEventListener('keydown', e => { if (e.code === 'KeyS') { e.preventDefault(); if (!e.repeat) doSeasoning(); return; } const k = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Space: 'toss' }[e.code]; if (!k) return; e.preventDefault(); if (k === 'toss' && !e.repeat) doToss({ lift: .7, lean: 0 }); held.add(k); });
document.addEventListener('keyup', e => { const k = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Space: 'toss' }[e.code]; if (k) held.delete(k); });
window.addEventListener('blur', () => { held.clear(); gesture = null; dragSteer = 0; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { held.clear(); gesture = null; dragSteer = 0; last = 0; } else last = performance.now(); });
$('sound').onclick = () => { soundOn = !soundOn; $('sound').textContent = soundOn ? '音 ON' : '音 OFF'; };
$('start').onclick = begin;
function doToss(input) { if (game.phase !== 'playing') return; const safe = toss(game, input); if (safe === null) return; chirp(safe ? 600 + game.combo * 35 : 185, safe ? .11 : .2, safe ? 'triangle' : 'sawtooth'); updateHud(); }
function doSeasoning() { const quality = addSeasoning(game); if (quality === null) return; chirp(quality > .6 ? 720 : 330, .22, 'triangle'); updateHud(); }
$('seasoning').onclick = doSeasoning;
function updateHud() {
  const stage = STAGES[Math.min(game.stage, STAGES.length - 1)];
  $('place').textContent = stage.name; $('clock').textContent = Math.max(0, Math.ceil(STAGES.length * 18 - game.time)); $('combo').textContent = game.combo;
  $('stageTag').textContent = `${Math.min(game.stage + 1, 3).toString().padStart(2, '0')} / 03`;
  $('balanceNeedle').style.left = `${50 + clamp(game.balance, -1, 1) * 45}%`;
  $('riceBar').style.width = `${game.rice * 100}%`; $('cookBar').style.width = `${clamp(game.cook, 0, 1) * 100}%`; $('mixBar').style.width = `${game.mix * 100}%`;
  $('heatLabel').textContent = `火力 ${Math.round(game.heat * 100)}%`; $('tip').textContent = game.message;
  $('seasoning').disabled = game.seasoned || game.phase !== 'playing'; $('seasonHint').textContent = game.seasoned ? `味付け ${Math.round(game.seasoning * 100)}%` : '一度だけ・中盤が狙い目';
}
function draw() {
  const w = canvas.width, h = canvas.height, stage = STAGES[Math.min(game.stage, 2)], t = reduceMotion ? 0 : game.time;
  const grad = ctx.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, ['#34211e', '#183840', '#242944'][Math.min(game.stage, 2)]); grad.addColorStop(1, '#110f16'); ctx.fillStyle = grad; ctx.fillRect(0, 0, w, h);
  // Each place has a readable silhouette and a different disturbance in the rules.
  ctx.save(); ctx.globalAlpha = .5; ctx.fillStyle = stage.color;
  if (game.stage === 0) { for (let i = 0; i < 7; i++) { ctx.fillRect(i * 125 - 22, 175 + (i % 3) * 48, 95, 410); ctx.fillStyle = '#ffcd75'; ctx.fillRect(i * 125, 225 + (i % 3) * 48, 18, 25); ctx.fillStyle = stage.color; } }
  else if (game.stage === 1) { ctx.fillRect(0, 150, w, 430); ctx.fillStyle = '#10242d'; for (let i = 0; i < 4; i++) ctx.fillRect(28 + i * 195, 205, 145, 200); ctx.strokeStyle = '#a6e2d4'; ctx.lineWidth = 14; ctx.strokeRect(0, 150, w, 430); }
  else { for (let i = 0; i < 7; i++) { ctx.beginPath(); ctx.ellipse(i * 145 - 30, 300 + Math.sin(i * 2) * 80, 85, 24, -.2, 0, Math.PI * 2); ctx.fill(); } }
  ctx.restore();
  for (let i = 0; i < 24; i++) { const x = (i * 89 + 27) % w, y = (i * 137 + 44 + t * (i % 3 + 1) * 8) % 560; ctx.fillStyle = `rgba(255,209,128,${.1 + (i % 3) * .07})`; ctx.beginPath(); ctx.arc(x, y, 2 + i % 4, 0, 7); ctx.fill(); }
  const cx = w / 2, cy = 580;
  ctx.fillStyle = '#ef8243'; ctx.globalAlpha = .35 + game.heat * .38; for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.ellipse(cx + (i - 4) * 38, 730 + Math.sin(t * 5 + i) * 15, 19, 82 + game.heat * 40, .1 * i, 0, 7); ctx.fill(); } ctx.globalAlpha = 1;
  ctx.save(); ctx.translate(cx, cy); ctx.rotate(game.balance * .29);
  ctx.fillStyle = '#080e14'; ctx.beginPath(); ctx.ellipse(0, 106, 293, 75, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#41545a'; ctx.beginPath(); ctx.ellipse(0, 43, 280, 107, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#111e22'; ctx.beginPath(); ctx.ellipse(0, 30, 251, 84, 0, 0, 7); ctx.fill();
  ctx.fillStyle = '#dda450'; ctx.beginPath(); ctx.ellipse(0, 20, 225 * Math.sqrt(game.rice), 67 * Math.sqrt(game.rice), 0, 0, 7); ctx.fill();
  // Deterministic food pieces make tosses legible without asset downloads.
  const flight = reduceMotion ? 0 : Math.max(0, 1 - Math.abs(game.time - game.lastToss - .22) / .22) * Math.min(1, game.lastLift);
  for (let i = 0; i < 100 * game.rice; i++) { const angle = i * 2.399, radius = Math.sqrt((i + .5) / 100) * 205 * Math.sqrt(game.rice); const x = Math.cos(angle) * radius + flight * game.lastLean * (i % 5) * 17, y = Math.sin(angle) * radius * .27 + 18 - flight * (72 + (i % 7) * 12); ctx.fillStyle = i % 11 === 0 ? '#83ae5a' : i % 7 === 0 ? '#d86b55' : i % 5 === 0 ? '#f8d45c' : '#f4d39a'; ctx.beginPath(); ctx.ellipse(x, y, i % 11 === 0 ? 10 : 5, i % 7 === 0 ? 5 : 3, angle, 0, 7); ctx.fill(); }
  ctx.lineWidth = 18; ctx.strokeStyle = '#a9bdba'; ctx.beginPath(); ctx.ellipse(0, 33, 280, 106, 0, 0, 7); ctx.stroke();
  ctx.fillStyle = '#263438'; ctx.beginPath(); ctx.roundRect(225, 44, 265, 38, 18); ctx.fill(); ctx.fillStyle = '#a9bdba'; ctx.fillRect(250, 49, 120, 6);
  ctx.restore();
  ctx.fillStyle = '#fff3d8'; ctx.font = 'bold 31px system-ui'; ctx.textAlign = 'center'; ctx.fillText(stage.name, cx, 92);
}
function loop(now) { const dt = last ? clamp((now - last) / 1000, 0, .05) : 0; last = now; advance(game, { steer: clamp(Number(held.has('right')) - Number(held.has('left')) + dragSteer, -1, 1), heat: Number(held.has('up')) - Number(held.has('down')) }, dt); draw(); updateHud(); if (game.phase === 'finished') finish(); else animation = requestAnimationFrame(loop); }
draw(); updateHud();
