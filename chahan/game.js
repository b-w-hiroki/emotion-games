import { STAGES, COOK_SECONDS, FILLING_NAMES, heatReadiness, createGame, advance, toss, tossForecast, tapLadle, addIngredient, ingredientCue, eggReadiness, fillingReadiness, addSeasoning, seasoningReadiness, platingReadiness, cookMeter, plate, result } from '../assets/chahan-core.js';
import { motionToss } from '../assets/chahan-motion.js';
import { analyzeGather, analyzePull, forwardPeak } from '../assets/chahan-gesture.js';
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
resultStats.innerHTML = '<div><small>混ざり</small><strong data-stat="mix"></strong></div><div><small>火の通り</small><strong data-stat="cook"></strong></div><div><small>味付け</small><strong data-stat="seasoning"></strong></div><div><small>パラパラ</small><strong data-stat="fluff"></strong></div><div><small>鍋さばき</small><strong data-stat="toss"></strong></div>';
resultCard.insertBefore(resultStats, $('start'));
let selectedVenue = 0, game = createGame(), last = 0, animation = 0, dishAnimation = 0, gesture = null, noticeTimer = 0, audioTick = 0;
const audio = createKitchenAudio();
let motionEnabled = false, motionSeen = false, motionTimeout = 0;
const held = new Set();
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
function showNotice(title, detail) { const notice = $('stageNotice'); notice.querySelector('small').textContent = '今日の厨房'; $('noticeTitle').textContent = title; $('noticeDetail').textContent = detail; notice.hidden = false; notice.classList.remove('show'); void notice.offsetWidth; notice.classList.add('show'); clearTimeout(noticeTimer); noticeTimer = setTimeout(() => { notice.hidden = true; }, 2300); }
function begin() { audio.unlock(); cancelAnimationFrame(dishAnimation); dishAnimation = 0; game = createGame(selectedVenue); game.phase = 'playing'; gesture = null; resetScoopTrace(); resultCard.classList.remove('result'); $('overlay').hidden = true; $('stageNotice').hidden = true; clearTimeout(noticeTimer); last = performance.now(); audioTick = 0; cancelAnimationFrame(animation); updateHud(); draw(); zone.focus({ preventScroll: true }); animation = requestAnimationFrame(loop); showNotice(STAGES[game.stage].name, STAGES[game.stage].note + '。まず卵を入れよう。'); window.emotionTrack?.('game_start',{game_id:'chahan'}); }
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
function finish() { const r = result(game); $('overlayTitle').innerHTML = `${r.title}<br><span>${r.score}点</span>`; $('overlayText').textContent = r.comment; $('overlay').querySelector('.eyebrow').textContent = '完成した一皿' + (game.filling ? '・' + FILLING_NAMES[game.filling] : ''); for (const [key, value] of Object.entries({ mix: game.mix, cook: r.doneness, seasoning: r.seasoning, fluff: r.fluff, toss: r.skill })) resultStats.querySelector(`[data-stat="${key}"]`).textContent = `${Math.round(value * 100)}%`; resultCard.classList.add('result'); $('start').textContent = 'もう一度つくる'; $('stageNotice').hidden = true; $('overlay').hidden = false; revealDish(); audio.finish(r.score); window.emotionTrack?.('game_complete',{game_id:'chahan',score:r.score,rice_pct:Math.round(game.rice*100),mix_pct:Math.round(game.mix*100),doneness_pct:Math.round(r.doneness*100),seasoning_pct:Math.round(r.seasoning*100)}); }
$('heatControl').addEventListener('input', event => { if (game.phase === 'playing') game.heat = clamp(Number(event.target.value) / 100, 0, 1); });
const zone = $('swipeZone');
const scoopTrace = $('scoopTrace'), scoopPath = $('scoopPath'), scoopSpoon = $('scoopSpoon');
function resetScoopTrace() { scoopTrace.setAttribute('hidden', ''); scoopTrace.style.opacity = ''; scoopTrace.dataset.state = ''; scoopTrace.dataset.progress = '0'; scoopPath.setAttribute('d', ''); if (game.phase === 'playing') game.scoopProgress = 0; }
function drawScoopTrace(points, width, height) {
  if (!game.seasoned) return { valid: false, progress: 0 };
  const gather = analyzeGather(points, width, height);
  game.scoopProgress = Math.max(game.scoopProgress || 0, gather.progress * .75);
  scoopTrace.removeAttribute('hidden');
  scoopTrace.dataset.state = 'drag';
  scoopTrace.dataset.ready = String(platingReadiness(game).ready && gather.valid);
  scoopTrace.dataset.progress = (game.scoopProgress / .75).toFixed(2);
  scoopTrace.style.opacity = '1';
  scoopPath.setAttribute('d', points.map(([x, y], i) => `${i ? 'L' : 'M'} ${x.toFixed(1)} ${y.toFixed(1)}`).join(' '));
  const [x, y] = points.at(-1);
  scoopSpoon.setAttribute('transform', `translate(${x.toFixed(1)} ${y.toFixed(1)})`);
  return gather;
}
zone.addEventListener('pointerdown', e => { if (game.phase !== 'playing' || gesture) return; e.preventDefault(); zone.setPointerCapture(e.pointerId); const rect = zone.getBoundingClientRect(); gesture = { id: e.pointerId, x: e.clientX, y: e.clientY, at: e.timeStamp, peak: { x: e.clientX, y: e.clientY, at: e.timeStamp }, currentX: e.clientX, currentY: e.clientY, points: [[e.clientX - rect.left, e.clientY - rect.top]] }; if (game.seasoned) { scoopTrace.setAttribute('viewBox', `0 0 ${rect.width} ${rect.height}`); drawScoopTrace(gesture.points, rect.width, rect.height); } });
function pullInput(x, y, at) { return analyzePull(gesture.x, gesture.y, x, y, at - gesture.at); }
function updatePullPreview() { const peak = gesture?.peak; game.pullPreview = peak && game.ingredients.rice && game.time - game.lastToss >= .42 && peak.y - gesture.y > 8 ? tossForecast(game, pullInput(peak.x, peak.y, peak.at)) : null; }
zone.addEventListener('pointermove', e => { if (!gesture || e.pointerId !== gesture.id) return; const rect = zone.getBoundingClientRect(); gesture.currentX = e.clientX; gesture.currentY = e.clientY; gesture.peak = forwardPeak(gesture.peak, { x: e.clientX, y: e.clientY, at: e.timeStamp }); gesture.points.push([e.clientX - rect.left, e.clientY - rect.top]); const gather = drawScoopTrace(gesture.points, rect.width, rect.height); game.panPush = gather.progress > .15 ? 0 : clamp((e.clientY - gesture.y) / 90, 0, 1); updatePullPreview(); if (gather.progress > .15) game.pullPreview = null; });
zone.addEventListener('pointerup', e => { if (!gesture || e.pointerId !== gesture.id) return; const rect = zone.getBoundingClientRect(); gesture.peak = forwardPeak(gesture.peak, { x: e.clientX, y: e.clientY, at: e.timeStamp }); gesture.points.push([e.clientX - rect.left, e.clientY - rect.top]); const gather = drawScoopTrace(gesture.points, rect.width, rect.height); const peak = gesture.peak; if (gather.valid) doPlate(gather.quality); else if (peak.y - gesture.y > 25 && gather.progress < .15) doToss(pullInput(peak.x, peak.y, peak.at)); else if (Math.hypot(e.clientX - gesture.x, e.clientY - gesture.y) < 14) doLadle((e.clientX - rect.left) / rect.width); else if (game.seasoned) { game.message = 'おたまで外側から円を描き、中央へ集めよう。'; updateHud(); } if (!gather.valid) resetScoopTrace(); game.pullPreview = null; game.panPush = 0; gesture = null; });
for (const event of ['pointercancel','lostpointercapture']) zone.addEventListener(event, () => { game.pullPreview = null; game.panPush = 0; gesture = null; if (game.phase === 'playing') resetScoopTrace(); });
document.addEventListener('keydown', e => {
  if (!$('fillingChoices').hidden) {
    if (e.code === 'Escape') { e.preventDefault(); $('fillingBack').click(); return; }
    if (e.code === 'Digit1' || e.code === 'Digit2') {
      e.preventDefault();
      if (!e.repeat) document.querySelectorAll('#fillingChoices [data-filling]:not([hidden])')[e.code === 'Digit1' ? 0 : 1]?.click();
      return;
    }
  }
  const ingredient = { Digit1: 'egg', Digit2: 'rice', Digit3: 'veg' }[e.code];
  if (ingredient) { e.preventDefault(); if (!e.repeat) doIngredient(ingredient); return; }
  if (e.code === 'KeyS') { e.preventDefault(); if (!e.repeat) doSeasoning(); return; }
  if (e.code === 'KeyP') { e.preventDefault(); if (!e.repeat) doPlate(.7); return; }
  if (e.code === 'KeyL') {
    e.preventDefault();
    if (!e.repeat) {
      const pocket = game.riceClumps.indexOf(Math.max(...game.riceClumps));
      doLadle([.3, .5, .7][pocket]);
    }
    return;
  }
  const k = { ArrowUp: 'up', ArrowDown: 'down', Space: 'toss' }[e.code];
  if (!k) return;
  if (e.target instanceof Element && e.target.closest('button, input, select, textarea, summary, a[href], [contenteditable="true"]')) return;
  e.preventDefault();
  if (k === 'toss' && !e.repeat) doToss({ lift: .7, lean: 0 });
  held.add(k);
});
document.addEventListener('keyup', e => { const k = { ArrowUp: 'up', ArrowDown: 'down', Space: 'toss' }[e.code]; if (k) held.delete(k); });
window.addEventListener('blur', () => { held.clear(); game.pullPreview = null; game.panPush = 0; gesture = null; if (game.phase === 'playing') resetScoopTrace(); });
document.addEventListener('visibilitychange', () => { if (document.hidden) { held.clear(); game.pullPreview = null; game.panPush = 0; gesture = null; if (game.phase === 'playing') resetScoopTrace(); last = 0; audio.pause(); } else { last = 0; if (audio.active) audio.unlock(); } });
$('sound').textContent = audio.enabled ? '音 ON' : '音 OFF';
$('sound').onclick = () => { const enabled = audio.setEnabled(!audio.enabled); $('sound').textContent = enabled ? '音 ON' : '音 OFF'; if (enabled) audio.unlock(); };
$('start').onclick = () => { commitVenueScroll(); closeFilling(); begin(); };
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
function doLadle(x = .5) { const quality = tapLadle(game, x, performance.now() / 1000); if (quality === null) { updateHud(); return; } audio.ladle(quality); updateHud(); draw(); }
function closeFilling() { $('fillingChoices').hidden = true; $('recipe').classList.remove('choosing'); }
function doIngredient(kind, filling) { if (kind === 'veg' && !filling) { if (game.phase !== 'playing' || game.ingredients.veg) return; $('fillingChoices').hidden = false; $('recipe').classList.add('choosing'); for (const button of $('fillingChoices').querySelectorAll('[data-filling]')) button.hidden = !STAGES[game.stage].fillings.includes(button.dataset.filling); $('recipeHint').textContent = STAGES[game.stage].note; $('fillingChoices').querySelector('[data-filling]:not([hidden])').focus(); return; } if (!addIngredient(game, kind, filling)) return; closeFilling(); audio.season(.45); updateHud(); draw(); }
for (const button of document.querySelectorAll('[data-ingredient]')) button.onclick = () => doIngredient(button.dataset.ingredient);
for (const button of document.querySelectorAll('[data-filling]')) button.onclick = () => doIngredient('veg', button.dataset.filling);
$('fillingBack').onclick = () => { closeFilling(); updateHud(); document.querySelector('[data-ingredient="veg"]').focus(); };
function doSeasoning() { const quality = addSeasoning(game); if (quality === null) return; audio.season(quality); updateHud(); }
function doPlate(quality) {
  if (!plate(game, quality)) return;
  cancelAnimationFrame(animation);
  updateHud();
  if (reduceMotion) { resetScoopTrace(); draw(); finish(); return; }
  const started = performance.now();
  const from = game.scoopProgress || 0;
  scoopTrace.dataset.state = 'finish';
  function gatherFrame(now) {
    const progress = clamp((now - started) / 480, 0, 1);
    game.scoopProgress = from + (1 - from) * (1 - (1 - progress) ** 3);
    scoopTrace.style.opacity = String(1 - progress);
    draw();
    if (progress < 1) animation = requestAnimationFrame(gatherFrame);
    else { resetScoopTrace(); finish(); }
  }
  animation = requestAnimationFrame(gatherFrame);
}
$('seasoning').onclick = doSeasoning;
function updateHud() {
  zone.dataset.gameTime = game.time.toFixed(3);
  const stage = STAGES[Math.min(game.stage, STAGES.length - 1)];
  $('place').textContent = stage.name; $('clock').textContent = Math.max(0, Math.ceil(COOK_SECONDS - game.time)); $('combo').textContent = game.combo;
  $('stageTag').textContent = stage.name;
  const heat = heatReadiness(game); $('venueHeatCue').textContent = `${stage.note} · ${heat.cue}`; $('venueHeatCue').dataset.state = heat.state;
  const cook = cookMeter(game);
  $('riceBar').style.width = `${game.rice * 100}%`; $('cookBar').style.width = `${cook.fill}%`; $('cookTrack').dataset.state = cook.state; $('cookStatus').textContent = cook.label; $('mixBar').style.width = `${game.mix * 100}%`; $('fluffBar').style.width = `${game.fluff * 100}%`; $('ladleHint').hidden = !game.ingredients.rice || game.phase !== 'playing' || game.seasoned; $('platingHint').hidden = !game.seasoned || game.phase !== 'playing'; $('platingHint').dataset.ready = String(platingReadiness(game).ready);
  $('heatLabel').textContent = `火力 ${Math.round(game.heat * 100)}%`; $('heatControl').value = Math.round(game.heat * 100); $('heatControl').style.setProperty('--heat', `${Math.round(game.heat * 100)}%`); $('heatControl').style.setProperty('--target', `${Math.round(stage.idealHeat * 100)}%`); if ($('tip').textContent !== game.message) $('tip').textContent = game.message;
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
  seasonButton.hidden = game.seasoned;
  $('recipe').dataset.seasoned = String(game.seasoned);
  seasonButton.disabled = game.phase !== 'playing' || !game.ingredients.rice || !game.ingredients.veg || game.seasoned;
  seasonButton.classList.toggle('ready', game.phase === 'playing' && seasoning.ready);
  const hint = game.seasoned ? plating.cue : game.phase === 'playing' ? seasoning.cue : '仕上げに';
  if (seasonHint.textContent !== hint) seasonHint.textContent = hint;
}
function draw() { drawScene(ctx, game, reduceMotion); }
function loop(now) { if (document.hidden) { last = 0; animation = requestAnimationFrame(loop); return; } const dt = last ? clamp((now - last) / 1000, 0, .05) : 0; last = now; advance(game, { heat: Number(held.has('up')) - Number(held.has('down')) }, dt); if (now - audioTick > 130) { audio.update({ stage: game.stage, heat: game.heat, playing: game.phase === 'playing' }); audioTick = now; } updatePullPreview(); draw(); updateHud(); if (game.phase === 'finished') { closeFilling(); finish(); } else animation = requestAnimationFrame(loop); }
draw(); updateHud();

