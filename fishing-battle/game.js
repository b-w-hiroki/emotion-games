import { FISH, createBattle, stepBattle, reelBattle } from './core.js';

const $ = id => document.getElementById(id);
const canvas = $('sea'), ctx = canvas.getContext('2d');
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
let state = createBattle(), last = 0, flash = 0, muted = false, audio;

function tone(frequency, duration, type = 'sine', gain = 0.05) {
  if (muted) return;
  try {
    audio ??= new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === 'suspended') audio.resume();
    const osc = audio.createOscillator(), volume = audio.createGain();
    osc.type = type; osc.frequency.setValueAtTime(frequency, audio.currentTime);
    volume.gain.setValueAtTime(gain, audio.currentTime);
    volume.gain.exponentialRampToValueAtTime(0.001, audio.currentTime + duration);
    osc.connect(volume).connect(audio.destination); osc.start(); osc.stop(audio.currentTime + duration);
  } catch {}
}

function eventFeedback(events) {
  for (const event of events) {
    if (event === 'rage') tone(145, .35, 'sawtooth', .045);
    if (event === 'opening') tone(530, .22);
    if (event === 'goodReel' || event === 'goodOpening') tone(event === 'goodOpening' ? 620 : 440, .11);
    if (event === 'badReel') tone(105, .22, 'sawtooth', .06);
    if (event === 'caught') { tone(660, .65); setTimeout(() => tone(880, .5), 100); }
    if (event === 'escaped') tone(105, .55, 'triangle');
    if (['goodReel', 'goodOpening', 'badReel'].includes(event)) flash = 0.35;
  }
}

function syncUI() {
  const fish = FISH[state.fishId];
  if ($('fishName').textContent !== fish.name) $('fishName').textContent = fish.name;
  $('dangerFill').style.width = `${state.escape}%`;
  $('progressFill').style.width = `${state.reel}%`;
  const words = {
    calm: ['魚が落ち着いた', '巻いて引き寄せよう'],
    warning: ['走り出しそう！', '指を止める準備'],
    rage: ['魚が暴れている！', '今は待とう。巻くと逃げる'],
    opening: ['いまが巻きどき！', '最初の一巻きが効く'],
  };
  if ($('cue').textContent !== words[state.phase][0]) $('cue').textContent = words[state.phase][0];
  $('cue').className = `cue ${state.phase}`;
  if ($('hint').textContent !== words[state.phase][1]) $('hint').textContent = words[state.phase][1];
  $('reel').disabled = Boolean(state.outcome);
  if (state.outcome) {
    const newlyEnded = $('result').hidden;
    $('result').hidden = false;
    $('resultTitle').textContent = state.outcome === 'caught' ? `${fish.name}を釣り上げた！` : `${fish.name}が逃げた`;
    $('resultText').textContent = state.outcome === 'caught' ? '魚の動きを読んで、引き寄せた。' : '糸の危険が限界に達した。暴れる時は待ってみよう。';
    if (newlyEnded) $('retry').focus();
  }
}

function reel() {
  if (reelBattle(state)) { eventFeedback(state.events); state.events = []; syncUI(); }
}

let pointerStart = null;
$('reel').addEventListener('pointerdown', e => { pointerStart = { id: e.pointerId, y: e.clientY }; $('reel').setPointerCapture(e.pointerId); });
$('reel').addEventListener('pointerup', e => {
  if (pointerStart?.id !== e.pointerId) return;
  const valid = e.clientY - pointerStart.y > -20;
  pointerStart = null;
  if (valid) reel();
});
$('reel').addEventListener('pointercancel', () => { pointerStart = null; });
document.addEventListener('keydown', e => { if (e.code === 'Space' && !e.repeat && $('result').hidden && !['SELECT', 'BUTTON'].includes(document.activeElement?.tagName)) { e.preventDefault(); reel(); } });
$('retry').addEventListener('click', () => { state = createBattle($('fish').value, Date.now()); $('result').hidden = true; syncUI(); });
$('fish').addEventListener('change', () => { state = createBattle($('fish').value, Date.now()); $('result').hidden = true; syncUI(); });
$('mute').addEventListener('click', () => { muted = !muted; $('mute').textContent = muted ? '音 OFF' : '音 ON'; $('mute').setAttribute('aria-pressed', String(muted)); });

