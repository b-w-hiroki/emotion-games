import { STAGES, createGame, advance, toss, addSeasoning, seasoningReadiness, result } from '../assets/chahan-core.js';
import { motionToss, motionSteer } from '../assets/chahan-motion.js';
import { drawScene, drawDish } from './art.js';
import { createKitchenAudio } from './audio.js';
const $ = id => document.getElementById(id);
const canvas = $('scene'), ctx = canvas.getContext('2d');
const resultCard = $('overlay').querySelector('.card');
const resultDish = document.createElement('canvas');
resultDish.id = 'resultDish'; resultDish.className = 'result-dish'; resultDish.width = 640; resultDish.height = 280;
resultCard.insertBefore(resultDish, $('overlayText'));
const resultStats = document.createElement('div');
resultStats.className = 'result-stats';
resultStats.innerHTML = '<div><small>混ざり</small><strong data-stat="mix"></strong></div><div><small>火の通り</small><strong data-stat="cook"></strong></div><div><small>味付け</small><strong data-stat="seasoning"></strong></div><div><small>残った米</small><strong data-stat="rice"></strong></div>';
resultCard.insertBefore(resultStats, $('start'));
let game = createGame(), last = 0, animation = 0, gesture = null, dragSteer = 0, noticeTimer = 0, audioTick = 0;
const audio = createKitchenAudio();
let motionEnabled = false, motionSeen = false, neutralGamma = null, tiltSteer = 0, motionTimeout = 0;
const held = new Set();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function showNotice(title, detail) { const notice = $('stageNotice'); notice.querySelector('small').textContent = game.stage === 0 ? '最初の舞台' : '次の舞台'; $('noticeTitle').textContent = title; $('noticeDetail').textContent = detail; notice.hidden = false; notice.classList.remove('show'); void notice.offsetWidth; notice.classList.add('show'); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { notice.hidden = true; }, 2300); }
function begin() { audio.unlock(); game = createGame(); game.phase = 'playing'; gesture = null; dragSteer = 0; neutralGamma = null; resultCard.classList.remove('result'); $('overlay').hidden = true; $('stageNotice').hidden = true; clearTimeout(noticeTimer); last = performance.now(); audioTick = 0; cancelAnimationFrame(animation); animation = requestAnimationFrame(loop); showNotice('路地裏の屋台', 'まずは、まっすぐ返す。'); }
function finish() { const r = result(game); $('overlayTitle').innerHTML = `${r.title}<br><span>${r.score}点</span>`; $('overlayText').textContent = r.comment; $('overlay').querySelector('.eyebrow').textContent = '完成した一皿'; for (const [key, value] of Object.entries({ mix: game.mix, cook: r.doneness, seasoning: r.seasoning, rice: game.rice })) resultStats.querySelector(`[data-stat="${key}"]`).textContent = `${Math.round(value * 100)}%`; drawDish(resultDish.getContext('2d'), game); resultCard.classList.add('result'); $('start').textContent = 'もう一度つくる'; $('stageNotice').hidden = true; $('overlay').hidden = false; audio.finish(r.score); }
$('heatControl').addEventListener('input', event => { if (game.phase === 'playing') game.heat = clamp(Number(event.target.value) / 100, 0, 1); });
const zone = $('swipeZone');
zone.addEventListener('pointerdown', e => { if (game.phase !== 'playing' || gesture) return; e.preventDefault(); zone.setPointerCapture(e.pointerId); gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now(), currentX: e.clientX, currentY: e.clientY }; });
zone.addEventListener('pointermove', e => { if (!gesture || e.pointerId !== gesture.id) return; gesture.currentX = e.clientX; gesture.currentY = e.clientY; dragSteer = clamp((e.clientX - gesture.x) / 80, -1, 1); });
zone.addEventListener('pointerup', e => { if (!gesture || e.pointerId !== gesture.id) return; const dx = e.clientX - gesture.x, pull = e.clientY - gesture.y, ms = Math.max(60, performance.now() - gesture.at); if (pull > 25) doToss({ lift: clamp(pull / 120 * (300 / ms) ** .35 * .7, 0, 2), lean: clamp(dx / Math.max(80, pull), -1.5, 1.5) }); gesture = null; dragSteer = 0; });
for (const event of ['pointercancel','lostpointercapture']) zone.addEventListener(event, () => { gesture = null; dragSteer = 0; });
document.addEventListener('keydown', e => { if (e.code === 'KeyS') { e.preventDefault(); if (!e.repeat) doSeasoning(); return; } const k = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Space: 'toss' }[e.code]; if (!k) return; e.preventDefault(); if (k === 'toss' && !e.repeat) doToss({ lift: .7, lean: 0 }); held.add(k); });
document.addEventListener('keyup', e => { const k = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Space: 'toss' }[e.code]; if (k) held.delete(k); });
window.addEventListener('blur', () => { held.clear(); gesture = null; dragSteer = 0; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { held.clear(); gesture = null; dragSteer = 0; last = 0; audio.pause(); } else { last = performance.now(); audio.unlock(); } });
$('sound').textContent = audio.enabled ? '音 ON' : '音 OFF';
$('sound').onclick = () => { const enabled = audio.setEnabled(!audio.enabled); $('sound').textContent = enabled ? '音 ON' : '音 OFF'; if (enabled) audio.unlock(); };
$('start').onclick = begin;
function stopMotion(status = 'タップで再開') {
  motionEnabled = false; motionSeen = false; tiltSteer = 0; neutralGamma = null;
  clearTimeout(motionTimeout);
  window.removeEventListener('devicemotion', onMotion);
  window.removeEventListener('deviceorientation', onOrientation);
  $('motionStatus').textContent = status;
  $('motionButton').classList.remove('active');
}
function onMotion(event) {
  if (!motionEnabled || document.hidden) return;
  if ([event.acceleration?.x, event.acceleration?.y, event.acceleration?.z].every(Number.isFinite)) motionSeen = true;
  const impulse = motionToss(event.acceleration);
  if (impulse && game.phase === 'playing') doToss(impulse);
}
function onOrientation(event) {
  if (!motionEnabled || document.hidden || !Number.isFinite(event.gamma)) return;
  if (neutralGamma === null) neutralGamma = event.gamma;
  tiltSteer = motionSteer(event.gamma, neutralGamma);
}
$('motionButton').onclick = async () => {
  if (motionEnabled) { stopMotion(); return; }
  if (!window.isSecureContext || typeof window.DeviceMotionEvent === 'undefined') { $('motionStatus').textContent = 'この端末では利用できません・スワイプで操作'; return; }
  try {
    // The request must happen inside this click's user activation.
    const permission = typeof DeviceMotionEvent.requestPermission === 'function' ? await DeviceMotionEvent.requestPermission() : 'granted';
    if (permission !== 'granted') { $('motionStatus').textContent = '許可されませんでした・スワイプで操作'; return; }
    motionEnabled = true; motionSeen = false; neutralGamma = null;
    window.addEventListener('devicemotion', onMotion);
    window.addEventListener('deviceorientation', onOrientation);
    $('motionButton').classList.add('active'); $('motionStatus').textContent = '端末を手前に引く・傾けてバランス';
    motionTimeout = setTimeout(() => { if (!motionSeen) stopMotion('センサー値が届きません・スワイプで操作'); }, 4000);
  } catch { stopMotion('許可を確認できません・スワイプで操作'); }
};
function doToss(input) { if (game.phase !== 'playing') return; const safe = toss(game, input); if (safe === null) return; audio.toss(safe, game.combo); updateHud(); }
function doSeasoning() { const quality = addSeasoning(game); if (quality === null) return; audio.season(quality); updateHud(); }
$('seasoning').onclick = doSeasoning;
function updateHud() {
  const stage = STAGES[Math.min(game.stage, STAGES.length - 1)];
  $('place').textContent = stage.name; $('clock').textContent = Math.max(0, Math.ceil(STAGES.length * 18 - game.time)); $('combo').textContent = game.combo;
  $('stageTag').textContent = `${Math.min(game.stage + 1, 3).toString().padStart(2, '0')} / 03`;
  $('balanceNeedle').style.left = `${50 + clamp(game.balance, -1, 1) * 45}%`;
  $('riceBar').style.width = `${game.rice * 100}%`; $('cookBar').style.width = `${clamp(game.cook, 0, 1) * 100}%`; $('mixBar').style.width = `${game.mix * 100}%`;
  $('heatLabel').textContent = `火力 ${Math.round(game.heat * 100)}%`; $('heatControl').value = Math.round(game.heat * 100); $('heatControl').style.setProperty('--heat', `${Math.round(game.heat * 100)}%`); $('tip').textContent = game.message;
  const seasoning = seasoningReadiness(game), seasonButton = $('seasoning'), seasonHint = $('seasonHint');
  seasonButton.disabled = game.seasoned || game.phase !== 'playing';
  seasonButton.classList.toggle('ready', !game.seasoned && game.phase === 'playing' && seasoning.ready);
  const hint = game.seasoned ? `味付け ${Math.round(game.seasoning * 100)}%` : game.phase === 'playing' ? seasoning.cue : '一度だけ・中盤が狙い目';
  if (seasonHint.textContent !== hint) seasonHint.textContent = hint;
}
function draw() { drawScene(ctx, game, reduceMotion); }
function loop(now) { const dt = last ? clamp((now - last) / 1000, 0, .05) : 0; last = now; const oldStage = game.stage; advance(game, { steer: clamp(Number(held.has('right')) - Number(held.has('left')) + dragSteer + tiltSteer, -1, 1), heat: Number(held.has('up')) - Number(held.has('down')) }, dt); if (game.stage !== oldStage && game.phase === 'playing') { const stage = STAGES[game.stage]; showNotice(stage.name, game.stage === 1 ? '揺れる車内で、鍋を水平に。' : '空の上。最後のひと振り。'); audio.transition(); } if (now - audioTick > 130) { audio.update({ stage: game.stage, heat: game.heat, playing: game.phase === 'playing' }); audioTick = now; } draw(); updateHud(); if (game.phase === 'finished') finish(); else animation = requestAnimationFrame(loop); }
draw(); updateHud();
