// Battle-only values mirror AINAN's fish.js and battle.js (local main, 2026-10-24).
// Keep the clock and random source explicit so the same fight can be replayed in tests.
export const FISH = Object.freeze({
  aji:      { name: 'アジ', strength: .8, speed: 1, interval: [3, 6], duration: [1.5, 3], opening: 1.5 },
  tai:      { name: 'マダイ', strength: 1.3, speed: 1.3, interval: [2.5, 5], duration: [2, 3.5], opening: 1.25 },
  bass:     { name: 'ブラックバス', strength: 2, speed: 1.8, interval: [2, 5], duration: [2, 4], opening: 1.05 },
  buri:     { name: 'ブリ', strength: 1.4, speed: 1.5, interval: [1.8, 4], duration: [1.8, 3.5], opening: .95 },
  saba:     { name: 'サバ', strength: 1, speed: 1.2, interval: [2.6, 5.2], duration: [1.4, 2.6], opening: 1.15 },
  isaki:    { name: 'イサキ', strength: 1.35, speed: 1.25, interval: [2.4, 4.8], duration: [1.8, 3.2], opening: 1.3 },
  hirame:   { name: 'ヒラメ', strength: 1.9, speed: 1.45, interval: [2.3, 4.7], duration: [2.2, 3.9], opening: 1.6 },
  kanpachi: { name: 'カンパチ', strength: 2.2, speed: 2, interval: [1.6, 3.6], duration: [1.9, 3.6], opening: .85 },
  kue:      { name: 'クエ', strength: 3, speed: 2.5, interval: [1.2, 3], duration: [2.5, 5], opening: .85 },
});

const TICK = .2;
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const random01 = state => {
  state.seed = (Math.imul(state.seed, 1664525) + 1013904223) >>> 0;
  return state.seed / 4294967296;
};
const range = (state, [min, max]) => min + random01(state) * (max - min);

export function createBattle(fishId = 'aji', seed = 1, pullPower = 1) {
  const fish = FISH[fishId];
  if (!fish) throw new Error(`Unknown fish: ${fishId}`);
  const state = {
    fishId, seed: seed >>> 0, time: 0, accumulator: 0,
    phase: 'calm', phaseUntil: 0, openingUntil: 0, openingUsed: true,
    reel: 48, escape: Math.min(30, 18 * fish.strength / pullPower),
    lastInputAt: -Infinity, outcome: null, events: [],
  };
  state.phaseUntil = Math.min(1.8, range(state, fish.interval)); // AINAN's first-rage tutorial cap.
  return state;
}

function transition(state, fish) {
  if (state.phase === 'rage') {
    state.phase = 'calm';
    state.phaseUntil = state.time + range(state, fish.interval);
    state.openingUntil = state.time + fish.opening;
    state.openingUsed = false;
    state.events.push('opening');
  } else {
    state.phase = 'rage';
    state.phaseUntil = state.time + range(state, fish.duration);
    state.openingUntil = 0;
    state.openingUsed = true;
    state.events.push('rage');
  }
}

export function stepBattle(state, dt) {
  state.events = [];
  if (state.outcome || !Number.isFinite(dt) || dt <= 0) return state;
  const fish = FISH[state.fishId];
  // Freeze large background gaps. Normal frames accumulate to AINAN's 200 ms tick.
  const elapsed = Math.min(dt, .1);
  state.time += elapsed;
  state.accumulator += elapsed;
  if (state.time >= state.phaseUntil) transition(state, fish);
  while (state.accumulator + 1e-9 >= TICK && !state.outcome) {
    state.accumulator -= TICK;
    if (state.phase === 'rage') {
      state.escape = clamp(state.escape + fish.speed * fish.strength * (1.5 + random01(state) * 2), 0, 100);
      state.reel = clamp(state.reel - .5, 0, 100);
    } else {
      state.escape = clamp(state.escape - .5, 0, 100);
    }
    if (state.escape >= 100) { state.outcome = 'escaped'; state.events.push('escaped'); }
  }
  return state;
}

export function reelBattle(state) {
  state.events = [];
  if (state.outcome || state.time - state.lastInputAt < .22) return false;
  state.lastInputAt = state.time;
  if (state.phase === 'rage') {
    state.escape = clamp(state.escape + 20, 0, 100);
    state.events.push('badReel');
  } else {
    const opening = state.time < state.openingUntil && !state.openingUsed;
    state.reel = clamp(state.reel + 5 + (opening ? 3 : 0), 0, 100);
    state.escape = clamp(state.escape - 1.5, 0, 100);
    if (opening) state.openingUsed = true;
    state.events.push(opening ? 'goodOpening' : 'goodReel');
  }
  if (state.escape >= 100) { state.outcome = 'escaped'; state.events.push('escaped'); }
  else if (state.reel >= 100) { state.outcome = 'caught'; state.events.push('caught'); }
  return true;
}

export function battleCue(state) {
  if (state.phase === 'rage') return 'rage';
  if (state.time < state.openingUntil && !state.openingUsed) return 'opening';
  return 'calm';
}