const venueTrack = $('venueTrack');
const venueChoices = [...document.querySelectorAll('[data-venue]')];
let venueUserScroll = false;
let venueScrollTimer;
function selectVenue(index, scroll = true) {
  selectedVenue = clamp(index, 0, venueChoices.length - 1);
  venueChoices.forEach((choice, i) => choice.setAttribute('aria-pressed', String(i === selectedVenue)));
  $('venuePosition').textContent = `${selectedVenue + 1} / ${venueChoices.length} · 横にスライドして選ぶ`;
  if (scroll) { venueUserScroll = false; clearTimeout(venueScrollTimer); venueTrack.scrollTo({ left: selectedVenue * venueTrack.clientWidth, behavior: 'instant' }); }
}
function visibleVenue() { return Math.round(venueTrack.scrollLeft / Math.max(1, venueTrack.clientWidth)); }
function commitVenueScroll() {
  if (!venueUserScroll) return;
  clearTimeout(venueScrollTimer);
  selectVenue(visibleVenue(), false);
  venueUserScroll = false;
}
for (const button of venueChoices) button.onclick = () => selectVenue(Number(button.dataset.venue));
for (const event of ['pointerdown', 'touchstart', 'wheel']) venueTrack.addEventListener(event, () => { venueUserScroll = true; }, { passive: true });
venueTrack.addEventListener('scroll', () => { if (!venueUserScroll) return; clearTimeout(venueScrollTimer); venueScrollTimer = setTimeout(() => { if (venueUserScroll) selectVenue(visibleVenue(), false); }, 80); });
venueTrack.addEventListener('keydown', event => { if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return; event.preventDefault(); event.stopPropagation(); selectVenue(selectedVenue + (event.key === 'ArrowRight' ? 1 : -1)); });
if (new URLSearchParams(location.search).has('embed')) document.body.classList.add('embed');
