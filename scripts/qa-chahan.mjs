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
        const frameBox = await page.locator('.chahan-shelf-frame').boundingBox();
        assert.ok(Math.abs(frameBox.height - height) <= 1, `${name} ${width}: embedded game matches the viewport height`);
        assert.ok(frameBox.width >= width - 1, `${name} ${width}: embedded game uses the mobile width`);
        const shell = frame.locator('.shell');
        assert.ok(await shell.evaluate(el => el.scrollHeight <= innerHeight + 1), `${name} ${width}: controls fit without scrolling inside the game`);
        const art = await frame.locator('#scene').evaluate(async canvas => {
          const [{ createGame }, { drawScene, drawDish, drawRiceMascot, cheeringFriends }] = await Promise.all([import('../assets/chahan-core.js'), import('./art.js')]);
          const assets = await Promise.all(['street','train','sky','wok-v2','toss-v2','rice-v2','rice-egg-v1','flight-v3','flight-egg-v1'].map(name => new Promise(resolve => {
            const image = new Image(); image.onload = () => resolve(image.width === 780); image.onerror = () => resolve(false);
            image.src = `./art/${name}.webp`;
          })));
          const ctx = canvas.getContext('2d'), frames = {};
          const game = createGame(); Object.assign(game, { phase: 'playing', rice: 1, mix: 1, ingredients: { egg: true, rice: true, veg: true }, filling: 'scallion', fillingCook: .3, cook: .86, time: 2 });
          for (const [label, update] of Object.entries({ rest: { panPush: 0, lastToss: -10 }, push: { panPush: 1, lastToss: -10 }, airborne: { panPush: 0, lastToss: 1.64, lastLift: .7, tossOutcome: 'caught' }, raw: { lastToss: -10, cook: .12 }, burnt: { cook: 1.35 }, scoop: { cook: .86, scoopProgress: 1 } })) {
            Object.assign(game, update); drawScene(ctx, game, label !== 'airborne'); frames[label] = canvas.toDataURL();
          }
          const spills = {};
          for (const [label, fault, lean] of [['strong', 'strong', 0], ['left', 'sideways', -1], ['right', 'sideways', 1]]) {
            Object.assign(game, { lastToss: 1.7, lastLift: 1, lastLean: lean, tossOutcome: 'spilled', tossSpill: .3, lastTossFault: fault, scoopProgress: 0 });
            drawScene(ctx, game, false); spills[label] = canvas.toDataURL();
          }
          Object.assign(game, { cook: .86, scoopProgress: 0, riceClumps: [0, 0, 0], fluff: 1 });
          drawScene(ctx, game, true); frames.separated = canvas.toDataURL();
          Object.assign(game, { lastLadleAt: 1.88, ladleX: .5, lastLadleQuality: 1 });
          drawScene(ctx, game, false); frames.ladle = canvas.toDataURL();
          const dishes = [];
          const dish = document.createElement('canvas'); dish.width = 640; dish.height = 280;
          game.fluff = 0;
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
          Object.assign(game, { ingredients: { egg: true, rice: true, veg: true }, phase: 'playing', time: 3, lastToss: 2.8, tossOutcome: 'caught', combo: 2 });
          const cheerLevels = [0, 1, 3, 5].map(bestCombo => { game.bestCombo = bestCombo; return cheeringFriends(game); });
          for (const bestCombo of [0, 1, 3, 5]) captureMascot(`friends${bestCombo}`, { bestCombo }, true);
          game.tossOutcome = 'spilled'; game.combo = 0;
          const friendsAfterSpill = cheeringFriends(game);
          game.tossOutcome = 'caught'; game.combo = 5; drawScene(ctx, game, true); frames.crowd = canvas.toDataURL();
          return { assets, frames, spills, dishes, mascotFrames, cheerLevels, friendsAfterSpill };
        });
        assert.deepEqual(art.assets, Array(9).fill(true), `${name} ${width}: painted layers decode`);
        assert.equal(new Set(Object.values(art.frames)).size, 9, `${name} ${width}: push, flight, ladle, scoop, separated rice and cheering states have distinct art`);
        assert.equal(new Set(Object.values(art.spills)).size, 3, `${name} ${width}: strong, left and right spills have distinct flight`);
        if (width === 390) for (const [label, data] of Object.entries(art.spills)) fs.writeFileSync(path.join(output, `spill-${label}-${name}.png`), Buffer.from(data.split(',')[1], 'base64'));
        assert.equal(new Set(art.dishes).size, 5, `${name} ${width}: doneness, separated rice and round plating change the finished dish`);
        assert.notEqual(art.mascotFrames.idle, art.mascotFrames.dance, `${name} ${width}: a good toss makes the mascot dance`);
        assert.notEqual(art.mascotFrames.idle, art.mascotFrames.caught, `${name} ${width}: every caught toss gets a celebration`);
        assert.notEqual(art.mascotFrames.dance, art.mascotFrames.danceLater, `${name} ${width}: dance animation changes over time`);
        assert.equal(art.mascotFrames.reduced, art.mascotFrames.reducedLater, `${name} ${width}: reduced motion holds a still celebration pose`);
        assert.equal(art.mascotFrames.idle, art.mascotFrames.miss, `${name} ${width}: a spill stops the dance`);
        assert.notEqual(art.mascotFrames.idle, art.mascotFrames.empty, `${name} ${width}: the mascot appears after rice is added`);
        assert.deepEqual(art.cheerLevels, [0, 1, 2, 3], `${name} ${width}: friends join at consecutive toss milestones`);
        assert.equal(art.friendsAfterSpill, 3, `${name} ${width}: earned friends stay after a spill`);
        assert.equal(new Set([0, 1, 3, 5].map(n => art.mascotFrames[`friends${n}`])).size, 4, `${name} ${width}: each milestone has a visibly larger crowd`);
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
          const guidance = await frame.locator('#recipeHint').evaluate(el => {
            el.textContent = '焦げてきた・味付けして盛ろう';
            const box = el.getBoundingClientRect();
            return { width: el.clientWidth, scrollWidth: el.scrollWidth, height: box.height };
          });
          assert.ok(guidance.width >= guidance.scrollWidth && guidance.height >= 12, `${name} ${width}: cooking guidance remains readable without clipping`);
          assert.ok(Math.abs((await page.locator('.chahan-shelf iframe').boundingBox()).y) <= 2, `${name} ${width}: starting aligns the game with the top of the screen`);
          const feedback = await frame.locator('.kitchen-feedback').boundingBox(), stage = await frame.locator('#swipeZone').boundingBox();
          assert.ok(feedback.y >= stage.y + stage.height - 1, `${name} ${width}: feedback stays outside the character scene`);
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
          if (width === 390 && venue === 0) {
            const centreFluff = await frame.locator('#fluffBar').evaluate(el => parseFloat(el.style.width));
            for (const side of [.25, .75]) {
              await frame.locator('#swipeZone').evaluate(async zone => {
                const start = Number(zone.dataset.gameTime), timeout = performance.now() + 5000;
                while (Number(zone.dataset.gameTime) - start < .25 && performance.now() < timeout) await new Promise(resolve => setTimeout(resolve, 20));
                if (Number(zone.dataset.gameTime) - start < .25) throw new Error('game clock did not advance before the next ladle tap');
              });
              await page.mouse.click(area.x + area.width * side, y);
            }
            assert.ok(await frame.locator('#fluffBar').evaluate(el => parseFloat(el.style.width)) > centreFluff, 'tapping other rice pockets separates more grains');
          }
          await page.screenshot({ path: path.join(output, `ladle-${venue}-${name}-${width}.png`), fullPage: true });
          await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 95, { steps: 8 }); await page.mouse.up();
          assert.equal(await frame.locator('#combo').textContent(), '1', `one flick toward the cook catches rice: ${await frame.locator('#tip').textContent()}`);
          if (width === 390 && venue === 0) {
            await frame.locator('#swipeZone').evaluate(async zone => {
              const start = Number(zone.dataset.gameTime), timeout = performance.now() + 5000;
              while (Number(zone.dataset.gameTime) - start < .5 && performance.now() < timeout) await new Promise(resolve => setTimeout(resolve, 20));
            });
            await page.mouse.move(x, y); await page.mouse.down();
            await page.mouse.move(x, y + 95, { steps: 8 });
            await page.mouse.move(x, y + 10, { steps: 8 }); await page.mouse.up();
            assert.equal(await frame.locator('#combo').textContent(), '2', 'returning the finger is optional after one forward wok pull');
            await page.mouse.move(x, y + 95); await page.mouse.down();
            await page.mouse.move(x, y, { steps: 8 }); await page.mouse.up();
            assert.equal(await frame.locator('#combo').textContent(), '2', 'a back swipe alone never tosses the wok');
          }
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
          assert.match(await frame.locator('.card.result .eyebrow').innerText(), /おたまで盛り付け/);
          assert.match(await frame.locator('[data-stat="plating"]').innerText(), /^\d+%$/);
          const resultBox = await frame.locator('.card.result').boundingBox(), frameBox = await page.locator('.chahan-shelf iframe').boundingBox();
          assert.ok(resultBox.y >= frameBox.y - 1 && resultBox.y + resultBox.height <= frameBox.y + frameBox.height + 1, `${name} ${width}: the result and replay control fit inside the game`);
          await page.screenshot({ path: path.join(output, `plated-${venue}-${name}-${width}.png`), fullPage: true });
        }
        assert.deepEqual(errors, [], `${name} ${width}: no JavaScript errors`);
        await page.close();
        const timeoutPage = await browser.newPage({ viewport: { width, height }, hasTouch: true });
        await timeoutPage.goto(base);
        await timeoutPage.locator('.chahan-shelf iframe').scrollIntoViewIfNeeded();
        const timeoutKitchen = timeoutPage.frameLocator('.chahan-shelf iframe');
        await timeoutKitchen.locator('#start').click();
        for (const ingredient of ['egg', 'rice', 'veg']) await timeoutKitchen.locator(`[data-ingredient="${ingredient}"]`).click();
        await timeoutKitchen.locator('[data-filling="scallion"]').click();
        await timeoutKitchen.locator('.card.result').waitFor({ timeout: 120000 });
        await timeoutKitchen.locator('#resultDish[data-revealed="true"]').waitFor();
        assert.match(await timeoutKitchen.locator('.card.result .eyebrow').innerText(), /時間切れ/, `${name} ${width}: timeout is identified`);
        assert.match(await timeoutKitchen.locator('#overlayText').innerText(), /時間切れ.*味付け/, `${name} ${width}: timeout explains the unfinished seasoning`);
        assert.equal(await timeoutKitchen.locator('[data-stat="plating"]').innerText(), '—', `${name} ${width}: timeout does not claim a plated score`);
        await timeoutPage.screenshot({ path: path.join(output, `timeout-${name}-${width}.png`) });
        await timeoutPage.close();
        for (const mode of ['settled', 'immediate', 'thumbnail']) {
          const slow = await browser.newPage({ viewport: { width, height }, hasTouch: true });
          await slow.goto(base);
          await slow.locator('.chahan-shelf iframe').scrollIntoViewIfNeeded();
          const kitchen = slow.frameLocator('.chahan-shelf iframe'), track = kitchen.locator('#venueTrack');
          await kitchen.locator('#heatControl').evaluate(async element => {
            const timeout = performance.now() + 10000;
            while (!element.style.getPropertyValue('--target') && performance.now() < timeout) await new Promise(resolve => setTimeout(resolve, 20));
            if (!element.style.getPropertyValue('--target')) throw new Error('game module did not initialize');
          });
          await track.evaluate(el => el.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true, pointerType: 'touch' })));
          await slow.waitForTimeout(1350);
          await track.evaluate((el, startNow) => {
            el.scrollLeft = el.clientWidth * 2;
            el.dispatchEvent(new Event('scroll'));
            if (startNow) document.querySelector('#start').click();
          }, mode === 'immediate');
          if (mode !== 'immediate') {
            await kitchen.locator('[data-venue="2"][aria-pressed="true"]').waitFor({ timeout: 3000 });
            if (mode === 'thumbnail') await kitchen.locator('[data-venue="1"]').click();
            await kitchen.locator('#start').click();
          }
          assert.equal(await kitchen.locator('#place').textContent(), mode === 'thumbnail' ? '走る列車' : '空中キッチン', `${name} ${width}: ${mode} selection after a slow swipe`);
          await slow.close();
        }
        if (name === 'chromium' && width === 390) {
          const touch = await browser.newPage({ viewport: { width, height }, hasTouch: true });
          await touch.goto(base);
          await touch.locator('.chahan-shelf iframe').scrollIntoViewIfNeeded();
          const kitchen = touch.frameLocator('.chahan-shelf iframe'), track = kitchen.locator('#venueTrack');
          await kitchen.locator('#heatControl').evaluate(async element => {
            const timeout = performance.now() + 10000;
            while (!element.style.getPropertyValue('--target') && performance.now() < timeout) await new Promise(resolve => setTimeout(resolve, 20));
            if (!element.style.getPropertyValue('--target')) throw new Error('game module did not initialize');
          });
          await track.scrollIntoViewIfNeeded();
          const box = await track.boundingBox(), x = box.x + box.width * .85, y = box.y + box.height * .5;
          const cdp = await touch.context().newCDPSession(touch);
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
          await touch.waitForTimeout(1350);
          for (let i = 1; i <= 8; i++) await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x - box.width * .7 * i / 8, y }] });
          await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
          await kitchen.locator('[data-venue="1"][aria-pressed="true"]').waitFor({ timeout: 5000 });
          await kitchen.locator('#start').click();
          assert.equal(await kitchen.locator('#place').textContent(), '走る列車', 'native touch after a long hold starts the visible kitchen');
          await touch.close();
        }
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
          const interrupted = await browser.newPage({ viewport: { width, height } });
          await interrupted.goto(base + 'chahan/');
          await interrupted.locator('#start').click();
          const cooking = interrupted.locator('#swipeZone');
          const interruptedBox = await cooking.boundingBox();
          await interrupted.mouse.move(interruptedBox.x + interruptedBox.width / 2, interruptedBox.y + 20);
          await interrupted.mouse.down();
          await cooking.evaluate(() => {
            Object.defineProperty(document, 'hidden', { configurable: true, value: true });
            document.dispatchEvent(new Event('visibilitychange'));
          });
          const stoppedAt = Number(await cooking.getAttribute('data-game-time'));
          await interrupted.waitForTimeout(500);
          assert.equal(Number(await cooking.getAttribute('data-game-time')), stoppedAt, `${name}: background cooking time stays paused even if animation frames run`);
          await cooking.evaluate(() => {
            Object.defineProperty(document, 'hidden', { configurable: true, value: false });
            document.dispatchEvent(new Event('visibilitychange'));
          });
          await interrupted.mouse.move(interruptedBox.x + interruptedBox.width / 2, interruptedBox.y + interruptedBox.height - 10);
          await interrupted.mouse.up();
          assert.equal(await interrupted.locator('#combo').textContent(), '0', `${name}: interrupted gestures do not toss on return`);
          await interrupted.waitForFunction(start => Number(document.querySelector('#swipeZone').dataset.gameTime) > start + .1, stoppedAt);
          await interrupted.close();
          const away = await browser.newPage({ viewport: { width, height } });
          await away.goto(base);
          const embedded = away.frameLocator('.chahan-shelf iframe');
          await away.locator('.chahan-shelf iframe').scrollIntoViewIfNeeded();
          await embedded.locator('#start').click();
          const embeddedZone = embedded.locator('#swipeZone');
          await embeddedZone.evaluate(async zone => {
            const start = Number(zone.dataset.gameTime), deadline = performance.now() + 5000;
            while (Number(zone.dataset.gameTime) < start + .15 && performance.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
            if (Number(zone.dataset.gameTime) < start + .15) throw new Error('cooking did not start before scrolling away');
          });
          await away.evaluate(() => window.scrollTo(0, 0));
          await away.waitForTimeout(300);
          const awayTime = Number(await embeddedZone.getAttribute('data-game-time'));
          await away.waitForTimeout(500);
          assert.equal(Number(await embeddedZone.getAttribute('data-game-time')), awayTime, `${name}: cooking pauses when the embedded game is offscreen`);
          await away.locator('.chahan-shelf iframe').scrollIntoViewIfNeeded();
          await embedded.locator('#noticeTitle').getByText('調理を再開').waitFor();
          const noticeBox = await embedded.locator('#stageNotice').boundingBox(), feedbackBox = await embedded.locator('.kitchen-feedback').boundingBox();
          assert.ok(noticeBox.y >= feedbackBox.y && noticeBox.y + noticeBox.height <= feedbackBox.y + feedbackBox.height + 1, `${name}: resumption notice stays outside the character scene`);
          await away.screenshot({ path: path.join(output, `resume-${name}-${width}.png`) });
          await embeddedZone.evaluate(async (zone, start) => {
            const deadline = performance.now() + 5000;
            while (Number(zone.dataset.gameTime) < start + .1 && performance.now() < deadline) await new Promise(resolve => setTimeout(resolve, 20));
            if (Number(zone.dataset.gameTime) < start + .1) throw new Error('cooking did not resume after returning to the game');
          }, awayTime);
          await away.close();
          const keyboard = await browser.newPage({ viewport: { width, height } });
          await keyboard.goto(base);
          await keyboard.locator('.chahan-shelf iframe').scrollIntoViewIfNeeded();
          const keys = keyboard.frameLocator('.chahan-shelf iframe');
          await keys.locator('#heatControl').evaluate(async element => {
            const timeout = performance.now() + 10000;
            while (!element.style.getPropertyValue('--target') && performance.now() < timeout) await new Promise(resolve => setTimeout(resolve, 20));
            if (!element.style.getPropertyValue('--target')) throw new Error('game module did not initialize');
          });
          await keys.locator('[data-venue="1"]').press('Space');
          assert.equal(await keys.locator('[data-venue="1"]').getAttribute('aria-pressed'), 'true', `${name}: Space selects a focused venue`);
          await keys.locator('#start').press('Space');
          assert.equal(await keys.locator('#place').textContent(), '走る列車', `${name}: Space starts the selected kitchen`);
          assert.equal(await keys.locator('#swipeZone').evaluate(el => document.activeElement === el), true, `${name}: game controls receive focus after starting`);
          for (const ingredient of ['egg', 'rice']) await keys.locator(`[data-ingredient="${ingredient}"]`).press('Space');
          assert.equal(await keys.locator('#combo').textContent(), '0', `${name}: activating ingredients does not toss`);
          const heat = keys.locator('#heatControl'), initialHeat = Number(await heat.inputValue());
          await heat.press('ArrowUp');
          assert.equal(Number(await heat.inputValue()), initialHeat + 1, `${name}: arrow keys adjust the focused heat slider`);
          const zone = keys.locator('#swipeZone');
          for (let i = 0; i < 12; i++) { await zone.press('l'); await keyboard.waitForTimeout(230); }
          assert.ok(await keys.locator('#fluffBar').evaluate(el => parseFloat(el.style.width)) > 38, `${name}: keyboard ladle reaches more than the centre rice pocket`);
          await zone.press('Space');
          assert.equal(await keys.locator('#combo').textContent(), '1', `${name}: Space tosses when the cooking scene has focus`);
          await keyboard.close();
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
