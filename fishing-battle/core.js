export const FISH = {
  aji: { name: 'アジ', color: '#a9d9dc', strength: 0.85, rhythm: 3.6 },
  tai: { name: 'マダイ', color: '#f4a790', strength: 1.2, rhythm: 4.4 },
  buri: { name: 'ブリ', color: '#9cc9e0', strength: 1.55, rhythm: 5.1 },
};

const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
const random01 = seed => {
  const next = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
  return [next, next / 4294967296];
};

export function createBattle(fishId = 'aji', seed = 1) {
  if (!FISH[fishId]) throw new Error(`Unknown fish: ${fishId}`);
  return {
    fishId, seed: seed >>> 0, time: 0, phase: 'calm', phaseUntil: 2.25,
    reel: 35, escape: 14 * FISH[fishId].strength,
    openingUsed: false, lastInputAt: -1, outcome: null, events: [],
  };
}

function nextDuration(state, min, spread) {
  const [seed, value] = random01(state.seed);
  state.seed = seed;
  return min + value * spread;
}

export function stepBattle(state, dt) {
  if (state.outcome || !Number.isFinite(dt) || dt <= 0) return state;
  state.events = [];
  let remaining = Math.min(dt, 0.1);
  const fish = FISH[state.fishId];
  while (remaining > 0 && !state.outcome) {
    const slice = Math.min(remaining, Math.max(0.00001, state.phaseUntil - state.time));
    state.time += slice;
    remaining -= slice;
    if (state.phase === 'rage') {
      state.escape = clamp(state.escape + slice * (8 + fish.strength * 8), 0, 100);
      state.reel = clamp(state.reel - slice * 1.8, 0, 100);
    } else {
      state.escape = clamp(state.escape - slice * 1.3, 0, 100);
    }
    if (state.escape >= 100) { state.outcome = 'escaped'; state.events.push('escaped'); break; }
    if (state.time + 0.000001 < state.phaseUntil) continue;
    if (state.phase === 'calm') {
      state.phase = 'warning'; state.phaseUntil = state.time + 0.85;
    } else if (state.phase === 'warning') {
      state.phase = 'rage'; state.phaseUntil = state.time + nextDuration(state, 1.55, fish.strength * 0.7);
    } else if (state.phase === 'rage') {
      state.phase = 'opening'; state.phaseUntil = state.time + 1.15; state.openingUsed = false;
    } else {
      state.phase = 'calm'; state.phaseUntil = state.time + nextDuration(state, fish.rhythm - 0.8, 0.7);
    }
    state.events.push(state.phase);
  }
  return state;
}

export function reelBattle(state) {
  state.events = [];
  if (state.outcome || state.time - state.lastInputAt < 0.22) return false;
  state.lastInputAt = state.time;
  if (state.phase === 'rage') {
    state.escape = clamp(state.escape + 18, 0, 100);
    state.events.push('badReel');
  } else {
    const bonus = state.phase === 'opening' && !state.openingUsed ? 5 : 0;
    state.reel = clamp(state.reel + 6 + bonus, 0, 100);
    state.escape = clamp(state.escape - 2, 0, 100);
    if (bonus) state.openingUsed = true;
    state.events.push(bonus ? 'goodOpening' : 'goodReel');
  }
  if (state.escape >= 100) { state.outcome = 'escaped'; state.events.push('escaped'); }
  else if (state.reel >= 100) { state.outcome = 'caught'; state.events.push('caught'); }
  return true;
}
