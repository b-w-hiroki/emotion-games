import { chromium, webkit } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, join, extname } from 'node:path';

const root = resolve('dist/fishing-battle');
const server = createServer(async (req, res) => {
  const name = req.url === '/' ? 'index.html' : req.url.slice(1);
  if (!['index.html', 'style.css', 'game.js', 'core.js', 'audio.js'].includes(name) && !/^assets\/[a-z0-9_-]+\.(png|svg)$/.test(name)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.svg': 'image/svg+xml' })[extname(name)]);
  res.end(await readFile(join(root, name)));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const out = resolve('artifacts/fishing-battle');
await mkdir(out, { recursive: true });
const requested = process.argv[2] ?? 'all';
if (!['all', 'chromium', 'webkit'].includes(requested)) throw new Error(`Unknown browser: ${requested}`);
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  if (requested !== 'all' && requested !== name) continue;
  let browser;
  try { browser = await engine.launch({ headless: true }); }
  catch (error) { if (requested !== 'all') throw error; console.log(`${name}: unavailable (${error.message.split('\n')[0]})`); continue; }
  for (const [width, height] of [[390, 844], [360, 640], [375, 667], [320, 568]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
    await page.goto(url);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${out}/${name}-${width}x${height}.png`, fullPage: true });
    if (!await page.locator('#dangerLabel').textContent().then(t => t === '逃走危険')) throw new Error(`${name} ${width}: danger meter has no visible meaning`);
    if (!await page.locator('#danger').getAttribute('aria-valuenow')) throw new Error(`${name} ${width}: danger meter has no accessible value`);
    const reel = page.locator('#reel');
    if (width === 320) {
      const dial = await reel.boundingBox(), settings = await page.locator('.settings label').boundingBox();
      if (dial.x < settings.x + settings.width && dial.x + dial.width > settings.x && dial.y < settings.y + settings.height && dial.y + dial.height > settings.y) throw new Error(`${name}: fish selector overlaps reel on 320x568`);
    }
    await reel.click();
    const progress = await page.locator('#progressFill').evaluate(el => parseFloat(el.style.width));
    if (progress !== 53) throw new Error(`${name} ${width}: reel input expected AINAN 48→53, got ${progress}`);
    if (!await page.locator('#action').textContent().then(t => t.includes('近づいた'))) throw new Error(`${name} ${width}: reel feedback missing`);
    if (width === 390) {
      await page.waitForFunction(() => document.querySelector('#cue')?.classList.contains('warning'));
      if (!await page.locator('#hint').textContent().then(t => t.includes('指を止めよう'))) throw new Error(`${name}: warning guidance missing`);
      await page.screenshot({ path: `${out}/${name}-warning.png` });
      await page.waitForFunction(() => document.querySelector('#cue')?.classList.contains('rage'));
      await page.waitForFunction(() => document.querySelector('#cue')?.classList.contains('opening'));
      if (!await page.locator('#hint').textContent().then(t => t.includes('スワイプ'))) throw new Error(`${name}: opening guidance missing`);
      await page.screenshot({ path: `${out}/${name}-opening.png` });
      for (const id of ['aji', 'tai', 'bass', 'buri', 'saba', 'isaki', 'hirame', 'kanpachi', 'kue']) {
        await page.locator('#fish').selectOption(id);
        if (!await page.locator('#fishName').textContent()) throw new Error(`${name}: ${id} has no name`);
      }
      await page.locator('#mute').click();
      await page.reload();
      if (await page.locator('#mute').getAttribute('aria-pressed') !== 'true') throw new Error(`${name}: mute did not persist`);
    }
    if (width === 320) {
      await page.locator('#fish').selectOption('bass');
      const fishName = await page.locator('#fishName').boundingBox(), danger = await page.locator('#danger').boundingBox();
      if (fishName.x + fishName.width >= danger.x || danger.width < 30) throw new Error(`${name}: long fish name crowds out the danger meter on 320x568`);
    }
    if (errors.length) throw new Error(`${name} ${width}: ${errors.join('; ')}`);
    console.log(`${name} ${width}x${height}: reel ${progress}%, no page errors`);
    await page.close();
  }
  const input = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await input.goto(url);
  await input.mouse.move(190, 210); await input.mouse.down(); await input.mouse.move(190, 900, { steps: 4 }); await input.mouse.up();
  if (await input.locator('#progressFill').evaluate(el => parseFloat(el.style.width)) !== 53) throw new Error(`${name}: off-board swipe release was lost`);
  await input.reload();
  await input.mouse.move(190, 210); await input.mouse.down();
  await input.locator('.board').dispatchEvent('pointercancel', { pointerId: 1 });
  await input.mouse.move(190, 300); await input.mouse.up();
  if (await input.locator('#progressFill').evaluate(el => parseFloat(el.style.width)) !== 48) throw new Error(`${name}: cancelled swipe still reeled`);
  await input.mouse.move(190, 210); await input.mouse.down(); await input.mouse.move(190, 300); await input.mouse.up();
  if (await input.locator('#progressFill').evaluate(el => parseFloat(el.style.width)) !== 53) throw new Error(`${name}: input stayed blocked after cancellation`);
  await input.close();
  const quiet = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  await quiet.goto(url);
  await quiet.locator('#mute').click();
  await quiet.waitForFunction(() => document.querySelector('#cue')?.classList.contains('warning'));
  if (!await quiet.locator('#cue').isVisible() || await quiet.locator('#mute').getAttribute('aria-pressed') !== 'true') throw new Error(`${name}: warning lost with reduced motion and sound off`);
  await quiet.waitForFunction(() => document.querySelector('#cue')?.classList.contains('opening'));
  if (!await quiet.locator('#cue').isVisible()) throw new Error(`${name}: opening lost with reduced motion and sound off`);
  await quiet.screenshot({ path: `${out}/${name}-quiet-opening.png` });
  await quiet.close();
  const audio = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await audio.addInitScript(() => {
    window.__battleAudio = { contexts: 0, resumes: 0, notes: 0 };
    class ProbeContext {
      constructor() { window.__battleAudio.contexts++; this.currentTime = 0; this.destination = {}; }
      resume() { window.__battleAudio.resumes++; return Promise.resolve(); }
      createOscillator() {
        window.__battleAudio.notes++;
        return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect(target) { return target; }, start() {}, stop() {} };
      }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    }
    window.AudioContext = ProbeContext;
    window.webkitAudioContext = ProbeContext;
  });
  await audio.goto(url);
  await audio.waitForFunction(() => document.querySelector('#cue')?.classList.contains('warning'));
  if (await audio.evaluate(() => window.__battleAudio.contexts) !== 0) throw new Error(`${name}: audio context was created before a gesture`);
  await audio.locator('#reel').click();
  const played = await audio.evaluate(() => ({ ...window.__battleAudio }));
  if (played.contexts !== 1 || played.notes < 1 || played.resumes < 1) throw new Error(`${name}: first reel did not unlock audio`);
  await audio.locator('#mute').click();
  await audio.waitForFunction(() => document.querySelector('#cue')?.classList.contains('opening'));
  if (await audio.evaluate(() => window.__battleAudio.notes) !== played.notes) throw new Error(`${name}: muted phase cue made sound`);
  await audio.locator('#mute').click();
  await audio.locator('#reel').click();
  if (await audio.evaluate(() => window.__battleAudio.notes) <= played.notes) throw new Error(`${name}: unmuted reel stayed silent`);
  await audio.close();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(url);
  for (let i = 0; i < 55 && await page.locator('#result').isHidden(); i++) {
    const phase = await page.locator('#cue').getAttribute('class');
    if (phase?.includes('calm') || phase?.includes('opening')) await page.locator('#reel').click();
    await page.waitForTimeout(240);
  }
  if (!await page.locator('#result').isVisible() || !await page.locator('#resultTitle').textContent().then(t => t.includes('釣り上げた'))) throw new Error(`${name}: natural catch path failed`);
  if (!await page.locator('#resultFish').isVisible()) throw new Error(`${name}: caught fish not shown`);
  await page.screenshot({ path: `${out}/${name}-caught.png` });
  await page.locator('#retry').click();
  if (!await page.locator('#result').isHidden() || await page.locator('#progressValue').textContent() !== '48%') throw new Error(`${name}: retry did not reset the fight`);
  await page.reload(); // Use the fixed initial seed for the escape path.
  await page.waitForFunction(() => document.querySelector('#cue')?.classList.contains('rage'));
  const boardBounds = await page.locator('.board').boundingBox();
  const rageBounds = await page.locator('#rageLabel').boundingBox();
  if (!rageBounds || rageBounds.y + rageBounds.height > boardBounds.y + boardBounds.height - 30) throw new Error(`${name}: rage guidance clipped by lower controls`);
  await page.screenshot({ path: `${out}/${name}-rage.png` });
  let sawCritical = false;
  for (let i = 0; i < 80 && await page.locator('#result').isHidden(); i++) {
    const phase = await page.locator('#cue').getAttribute('class');
    if (phase?.includes('rage')) {
      await page.mouse.move(210, 250); await page.mouse.down(); await page.mouse.move(210, 310, { steps: 3 }); await page.mouse.up();
    }
    if (!sawCritical && await page.locator('#danger').getAttribute('aria-valuenow').then(Number) >= 70) {
      sawCritical = true;
      if (!await page.locator('#dangerLabel').textContent().then(t => t === '逃走寸前')) throw new Error(`${name}: critical danger is not explained`);
      await page.screenshot({ path: `${out}/${name}-critical.png` });
    }
    await page.waitForTimeout(240);
  }
  if (!sawCritical) throw new Error(`${name}: critical danger state was not reached`);
  if (!await page.locator('#result').isVisible() || !await page.locator('#resultTitle').textContent().then(t => t.includes('逃げた'))) throw new Error(`${name}: natural escape path failed`);
  if (await page.locator('#resultFish').isVisible()) throw new Error(`${name}: escaped fish still shown`);
  await page.screenshot({ path: `${out}/${name}-escaped.png` });
  console.log(`${name}: natural catch and escape paths passed`);
  await page.close();
  await browser.close();
}
server.close();
