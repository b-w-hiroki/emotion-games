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
const characterSrc = path.join(src, 'repaint-v2');
const cleanPoses = ['hero-walk','hero-shield'];
const poseSource = name => path.join(src, cleanPoses.includes(name) ? 'clean-v1' : 'repaint-v2', name + '.png');
const out = path.resolve('assets/kienaide/paint');
const PW = 900, PH = 1200; // every chapter plate is normalised to 3:4
const POSES = ['hero-shield','hero-blink','hero-walk','hero-brace','hero-cold','hero-breathless','hero-relief','hero-lookup'];
const ENDINGS = ['end-blown','end-smother','end-wish','end-survive','end-dawn'];
const FLAMES = ['flame-calm','flame-afraid','flame-comfort','flame-suffocating','flame-hope'];

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
  const master = path.join(characterSrc, 'hero-body.png');
  if (!fs.existsSync(master)) throw new Error('missing character repaint source: ' + master);
  const HERO_W = 540, HERO_H = 720, DISPLAY_W = 675, DISPLAY_H = 900;
  const { data, info } = await sharp(master).resize(HERO_W, HERO_H, { fit: 'fill' }).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const W = info.width, H = info.height;
  await sharp(data, { raw: info }).webp({ quality: 90, alphaQuality: 96 }).toFile(path.join(out, 'hero-body.webp'));
  // The runtime bitmap is smaller than its logical display coordinate space. This preserves the
  // on-screen size while keeping WebKit's tinted-body and rim composites below the original cost.
  const handsPx = { x: 295, y: 175, w: 98, h: 78 };
  const hands = { x: 369, y: 219, w: 123, h: 98 };
  const flamePx = { x: 342, y: 210 }, flame = { x: 428, y: 263 };
  // Hand patch remains available to the intro/fallback renderer, cut from the same repaint.
  const hp = Buffer.from(await sharp(data, { raw: info }).extract({ left: handsPx.x, top: handsPx.y, width: handsPx.w, height: handsPx.h }).raw().toBuffer());
  for (let y = 0; y < handsPx.h; y++) for (let x = 0; x < handsPx.w; x++) {
    const o = (y * handsPx.w + x) * 4, e = Math.hypot((x - handsPx.w / 2) / (handsPx.w / 2), (y - handsPx.h / 2) / (handsPx.h / 2));
    hp[o + 3] = Math.round(hp[o + 3] * smooth((1 - e) / .35));
  }
  await sharp(hp, { raw: { width: handsPx.w, height: handsPx.h, channels: 4 } }).webp({ quality: 92, alphaQuality: 96 }).toFile(path.join(out, 'hero-hands.webp'));
  // Rim mask: the silhouette's outer edge, weighted toward the flame. White only; the game colours it.
  const rim = Buffer.alloc(W * H * 4), fx = flamePx.x, fy = flamePx.y;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const p = y * W + x, a = data[p * 4 + 3] / 255; if (a <= 0) continue;
    let minA = 1; for (let d = 1; d <= 7; d += 2) for (const [dx, dy] of [[d, 0], [-d, 0], [0, d], [0, -d]]) { const xx = x + dx, yy = y + dy; if (xx >= 0 && yy >= 0 && xx < W && yy < H) minA = Math.min(minA, data[(yy * W + xx) * 4 + 3] / 255); }
    const edge = a * (1 - minA), near = smooth(1 - Math.hypot(x - fx, (y - fy) * .8) / 420);
    // Also the front of the scarf and coat facing the flame (soft fill near the hands).
    const fill = a * smooth(1 - Math.hypot(x - fx, y - fy) / 150) * .55;
    const v = Math.min(1, edge * near * 1.6 + fill);
    const o = p * 4; rim[o] = rim[o + 1] = rim[o + 2] = 255; rim[o + 3] = Math.round(255 * v);
  }
  await sharp(rim, { raw: { width: W, height: H, channels: 4 } }).webp({ quality: 80, alphaQuality: 88 }).toFile(path.join(out, 'hero-rim.webp'));
  return { size: [DISPLAY_W, DISPLAY_H], flame, hands, bitmap: [HERO_W, HERO_H] };
}

