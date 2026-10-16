// Generates the layered vector art for 004「きえないで。」.
// Re-run with `node scripts/art/kienaide-art.mjs` after editing; output goes to assets/kienaide/.
// Contract (Issue #27): every chapter is split into sky / far / mid / fore / lights layers,
// the traveller and the flame are never painted into a background, and all light sources
// live in their own layer so the game can dim, flicker or answer with them at runtime.
import fs from 'node:fs';
import path from 'node:path';

const out = path.resolve('assets/kienaide');
fs.mkdirSync(out, { recursive: true });

function rng(seed) {
  return () => {
    seed |= 0; seed = seed + 0x6d2b79f5 | 0;
    let t = Math.imul(seed ^ seed >>> 15, 1 | seed);
    t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
const f = n => Math.round(n * 10) / 10;
const svg = (w, h, label, body, defs = '') =>
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w * 2}" height="${h * 2}" role="img" aria-label="${label}">` +
  (defs ? `<defs>${defs}</defs>` : '') + body + '</svg>\n';
const write = (name, text) => fs.writeFileSync(path.join(out, name), text);

const S = 480; // every background layer is a 480x480 square; the game crops the centre.
const VP = { x: 240, y: 252 }; // shared vanishing point keeps camera height identical across chapters.

// ---------- shared painters ----------
function stars(r, n, maxY, alpha = .7) {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = r() * S, y = r() * maxY, rad = r() < .12 ? 1.3 : .7;
    s += `<circle cx="${f(x)}" cy="${f(y)}" r="${rad}" fill="#e8eefc" opacity="${f(alpha * (.25 + r() * .75) * 100) / 100}"/>`;
  }
  return s;
}
function skyLayer(id, stops, moon, extra = '') {
  const defs = `<linearGradient id="${id}s" x1="0" y1="0" x2="0" y2="1">${stops.map(([o, c]) => `<stop offset="${o}" stop-color="${c}"/>`).join('')}</linearGradient>` +
    (moon ? `<radialGradient id="${id}m"><stop offset="0" stop-color="${moon.color}" stop-opacity=".55"/><stop offset=".25" stop-color="${moon.color}" stop-opacity=".18"/><stop offset="1" stop-color="${moon.color}" stop-opacity="0"/></radialGradient>` : '');
  let body = `<rect width="${S}" height="${S}" fill="url(#${id}s)"/>`;
  if (moon) body += `<circle cx="${moon.x}" cy="${moon.y}" r="${moon.halo}" fill="url(#${id}m)"/><circle cx="${moon.x}" cy="${moon.y}" r="${moon.r}" fill="${moon.disc}" opacity="${moon.opacity ?? .9}"/>`;
  return svg(S, S, 'sky', body + extra, defs);
}
// A roof line of distant houses with chimneys, used as the far plane.
function skyline(r, y0, color, snow, opts = {}) {
  let d = `M0 ${S}L0 ${y0}`, x = 0, caps = '', dots = '';
  while (x < S) {
    const w = 18 + r() * 34, h = 8 + r() * (opts.tall ?? 26), peak = r() < .55;
    const top = y0 - h;
    if (peak) { d += `L${f(x)} ${f(top + 6)}L${f(x + w / 2)} ${f(top - 6)}L${f(x + w)} ${f(top + 6)}`; caps += `<path d="M${f(x)} ${f(top + 6)}L${f(x + w / 2)} ${f(top - 6)}L${f(x + w)} ${f(top + 6)}" stroke="${snow}" stroke-width="1.6" fill="none" opacity=".55"/>`; }
    else { d += `L${f(x)} ${f(top)}L${f(x + w)} ${f(top)}`; caps += `<path d="M${f(x)} ${f(top)}H${f(x + w)}" stroke="${snow}" stroke-width="1.4" opacity=".45"/>`; }
    if (r() < .35) { const cx = x + w * (.2 + r() * .5); d += ''; caps += `<rect x="${f(cx)}" y="${f(top - 9)}" width="3.5" height="10" fill="${color}"/>`; }
    if (opts.windows && r() < .5) dots += `<rect x="${f(x + w * .3)}" y="${f(top + 10)}" width="3" height="4" fill="#d9ad6c" opacity="${f((.25 + r() * .5) * 100) / 100}"/>`;
    x += w;
  }
  d += `L${S} ${S}Z`;
  return `<path d="${d}" fill="${color}"/>` + caps + dots;
}
// A front-facing house flat, like theatre scenery, placed along the road.
function house(r, { x, base, w, h, roof = .45, wall, trim, snow = '#e9eef6', windows = [], door = true, scale = 1 }) {
  const top = base - h, roofH = w * roof * .5;
  let s = `<g>`;
  s += `<rect x="${f(x)}" y="${f(top)}" width="${f(w)}" height="${f(h)}" fill="${wall}"/>`;
  // timber / plank texture
  for (let i = 1; i < 6; i++) s += `<path d="M${f(x)} ${f(top + h * i / 6)}H${f(x + w)}" stroke="${trim}" stroke-width="${f(.6 * scale)}" opacity=".35"/>`;
  s += `<path d="M${f(x - w * .08)} ${f(top + 2)}L${f(x + w / 2)} ${f(top - roofH)}L${f(x + w * 1.08)} ${f(top + 2)}Z" fill="${trim}"/>`;
  s += `<path d="M${f(x - w * .1)} ${f(top + 3)}Q${f(x + w * .2)} ${f(top - roofH * .45)} ${f(x + w / 2)} ${f(top - roofH - 2)}Q${f(x + w * .8)} ${f(top - roofH * .45)} ${f(x + w * 1.1)} ${f(top + 3)}L${f(x + w * 1.06)} ${f(top + 6 * scale)}Q${f(x + w * .5)} ${f(top - roofH + 7 * scale)} ${f(x - w * .06)} ${f(top + 6 * scale)}Z" fill="${snow}" opacity=".92"/>`;
  // icicles
  for (let i = 0; i < 6; i++) { const ix = x + w * (.05 + i * .17 + r() * .05), len = (3 + r() * 6) * scale; s += `<path d="M${f(ix - 1.2 * scale)} ${f(top + 5 * scale)}L${f(ix)} ${f(top + 5 * scale + len)}L${f(ix + 1.2 * scale)} ${f(top + 5 * scale)}Z" fill="#cfe3f2" opacity=".7"/>`; }
  for (const win of windows) {
    const wx = x + w * win.u, wy = top + h * win.v, ww = w * (win.w ?? .22), wh = h * (win.h ?? .2);
    s += `<rect x="${f(wx - 1.5 * scale)}" y="${f(wy - 1.5 * scale)}" width="${f(ww + 3 * scale)}" height="${f(wh + 3 * scale)}" fill="${trim}"/>`;
    s += `<rect x="${f(wx)}" y="${f(wy)}" width="${f(ww)}" height="${f(wh)}" fill="${win.lit ? '#f4c27a' : '#1a2436'}"/>`;
    if (win.lit) s += `<rect x="${f(wx)}" y="${f(wy + wh * .55)}" width="${f(ww)}" height="${f(wh * .45)}" fill="#e39a55" opacity=".55"/>`;
    s += `<path d="M${f(wx + ww / 2)} ${f(wy)}V${f(wy + wh)}M${f(wx)} ${f(wy + wh / 2)}H${f(wx + ww)}" stroke="${trim}" stroke-width="${f(1.2 * scale)}"/>`;
    s += `<path d="M${f(wx - 2 * scale)} ${f(wy + wh + 1.5 * scale)}h${f(ww + 4 * scale)}" stroke="${snow}" stroke-width="${f(2.2 * scale)}" stroke-linecap="round"/>`;
  }
  if (door) { const dw = w * .2, dx = x + w * .62; s += `<rect x="${f(dx)}" y="${f(base - h * .34)}" width="${f(dw)}" height="${f(h * .34)}" rx="${f(dw / 2)}" ry="${f(dw / 3)}" fill="#141b29" stroke="${trim}" stroke-width="${f(scale)}"/>`; }
  s += `<path d="M${f(x - 4 * scale)} ${f(base)}Q${f(x + w / 2)} ${f(base - 7 * scale)} ${f(x + w + 4 * scale)} ${f(base)}Z" fill="${snow}" opacity=".85"/>`;
  return s + '</g>';
}
function lamp(x, base, h, scale, color = '#0c121d', lit = true) {
  const top = base - h;
  return `<g><path d="M${f(x)} ${f(base)}V${f(top + 6 * scale)}" stroke="${color}" stroke-width="${f(2.6 * scale)}"/>` +
    `<path d="M${f(x - 5 * scale)} ${f(top + 6 * scale)}h${f(10 * scale)}l${f(-2 * scale)} ${f(-12 * scale)}h${f(-6 * scale)}Z" fill="${lit ? '#f8d08c' : '#2a3447'}" stroke="${color}" stroke-width="${f(1.4 * scale)}"/>` +
    `<path d="M${f(x - 6 * scale)} ${f(top - 6 * scale)}h${f(12 * scale)}l${f(-6 * scale)} ${f(-6 * scale)}Z" fill="${color}"/>` +
    `<path d="M${f(x - 6.5 * scale)} ${f(top - 6.5 * scale)}h${f(13 * scale)}" stroke="#e9eef6" stroke-width="${f(1.8 * scale)}" stroke-linecap="round"/></g>`;
}
function glow(x, y, r, color, alpha, id) {
  return { def: `<radialGradient id="${id}"><stop offset="0" stop-color="${color}" stop-opacity="${alpha}"/><stop offset=".35" stop-color="${color}" stop-opacity="${f(alpha * .38 * 100) / 100}"/><stop offset="1" stop-color="${color}" stop-opacity="0"/></radialGradient>`, body: `<circle cx="${f(x)}" cy="${f(y)}" r="${f(r)}" fill="url(#${id})"/>` };
}
function lightsLayer(name, sources) {
  let defs = '', body = '';
  sources.forEach((s, i) => { const g = glow(s.x, s.y, s.r, s.color || '#ffc36e', s.a ?? .7, name + i); defs += g.def; body += g.body; });
  return svg(S, S, 'light sources', body, defs);
}
function drifts(r, y, color, n = 7, amp = 16) {
  let d = `M0 ${S}L0 ${y}`;
  for (let i = 0; i <= n; i++) { const x = i * S / n; d += `Q${f(x - S / n / 2)} ${f(y - amp * (.4 + r()))} ${f(x)} ${f(y + (r() - .5) * amp * .4)}`; }
  return `<path d="${d}L${S} ${S}Z" fill="${color}"/>`;
}
function snowSpecks(r, n, y0, y1, alpha = .5) {
  let s = '';
  for (let i = 0; i < n; i++) s += `<circle cx="${f(r() * S)}" cy="${f(y0 + r() * (y1 - y0))}" r="${f(.5 + r() * 1.1)}" fill="#ffffff" opacity="${f(alpha * r() * 100) / 100}"/>`;
  return s;
}
// Road in perspective: from the bottom edge to the shared vanishing point.
function road(fill, edge, bottomL, bottomR, farHalf, y = VP.y + 6) {
  return `<path d="M${bottomL} ${S}L${VP.x - farHalf} ${y}L${VP.x + farHalf} ${y}L${bottomR} ${S}Z" fill="${fill}"/>` +
    `<path d="M${bottomL} ${S}L${VP.x - farHalf} ${y}M${bottomR} ${S}L${VP.x + farHalf} ${y}" stroke="${edge}" stroke-width="2" opacity=".6"/>`;
}
function cobbles(r, color, bottomL, bottomR, farHalf, rows = 16) {
  let s = '';
  for (let i = 0; i < rows; i++) {
    const t = Math.pow(i / rows, 1.8), y = VP.y + 8 + t * (S - VP.y - 8);
    const l = VP.x - farHalf + (bottomL - (VP.x - farHalf)) * t, rr = VP.x + farHalf + (bottomR - (VP.x + farHalf)) * t;
    const n = 4 + Math.round(t * 9);
    for (let k = 0; k < n; k++) {
      const x = l + (rr - l) * (k + .5 + (i % 2) * .4) / (n + .4), w = (rr - l) / n * .38, h = 1 + t * 6;
      s += `<ellipse cx="${f(x)}" cy="${f(y)}" rx="${f(w)}" ry="${f(h)}" fill="${color}" opacity="${f((.18 + r() * .2) * 100) / 100}"/>`;
    }
  }
  return s;
}

