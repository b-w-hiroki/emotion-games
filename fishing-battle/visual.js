import { FISH } from './core.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const FISH_VISUAL_SIZE = Object.freeze({ aji: .86, saba: .92, isaki: .94, bass: 1, tai: 1.04, hirame: 1.05, buri: 1.12, kanpachi: 1.16, kue: 1.24 });
// Visual swim signatures only. AINAN's battle speed, timing and reel values
// remain in core.js; the derivative below also drives the directional wake.
const FISH_SWIM = Object.freeze({
  aji: { tempo: 1.2, run: .9, dart: .2, bob: .7, tilt: .85 },
  saba: { tempo: 1.25, run: .95, dart: .18, bob: .8, tilt: .9 },
  isaki: { tempo: 1.1, run: .9, dart: .12, bob: .8, tilt: .85 },
  tai: { tempo: .92, run: .95, dart: .04, bob: .9, tilt: 1 },
  hirame: { tempo: .75, run: .95, dart: 0, bob: .45, tilt: .6 },
  bass: { tempo: 1.05, run: 1, dart: .12, bob: 1, tilt: 1 },
  buri: { tempo: 1.07, run: 1, dart: .08, bob: .9, tilt: .9 },
  kanpachi: { tempo: 1.12, run: 1, dart: .16, bob: 1, tilt: 1 },
  kue: { tempo: .68, run: 1.05, dart: 0, bob: 1.05, tilt: .7 },
});

// The swipe changes the impact of a reel, never the amount of battle progress.
export const reelImpulse = distance => .65 + clamp((distance - 34) / 90, 0, 1) * .7;

// Only a deliberate downward stroke charges the reel. Sideways movement can
// still be corrected before release, so the preview always matches the input.
export const verticalPull = (dx, dy) => dy > 0 && dy >= Math.abs(dx) * 1.25 ? dy : 0;

// Keep the held control's color and instruction consistent with the battle cue.
export function pullGuidance(cue, pull, keyboard = false) {
  const ready = pull >= 34;
  if (cue === 'rage') return {
    color: '#ff976c',
    hint: pull > 8 ? keyboard ? 'Escで中止。離すと危険' : '上へ戻して、離す' : '暴れが収まるまで待とう',
    shortRelease: '魚が暴れてる。待とう',
  };
  if (cue === 'warning') return {
    color: '#ffd18a',
    hint: ready ? 'いま離して巻く！' : pull > 8 ? keyboard ? 'いま離すか、Escで中止' : 'いま離すか、上へ戻す' : '走りそう。指を止めよう',
    shortRelease: '走りそう。手を止めよう',
  };
  return {
    color: cue === 'opening' ? '#a9fff1' : ready ? '#b6fff0' : '#75d5ff',
    hint: ready ? cue === 'opening' ? 'いま離して巻く！' : '離して巻く！' : pull > 8 ? '下へ引いて、離す' : cue === 'opening' ? 'いま、下へスワイプ！' : '下へスワイプして巻く',
    shortRelease: 'もう少し下へ引こう',
  };
}

// Escape pressure lingers after a run until the player has brought it down.
export const escapePressure = state => state.outcome ? 0 : clamp((state.escape - 55) / 45, 0, 1);

// Report the state change produced by the reel, including a capped final pull.
export function reelReadout(event, before, after) {
  if (event === 'badReel') {
    const amount = Math.round(after.escape - before.escape);
    return { label: `危険 +${amount}`, message: `糸が強く張った！ 危険 +${amount}`, danger: true };
  }
  const amount = Math.round(after.reel - before.reel);
  return {
    label: `+${amount}%`,
    message: `${event === 'goodOpening' ? 'ゆるんだ糸を引き寄せた！' : '少し近づいた'} +${amount}%`,
    danger: false,
  };
}

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

// The same battle clock colors the water edge and line: rising strain before
// a run, sustained danger during it, and a brief cool opening afterward.
export function phaseAtmosphere(state, cue) {
  if (state.outcome) return { color: '#8feedd', edge: 0, line: 0 };
  if (cue === 'warning') {
    const progress = timingWindow(state, cue).fraction;
    return { color: '#ffad6b', edge: .12 + progress * .32, line: .16 + progress * .42 };
  }
  if (cue === 'rage') {
    const danger = clamp(state.escape / 100, 0, 1);
    return { color: '#ff806a', edge: .22 + danger * .28, line: .32 + danger * .23 };
  }
  if (cue === 'opening') {
    const remaining = timingWindow(state, cue).fraction;
    return { color: '#8feedd', edge: .12 + remaining * .2, line: .2 + remaining * .28 };
  }
  return { color: '#8feedd', edge: 0, line: 0 };
}