function draw(timestamp) {
  const rect = canvas.getBoundingClientRect(), dpr = Math.min(devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(rect.width * dpr) || canvas.height !== Math.round(rect.height * dpr)) {
    canvas.width = Math.round(rect.width * dpr); canvas.height = Math.round(rect.height * dpr);
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const w = rect.width, h = rect.height, t = timestamp / 1000;
  ctx.clearRect(0, 0, w, h);
  const horizon = h * .38;
  const sky = ctx.createLinearGradient(0, 0, 0, horizon);
  sky.addColorStop(0, '#8ab7bc'); sky.addColorStop(1, '#b2c7bb');
  ctx.fillStyle = sky; ctx.fillRect(0, 0, w, horizon);
  ctx.fillStyle = '#5b8391'; ctx.beginPath(); ctx.moveTo(0, horizon);
  for (let x = 0; x <= w; x += 12) ctx.lineTo(x, horizon - 25 - Math.sin(x * .02) * 12);
  ctx.lineTo(w, horizon); ctx.fill();
  const sea = ctx.createLinearGradient(0, horizon, 0, h); sea.addColorStop(0, '#427b8c'); sea.addColorStop(1, '#103a55');
  ctx.fillStyle = sea; ctx.fillRect(0, horizon, w, h);
  for (let i = 0; i < 25; i++) {
    const x = (i * 71 + (reduced.matches ? 0 : t * (i % 3 + 1) * 5)) % (w + 100) - 50;
    const y = horizon + 18 + (i * 53) % (h - horizon - 50);
    ctx.strokeStyle = `rgba(190,232,220,${.09 + i % 4 * .035})`; ctx.lineWidth = 1 + (i % 3);
    ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(x + 15, y - 3, x + 33, y); ctx.stroke();
  }
  const fish = FISH[state.fishId];
  const rage = state.phase === 'rage', warn = state.phase === 'warning';
  const cx = w * .59 + (reduced.matches ? 0 : Math.sin(t * (rage ? 8 : 2.6)) * (rage ? 30 : 9));
  const cy = h * .52 + (reduced.matches ? 0 : Math.sin(t * (rage ? 6 : 2)) * (rage ? 15 : 5));
  // Angler, rod, line and fish remain in one scene throughout the battle.
  ctx.lineCap = 'round'; ctx.strokeStyle = '#182b33'; ctx.lineWidth = 17;
  ctx.beginPath(); ctx.moveTo(w * .12, h * .72); ctx.lineTo(w * .16, h * .57); ctx.stroke();
  ctx.fillStyle = '#d5ad84'; ctx.beginPath(); ctx.arc(w * .16, h * .54, 16, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#a17850'; ctx.lineWidth = 5; ctx.beginPath(); ctx.moveTo(w * .16, h * .61); ctx.quadraticCurveTo(w * .25, h * .36, w * .36, h * .23); ctx.stroke();
  ctx.strokeStyle = rage ? '#ffd6a1' : '#d4e4da'; ctx.lineWidth = rage ? 2.5 : 1.4;
  ctx.beginPath(); ctx.moveTo(w * .36, h * .23); ctx.quadraticCurveTo(w * .49, h * .42, cx, cy); ctx.stroke();
  ctx.fillStyle = '#21475b'; ctx.beginPath(); ctx.ellipse(cx, cy + 26, 74, 17, 0, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = fish.color; ctx.beginPath(); ctx.ellipse(cx, cy, 63, 30, -.13, 0, Math.PI * 2); ctx.fill();
  ctx.beginPath(); ctx.moveTo(cx + 52, cy); ctx.lineTo(cx + 94, cy - 29); ctx.lineTo(cx + 89, cy + 23); ctx.closePath(); ctx.fill();
  ctx.fillStyle = '#e4ecdb'; ctx.beginPath(); ctx.ellipse(cx - 8, cy + 15, 38, 10, -.1, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#182d38'; ctx.beginPath(); ctx.arc(cx - 38, cy - 8, 3.5, 0, Math.PI * 2); ctx.fill();
  if (rage || warn || flash > 0) {
    ctx.strokeStyle = rage ? '#ffc489' : '#d8f4e9'; ctx.lineWidth = 3;
    for (let i = 0; i < (rage ? 8 : 4); i++) {
      const a = i * Math.PI * 2 / (rage ? 8 : 4) + .2;
      const x = cx + Math.cos(a) * 90, y = cy + Math.sin(a) * 53;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + Math.cos(a) * 14, y + Math.sin(a) * 10); ctx.stroke();
    }
  }
  if (flash > 0) flash = Math.max(0, flash - .016);
  if (last && !document.hidden) {
    const dt = Math.min((timestamp - last) / 1000, .05);
    stepBattle(state, dt); if (state.events.length) { eventFeedback(state.events); state.events = []; }
    syncUI();
  }
  last = timestamp;
  requestAnimationFrame(draw);
}
document.addEventListener('visibilitychange', () => { last = 0; });
syncUI(); requestAnimationFrame(draw);
