// Builds the painted runtime layers of 004「きえないで。」 from the master paintings in
// assets/kienaide/paint/src (art bible: assets/kienaide-v3/snow-town.webp + traveller-flame.webp).
// Re-run with `node scripts/art/kienaide-paint.mjs`; output goes to assets/kienaide/paint/.
//
// Per chapter: sky / far / mid / fore bands (feathered alpha, so they can move with parallax) and a
// lights layer that holds only the warm window/lamp light, extracted additively: base + lights == original.
// Traveller: cut out from a flat backdrop, a separate hand patch (drawn over the flame when shielding)
// and a white rim mask the game tints with the flame's colour and strength. No fire is baked anywhere.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const src = path.resolve('assets/kienaide/paint/src');
const out = path.resolve('assets/kienaide/paint');
const PW = 900, PH = 1200; // every chapter plate is normalised to 3:4

// Where each chapter's bands meet (in plate pixels) and how the master is framed into 900x1200.
const CHAPTERS = {
  ch1: { cropTop: 250, sky: 330, far: 560, fore: 1010 },
  ch2: { cropTop: 0, sky: 300, far: 620, fore: 1000 },
  ch3: { cropTop: 0, sky: 360, far: 560, fore: 1010 },
  ch4: { cropTop: 0, sky: 420, far: 640, fore: 1020 }
};
const FEATHER = 70;

async function plate(name, cropTop) {
  const meta = await sharp(path.join(src, name + '.webp')).metadata();
  const h = Math.round(meta.height * PW / meta.width);
  const top = Math.max(0, Math.min(h - PH, cropTop));
  return sharp(path.join(src, name + '.webp')).resize(PW, h).extract({ left: 0, top, width: PW, height: PH }).removeAlpha().raw().toBuffer();
}
const smooth = t => t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t);

async function chapter(name, c) {
  const rgb = await plate(name, c.cropTop);
  const base = Buffer.alloc(rgb.length), lights = Buffer.alloc(rgb.length);
  let warmPixels = 0;
  for (let i = 0; i < rgb.length; i += 3) {
    const r = rgb[i], g = rgb[i + 1], b = rgb[i + 2], lum = .3 * r + .59 * g + .11 * b;
    // Warm and bright = artificial light (windows, lamps, their glow on snow).
    const warm = smooth((r - b - 28) / 90) * smooth((lum - 70) / 110);
    if (warm > .2) warmPixels++;
    const k = 1 - .78 * warm;
    // The unlit base keeps the shape but cools the colour toward the night palette.
    const br = r * k * (1 - .4 * warm), bg = g * k * (1 - .32 * warm), bb = Math.min(255, b * k * (1 - .1 * warm) + 8 * warm);
    base[i] = br; base[i + 1] = bg; base[i + 2] = bb;
    lights[i] = Math.max(0, r - base[i]); lights[i + 1] = Math.max(0, g - base[i + 1]); lights[i + 2] = Math.max(0, b - base[i + 2]);
  }
  const bands = { sky: [0, c.sky], far: [c.sky, c.far], mid: [c.far, c.fore], fore: [c.fore, PH] };
  for (const [band, [y0, y1]] of Object.entries(bands)) {
    const rgba = Buffer.alloc(PW * PH * 4);
    for (let y = 0; y < PH; y++) {
      // Each band overlaps its neighbours by the feather so no seam opens while layers move.
      const a = (y0 === 0 ? 1 : smooth((y - y0 + FEATHER) / FEATHER)) * (y1 === PH ? 1 : smooth((y1 + FEATHER - y) / FEATHER));
      for (let x = 0; x < PW; x++) {
        const p = (y * PW + x), i = p * 3, o = p * 4;
        rgba[o] = base[i]; rgba[o + 1] = base[i + 1]; rgba[o + 2] = base[i + 2]; rgba[o + 3] = Math.round(255 * a);
      }
    }
    const top = Math.max(0, y0 - FEATHER), bottom = Math.min(PH, y1 + FEATHER);
    await sharp(rgba, { raw: { width: PW, height: PH, channels: 4 } }).extract({ left: 0, top, width: PW, height: bottom - top })
      .webp({ quality: 86, alphaQuality: 80 }).toFile(path.join(out, `${name}-${band}.webp`));
  }
  await sharp(lights, { raw: { width: PW, height: PH, channels: 3 } }).webp({ quality: 82 }).toFile(path.join(out, `${name}-lights.webp`));
  return { bands: Object.fromEntries(Object.entries(bands).map(([k, [y0, y1]]) => [k, { top: Math.max(0, y0 - FEATHER), bottom: Math.min(PH, y1 + FEATHER) }])), warmShare: +(warmPixels / (PW * PH)).toFixed(4) };
}

