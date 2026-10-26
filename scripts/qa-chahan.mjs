// Browser QA for the integrated fried-rice game. Run after npm run build.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium, webkit } from 'playwright';

const root = path.resolve('dist'), output = path.resolve('artifacts/chahan');
fs.mkdirSync(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp', '.png': 'image/png' };
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, '');
  const file = path.resolve(root, (!relative || relative.endsWith('/')) ? `${relative}index.html` : relative);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => { if (error) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(data); });
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}/`;
try {
  for (const [engine, name] of [[chromium, 'chromium'], [webkit, 'webkit']].filter(([, name]) => !process.argv[2] || process.argv[2] === name)) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const [width, height] of [[390, 844], [360, 640]].filter(([width]) => !process.argv[3] || Number(process.argv[3]) === width)) {
        const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.goto(base);
        await page.locator('.chahan-shelf iframe').scrollIntoViewIfNeeded();
        const frame = page.frameLocator('.chahan-shelf iframe');
        await frame.locator('#overlayTitle').waitFor();
        const art = await frame.locator('#scene').evaluate(async canvas => {
          const [{ createGame }, { drawScene, drawDish, drawRiceMascot }] = await Promise.all([import('../assets/chahan-core.js'), import('./art.js')]);
          const assets = await Promise.all(['street','train','sky','wok-v2','toss-v2','rice-v2','rice-egg-v1','flight-v3','flight-egg-v1'].map(name => new Promise(resolve => {
            const image = new Image(); image.onload = () => resolve(image.width === 780); image.onerror = () => resolve(false);
            image.src = `./art/${name}.webp`;
          })));
          const ctx = canvas.getContext('2d'), frames = {};
          const game = createGame(); Object.assign(game, { phase: 'playing', rice: 1, mix: 1, ingredients: { egg: true, rice: true, veg: true }, filling: 'scallion', fillingCook: .3, cook: .86, time: 2 });
          for (const [label, update] of Object.entries({ rest: { panPush: 0, lastToss: -10 }, push: { panPush: 1, lastToss: -10 }, airborne: { panPush: 0, lastToss: 1.64, lastLift: .7, tossOutcome: 'caught' }, raw: { lastToss: -10, cook: .12 }, burnt: { cook: 1.35 }, scoop: { cook: .86, scoopProgress: 1 } })) {
            Object.assign(game, update); drawScene(ctx, game, label !== 'airborne'); frames[label] = canvas.toDataURL();
          }
          Object.assign(game, { cook: .86, lastLadleAt: 1.88, ladleX: .5, lastLadleQuality: 1 });
          drawScene(ctx, game, false); frames.ladle = canvas.toDataURL();
          const dishes = [];
          const dish = document.createElement('canvas'); dish.width = 640; dish.height = 280;
          for (const cook of [.12, .86, 1.35]) { game.cook = cook; drawDish(dish.getContext('2d'), game); dishes.push(dish.toDataURL()); }
          game.cook = .86; game.fluff = 1; drawDish(dish.getContext('2d'), game); dishes.push(dish.toDataURL());
          game.plated = true; game.platingQuality = 1; drawDish(dish.getContext('2d'), game); dishes.push(dish.toDataURL());
          const mascot = document.createElement('canvas'); mascot.width = 780; mascot.height = 900;
          const mascotCtx = mascot.getContext('2d'), mascotFrames = {};
          const captureMascot = (label, update, reduced = false) => { Object.assign(game, update); mascotCtx.clearRect(0, 0, 780, 900); drawRiceMascot(mascotCtx, game, reduced); mascotFrames[label] = mascot.toDataURL(); };
          captureMascot('idle', { phase: 'playing', time: 3, lastToss: -10, combo: 0, tossOutcome: 'none' });
          captureMascot('dance', { time: 3, lastToss: 2.8, combo: 2, tossOutcome: 'caught', lastTossQuality: .9 });
          captureMascot('caught', { lastTossQuality: .5 });
          captureMascot('danceLater', { time: 3.1 }, false);
          captureMascot('reduced', { time: 3 }, true);
          captureMascot('reducedLater', { time: 3.1 }, true);
          captureMascot('miss', { time: 3, combo: 0, tossOutcome: 'spilled', lastTossQuality: 0 });
          captureMascot('empty', { ingredients: { egg: false, rice: false, veg: false } });
          return { assets, frames, dishes, mascotFrames };
        });
        assert.deepEqual(art.assets, Array(9).fill(true), `${name} ${width}: painted layers decode`);
        assert.equal(new Set(Object.values(art.frames)).size, 7, `${name} ${width}: push, flight, ladle, scoop and cooking states have distinct art`);
        assert.equal(new Set(art.dishes).size, 5, `${name} ${width}: doneness, separated rice and round plating change the finished dish`);
        assert.notEqual(art.mascotFrames.idle, art.mascotFrames.dance, `${name} ${width}: a good toss makes the mascot dance`);
        assert.notEqual(art.mascotFrames.idle, art.mascotFrames.caught, `${name} ${width}: every caught toss gets a celebration`);
        assert.notEqual(art.mascotFrames.dance, art.mascotFrames.danceLater, `${name} ${width}: dance animation changes over time`);
        assert.equal(art.mascotFrames.reduced, art.mascotFrames.reducedLater, `${name} ${width}: reduced motion holds a still celebration pose`);
        assert.equal(art.mascotFrames.idle, art.mascotFrames.miss, `${name} ${width}: a spill stops the dance`);
        assert.notEqual(art.mascotFrames.idle, art.mascotFrames.empty, `${name} ${width}: the mascot appears after rice is added`);
        if (width === 390) for (const [label, data] of Object.entries(art.frames)) fs.writeFileSync(path.join(output, `wok-${label}-${name}.png`), Buffer.from(data.split(',')[1], 'base64'));
        if (width === 390) fs.writeFileSync(path.join(output, `mascot-${name}.png`), Buffer.from(art.mascotFrames.dance.split(',')[1], 'base64'));
        if (width === 390) fs.writeFileSync(path.join(output, `rounded-dish-${name}.png`), Buffer.from(art.dishes.at(-1).split(',')[1], 'base64'));
        assert.equal(new URL(page.url()).pathname, '/', `${name} ${width}: game shares the studio page`);
        assert.equal(await frame.locator('[data-venue]').count(), 3);
        assert.equal(await frame.locator('.venue-slide img').count(), 3);
        await frame.locator('#venueTrack').press('ArrowRight');
        assert.equal(await frame.locator('[data-venue="1"]').getAttribute('aria-pressed'), 'true', 'keyboard advances the carousel');
        await frame.locator('[data-venue="2"]').click();
        assert.equal(await frame.locator('#venuePosition').textContent().then(x => x.startsWith('3 / 3')), true, 'thumbnail selects a venue');
        await frame.locator('#venueTrack').evaluate(el => { el.dispatchEvent(new WheelEvent('wheel', { bubbles: true })); el.scrollLeft = 0; });
        await page.waitForTimeout(150);
        assert.equal(await frame.locator('[data-venue="0"]').getAttribute('aria-pressed'), 'true', 'swiping the carousel updates the selected venue');
        await page.screenshot({ path: path.join(output, `studio-${name}-${width}.png`), fullPage: true });
        for (const [venue, filling, target] of [[0, 'scallion', 72], [1, 'pork', 55], [2, 'shrimp', 38]]) {
          await frame.locator(`[data-venue="${venue}"]`).click();
          assert.equal(await frame.locator(`[data-venue="${venue}"]`).getAttribute('aria-pressed'), 'true', 'thumbnail choice is stable before starting');
          await frame.locator('#start').click();
          await frame.locator('#place').getByText(['路地裏の屋台','走る列車','空中キッチン'][venue]).waitFor();
          assert.equal(await frame.locator('#heatControl').evaluate(el => el.style.getPropertyValue('--target')), `${target}%`);
          assert.equal(await frame.locator('#cookTrack').getAttribute('data-state'), 'empty');
          await frame.locator('[data-ingredient="egg"]').click();
          await frame.locator('[data-ingredient="rice"]').click();
          await frame.locator('[data-ingredient="veg"]').click();
          assert.equal(await frame.locator(`[data-filling="${filling}"]`).isVisible(), true);
          await frame.locator(`[data-filling="${filling}"]`).click();
          assert.equal(await frame.locator('#fillingLabel').textContent().then(x => x.startsWith(['ねぎ','焼豚','海老'][venue])), true);
          const area = await frame.locator('#swipeZone').boundingBox();
          const x = area.x + area.width * .5, y = area.y + area.height * .52;
          assert.equal(await frame.locator('#ladleHint').isVisible(), true);
          await page.mouse.click(x, y);
          const firstFluff = await frame.locator('#fluffBar').evaluate(el => parseFloat(el.style.width));
          assert.ok(firstFluff > 0, 'a tap separates rice');
          assert.equal(await frame.locator('#combo').textContent(), '0', 'ladle tap is distinct from a wok toss');
          await frame.locator('#swipeZone').evaluate(async zone => {
            const start = Number(zone.dataset.gameTime), timeout = performance.now() + 5000;
            while (Number(zone.dataset.gameTime) - start < .25 && performance.now() < timeout) await new Promise(resolve => setTimeout(resolve, 20));
            if (Number(zone.dataset.gameTime) - start < .25) throw new Error('game clock did not advance before the next ladle tap');
          });
          await page.mouse.click(x, y);
          assert.ok(await frame.locator('#fluffBar').evaluate(el => parseFloat(el.style.width)) > firstFluff, 'rhythmic second tap separates more rice');
          await page.screenshot({ path: path.join(output, `ladle-${venue}-${name}-${width}.png`), fullPage: true });
          await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 95, { steps: 8 }); await page.mouse.up();
          assert.equal(await frame.locator('#combo').textContent(), '1', 'one flick toward the cook catches rice');
          assert.equal(new URL(page.url()).pathname, '/', 'play stays on the studio page');
          await page.screenshot({ path: path.join(output, `venue-${venue}-${name}-${width}.png`), fullPage: true });
          await frame.locator('#seasoning').click();
          assert.equal(await frame.locator('#seasoning').isVisible(), false, 'seasoning is selected once and does not become a finish button');
          assert.equal(await frame.locator('#platingHint').isVisible(), true, 'plating gesture is shown after seasoning');
          const centerX = area.x + area.width * .5, centerY = area.y + area.height * .58;
          const scale = Math.min(area.width, area.height);
          const scoop = [[-.28, 0], [-.21, -.18], [0, -.25], [.21, -.18], [.28, 0], [0, 0]];
          await page.mouse.move(centerX + scoop[0][0] * scale, centerY + scoop[0][1] * scale);
          await page.mouse.down();
          for (const [index, [dx, dy]] of scoop.entries()) {
            if (!index) continue;
            await page.mouse.move(centerX + dx * scale, centerY + dy * scale, { steps: 5 });
            if (index === 3) {
              const progress = Number(await frame.locator('#scoopTrace').getAttribute('data-progress'));
              assert.ok(progress > .2 && progress < 1, `the rice gathers while the spoon curves around the wok (${progress})`);
              if (width === 390 && venue === 0) await page.screenshot({ path: path.join(output, `scoop-progress-${name}.png`), fullPage: true });
            }
          }
          assert.equal(await frame.locator('#scoopTrace').isVisible(), true, 'the spoon follows the gathering gesture');
          assert.match(await frame.locator('#scoopPath').getAttribute('d'), /L/, 'the gathering path stays visible under the spoon');
          assert.ok(Number(await frame.locator('#scoopTrace').getAttribute('data-progress')) > .9, 'the rice reaches the centre before release');
          if (width === 390 && venue === 0) await page.screenshot({ path: path.join(output, `scoop-${name}.png`), fullPage: true });
          await page.mouse.up();
          await frame.locator('#overlayTitle').waitFor();
          await frame.locator('#resultDish[data-revealed="true"]').waitFor();
          await page.screenshot({ path: path.join(output, `plated-${venue}-${name}-${width}.png`), fullPage: true });
        }
        assert.deepEqual(errors, [], `${name} ${width}: no JavaScript errors`);
        await page.close();
        for (let repeat = 0; repeat < 8; repeat++) {
          const fresh = await browser.newPage({ viewport: { width, height }, hasTouch: true });
          await fresh.goto(base);
          await fresh.locator('.chahan-shelf iframe').scrollIntoViewIfNeeded();
          const kitchen = fresh.frameLocator('.chahan-shelf iframe');
          await kitchen.locator('[data-venue="1"]').click();
          assert.equal(await kitchen.locator('[data-venue="1"]').getAttribute('aria-pressed'), 'true', `${name} ${width}: thumbnail is selected on fresh load ${repeat + 1}`);
          await kitchen.locator('#start').click();
          assert.equal(await kitchen.locator('#place').textContent(), '走る列車', `${name} ${width}: immediate start keeps the selected venue on fresh load ${repeat + 1}`);
          await fresh.close();
        }
        if (width === 390) {
          const reduced = await browser.newPage({ viewport: { width, height }, hasTouch: true, reducedMotion: 'reduce' });
          await reduced.goto(base);
          await reduced.locator('.chahan-shelf iframe').scrollIntoViewIfNeeded();
          const kitchen = reduced.frameLocator('.chahan-shelf iframe');
          await kitchen.locator('#heatControl').evaluate(async element => {
            const timeout = performance.now() + 10000;
            while (!element.style.getPropertyValue('--target') && performance.now() < timeout) await new Promise(resolve => setTimeout(resolve, 20));
            if (!element.style.getPropertyValue('--target')) throw new Error('game module did not initialize');
          });
          await kitchen.locator('#start').click();
          for (const ingredient of ['egg', 'rice', 'veg']) await kitchen.locator(`[data-ingredient="${ingredient}"]`).click();
          await kitchen.locator('[data-filling="scallion"]').click();
          await kitchen.locator('#seasoning').click();
          await kitchen.locator('#heatControl').press('p');
          await kitchen.locator('#resultDish[data-revealed="true"]').waitFor();
          assert.equal(await kitchen.locator('#scoopTrace').isVisible(), false, `${name}: reduced motion skips the scoop animation`);
          await reduced.close();
        }
      }
    } finally { await browser.close(); }
  }
} finally { server.close(); }
console.log('Chahan integrated browser QA passed');
