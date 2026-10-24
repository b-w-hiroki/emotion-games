// Capture the live rice toss from the built game for visual review.
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const root = path.resolve('dist');
const output = path.resolve('docs/chahan/rice-toss-demo.webm');
const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  const relative = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\//, '');
  const file = path.resolve(root, relative.endsWith('/') ? `${relative}index.html` : relative);
  if (!file.startsWith(root + path.sep)) { res.writeHead(403); res.end(); return; }
  fs.readFile(file, (error, data) => {
    if (error) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'content-type': mime[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const browser = await chromium.launch({ headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, recordVideo: { dir: path.resolve('artifacts/chahan'), size: { width: 390, height: 844 } } });
  const page = await context.newPage();
  await page.goto(`http://127.0.0.1:${server.address().port}/chahan/`);
  await page.locator('#start').click();
  await page.evaluate(() => { document.getElementById('stageNotice').hidden = true; });
  await page.waitForTimeout(300);
  const box = await page.locator('#swipeZone').boundingBox();
  const x = box.x + box.width * .48, y = box.y + box.height * .36;
  await page.mouse.move(x, y); await page.mouse.down(); await page.mouse.move(x, y + 115, { steps: 8 }); await page.mouse.up();
  await page.waitForTimeout(900);
  const video = page.video();
  await page.close();
  await video.saveAs(output);
  await context.close();
  console.log(`Saved ${output}`);
} finally { await browser.close(); server.close(); }