// ---------- chapter 1: 雪の路地 ----------
function chapter1() {
  const r = rng(11);
  write('ch1-sky.svg', skyLayer('c1', [[0, '#070d1d'], [.45, '#142037'], [.62, '#24324c'], [1, '#2c3a55']],
    { x: 370, y: 78, r: 13, halo: 120, color: '#c9d8f2', disc: '#e7eefb' }, stars(r, 80, 230)));
  write('ch1-far.svg', svg(S, S, 'distant roofs',
    skyline(r, 238, '#1a2538', '#c9d5e6', { windows: true, tall: 30 }) + skyline(r, 256, '#141d2e', '#b8c6da', { tall: 18 })));
  const midLights = [];
  let mid = '';
  // Left side: three houses receding toward the vanishing point.
  const left = [
    { x: 0, base: 372, w: 132, h: 210, wall: '#28344a', trim: '#151d2b', windows: [{ u: .12, v: .2, lit: true }, { u: .55, v: .2, lit: false }, { u: .12, v: .55, lit: true }] },
    { x: 118, base: 300, w: 66, h: 104, wall: '#2b3850', trim: '#172030', windows: [{ u: .15, v: .25, lit: true }, { u: .58, v: .25, lit: true }], door: false },
    { x: 178, base: 272, w: 36, h: 54, wall: '#2a374e', trim: '#18212f', windows: [{ u: .3, v: .3, lit: true }], door: false }
  ];
  const right = [
    { x: 350, base: 380, w: 140, h: 220, wall: '#253148', trim: '#131a28', windows: [{ u: .3, v: .18, lit: true }, { u: .3, v: .52, lit: false }, { u: .7, v: .52, lit: true }] },
    { x: 294, base: 304, w: 64, h: 110, wall: '#2c3a52', trim: '#172030', windows: [{ u: .2, v: .22, lit: false }, { u: .6, v: .22, lit: true }], door: false },
    { x: 264, base: 274, w: 34, h: 58, wall: '#29364c', trim: '#18212f', windows: [{ u: .35, v: .3, lit: true }], door: false }
  ];
  // Farther houses first so nearer ones overlap them.
  for (const hs of [left[2], right[2], left[1], right[1], left[0], right[0]]) {
    const scale = hs.w / 100;
    mid += house(r, { ...hs, scale });
    for (const win of hs.windows) if (win.lit) midLights.push({ x: hs.x + hs.w * (win.u + .11), y: (hs.base - hs.h) + hs.h * (win.v + .1), r: 30 * scale + 8, a: .55 });
  }
  write('ch1-mid.svg', svg(S, S, 'snowy alley houses', road('#3a4762', '#8c9bb2', 92, 388, 16) + cobbles(r, '#a9b6c9', 92, 388, 16) + mid));
  let fore = drifts(r, 430, '#c9d6e6', 6, 22) + drifts(r, 452, '#e3ebf4', 5, 14);
  fore += lamp(66, 448, 170, 1.6) + lamp(424, 452, 182, 1.7);
  // Snow-loaded eave and hanging shop sign in the top-left corner frame the view.
  fore += `<path d="M0 0H170L150 26Q90 40 0 34Z" fill="#101827"/><path d="M0 30Q80 40 152 24L156 34Q86 52 0 44Z" fill="#e8eef6"/>`;
  fore += `<path d="M118 36V70M146 36V70" stroke="#101827" stroke-width="2"/><rect x="108" y="68" width="48" height="26" rx="3" fill="#2a2228" stroke="#101827" stroke-width="2"/><path d="M110 70h44" stroke="#e8eef6" stroke-width="3" stroke-linecap="round"/><circle cx="132" cy="82" r="6" fill="none" stroke="#c99a5c" stroke-width="1.6"/>`;
  fore += snowSpecks(r, 60, 420, 480, .6);
  write('ch1-fore.svg', svg(S, S, 'foreground snow and lamps', fore));
  write('ch1-lights.svg', lightsLayer('l1', [...midLights, { x: 66, y: 286, r: 70, a: .7 }, { x: 424, y: 278, r: 74, a: .7 }]));
}