// ChatGPT-painted additions are kept as high-quality masters in paint/src. Character repaint-v2
// lives beside (rather than overwriting) the first pass, so the art direction remains reversible.
// Poses share a fixed transparent 3:4 canvas instead of being individually trimmed: that preserves
// the feet/ground line and keeps the kneeling ending physically shorter than the standing poses.
async function additions(chapters) {
  const generated = [];
  const copy = async (sourceName, outputName, options = {}) => {
    const input = path.join(src, sourceName + '.webp');
    if (!fs.existsSync(input)) throw new Error('missing generated art source: ' + input);
    let image = sharp(input);
    if (options.width && options.height) image = image.resize(options.width, options.height, { fit: 'fill' });
    await image.webp({ quality: options.quality || 90, alphaQuality: options.alphaQuality || 94 }).toFile(path.join(out, outputName + '.webp'));
    generated.push(outputName + '.webp');
  };

  await copy('intro-room', 'intro-room', { width: PW, height: PH, quality: 91 });
  // Desaturate and soften the transparent frost wash so cyan edge contamination never reaches play.
  await sharp(path.join(src, 'frost-edge.png')).resize(PW, PH, { fit: 'fill' }).modulate({ saturation: .18, brightness: .82 }).blur(.45)
    .webp({ quality: 84, alphaQuality: 94 }).toFile(path.join(out, 'frost-edge.webp'));
  generated.push('frost-edge.webp');
  for (const name of [...POSES, ...ENDINGS]) {
    const input = poseSource(name);
    if (!fs.existsSync(input)) throw new Error('missing character repaint source: ' + input);
    await sharp(input).resize(PW, PH, { fit: 'fill' })
      .webp({ quality: 90, alphaQuality: 96 }).toFile(path.join(out, name + '.webp'));
    generated.push(name + '.webp');
  }
  for (const name of FLAMES) await copy(name, name, { width: 384, height: 384, quality: 92, alphaQuality: 98 });
  for (const chapter of Object.keys(chapters)) {
    fs.copyFileSync(path.join(out, chapter + '-fore.webp'), path.join(out, chapter + '-basefore.webp'));
    chapters[chapter].baseFore = chapters[chapter].bands.fore;
    await copy('fore-' + chapter, chapter + '-fore', { width: PW, height: PH, quality: 90, alphaQuality: 96 });
    chapters[chapter].bands.fore = { top: 0, bottom: PH };
    chapters[chapter].paintedForeground = true;
  }
  return generated;
}

fs.mkdirSync(out, { recursive: true });
const chapters = {};
for (const [name, c] of Object.entries(CHAPTERS)) chapters[name] = { ...c, ...(await chapter(name, c)) };
const traveller = await hero();
// The flame sprite is the art bible's own flame spirit.
await sharp('assets/kienaide-v3/flame-spirit.webp').webp({ quality: 92, alphaQuality: 92 }).toFile(path.join(out, 'flame.webp'));
const generated = await additions(chapters);
const manifest = { generator: 'scripts/art/kienaide-paint.mjs', artBible: ['assets/kienaide-v3/snow-town.webp', 'assets/kienaide-v3/traveller-flame.webp', 'assets/kienaide-v3/flame-spirit.webp'],
  characterArtVersion: 'repaint-v2',
  characterCleanup: { version: 'clean-v1', sources: cleanPoses.map(name => `clean-v1/${name}.png`), note: 'Noise cleanup only; original repaint-v2 masters retained.' },
  characterSources: ['repaint-v2/hero-body.png', ...POSES.map(name => `${cleanPoses.includes(name) ? 'clean-v1' : 'repaint-v2'}/${name}.png`), ...ENDINGS.map(name => `repaint-v2/${name}.png`)],
  generatedSources: ['intro-room', 'frost-edge', ...POSES, ...ENDINGS, ...FLAMES, ...Object.keys(chapters).map(c => 'fore-' + c)],
  plate: [PW, PH], chapters, traveller, generated, files: fs.readdirSync(out).filter(f => f.endsWith('.webp')).sort() };
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log('painted layers:', manifest.files.length, JSON.stringify(traveller));
await import('./kienaide-avif.mjs');
