import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import { createGame, advance, toss, addSeasoning, seasoningReadiness, result, dishAppearance, STAGES } from '../assets/chahan-core.js';
import { motionToss, motionSteer } from '../assets/chahan-motion.js';

test('three locations alter the balance disturbance', () => {
  const snapshots = STAGES.map((_, i) => { const g = createGame(); g.phase = 'playing'; g.stage = i; for(let n=0;n<50;n++) advance(g,{steer:0,heat:0},.05); return g.balance; });
  assert.ok(snapshots[1] > snapshots[0] + .05);
  assert.ok(snapshots[2] < snapshots[0] - .1);
});
test('swipe strength and direction determine a good toss', () => {
  const g = createGame(); g.phase = 'playing'; g.time = 1;
  assert.equal(toss(g, { lift: .7, lean: 0 }), true); assert.ok(g.mix > 0); assert.equal(g.rice, 1);
  assert.equal(g.tossOutcome, 'caught'); assert.equal(g.tossSpill, 0);
  assert.equal(toss(g, { lift: .7, lean: 0 }), null, 'cooldown prevents button mashing');
  g.time += .5; assert.equal(toss(g, { lift: 1.9, lean: 0 }), false); assert.ok(g.rice < 1); assert.equal(g.combo, 0);
  assert.equal(g.tossOutcome, 'spilled'); assert.ok(g.tossSpill > 0);
  g.time += .5; assert.equal(toss(g, { lift: .7, lean: 1 }), false, 'diagonal swipe spills');
  assert.equal(g.tossOutcome, 'spilled');
  const riceAfterSpill = g.rice;
  g.time += .5; assert.equal(toss(g, { lift: .1, lean: 0 }), false, 'weak swipe does not flip rice');
  assert.equal(g.tossOutcome, 'weak'); assert.equal(g.tossSpill, 0);
  assert.equal(g.rice, riceAfterSpill, 'a weak pull leaves rice in the wok');
});

test('airborne rice layer keeps transparent space around edible detail', async () => {
  const { data, info } = await sharp('chahan/art/flight-v3.webp').ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  assert.equal(info.width, 780); assert.equal(info.height, 260);
  let clear = 0, food = 0;
  for (let i = 3; i < data.length; i += 4) { if (data[i] < 12) clear++; if (data[i] > 220) food++; }
  assert.ok(clear > info.width * info.height * .25, 'the sprite must not cover the scene with an opaque box');
  assert.ok(food > info.width * info.height * .15, 'the sprite must contain visible rice');
});
test('seasoning has one chance and scores timing plus mixing', () => {
  const ideal = createGame(); ideal.phase = 'playing'; ideal.cook = .56; ideal.mix = .5;
  assert.equal(addSeasoning(ideal), 1); assert.equal(addSeasoning(ideal), null);
  const early = createGame(); early.phase = 'playing'; early.cook = .12; early.mix = .1;
  assert.ok(addSeasoning(early) < .1);
  assert.ok(result(ideal).score > result(early).score);
  assert.equal(ideal.seasonedAt, 0);
  assert.deepEqual(seasoningReadiness(ideal), { quality: 1, cue: '今が入れどき！', ready: true });
  assert.equal(seasoningReadiness(early).cue, 'まず米と具を混ぜる');
  assert.equal(seasoningReadiness({ ...ideal, seasoned: false, cook: .15 }).cue, 'まだ早い・火を通す');
  assert.equal(seasoningReadiness({ ...ideal, seasoned: false, cook: .9 }).cue, '遅くなる前に入れる');
});

