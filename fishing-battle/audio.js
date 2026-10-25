// Short battle cues are created only after a player gesture unlocks Web Audio.
// Timers and active voices belong to one fight and are cancelled on retry or mute.
export class BattleAudio {
  constructor(makeContext, schedule = setTimeout, cancel = clearTimeout) {
    this.makeContext = makeContext;
    this.schedule = schedule;
    this.cancel = cancel;
    this.context = null;
    this.unlocked = false;
    this.muted = false;
    this.hidden = false;
    this.voices = new Set();
    this.timers = new Set();
    this.tensionVoice = null;
    this.tensionGain = null;
  }

  unlock() {
    if (this.muted || this.hidden) return false;
    try {
      this.context ??= this.makeContext();
      if (this.context.state !== 'running') {
        const resumed = this.context.resume?.();
        resumed?.catch?.(() => {});
      }
      this.unlocked = true;
      return true;
    } catch { return false; }
  }

  setMuted(muted) {
    this.muted = muted;
    if (muted) { this.silence(); this.suspend(); }
  }

  setHidden(hidden) {
    this.hidden = hidden;
    if (hidden) { this.silence(); this.suspend(); }
    else if (this.unlocked && !this.muted && this.context?.state !== 'running') {
      try { const resumed = this.context?.resume?.(); resumed?.catch?.(() => {}); } catch {}
    }
  }

  suspend() {
    try { const suspended = this.context?.suspend?.(); suspended?.catch?.(() => {}); } catch {}
  }

  silence() {
    for (const timer of this.timers) this.cancel(timer);
    this.timers.clear();
    for (const voice of this.voices) {
      try { voice.stop(); } catch {}
    }
    this.voices.clear();
    this.tensionVoice = null;
    this.tensionGain = null;
  }

  reset() { this.silence(); }

  setTension(level, pitch = 320) {
    if (!this.unlocked || this.muted || this.hidden || !this.context) return false;
    if (level <= 0) {
      if (this.tensionVoice) {
        try { this.tensionVoice.stop(); } catch {}
        this.voices.delete(this.tensionVoice);
        this.tensionVoice = null;
        this.tensionGain = null;
      }
      return false;
    }
    try {
      const time = this.context.currentTime;
      if (!this.tensionVoice) {
        const voice = this.context.createOscillator(), gain = this.context.createGain();
        voice.type = 'triangle';
        gain.gain.setValueAtTime(.001, time);
        voice.connect(gain).connect(this.context.destination);
        voice.start(time);
        this.tensionVoice = voice;
        this.tensionGain = gain;
        this.voices.add(voice);
        voice.onended = () => this.voices.delete(voice);
      }
      this.tensionVoice.frequency.setValueAtTime(pitch, time);
      this.tensionGain.gain.exponentialRampToValueAtTime(.003 + Math.min(level, 1) * .018, time + .04);
      return true;
    } catch { return false; }
  }

  note(start, end, duration, type = 'sine', peak = .035) {
    if (!this.unlocked || this.muted || this.hidden || !this.context) return false;
    try {
      const time = this.context.currentTime;
      const voice = this.context.createOscillator(), volume = this.context.createGain();
      voice.type = type;
      voice.frequency.setValueAtTime(start, time);
      voice.frequency.exponentialRampToValueAtTime(end, time + duration);
      volume.gain.setValueAtTime(.001, time);
      volume.gain.exponentialRampToValueAtTime(peak, time + Math.min(.025, duration / 3));
      volume.gain.exponentialRampToValueAtTime(.001, time + duration);
      voice.connect(volume).connect(this.context.destination);
      this.voices.add(voice);
      voice.onended = () => this.voices.delete(voice);
      voice.start(time);
      voice.stop(time + duration + .01);
      return true;
    } catch { return false; }
  }

  later(callback, delay) {
    const timer = this.schedule(() => { this.timers.delete(timer); callback(); }, delay);
    this.timers.add(timer);
  }

  play(event, strength = 1) {
    if (!this.unlocked || this.muted || this.hidden) return false;
    switch (event) {
      case 'warning': return this.note(340, 210, .27, 'triangle', .026);
      case 'rage': return this.note(165, 95, .36, 'sawtooth', .035);
      case 'opening': return this.note(420, 680, .23, 'sine', .04);
      case 'openingLate': return this.note(690, 820, .1, 'sine', .025);
      case 'goodReel': return this.note(330, 430, .12, 'triangle', .028 * strength);
      case 'goodOpening': return this.note(510, 740, .19, 'sine', .045 * strength);
      case 'badReel': return this.note(150, 82, .25, 'sawtooth', .05 * strength);
      case 'caught': {
        const played = this.note(520, 660, .32, 'sine', .046);
        if (played) this.later(() => this.note(660, 880, .42, 'sine', .04), 150);
        return played;
      }
      case 'escaped': return this.note(220, 95, .5, 'triangle', .04);
      default: return false;
    }
  }
}