// The line relaxes only while the fish leaves an opening. Holding the reel
// takes up some slack before release, without changing AINAN's battle rules.
export function lineShape(fish, cue, pull = 0, hand = { x: 146, y: 490 }) {
  const slack = Math.max(0, (cue === 'opening' ? 48 : cue === 'calm' ? 14 : cue === 'warning' ? 5 : 0) - pull * .22);
  // Transform the hook by the same scale and rotation as the fish sprite.
  const size = (fish.size ?? 1) * (fish.scale ?? 1), angle = fish.angle ?? 0;
  const hookX = -50 * size * (fish.facing ?? 1), hookY = 5 * size;
  const endX = fish.fishX + 70 + hookX * Math.cos(angle) - hookY * Math.sin(angle);
  const endY = fish.fishY + 40 + hookX * Math.sin(angle) + hookY * Math.cos(angle);
  return {
    startX: hand.x, startY: hand.y, endX, endY, slack,
    c1x: hand.x - slack, c1y: hand.y - 53 + slack * .28,
    c2x: endX - slack * .85, c2y: endY + 57 + slack * .4,
  };
}

// Pivot around the fisher's feet; transform the hand by the same pose so the
// fishing line stays attached while the character braces or recoils.
export function fisherPose(cue, { pull = 0, impact = '', flash = 0, strength = 1, reduced = false } = {}) {
  const held = clamp(pull / 110, 0, 1);
  const hit = clamp(flash / .35, 0, 1);
  const recoil = (impact === 'badReel' ? hit : impact === 'goodReel' || impact === 'goodOpening' ? -hit : 0) * strength;
  const angle = reduced ? 0 : clamp((cue === 'rage' ? .035 : cue === 'warning' ? .015 : 0) - held * .07 + recoil * .055, -.095, .09);
  const anchorX = 100 + (reduced ? 0 : -held * 4 + recoil * 5);
  const anchorY = 627 + (reduced ? 0 : held * 3 + (cue === 'rage' ? 2 : 0) + Math.abs(recoil) * 2);
  return {
    anchorX, anchorY, angle,
    handX: anchorX + 46 * Math.cos(angle) + 137 * Math.sin(angle),
    handY: anchorY + 46 * Math.sin(angle) - 137 * Math.cos(angle),
  };
}

// Canvas-space pose. Visual pull and recoil never change the battle state.
export function battlePose(state, cue, seconds, { reduced = false, pull = 0, tension = interactionFeedback(state, pull).tension, impact = '', flash = 0, strength = 1 } = {}) {
  const fish = FISH[state.fishId];
  const fishSize = FISH_VISUAL_SIZE[state.fishId];
  const swim = FISH_SWIM[state.fishId];
  const rage = cue === 'rage', warning = cue === 'warning', opening = cue === 'opening';
  const speed = (rage ? 5 + fish.speed * 2 : warning ? 3.8 : 2.6) * swim.tempo;
  const run = (rage ? 12 + fish.speed * 12 : warning ? 5 + fish.speed * 3 : 3) * swim.run;
  const phase = seconds * speed;
  const wave = reduced ? 0 : (Math.sin(phase) + swim.dart * Math.sin(phase * 2)) / (1 + swim.dart);
  const swimVelocity = reduced ? 0 : run * speed * (Math.cos(phase) + 2 * swim.dart * Math.cos(phase * 2)) / (1 + swim.dart);
  const distance = clamp(state.reel - 48, 0, 52);
  const proximity = distance / 52;
  const retreat = clamp((state.escape - 55) / 45, 0, 1);
  const handPull = clamp(pull, 0, 110) * .13;
  const recoil = reduced ? 0 : clamp(flash, 0, .35) * (impact === 'badReel' ? 52 : impact ? -48 : 0) * strength;
  const fishX = 176 - distance * .7 + wave * run + retreat * 22 - handPull + recoil;
  const fishY = 305 + distance * 1.05 - retreat * 22 + (reduced ? 0 : Math.sin(seconds * (rage ? 7 : 4)) * (rage ? 12 + fish.speed * 2 : 3) * swim.bob) + handPull * .72 - recoil * .28;
  return {
    fishX, fishY, fishSize: fishSize * (1 + proximity * .18 - retreat * .09), proximity, retreat,
    facing: rage && !reduced && swimVelocity > 0 ? -1 : 1,
    angle: reduced ? 0 : wave * (rage ? .1 : warning ? .045 : .017) * swim.tilt + (impact === 'badReel' ? .08 : impact ? -.06 : 0) * clamp(flash / .35, 0, 1) * strength,
    ringWidth: (rage ? 128 + fish.strength * 4 : warning ? 124 : opening ? 107 : 118) + tension * 9 + (fishSize - 1) * 32 + proximity * 16 - retreat * 8,
    ringHeight: (rage ? 52 : warning ? 47 : opening ? 38 : 43) + tension * 4 + (fishSize - 1) * 11 + proximity * 6 - retreat * 3,
    lineControlX: opening ? 173 : rage || warning ? 154 : 160,
    lineControlY: opening ? 425 : rage || warning ? 383 : 400,
    pull: handPull,
    tension,
    run, swimVelocity,
  };
}

