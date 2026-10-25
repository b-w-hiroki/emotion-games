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

export function timingWindow(state, cue) {
  if (state.outcome) return null;
  if (cue === 'warning') return { kind: 'warning', fraction: clamp(1 - (state.phaseUntil - state.time) / .65, 0, 1) };
  if (cue === 'opening') return { kind: 'opening', fraction: clamp((state.openingUntil - state.time) / FISH[state.fishId].opening, 0, 1) };
  return null;
}

// The line relaxes only while the fish leaves an opening. Holding the reel
// takes up some slack before release, without changing AINAN's battle rules.
export function lineShape(fish, cue, pull = 0) {
  const slack = Math.max(0, (cue === 'opening' ? 48 : cue === 'calm' ? 14 : cue === 'warning' ? 5 : 0) - pull * .22);
  const endX = fish.fishX + 20, endY = fish.fishY + 45;
  return {
    startX: 146, startY: 490, endX, endY, slack,
    c1x: 146 - slack, c1y: 437 + slack * .28,
    c2x: endX - slack * .85, c2y: endY + 57 + slack * .4,
  };
}

// Canvas-space pose. Visual pull and recoil never change the battle state.
export function battlePose(state, cue, seconds, { reduced = false, pull = 0, tension = interactionFeedback(state, pull).tension, impact = '', flash = 0 } = {}) {
  const fish = FISH[state.fishId];
  const rage = cue === 'rage', warning = cue === 'warning', opening = cue === 'opening';
  const speed = rage ? 5 + fish.speed * 2 : warning ? 3.8 : 2.6;
  const run = rage ? 12 + fish.speed * 12 : warning ? 5 + fish.speed * 3 : 3;
  const wave = reduced ? 0 : Math.sin(seconds * speed);
  const swimVelocity = reduced ? 0 : Math.cos(seconds * speed) * run * speed;
  const distance = clamp(state.reel - 48, 0, 52);
  const handPull = clamp(pull, 0, 110) * .13;
  const recoil = reduced ? 0 : clamp(flash, 0, .35) * (impact === 'badReel' ? 52 : impact ? -48 : 0);
  const fishX = 176 - distance * .7 + wave * run + Math.max(0, state.escape - 45) * .16 - handPull + recoil;
  const fishY = 305 + distance * 1.05 + (reduced ? 0 : Math.sin(seconds * (rage ? 7 : 4)) * (rage ? 12 + fish.speed * 2 : 3)) + handPull * .72 - recoil * .28;
  return {
    fishX, fishY,
    angle: reduced ? 0 : wave * (rage ? .1 : warning ? .045 : .017) + (impact === 'badReel' ? .08 : impact ? -.06 : 0) * clamp(flash / .35, 0, 1),
    ringWidth: (rage ? 128 + fish.strength * 4 : warning ? 124 : opening ? 107 : 118) + tension * 9,
    ringHeight: (rage ? 52 : warning ? 47 : opening ? 38 : 43) + tension * 4,
    lineControlX: opening ? 173 : rage || warning ? 154 : 160,
    lineControlY: opening ? 425 : rage || warning ? 383 : 400,
    pull: handPull,
    tension,
    run, swimVelocity,
  };
}

export function surfaceResponse(pose, cue, { impact = '', flash = 0, reduced = false } = {}) {
  const wake = reduced || cue !== 'rage' ? 0 : clamp(Math.abs(pose.swimVelocity) / 450, 0, 1);
  const splash = reduced ? 0 : clamp(flash / .35, 0, 1);
  return {
    wake,
    direction: Math.sign(pose.swimVelocity) || 1,
    splash,
    color: impact === 'badReel' ? '#ffd4a3' : '#c9fff5',
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

// Camera offsets are in the 390x844 scene. Keep them small enough that the
// hooked fish and the fisher remain visible on the narrowest supported phone.
export function battleCamera(state, cue, pose, { pull = 0, outcomeProgress = 0, impact = '', flash = 0, reduced = false } = {}) {
  if (reduced) return { x: 0, y: 0, zoom: 1 };
  const held = clamp(pull / 110, 0, 1);
  const run = cue === 'rage' ? 1 : cue === 'warning' ? .45 : 0;
  // Move against the fish's displacement to keep the line's target in view.
  const fishOffset = clamp((176 - pose.fishX) * .26, -12, 12);
  const hit = clamp(flash / .35, 0, 1);
  const reelKick = impact === 'goodReel' || impact === 'goodOpening' ? -1 : impact === 'badReel' ? 1 : 0;
  if (state.outcome === 'caught') return { x: -10 * outcomeProgress, y: -17 * outcomeProgress, zoom: 1 + .055 * outcomeProgress };
  if (state.outcome === 'escaped') return { x: -20 * outcomeProgress, y: 3 * outcomeProgress, zoom: 1 - .035 * outcomeProgress };
  return {
    x: clamp(fishOffset - run * 9 + held * 5 + reelKick * hit * 7, -21, 18),
    y: run * 5 + held * 8 + reelKick * hit * 6,
    zoom: 1 + held * .018 - run * .012 - reelKick * hit * .025,
  };
}
