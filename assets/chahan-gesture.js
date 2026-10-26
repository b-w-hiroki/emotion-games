const clamp = value => Math.max(0, Math.min(1, value));

// A curved scoop from the outer rice toward the centre of the wok.
export function analyzeGather(points, width, height) {
  if (points.length < 4 || width <= 0 || height <= 0) return { valid: false, quality: 0, sweep: 0 };
  const scale = Math.min(width, height), centerX = width * .5, centerY = height * .58;
  const polar = ([x, y]) => ({ radius: Math.hypot(x - centerX, y - centerY) / scale, angle: Math.atan2(y - centerY, x - centerX) });
  const start = polar(points[0]), end = polar(points.at(-1));
  let sweep = 0, turns = 0, distance = 0;
  for (let i = 1; i < points.length; i++) {
    const previous = polar(points[i - 1]), current = polar(points[i]);
    distance += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]) / scale;
    if (previous.radius < .09 || current.radius < .09) continue;
    let delta = current.angle - previous.angle;
    if (delta > Math.PI) delta -= Math.PI * 2;
    if (delta < -Math.PI) delta += Math.PI * 2;
    sweep += delta; turns += Math.abs(delta);
  }
  const valid = start.radius >= .17 && end.radius <= .18 && Math.abs(sweep) >= 1.3 && Math.abs(sweep) / Math.max(.01, turns) >= .65 && distance >= .38;
  const quality = valid ? clamp(.45 + Math.min(1, Math.abs(sweep) / Math.PI) * .3 + clamp((.18 - end.radius) / .18) * .25) : 0;
  return { valid, quality, sweep };
}
