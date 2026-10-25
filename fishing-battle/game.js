import { FISH, battleCue, createBattle, reelBattle, stepBattle } from './core.js';
import { BattleAudio } from './audio.js';
import { battleCamera, battlePose, interactionFeedback, lineShape, outcomePose, timingWindow } from './visual.js';

const $ = id => document.getElementById(id);
const board = document.querySelector('.board'), canvas = $('sea'), ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const art = {};
for (const name of ['fight-mid', ...Object.keys(FISH).map(id => `fish_hero_${id}`)]) {
  const image = new Image();
  image.src = `./assets/${name}.${name === 'fight-mid' ? 'png' : 'svg'}`;
  art[name] = image;
}
let state = createBattle(), last = 0, flash = 0, impact = '';
let pointerPull = 0;
let keyboardPull = false;
let outcomeAt = null;
let started = false;
let actions = { openingHits: 0, badReels: 0 }, actionUntil = 0;
let previousCue = 'calm';
let openingLatePlayed = false;
const camera = { x: 0, y: 0, zoom: 1 };
let muted = (() => { try { return localStorage.getItem('fishing-battle-muted') === '1'; } catch { return false; } })();
const sound = new BattleAudio(() => new (window.AudioContext || window.webkitAudioContext)());
sound.setMuted(muted);

