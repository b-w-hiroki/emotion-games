import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeGather, analyzePull } from '../assets/chahan-gesture.js';

test('a straight wok pull remains catchable when frames are delayed', () => {
  const ordinary = analyzePull(150, 100, 150, 195, 280);
  const delayed = analyzePull(150, 100, 150, 195, 1800);
  assert.ok(ordinary.lift >= .28 && ordinary.lift <= 1.25);
  assert.ok(delayed.lift >= .28 && delayed.lift <= 1.25);
  assert.equal(delayed.lean, 0);
  assert.ok(analyzePull(150, 100, 150, 115, 1800).lift < .28, 'a tiny drag is not a toss');
  assert.ok(analyzePull(150, 100, 300, 195, 280).lean > .55, 'a sideways pull still spills');
});

const curve = [[60, 174], [85, 125], [150, 101], [215, 125], [240, 174], [150, 174]];

test('a curved scoop from the outer wok to its centre plates the rice', () => {
  const gather = analyzeGather(curve, 300, 300);
  assert.equal(gather.valid, true);
  assert.ok(gather.quality > .7);
  assert.equal(gather.progress, 1, 'rice has gathered by the time the spoon reaches the centre');
  const midway = analyzeGather(curve.slice(0, 4), 300, 300);
  assert.equal(midway.valid, false);
  assert.ok(midway.progress > .25 && midway.progress < 1, 'rice moves inward during the curved stroke');
  assert.equal(analyzeGather(curve.map(([x, y]) => [300 - x, y]), 300, 300).valid, true, 'either circular direction works');
});

test('tap, straight flick and outside-only circles cannot trigger plating', () => {
  assert.equal(analyzeGather([[150, 174], [150, 174]], 300, 300).valid, false);
  assert.equal(analyzeGather([[150, 90], [150, 120], [150, 150], [150, 185]], 300, 300).valid, false);
  assert.equal(analyzeGather([[150, 90], [150, 120], [150, 150], [150, 185]], 300, 300).progress, 0, 'a straight toss must not pull rice into a mound');
  assert.equal(analyzeGather(curve.slice(0, -1), 300, 300).valid, false);
  assert.equal(analyzeGather(curve, 0, 300).valid, false);
});