async function hero() {
  const { data, info } = await sharp(path.join(src, 'hero.webp')).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height, n = W * H;
  // Flat studio backdrop: flood-fill from the border with a colour tolerance, then soften the edge.
  const bg = [0, 0, 0]; let cnt = 0;
  for (let x = 0; x < W; x += 8) for (const y of [2, H - 3]) { const i = (y * W + x) * 3; bg[0] += data[i]; bg[1] += data[i + 1]; bg[2] += data[i + 2]; cnt++; }
  bg.forEach((v, k) => bg[k] = v / cnt);
  const dist = p => { const i = p * 3; return Math.hypot(data[i] - bg[0], data[i + 1] - bg[1], data[i + 2] - bg[2]); };
  const outside = new Uint8Array(n), stack = [];
  for (let x = 0; x < W; x++) { stack.push(x, (H - 1) * W + x); }
  for (let y = 0; y < H; y++) { stack.push(y * W, y * W + W - 1); }
  while (stack.length) {
    const p = stack.pop(); if (outside[p] || dist(p) > 13) continue; outside[p] = 1;
    const x = p % W, y = (p / W) | 0;
    if (x > 0) stack.push(p - 1); if (x < W - 1) stack.push(p + 1); if (y > 0) stack.push(p - W); if (y < H - 1) stack.push(p + W);
  }
  // Alpha: 0 outside, 1 inside, with a 2px soft edge; also remove the faint drop shadow tint.
  const alpha = new Float32Array(n);
  for (let p = 0; p < n; p++) alpha[p] = outside[p] ? 0 : 1;
  const blurred = new Float32Array(n);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let s = 0, c = 0; for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) { s += alpha[yy * W + xx]; c++; } }
    blurred[y * W + x] = Math.min(alpha[y * W + x] ? 1 : .0, s / c * 1.15);
  }
  let x0 = W, y0 = H, x1 = 0, y1 = 0;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (blurred[y * W + x] > .05) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); }
  const pad = 6; x0 = Math.max(0, x0 - pad); y0 = Math.max(0, y0 - pad); x1 = Math.min(W - 1, x1 + pad); y1 = Math.min(H - 1, y1 + pad);
  const cw = x1 - x0 + 1, ch = y1 - y0 + 1, rgba = Buffer.alloc(cw * ch * 4);
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const p = (y + y0) * W + (x + x0), i = p * 3, o = (y * cw + x) * 4;
    rgba[o] = data[i]; rgba[o + 1] = data[i + 1]; rgba[o + 2] = data[i + 2]; rgba[o + 3] = Math.round(255 * blurred[p]);
  }
  const scale = 900 / ch, outW = Math.round(cw * scale), outH = 900;
  await sharp(rgba, { raw: { width: cw, height: ch, channels: 4 } }).resize(outW, outH).webp({ quality: 90, alphaQuality: 90 }).toFile(path.join(out, 'hero-body.webp'));
  // Anchors measured on the master (1088x1456): mittens clasped at the chest.
  const toOut = (x, y) => ({ x: Math.round((x - x0) * scale), y: Math.round((y - y0) * scale) });
  const hands = { x: 585, y: 375, w: 150, h: 125 };
  const flame = toOut(655, 392);
  // Hand patch with an elliptical soft mask; drawn above the flame while shielding.
  const hp = Buffer.alloc(hands.w * hands.h * 4);
  for (let y = 0; y < hands.h; y++) for (let x = 0; x < hands.w; x++) {
    const p = (hands.y + y) * W + hands.x + x, i = p * 3, o = (y * hands.w + x) * 4;
    const e = Math.hypot((x - hands.w / 2) / (hands.w / 2), (y - hands.h / 2) / (hands.h / 2));
    hp[o] = data[i]; hp[o + 1] = data[i + 1]; hp[o + 2] = data[i + 2]; hp[o + 3] = Math.round(255 * blurred[p] * smooth((1 - e) / .35));
  }
  await sharp(hp, { raw: { width: hands.w, height: hands.h, channels: 4 } }).resize(Math.round(hands.w * scale), Math.round(hands.h * scale)).webp({ quality: 92, alphaQuality: 90 }).toFile(path.join(out, 'hero-hands.webp'));
  // Rim mask: the silhouette's outer edge, weighted toward the flame. White only; the game colours it.
  const rim = Buffer.alloc(cw * ch * 4), fx = 655 - x0, fy = 392 - y0;
  for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) {
    const p = (y + y0) * W + (x + x0); const a = blurred[p]; if (a <= 0) continue;
    let minA = 1; for (let d = 1; d <= 7; d += 2) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) { const xx = x + x0 + dx, yy = y + y0 + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) minA = Math.min(minA, blurred[yy * W + xx]); }
    const edge = a * (1 - minA), near = smooth(1 - Math.hypot(x - fx, (y - fy) * .8) / 420);
    // Also the front of the scarf and coat facing the flame (soft fill near the hands).
    const fill = a * smooth(1 - Math.hypot(x - fx, y - fy) / 150) * .55;
    const v = Math.min(1, edge * near * 1.6 + fill);
    const o = (y * cw + x) * 4; rim[o] = rim[o + 1] = rim[o + 2] = 255; rim[o + 3] = Math.round(255 * v);
  }
  await sharp(rim, { raw: { width: cw, height: ch, channels: 4 } }).resize(outW, outH).webp({ quality: 80, alphaQuality: 80 }).toFile(path.join(out, 'hero-rim.webp'));
  return { size: [outW, outH], flame, hands: { ...toOut(hands.x, hands.y), w: Math.round(hands.w * scale), h: Math.round(hands.h * scale) } };
}

fs.mkdirSync(out, { recursive: true });
const chapters = {};
for (const [name, c] of Object.entries(CHAPTERS)) chapters[name] = { ...c, ...(await chapter(name, c)) };
const traveller = await hero();
// The flame sprite is the art bible's own flame spirit.
await sharp('assets/kienaide-v3/flame-spirit.webp').webp({ quality: 92, alphaQuality: 92 }).toFile(path.join(out, 'flame.webp'));
const manifest = { generator: 'scripts/art/kienaide-paint.mjs', artBible: ['assets/kienaide-v3/snow-town.webp', 'assets/kienaide-v3/traveller-flame.webp', 'assets/kienaide-v3/flame-spirit.webp'],
  plate: [PW, PH], chapters, traveller, files: fs.readdirSync(out).filter(f => f.endsWith('.webp')).sort() };
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log('painted layers:', manifest.files.length, JSON.stringify(traveller));
