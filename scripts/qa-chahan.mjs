// Browser QA for the playable fried-rice slice. Run after npm run build.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium, webkit } from 'playwright';

const root = path.resolve('dist'), output = path.resolve('artifacts/chahan');
fs.mkdirSync(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, '');
  const file = path.resolve(root, relative.endsWith('/') ? `${relative}index.html` : relative);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => { if (error) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(data); });
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/chahan/`;
try {
  for (const [engine, name] of [[chromium, 'chromium'], [webkit, 'webkit']].filter(([, name]) => !process.argv[2] || process.argv[2] === name)) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const [width, height] of [[390, 844], [360, 640]].filter(([width]) => !process.argv[3] || Number(process.argv[3]) === width)) {
        const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => { if (window.DeviceMotionEvent) Object.defineProperty(DeviceMotionEvent, 'requestPermission', { configurable: true, value: () => Promise.resolve('granted') }); });
        await page.goto(url);
        const painted = await page.evaluate(async () => Promise.all(['street','train','sky','wok-v2','toss-v2','rice-v2','flight-v3'].map(name => new Promise(resolve => {
          const image = new Image(); image.onload = () => resolve(image.width === 780 && image.height === (name === 'rice-v2' || name === 'flight-v3' ? 260 : name.endsWith('-v2') ? 520 : 900));
          image.onerror = () => resolve(false); image.src = `./art/${name}.webp`;
        }))));
        assert.deepEqual(painted, [true,true,true,true,true,true,true], `${name} ${width}: painted scene assets decode`);
        assert.equal(await page.locator('.cook-controls button').count(), 1, `${name} ${width}: only seasoning remains a cooking button`);
        assert.equal(await page.locator('#motionButton').isVisible(), false, `${name} ${width}: sensor setup stays in settings`);
        await page.screenshot({ path: path.join(output, `title-${name}-${width}.png`) });
        await page.locator('#start').click();
        assert.equal(await page.locator('#stageNotice').isVisible(), true, `${name} ${width}: opening location cue appears`);
        await page.waitForTimeout(2350);
        assert.equal(await page.locator('#stageNotice').isVisible(), false, `${name} ${width}: opening cue clears before gameplay capture`);
        const box = await page.locator('#swipeZone').boundingBox();
        const x = box.x + box.width * .48, y = box.y + box.height * .35;
        await page.mouse.move(x, y + 115); await page.mouse.down(); await page.mouse.move(x, y, { steps: 8 }); await page.mouse.up();
        assert.equal(await page.locator('#combo').textContent(), '0', `${name} ${width}: upward swipe must not toss`);
        await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 115, { steps: 8 }); await page.mouse.up();
        assert.equal(await page.locator('#combo').textContent(), '1', `${name} ${width}: pulling toward the player tosses rice`);
        if (width === 390) {
          await page.waitForTimeout(180);
          await page.screenshot({ path: path.join(output, `caught-${name}-${width}.png`) });
        }
        await page.waitForTimeout(2400);
        await page.screenshot({ path: path.join(output, `game-${name}-${width}.png`) });
        await page.locator('.settings summary').click();
        await page.locator('#motionButton').click();
        await page.waitForTimeout(450);
        await page.evaluate(() => { const event = new Event('devicemotion'); Object.defineProperty(event, 'acceleration', { value: { x: 0, y: 0, z: 5.6 } }); window.dispatchEvent(event); });
        assert.equal(await page.locator('#combo').textContent(), '2', `${name} ${width}: sensor pull toward the player tosses rice`);
        await page.locator('.settings summary').click();
        const heatTrack = await page.locator('#heatControl').boundingBox();
        await page.mouse.click(heatTrack.x + heatTrack.width * .85, heatTrack.y + heatTrack.height / 2);
        await page.waitForTimeout(100);
        assert.ok(Number((await page.locator('#heatLabel').textContent()).match(/\d+/)[0]) > 80, `${name} ${width}: heat slider changes fire`);
        await page.waitForTimeout(160);
        if (width === 390) await page.screenshot({ path: path.join(output, `toss-${name}-${width}.png`) });
        if (width === 390) {
          const riceBeforeWeak = await page.locator('#riceBar').evaluate(el => parseFloat(el.style.width));
          await page.waitForTimeout(500);
          await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 26, { steps: 3 }); await page.mouse.up();
          assert.equal(await page.locator('#combo').textContent(), '0', `${name}: weak pull breaks combo`);
          assert.equal(await page.locator('#riceBar').evaluate(el => parseFloat(el.style.width)), riceBeforeWeak, `${name}: weak pull retains rice`);
          await page.screenshot({ path: path.join(output, `weak-${name}-${width}.png`) });
          await page.waitForTimeout(500);
          await page.mouse.move(x - 65, y); await page.mouse.down(); await page.mouse.move(x + 65, y + 110, { steps: 8 }); await page.mouse.up();
          assert.ok(await page.locator('#riceBar').evaluate(el => parseFloat(el.style.width)) < riceBeforeWeak, `${name}: diagonal pull visibly costs rice`);
          await page.waitForTimeout(160);
          await page.screenshot({ path: path.join(output, `spilled-${name}-${width}.png`) });
          assert.match(await page.locator('#seasonHint').textContent(), /米と具|火を通す/, `${name}: seasoning gives an actionable timing cue`);
          await page.locator('#seasoning').click();
          assert.match(await page.locator('#seasonHint').textContent(), /味付け \d+%/, `${name}: seasoning reveals the achieved quality`);
          await page.screenshot({ path: path.join(output, `seasoning-early-${name}-${width}.png`) });
          const seasonedScene = await page.evaluate(async () => {
            const [{ createGame, addSeasoning }, { drawScene }] = await Promise.all([import('../assets/chahan-core.js'), import('./art.js')]);
            const demo = createGame(); Object.assign(demo, { phase: 'playing', time: 20, stage: 1, cook: .56, mix: .5, heat: .7 });
            addSeasoning(demo); demo.time += .25;
            const canvas = document.createElement('canvas'); canvas.width = 780; canvas.height = 900;
            drawScene(canvas.getContext('2d'), demo);
            return canvas.toDataURL('image/png').split(',')[1];
          });
          fs.writeFileSync(path.join(output, `seasoning-good-${name}-${width}.png`), Buffer.from(seasonedScene, 'base64'));
        }
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, `${name} ${width}: no horizontal overflow`);
        assert.deepEqual(errors, [], `${name} ${width}: no runtime errors`);
        await page.locator('.settings summary').click();
        await page.locator('#sound').click();
        await page.reload();
        assert.equal(await page.locator('#sound').textContent(), '音 OFF', `${name} ${width}: mute survives reload`);
        await page.emulateMedia({ reducedMotion: 'reduce' });
        assert.equal(await page.locator('.hero-art img').evaluate(el => getComputedStyle(el).animationName), 'none', `${name} ${width}: reduced motion stops rice arc`);
        await page.locator('#start').click();
        assert.equal(await page.locator('#stageNotice').evaluate(el => getComputedStyle(el).animationName), 'none', `${name} ${width}: reduced motion stops stage animation`);
        assert.deepEqual(errors, [], `${name} ${width}: audio-off/reduced-motion has no runtime errors`);
        await page.close();
        console.log(`PASS chahan ${name} ${width}x${height}: pull gesture and layout`);
        if (width === 390) {
          const timingPage = await browser.newPage({ viewport: { width, height } });
          await timingPage.clock.install();
          await timingPage.goto(url);
          await timingPage.locator('#start').click();
          await timingPage.clock.runFor(100);
          assert.match(await timingPage.locator('#seasonHint').textContent(), /まず米と具を混ぜる/, `${name}: seasoning starts with a mixing cue`);
          await timingPage.locator('#heatControl').evaluate(el => { el.value = '80'; el.dispatchEvent(new Event('input', { bubbles: true })); });
          for (let i = 0; i < 6; i++) { await timingPage.keyboard.press('Space'); await timingPage.clock.runFor(500); }
          await timingPage.clock.runFor(13_000);
          assert.equal(await timingPage.locator('#seasoning').evaluate(el => el.classList.contains('ready')), true, `${name}: well mixed, hot rice exposes seasoning window`);
          assert.equal(await timingPage.locator('#seasonHint').textContent(), '今が入れどき！');
          await timingPage.locator('#seasoning').click();
          assert.ok(Number((await timingPage.locator('#seasonHint').textContent()).match(/\d+/)[0]) >= 70, `${name}: timing cue leads to a good seasoning score`);
          await timingPage.clock.runFor(250);
          await timingPage.screenshot({ path: path.join(output, `seasoning-timed-${name}-${width}.png`) });
          await timingPage.close();
        }
        if (width === 360) {
          const resultPage = await browser.newPage({ viewport: { width, height } });
          const resultErrors = []; resultPage.on('pageerror', error => resultErrors.push(error.message));
          await resultPage.clock.install();
          await resultPage.goto(url);
          await resultPage.locator('#start').click();
          await resultPage.clock.runFor(20_500);
          await resultPage.screenshot({ path: path.join(output, `train-${name}-360.png`) });
          await resultPage.clock.runFor(18_000);
          await resultPage.screenshot({ path: path.join(output, `sky-${name}-360.png`) });
          await resultPage.clock.runFor(16_500);
          assert.equal(await resultPage.locator('.card.result').isVisible(), true, 'the completed dish has a dedicated result view');
          assert.equal(await resultPage.locator('#resultDish').isVisible(), true, 'finished rice illustration is visible');
          assert.deepEqual(resultErrors, [], 'result view has no runtime errors');
          await resultPage.screenshot({ path: path.join(output, `result-${name}-360.png`) });
          await resultPage.locator('#start').click();
          assert.equal(await resultPage.locator('#overlay').isVisible(), false, `${name}: retry returns to play`);
          assert.equal(await resultPage.locator('.card.result').count(), 0, `${name}: result layout resets on retry`);
          await resultPage.close();
        }
      }
    } finally { await browser.close(); }
  }
} finally { server.close(); }
