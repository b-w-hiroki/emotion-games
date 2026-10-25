import test from 'node:test';
import assert from 'node:assert/strict';
import { BattleAudio } from '../fishing-battle/audio.js';

function rig() {
  const voices = [], timers = new Map();
  let nextTimer = 1, created = 0, resumed = 0, suspended = 0;
  const context = {
    currentTime: 0, destination: {}, state: 'suspended',
    resume() { resumed++; this.state = 'running'; return Promise.resolve(); },
    suspend() { suspended++; this.state = 'suspended'; return Promise.resolve(); },
    createOscillator() {
      const voice = {
        frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} },
        connect() { return this; }, start() { this.started = true; },
        stop() { this.stopCalls = (this.stopCalls ?? 0) + 1; },
      };
      voices.push(voice);
      return voice;
    },
    createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() { return this; } }; },
  };
  const audio = new BattleAudio(() => { created++; return context; }, callback => { const id = nextTimer++; timers.set(id, callback); return id; }, id => timers.delete(id));
  return { audio, voices, timers, get created() { return created; }, get resumed() { return resumed; }, get suspended() { return suspended; } };
}

test('no audio context or cue is created before a player gesture', () => {
  const r = rig();
  assert.equal(r.audio.play('warning'), false);
  assert.equal(r.created, 0);
  r.audio.unlock();
  assert.equal(r.created, 1);
  assert.equal(r.resumed, 1);
  assert.equal(r.audio.play('goodReel'), true);
  r.audio.unlock();
  assert.equal(r.resumed, 1);
  assert.equal(r.voices.length, 1);
  assert.equal(r.voices[0].started, true);
});

test('mute and retry cancel the pending catch flourish and silence active voices', () => {
  const r = rig(); r.audio.unlock();
  r.audio.play('caught');
  assert.equal(r.timers.size, 1);
  r.audio.setMuted(true);
  assert.equal(r.timers.size, 0);
  assert.equal(r.voices[0].stopCalls, 2);
  assert.equal(r.suspended, 1);
  assert.equal(r.audio.play('rage'), false);
  r.audio.setMuted(false); r.audio.unlock();
  r.audio.play('caught');
  assert.equal(r.timers.size, 1);
  r.audio.reset();
  assert.equal(r.timers.size, 0);
  assert.equal(r.created, 1);
});

test('backgrounding silences battle cues until the page returns', () => {
  const r = rig(); r.audio.unlock();
  r.audio.setHidden(true);
  assert.equal(r.audio.play('rage'), false);
  assert.equal(r.suspended, 1);
  r.audio.setHidden(false);
  assert.equal(r.audio.play('opening'), true);
  assert.equal(r.created, 1);
  assert.ok(r.resumed >= 2);
});

test('held-line sound follows tension and stops on release, mute and retry', () => {
  const r = rig();
  assert.equal(r.audio.setTension(.5, 380), false);
  assert.equal(r.created, 0);
  r.audio.unlock();
  assert.equal(r.audio.setTension(.3, 350), true);
  assert.equal(r.voices.length, 1);
  assert.equal(r.voices[0].started, true);
  assert.equal(r.audio.setTension(.8, 480), true);
  assert.equal(r.voices.length, 1);
  r.audio.setTension(0);
  assert.equal(r.voices[0].stopCalls, 1);
  r.audio.setTension(.6, 170);
  r.audio.setMuted(true);
  assert.equal(r.voices[1].stopCalls, 1);
  assert.equal(r.audio.setTension(.8, 480), false);
  r.audio.setMuted(false); r.audio.unlock();
  r.audio.setTension(.5, 400); r.audio.reset();
  assert.equal(r.voices[2].stopCalls, 1);
});

test('the final opening cue respects gesture unlock and mute', () => {
  const r = rig();
  assert.equal(r.audio.play('openingLate'), false);
  r.audio.unlock();
  assert.equal(r.audio.play('openingLate'), true);
  assert.equal(r.voices.length, 1);
  r.audio.setMuted(true);
  assert.equal(r.audio.play('openingLate'), false);
});

test('reel sound follows swipe impulse without changing phase cue volume', () => {
  const r = rig(); r.audio.unlock();
  const peaks = [];
  r.audio.note = (start, end, duration, type, peak) => { peaks.push(peak); return true; };
  r.audio.play('goodReel', .65);
  r.audio.play('goodReel', 1.35);
  r.audio.play('warning', 1.35);
  assert.ok(peaks[1] > peaks[0]);
  assert.equal(peaks[2], .026);
});
