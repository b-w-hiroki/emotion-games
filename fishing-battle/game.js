import { FISH, battleCue, createBattle, reelBattle, stepBattle } from './core.js';
import { BattleAudio } from './audio.js';
import { battlePose, outcomePose } from './visual.js';

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
let outcomeAt = null;
let started = false;
let actions = { openingHits: 0, badReels: 0 }, actionUntil = 0;
let previousCue = 'calm';
let muted = (() => { try { return localStorage.getItem('fishing-battle-muted') === '1'; } catch { return false; } })();
const sound = new BattleAudio(() => new (window.AudioContext || window.webkitAudioContext)());
sound.setMuted(muted);

function feedback(events) {
  for (const event of events) {
    if ((event === 'caught' || event === 'escaped') && outcomeAt === null) outcomeAt = performance.now();
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
  if ($('cue').textContent !== cueText) $('cue').textContent = cueText;
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
  controls.style.setProperty('--pull', `${Math.min(7, pointerPull * .06)}px`);
  controls.classList.toggle('is-pulling', pointerPull > 8 && state.phase !== 'rage');
}
board.addEventListener('pointerdown', e => {
  if (state.outcome || e.target.closest('.settings,.result') || (e.pointerType === 'mouse' && e.button !== 0)) return;
  if (pointerStart) return;
  pointerStart = { id: e.pointerId, x: e.clientX, y: e.clientY, onDial: Boolean(e.target.closest('#reel')) };
  board.setPointerCapture(e.pointerId);
});
board.addEventListener('pointermove', e => {
  if (pointerStart?.id === e.pointerId) setPull(e.clientY - pointerStart.y);
});
board.addEventListener('pointerup', e => {
  if (pointerStart?.id !== e.pointerId) return;
  const dy = e.clientY - pointerStart.y, dx = Math.abs(e.clientX - pointerStart.x);
  const tapDial = pointerStart.onDial && Math.hypot(dx, dy) <= 24;
  pointerStart = null;
  setPull(0);
  if (tapDial || dy >= 34) reel();
});
function cancelPointer(e) { if (pointerStart?.id === e.pointerId) { pointerStart = null; setPull(0); } }
board.addEventListener('pointercancel', cancelPointer);
board.addEventListener('lostpointercapture', cancelPointer);
document.addEventListener('keydown', e => {
  if (e.code !== 'Space' || e.repeat || !$('result').hidden || ['SELECT', 'BUTTON'].includes(document.activeElement?.tagName)) return;
  e.preventDefault(); reel();
});
function restart() { sound.reset(); setPull(0); state = createBattle($('fish').value, Date.now()); outcomeAt = null; flash = 0; impact = ''; started = false; actions = { openingHits: 0, badReels: 0 }; previousCue = 'calm'; $('action').textContent = ''; $('result').hidden = true; syncUI(); }
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
  ctx.setTransform(canvas.width / 390, 0, 0, canvas.height / 844, 0, 0);
  ctx.clearRect(0, 0, 390, 844);
  const dt = last ? Math.min((now - last) / 1000, .05) : 0;
  const t = now / 1000, cue = battleCue(state), rage = cue === 'rage';
  const pose = battlePose(state, cue, t, { reduced: reduced.matches, pull: pointerPull * 844 / rect.height, impact, flash });
  const finaleProgress = state.outcome && outcomeAt !== null ? Math.min(1, Math.max(0, (now - outcomeAt) / (state.outcome === 'caught' ? 650 : 500))) : 0;
  const fish = outcomePose(pose, state.outcome, finaleProgress);
  const { fishX, fishY } = pose;
  const waterAlpha = 1 - finaleProgress;
  // AINAN's Battle composition keeps the hooked fish, player, water and line in one scene.
  ctx.strokeStyle = rage || cue === 'warning' || impact === 'badReel' ? '#ffba69' : '#e8f8ff';
  ctx.lineWidth = rage || cue === 'warning' ? 2.3 : 1.5 + pose.pull * .055;
  ctx.globalAlpha = fish.alpha;
  ctx.beginPath(); ctx.moveTo(146, 490); ctx.quadraticCurveTo(pose.lineControlX, pose.lineControlY, fish.fishX + 20, fish.fishY + 45); ctx.stroke();
  ctx.globalAlpha = waterAlpha;
  ctx.fillStyle = '#00385466';
  ctx.beginPath(); ctx.ellipse(fishX + 66, fishY + 61, 75, 19, -.1, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = cue === 'opening' ? '#b6fff3' : '#e4faff'; ctx.lineWidth = cue === 'opening' ? 5 : rage ? 5 : 4;
  ctx.globalAlpha = waterAlpha * (rage || cue === 'opening' ? .93 : .72);
  ctx.beginPath(); ctx.ellipse(fishX + 60, fishY + 55, pose.ringWidth, pose.ringHeight, -.1, 0, Math.PI * 2); ctx.stroke();
  if (cue === 'opening') {
    ctx.globalAlpha = waterAlpha * .52; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(fishX + 60, fishY + 55, pose.ringWidth - 15, pose.ringHeight - 8, -.1, 0, Math.PI * 2); ctx.stroke();
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
    stepBattle(state, dt);
    if (state.events.length) { feedback(state.events); state.events = []; }
    const nextCue = battleCue(state);
    if (nextCue === 'warning' && previousCue !== 'warning') feedback(['warning']);
    previousCue = nextCue;
    syncUI();
  }
  last = now;
  requestAnimationFrame(draw);
}
document.addEventListener('visibilitychange', () => { last = 0; sound.setHidden(document.hidden); });
window.addEventListener('pagehide', () => sound.reset());
syncUI(); requestAnimationFrame(draw);
