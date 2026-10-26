import test from 'node:test';
import assert from 'node:assert/strict';
import { analyzeGather } from '../assets/chahan-gesture.js';

const curve = [[60, 174], [85, 125], [150, 101], [215, 125], [240, 174], [150, 174]];

test('a curved scoop from the outer wok to its centre plates the rice', () => {
  const gather = analyzeGather(curve, 300, 300);
  assert.equal(gather.valid, true);
  assert.ok(gather.quality > .7);
  assert.equal(analyzeGather(curve.map(([x, y]) => [300 - x, y]), 300, 300).valid, true, 'either circular direction works');
});

test('tap, straight flick and outside-only circles cannot trigger plating', () => {
  assert.equal(analyzeGather([[150, 174], [150, 174]], 300, 300).valid, false);
  assert.equal(analyzeGather([[150, 90], [150, 120], [150, 150], [150, 185]], 300, 300).valid, false);
  assert.equal(analyzeGather(curve.slice(0, -1), 300, 300).valid, false);
  assert.equal(analyzeGather(curve, 0, 300).valid, false);
});