// ---------- chapter 2: 風のトンネル ----------
function chapter2() {
  const r = rng(23);
  write('ch2-sky.svg', skyLayer('c2', [[0, '#060b17'], [.5, '#101a2d'], [1, '#1d2940']], null, stars(r, 30, 120, .5)));
  // Far: the bright exit of the tunnel.
  const exit = `<radialGradient id="ex"><stop offset="0" stop-color="#7b8db0" stop-opacity=".8"/><stop offset="1" stop-color="#7b8db0" stop-opacity="0"/></radialGradient>`;
  write('ch2-far.svg', svg(S, S, 'tunnel exit', `<rect x="208" y="196" width="64" height="62" rx="30" fill="#33425e"/><circle cx="240" cy="230" r="70" fill="url(#ex)"/>` + skyline(r, 262, '#121a2b', '#9fb0c8', { tall: 10 }), exit));
  // Mid: receding stone arches. Each ring is drawn smaller toward the vanishing point.
  let mid = road('#2c3850', '#7d8ca6', 70, 410, 30) + cobbles(r, '#8796ae', 70, 410, 30, 14);
  const rings = 7;
  for (let i = rings - 1; i >= 0; i--) {
    const t = Math.pow(i / (rings - 1), 1.6), w = 74 + (500 - 74) * (1 - t), h = 74 + (470 - 74) * (1 - t);
    const cx = VP.x, base = VP.y + 8 + (S - VP.y - 8) * (1 - t), x0 = cx - w / 2, x1 = cx + w / 2, top = base - h;
    const thick = 4 + 22 * (1 - t), shade = ['#1a2335', '#1e283b', '#222d42', '#27334a', '#2b3851', '#2f3d58', '#33425f'][i];
    mid += `<path d="M${f(x0 - thick)} ${f(base)}V${f(top + w / 2)}A${f(w / 2 + thick)} ${f(w / 2 + thick)} 0 0 1 ${f(x1 + thick)} ${f(top + w / 2)}V${f(base)}H${f(x1)}V${f(top + w / 2)}A${f(w / 2)} ${f(w / 2)} 0 0 0 ${f(x0)} ${f(top + w / 2)}V${f(base)}Z" fill="${shade}"/>`;
    // keystones and bricks give the arch weight
    for (let k = 0; k < 9; k++) { const a = Math.PI + k * Math.PI / 8, rx = w / 2 + thick / 2; mid += `<path d="M${f(cx + Math.cos(a) * (w / 2))} ${f(top + w / 2 + Math.sin(a) * (w / 2))}L${f(cx + Math.cos(a) * (w / 2 + thick))} ${f(top + w / 2 + Math.sin(a) * (w / 2 + thick))}" stroke="#0f1522" stroke-width="${f(.5 + thick * .05)}" opacity=".7"/>`; void rx; }
    mid += `<path d="M${f(x0 - thick)} ${f(top + w / 2)}A${f(w / 2 + thick)} ${f(w / 2 + thick)} 0 0 1 ${f(x1 + thick)} ${f(top + w / 2)}" stroke="#dfe8f3" stroke-width="${f(1 + thick * .12)}" fill="none" opacity=".5"/>`;
  }
  // The shelter niche on the left: a deep alcove with a small lantern reads as "safe from the wind".
  mid += `<path d="M24 400V300Q24 262 62 262Q100 262 100 300V400Z" fill="#0d131f"/><path d="M24 300Q24 262 62 262Q100 262 100 300" stroke="#e1e9f3" stroke-width="3" fill="none" opacity=".55"/><rect x="34" y="370" width="56" height="10" fill="#3a3030"/><path d="M38 370v-14h48v14" stroke="#3a3030" stroke-width="3" fill="none"/>`;
  mid += lamp(62, 310, 26, .9, '#0c121d');
  write('ch2-mid.svg', svg(S, S, 'stone arcade', mid));
  let fore = drifts(r, 440, '#b9c7da', 5, 18) + drifts(r, 462, '#dce5f0', 6, 10);
  // Torn banners flap toward the right, showing the dominant wind direction.
  fore += `<path d="M430 40V150" stroke="#0c121d" stroke-width="4"/><path d="M430 50Q470 58 480 48V92Q462 102 430 92Z" fill="#6c3b45" opacity=".9"/><path d="M430 50Q470 58 480 48" stroke="#e8eef6" stroke-width="2" fill="none" opacity=".7"/>`;
  fore += `<path d="M0 0H480V22Q240 54 0 22Z" fill="#0e1421"/><path d="M0 20Q240 52 480 20" stroke="#dbe5f1" stroke-width="3" fill="none" opacity=".6"/>`;
  fore += snowSpecks(r, 50, 430, 480, .5);
  write('ch2-fore.svg', svg(S, S, 'tunnel foreground', fore));
  write('ch2-lights.svg', lightsLayer('l2', [{ x: 62, y: 290, r: 56, a: .75 }, { x: 240, y: 230, r: 60, color: '#9fb4d8', a: .35 }]));
}

