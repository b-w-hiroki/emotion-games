import test from 'node:test';
import assert from 'node:assert/strict';
import { createKitchenAudio } from '../chahan/audio.js';

test('kitchen audio starts after unlock, mixes each stage and persists mute', () => {
  const stored = new Map();
  const storage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) };
  const contexts = [];
  const parameter = () => ({ value: 0, targets: [], setTargetAtTime(value) { this.targets.push(value); }, setValueAtTime(value) { this.value = value; }, exponentialRampToValueAtTime(value) { this.value = value; } });
  const node = extra => ({ ...extra, connect() { return this; }, start() {}, stop() {} });
  class FakeContext {
    constructor() { this.sampleRate = 8; this.currentTime = 1; this.state = 'running'; this.gains = []; this.filters = []; this.oscillators = []; this.destination = {}; contexts.push(this); }
    createBuffer() { return { getChannelData: () => new Float32Array(16) }; }
    createBufferSource() { return node({}); }
    createBiquadFilter() { const filter = node({ frequency: parameter() }); this.filters.push(filter); return filter; }
    createGain() { const gain = node({ gain: parameter() }); this.gains.push(gain); return gain; }
    createOscillator() { const oscillator = node({ frequency: parameter() }); this.oscillators.push(oscillator); return oscillator; }
    suspend() { this.state = 'suspended'; }
    resume() { this.state = 'running'; }
  }
  const audio = createKitchenAudio({ Context: FakeContext, storage });
  audio.update({ stage: 1, heat: 1, playing: true });
  assert.equal(contexts.length, 0, 'no audio context before a user gesture');
  assert.equal(audio.unlock(), true);
  audio.update({ stage: 0, heat: .5, playing: true });
  assert.equal(contexts[0].gains[1].gain.targets.at(-1), 0, 'street has no wind bed');
  audio.update({ stage: 2, heat: .5, playing: true });
  assert.ok(contexts[0].gains[1].gain.targets.at(-1) > 0, 'sky has wind bed');
  audio.toss(true, 2);
  assert.equal(contexts[0].oscillators.length, 2, 'successful toss has a two-part cue');
  audio.toss(true, 3, 1);
  assert.equal(contexts[0].oscillators.length, 5, 'a precise toss adds a distinct chime');
  assert.equal(audio.setEnabled(false), false);
  assert.equal(stored.get('chahan.sound'), 'off');
  audio.toss(false, 0);
  assert.equal(contexts[0].oscillators.length, 5, 'mute silences later cues');
  assert.equal(createKitchenAudio({ Context: FakeContext, storage }).enabled, false, 'mute survives reload');
  audio.setEnabled(true); audio.unlock();
  assert.equal(contexts.length, 1, 'unmute reuses the context');
  audio.transition();
  assert.equal(contexts[0].oscillators.length, 7, 'a location change has its own cue');
  audio.update({ playing: false });
  assert.equal(contexts[0].gains[0].gain.targets.at(-1), 0, 'ambient sound stops after play');
  audio.pause();
  assert.equal(contexts[0].state, 'suspended', 'backgrounding suspends audio');
});