function feedback(events) {
  for (const event of events) {
    if (event === 'opening') openingLatePlayed = false;
    if ((event === 'caught' || event === 'escaped') && outcomeAt === null) {
      outcomeAt = performance.now();
      pointerStart = null;
      setPull(0);
    }
    sound.play(event);
    if (['goodReel', 'goodOpening', 'badReel'].includes(event)) {
      flash = .35; impact = event;
      if (event === 'goodOpening') actions.openingHits++;
      if (event === 'badReel') actions.badReels++;
      $('action').textContent = event === 'goodOpening' ? 'ゆるんだ糸を引き寄せた！' : event === 'badReel' ? '糸が強く張った！' : '少し近づいた';
      $('action').className = event === 'badReel' ? 'danger-action' : 'good-action';
      actionUntil = state.time + 1.1;
    }
  }
}
function syncUI() {
  const cue = battleCue(state), fish = FISH[state.fishId];
  const timing = timingWindow(state, cue);
  const finishing = state.outcome && !reduced.matches && outcomeAt !== null && performance.now() - outcomeAt < (state.outcome === 'caught' ? 650 : 500);
  const critical = state.escape >= 70;
  if ($('fishName').textContent !== fish.name) $('fishName').textContent = fish.name;
  $('dangerFill').style.width = `${state.escape}%`;
  $('danger').setAttribute('aria-valuenow', String(Math.round(state.escape)));
  $('dangerLabel').textContent = critical ? '逃走寸前' : '逃走危険';
  document.querySelector('.top').classList.toggle('critical', critical);
  $('progressFill').style.width = `${state.reel}%`;
  $('progressValue').textContent = `${Math.round(state.reel)}%`;
  $('cue').className = `cue ${finishing ? `finale-${state.outcome}` : cue}`;
  const cueText = finishing ? state.outcome === 'caught' ? '引き寄せた！' : '離れていく…' : cue === 'rage' ? critical ? '逃げそう！ 手を止めて' : '魚が走った！ 手を止めて' : cue === 'opening' ? '糸がゆるんだ！ いま巻く' : cue === 'warning' ? '糸が張る… もうすぐ走る' : critical ? '逃げそう！ いま巻く' : '魚の動きを見よう';
  if ($('cueText').textContent !== cueText) $('cueText').textContent = cueText;
  $('timingFill').hidden = !timing || Boolean(finishing);
  if (timing) $('timingFill').style.width = `${Math.round(timing.fraction * 100)}%`;
  controls.classList.toggle('is-timed', Boolean(timing) && !finishing);
  controls.classList.toggle('is-opening', cue === 'opening' && !finishing);
  if (timing) {
    controls.style.setProperty('--window-angle', `${Math.round(timing.fraction * 360)}deg`);
    controls.style.setProperty('--window-color', timing.kind === 'opening' ? '#a9fff1' : '#ffd18a');
  }
  document.querySelector('.controls').classList.toggle('is-raging', !finishing && cue === 'rage');
  $('rageLabel').hidden = finishing || cue !== 'rage';
  const hint = finishing ? state.outcome === 'caught' ? '水面へ！' : '届かなかった…' : cue === 'rage' ? '暴れが収まるまで待とう' : cue === 'warning' ? '走りそう。指を止めよう' : pointerPull >= 34 ? '離して巻く！' : pointerPull > 8 ? '下へ引いて、離す' : cue === 'opening' ? 'いま、下へスワイプ！' : '下へスワイプして巻く';
  if ($('hint').textContent !== hint) $('hint').textContent = hint;
  if ($('action').textContent && state.time >= actionUntil) $('action').textContent = '';
  $('reel').disabled = Boolean(state.outcome);
  if (state.outcome) {
    if (finishing) return;
    const newlyEnded = $('result').hidden;
    $('result').hidden = false;
    $('resultFish').hidden = state.outcome !== 'caught';
    if (newlyEnded && state.outcome === 'caught') $('resultFish').src = `./assets/fish_hero_${state.fishId}.svg`;
    $('resultTitle').textContent = state.outcome === 'caught' ? `${fish.name}を釣り上げた！` : `${fish.name}が逃げた`;
    $('resultText').textContent = state.outcome === 'caught'
      ? actions.openingHits ? `走りを見送り、糸がゆるんだ瞬間を${actions.openingHits}回つかんだ。` : '少しずつ糸を巻き、水面まで引き寄せた。'
      : actions.badReels ? `走る魚に${actions.badReels}回巻いて、糸が張りつめた。次は走りを見送ろう。` : '水の向こうへ消えていった。次は糸がゆるんだ瞬間に巻こう。';
    if (newlyEnded) { if (started) window.emotionTrack?.('game_complete',{game_id:'fishing-battle',fish_id:state.fishId,outcome:state.outcome,opening_hits:actions.openingHits,bad_reels:actions.badReels}); $('retry').focus(); }
  }
}
function reel() {
  if (!started) { started = true; window.emotionTrack?.('game_start',{game_id:'fishing-battle'}); }
  if (!reelBattle(state)) return;
  sound.unlock();
  feedback(state.events); state.events = []; syncUI();
}
let pointerStart = null;
const controls = document.querySelector('.controls');
function setPull(value) {
  pointerPull = Math.max(0, Math.min(110, value));
  const response = interactionFeedback(state, pointerPull);
  controls.style.setProperty('--pull', `${Math.min(7, pointerPull * .06)}px`);
  controls.style.setProperty('--tension', response.tension.toFixed(3));
  controls.style.setProperty('--glow-size', `${Math.round(18 + response.tension * 14)}px`);
  controls.style.setProperty('--pull-glow', response.danger ? '#ff976c' : '#8de7ff');
  controls.classList.toggle('is-pulling', pointerPull > 8);
  sound.setTension(pointerPull > 8 ? response.tension : 0, response.pitch);
}
board.addEventListener('pointerdown', e => {
  if (state.outcome || keyboardPull || e.target.closest('.settings,.result') || (e.pointerType === 'mouse' && e.button !== 0)) return;
  if (pointerStart) return;
  sound.unlock();
  pointerStart = { id: e.pointerId, x: e.clientX, y: e.clientY, onDial: Boolean(e.target.closest('#reel')) };
  board.setPointerCapture(e.pointerId);
});
board.addEventListener('pointermove', e => {
  if (pointerStart?.id === e.pointerId) { setPull(e.clientY - pointerStart.y); syncUI(); }
});
board.addEventListener('pointerup', e => {
  if (pointerStart?.id !== e.pointerId) return;
  const dy = e.clientY - pointerStart.y, dx = Math.abs(e.clientX - pointerStart.x);
  const tapDial = pointerStart.onDial && Math.hypot(dx, dy) <= 24;
  pointerStart = null;
  setPull(0);
  if (tapDial || dy >= 34) reel();
  else syncUI();
});
function cancelPointer(e) { if (pointerStart?.id === e.pointerId) { pointerStart = null; setPull(0); syncUI(); } }
board.addEventListener('pointercancel', cancelPointer);
board.addEventListener('lostpointercapture', cancelPointer);
document.addEventListener('keydown', e => {
  const focused = document.activeElement;
  if (e.code !== 'Space' || !$('result').hidden || pointerStart || ['SELECT', 'INPUT', 'TEXTAREA'].includes(focused?.tagName) || (focused?.tagName === 'BUTTON' && focused.id !== 'reel')) return;
  e.preventDefault();
  if (e.repeat || keyboardPull) return;
  keyboardPull = true;
  sound.unlock();
  setPull(70);
  syncUI();
});
document.addEventListener('keyup', e => {
  if (e.code !== 'Space' || !keyboardPull) return;
  e.preventDefault();
  keyboardPull = false;
  setPull(0);
  reel();
});
function cancelKeyboardPull() { if (keyboardPull) { keyboardPull = false; setPull(0); syncUI(); } }
window.addEventListener('blur', cancelKeyboardPull);
function restart() { sound.reset(); keyboardPull = false; setPull(0); state = createBattle($('fish').value, Date.now()); outcomeAt = null; flash = 0; impact = ''; camera.x = camera.y = 0; camera.zoom = 1; started = false; actions = { openingHits: 0, badReels: 0 }; previousCue = 'calm'; openingLatePlayed = false; $('action').textContent = ''; $('result').hidden = true; syncUI(); }
$('retry').addEventListener('click', restart);
$('fish').addEventListener('change', restart);
$('reel').addEventListener('click', e => { if (e.detail === 0) reel(); });
function syncMute() { $('mute').textContent = muted ? '音 OFF' : '音 ON'; $('mute').setAttribute('aria-pressed', String(muted)); }
$('mute').addEventListener('click', () => { muted = !muted; sound.setMuted(muted); if (!muted) sound.unlock(); try { localStorage.setItem('fishing-battle-muted', muted ? '1' : '0'); } catch {} syncMute(); });
syncMute();