// ---------- chapter 3: 凍った橋 ----------
function chapter3() {
  const r = rng(37);
  write('ch3-sky.svg', skyLayer('c3', [[0, '#050a17'], [.5, '#0f1a31'], [.7, '#1c2a46'], [1, '#22324f']],
    { x: 116, y: 96, r: 18, halo: 150, color: '#bcd3f5', disc: '#eaf2ff' }, stars(r, 110, 220, .8)));
  // Far bank: a row of houses with one patient window – the destination seen for the first time.
  let far = skyline(r, 232, '#152036', '#b7c7de', { tall: 14 });
  far += `<g>${house(r, { x: 276, base: 236, w: 30, h: 24, wall: '#1d2a40', trim: '#101827', windows: [{ u: .3, v: .3, lit: true, w: .3, h: .35 }], door: false, scale: .3 })}</g>`;
  far += `<rect x="0" y="236" width="${S}" height="40" fill="#1a2740"/>`;
  write('ch3-far.svg', svg(S, S, 'far river bank', far));
  // Mid: the frozen river surface with cracks and moonlight streak, plus the bridge deck in perspective.
  const ice = `<linearGradient id="ice" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2d4363"/><stop offset="1" stop-color="#14213a"/></linearGradient><linearGradient id="streak" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#cfe1fb" stop-opacity=".55"/><stop offset="1" stop-color="#cfe1fb" stop-opacity="0"/></linearGradient>`;
  let mid = `<rect x="0" y="262" width="${S}" height="${S - 262}" fill="url(#ice)"/><path d="M102 262L82 480H170L126 262Z" fill="url(#streak)" opacity=".7"/>`;
  for (let i = 0; i < 26; i++) { const x = r() * S, y = 270 + r() * 200; mid += `<path d="M${f(x)} ${f(y)}l${f(8 + r() * 20)} ${f(r() * 6 - 3)}l${f(6 + r() * 12)} ${f(r() * 8 - 2)}" stroke="#a9c3e2" stroke-width=".8" fill="none" opacity="${f((.25 + r() * .3) * 100) / 100}"/>`; }
  // Bridge deck: planks converge to the vanishing point.
  mid += `<path d="M120 ${S}L${VP.x - 22} ${VP.y + 4}L${VP.x + 22} ${VP.y + 4}L360 ${S}Z" fill="#3b4256"/>`;
  for (let i = 0; i < 18; i++) { const t = Math.pow(i / 18, 1.7), y = VP.y + 6 + t * (S - VP.y - 6), half = 22 + t * 120; mid += `<path d="M${f(VP.x - half)} ${f(y)}H${f(VP.x + half)}" stroke="#20263a" stroke-width="${f(.6 + t * 2.4)}"/>`; }
  mid += `<path d="M120 ${S}L${VP.x - 22} ${VP.y + 4}M360 ${S}L${VP.x + 22} ${VP.y + 4}" stroke="#d9e5f2" stroke-width="3" opacity=".7"/>`;
  // Railings with posts, frosted.
  for (const side of [-1, 1]) {
    let posts = '';
    for (let i = 0; i < 10; i++) { const t = Math.pow(i / 10, 1.6), y = VP.y + 4 + t * (S - VP.y - 4), x = VP.x + side * (24 + t * 150), h = 6 + t * 70; posts += `<path d="M${f(x)} ${f(y)}V${f(y - h)}" stroke="#141a28" stroke-width="${f(1 + t * 5)}"/><circle cx="${f(x)}" cy="${f(y - h)}" r="${f(.8 + t * 3)}" fill="#e3edf7"/>`; }
    const xb = VP.x + side * 174, yb = S - 70;
    posts += `<path d="M${VP.x + side * 24} ${VP.y - 2}L${f(xb)} ${f(yb)}" stroke="#141a28" stroke-width="5"/><path d="M${VP.x + side * 24} ${VP.y - 3}L${f(xb)} ${f(yb - 3)}" stroke="#e5eef8" stroke-width="2" opacity=".85"/>`;
    mid += posts;
  }
  write('ch3-mid.svg', svg(S, S, 'frozen bridge over the river', mid, ice));
  let fore = '';
  // Hanging icicles from a foreground beam and frost creeping in from the corners.
  fore += `<path d="M0 0H480V14H0Z" fill="#0d1320"/>`;
  for (let i = 0; i < 26; i++) { const x = i * 19 + r() * 8, len = 8 + r() * 30; fore += `<path d="M${f(x - 3)} 14L${f(x)} ${f(14 + len)}L${f(x + 3)} 14Z" fill="#cfe3f5" opacity="${f((.55 + r() * .4) * 100) / 100}"/>`; }
  fore += `<path d="M0 480V380Q30 400 46 440Q60 470 110 480Z" fill="#c9dbee" opacity=".75"/><path d="M480 480V370Q446 404 432 446Q420 470 370 480Z" fill="#c9dbee" opacity=".75"/>`;
  fore += snowSpecks(r, 40, 400, 480, .5);
  write('ch3-fore.svg', svg(S, S, 'frost and icicles', fore));
  write('ch3-lights.svg', lightsLayer('l3', [{ x: 287, y: 222, r: 26, a: .7 }, { x: 116, y: 96, r: 120, color: '#bcd3f5', a: .25 }]));
}

