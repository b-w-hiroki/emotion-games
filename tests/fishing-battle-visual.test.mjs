import test from 'node:test';
import assert from 'node:assert/strict';
import { createBattle, reelBattle } from '../fishing-battle/core.js';
import { battleCamera, battlePose, escapePressure, fisherPose, interactionFeedback, lineShape, outcomePose, phaseAtmosphere, pullGuidance, reelImpulse, reelReadout, surfaceResponse, timingWindow, verticalPull } from '../fishing-battle/visual.js';

test('only a downward stroke charges the reel and a corrected stroke can recover', () => {
  assert.equal(verticalPull(0, 34), 34);
  assert.equal(verticalPull(20, 40), 40);
  assert.equal(verticalPull(80, 40), 0);
  assert.equal(verticalPull(0, -40), 0);
  assert.equal(verticalPull(100, 80), 0);
  assert.equal(verticalPull(20, 80), 80);
});

test('held control gives a safe instruction in each phase', () => {
  assert.equal(pullGuidance('calm', 70).hint, '離して巻く！');
  assert.equal(pullGuidance('opening', 70).hint, 'いま離して巻く！');
  assert.equal(pullGuidance('warning', 70).color, '#ffd18a');
  assert.equal(pullGuidance('warning', 70).hint, 'いま離して巻く！');
  assert.equal(pullGuidance('rage', 70).hint, '上へ戻して、離す');
  assert.equal(pullGuidance('rage', 70, true).hint, 'Escで中止。離すと危険');
  assert.equal(pullGuidance('rage', 20).shortRelease, '魚が暴れてる。待とう');
  assert.equal(pullGuidance('calm', 20).shortRelease, 'もう少し下へ引こう');
});

test('escape pressure remains visible between runs and releases as risk falls', () => {
  const state = createBattle('aji');
  assert.equal(escapePressure(state), 0);
  state.escape = 80;
  const urgent = escapePressure(state);
  assert.ok(urgent > 0);
  const pose = battlePose(state, 'calm', 0, { reduced: true });
  const distant = battleCamera(state, 'calm', pose);
  state.escape = 60;
  assert.ok(escapePressure(state) < urgent);
  const recovering = battleCamera(state, 'calm', pose);
  assert.ok(distant.zoom < recovering.zoom && distant.x < recovering.x);
  state.escape = 55;
  assert.equal(escapePressure(state), 0);
  state.outcome = 'escaped';
  state.escape = 100;
  assert.equal(escapePressure(state), 0);
});

test('reel readout reports actual progress and danger, including caps', () => {
  const state = createBattle('aji');
  let before = { reel: state.reel, escape: state.escape };
  reelBattle(state);
  assert.deepEqual(reelReadout(state.events[0], before, state), { label: '+5%', message: '少し近づいた +5%', danger: false });
  state.time += .3; state.openingUntil = 3; state.openingUsed = false;
  before = { reel: state.reel, escape: state.escape };
  reelBattle(state);
  assert.deepEqual(reelReadout(state.events[0], before, state), { label: '+8%', message: 'ゆるんだ糸を引き寄せた！ +8%', danger: false });
  state.time += .3; state.phase = 'rage';
  before = { reel: state.reel, escape: state.escape };
  reelBattle(state);
  assert.deepEqual(reelReadout(state.events[0], before, state), { label: '危険 +20', message: '糸が強く張った！ 危険 +20', danger: true });
  state.time += .3; state.escape = 95;
  before = { reel: state.reel, escape: state.escape };
  reelBattle(state);
  assert.equal(reelReadout(state.events[0], before, state).label, '危険 +5');
});

test('water and line lighting follow the real warning, run, and opening clocks', () => {
  const state = createBattle('aji');
  assert.equal(phaseAtmosphere(state, 'calm').edge, 0);
  state.phaseUntil = 2;
  state.time = 1.35;
  const early = phaseAtmosphere(state, 'warning');
  state.time = 1.9;
  const late = phaseAtmosphere(state, 'warning');
  assert.ok(late.edge > early.edge && late.line > early.line);
  state.phase = 'rage';
  state.escape = 80;
  const danger = phaseAtmosphere(state, 'rage');
  assert.ok(danger.edge > phaseAtmosphere({ ...state, escape: 20 }, 'rage').edge);
  state.phase = 'calm'; state.openingUntil = 3; state.openingUsed = false;
  const opening = phaseAtmosphere(state, 'opening');
  assert.notEqual(opening.color, danger.color);
  state.time = 2.9;
  assert.ok(phaseAtmosphere(state, 'opening').edge < opening.edge);
  state.outcome = 'caught';
  assert.equal(phaseAtmosphere(state, 'opening').edge, 0);
});