function drawImage(name, x, y, w, h) {
  const image = art[name];
  if (image?.complete && image.naturalWidth) ctx.drawImage(image, x, y, w, h);
}
function draw(now) {
  const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  const dt = last ? Math.min((now - last) / 1000, .05) : 0;
  const t = now / 1000, cue = battleCue(state), rage = cue === 'rage';
  const pose = battlePose(state, cue, t, { reduced: reduced.matches, pull: pointerPull * 844 / rect.height, tension: interactionFeedback(state, pointerPull).tension, impact, flash });
  const finaleProgress = state.outcome && outcomeAt !== null ? Math.min(1, Math.max(0, (now - outcomeAt) / (state.outcome === 'caught' ? 650 : 500))) : 0;
  const fish = outcomePose(pose, state.outcome, finaleProgress);
  const target = battleCamera(state, cue, pose, { pull: pointerPull, outcomeProgress: finaleProgress, impact, flash, reduced: reduced.matches });
  const blend = reduced.matches ? 1 : 1 - Math.exp(-dt * 9);
  camera.x += (target.x - camera.x) * blend;
  camera.y += (target.y - camera.y) * blend;
  camera.zoom += (target.zoom - camera.zoom) * blend;
  const scale = canvas.height / 844;
  const wide = rect.width > rect.height;
  const originX = (canvas.width - 390 * scale) / 2 - (wide ? Math.min(55 * dpr, canvas.width * .08) : 0);
  ctx.setTransform(scale * camera.zoom, 0, 0, scale * camera.zoom,
    originX + scale * (195 * (1 - camera.zoom) + camera.x),
    scale * (422 * (1 - camera.zoom) + camera.y));
  board.style.setProperty('--camera-x', `${(camera.x * scale / dpr).toFixed(2)}px`);
  board.style.setProperty('--camera-y', `${(camera.y * scale / dpr).toFixed(2)}px`);
  board.style.setProperty('--camera-zoom', camera.zoom.toFixed(4));
  const { fishX, fishY } = pose;
  const line = lineShape(fish, cue, pointerPull);
  const waterAlpha = 1 - finaleProgress;
  // AINAN's Battle composition keeps the hooked fish, player, water and line in one scene.
  ctx.strokeStyle = pointerPull > 8 ? rage ? '#ff9568' : '#a9fff1' : rage || cue === 'warning' || impact === 'badReel' ? '#ffba69' : '#e8f8ff';
  ctx.lineWidth = (rage || cue === 'warning' ? 2.3 : 1.5 + pose.pull * .055) + pose.tension * 2;
  ctx.globalAlpha = fish.alpha;
  ctx.beginPath(); ctx.moveTo(line.startX, line.startY); ctx.bezierCurveTo(line.c1x, line.c1y, line.c2x, line.c2y, line.endX, line.endY); ctx.stroke();
  ctx.globalAlpha = waterAlpha;
  ctx.fillStyle = '#00385466';
  ctx.beginPath(); ctx.ellipse(fishX + 66, fishY + 61, 75, 19, -.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = pointerPull > 8 ? rage ? '#ffb28c' : '#b6fff3' : cue === 'opening' ? '#b6fff3' : '#e4faff'; ctx.lineWidth = (cue === 'opening' ? 5 : rage ? 5 : 4) + pose.tension * 2;
  ctx.globalAlpha = waterAlpha * (rage || cue === 'opening' ? .93 : .72);
  ctx.beginPath(); ctx.ellipse(fishX + 60, fishY + 55, pose.ringWidth, pose.ringHeight, -.1, 0, Math.PI * 2); ctx.stroke();
  if (cue === 'opening') {
    ctx.globalAlpha = waterAlpha * .52; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(fishX + 60, fishY + 55, pose.ringWidth - 15, pose.ringHeight - 8, -.1, 0, Math.PI * 2); ctx.stroke();
  }
  const timing = timingWindow(state, cue);
  if (timing && timing.fraction > 0) {
    ctx.globalAlpha = waterAlpha * .95;
    ctx.strokeStyle = timing.kind === 'warning' ? '#ffc17e' : '#a9fff1';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.ellipse(fishX + 60, fishY + 55, pose.ringWidth + 11, pose.ringHeight + 9, -.1, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * timing.fraction);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.save(); ctx.globalAlpha = fish.alpha; ctx.translate(fish.fishX + 70, fish.fishY + 40); ctx.rotate(fish.angle); ctx.scale(fish.scale, fish.scale);
  drawImage(`fish_hero_${state.fishId}`, -70, -40, 140, 80); ctx.restore();
  drawImage('fight-mid', 8, 409, 184, 218);
  if (rage || cue === 'warning') {
    ctx.strokeStyle = rage ? '#e2faff' : '#ffe2a4'; ctx.lineWidth = rage ? 3 : 2; ctx.globalAlpha = waterAlpha * .82;
    for (let i = 0; i < 3; i++) {
      const y = fishY + 18 + i * 18, start = fishX + 121 + i * 7;
      ctx.beginPath(); ctx.moveTo(start, y); ctx.lineTo(start + (rage ? 33 : 19), y - 5); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  if (rage || cue === 'warning' || cue === 'opening' || flash > 0) {
    ctx.globalAlpha = waterAlpha; ctx.strokeStyle = rage || cue === 'warning' || impact === 'badReel' ? '#fff1c2' : '#d6f9ff'; ctx.lineWidth = 3;
    const rays = rage ? 7 : cue === 'opening' ? 5 : 4;
    for (let i = 0; i < rays; i++) {
      const a = i * Math.PI * 2 / rays;
      const x = fishX + 65 + Math.cos(a) * (pose.ringWidth - 2), y = fishY + 48 + Math.sin(a) * (pose.ringHeight + 8);
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
  flash = Math.max(0, flash - dt);
  if (!flash) impact = '';
  if (last && !document.hidden) {
    const previousEscape = state.escape;
    stepBattle(state, dt);
    if (state.events.length) { feedback(state.events); state.events = []; }
    const nextCue = battleCue(state);
    const nextTiming = timingWindow(state, nextCue);
    if (nextTiming?.kind === 'opening' && nextTiming.fraction <= .35 && !openingLatePlayed) {
      openingLatePlayed = true;
      feedback(['openingLate']);
    }
    if (pointerPull > 8 && (nextCue !== previousCue || state.escape !== previousEscape)) setPull(pointerPull);
    if (nextCue === 'warning' && previousCue !== 'warning') feedback(['warning']);
    previousCue = nextCue;
    syncUI();
  }
  last = now;
  requestAnimationFrame(draw);
}
document.addEventListener('visibilitychange', () => { last = 0; if (document.hidden) cancelKeyboardPull(); sound.setHidden(document.hidden); });
window.addEventListener('pagehide', () => sound.reset());
syncUI(); requestAnimationFrame(draw);