test('selected heat stays lit and can cook a meal during the full route', () => {
  const g = createGame(); g.phase = 'playing';
  for (let i = 0; i < 1080; i++) advance(g, { steer: 0, heat: 0 }, .05);
  assert.equal(g.phase, 'finished');
  assert.equal(g.heat, .48, 'the selected fire must not quietly burn out');
  assert.ok(g.cook > .7 && g.cook < .9, 'default heat should cook the rice by the end');
  const hot = createGame(); hot.phase = 'playing'; hot.heat = 1;
  for (let i = 0; i < 1080; i++) advance(hot, { steer: 0, heat: 0 }, .05);
  assert.ok(hot.cook > 1.35, 'maximum heat can overcook the meal');
  assert.ok(result(g).doneness > result(hot).doneness);
});
test('heat, stirring and rice all contribute to the final meal', () => {
  const good = createGame(); good.mix = 1; good.cook = .86;
  const cold = { ...good, cook: 0 }, spilled = { ...good, rice: .3 }, unmixed = { ...good, mix: 0 };
  assert.ok(result(good).score > result(cold).score);
  assert.ok(result(good).score > result(spilled).score);
  assert.ok(result(good).score > result(unmixed).score);
});
test('ending feedback points to the actual cooking shortfall', () => {
  const good = createGame(); Object.assign(good, { rice: 1, mix: 1, cook: .86, seasoning: 1, seasoned: true });
  assert.match(result(good).comment, /一粒ずつ/);
  assert.match(result({ ...good, rice: .2 }).comment, /米が鍋から/);
  assert.match(result({ ...good, mix: .2 }).comment, /具と米/);
  assert.match(result({ ...good, cook: .15 }).comment, /芯が少し/);
  assert.match(result({ ...good, seasoning: 0 }).comment, /香りが惜しい/);
});
test('the plated dish reflects mixing, seasoning, doneness and remaining rice', () => {
  const good = { ...createGame(), rice: 1, mix: 1, cook: .86, seasoning: 1, seasoned: true };
  const finished = dishAppearance(good);
  assert.equal(finished.portion, 1);
  assert.equal(finished.scatteredIngredients, 0);
  assert.ok(finished.mixedIngredients > 20 && finished.glaze === 1 && finished.steam > .9);
  const unmixed = dishAppearance({ ...good, mix: 0, seasoned: false, seasoning: 0 });
  assert.ok(unmixed.scatteredIngredients > 0 && unmixed.mixedIngredients === 0 && unmixed.glaze === 0);
  assert.equal(unmixed.unmixed, 1);
  const raw = dishAppearance({ ...good, cook: .12 });
  const burnt = dishAppearance({ ...good, cook: 1.5 });
  assert.ok(raw.pale > .7 && raw.steam === 0);
  assert.ok(burnt.char > .8 && burnt.steam < finished.steam);
  assert.ok(dishAppearance({ ...good, rice: .2 }).portion < .5);
});
test('the standalone game has touch and keyboard controls', () => {
  const src = fs.readFileSync('chahan/game.js','utf8');
  for(const token of ['pointerdown','pointermove','pointerup','pointercancel','ArrowLeft','ArrowRight','Space','KeyS','visibilitychange']) assert.ok(src.includes(token),token);
});
test('physical pull toward the player becomes a toss with strength and lateral direction', () => {
  assert.equal(motionToss({ x: 0, y: 0, z: 1 }), null, 'hand tremor is ignored');
  assert.equal(motionToss({ x: 0, y: 0, z: -8 }), null, 'pushing away does not toss');
  assert.equal(motionToss({ x: 6, y: 0, z: 3 }), null, 'sideways shake is ignored');
  assert.deepEqual(motionToss({ x: 0, y: 0, z: 5.6 }), { lift: .7, lean: 0 });
  assert.ok(motionToss({ x: 3, y: 0, z: 6 }).lean > 0);
  assert.ok(motionToss({ x: 0, y: 0, z: 18 }).lift > 1.25, 'hard pull risks a spill');
  assert.equal(motionToss({ x: null, y: 0, z: 8 }), null);
});
test('tilt steering is calibrated and bounded', () => {
  assert.equal(motionSteer(12, 12), 0);
  assert.equal(motionSteer(22, 12), .4);
  assert.equal(motionSteer(80, 12), 1);
  assert.equal(motionSteer(null, 12), 0);
});