test('swipe distance scales one reel impact across fish, fisher, water and camera', () => {
  const state = createBattle('aji');
  const short = reelImpulse(34), long = reelImpulse(150);
  assert.equal(reelImpulse(0), short);
  assert.equal(reelImpulse(1000), long);
  assert.ok(short < 1 && long > 1);
  const options = { impact: 'goodReel', flash: .35 };
  const shortFish = battlePose(state, 'calm', 0, { ...options, strength: short });
  const longFish = battlePose(state, 'calm', 0, { ...options, strength: long });
  assert.ok(longFish.fishX < shortFish.fishX);
  assert.ok(fisherPose('calm', { ...options, strength: long }).angle < fisherPose('calm', { ...options, strength: short }).angle);
  assert.ok(surfaceResponse(longFish, 'calm', { ...options, strength: long }).impactScale > surfaceResponse(shortFish, 'calm', { ...options, strength: short }).impactScale);
  assert.ok(battleCamera(state, 'calm', longFish, { ...options, strength: long }).y < battleCamera(state, 'calm', shortFish, { ...options, strength: short }).y);
  assert.equal(battlePose(state, 'calm', 0, { ...options, strength: long, reduced: true }).fishX, battlePose(state, 'calm', 0, { ...options, strength: short, reduced: true }).fishX);
});

test('the fisher braces, pulls and recoils while the line stays on the transformed hand', () => {
  const neutral = fisherPose('calm');
  const held = fisherPose('calm', { pull: 110 });
  const rage = fisherPose('rage');
  const good = fisherPose('calm', { impact: 'goodReel', flash: .35 });
  const bad = fisherPose('calm', { impact: 'badReel', flash: .35 });
  assert.deepEqual([neutral.anchorX, neutral.anchorY, neutral.handX, neutral.handY], [100, 627, 146, 490]);
  assert.ok(held.angle < neutral.angle && held.handX < neutral.handX);
  assert.ok(rage.angle > neutral.angle);
  assert.ok(good.angle < neutral.angle && bad.angle > neutral.angle);
  const fish = { fishX: 176, fishY: 305 };
  const line = lineShape(fish, 'opening', 110, { x: held.handX, y: held.handY });
  assert.equal(line.startX, held.handX);
  assert.equal(line.startY, held.handY);
  assert.equal(line.c1y, held.handY - 53 + line.slack * .28);
  assert.deepEqual(fisherPose('rage', { pull: 110, impact: 'badReel', flash: .35, reduced: true }), neutral);
});

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

test('stronger fish make a wider, faster run and directional wake without changing reduced motion', () => {
  const aji = battlePose(createBattle('aji'), 'rage', 0);
  const kue = battlePose(createBattle('kue'), 'rage', 0);
  assert.ok(kue.run > aji.run && kue.swimVelocity > aji.swimVelocity);
  assert.ok(surfaceResponse(kue, 'rage').wake > surfaceResponse(aji, 'rage').wake);
  const opposite = battlePose(createBattle('aji'), 'rage', Math.PI / 7);
  assert.equal(surfaceResponse(opposite, 'rage').direction, -1);
  assert.equal(surfaceResponse(kue, 'opening').wake, 0);
  assert.equal(surfaceResponse(kue, 'rage', { reduced: true }).wake, 0);
});

test('small fish dart, flatfish glide and the heavy fish heaves with matching water motion', () => {
  const aji = createBattle('aji'), hirame = createBattle('hirame'), kue = createBattle('kue');
  const ajiStart = battlePose(aji, 'rage', 0), hirameStart = battlePose(hirame, 'rage', 0), kueStart = battlePose(kue, 'rage', 0);
  assert.ok(ajiStart.swimVelocity > hirameStart.swimVelocity);
  assert.ok(kueStart.run > hirameStart.run && kueStart.swimVelocity > ajiStart.swimVelocity);
  const ajiBob = battlePose(aji, 'rage', .2).fishY - ajiStart.fishY;
  const hirameBob = battlePose(hirame, 'rage', .2).fishY - hirameStart.fishY;
  const kueBob = battlePose(kue, 'rage', .2).fishY - kueStart.fishY;
  assert.ok(hirameBob < ajiBob && ajiBob < kueBob);
  assert.ok(surfaceResponse(kueStart, 'rage').wake > surfaceResponse(hirameStart, 'rage').wake);
  assert.deepEqual(battlePose(kue, 'rage', 0, { reduced: true }), battlePose(kue, 'rage', 3, { reduced: true }));
});

test('accepted and dangerous reels give distinct water splashes', () => {
  const pose = battlePose(createBattle('aji'), 'calm', 0);
  const good = surfaceResponse(pose, 'calm', { impact: 'goodReel', flash: .35 });
  const bad = surfaceResponse(pose, 'rage', { impact: 'badReel', flash: .35 });
  assert.equal(good.splash, 1);
  assert.equal(bad.splash, 1);
  assert.notEqual(good.color, bad.color);
  assert.equal(surfaceResponse(pose, 'calm', { impact: 'goodReel', flash: .35, reduced: true }).splash, 0);
});

