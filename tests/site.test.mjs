import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import cp from 'node:child_process';
const games=JSON.parse(fs.readFileSync('catalog.json')).games;
test('catalog has twenty distinct safe slugs',()=>{assert.equal(games.length,20);assert.equal(new Set(games.map(g=>g.slug)).size,games.length);for(const g of games){assert.match(g.slug,/^[a-z][a-z0-9-]+$/);assert.ok(g.feature.length>=10)}});
test('runtime provides result sharing and replay',()=>{const src=fs.readFileSync('assets/app.js','utf8');for(const snippet of ['navigator.share','game_retry','game_complete','pointerdown','pointercancel','requestAnimationFrame'])assert.ok(src.includes(snippet),snippet)});
test('kienaide is a complete vertical slice rather than a short gauge demo',()=>{const src=fs.readFileSync('assets/app.js','utf8');for(const snippet of ['journey:90','第一章　雪の路地','最終章　夜明け前','memory_collected','AudioContext','story-beat','s.memories===3'])assert.ok(src.includes(snippet),snippet)});
test('runtime script parses',()=>{assert.equal(cp.spawnSync(process.execPath,['--check','assets/app.js']).status,0)});
test('workflow verifies before deploy',()=>{const w=fs.readFileSync('.github/workflows/pages.yml','utf8');assert.ok(w.includes('needs: verify'));assert.ok(w.includes('deploy-pages@v4'))});

test('GitHub Pages deployment sets the canonical custom origin for social previews',()=>{
 const workflow=fs.readFileSync('.github/workflows/pages.yml','utf8');
 assert.match(workflow,/PUBLIC_ORIGIN:\s*https:\/\/play\.birdman-studio\.com/);
 assert.match(workflow,/uses: actions\/deploy-pages@v4/);
});

test('every game has public microgame script in generated page contract',()=>{const s=fs.readFileSync('scripts/build.mjs','utf8');assert.ok(s.includes("'microgames.js'"));assert.ok(s.includes('assets/microgames.js'))});

test('four separate illustrated Kienaide chapter SVG assets ship in the build',()=>{
 const names=['snow-street','wind-tunnel','frozen-bridge','dawn-village'];
 const build=fs.readFileSync('scripts/build.mjs','utf8');
 const app=fs.readFileSync('assets/app.js','utf8');
 for(const name of names){
  const path='assets/kienaide-'+name+'.svg';
  const art=fs.readFileSync(path,'utf8');
  assert.ok(art.includes('<svg'),path);
  assert.ok(art.length>3000,path+' must be a real visual layer');
  assert.ok(build.includes("'"+name+"'"),name+' not built');
  assert.ok(app.includes("'"+name+"'"),name+' not rendered');
 }
 assert.ok(app.includes('ctx.drawImage(scene,0,0,360,400)'));
});

test('the lead character and flame sprite are built as separately replaceable assets',()=>{
 const build=fs.readFileSync('scripts/build.mjs','utf8');
 const app=fs.readFileSync('assets/app.js','utf8');
 for(const name of ['hero','flame']){
  const art=fs.readFileSync('assets/kienaide-'+name+'.svg','utf8');
  assert.ok(art.includes('<svg')&&art.includes('</svg>'),name);
  assert.ok(art.length>1200,name);
  assert.ok(build.includes("'"+name+"'"),name+' not included in build');
 }
 assert.ok(app.includes('ctx.drawImage(characterArt.hero,0,0,360,400)'));
 assert.ok(app.includes('ctx.drawImage(characterArt.flame'));
 assert.ok(app.includes('if(heroReady)')&&app.includes('if(flameReady)'));
});
