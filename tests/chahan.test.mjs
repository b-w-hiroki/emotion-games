import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createGame, advance, toss, result, STAGES } from '../assets/chahan-core.js';

test('three locations alter the balance disturbance', () => {
  const snapshots = STAGES.map((_, i) => { const g = createGame(); g.phase = 'playing'; g.stage = i; for(let n=0;n<50;n++) advance(g,{steer:0,heat:0},.05); return g.balance; });
  assert.ok(snapshots[1] > snapshots[0] + .05);
  assert.ok(snapshots[2] < snapshots[0] - .1);
});
test('a centred toss rewards timing and a tilted toss loses rice', () => {
  const g = createGame(); g.phase = 'playing'; g.time = 1;
  assert.equal(toss(g), true); assert.ok(g.mix > 0); assert.equal(g.rice, 1);
  assert.equal(toss(g), false, 'cooldown prevents button mashing');
  g.time += .5; g.balance = 1; assert.equal(toss(g), false); assert.ok(g.rice < 1); assert.equal(g.combo, 0);
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
  for(const token of ['pointerdown','pointercancel','ArrowLeft','ArrowRight','Space','ArrowUp','visibilitychange']) assert.ok(src.includes(token),token);
});