// ---------- chapter 4: 夜明け前 ----------
function chapter4() {
  const r = rng(41);
  write('ch4-sky.svg', skyLayer('c4', [[0, '#0b1430'], [.4, '#25325a'], [.62, '#5a5276'], [.78, '#a7798a'], [1, '#d8a483']],
    null, stars(r, 40, 150, .45)));
  let far = '';
  // Gentle hills and a lone tree line; the house sits on the near hill top.
  far += `<path d="M0 260Q120 214 240 238T480 222V480H0Z" fill="#2a2f4a"/>`;
  for (let i = 0; i < 18; i++) { const x = r() * S, base = 236 + r() * 20, h = 10 + r() * 16; far += `<path d="M${f(x)} ${f(base - h)}L${f(x - h * .35)} ${f(base)}H${f(x + h * .35)}Z" fill="#1d2238"/>`; }
  write('ch4-far.svg', svg(S, S, 'hills before dawn', far));
  // Mid: snow path winding up to the house with the waiting window.
  let mid = `<path d="M0 300Q140 262 300 280T480 270V480H0Z" fill="#3c4060"/>`;
  mid += `<path d="M150 ${S}Q210 380 236 330Q252 300 268 282L278 282Q268 310 262 340Q250 400 330 ${S}Z" fill="#b8bfd6"/>`;
  mid += `<path d="M150 ${S}Q210 380 236 330Q252 300 268 282M330 ${S}Q250 400 262 340Q268 310 278 282" stroke="#8d93ad" stroke-width="2" fill="none"/>`;
  // Fence posts along the path.
  for (let i = 0; i < 8; i++) { const t = i / 8, x = 120 + t * 130 + Math.sin(t * 3) * 10, y = S - t * 190, h = 34 * (1 - t * .8); mid += `<path d="M${f(x)} ${f(y)}V${f(y - h)}" stroke="#262a40" stroke-width="${f(5 - t * 4)}"/><path d="M${f(x - 2)} ${f(y - h)}h4" stroke="#eef1f8" stroke-width="2"/>`; }
  mid += house(r, { x: 250, base: 284, w: 92, h: 66, roof: .6, wall: '#2c2f48', trim: '#181b2d', windows: [{ u: .16, v: .28, lit: true, w: .26, h: .34 }], door: true, scale: .9 });
  mid += `<path d="M322 222v-24h10v30" fill="#181b2d"/><path d="M327 196q-6 -12 3 -20q-4 10 5 14" stroke="#9aa1bb" stroke-width="2" fill="none" opacity=".5"/>`;
  write('ch4-mid.svg', svg(S, S, 'path to the house', mid));
  let fore = drifts(r, 446, '#d6dae9', 6, 20) + drifts(r, 466, '#eef0f7', 5, 12);
  // Bare branches frame the upper right.
  fore += `<path d="M480 0V120Q450 96 430 60Q418 40 380 30Q410 30 430 44Q440 24 470 6" stroke="#141729" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M432 60Q404 70 388 92M452 92Q430 110 420 136" stroke="#141729" stroke-width="3.5" fill="none" stroke-linecap="round"/>`;
  fore += snowSpecks(r, 50, 430, 480, .5);
  write('ch4-fore.svg', svg(S, S, 'foreground drifts and branches', fore));
  // The window light is index 0 so the game can make it answer.
  write('ch4-lights.svg', lightsLayer('l4', [{ x: 280, y: 251, r: 46, a: .85 }]));
}

