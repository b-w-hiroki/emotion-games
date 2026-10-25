// Browser QA for the playable fried-rice slice. Run after npm run build.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium, webkit } from 'playwright';
import sharp from 'sharp';

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
        assert.equal(await page.locator('#cookTrack').getAttribute('data-state'), 'empty', `${name} ${width}: empty wok has no rice doneness`);
        const painted = await page.evaluate(async () => Promise.all(['street','train','sky','wok-v2','toss-v2','rice-v2','rice-egg-v1','flight-v3','flight-egg-v1'].map(name => new Promise(resolve => {
          const image = new Image(); image.onload = () => resolve(image.width === 780 && image.height === (name.startsWith('rice-') || name.startsWith('flight-') ? 260 : name.endsWith('-v2') ? 520 : 900));
          image.onerror = () => resolve(false); image.src = `./art/${name}.webp`;
        }))));
        assert.deepEqual(painted, Array(9).fill(true), `${name} ${width}: painted scene assets decode`);
        if (width === 390) {
          const dishes = await page.evaluate(async () => {
            const [{ createGame }, { drawDish }] = await Promise.all([import('../assets/chahan-core.js'), import('./art.js')]);
            await Promise.all([...document.images].map(image => image.decode().catch(() => {})));
            const base = createGame(); Object.assign(base, { rice: 1, mix: 1, cook: .86, seasoning: 1, seasoned: true, filling: 'scallion', fillingCook: .3, ingredients: { egg: true, rice: true, veg: true } });
            return Object.fromEntries(Object.entries({ ideal: base, unmixed: { ...base, mix: 0, seasoning: 0, seasoned: false }, raw: { ...base, cook: .12 }, burnt: { ...base, cook: 1.5 }, spilled: { ...base, rice: .2 }, noEgg: { ...base, ingredients: { ...base.ingredients, egg: false } }, noVeg: { ...base, ingredients: { ...base.ingredients, veg: false } }, pork: { ...base, filling: 'pork', fillingCook: .7 }, scallionBurnt: { ...base, fillingCook: .8 }, porkRaw: { ...base, filling: 'pork', fillingCook: 0 } }).map(([label, game]) => {
              const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 280;
              drawDish(canvas.getContext('2d'), game);
              return [label, canvas.toDataURL('image/png').split(',')[1]];
            }));
          });
          assert.equal(new Set(Object.values(dishes)).size, 10, `${name}: each cooking outcome and filling state has a distinct plated image`);
          for (const [label, png] of Object.entries(dishes)) fs.writeFileSync(path.join(output, `dish-${label}-${name}.png`), Buffer.from(png, 'base64'));
          const greenSides = async png => {
            const { data, info } = await sharp(Buffer.from(png, 'base64')).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
            const sides = { left: 0, right: 0 };
            for (let y = 118; y < 209; y++) for (let x = 128; x < 515; x++) {
              const i = (y * info.width + x) * 4, [r, g, b] = data.subarray(i, i + 3);
              if (g > r * 1.12 && g > b * 1.08 && g > 75) sides[x < 320 ? 'left' : 'right']++;
            }
            return sides;
          };
          const mixedGreens = await greenSides(dishes.ideal), separateGreens = await greenSides(dishes.unmixed);
          assert.ok(mixedGreens.left > 400 && mixedGreens.right > 400, `${name}: mixed filling reaches both sides of the plate`);
          assert.ok(separateGreens.left < 200 && separateGreens.right > 400, `${name}: unmixed filling stays in a visible pile`);
        }
        assert.equal(await page.locator('.ingredient-tray button').count(), 4, `${name} ${width}: four ingredients are selectable`);
        assert.equal(await page.locator('#motionButton').isVisible(), false, `${name} ${width}: sensor setup stays in settings`);
        await page.screenshot({ path: path.join(output, `title-${name}-${width}.png`) });
        await page.locator('#start').click();
        assert.equal(await page.locator('#stageNotice').isVisible(), true, `${name} ${width}: opening location cue appears`);
        await page.waitForTimeout(2350);
        assert.equal(await page.locator('#stageNotice').isVisible(), false, `${name} ${width}: opening cue clears before gameplay capture`);
        assert.equal(await page.locator('#riceBar').evaluate(el => parseFloat(el.style.width), 0), 0, `${name}: wok begins without rice`);
        await page.screenshot({ path: path.join(output, `empty-${name}-${width}.png`) });
        await page.locator('[data-ingredient="egg"]').click();
        assert.equal(await page.locator('#riceBar').evaluate(el => parseFloat(el.style.width), 0), 0, `${name}: egg alone does not fill the wok with rice`);
        await page.screenshot({ path: path.join(output, `egg-${name}-${width}.png`) });
        assert.match(await page.locator('#recipeHint').textContent(), /卵を炒めよう/, `${name}: raw egg needs heat`);
        await page.waitForTimeout(3100);
        assert.equal(await page.locator('#eggStatus').textContent(), 'ふんわり！', `${name}: the egg reaches its heat-driven window`);
        assert.match(await page.locator('#recipeHint').textContent(), /ごはんを入れどき/, `${name}: the cue follows egg doneness`);
        assert.equal(await page.locator('[data-ingredient="rice"]').evaluate(el => el.classList.contains('suggested')), true, `${name}: rice is highlighted when the egg is ready`);
        await page.screenshot({ path: path.join(output, `egg-ready-${name}-${width}.png`) });
        await page.locator('[data-ingredient="rice"]').click();
        assert.equal(await page.locator('#riceBar').evaluate(el => parseFloat(el.style.width)), 100, `${name}: rice is added only when selected`);
        await page.screenshot({ path: path.join(output, `rice-${name}-${width}.png`) });
        const box = await page.locator('#swipeZone').boundingBox();
        const x = box.x + box.width * .48, y = box.y + box.height * .35;
        await page.mouse.move(x, y + 115); await page.mouse.down(); await page.mouse.move(x, y, { steps: 8 }); await page.mouse.up();
        assert.equal(await page.locator('#combo').textContent(), '0', `${name} ${width}: upward swipe must not toss`);
        await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 115, { steps: 8 }); await page.mouse.up();
        assert.equal(await page.locator('#combo').textContent(), '1', `${name} ${width}: pulling toward the player tosses rice`);
        await page.waitForTimeout(180);
        await page.screenshot({ path: path.join(output, `rice-flight-${name}-${width}.png`) });
        await page.locator('[data-ingredient="veg"]').click();
        assert.equal(await page.locator('#fillingChoices').isVisible(), true, `${name}: filling choices appear on demand`);
        assert.equal(await page.locator('.ingredient-tray').isVisible(), false, `${name}: choice replaces the tray without adding clutter`);
        await page.screenshot({ path: path.join(output, `filling-choice-${name}-${width}.png`) });
        await page.locator('[data-filling="scallion"]').click();
        assert.match(await page.locator('#fillingLabel').textContent(), /^ねぎ/, `${name}: selected filling persists in the tray`);
        assert.equal(await page.locator('#recipeCount').textContent(), '3 / 4', `${name}: ingredient progress advances`);
        await page.screenshot({ path: path.join(output, `veg-${name}-${width}.png`) });
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
          assert.match(await page.locator('#seasonHint').textContent(), /最後の場所/, `${name}: plating waits for the final location`);
          await page.screenshot({ path: path.join(output, `seasoning-early-${name}-${width}.png`) });
          const seasonedScene = await page.evaluate(async () => {
            const [{ createGame, addSeasoning }, { drawScene }] = await Promise.all([import('../assets/chahan-core.js'), import('./art.js')]);
            const demo = createGame(); Object.assign(demo, { phase: 'playing', time: 20, stage: 1, cook: .56, mix: .5, heat: .7, rice: 1, ingredients: { egg: true, rice: true, veg: true } });
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
          await timingPage.locator('[data-ingredient="egg"]').click();
          await timingPage.locator('[data-ingredient="rice"]').click();
          await timingPage.keyboard.press('Digit3');
          assert.equal(await timingPage.locator('#fillingChoices').isVisible(), true, `${name}: keyboard opens filling choices`);
          await timingPage.keyboard.press('Digit2');
          assert.match(await timingPage.locator('#fillingLabel').textContent(), /^焼豚/, `${name}: pork selection is visible`);
          assert.match(await timingPage.locator('#seasonHint').textContent(), /まず米と具を混ぜる/, `${name}: seasoning starts with a mixing cue`);
          await timingPage.locator('#heatControl').evaluate(el => { el.value = '80'; el.dispatchEvent(new Event('input', { bubbles: true })); });
          for (let i = 0; i < 6; i++) { await timingPage.keyboard.press('Space'); await timingPage.clock.runFor(500); }
          await timingPage.clock.runFor(13_000);
          assert.equal(await timingPage.locator('#recipe').getAttribute('data-filling-state'), 'ready', `${name}: heat makes pork fragrant during play`);
          assert.match(await timingPage.locator('#fillingLabel').textContent(), /香ばしい/, `${name}: the filling tile explains the current doneness`);
          await timingPage.screenshot({ path: path.join(output, `pork-ready-${name}-${width}.png`) });
          assert.equal(await timingPage.locator('#seasoning').evaluate(el => el.classList.contains('ready')), true, `${name}: well mixed, hot rice exposes seasoning window`);
          assert.equal(await timingPage.locator('#seasonHint').textContent(), '今が入れどき！');
          await timingPage.locator('#seasoning').click();
          assert.equal(await timingPage.locator('#seasonAction').textContent(), '盛り付け', `${name}: the same tile becomes the plating action`);
          assert.equal(await timingPage.locator('#seasoning').isDisabled(), true, `${name}: plating is locked before the final location`);
          await timingPage.clock.runFor(250);
          await timingPage.screenshot({ path: path.join(output, `seasoning-timed-${name}-${width}.png`) });
          await timingPage.clock.runFor(21_000);
          assert.equal(await timingPage.locator('#place').textContent(), '空中キッチン', `${name}: all locations precede plating`);
          assert.equal(await timingPage.locator('#seasoning').isEnabled(), true, `${name}: plating opens in the final location`);
          assert.equal(await timingPage.locator('#cookTrack').getAttribute('data-state'), 'ready', `${name}: the gauge highlights the actual plating window`);
          assert.equal(await timingPage.locator('#cookStatus').textContent(), '盛りどき');
          await timingPage.screenshot({ path: path.join(output, `plating-ready-${name}-${width}.png`) });
          const secondsLeft = Number(await timingPage.locator('#clock').textContent());
          assert.ok(secondsLeft > 0, `${name}: plating can complete before the timer expires`);
          await timingPage.locator('#seasoning').click();
          assert.equal(await timingPage.locator('#overlay').isVisible(), true, `${name}: plating immediately completes the dish`);
          await timingPage.screenshot({ path: path.join(output, `plated-${name}-${width}.png`) });
          await timingPage.close();
          const eggPage = await browser.newPage({ viewport: { width, height } });
          await eggPage.clock.install();
          await eggPage.goto(url);
          await eggPage.locator('#start').click();
          await eggPage.locator('#heatControl').evaluate(el => { el.value = '100'; el.dispatchEvent(new Event('input', { bubbles: true })); });
          await eggPage.locator('[data-ingredient="egg"]').click();
          await eggPage.clock.runFor(3600);
          assert.equal(await eggPage.locator('#eggStatus').textContent(), '焦げ注意', `${name}: high heat visibly overcooks the egg`);
          assert.match(await eggPage.locator('#recipeHint').textContent(), /焦げそう/, `${name}: rice cue becomes urgent after the egg window`);
          await eggPage.screenshot({ path: path.join(output, `egg-burnt-${name}-${width}.png`) });
          await eggPage.close();
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
          assert.match(await resultPage.locator('#overlayText').textContent(), /ごはんが入らない/, 'missing rice produces an honest empty-wok result');
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
