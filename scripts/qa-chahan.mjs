// Browser QA for the playable fried-rice slice. Run after npm run build.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium, webkit } from 'playwright';

const root = path.resolve('dist'), output = path.resolve('artifacts/chahan');
fs.mkdirSync(output, { recursive: true });
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, '');
  const file = path.resolve(root, relative.endsWith('/') ? `${relative}index.html` : relative);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => { if (error) { res.writeHead(404); res.end(); return; } res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' }); res.end(data); });
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/chahan/`;
try {
  for (const [engine, name] of [[chromium, 'chromium'], [webkit, 'webkit']]) {
    const browser = await engine.launch({ headless: true });
    try {
      for (const [width, height] of [[390, 844], [360, 640]]) {
        const page = await browser.newPage({ viewport: { width, height }, hasTouch: true });
        const errors = []; page.on('pageerror', error => errors.push(error.message));
        await page.addInitScript(() => { if (window.DeviceMotionEvent) Object.defineProperty(DeviceMotionEvent, 'requestPermission', { configurable: true, value: () => Promise.resolve('granted') }); });
        await page.goto(url);
        await page.screenshot({ path: path.join(output, `title-${name}-${width}.png`) });
        await page.locator('#start').click();
        const box = await page.locator('#swipeZone').boundingBox();
        const x = box.x + box.width * .48, y = box.y + box.height * .35;
        await page.mouse.move(x, y + 115); await page.mouse.down(); await page.mouse.move(x, y, { steps: 8 }); await page.mouse.up();
        assert.equal(await page.locator('#combo').textContent(), '0', `${name} ${width}: upward swipe must not toss`);
        await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 115, { steps: 8 }); await page.mouse.up();
        assert.equal(await page.locator('#combo').textContent(), '1', `${name} ${width}: pulling toward the player tosses rice`);
        await page.locator('#motionButton').click();
        await page.waitForTimeout(450);
        await page.evaluate(() => { const event = new Event('devicemotion'); Object.defineProperty(event, 'acceleration', { value: { x: 0, y: 0, z: 5.6 } }); window.dispatchEvent(event); });
        assert.equal(await page.locator('#combo').textContent(), '2', `${name} ${width}: sensor pull toward the player tosses rice`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth), 0, `${name} ${width}: no horizontal overflow`);
        assert.deepEqual(errors, [], `${name} ${width}: no runtime errors`);
        await page.screenshot({ path: path.join(output, `game-${name}-${width}.png`) });
        await page.close();
        console.log(`PASS chahan ${name} ${width}x${height}: pull gesture and layout`);
      }
    } finally { await browser.close(); }
  }
} finally { server.close(); }
