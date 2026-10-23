// DeviceMotion acceleration is in m/s². Ignore small hand tremors and use the
// vertical impulse for the toss; lateral impulse decides where the rice flies.
export function motionToss(acceleration) {
  const x = acceleration?.x, y = acceleration?.y, z = acceleration?.z;
  if (![x, y, z].every(Number.isFinite)) return null;
  const vertical = Math.abs(y);
  if (vertical < 3.2 || vertical < Math.abs(x) * 0.9 || vertical < Math.abs(z) * 0.65) return null;
  return {
    lift: Math.min(2, vertical / 8),
    lean: Math.max(-1.5, Math.min(1.5, x / Math.max(vertical, 1))),
  };
}

export function motionSteer(gamma, neutral) {
  if (!Number.isFinite(gamma) || !Number.isFinite(neutral)) return 0;
  return Math.max(-1, Math.min(1, (gamma - neutral) / 25));
}
