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
        assert.equal(new URL(page.url()).pathname, '/', `${name} ${width}: game shares the studio page`);
        assert.equal(await frame.locator('[data-venue]').count(), 3);
        await page.screenshot({ path: path.join(output, `studio-${name}-${width}.png`), fullPage: true });
        for (const [venue, filling, target] of [[0, 'scallion', 72], [1, 'pork', 55], [2, 'shrimp', 38]]) {
          await frame.locator(`[data-venue="${venue}"]`).click();
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
      }
    } finally { await browser.close(); }
  }
} finally { server.close(); }
console.log('Chahan integrated browser QA passed');