// ---------- intro: the room with the last hearth ----------
function intro() {
  const r = rng(53);
  let room = `<rect width="${S}" height="${S}" fill="#1a1416"/>`;
  room += `<rect x="0" y="0" width="${S}" height="330" fill="#2a2024"/>`;
  for (let i = 0; i < 16; i++) room += `<path d="M${i * 30 + 6} 0V330" stroke="#211a1d" stroke-width="2"/>`;
  room += `<rect x="0" y="330" width="${S}" height="150" fill="#3a2a26"/>`;
  for (let i = 0; i < 8; i++) room += `<path d="M0 ${340 + i * 18}H480" stroke="#2c201d" stroke-width="2"/>`;
  // Window on the left showing snowfall outside.
  room += `<rect x="40" y="70" width="110" height="140" fill="#101a2e" stroke="#4a3832" stroke-width="8"/><path d="M95 70V210M40 140H150" stroke="#4a3832" stroke-width="6"/>` + (() => { let s = ''; for (let i = 0; i < 24; i++) s += `<circle cx="${f(46 + r() * 98)}" cy="${f(76 + r() * 128)}" r="${f(.8 + r())}" fill="#dfe8f6" opacity=".7"/>`; return s; })();
  room += `<path d="M36 216h118" stroke="#e8eef6" stroke-width="5" stroke-linecap="round"/>`;
  // Stone hearth.
  room += `<path d="M250 330V150H430V330Z" fill="#4b3d3a"/><path d="M240 150H440V132H240Z" fill="#5e4b46"/>`;
  for (let row = 0; row < 7; row++) for (let k = 0; k < 6; k++) room += `<rect x="${252 + k * 30 + (row % 2) * 12}" y="${154 + row * 25}" width="26" height="21" rx="3" fill="#56463f" opacity=".7"/>`;
  room += `<path d="M290 330V240Q290 200 340 200Q390 200 390 240V330Z" fill="#120d0e"/>`;
  room += `<path d="M296 330l18 -14h52l18 14Z" fill="#2a1d1a"/><path d="M314 318l26 -8 26 8" stroke="#3c2a24" stroke-width="5"/>`;
  room += `<rect x="262" y="118" width="40" height="14" fill="#6e5b52"/><rect x="380" y="112" width="22" height="20" fill="#7a5c4a"/>`;
  write('intro-room.svg', svg(S, S, 'the last hearth', room));
  write('intro-lights.svg', lightsLayer('li', [{ x: 340, y: 300, r: 120, a: .6 }]));
}

