import test from 'node:test';import assert from 'node:assert/strict';import fs from 'node:fs';import cp from 'node:child_process';import vm from 'node:vm';
const games=JSON.parse(fs.readFileSync('catalog.json')).games;
test('catalog has twenty distinct safe slugs',()=>{assert.equal(games.length,20);assert.equal(new Set(games.map(g=>g.slug)).size,games.length);for(const g of games){assert.match(g.slug,/^[a-z][a-z0-9-]+$/);assert.ok(g.feature.length>=10)}});
test('home spotlights only Kienaide while keeping all direct game routes',()=>{const app=fs.readFileSync('assets/app.js','utf8');const home=app.slice(app.indexOf('if(!game){'),app.indexOf('const candle=slug'));assert.match(home,/\.\/kienaide\//);assert.doesNotMatch(home,/games\.map\(/);assert.match(home,/kienaide-lettering/);assert.match(fs.readFileSync('assets/kienaide-lettering.svg','utf8'),/<title id="title">きえないで。<\/title>/)});
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

test('four separately painted Kienaide chapters ship in the build',async()=>{
 const {default:sharp}=await import('sharp');
 const build=fs.readFileSync('scripts/build.mjs','utf8'),view=fs.readFileSync('assets/kienaide-view.js','utf8');
 assert.ok(build.includes("path.join(root,'assets','kienaide','paint')"),'painted layers are copied');
 assert.ok(view.includes("base+'assets/kienaide/paint/'"),'normal display uses the painted layers');
 const m=JSON.parse(fs.readFileSync('assets/kienaide/paint/manifest.json','utf8'));
 assert.equal(m.generator,'scripts/art/kienaide-paint.mjs','layers can be regenerated from the masters');
 const means=[];
 for(const c of ['ch1','ch2','ch3','ch4']){
  for(const layer of ['sky','far','mid','fore','lights'])assert.ok(fs.statSync('assets/kienaide/paint/'+c+'-'+layer+'.webp').size>2000,c+layer);
  const src='assets/kienaide/paint/src/'+c+'.webp',meta=await sharp(src).metadata();
  assert.ok(meta.width>=750&&meta.height>=1300,c+' master is high resolution');
  const st=await sharp(src).resize(32,42).raw().toBuffer();means.push(st);
 }
 // Four different compositions, not one picture recoloured or cropped.
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){let d=0;for(let k=0;k<means[i].length;k++)d+=Math.abs(means[i][k]-means[j][k]);assert.ok(d/means[i].length>14,'chapters '+(i+1)+'/'+(j+1)+' differ ('+(d/means[i].length).toFixed(1)+')')}
});
test('every approved painting has a smaller AVIF alternative and keeps its WebP fallback',async()=>{
 const {default:sharp}=await import('sharp');const files=JSON.parse(fs.readFileSync('assets/kienaide/paint/manifest.json','utf8')).files.filter(file=>!file.endsWith('-basefore.webp'));
 let webpBytes=0,avifBytes=0;
 for(const file of files){const webp='assets/kienaide/paint/'+file,avif=webp.replace(/\.webp$/,'.avif');webpBytes+=fs.statSync(webp).size;avifBytes+=fs.statSync(avif).size;
  const original=await sharp(webp).metadata(),alternative=await sharp(avif).metadata();assert.equal(alternative.format,'heif');assert.equal(alternative.compression,'av1');assert.equal(alternative.width,original.width);assert.equal(alternative.height,original.height)}
 assert.ok(avifBytes<webpBytes*.8,'AVIF transfer must save at least 20 percent without removing WebP');
 assert.match(fs.readFileSync('scripts/build.mjs','utf8'),/endsWith\('\.avif'\)/,'the alternate paintings ship in dist');
});
test('the lead character poses, rim light and living flame are separately replaceable',()=>{
 const view=fs.readFileSync('assets/kienaide-view.js','utf8');
 for(const name of ['hero-body','hero-shield','hero-walk','hero-brace','hero-rim','flame-calm','flame-afraid','flame-comfort','flame-suffocating','flame-hope'])assert.ok(fs.statSync('assets/kienaide/paint/'+name+'.webp').size>2000,name);
 assert.ok(view.includes("if(st.shield&&ready('hero-shield'))return 'hero-shield'"),'the full body changes to the shielding pose');
 assert.ok(view.includes('function drawFlame(ctx,st,at)'),'flame is drawn live from the flame spirit');
});

test('every character state uses the restrained gouache repaint source set',async()=>{
 const {default:sharp}=await import('sharp');
 const m=JSON.parse(fs.readFileSync('assets/kienaide/paint/manifest.json','utf8'));
 assert.equal(m.characterArtVersion,'repaint-v2');
 assert.equal(m.characterSources.length,14,'the neutral body plus all gameplay and ending poses are covered');
 for(const source of m.characterSources){
  const p='assets/kienaide/paint/src/'+source,meta=await sharp(p).metadata();
  assert.equal(meta.format,'png',source+' stays as a lossless source master');
  assert.ok(meta.hasAlpha,source+' must preserve transparency');
  assert.ok(Math.abs(meta.width/meta.height-.75)<.01,source+' must remain a 3:4 sprite');
 }
});

test('the handmade frost wash keeps the playable centre transparent',async()=>{
 const {default:sharp}=await import('sharp');
 const p='assets/kienaide/paint/frost-edge.webp',m=JSON.parse(fs.readFileSync('assets/kienaide/paint/manifest.json','utf8'));
 assert.ok(fs.statSync(p).size>10000,'painted frost overlay ships');
 assert.ok(m.generatedSources.includes('frost-edge'),'the overlay is reproducible from its source master');
 const {data,info}=await sharp(p).ensureAlpha().resize(90,120).raw().toBuffer({resolveWithObject:true});let edge=0,centre=0,ne=0,nc=0;
 for(let y=0;y<info.height;y++)for(let x=0;x<info.width;x++){const a=data[(y*info.width+x)*4+3],isCentre=x>22&&x<68&&y>24&&y<96;if(isCentre){centre+=a;nc++}else{edge+=a;ne++}}
 assert.ok(centre/nc<8,'centre must remain readable ('+(centre/nc).toFixed(1)+')');
 assert.ok(edge/ne>centre/nc+25,'frost belongs at the frame edge');
});

test('Kienaide controls use live type instead of generated button lettering',()=>{
 const css=fs.readFileSync('assets/style.css','utf8');
 const app=fs.readFileSync('assets/app.js','utf8'),view=fs.readFileSync('assets/kienaide-view.js','utf8');
 assert.doesNotMatch(css,/\.action\.art-hold\{[^}]*hold-button\.webp/);
 assert.doesNotMatch(css,/\.btn\.art-start\{[^}]*start-button\.webp/);
 assert.doesNotMatch(app,/start-button\.webp/,'the generated title button must not be loaded at runtime');
 assert.match(app,/\$\('play'\)\.textContent='旅をはじめる'/,'the title action uses visible, editable live type');
 assert.match(css,/\.action\.art-hold\{[^}]*color:#fff0d2/);
 assert.match(css,/\.action\.art-hold\{[^}]*min-height:112px/,'the primary input is a full thumb deck, not a thin pill');
 assert.match(app,/class="action-cue"/,'the live cue belongs to the control surface');
 assert.match(view,/dataset\.transition=changing\?'blizzard'/,'chapter art changes are masked by a staged transition');
 assert.match(view,/dataset\.poseTransition=fade<1\?'dissolve'/,'meaningful pose changes dissolve instead of snapping');
 assert.doesNotMatch(css,/\.action\.art-hold\{[^}]*border:1px/,'the control deck must not be enclosed by a decorative frame');
});

test('Kienaide prologue lines follow phrases without a stranded short tail',()=>{
 const context={window:{}};vm.runInNewContext(fs.readFileSync('assets/kienaide-view.js','utf8'),context);
 const script=context.window.KienaideView.INTRO;assert.equal(script.length,6);
 for(const cue of script){assert.equal(cue.rows.join(''),cue.text,'spoken and painted copy must match');assert.ok(cue.rows.every(row=>[...row].length>5),'short prologue fragment: '+JSON.stringify(cue.rows));assert.ok(cue.rows.every(row=>!row.startsWith('。')&&!row.startsWith('、')),'punctuation must not begin a line')}
});

test('character finishing does not add filters on every frame',()=>{
 const view=fs.readFileSync('assets/kienaide-view.js','utf8');
 assert.doesNotMatch(view,/g\.filter=.*blur/,'WebKit must not run character filters during play');
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
