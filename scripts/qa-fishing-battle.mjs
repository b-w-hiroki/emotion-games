import { chromium, webkit } from 'playwright';
import { mkdir, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, join, extname } from 'node:path';

const root = resolve('dist/fishing-battle');
const server = createServer(async (req, res) => {
  const name = req.url === '/' ? 'index.html' : req.url.slice(1);
  if (!['index.html', 'style.css', 'game.js', 'core.js'].includes(name)) { res.writeHead(404).end(); return; }
  res.setHeader('Content-Type', ({ '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' })[extname(name)]);
  res.end(await readFile(join(root, name)));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const url = `http://127.0.0.1:${server.address().port}/`;
const out = resolve('artifacts/fishing-battle');
await mkdir(out, { recursive: true });
for (const [name, engine] of [['chromium', chromium], ['webkit', webkit]]) {
  let browser;
  try { browser = await engine.launch({ headless: true }); }
  catch (error) { console.log(`${name}: unavailable (${error.message.split('\n')[0]})`); continue; }
  for (const [width, height] of [[390, 844], [360, 640]]) {
    const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto(url);
    await page.waitForTimeout(150);
    await page.screenshot({ path: `${out}/${name}-${width}x${height}.png`, fullPage: true });
    const reel = page.locator('#reel');
    await reel.click();
    const progress = await page.locator('#progressFill').evaluate(el => parseFloat(el.style.width));
    if (!(progress > 35)) throw new Error(`${name} ${width}: reel input did not advance`);
    if (errors.length) throw new Error(`${name} ${width}: ${errors.join('; ')}`);
    console.log(`${name} ${width}x${height}: reel ${progress}%, no page errors`);
    await page.close();
  }
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.goto(url);
  for (let i = 0; i < 55 && await page.locator('#result').isHidden(); i++) {
    const phase = await page.locator('#cue').getAttribute('class');
    if (phase?.includes('calm') || phase?.includes('opening')) await page.locator('#reel').click();
    await page.waitForTimeout(240);
  }
  if (!await page.locator('#result').isVisible() || !await page.locator('#resultTitle').textContent().then(t => t.includes('釣り上げた'))) throw new Error(`${name}: natural catch path failed`);
  await page.screenshot({ path: `${out}/${name}-caught.png` });
  await page.locator('#retry').click();
  for (let i = 0; i < 80 && await page.locator('#result').isHidden(); i++) {
    const phase = await page.locator('#cue').getAttribute('class');
    if (phase?.includes('rage')) await page.locator('#reel').click();
    await page.waitForTimeout(240);
  }
  if (!await page.locator('#result').isVisible() || !await page.locator('#resultTitle').textContent().then(t => t.includes('逃げた'))) throw new Error(`${name}: natural escape path failed`);
  await page.screenshot({ path: `${out}/${name}-escaped.png` });
  console.log(`${name}: natural catch and escape paths passed`);
  await page.close();
  await browser.close();
}
server.close();
