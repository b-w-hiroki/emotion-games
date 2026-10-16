// Traveller, flame and light are separate layers: no fire is painted into the character or
// backgrounds, and every warm light the flame casts is scaled by the flame itself.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const view=readFileSync(new URL('../assets/kienaide-view.js',import.meta.url),'utf8');
const layer=n=>readFileSync(new URL('../assets/kienaide/'+n+'.svg',import.meta.url),'utf8');
const warm=/#(f[0-9a-f]{2}[0-9a-f]{3}|ff[0-9a-f]{4})/gi;
test('character layers carry no baked flame or glow',()=>{
 for(const n of ['hero-body','hero-hands-hold','hero-hands-shield']){
  const svg=layer(n);
  assert.doesNotMatch(svg,/radialGradient/,n+' must not contain a glow');
  assert.deepEqual(svg.match(warm)||[],[],n+' must not contain fire colours');
 }
});
test('rim light is a neutral mask, tinted and scaled by the flame at runtime',()=>{
 const rim=layer('hero-rim');
 assert.deepEqual([...new Set(rim.match(/fill="#[0-9a-f]+"|stroke="#[0-9a-f]+"/gi))].sort(),['fill="#fff"','stroke="#fff"']);
 assert.ok(view.includes("if(st.light>0){const rim=raster('hero-rim'"));
 assert.ok(view.includes('ctx.globalAlpha=Math.min(1,st.light*1.05)'));
});
test('a dead flame emits no light',()=>{
 assert.match(view,/if\(health<=0\)\{[\s\S]*?return;\s*\}/);
 assert.ok(view.includes("const light=Math.max(0,Math.min(1,s.flame/100))"));
 assert.ok(view.includes("if(st.light>0){const g=ctx.createRadialGradient"),'ground light pool only while burning');
});
test('chapter backgrounds never contain the traveller or flame',()=>{
 for(const c of [1,2,3,4])for(const l of ['sky','far','mid','fore']){const svg=layer('ch'+c+'-'+l);assert.doesNotMatch(svg,/少女|traveller|flame/i)}
});
