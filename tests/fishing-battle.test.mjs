import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, stepBattle, reelBattle } from '../fishing-battle/core.js';

function advance(state, seconds) { for (let i = 0; i < seconds * 20; i++) stepBattle(state, .05); }

test('warning precedes rage and waiting reaches opening', () => {
  const state = createBattle('aji', 7);
  advance(state, 2.3); assert.equal(state.phase, 'warning');
  advance(state, .9); assert.equal(state.phase, 'rage');
  advance(state, 2.5); assert.equal(state.phase, 'opening');
});

test('rage reel is dangerous; first opening reel earns a one-time bonus', () => {
  const state = createBattle('aji', 7);
  advance(state, 3.2);
  const before = state.escape; assert.equal(reelBattle(state), true);
  assert.ok(state.escape >= before + 17);
  advance(state, 2.5);
  const reel = state.reel; assert.equal(reelBattle(state), true);
  assert.ok(Math.abs(state.reel - reel - 11) < 1e-6);
  advance(state, .25);
  const next = state.reel; reelBattle(state);
  assert.ok(Math.abs(state.reel - next - 6) < 1e-6);
});

test('cooldown rejects a second input and outcomes are final', () => {
  const state = createBattle();
  assert.equal(reelBattle(state), true); assert.equal(reelBattle(state), false);
  state.escape = 99; state.reel = 99; state.phase = 'rage';
  advance(state, .25); reelBattle(state);
  assert.equal(state.outcome, 'escaped');
  assert.equal(reelBattle(state), false);
  const snapshot = { ...state }; stepBattle(state, 1);
  assert.equal(state.escape, snapshot.escape);
});

test('same seed and input sequence yield same battle', () => {
  const play = () => { const s = createBattle('tai', 51); for (let i = 0; i < 300 && !s.outcome; i++) { stepBattle(s, .05); if (i % 8 === 0 && s.phase !== 'rage') reelBattle(s); } return { phase: s.phase, reel: s.reel, escape: s.escape, outcome: s.outcome }; };
  assert.deepEqual(play(), play());
});
