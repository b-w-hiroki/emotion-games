import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import cp from 'node:child_process';
const games=JSON.parse(fs.readFileSync('catalog.json')).games;
test('catalog has twenty distinct safe slugs',()=>{assert.equal(games.length,20);assert.equal(new Set(games.map(g=>g.slug)).size,games.length);for(const g of games){assert.match(g.slug,/^[a-z][a-z0-9-]+$/);assert.ok(g.feature.length>=10)}});
test('runtime provides result sharing and replay',()=>{const src=fs.readFileSync('assets/app.js','utf8');for(const snippet of ['navigator.share','game_retry','game_complete','pointerdown','pointercancel','requestAnimationFrame'])assert.ok(src.includes(snippet),snippet)});
test('kienaide is a complete vertical slice rather than a short gauge demo',()=>{const src=fs.readFileSync('assets/app.js','utf8')+fs.readFileSync('assets/kienaide-core.js','utf8')+fs.readFileSync('assets/kienaide-audio.js','utf8');for(const snippet of ['JOURNEY=90','第一章　雪の路地','最終章　夜明け前','memory_collected','AudioContext','story-beat','s.memories===3'])assert.ok(src.includes(snippet),snippet)});
test('runtime script parses',()=>{assert.equal(cp.spawnSync(process.execPath,['--check','assets/app.js']).status,0)});
test('workflow verifies before deploy',()=>{const w=fs.readFileSync('.github/workflows/pages.yml','utf8');assert.ok(w.includes('needs: verify'));assert.ok(w.includes('deploy-pages@v4'))});

test('GitHub Pages deployment sets the canonical custom origin for social previews',()=>{
 const workflow=fs.readFileSync('.github/workflows/pages.yml','utf8');
 assert.match(workflow,/PUBLIC_ORIGIN:\s*https:\/\/play\.birdman-studio\.com/);
 assert.match(workflow,/uses: actions\/deploy-pages@v4/);
});

test('every game has public microgame script in generated page contract',()=>{const s=fs.readFileSync('scripts/build.mjs','utf8');assert.ok(s.includes("'microgames.js'"));assert.ok(s.includes('assets/microgames.js'))});

test('four separate layered Kienaide chapters ship in the build',()=>{
 const build=fs.readFileSync('scripts/build.mjs','utf8'),view=fs.readFileSync('assets/kienaide-view.js','utf8');
 assert.ok(build.includes("path.join(root,'assets','kienaide')"),'layer folder is copied');
 const sizes=[];
 for(const c of [1,2,3,4]){
  for(const layer of ['sky','far','mid','fore','lights']){const art=fs.readFileSync('assets/kienaide/ch'+c+'-'+layer+'.svg','utf8');assert.ok(art.includes('<svg')&&art.includes('</svg>'),c+layer)}
  sizes.push(fs.readFileSync('assets/kienaide/ch'+c+'-mid.svg','utf8'));
 }
 assert.equal(new Set(sizes).size,4,'every chapter has its own composition, not a recolour');
 for(const s of sizes)assert.ok(s.length>3000,'mid layers carry real detail');
 assert.ok(view.includes("const CHAPTER_KEYS=['ch1','ch2','ch3','ch4']"));
 const manifest=JSON.parse(fs.readFileSync('assets/kienaide/manifest.json','utf8'));
 assert.equal(manifest.generator,'scripts/art/kienaide-art.mjs','layers can be regenerated');
});
test('the lead character, hands, rim light and flame are separately replaceable',()=>{
 const view=fs.readFileSync('assets/kienaide-view.js','utf8');
 for(const name of ['hero-body','hero-hands-hold','hero-hands-shield','hero-rim']){const art=fs.readFileSync('assets/kienaide/'+name+'.svg','utf8');assert.ok(art.includes('<svg')&&art.includes('</svg>')&&art.length>300,name)}
 assert.ok(view.includes("raster(st.shield?'hero-hands-shield':'hero-hands-hold'"),'hands change with the shield gesture');
 assert.ok(view.includes('function drawFlame(ctx,st,at)'),'flame is drawn live, not painted');
});

test('optimized playable Kienaide v3 images remain valid WebP binaries',()=>{
 const names=['snow-town','traveller-flame','flame-spirit','hold-button','start-button','retry-button','gallery-button'];
 const build=fs.readFileSync('scripts/build.mjs','utf8');
 for(const n of names){
  const p='assets/kienaide-v3/'+n+'.webp';
  const d=fs.readFileSync(p);
  assert.ok(d.byteLength>5000,p);
  assert.equal(d.toString('ascii',0,4),'RIFF',p+' header');
  assert.equal(d.toString('ascii',8,12),'WEBP',p+' signature');
  assert.ok(build.includes("'"+n+"'"),p+' not copied to dist');
 }
 const preview=fs.readFileSync('previews/kienaide-v3.html','utf8');
 assert.ok(preview.includes('assets/kienaide-v3/snow-town.webp'));
 assert.ok(preview.includes('kienaide-art-endings-v1'));
 assert.ok(build.includes("kienaide-preview"));
});

test('Kienaide flame is independent from character art and extinguishes at zero',()=>{
 const src=fs.readFileSync('previews/kienaide-v3.html','utf8');
 for(const marker of ['id="flameSprite"','class="hero-underlay"','mask-image:radial-gradient','--flame-opacity','scene.classList.toggle(\'extinguished\',s.flame<=0)']){
  assert.ok(src.includes(marker),marker);
 }
});

test('the playable high-art preview uses distinct scenery for all four chapters',()=>{
 const src=fs.readFileSync('previews/kienaide-v3.html','utf8');
 const names=['snow-street','wind-tunnel','frozen-bridge','dawn-village'];
 for(const name of names)assert.ok(src.includes("'"+name+"'"),name);
 assert.ok(src.includes('function showChapterArt(ch)'));
 assert.ok(src.includes('scene.classList.add(\'scene-ready\')'));
 assert.ok(src.includes('prefers-reduced-motion:reduce'));
});
