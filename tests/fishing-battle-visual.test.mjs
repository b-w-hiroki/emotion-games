import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle } from '../fishing-battle/core.js';
import { battleCamera, battlePose, interactionFeedback, outcomePose, timingWindow } from '../fishing-battle/visual.js';

test('warning fills and the real opening window drains on the battle clock', () => {
  const state = createBattle('aji');
  state.phaseUntil = 2;
  state.time = 1.35;
  assert.ok(timingWindow(state, 'warning').fraction < .001);
  state.time = 1.675;
  assert.ok(Math.abs(timingWindow(state, 'warning').fraction - .5) < .001);
  state.openingUntil = 3.5;
  state.time = 2;
  assert.equal(timingWindow(state, 'opening').fraction, 1);
  state.time = 3.125;
  assert.equal(timingWindow(state, 'opening').fraction, .25);
  state.outcome = 'caught';
  assert.equal(timingWindow(state, 'opening'), null);
});

test('the held input shares one tension curve across line, control and sound', () => {
  const state = createBattle('aji');
  const idle = interactionFeedback(state, 0);
  const light = interactionFeedback(state, 35);
  const strong = interactionFeedback(state, 90);
  assert.equal(idle.tension, 0);
  assert.ok(light.tension > idle.tension && strong.tension > light.tension);
  assert.ok(strong.pitch > light.pitch);
  assert.ok(battlePose(state, 'calm', 0, { pull: 90 }).ringWidth > battlePose(state, 'calm', 0).ringWidth);
  const compactPose = battlePose(state, 'calm', 0, { pull: 110, tension: strong.tension });
  assert.equal(compactPose.tension, strong.tension);
  state.phase = 'rage';
  const dangerous = interactionFeedback(state, 90);
  assert.ok(dangerous.tension > strong.tension && dangerous.pitch < strong.pitch);
  state.phase = 'calm'; state.escape = 90;
  assert.ok(interactionFeedback(state, 90).tension > strong.tension);
});

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

test('camera follows held input, fish run and opposite outcomes while reduced motion stays still', () => {
  const state = createBattle('aji');
  const pose = battlePose(state, 'calm', 0);
  const idle = battleCamera(state, 'calm', pose);
  const held = battleCamera(state, 'calm', pose, { pull: 110 });
  const running = battleCamera(state, 'rage', pose);
  assert.ok(held.y > idle.y && held.zoom > idle.zoom);
  assert.ok(running.x < idle.x && running.y > idle.y);
  state.outcome = 'caught';
  const caught = battleCamera(state, 'calm', pose, { outcomeProgress: 1 });
  assert.ok(caught.y < idle.y && caught.zoom > 1);
  state.outcome = 'escaped';
  const escaped = battleCamera(state, 'calm', pose, { outcomeProgress: 1 });
  assert.ok(escaped.x < caught.x && escaped.zoom < 1);
  assert.deepEqual(battleCamera(state, 'calm', pose, { outcomeProgress: 1, reduced: true }), { x: 0, y: 0, zoom: 1 });
});