export function surfaceResponse(pose, cue, { impact = '', flash = 0, strength = 1, reduced = false } = {}) {
  const wake = reduced || cue !== 'rage' ? 0 : clamp(Math.abs(pose.swimVelocity) / 450, 0, 1);
  const splash = reduced ? 0 : clamp(flash / .35, 0, 1);
  return {
    wake,
    direction: Math.sign(pose.swimVelocity) || 1,
    splash,
    impactScale: splash ? strength : 1,
    color: impact === 'badReel' ? '#ffd4a3' : '#c9fff5',
  };
}

export function outcomePose(pose, outcome, progress) {
  const p = clamp(progress, 0, 1), ease = 1 - (1 - p) ** 3;
  if (outcome === 'caught') return {
    fishX: pose.fishX + (90 - pose.fishX) * ease,
    fishY: pose.fishY + (410 - pose.fishY) * ease - Math.sin(Math.PI * p) * 65,
    angle: pose.angle - .32 * ease,
    facing: pose.facing,
    size: pose.fishSize,
    scale: 1 + Math.sin(Math.PI * p) * .18,
    alpha: 1,
  };
  if (outcome === 'escaped') return {
    fishX: pose.fishX + 125 * ease,
    fishY: pose.fishY - 25 * ease,
    angle: pose.angle + .14 * ease,
    facing: pose.facing,
    size: pose.fishSize,
    scale: 1,
    alpha: 1 - p,
  };
  return { fishX: pose.fishX, fishY: pose.fishY, angle: pose.angle, facing: pose.facing, size: pose.fishSize, scale: 1, alpha: 1 };
}

// Rotate through an edge-on silhouette instead of snapping the sprite at each
// change in swim direction. Reduced motion keeps the original stable facing.
export const easeFacing = (current, target, dt, reduced = false) => reduced ? 1 : current + (target - current) * (1 - Math.exp(-Math.max(0, dt) * 11));

// Camera offsets are in the 390x844 scene. Keep them small enough that the
// hooked fish and the fisher remain visible on the narrowest supported phone.
export function battleCamera(state, cue, pose, { pull = 0, outcomeProgress = 0, impact = '', flash = 0, strength = 1, reduced = false } = {}) {
  if (reduced) return { x: 0, y: 0, zoom: 1 };
  const held = clamp(pull / 110, 0, 1);
  const run = cue === 'rage' ? 1 : cue === 'warning' ? .45 : 0;
  // Move against the fish's displacement to keep the line's target in view.
  const fishOffset = clamp((176 - pose.fishX) * .26, -12, 12);
  const pressure = escapePressure(state);
  const hit = clamp(flash / .35, 0, 1);
  const reelKick = (impact === 'goodReel' || impact === 'goodOpening' ? -1 : impact === 'badReel' ? 1 : 0) * strength;
  if (state.outcome === 'caught') return { x: -10 * outcomeProgress, y: -17 * outcomeProgress, zoom: 1 + .055 * outcomeProgress };
  if (state.outcome === 'escaped') return { x: -20 * outcomeProgress, y: 3 * outcomeProgress, zoom: 1 - .035 * outcomeProgress };
  return {
    x: clamp(fishOffset - run * 9 + held * 5 + reelKick * hit * 7 - pressure * 5, -21, 18),
    y: run * 5 + held * 8 + reelKick * hit * 6 - pose.proximity * 6,
    zoom: 1 + held * .018 - run * .012 - reelKick * hit * .025 - pressure * .018 + pose.proximity * .018,
  };
}
