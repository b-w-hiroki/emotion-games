import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createGame, advance, toss, addSeasoning, result, STAGES } from '../assets/chahan-core.js';
import { motionToss, motionSteer } from '../assets/chahan-motion.js';

test('three locations alter the balance disturbance', () => {
  const snapshots = STAGES.map((_, i) => { const g = createGame(); g.phase = 'playing'; g.stage = i; for(let n=0;n<50;n++) advance(g,{steer:0,heat:0},.05); return g.balance; });
  assert.ok(snapshots[1] > snapshots[0] + .05);
  assert.ok(snapshots[2] < snapshots[0] - .1);
});
test('swipe strength and direction determine a good toss', () => {
  const g = createGame(); g.phase = 'playing'; g.time = 1;
  assert.equal(toss(g, { lift: .7, lean: 0 }), true); assert.ok(g.mix > 0); assert.equal(g.rice, 1);
  assert.equal(toss(g, { lift: .7, lean: 0 }), null, 'cooldown prevents button mashing');
  g.time += .5; assert.equal(toss(g, { lift: 1.9, lean: 0 }), false); assert.ok(g.rice < 1); assert.equal(g.combo, 0);
  g.time += .5; assert.equal(toss(g, { lift: .7, lean: 1 }), false, 'diagonal swipe spills');
  g.time += .5; assert.equal(toss(g, { lift: .1, lean: 0 }), false, 'weak swipe does not flip rice');
});
test('seasoning has one chance and scores timing plus mixing', () => {
  const ideal = createGame(); ideal.phase = 'playing'; ideal.cook = .56; ideal.mix = .5;
  assert.equal(addSeasoning(ideal), 1); assert.equal(addSeasoning(ideal), null);
  const early = createGame(); early.phase = 'playing'; early.cook = .12; early.mix = .1;
  assert.ok(addSeasoning(early) < .1);
  assert.ok(result(ideal).score > result(early).score);
});
test('heat, stirring and rice all contribute to the final meal', () => {
  const good = createGame(); good.mix = 1; good.cook = .86;
  const cold = { ...good, cook: 0 }, spilled = { ...good, rice: .3 }, unmixed = { ...good, mix: 0 };
  assert.ok(result(good).score > result(cold).score);
  assert.ok(result(good).score > result(spilled).score);
  assert.ok(result(good).score > result(unmixed).score);
});
test('the standalone game has touch and keyboard controls', () => {
  const src = fs.readFileSync('chahan/game.js','utf8');
  for(const token of ['pointerdown','pointermove','pointerup','pointercancel','ArrowLeft','ArrowRight','Space','KeyS','visibilitychange']) assert.ok(src.includes(token),token);
});
test('physical vertical impulse becomes a toss with strength and lateral direction', () => {
  assert.equal(motionToss({ x: 0, y: 1, z: 0 }), null, 'hand tremor is ignored');
  assert.equal(motionToss({ x: 6, y: 3, z: 0 }), null, 'sideways shake is ignored');
  assert.deepEqual(motionToss({ x: 0, y: 5.6, z: 0 }), { lift: .7, lean: 0 });
  assert.ok(motionToss({ x: 3, y: 6, z: 0 }).lean > 0);
  assert.ok(motionToss({ x: 0, y: 18, z: 0 }).lift > 1.25, 'hard shake risks a spill');
  assert.equal(motionToss({ x: null, y: 8, z: 0 }), null);
});
test('tilt steering is calibrated and bounded', () => {
  assert.equal(motionSteer(12, 12), 0);
  assert.equal(motionSteer(22, 12), .4);
  assert.equal(motionSteer(80, 12), 1);
  assert.equal(motionSteer(null, 12), 0);
});
