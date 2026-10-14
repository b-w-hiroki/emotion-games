import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import cp from 'node:child_process';
const games=JSON.parse(fs.readFileSync('catalog.json')).games;
test('catalog has three distinct safe slugs',()=>{assert.equal(games.length,3);assert.equal(new Set(games.map(g=>g.slug)).size,3);for(const g of games){assert.match(g.slug,/^[a-z][a-z0-9-]+$/);assert.ok(g.feature.length>=10)}});
test('runtime provides result sharing and replay',()=>{const src=fs.readFileSync('assets/app.js','utf8');for(const snippet of ['navigator.share','game_retry','game_complete','pointerdown','pointercancel','requestAnimationFrame'])assert.ok(src.includes(snippet),snippet)});
test('runtime script parses',()=>{assert.equal(cp.spawnSync(process.execPath,['--check','assets/app.js']).status,0)});
test('workflow verifies before deploy',()=>{const w=fs.readFileSync('.github/workflows/pages.yml','utf8');assert.ok(w.includes('needs: verify'));assert.ok(w.includes('deploy-pages@v4'))});
