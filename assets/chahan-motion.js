// DeviceMotion acceleration is in m/s². Positive Z points out of the screen,
// toward the player: the same direction as pulling the wok toward oneself.
export function motionToss(acceleration) {
  const x = acceleration?.x, y = acceleration?.y, z = acceleration?.z;
  if (![x, y, z].every(Number.isFinite)) return null;
  const pull = z;
  if (pull < 3.2 || pull < Math.abs(x) * 0.9 || pull < Math.abs(y) * 0.65) return null;
  return {
    lift: Math.min(2, pull / 8),
    lean: Math.max(-1.5, Math.min(1.5, x / Math.max(pull, 1))),
  };
}

export function motionSteer(gamma, neutral) {
  if (!Number.isFinite(gamma) || !Number.isFinite(neutral)) return 0;
  return Math.max(-1, Math.min(1, (gamma - neutral) / 25));
}
