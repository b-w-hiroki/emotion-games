import { STAGES, COOK_SECONDS, FILLING_NAMES, heatReadiness, createGame, advance, toss, tossForecast, addIngredient, ingredientCue, eggReadiness, fillingReadiness, addSeasoning, seasoningReadiness, platingReadiness, cookMeter, plate, result } from '../assets/chahan-core.js';
import { motionToss } from '../assets/chahan-motion.js';
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
let selectedVenue = 0, game = createGame(), last = 0, animation = 0, dishAnimation = 0, gesture = null, noticeTimer = 0, audioTick = 0;
const audio = createKitchenAudio();
let motionEnabled = false, motionSeen = false, motionTimeout = 0;
const held = new Set();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function showNotice(title, detail) { const notice = $('stageNotice'); notice.querySelector('small').textContent = '今日の厨房'; $('noticeTitle').textContent = title; $('noticeDetail').textContent = detail; notice.hidden = false; notice.classList.remove('show'); void notice.offsetWidth; notice.classList.add('show'); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { notice.hidden = true; }, 2300); }
function begin() { audio.unlock(); cancelAnimationFrame(dishAnimation); dishAnimation = 0; game = createGame(selectedVenue); game.phase = 'playing'; gesture = null; resultCard.classList.remove('result'); $('overlay').hidden = true; $('stageNotice').hidden = true; clearTimeout(noticeTimer); last = performance.now(); audioTick = 0; cancelAnimationFrame(animation); animation = requestAnimationFrame(loop); showNotice(STAGES[game.stage].name, STAGES[game.stage].note + '。まず卵を入れよう。'); window.emotionTrack?.('game_start',{game_id:'chahan'}); }
function revealDish() {
  cancelAnimationFrame(dishAnimation);
  const dishCtx = resultDish.getContext('2d');
  if (reduceMotion || game.rice <= .02) { drawDish(dishCtx, game); resultDish.dataset.revealed = 'true'; return; }
  resultDish.dataset.revealed = 'false';
  drawDish(dishCtx, game, 0);
  const start = performance.now();
  function frame(now) {
    const elapsed = Math.min(1, (now - start) / 850);
    drawDish(dishCtx, game, 1 - (1 - elapsed) ** 3);
    if (elapsed < 1) dishAnimation = requestAnimationFrame(frame);
    else { dishAnimation = 0; resultDish.dataset.revealed = 'true'; }
  }
  dishAnimation = requestAnimationFrame(frame);
}
function finish() { const r = result(game); $('overlayTitle').innerHTML = `${r.title}<br><span>${r.score}点</span>`; $('overlayText').textContent = r.comment; $('overlay').querySelector('.eyebrow').textContent = '完成した一皿' + (game.filling ? '・' + FILLING_NAMES[game.filling] : ''); for (const [key, value] of Object.entries({ mix: game.mix, cook: r.doneness, seasoning: r.seasoning, rice: game.rice, toss: r.skill })) resultStats.querySelector(`[data-stat="${key}"]`).textContent = `${Math.round(value * 100)}%`; resultCard.classList.add('result'); $('start').textContent = 'もう一度つくる'; $('stageNotice').hidden = true; $('overlay').hidden = false; revealDish(); audio.finish(r.score); window.emotionTrack?.('game_complete',{game_id:'chahan',score:r.score,rice_pct:Math.round(game.rice*100),mix_pct:Math.round(game.mix*100),doneness_pct:Math.round(r.doneness*100),seasoning_pct:Math.round(r.seasoning*100)}); }
$('heatControl').addEventListener('input', event => { if (game.phase === 'playing') game.heat = clamp(Number(event.target.value) / 100, 0, 1); });
const zone = $('swipeZone');
zone.addEventListener('pointerdown', e => { if (game.phase !== 'playing' || gesture) return; e.preventDefault(); zone.setPointerCapture(e.pointerId); gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, minY: e.clientY, minAt: performance.now(), currentX: e.clientX, currentY: e.clientY }; });
function pullInput(x, y) { const push = clamp((gesture.y - gesture.minY) / 90, 0, 1.5), pull = Math.max(0, y - gesture.minY), dx = x - gesture.x, ms = Math.max(60, performance.now() - gesture.minAt); return { push, lift: clamp(pull / 120 * (300 / ms) ** .35 * .7, 0, 2), lean: clamp(dx / Math.max(80, pull), -1.5, 1.5) }; }
function updatePullPreview() { game.pullPreview = gesture && game.ingredients.rice && game.time - game.lastToss >= .42 && gesture.currentY - gesture.minY > 8 ? tossForecast(game, pullInput(gesture.currentX, gesture.currentY)) : null; }
zone.addEventListener('pointermove', e => { if (!gesture || e.pointerId !== gesture.id) return; gesture.currentX = e.clientX; gesture.currentY = e.clientY; if (e.clientY < gesture.minY) { gesture.minY = e.clientY; gesture.minAt = performance.now(); } game.panPush = clamp((gesture.y - gesture.minY) / 90, 0, 1); updatePullPreview(); });
zone.addEventListener('pointerup', e => { if (!gesture || e.pointerId !== gesture.id) return; if (e.clientY - gesture.minY > 25) doToss(pullInput(e.clientX, e.clientY)); game.pullPreview = null; game.panPush = 0; gesture = null; });
for (const event of ['pointercancel','lostpointercapture']) zone.addEventListener(event, () => { game.pullPreview = null; game.panPush = 0; gesture = null; });
document.addEventListener('keydown', e => { if (!document.getElementById('fillingChoices').hidden) { if (e.code === 'Escape') { e.preventDefault(); document.getElementById('fillingBack').click(); return; } if (e.code === 'Digit1' || e.code === 'Digit2') { e.preventDefault(); if (!e.repeat) document.querySelectorAll('#fillingChoices [data-filling]:not([hidden])')[e.code === 'Digit1' ? 0 : 1]?.click(); return; } } const ingredient = { Digit1: 'egg', Digit2: 'rice', Digit3: 'veg' }[e.code]; if (ingredient) { e.preventDefault(); if (!e.repeat) doIngredient(ingredient); return; } if (e.code === 'KeyS') { e.preventDefault(); if (!e.repeat) doFinishAction(); return; } const k = { ArrowUp: 'up', ArrowDown: 'down', Space: 'toss' }[e.code]; if (!k) return; e.preventDefault(); if (k === 'toss' && !e.repeat) doToss({ push: .7, lift: .7, lean: 0 }); held.add(k); });
document.addEventListener('keyup', e => { const k = { ArrowUp: 'up', ArrowDown: 'down', Space: 'toss' }[e.code]; if (k) held.delete(k); });
window.addEventListener('blur', () => { held.clear(); game.pullPreview = null; game.panPush = 0; gesture = null; });
document.addEventListener('visibilitychange', () => { if (document.hidden) { held.clear(); game.pullPreview = null; game.panPush = 0; gesture = null; last = 0; audio.pause(); } else { last = performance.now(); audio.unlock(); } });
$('sound').textContent = audio.enabled ? '音 ON' : '音 OFF';
$('sound').onclick = () => { const enabled = audio.setEnabled(!audio.enabled); $('sound').textContent = enabled ? '音 ON' : '音 OFF'; if (enabled) audio.unlock(); };
$('start').onclick = () => { closeFilling(); begin(); };
function stopMotion(status = 'タップで再開') {
  motionEnabled = false; motionSeen = false;
  clearTimeout(motionTimeout);
  window.removeEventListener('devicemotion', onMotion);
  $('motionStatus').textContent = status;
  $('motionButton').classList.remove('active');
}
function onMotion(event) {
  if (!motionEnabled || document.hidden) return;
  if ([event.acceleration?.x, event.acceleration?.y, event.acceleration?.z].every(Number.isFinite)) motionSeen = true;
  const impulse = motionToss(event.acceleration);
  if (impulse && game.phase === 'playing') doToss(impulse);
}
$('motionButton').onclick = async () => {
  if (motionEnabled) { stopMotion(); return; }
  if (!window.isSecureContext || typeof window.DeviceMotionEvent === 'undefined') { $('motionStatus').textContent = 'この端末では利用できません・スワイプで操作'; return; }
  try {
    // The request must happen inside this click's user activation.
    const permission = typeof DeviceMotionEvent.requestPermission === 'function' ? await DeviceMotionEvent.requestPermission() : 'granted';
    if (permission !== 'granted') { $('motionStatus').textContent = '許可されませんでした・スワイプで操作'; return; }
    motionEnabled = true; motionSeen = false;
    window.addEventListener('devicemotion', onMotion);
    $('motionButton').classList.add('active'); $('motionStatus').textContent = '端末を手前にあおる';
    motionTimeout = setTimeout(() => { if (!motionSeen) stopMotion('センサー値が届きません・スワイプで操作'); }, 4000);
  } catch { stopMotion('許可を確認できません・スワイプで操作'); }
};
function doToss(input) { if (game.phase !== 'playing') return; const safe = toss(game, input); if (safe === null) return; audio.toss(safe, game.combo, game.lastTossQuality); updateHud(); }
function closeFilling() { $('fillingChoices').hidden = true; $('recipe').classList.remove('choosing'); }
function doIngredient(kind, filling) { if (kind === 'veg' && !filling) { if (game.phase !== 'playing' || game.ingredients.veg) return; $('fillingChoices').hidden = false; $('recipe').classList.add('choosing'); for (const button of $('fillingChoices').querySelectorAll('[data-filling]')) button.hidden = !STAGES[game.stage].fillings.includes(button.dataset.filling); $('recipeHint').textContent = STAGES[game.stage].note; $('fillingChoices').querySelector('[data-filling]:not([hidden])').focus(); return; } if (!addIngredient(game, kind, filling)) return; closeFilling(); audio.season(.45); updateHud(); draw(); }
for (const button of document.querySelectorAll('[data-ingredient]')) button.onclick = () => doIngredient(button.dataset.ingredient);
for (const button of document.querySelectorAll('[data-filling]')) button.onclick = () => doIngredient('veg', button.dataset.filling);
$('fillingBack').onclick = () => { closeFilling(); updateHud(); document.querySelector('[data-ingredient="veg"]').focus(); };
function doSeasoning() { const quality = addSeasoning(game); if (quality === null) return; audio.season(quality); updateHud(); }
function doFinishAction() { if (!game.seasoned) { doSeasoning(); return; } if (!plate(game)) return; cancelAnimationFrame(animation); updateHud(); draw(); finish(); }
$('seasoning').onclick = doFinishAction;
function updateHud() {
  const stage = STAGES[Math.min(game.stage, STAGES.length - 1)];
  $('place').textContent = stage.name; $('clock').textContent = Math.max(0, Math.ceil(COOK_SECONDS - game.time)); $('combo').textContent = game.combo;
  $('stageTag').textContent = stage.name;
  const heat = heatReadiness(game); $('venueHeatCue').textContent = `${stage.note} · ${heat.cue}`; $('venueHeatCue').dataset.state = heat.state;
  const cook = cookMeter(game);
  $('riceBar').style.width = `${game.rice * 100}%`; $('cookBar').style.width = `${cook.fill}%`; $('cookTrack').dataset.state = cook.state; $('cookStatus').textContent = cook.label; $('mixBar').style.width = `${game.mix * 100}%`;
  $('heatLabel').textContent = `火力 ${Math.round(game.heat * 100)}%`; $('heatControl').value = Math.round(game.heat * 100); $('heatControl').style.setProperty('--heat', `${Math.round(game.heat * 100)}%`); $('heatControl').style.setProperty('--target', `${Math.round(stage.idealHeat * 100)}%`); $('tip').textContent = game.message;
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
  $('fillingLabel').textContent = !game.filling ? '選んで入れる' : `${FILLING_NAMES[game.filling]}・${filling.state === 'raw' ? '炒め中' : filling.state === 'ready' ? 'いい具合' : '焦げ注意'}`;
  $('fillingIcon').textContent = game.filling === 'pork' ? '🍖' : game.filling === 'shrimp' ? '🦐' : game.filling === 'scallion' ? '🌿' : '🥢';
  if ($('fillingChoices').hidden) $('recipeHint').textContent = ingredientCue(game);
  $('seasonIcon').textContent = game.seasoned ? '🍽️' : '🧂';
  $('seasonAction').textContent = game.seasoned ? '盛り付け' : '調味料';
  seasonButton.disabled = game.phase !== 'playing' || !game.ingredients.rice || !game.ingredients.veg;
  seasonButton.classList.toggle('ready', game.phase === 'playing' && (game.seasoned ? plating.ready : seasoning.ready));
  const hint = game.seasoned ? plating.cue : game.phase === 'playing' ? seasoning.cue : '仕上げに';
  if (seasonHint.textContent !== hint) seasonHint.textContent = hint;
}
function draw() { drawScene(ctx, game, reduceMotion); }
function loop(now) { const dt = last ? clamp((now - last) / 1000, 0, .05) : 0; last = now; advance(game, { heat: Number(held.has('up')) - Number(held.has('down')) }, dt); if (now - audioTick > 130) { audio.update({ stage: game.stage, heat: game.heat, playing: game.phase === 'playing' }); audioTick = now; } updatePullPreview(); draw(); updateHud(); if (game.phase === 'finished') { closeFilling(); finish(); } else animation = requestAnimationFrame(loop); }
draw(); updateHud();

for (const button of document.querySelectorAll('[data-venue]')) button.onclick = () => { selectedVenue = Number(button.dataset.venue); for (const choice of document.querySelectorAll('[data-venue]')) choice.setAttribute('aria-pressed', String(choice === button)); };
if (new URLSearchParams(location.search).has('embed')) document.body.classList.add('embed');