test('opening slack is visible in the line and a held pull takes it up', () => {
  const fish = { fishX: 176, fishY: 305 };
  const rage = lineShape(fish, 'rage');
  const opening = lineShape(fish, 'opening');
  const held = lineShape(fish, 'opening', 90);
  assert.equal(rage.slack, 0);
  assert.ok(opening.slack > held.slack && held.slack > rage.slack);
  assert.ok(opening.c1x < held.c1x && held.c1x < rage.c1x);
  assert.equal(opening.endX, rage.endX);
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
  assert.deepEqual(outcomePose(pose, null, .5), { fishX: pose.fishX, fishY: pose.fishY, angle: pose.angle, size: pose.fishSize, scale: 1, alpha: 1 });
});

test('fish silhouette, water ring and hook point grow together by species', () => {
  const small = battlePose(createBattle('aji'), 'calm', 0, { reduced: true });
  const large = battlePose(createBattle('kue'), 'calm', 0, { reduced: true });
  assert.ok(small.fishSize < 1 && large.fishSize > 1);
  assert.ok(large.ringWidth > small.ringWidth && large.ringHeight > small.ringHeight);
  const smallLine = lineShape(outcomePose(small, null, 0), 'calm');
  const largeLine = lineShape(outcomePose(large, null, 0), 'calm');
  assert.equal(smallLine.endX, small.fishX + 70 - 50 * small.fishSize);
  assert.equal(largeLine.endX, large.fishX + 70 - 50 * large.fishSize);
  assert.ok(largeLine.endX < smallLine.endX);
});

test('reeling draws a fish nearer through its silhouette, water and camera', () => {
  const state = createBattle('tai');
  const far = battlePose(state, 'calm', 0, { reduced: true });
  const farCamera = battleCamera(state, 'calm', far);
  state.reel = 90;
  const near = battlePose(state, 'calm', 0, { reduced: true });
  const nearCamera = battleCamera(state, 'calm', near);
  assert.ok(near.fishY > far.fishY && near.fishSize > far.fishSize);
  assert.ok(near.ringWidth > far.ringWidth && near.ringHeight > far.ringHeight);
  assert.ok(nearCamera.zoom > farCamera.zoom && nearCamera.y < farCamera.y);
  assert.ok(lineShape(outcomePose(near, null, 0), 'calm').endX < lineShape(outcomePose(far, null, 0), 'calm').endX);
  assert.deepEqual(battleCamera(state, 'calm', near, { reduced: true }), { x: 0, y: 0, zoom: 1 });
});

test('escape pressure pulls the fish back while the hook stays on its turning mouth', () => {
  const state = createBattle('kue');
  const safe = battlePose(state, 'rage', 0, { reduced: true });
  state.escape = 90;
  const danger = battlePose(state, 'rage', 0, { reduced: true });
  assert.ok(danger.fishX > safe.fishX && danger.fishY < safe.fishY);
  assert.ok(danger.fishSize < safe.fishSize && danger.ringWidth < safe.ringWidth);
  assert.ok(danger.retreat > 0);
  const fish = { ...outcomePose(danger, null, 0), angle: Math.PI / 2, scale: 1.2 };
  const hook = lineShape(fish, 'rage');
  assert.ok(Math.abs(hook.endX - (fish.fishX + 70 - 5 * fish.size * fish.scale)) < 1e-9);
  assert.ok(Math.abs(hook.endY - (fish.fishY + 40 - 50 * fish.size * fish.scale)) < 1e-9);
  assert.ok(lineShape({ ...fish, angle: 0 }, 'rage').endX < hook.endX);
});

test('camera follows held input, fish run and opposite outcomes while reduced motion stays still', () => {
  const state = createBattle('aji');
  const pose = battlePose(state, 'calm', 0);
  const idle = battleCamera(state, 'calm', pose);
  const held = battleCamera(state, 'calm', pose, { pull: 110 });
  const running = battleCamera(state, 'rage', pose);
  assert.ok(held.y > idle.y && held.zoom > idle.zoom);
  assert.ok(running.x < idle.x && running.y > idle.y);
  const rightFish = battleCamera(state, 'calm', { ...pose, fishX: pose.fishX + 25 });
  assert.ok(rightFish.x < idle.x);
  const good = battleCamera(state, 'calm', pose, { impact: 'goodReel', flash: .35 });
  const bad = battleCamera(state, 'calm', pose, { impact: 'badReel', flash: .35 });
  assert.ok(good.y < idle.y && good.zoom > idle.zoom);
  assert.ok(bad.y > idle.y && bad.zoom < idle.zoom);
  state.outcome = 'caught';
  const caught = battleCamera(state, 'calm', pose, { outcomeProgress: 1 });
  assert.ok(caught.y < idle.y && caught.zoom > 1);
  state.outcome = 'escaped';
  const escaped = battleCamera(state, 'calm', pose, { outcomeProgress: 1 });
  assert.ok(escaped.x < caught.x && escaped.zoom < 1);
  assert.deepEqual(battleCamera(state, 'calm', pose, { outcomeProgress: 1, reduced: true }), { x: 0, y: 0, zoom: 1 });
});
