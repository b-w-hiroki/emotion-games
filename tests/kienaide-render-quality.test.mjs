import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('assets/kienaide-view.js','utf8');
test('adaptive resolution preserves Retina CSS density and bounds 1x display fallback to 80 percent',()=>{
 const resize=source.slice(source.indexOf('function resize(canvas)'),source.indexOf('function toWorld'));
 for(const devicePixelRatio of [1,2,3])for(const quality of [.5,.8,1]){
  const view={},ctx={};
  const canvas={getBoundingClientRect:()=>({width:390,height:844}),getContext:()=>ctx};
  const context={root:{devicePixelRatio},perf:{quality},view,H:480,Math,canvas,resizeTarget:null};
  vm.runInNewContext(resize+';resize(canvas)',context);
  const floor=devicePixelRatio>1?1:.8;assert.ok(canvas.width>=390*floor&&canvas.height>=Math.round(844*floor));assert.ok(view.dpr<=2);
  assert.equal(ctx.imageSmoothingEnabled,true);assert.equal(ctx.imageSmoothingQuality,'low');
  const next={getBoundingClientRect:canvas.getBoundingClientRect,getContext:()=>ctx};
  context.next=next;vm.runInNewContext('resize(next)',context);
  assert.equal(next.width,canvas.width,'a second canvas gets its own backing resolution at the same CSS size');
  assert.equal(next.height,canvas.height);
 }
});
test('high quality character resampling happens once per target size, not every frame',()=>{
 const fn=source.slice(source.indexOf('function heroLit'),source.indexOf('function heroPose'));
 const cache=new Map(),contexts=[],canvases=[],image={naturalWidth:900,naturalHeight:1200};
 const document={createElement:()=>{const g={drawImage(){},fillRect(){}},c={getContext:()=>g};contexts.push(g);canvases.push(c);return c}};
 const context={cache,imgs:{pose:image},ready:()=>true,heroBox:()=>({h:360}),view:{scale:1,dpr:2},document,AMBIENT:['#b9c3dd']};
 vm.runInNewContext(fn+';heroLit("pose",0);heroLit("pose",0)',context);
 assert.equal(canvases.length,1);assert.equal(canvases[0].height,768);assert.equal(canvases[0].width,576);assert.equal(contexts[0].imageSmoothingQuality,'high');
 context.view.dpr=1;vm.runInNewContext('heroLit("pose",0)',context);
 assert.equal(canvases.length,2);assert.equal(canvases[1].height,384);assert.equal(cache.size,1,'replace the old size rather than accumulating resize copies');
});
test('paper grain is restrained and stationary instead of stepping across the image',()=>{
 const grain=source.slice(source.indexOf('function paperGrain'),source.indexOf('// ---------- traveller'));
 assert.doesNotMatch(grain,/translate|Math\.floor|t\*/);
 assert.match(grain,/globalAlpha=\.06/);
});
