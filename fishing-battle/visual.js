import { FISH } from './core.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

// One response curve drives the held control, line and sound from the actual fight.
export function interactionFeedback(state, pull) {
  const amount = clamp(pull / 90, 0, 1);
  const danger = state.phase === 'rage';
  const pressure = clamp((state.escape - 45) / 55, 0, 1);
  const tension = amount * (danger ? 1 : .44 + pressure * .36);
  return {
    amount,
    tension,
    danger,
    pitch: danger ? 175 + amount * 55 : 315 + amount * 165 + pressure * 35,
  };
}

// Canvas-space pose. Visual pull and recoil never change the battle state.
export function battlePose(state, cue, seconds, { reduced = false, pull = 0, tension = interactionFeedback(state, pull).tension, impact = '', flash = 0 } = {}) {
  const fish = FISH[state.fishId];
  const rage = cue === 'rage', warning = cue === 'warning', opening = cue === 'opening';
  const speed = rage ? 5 + fish.speed * 2 : warning ? 3.8 : 2.6;
  const run = rage ? 7 + fish.speed * 6 : warning ? 3 + fish.speed * 1.5 : 3;
  const wave = reduced ? 0 : Math.sin(seconds * speed);
  const distance = clamp(state.reel - 48, 0, 52);
  const handPull = clamp(pull, 0, 110) * .13;
  const recoil = reduced ? 0 : clamp(flash, 0, .35) * (impact === 'badReel' ? 52 : impact ? -48 : 0);
  const fishX = 176 - distance * .7 + wave * run + Math.max(0, state.escape - 45) * .16 - handPull + recoil;
  const fishY = 305 + distance * 1.05 + (reduced ? 0 : Math.sin(seconds * (rage ? 7 : 4)) * (rage ? 9 : 3)) + handPull * .72 - recoil * .28;
  return {
    fishX, fishY,
    angle: reduced ? 0 : wave * (rage ? .1 : warning ? .045 : .017) + (impact === 'badReel' ? .08 : impact ? -.06 : 0) * clamp(flash / .35, 0, 1),
    ringWidth: (rage ? 128 + fish.strength * 4 : warning ? 124 : opening ? 107 : 118) + tension * 9,
    ringHeight: (rage ? 52 : warning ? 47 : opening ? 38 : 43) + tension * 4,
    lineControlX: opening ? 173 : rage || warning ? 154 : 160,
    lineControlY: opening ? 425 : rage || warning ? 383 : 400,
    pull: handPull,
    tension,
    run,
  };
}

export function outcomePose(pose, outcome, progress) {
  const p = clamp(progress, 0, 1), ease = 1 - (1 - p) ** 3;
  if (outcome === 'caught') return {
    fishX: pose.fishX + (90 - pose.fishX) * ease,
    fishY: pose.fishY + (410 - pose.fishY) * ease - Math.sin(Math.PI * p) * 65,
    angle: pose.angle - .32 * ease,
    scale: 1 + Math.sin(Math.PI * p) * .18,
    alpha: 1,
  };
  if (outcome === 'escaped') return {
    fishX: pose.fishX + 125 * ease,
    fishY: pose.fishY - 25 * ease,
    angle: pose.angle + .14 * ease,
    scale: 1,
    alpha: 1 - p,
  };
  return { fishX: pose.fishX, fishY: pose.fishY, angle: pose.angle, scale: 1, alpha: 1 };
}
