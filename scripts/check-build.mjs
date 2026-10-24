import fs from 'node:fs';import assert from 'node:assert/strict';const d='dist/',cat=JSON.parse(fs.readFileSync('catalog.json'));for(const slug of ['',...cat.games.map(g=>g.slug)]){const p=d+(slug?slug+'/':'')+'index.html';const html=fs.readFileSync(p,'utf8');assert.match(html,/property="og:image"/);assert.match(html,/assets\/app\.js/);assert.ok(fs.statSync(d+'assets/og/'+(slug||'index')+'.png').size>3000);console.log('OK',p)}assert.ok(fs.existsSync(d+'privacy.html'));
for(const file of JSON.parse(fs.readFileSync('assets/kienaide/paint/manifest.json')).files.filter(file=>!file.endsWith('-basefore.webp'))){for(const ext of ['webp','avif'])assert.ok(fs.existsSync(d+'assets/kienaide/paint/'+file.replace(/\.webp$/,'.'+ext)),'missing built painting: '+file+' '+ext)}
for (const scene of ['street', 'train', 'sky', 'wok-v2', 'toss-v2']) {
  const file = fs.readFileSync(`${d}chahan/art/${scene}.webp`);
  assert.equal(file.toString('ascii', 0, 4), 'RIFF', `invalid Chahan painting: ${scene}`);
  assert.equal(file.toString('ascii', 8, 12), 'WEBP', `invalid Chahan painting: ${scene}`);
  assert.ok(file.length < 250_000, `Chahan painting is too large: ${scene}`);
}
