import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import cp from 'node:child_process';
const games=JSON.parse(fs.readFileSync('catalog.json')).games;
test('catalog has four distinct safe slugs',()=>{assert.equal(games.length,4);assert.equal(new Set(games.map(g=>g.slug)).size,games.length);for(const g of games){assert.match(g.slug,/^[a-z][a-z0-9-]+$/);assert.ok(g.feature.length>=10)}});
test('runtime provides result sharing and replay',()=>{const src=fs.readFileSync('assets/app.js','utf8');for(const snippet of ['navigator.share','game_retry','game_complete','pointerdown','pointercancel','requestAnimationFrame'])assert.ok(src.includes(snippet),snippet)});
test('runtime script parses',()=>{assert.equal(cp.spawnSync(process.execPath,['--check','assets/app.js']).status,0)});
test('workflow verifies before deploy',()=>{const w=fs.readFileSync('.github/workflows/pages.yml','utf8');assert.ok(w.includes('needs: verify'));assert.ok(w.includes('deploy-pages@v4'))});

test('GitHub Pages deployment sets the canonical custom origin for social previews',()=>{
 const workflow=fs.readFileSync('.github/workflows/pages.yml','utf8');
 assert.match(workflow,/PUBLIC_ORIGIN:\s*https:\/\/play\.birdman-studio\.com/);
 assert.match(workflow,/uses: actions\/deploy-pages@v4/);
});
