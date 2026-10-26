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
          const [{ createGame }, { drawScene, drawDish }] = await Promise.all([import('../assets/chahan-core.js'), import('./art.js')]);
          const assets = await Promise.all(['street','train','sky','wok-v2','toss-v2','rice-v2','rice-egg-v1','flight-v3','flight-egg-v1'].map(name => new Promise(resolve => {
            const image = new Image(); image.onload = () => resolve(image.width === 780); image.onerror = () => resolve(false);
            image.src = `./art/${name}.webp`;
          })));
          const ctx = canvas.getContext('2d'), frames = {};
          const game = createGame(); Object.assign(game, { phase: 'playing', rice: 1, mix: 1, ingredients: { egg: true, rice: true, veg: true }, filling: 'scallion', fillingCook: .3, cook: .86, time: 2 });
          for (const [label, update] of Object.entries({ rest: { panPush: 0, lastToss: -10 }, push: { panPush: 1, lastToss: -10 }, airborne: { panPush: 0, lastToss: 1.64, lastLift: .7, tossOutcome: 'caught' }, raw: { lastToss: -10, cook: .12 }, burnt: { cook: 1.35 } })) {
            Object.assign(game, update); drawScene(ctx, game, label !== 'airborne'); frames[label] = canvas.toDataURL();
          }
          Object.assign(game, { cook: .86, lastLadleAt: 1.88, ladleX: .5, lastLadleQuality: 1 });
          drawScene(ctx, game, false); frames.ladle = canvas.toDataURL();
          const dishes = [];
          const dish = document.createElement('canvas'); dish.width = 640; dish.height = 280;
          for (const cook of [.12, .86, 1.35]) { game.cook = cook; drawDish(dish.getContext('2d'), game); dishes.push(dish.toDataURL()); }
          game.cook = .86; game.fluff = 1; drawDish(dish.getContext('2d'), game); dishes.push(dish.toDataURL());
          return { assets, frames, dishes };
        });
        assert.deepEqual(art.assets, Array(9).fill(true), `${name} ${width}: painted layers decode`);
        assert.equal(new Set(Object.values(art.frames)).size, 6, `${name} ${width}: push, flight, ladle and cooking states have distinct art`);
        assert.equal(new Set(art.dishes).size, 4, `${name} ${width}: doneness and separated rice change the finished dish`);
        if (width === 390) for (const [label, data] of Object.entries(art.frames)) fs.writeFileSync(path.join(output, `wok-${label}-${name}.png`), Buffer.from(data.split(',')[1], 'base64'));
        assert.equal(new URL(page.url()).pathname, '/', `${name} ${width}: game shares the studio page`);
        assert.equal(await frame.locator('[data-venue]').count(), 3);
        assert.equal(await frame.locator('.venue-slide img').count(), 3);
        await frame.locator('#venueTrack').focus();
        await page.keyboard.press('ArrowRight');
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
          await page.waitForTimeout(320);
          await page.mouse.click(x, y);
          assert.ok(await frame.locator('#fluffBar').evaluate(el => parseFloat(el.style.width)) > firstFluff, 'rhythmic second tap separates more rice');
          await page.screenshot({ path: path.join(output, `ladle-${venue}-${name}-${width}.png`), fullPage: true });
          await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 95, { steps: 8 }); await page.mouse.up();
          assert.equal(await frame.locator('#combo').textContent(), '0', 'pull alone cannot flip rice');
          await page.waitForTimeout(500);
          await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y - 80, { steps: 8 }); await page.mouse.move(x, y + 25, { steps: 8 }); await page.mouse.up();
          assert.equal(await frame.locator('#combo').textContent(), '1', 'push then pull catches rice');
          assert.equal(new URL(page.url()).pathname, '/', 'play stays on the studio page');
          await page.screenshot({ path: path.join(output, `venue-${venue}-${name}-${width}.png`), fullPage: true });
          if (venue < 2) {
            await frame.locator('#seasoning').click();
            await frame.locator('#seasoning').click();
            await frame.locator('#overlayTitle').waitFor();
          }
        }
        assert.deepEqual(errors, [], `${name} ${width}: no JavaScript errors`);
        await page.close();
        for (let repeat = 0; repeat < 3; repeat++) {
          const fresh = await browser.newPage({ viewport: { width, height }, hasTouch: true });
          await fresh.goto(base);
          await fresh.locator('.chahan-shelf iframe').scrollIntoViewIfNeeded();
          const kitchen = fresh.frameLocator('.chahan-shelf iframe');
          await kitchen.locator('[data-venue="1"]').click();
          await kitchen.locator('#start').click();
          assert.equal(await kitchen.locator('#place').textContent(), '走る列車', `${name} ${width}: immediate start keeps the selected venue on fresh load ${repeat + 1}`);
          await fresh.close();
        }
      }
    } finally { await browser.close(); }
  }
} finally { server.close(); }
console.log('Chahan integrated browser QA passed');
