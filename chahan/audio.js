// Small procedural kitchen mix. AudioContext is created only after a user gesture.
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

export function createKitchenAudio({ Context = globalThis.AudioContext || globalThis.webkitAudioContext, storage = globalThis.localStorage } = {}) {
  let context, fire, wind, enabled = true;
  try { enabled = storage?.getItem('chahan.sound') !== 'off'; } catch { /* Private storage may be unavailable. */ }

  function noiseSource() {
    const buffer = context.createBuffer(1, context.sampleRate * 2, context.sampleRate);
    const samples = buffer.getChannelData(0);
    for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    const source = context.createBufferSource(); source.buffer = buffer; source.loop = true;
    return source;
  }
  function bed(frequency, type) {
    const source = noiseSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    filter.type = type; filter.frequency.value = frequency; gain.gain.value = 0;
    source.connect(filter).connect(gain).connect(context.destination); source.start();
    return { source, filter, gain };
  }
  function unlock() {
    if (!enabled || !Context) return false;
    try {
      if (!context) { context = new Context(); fire = bed(760, 'lowpass'); wind = bed(420, 'bandpass'); }
      if (context.state === 'suspended') context.resume();
      return true;
    } catch { return false; }
  }
  function setEnabled(value) {
    enabled = !!value;
    try { storage?.setItem('chahan.sound', enabled ? 'on' : 'off'); } catch { /* Keep the session setting. */ }
    if (!enabled && context) { fire.gain.gain.value = 0; wind.gain.gain.value = 0; context.suspend(); }
    return enabled;
  }
  function update({ stage = 0, heat = 0, playing = false } = {}) {
    if (!context || !enabled) return;
    const at = context.currentTime;
    fire.gain.gain.setTargetAtTime(playing ? .015 + clamp(heat, 0, 1) * .09 : 0, at, .12);
    wind.gain.gain.setTargetAtTime(playing ? [0, .027, .053][clamp(stage, 0, 2)] : 0, at, .3);
    wind.filter.frequency.setTargetAtTime([350, 510, 760][clamp(stage, 0, 2)], at, .4);
  }
  function tone(frequency, duration, type = 'sine', volume = .08, endFrequency = frequency * .75) {
    if (!enabled || !context) return;
    const now = context.currentTime, oscillator = context.createOscillator(), gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, now);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1, endFrequency), now + duration);
    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(.001, now + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(now); oscillator.stop(now + duration);
  }
  function toss(safe, combo, quality = 0) {
    if (safe) { tone(150, .16, 'triangle', .07, 470); tone(390 + Math.min(combo, 8) * 28, .22, 'sine', .055, 240); if (quality >= .82) tone(880, .28, 'sine', .035, 1170); }
    else tone(135, .24, 'sawtooth', .055, 72);
  }
  function ladle(quality = 0) {
    tone(1180, .075, 'triangle', .035 + quality * .025, 650);
    tone(1860, .11, 'sine', .018 + quality * .014, 1100);
  }
  function season(quality) { tone(750, .42, 'triangle', .08, 230); if (quality > .6) tone(970, .5, 'sine', .045, 650); }
  function transition() { tone(420, .3, 'sine', .06, 660); tone(630, .38, 'triangle', .035, 920); }
  function finish(score) { tone(score >= 70 ? 720 : 310, .55, 'triangle', .09, score >= 70 ? 1050 : 180); update({ playing: false }); }
  function pause() { if (context?.state === 'running') context.suspend(); }
  return { unlock, setEnabled, update, toss, ladle, season, transition, finish, pause, get enabled() { return enabled; }, get active() { return !!context; } };
}
