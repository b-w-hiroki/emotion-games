import test from 'node:test';
import assert from 'node:assert/strict';
import { FISH, battleCue, createBattle, reelBattle, stepBattle } from '../fishing-battle/core.js';

function advance(state, seconds) { for (let i = 0; i < Math.round(seconds * 20); i++) stepBattle(state, .05); }

test('all nine AINAN fish have Battle profiles and AINAN opening values', () => {
  assert.equal(Object.keys(FISH).length, 9);
  const aji = createBattle('aji', 7);
  assert.equal(aji.reel, 48);
  assert.equal(aji.escape, 14.4);
  assert.equal(aji.phaseUntil, 1.8);
});

test('first rage starts within 1.8 seconds and waiting yields an opening', () => {
  const state = createBattle('aji', 7);
  advance(state, 1.1); assert.equal(battleCue(state), 'calm');
  advance(state, .1); assert.equal(battleCue(state), 'warning');
  advance(state, 1.85); assert.equal(battleCue(state), 'rage');
  advance(state, 3.1); assert.equal(battleCue(state), 'opening');
});

test('warning changes guidance only; AINAN reel and escape values stay intact', () => {
  const state = createBattle('aji', 7);
  advance(state, 1.2);
  assert.equal(battleCue(state), 'warning');
  const reel = state.reel, escape = state.escape;
  assert.equal(reelBattle(state), true);
  assert.equal(state.reel - reel, 5);
  assert.equal(state.escape, Math.max(0, escape - 1.5));
});

test('AINAN swipe values: 5 reel calm, 20 escape raging, 3 opening bonus once', () => {
  const state = createBattle('aji', 7);
  reelBattle(state); assert.equal(state.reel, 53);
  advance(state, 1.85);
  const escape = state.escape; reelBattle(state);
  assert.ok(Math.abs(state.escape - escape - 20) < 1e-6);
  advance(state, 3.1);
  assert.equal(battleCue(state), 'opening');
  const before = state.reel; reelBattle(state);
  assert.ok(Math.abs(state.reel - before - 8) < 1e-6);
  advance(state, .25);
  const next = state.reel; reelBattle(state);
  assert.ok(Math.abs(state.reel - next - 5) < 1e-6);
});

test('220ms cooldown and escaped-first terminal result', () => {
  const state = createBattle();
  assert.equal(reelBattle(state), true); assert.equal(reelBattle(state), false);
  state.escape = 99; state.reel = 100; state.phase = 'rage';
  advance(state, .25); reelBattle(state);
  assert.equal(state.outcome, 'escaped');
  assert.equal(reelBattle(state), false);
});

test('same seed and input schedule reproduce the same fight', () => {
  const play = () => { const s = createBattle('tai', 51); for (let i = 0; i < 300 && !s.outcome; i++) { stepBattle(s, .05); if (i % 8 === 0 && battleCue(s) !== 'rage') reelBattle(s); } return { phase: s.phase, reel: s.reel, escape: s.escape, outcome: s.outcome }; };
  assert.deepEqual(play(), play());
});

function playPatiently(fishId, seed, interval = .3) {
  const state = createBattle(fishId, seed);
  for (let frame = 0; frame < 2400 && !state.outcome; frame++) {
    stepBattle(state, .05);
    if (battleCue(state) !== 'rage' && state.time - state.lastInputAt >= interval) reelBattle(state);
  }
  return state;
}

test('every selectable fish reaches a first opening with the fixed starter rod', () => {
  for (const fishId of Object.keys(FISH)) {
    for (let seed = 1; seed <= 100; seed++) {
      const state = createBattle(fishId, seed);
      let sawRun = false;
      for (let frame = 0; frame < 300 && !state.outcome; frame++) {
        stepBattle(state, .05);
        sawRun ||= state.phase === 'rage';
        if (sawRun && battleCue(state) === 'opening') break;
      }
      assert.equal(battleCue(state), 'opening', `${fishId} seed ${seed} escaped before its first opening`);
    }
  }
});

test('patient reeling can catch every fish while the strongest still rewards timing', () => {
  for (const fishId of Object.keys(FISH)) {
    let catches = 0;
    for (let seed = 1; seed <= 100; seed++) catches += playPatiently(fishId, seed).outcome === 'caught';
    assert.ok(catches >= 50, `${fishId}: only ${catches}/100 patient catches`);
  }
  let fast = 0, slow = 0;
  for (let seed = 1; seed <= 100; seed++) {
    fast += playPatiently('kue', seed, .3).outcome === 'caught';
    slow += playPatiently('kue', seed, .7).outcome === 'caught';
  }
  assert.ok(fast > slow, `quicker safe reels should help against kue (${fast} vs ${slow})`);
  const mistake = createBattle('kue', 1);
  while (mistake.phase !== 'rage') stepBattle(mistake, .05);
  const escape = mistake.escape;
  reelBattle(mistake);
  assert.ok(mistake.escape >= escape + 20, 'reeling during a run still strains the line');
});
