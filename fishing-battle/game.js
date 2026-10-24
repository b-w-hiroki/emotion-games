import { FISH, battleCue, createBattle, reelBattle, stepBattle } from './core.js';

const $ = id => document.getElementById(id);
const board = document.querySelector('.board'), canvas = $('sea'), ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const art = {};
for (const name of ['fight-mid', ...Object.keys(FISH).map(id => `fish_hero_${id}`)]) {
  const image = new Image();
  image.src = `./assets/${name}.${name === 'fight-mid' ? 'png' : 'svg'}`;
  art[name] = image;
}
let state = createBattle(), last = 0, flash = 0, audio;
let muted = (() => { try { return localStorage.getItem('fishing-battle-muted') === '1'; } catch { return false; } })();

function tone(frequency, duration, type = 'sine', gain = .04) {
  if (muted) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const osc = audio.createOscillator(), volume = audio.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, audio.currentTime);
    volume.gain.setValueAtTime(gain, audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(.001, audio.currentTime + duration);
    osc.connect(volume).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
  } catch {}
}
function feedback(events) {
  for (const event of events) {
    if (event === 'rage') tone(145, .3, 'sawtooth');
    if (event === 'opening') tone(560, .2);
    if (event === 'goodReel' || event === 'goodOpening') tone(event === 'goodOpening' ? 650 : 450, .1);
    if (event === 'badReel') tone(100, .25, 'sawtooth', .06);
    if (event === 'caught') { tone(660, .5); setTimeout(() => tone(880, .4), 100); }
    if (event === 'escaped') tone(105, .5, 'triangle');
    if (['goodReel', 'goodOpening', 'badReel'].includes(event)) flash = .3;
  }
}
function syncUI() {
  const cue = battleCue(state), fish = FISH[state.fishId];
  if ($('fishName').textContent !== fish.name) $('fishName').textContent = fish.name;
  $('dangerFill').style.width = `${state.escape}%`;
  $('progressFill').style.width = `${state.reel}%`;
  $('progressValue').textContent = `${Math.round(state.reel)}%`;
  $('cue').className = `cue ${cue}`;
  const cueText = cue === 'rage' ? '魚が暴れてる！ 今は待つ' : cue === 'opening' ? 'いま巻きどき！' : '';
  if ($('cue').textContent !== cueText) $('cue').textContent = cueText;
  document.querySelector('.controls').classList.toggle('is-raging', cue === 'rage');
  $('rageLabel').hidden = cue !== 'rage';
  const hint = cue === 'rage' ? '暴れ中は待とう' : 'タイミングよく下へスワイプ';
  if ($('hint').textContent !== hint) $('hint').textContent = hint;
  $('reel').disabled = Boolean(state.outcome);
  if (state.outcome) {
    const newlyEnded = $('result').hidden;
    $('result').hidden = false;
    $('resultTitle').textContent = state.outcome === 'caught' ? `${fish.name}を釣り上げた！` : `${fish.name}が逃げた`;
    $('resultText').textContent = state.outcome === 'caught' ? '魚の動きを読んで引き寄せた。' : '逃走ゲージが限界に達した。暴れ中は待とう。';
    if (newlyEnded) $('retry').focus();
  }
}
function reel() {
  if (!reelBattle(state)) return;
  feedback(state.events); state.events = []; syncUI();
}
let pointerStart = null;
board.addEventListener('pointerdown', e => {
  if (e.target.closest('.settings,.result')) return;
  pointerStart = { id: e.pointerId, x: e.clientX, y: e.clientY, onDial: Boolean(e.target.closest('#reel')) };
});
board.addEventListener('pointerup', e => {
  if (pointerStart?.id !== e.pointerId) return;
  const dy = e.clientY - pointerStart.y, dx = Math.abs(e.clientX - pointerStart.x);
  const tapDial = pointerStart.onDial && Math.hypot(dx, dy) <= 24;
  pointerStart = null;
  if (tapDial || dy >= 34) reel();
});
board.addEventListener('pointercancel', () => { pointerStart = null; });
document.addEventListener('keydown', e => {
  if (e.code !== 'Space' || e.repeat || !$('result').hidden || ['SELECT', 'BUTTON'].includes(document.activeElement?.tagName)) return;
  e.preventDefault(); reel();
});
function restart() { state = createBattle($('fish').value, Date.now()); $('result').hidden = true; syncUI(); }
$('retry').addEventListener('click', restart);
$('fish').addEventListener('change', restart);
function syncMute() { $('mute').textContent = muted ? '音 OFF' : '音 ON'; $('mute').setAttribute('aria-pressed', String(muted)); }
$('mute').addEventListener('click', () => { muted = !muted; try { localStorage.setItem('fishing-battle-muted', muted ? '1' : '0'); } catch {} syncMute(); });
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
  const t = now / 1000, rage = state.phase === 'rage';
  const wave = reduced.matches ? 0 : Math.sin(t * (rage ? 8 : 3));
  const fishX = 176 + wave * (rage ? 16 : 5);
  const fishY = 305 + (reduced.matches ? 0 : Math.sin(t * 4) * (rage ? 9 : 3));
  // AINAN's Battle composition keeps the hooked fish, player, water and line in one scene.
  ctx.strokeStyle = rage ? '#ffba69' : '#e8f8ff'; ctx.lineWidth = rage ? 2.3 : 1.5;
  ctx.beginPath(); ctx.moveTo(146, 490); ctx.quadraticCurveTo(160, 400, fishX + 20, fishY + 45); ctx.stroke();
  ctx.strokeStyle = '#e4faff'; ctx.lineWidth = rage ? 5 : 4; ctx.globalAlpha = rage ? .95 : .72;
  ctx.beginPath(); ctx.ellipse(fishX + 60, fishY + 55, rage ? 132 : 118, rage ? 52 : 43, -.1, 0, Math.PI * 2); ctx.stroke();
  ctx.globalAlpha = 1;
  drawImage(`fish_hero_${state.fishId}`, fishX, fishY, 140, 80);
  drawImage('fight-mid', 8, 409, 184, 218);
  if (rage || flash > 0) {
    ctx.strokeStyle = rage ? '#fff1c2' : '#d6f9ff'; ctx.lineWidth = 3;
    for (let i = 0; i < (rage ? 7 : 4); i++) {
      const a = i * Math.PI * 2 / (rage ? 7 : 4);
      const x = fishX + 65 + Math.cos(a) * 116, y = fishY + 48 + Math.sin(a) * 51;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 12, y + Math.sin(a) * 12); ctx.stroke();
    }
  }
  flash = Math.max(0, flash - .016);
  if (last && !document.hidden) {
    stepBattle(state, Math.min((now - last) / 1000, .05));
    if (state.events.length) { feedback(state.events); state.events = []; }
    syncUI();
  }
  last = now;
  requestAnimationFrame(draw);
}
document.addEventListener('visibilitychange', () => { last = 0; });
syncUI(); requestAnimationFrame(draw);
