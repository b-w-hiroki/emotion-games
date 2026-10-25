import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import sharp from 'sharp';
import { createGame, advance, toss, addIngredient, ingredientCue, eggReadiness, fillingReadiness, addSeasoning, seasoningReadiness, result, dishAppearance, STAGES } from '../assets/chahan-core.js';
import { motionToss, motionSteer } from '../assets/chahan-motion.js';

test('three locations alter the balance disturbance', () => {
  const snapshots = STAGES.map((_, i) => { const g = createGame(); g.phase = 'playing'; g.stage = i; for(let n=0;n<50;n++) advance(g,{steer:0,heat:0},.05); return g.balance; });
  assert.ok(snapshots[1] > snapshots[0] + .05);
  assert.ok(snapshots[2] < snapshots[0] - .1);
});
test('swipe strength and direction determine a good toss', () => {
  const g = createGame(); g.phase = 'playing'; addIngredient(g, 'egg'); addIngredient(g, 'rice'); g.time = 1;
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

test('the wok begins empty and ingredient order changes preparation quality', () => {
  const g = createGame(); g.phase = 'playing';
  assert.equal(g.rice, 0); assert.deepEqual(g.ingredients, { egg: false, rice: false, veg: false });
  assert.equal(toss(g, { lift: .7, lean: 0 }), null, 'an empty wok cannot toss rice');
  assert.match(ingredientCue(g), /卵/);
  assert.equal(addIngredient(g, 'egg'), true); assert.equal(addIngredient(g, 'egg'), false);
  assert.equal(g.rice, 0, 'egg does not magically create fried rice');
  g.time = 3; assert.equal(addIngredient(g, 'rice'), true); assert.equal(g.rice, 1);
  assert.match(ingredientCue(g), /具材/);
  assert.equal(addSeasoning(g), null, 'seasoning waits for ingredients');
  g.mix = .2; assert.equal(addIngredient(g, 'veg'), true); assert.equal(addIngredient(g, 'veg'), false);
  const goodPrep = g.prep;
  const backwards = createGame(); backwards.phase = 'playing';
  addIngredient(backwards, 'veg'); addIngredient(backwards, 'rice'); addIngredient(backwards, 'egg');
  assert.ok(goodPrep > backwards.prep + .4, 'order and egg timing affect the result');
  for (let i = 0; i < 1080; i++) advance(backwards, { steer: 0, heat: 0 }, .05);
  assert.equal(backwards.phase, 'finished', 'an incomplete recipe still reaches a result');
});

test('egg readiness follows actual heat and freezes when rice is added', () => {
  const makeEgg = heat => {
    const g = createGame(); g.phase = 'playing'; g.heat = heat; addIngredient(g, 'egg');
    for (let i = 0; i < 60; i++) advance(g, { steer: 0, heat: 0 }, .05);
    return g;
  };
  const cold = makeEgg(0), ready = makeEgg(.48), burnt = makeEgg(1);
  assert.equal(cold.eggCook, 0);
  assert.equal(eggReadiness(cold).ready, false);
  assert.match(ingredientCue(cold), /火力で進む/);
  assert.ok(ready.eggCook > .4 && ready.eggCook < .55);
  assert.equal(eggReadiness(ready).ready, true);
  assert.match(ingredientCue(ready), /入れどき/);
  assert.match(ready.message, /卵がふんわり/);
  assert.ok(burnt.eggCook > .9);
  assert.match(ingredientCue(burnt), /焦げそう/);
  assert.match(burnt.message, /卵が焦げそう/);
  addIngredient(cold, 'rice'); addIngredient(ready, 'rice'); addIngredient(burnt, 'rice');
  assert.ok(ready.prep > cold.prep + .2 && ready.prep > burnt.prep + .15);
  const cooked = ready.eggCook;
  for (let i = 0; i < 20; i++) advance(ready, { steer: 0, heat: 0 }, .05);
  assert.equal(ready.eggCook, cooked, 'rice addition locks the egg stage');
  addIngredient(burnt, 'veg');
  assert.match(result(burnt).comment, /卵を炒めすぎた/);
});
test('filling choice rewards different timing and stays in the finished meal', () => {
  const prepare = (filling, cook, heat) => {
    const g = createGame(); g.phase = 'playing'; g.heat = heat;
    addIngredient(g, 'egg'); addIngredient(g, 'rice'); g.mix = .3; g.cook = cook;
    assert.equal(addIngredient(g, 'veg', filling), true);
    assert.equal(addIngredient(g, 'veg', filling), false);
    return g;
  };
  const lateScallion = prepare('scallion', .52, .5);
  const earlyScallion = prepare('scallion', .05, .5);
  const earlyPork = prepare('pork', .24, .9);
  const latePork = prepare('pork', .8, .9);
  assert.ok(lateScallion.fillingQuality > earlyScallion.fillingQuality + .7);
  assert.ok(earlyPork.fillingQuality > latePork.fillingQuality + .7);
  assert.equal(lateScallion.filling, 'scallion'); assert.equal(earlyPork.filling, 'pork');
  for (const g of [lateScallion, earlyScallion, earlyPork, latePork]) Object.assign(g, { cook: .86, seasoning: 1, mix: 1, prep: 1 });
  assert.ok(result(lateScallion).score > result(earlyScallion).score);
  assert.ok(result(earlyPork).score > result(latePork).score);
  assert.equal(addIngredient(createGame(), 'veg', 'invalid'), false);
});
test('filling continues cooking with heat and safe tosses after selection', () => {
  const make = (kind, heat) => {
    const g = createGame(); g.phase = 'playing'; g.heat = heat;
    addIngredient(g, 'egg'); addIngredient(g, 'rice'); g.mix = .3; g.cook = kind === 'pork' ? .24 : .52;
    addIngredient(g, 'veg', kind); return g;
  };
  const scallion = make('scallion', .5), cold = make('scallion', 0);
  for (let i = 0; i < 240; i++) { advance(scallion, { steer: 0, heat: 0 }, .05); advance(cold, { steer: 0, heat: 0 }, .05); }
  assert.equal(fillingReadiness(scallion).state, 'ready');
  assert.equal(fillingReadiness(cold).state, 'raw');
  assert.ok(fillingReadiness(scallion).quality > fillingReadiness(cold).quality);
  const beforeToss = fillingReadiness(scallion).quality;
  for (let i = 0; i < 2; i++) { scallion.time += .5; assert.equal(toss(scallion, { lift: .7, lean: 0 }), true); }
  assert.equal(scallion.fillingTosses, 2);
  assert.ok(fillingReadiness(scallion).quality > beforeToss + .1);
  const scorched = make('scallion', 1);
  for (let i = 0; i < 500; i++) advance(scorched, { steer: 0, heat: 0 }, .05);
  assert.equal(fillingReadiness(scorched).state, 'burnt');
  assert.match(result({ ...scorched, mix: 1, seasoning: 1, eggCook: .48, cook: .86 }).comment, /ねぎを炒めすぎた/);
  const pork = make('pork', .8);
  for (let i = 0; i < 300; i++) advance(pork, { steer: 0, heat: 0 }, .05);
  assert.equal(fillingReadiness(pork).state, 'ready');
  assert.match(fillingReadiness(pork).cue, /香ばしい/);
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
  const ideal = createGame(); ideal.phase = 'playing'; addIngredient(ideal, 'egg'); addIngredient(ideal, 'rice'); addIngredient(ideal, 'veg'); ideal.cook = .56; ideal.mix = .5;
  assert.equal(addSeasoning(ideal), 1); assert.equal(addSeasoning(ideal), null);
  const early = createGame(); early.phase = 'playing'; addIngredient(early, 'egg'); addIngredient(early, 'rice'); addIngredient(early, 'veg'); early.cook = .12; early.mix = .1;
  assert.ok(addSeasoning(early) < .1);
  assert.ok(result(ideal).score > result(early).score);
  assert.equal(ideal.seasonedAt, 0);
  assert.deepEqual(seasoningReadiness(ideal), { quality: 1, cue: '今が入れどき！', ready: true });
  assert.equal(seasoningReadiness(early).cue, 'まず米と具を混ぜる');
  assert.equal(seasoningReadiness({ ...ideal, seasoned: false, cook: .15 }).cue, 'まだ早い・火を通す');
  assert.equal(seasoningReadiness({ ...ideal, seasoned: false, cook: .9 }).cue, '遅くなる前に入れる');
});

test('selected heat stays lit and can cook a meal during the full route', () => {
  const g = createGame(); g.phase = 'playing'; addIngredient(g, 'rice');
  for (let i = 0; i < 1080; i++) advance(g, { steer: 0, heat: 0 }, .05);
  assert.equal(g.phase, 'finished');
  assert.equal(g.heat, .48, 'the selected fire must not quietly burn out');
  assert.ok(g.cook > .7 && g.cook < .9, 'default heat should cook the rice by the end');
  const hot = createGame(); hot.phase = 'playing'; addIngredient(hot, 'rice'); hot.heat = 1;
  for (let i = 0; i < 1080; i++) advance(hot, { steer: 0, heat: 0 }, .05);
  assert.ok(hot.cook > 1.35, 'maximum heat can overcook the meal');
  assert.ok(result(g).doneness > result(hot).doneness);
});
test('heat, stirring and rice all contribute to the final meal', () => {
  const good = createGame(); good.phase = 'playing'; addIngredient(good, 'egg'); addIngredient(good, 'rice'); addIngredient(good, 'veg'); good.mix = 1; good.cook = .86;
  const cold = { ...good, cook: 0 }, spilled = { ...good, rice: .3 }, unmixed = { ...good, mix: 0 };
  assert.ok(result(good).score > result(cold).score);
  assert.ok(result(good).score > result(spilled).score);
  assert.ok(result(good).score > result(unmixed).score);
});
test('ending feedback points to the actual cooking shortfall', () => {
  const good = createGame(); good.phase = 'playing'; addIngredient(good, 'egg'); addIngredient(good, 'rice'); addIngredient(good, 'veg'); Object.assign(good, { rice: 1, mix: 1, cook: .86, eggCook: .48, seasoning: 1, seasoned: true, prep: 1, fillingCook: .3, fillingTosses: 2 });
  assert.match(result(good).comment, /一粒ずつ/);
  assert.match(result({ ...good, rice: .2 }).comment, /米が鍋から/);
  assert.match(result({ ...good, mix: .2 }).comment, /具と米/);
  assert.match(result({ ...good, cook: .15 }).comment, /芯が少し/);
  assert.match(result({ ...good, seasoning: 0 }).comment, /香りが惜しい/);
});
test('the plated dish reflects mixing, seasoning, doneness and remaining rice', () => {
  const good = { ...createGame(), rice: 1, mix: 1, cook: .86, seasoning: 1, seasoned: true, ingredients: { egg: true, rice: true, veg: true } };
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
