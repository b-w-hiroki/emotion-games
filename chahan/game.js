import { STAGES, createGame, advance, toss, addIngredient, ingredientCue, eggReadiness, fillingReadiness, addSeasoning, seasoningReadiness, platingReadiness, cookMeter, windForecast, balanceReadiness, plate, result } from '../assets/chahan-core.js';
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
resultStats.innerHTML = '<div><small>混ざり</small><strong data-stat="mix"></strong></div><div><small>火の通り</small><strong data-stat="cook"></strong></div><div><small>味付け</small><strong data-stat="seasoning"></strong></div><div><small>残った米</small><strong data-stat="rice"></strong></div><div><small>鍋さばき</small><strong data-stat="toss"></strong></div>';
resultCard.insertBefore(resultStats, $('start'));
let game = createGame(), last = 0, animation = 0, gesture = null, dragSteer = 0, noticeTimer = 0, audioTick = 0;
const audio = createKitchenAudio();
let motionEnabled = false, motionSeen = false, neutralGamma = null, tiltSteer = 0, motionTimeout = 0;
const held = new Set();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function showNotice(title, detail) { const notice = $('stageNotice'); notice.querySelector('small').textContent = game.stage === 0 ? '最初の舞台' : '次の舞台'; $('noticeTitle').textContent = title; $('noticeDetail').textContent = detail; notice.hidden = false; notice.classList.remove('show'); void notice.offsetWidth; notice.classList.add('show'); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { notice.hidden = true; }, 2300); }
function begin() { audio.unlock(); game = createGame(); game.phase = 'playing'; gesture = null; dragSteer = 0; neutralGamma = null; resultCard.classList.remove('result'); $('overlay').hidden = true; $('stageNotice').hidden = true; clearTimeout(noticeTimer); last = performance.now(); audioTick = 0; cancelAnimationFrame(animation); animation = requestAnimationFrame(loop); showNotice('路地裏の屋台', '空の鍋から。まず卵を入れよう。'); window.emotionTrack?.('game_start',{game_id:'chahan'}); }
function finish() { const r = result(game); $('overlayTitle').innerHTML = `${r.title}<br><span>${r.score}点</span>`; $('overlayText').textContent = r.comment; $('overlay').querySelector('.eyebrow').textContent = '完成した一皿' + (game.filling ? '・' + (game.filling === 'pork' ? '焼豚' : 'ねぎ') : ''); for (const [key, value] of Object.entries({ mix: game.mix, cook: r.doneness, seasoning: r.seasoning, rice: game.rice, toss: r.skill })) resultStats.querySelector(`[data-stat="${key}"]`).textContent = `${Math.round(value * 100)}%`; drawDish(resultDish.getContext('2d'), game); resultCard.classList.add('result'); $('start').textContent = 'もう一度つくる'; $('stageNotice').hidden = true; $('overlay').hidden = false; audio.finish(r.score); window.emotionTrack?.('game_complete',{game_id:'chahan',score:r.score,rice_pct:Math.round(game.rice*100),mix_pct:Math.round(game.mix*100),doneness_pct:Math.round(r.doneness*100),seasoning_pct:Math.round(r.seasoning*100)}); }
$('heatControl').addEventListener('input', event => { if (game.phase === 'playing') game.heat = clamp(Number(event.target.value) / 100, 0, 1); });
const zone = $('swipeZone');
zone.addEventListener('pointerdown', e => { if (game.phase !== 'playing' || gesture) return; e.preventDefault(); zone.setPointerCapture(e.pointerId); gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, at: performance.now(), currentX: e.clientX, currentY: e.clientY }; });
zone.addEventListener('pointermove', e => { if (!gesture || e.pointerId !== gesture.id) return; gesture.currentX = e.clientX; gesture.currentY = e.clientY; dragSteer = clamp((e.clientX - gesture.x) / 80, -1, 1); });
zone.addEventListener('pointerup', e => { if (!gesture || e.pointerId !== gesture.id) return; const dx = e.clientX - gesture.x, pull = e.clientY - gesture.y, ms = Math.max(60, performance.now() - gesture.at); if (pull > 25) doToss({ lift: clamp(pull / 120 * (300 / ms) ** .35 * .7, 0, 2), lean: clamp(dx / Math.max(80, pull), -1.5, 1.5) }); gesture = null; dragSteer = 0; });
for (const event of ['pointercancel','lostpointercapture']) zone.addEventListener(event, () => { gesture = null; dragSteer = 0; });
document.addEventListener('keydown', e => { if (!document.getElementById('fillingChoices').hidden) { if (e.code === 'Escape') { e.preventDefault(); document.getElementById('fillingBack').click(); return; } if (e.code === 'Digit1' || e.code === 'Digit2') { e.preventDefault(); if (!e.repeat) document.querySelector(e.code === 'Digit1' ? '[data-filling=scallion]' : '[data-filling=pork]').click(); return; } } const ingredient = { Digit1: 'egg', Digit2: 'rice', Digit3: 'veg' }[e.code]; if (ingredient) { e.preventDefault(); if (!e.repeat) doIngredient(ingredient); return; } if (e.code === 'KeyS') { e.preventDefault(); if (!e.repeat) doFinishAction(); return; } const k = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Space: 'toss' }[e.code]; if (!k) return; e.preventDefault(); if (k === 'toss' && !e.repeat) doToss({ lift: .7, lean: 0 }); held.add(k); });
document.addEventListener('keyup', e => { const k = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down', Space: 'toss' }[e.code]; if (k) held.delete(k); });
window.addEventListener('blur', () => { held.clear(); gesture = null; dragSteer = 0; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { held.clear(); gesture = null; dragSteer = 0; last = 0; audio.pause(); } else { last = performance.now(); audio.unlock(); } });
$('sound').textContent = audio.enabled ? '音 ON' : '音 OFF';
$('sound').onclick = () => { const enabled = audio.setEnabled(!audio.enabled); $('sound').textContent = enabled ? '音 ON' : '音 OFF'; if (enabled) audio.unlock(); };
$('start').onclick = () => { closeFilling(); begin(); };
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
function doToss(input) { if (game.phase !== 'playing') return; const safe = toss(game, input); if (safe === null) return; audio.toss(safe, game.combo, game.lastTossQuality); updateHud(); }
function closeFilling() { $('fillingChoices').hidden = true; $('recipe').classList.remove('choosing'); }
function doIngredient(kind, filling) { if (kind === 'veg' && !filling) { if (game.phase !== 'playing' || game.ingredients.veg) return; $('fillingChoices').hidden = false; $('recipe').classList.add('choosing'); $('recipeHint').textContent = 'ねぎは後から、焼豚は早めに入れるとおいしい'; $('fillingChoices').querySelector('button').focus(); return; } if (!addIngredient(game, kind, filling)) return; closeFilling(); audio.season(.45); updateHud(); draw(); }
for (const button of document.querySelectorAll('[data-ingredient]')) button.onclick = () => doIngredient(button.dataset.ingredient);
for (const button of document.querySelectorAll('[data-filling]')) button.onclick = () => doIngredient('veg', button.dataset.filling);
$('fillingBack').onclick = () => { closeFilling(); updateHud(); document.querySelector('[data-ingredient="veg"]').focus(); };
function doSeasoning() { const quality = addSeasoning(game); if (quality === null) return; audio.season(quality); updateHud(); }
function doFinishAction() { if (!game.seasoned) { doSeasoning(); return; } if (!plate(game)) return; cancelAnimationFrame(animation); updateHud(); draw(); finish(); }
$('seasoning').onclick = doFinishAction;
function updateHud() {
  const stage = STAGES[Math.min(game.stage, STAGES.length - 1)];
  $('place').textContent = stage.name; $('clock').textContent = Math.max(0, Math.ceil(STAGES.length * 18 - game.time)); $('combo').textContent = game.combo;
  $('stageTag').textContent = `${Math.min(game.stage + 1, 3).toString().padStart(2, '0')} / 03`;
  const gust = windForecast(game), gustCue = $('gustCue');
  gustCue.hidden = game.phase !== 'playing' || gust.state === 'calm';
  gustCue.dataset.state = gust.state;
  if (gustCue.textContent !== gust.cue) gustCue.textContent = gust.cue;
  $('balanceNeedle').style.left = `${50 + clamp(game.balance, -1, 1) * 45}%`;
  const balance = balanceReadiness(game);
  $('balanceTrack').dataset.state = balance.state;
  if ($('balanceStatus').textContent !== balance.cue) $('balanceStatus').textContent = balance.cue;
  const cook = cookMeter(game);
  $('riceBar').style.width = `${game.rice * 100}%`; $('cookBar').style.width = `${cook.fill}%`; $('cookTrack').dataset.state = cook.state; $('cookStatus').textContent = cook.label; $('mixBar').style.width = `${game.mix * 100}%`;
  $('heatLabel').textContent = `火力 ${Math.round(game.heat * 100)}%`; $('heatControl').value = Math.round(game.heat * 100); $('heatControl').style.setProperty('--heat', `${Math.round(game.heat * 100)}%`); $('tip').textContent = game.message;
  const seasoning = seasoningReadiness(game), plating = platingReadiness(game), seasonButton = $('seasoning'), seasonHint = $('seasonHint');
  for (const button of document.querySelectorAll('[data-ingredient]')) button.disabled = game.phase !== 'playing' || game.ingredients[button.dataset.ingredient];
  const next = !game.ingredients.egg ? 'egg' : !game.ingredients.rice ? 'rice' : !game.ingredients.veg ? 'veg' : 'seasoning';
  for (const button of document.querySelectorAll('.ingredient-tray button')) button.classList.toggle('suggested', (button.id === next || button.dataset.ingredient === next) && (next !== 'rice' || game.eggCook >= .28));
  const egg = eggReadiness(game);
  $('eggStatus').textContent = !game.ingredients.egg ? 'ふわっと' : game.ingredients.rice ? '投入済み' : game.eggCook < .28 ? `火入れ ${Math.round(game.eggCook / .48 * 100)}%` : egg.ready ? 'ふんわり！' : '焦げ注意';
  $('recipe').dataset.eggState = !game.ingredients.egg || game.ingredients.rice ? '' : game.eggCook < .28 ? 'raw' : egg.ready ? 'ready' : 'burnt';
  $('recipeCount').textContent = `${Number(game.ingredients.egg) + Number(game.ingredients.rice) + Number(game.ingredients.veg) + Number(game.seasoned)} / 4`;
  const filling = fillingReadiness(game);
  $('recipe').dataset.fillingState = filling.state;
  $('fillingLabel').textContent = !game.filling ? '選んで入れる' : game.filling === 'pork' ? filling.state === 'raw' ? '焼豚・焼き待ち' : filling.state === 'ready' ? '焼豚・香ばしい' : '焼豚・焦げ注意' : filling.state === 'raw' ? 'ねぎ・炒め中' : filling.state === 'ready' ? 'ねぎ・いい香り' : 'ねぎ・香り注意';
  $('fillingIcon').textContent = game.filling === 'pork' ? '🍖' : game.filling === 'scallion' ? '🌿' : '🫛';
  if ($('fillingChoices').hidden) $('recipeHint').textContent = ingredientCue(game);
  $('seasonIcon').textContent = game.seasoned ? '🍽️' : '🧂';
  $('seasonAction').textContent = game.seasoned ? '盛り付け' : '調味料';
  seasonButton.disabled = game.phase !== 'playing' || !game.ingredients.rice || !game.ingredients.veg || (game.seasoned && game.stage !== STAGES.length - 1);
  seasonButton.classList.toggle('ready', game.phase === 'playing' && (game.seasoned ? plating.ready : seasoning.ready));
  const hint = game.seasoned ? plating.cue : game.phase === 'playing' ? seasoning.cue : '仕上げに';
  if (seasonHint.textContent !== hint) seasonHint.textContent = hint;
}
function draw() { drawScene(ctx, game, reduceMotion); }
function loop(now) { const dt = last ? clamp((now - last) / 1000, 0, .05) : 0; last = now; const oldStage = game.stage; advance(game, { steer: clamp(Number(held.has('right')) - Number(held.has('left')) + dragSteer + tiltSteer, -1, 1), heat: Number(held.has('up')) - Number(held.has('down')) }, dt); if (game.stage !== oldStage && game.phase === 'playing') { const stage = STAGES[game.stage]; showNotice(stage.name, game.stage === 1 ? '揺れる車内で、鍋を水平に。' : '空の上。最後のひと振り。'); audio.transition(); } if (now - audioTick > 130) { audio.update({ stage: game.stage, heat: game.heat, playing: game.phase === 'playing' }); audioTick = now; } draw(); updateHud(); if (game.phase === 'finished') { closeFilling(); finish(); } else animation = requestAnimationFrame(loop); }
draw(); updateHud();
