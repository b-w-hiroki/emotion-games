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
  advance(state, 1.85); assert.equal(battleCue(state), 'rage');
  advance(state, 3.1); assert.equal(battleCue(state), 'opening');
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
