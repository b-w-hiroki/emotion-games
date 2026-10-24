import { chromium, webkit } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, join, extname } from 'node:path';

const root = resolve('dist/fishing-battle');
const server = createServer(async (req, res) => {
  const name = req.url === '/' ? 'index.html' : req.url.slice(1);
  if (name === 'assets/analytics.js') { res.setHeader('Content-Type', 'text/javascript'); res.end(await readFile(resolve('dist/assets/analytics.js'))); return; }
  if (!['index.html', 'style.css', 'game.js', 'core.js', 'audio.js', 'visual.js'].includes(name) && !/^assets\/[a-z0-9_-]+\.(png|svg)$/.test(name)) { res.writeHead(404).end(); return; }
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
      await page.screenshot({ path: `${out}/${name}-reel-impact.png` });
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
      const dial = await reel.boundingBox();
      await page.mouse.move(dial.x + dial.width / 2, dial.y + dial.height / 2); await page.mouse.down();
      await page.mouse.move(dial.x + dial.width / 2, dial.y + dial.height / 2 + 65, { steps: 4 });
      const pulled = await reel.boundingBox(), settings = await page.locator('.settings label').boundingBox();
      if (pulled.x < settings.x + settings.width && pulled.x + pulled.width > settings.x && pulled.y < settings.y + settings.height && pulled.y + pulled.height > settings.y) throw new Error(`${name}: pulled reel overlaps fish selector on 320x568`);
      await page.screenshot({ path: `${out}/${name}-320-pull.png` });
      await page.mouse.up();
    }
    if (errors.length) throw new Error(`${name} ${width}: ${errors.join('; ')}`);
    console.log(`${name} ${width}x${height}: reel ${progress}%, no page errors`);
    await page.close();
  }
  const input = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await input.goto(url);
  await input.mouse.move(190, 210); await input.mouse.down(); await input.mouse.move(190, 300, { steps: 4 });
  if (!await input.locator('.controls').evaluate(el => el.classList.contains('is-pulling')) || !await input.locator('#hint').textContent().then(t => t.includes('離して巻く'))) throw new Error(`${name}: drag preview did not follow the finger`);
  const pullFeedback = await input.locator('.controls').evaluate(el => ({ tension: Number(el.style.getPropertyValue('--tension')), glow: el.style.getPropertyValue('--pull-glow') }));
  if (pullFeedback.tension <= 0 || pullFeedback.glow !== '#8de7ff') throw new Error(`${name}: line tension and control glow did not follow the pull`);
  const pulled = await input.locator('#reel').boundingBox(), settings = await input.locator('.settings label').boundingBox();
  if (pulled.x < settings.x + settings.width && pulled.x + pulled.width > settings.x && pulled.y < settings.y + settings.height && pulled.y + pulled.height > settings.y) throw new Error(`${name}: pulled reel overlaps fish selector on 390x844`);
  await input.screenshot({ path: `${out}/${name}-pull.png` });
  await input.mouse.move(190, 900, { steps: 4 }); await input.mouse.up();
  if (await input.locator('#progressFill').evaluate(el => parseFloat(el.style.width)) !== 53) throw new Error(`${name}: off-board swipe release was lost`);
  if (await input.locator('.controls').evaluate(el => el.classList.contains('is-pulling'))) throw new Error(`${name}: drag preview remained after release`);
  await input.reload();
  await input.locator('#reel').focus(); await input.keyboard.press('Enter');
  if (await input.locator('#progressFill').evaluate(el => parseFloat(el.style.width)) !== 53) throw new Error(`${name}: focused reel button ignored the keyboard`);
  await input.reload();
  await input.mouse.move(190, 210); await input.mouse.down();
  await input.locator('.board').dispatchEvent('pointercancel', { pointerId: 1 });
  await input.mouse.move(190, 300); await input.mouse.up();
  if (await input.locator('#progressFill').evaluate(el => parseFloat(el.style.width)) !== 48) throw new Error(`${name}: cancelled swipe still reeled`);
  await input.mouse.move(190, 210); await input.mouse.down(); await input.mouse.move(190, 300); await input.mouse.up();
  if (await input.locator('#progressFill').evaluate(el => parseFloat(el.style.width)) !== 53) throw new Error(`${name}: input stayed blocked after cancellation`);
  await input.close();
  const touch = await browser.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await touch.goto(url);
  const touchDial = await touch.locator('#reel').boundingBox();
  await touch.touchscreen.tap(touchDial.x + touchDial.width / 2, touchDial.y + touchDial.height / 2);
  if (await touch.locator('#progressFill').evaluate(el => parseFloat(el.style.width)) !== 53) throw new Error(`${name}: touch tap did not reel`);
  await touch.close();
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
    window.__battleAudio = { contexts: 0, resumes: 0, notes: 0, stops: 0, pitches: [] };
    class ProbeContext {
      constructor() { window.__battleAudio.contexts++; this.currentTime = 0; this.destination = {}; }
      resume() { window.__battleAudio.resumes++; return Promise.resolve(); }
      createOscillator() {
        window.__battleAudio.notes++;
        return { frequency: { setValueAtTime(value) { window.__battleAudio.pitches.push(value); }, exponentialRampToValueAtTime() {} }, connect(target) { return target; }, start() {}, stop() { window.__battleAudio.stops++; } };
      }
      createGain() { return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }; }
    }
    window.AudioContext = ProbeContext;
    window.webkitAudioContext = ProbeContext;
  });
  await audio.goto(url);
  await audio.waitForFunction(() => document.querySelector('#cue')?.classList.contains('warning'));
  if (await audio.evaluate(() => window.__battleAudio.contexts) !== 0) throw new Error(`${name}: audio context was created before a gesture`);
  await audio.reload();
  await audio.mouse.move(190, 210); await audio.mouse.down();
  await audio.mouse.move(190, 245); await audio.mouse.move(190, 300);
  const held = await audio.evaluate(() => ({ ...window.__battleAudio }));
  if (held.contexts !== 1 || held.notes !== 1 || held.pitches.at(-1) <= held.pitches.at(-2)) throw new Error(`${name}: held-line sound did not rise with the pull`);
  await audio.locator('.board').dispatchEvent('pointercancel', { pointerId: 1 });
  await audio.mouse.up();
  if (await audio.evaluate(() => window.__battleAudio.stops) !== 1) throw new Error(`${name}: held-line sound continued after cancellation`);
  await audio.locator('#reel').click();
  const played = await audio.evaluate(() => ({ ...window.__battleAudio }));
  if (played.contexts !== 1 || played.notes <= held.notes || played.resumes < 1) throw new Error(`${name}: reel cue did not share the unlocked audio context`);
  await audio.locator('#mute').click();
  await audio.waitForFunction(() => document.querySelector('#cue')?.classList.contains('opening'));
  if (await audio.evaluate(() => window.__battleAudio.notes) !== played.notes) throw new Error(`${name}: muted phase cue made sound`);
  await audio.locator('#mute').click();
  await audio.locator('#reel').click();
  if (await audio.evaluate(() => window.__battleAudio.notes) <= played.notes) throw new Error(`${name}: unmuted reel stayed silent`);
  await audio.close();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'no-preference' });
  await page.goto(url);
  await page.evaluate(() => {
    window.__finales = [];
    new MutationObserver(() => { const cue = document.querySelector('#cue'); if (cue?.className.includes('finale-')) window.__finales.push(cue.className); }).observe(document.querySelector('#cue'), { attributes: true, attributeFilter: ['class'] });
  });
  let sawCatchTransition = false;
  for (let i = 0; i < 55 && await page.locator('#result').isHidden(); i++) {
    const phase = await page.locator('#cue').getAttribute('class');
    if (!sawCatchTransition && phase?.includes('finale-caught')) {
      sawCatchTransition = true;
      if (await page.locator('#result').isVisible()) throw new Error(`${name}: catch result covered the fish transition`);
      await page.screenshot({ path: `${out}/${name}-catch-transition.png` });
    }
    if (phase?.includes('calm') || phase?.includes('opening')) await page.locator('#reel').click();
    await page.waitForTimeout(240);
  }
  if (!sawCatchTransition && !await page.evaluate(() => window.__finales.some(c => c.includes('finale-caught')))) throw new Error(`${name}: catch transition was not shown`);
  if (!await page.locator('#result').isVisible() || !await page.locator('#resultTitle').textContent().then(t => t.includes('釣り上げた'))) throw new Error(`${name}: natural catch path failed`);
  if (!await page.locator('#resultFish').isVisible()) throw new Error(`${name}: caught fish not shown`);
  await page.screenshot({ path: `${out}/${name}-caught.png` });
  await page.locator('#retry').click();
  if (!await page.locator('#result').isHidden() || await page.locator('#progressValue').textContent() !== '48%') throw new Error(`${name}: retry did not reset the fight`);
  await page.reload(); // Use the fixed initial seed for the escape path.
  await page.evaluate(() => {
    window.__finales = [];
    new MutationObserver(() => { const cue = document.querySelector('#cue'); if (cue?.className.includes('finale-')) window.__finales.push(cue.className); }).observe(document.querySelector('#cue'), { attributes: true, attributeFilter: ['class'] });
  });
  await page.waitForFunction(() => document.querySelector('#cue')?.classList.contains('rage'));
  const boardBounds = await page.locator('.board').boundingBox();
  const rageBounds = await page.locator('#rageLabel').boundingBox();
  if (!rageBounds || rageBounds.y + rageBounds.height > boardBounds.y + boardBounds.height - 30) throw new Error(`${name}: rage guidance clipped by lower controls`);
  await page.screenshot({ path: `${out}/${name}-rage.png` });
  let sawCritical = false, sawEscapeTransition = false, sawRagePull = false;
  for (let i = 0; i < 80 && await page.locator('#result').isHidden(); i++) {
    const phase = await page.locator('#cue').getAttribute('class');
    if (!sawEscapeTransition && phase?.includes('finale-escaped')) {
      sawEscapeTransition = true;
      if (await page.locator('#result').isVisible()) throw new Error(`${name}: escape result covered the fish transition`);
      await page.screenshot({ path: `${out}/${name}-escape-transition.png` });
    }
    if (phase?.includes('rage')) {
      await page.mouse.move(210, 250); await page.mouse.down(); await page.mouse.move(210, 310, { steps: 3 });
      if (!sawRagePull) {
        const rageFeedback = await page.locator('.controls').evaluate(el => ({ tension: Number(el.style.getPropertyValue('--tension')), glow: el.style.getPropertyValue('--pull-glow') }));
        if (rageFeedback.tension <= pullFeedback.tension || rageFeedback.glow !== '#ff976c') throw new Error(`${name}: dangerous pull did not change line tension and control color`);
        await page.screenshot({ path: `${out}/${name}-rage-pull.png` });
        sawRagePull = true;
      }
      await page.mouse.up();
    }
    if (!sawCritical && await page.locator('#danger').getAttribute('aria-valuenow').then(Number) >= 70) {
      sawCritical = true;
      if (!await page.locator('#dangerLabel').textContent().then(t => t === '逃走寸前')) throw new Error(`${name}: critical danger is not explained`);
      await page.screenshot({ path: `${out}/${name}-critical.png` });
    }
    await page.waitForTimeout(240);
  }
  if (!sawCritical) throw new Error(`${name}: critical danger state was not reached`);
  if (!sawRagePull) throw new Error(`${name}: rage pull was not exercised`);
  if (!sawEscapeTransition && !await page.evaluate(() => window.__finales.some(c => c.includes('finale-escaped')))) throw new Error(`${name}: escape transition was not shown`);
  if (!await page.locator('#result').isVisible() || !await page.locator('#resultTitle').textContent().then(t => t.includes('逃げた'))) throw new Error(`${name}: natural escape path failed`);
  if (await page.locator('#resultFish').isVisible()) throw new Error(`${name}: escaped fish still shown`);
  await page.screenshot({ path: `${out}/${name}-escaped.png` });
  console.log(`${name}: natural catch and escape paths passed`);
  await page.close();
  await browser.close();
}
server.close();
