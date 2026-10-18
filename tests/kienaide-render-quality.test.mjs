import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source=fs.readFileSync('assets/kienaide-view.js','utf8');
test('adaptive resolution never creates sub-CSS-pixel canvas and restores high quality after reset',()=>{
 const resize=source.slice(source.indexOf('function resize(canvas)'),source.indexOf('function toWorld'));
 for(const devicePixelRatio of [1,2,3])for(const quality of [.5,.8,1]){
  const view={},ctx={};
  const canvas={getBoundingClientRect:()=>({width:390,height:844}),getContext:()=>ctx};
  const context={root:{devicePixelRatio},perf:{quality},view,H:480,Math,canvas};
  vm.runInNewContext(resize+';resize(canvas)',context);
  assert.ok(canvas.width>=390&&canvas.height>=844);assert.ok(view.dpr<=2);
  assert.equal(ctx.imageSmoothingEnabled,true);assert.equal(ctx.imageSmoothingQuality,'high');
 }
});
test('paper grain is restrained and stationary instead of stepping across the image',()=>{
 const grain=source.slice(source.indexOf('function paperGrain'),source.indexOf('// ---------- traveller'));
 assert.doesNotMatch(grain,/translate|Math\.floor|t\*/);
 assert.match(grain,/globalAlpha=\.06/);
});