// ---------- traveller: back view, split into body / hands / rim light ----------
function hero() {
  const W = 220, H = 280;
  const defs = `<linearGradient id="coat" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#3f4c66"/><stop offset=".5" stop-color="#253149"/><stop offset="1" stop-color="#121a2b"/></linearGradient>` +
    `<linearGradient id="hood" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#55617b"/><stop offset="1" stop-color="#28324a"/></linearGradient>` +
    `<linearGradient id="scarf" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#9c4e5a"/><stop offset="1" stop-color="#c2646c"/></linearGradient>`;
  let b = '';
  b += `<ellipse cx="104" cy="272" rx="70" ry="8" fill="#060a14" opacity=".45"/>`;
  // boots
  b += `<path d="M78 262q-2 12 12 12h14v-22z" fill="#1c1a22"/><path d="M114 254v20h16q12 0 8 -14z" fill="#1c1a22"/>`;
  // coat body (A-line), seen from behind
  b += `<path d="M64 120Q50 160 46 214Q42 252 58 262Q104 274 150 262Q164 252 158 210Q152 160 140 120Q104 106 64 120Z" fill="url(#coat)"/>`;
  b += `<path d="M102 124Q98 190 104 266" stroke="#121827" stroke-width="2.5" opacity=".7" fill="none"/>`;
  b += `<path d="M58 236Q104 250 152 236" stroke="#5f6d88" stroke-width="2" fill="none" opacity=".6"/><path d="M50 250Q104 266 156 250" stroke="#d9e3f0" stroke-width="3" fill="none" opacity=".35"/>`;
  // left arm hangs at side (right arm raised is in the hands layer)
  b += `<path d="M66 128Q46 150 42 192Q40 206 52 208Q62 206 64 192Q68 160 82 140Z" fill="#202b41"/>`;
  b += `<path d="M42 200q-2 12 8 12q10 0 10 -10z" fill="#7a3f48"/>`;
  // hood seen from behind with fur trim visible at the sides
  b += `<path d="M66 124Q54 84 74 56Q96 32 124 46Q150 62 146 100Q144 118 138 126Q104 138 66 124Z" fill="url(#hood)"/>`;
  b += `<path d="M76 62Q100 40 128 52" stroke="#8792ab" stroke-width="2" fill="none" opacity=".5"/><path d="M104 46Q100 90 104 128" stroke="#1e273a" stroke-width="2" fill="none" opacity=".6"/>`;
  b += `<path d="M66 122Q60 96 70 72M142 118Q150 92 138 66" stroke="#d6cdc4" stroke-width="5" stroke-linecap="round" fill="none" opacity=".75"/>`;
  // scarf wrapped at the neck; the loose tail is animated in code
  b += `<path d="M64 118Q104 136 144 118L146 132Q104 150 62 132Z" fill="url(#scarf)"/><path d="M66 124Q104 142 142 124" stroke="#e7a8a8" stroke-width="1.5" fill="none" opacity=".6"/>`;
  b += `<path d="M58 34Q104 14 150 34" stroke="#e8eef6" stroke-width="0" fill="none"/>`;
  write('hero-body.svg', svg(W, H, '雪道を歩く少女（後ろ姿）', b, defs));
  // Hands holding: right arm raised to the right shoulder, cupping the flame from below.
  const hd = `<linearGradient id="arm" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#2a3650"/><stop offset="1" stop-color="#18213a"/></linearGradient>`;
  let hold = `<path d="M138 130Q160 140 168 160Q172 172 164 178Q154 176 150 166Q144 152 130 146Z" fill="url(#arm)"/>`;
  hold += `<path d="M148 164Q160 176 178 172Q188 168 186 160Q172 164 160 158Z" fill="#8a4652"/><path d="M152 168Q166 176 182 168" stroke="#c97d84" stroke-width="1.4" fill="none"/>`;
  write('hero-hands-hold.svg', svg(W, H, '炎を支える手', hold, hd));
  // Shielding: the left hand crosses over to cup the flame from the wind side.
  let shield = hold;
  shield += `<path d="M70 130Q110 128 150 140Q166 146 170 156Q160 160 146 154Q112 146 78 146Z" fill="url(#arm)"/>`;
  shield += `<path d="M150 132Q168 126 182 136Q190 146 184 158Q176 148 162 146Z" fill="#7a3f48"/><path d="M156 134Q172 132 182 146" stroke="#c97d84" stroke-width="1.4" fill="none"/>`;
  write('hero-hands-shield.svg', svg(W, H, '風から炎をかばう両手', shield, hd));
  // Rim light: only the edges the flame can reach. Pure white; the game tints and scales it by flame strength.
  let rim = '';
  rim += `<path d="M140 120Q152 100 146 76" stroke="#fff" stroke-width="4" stroke-linecap="round" fill="none" opacity=".9"/>`;
  rim += `<path d="M142 124Q154 160 158 210" stroke="#fff" stroke-width="3.5" stroke-linecap="round" fill="none" opacity=".7"/>`;
  rim += `<path d="M120 120Q136 128 146 122" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none" opacity=".7"/>`;
  rim += `<path d="M150 166Q164 176 182 170" stroke="#fff" stroke-width="3" stroke-linecap="round" fill="none"/>`;
  rim += `<ellipse cx="104" cy="272" rx="40" ry="6" fill="#fff" opacity=".35"/>`;
  write('hero-rim.svg', svg(W, H, 'flame rim light mask', rim));
}

chapter1(); chapter2(); chapter3(); chapter4(); intro(); hero();
const files = fs.readdirSync(out).filter(x => x.endsWith('.svg')).sort();
const manifest = { generator: 'scripts/art/kienaide-art.mjs', viewBox: { background: [S, S], hero: [220, 280] }, vanishingPoint: VP, files };
fs.writeFileSync(path.join(out, 'manifest.json'), JSON.stringify(manifest, null, 1) + '\n');
console.log('wrote', files.length, 'layers to', path.relative(process.cwd(), out));
