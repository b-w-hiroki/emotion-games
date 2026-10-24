import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle } from '../fishing-battle/core.js';
import { battlePose, outcomePose } from '../fishing-battle/visual.js';

test('pull preview and accepted reel recoil move the hooked fish toward the player', () => {
  const state = createBattle('aji');
  const still = battlePose(state, 'calm', 0);
  const pulling = battlePose(state, 'calm', 0, { pull: 80 });
  const good = battlePose(state, 'calm', 0, { impact: 'goodReel', flash: .35 });
  const bad = battlePose(state, 'calm', 0, { impact: 'badReel', flash: .35 });
  assert.ok(pulling.fishX < still.fishX && pulling.fishY > still.fishY);
  assert.ok(good.fishX < still.fishX && bad.fishX > still.fishX);
});

test('the same fish communicates warning, struggle and opening through the line and water', () => {
  const state = createBattle('aji');
  const calm = battlePose(state, 'calm', 0);
  const warning = battlePose(state, 'warning', 0);
  const rage = battlePose(state, 'rage', 0);
  const opening = battlePose(state, 'opening', 0);
  assert.ok(warning.lineControlY < calm.lineControlY);
  assert.ok(rage.ringWidth > calm.ringWidth);
  assert.ok(opening.lineControlY > calm.lineControlY && opening.ringWidth < calm.ringWidth);
  assert.ok(battlePose(createBattle('kue'), 'rage', 0).run > rage.run);
});

test('reduced motion retains state shapes without oscillation or recoil', () => {
  const state = createBattle('tai');
  const first = battlePose(state, 'warning', 0, { reduced: true, impact: 'badReel', flash: .35 });
  const later = battlePose(state, 'warning', 20, { reduced: true, impact: 'badReel', flash: .35 });
  assert.deepEqual(first, later);
  assert.equal(first.angle, 0);
  assert.ok(first.lineControlY < battlePose(state, 'calm', 0, { reduced: true }).lineControlY);
});

test('catch and escape carry the fish in opposite directions before the result', () => {
  const pose = battlePose(createBattle('aji'), 'calm', 0);
  const caught = outcomePose(pose, 'caught', .5);
  const escaped = outcomePose(pose, 'escaped', .5);
  assert.ok(caught.fishX < pose.fishX && caught.fishY < 410 && caught.scale > 1);
  assert.ok(escaped.fishX > pose.fishX && escaped.alpha < 1);
  assert.equal(outcomePose(pose, 'caught', 1).alpha, 1);
  assert.equal(outcomePose(pose, 'escaped', 1).alpha, 0);
  assert.deepEqual(outcomePose(pose, null, .5), { fishX: pose.fishX, fishY: pose.fishY, angle: pose.angle, scale: 1, alpha: 1 });
});
