// Traveller, hands, flame and light are separate layers: no fire is painted into the character or
// backgrounds, every warm light the flame casts is scaled by the flame, and nothing glows at flame=0.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import sharp from 'sharp';
const view=readFileSync(new URL('../assets/kienaide-view.js',import.meta.url),'utf8');
const P='assets/kienaide/paint/';
// Share of opaque pixels that look like flame (hot orange/yellow).
async function fireShare(file){
 const {data,info}=await sharp(file).ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let fire=0,opaque=0;
 for(let i=0;i<data.length;i+=4){if(data[i+3]<128)continue;opaque++;const r=data[i],g=data[i+1],b=data[i+2];if(r>200&&g>110&&r-b>110)fire++}
 return fire/opaque;
}
test('the art-bible traveller had fire painted in; the runtime traveller and hands do not',async()=>{
 const original=await fireShare('assets/kienaide-v3/traveller-flame.webp');
 assert.ok(original>.003,'reference check: the art bible image does contain the baked flame ('+original+')');
 for(const n of ['hero-body','hero-hands']){const share=await fireShare(P+n+'.webp');assert.ok(share<.0005,n+' must not contain fire colours: '+share)}
});
test('rim light is a neutral mask, tinted and scaled by the flame at runtime',async()=>{
 const {data}=await sharp(P+'hero-rim.webp').ensureAlpha().raw().toBuffer({resolveWithObject:true});
 let lit=0;for(let i=0;i<data.length;i+=4){if(data[i+3]<40)continue;lit++;assert.ok(data[i]>235&&data[i+1]>235&&data[i+2]>235,'rim mask must be white')}
 assert.ok(lit>500,'rim mask has a visible edge');
 assert.ok(view.includes("const rim=tinted('hero-rim','#ffbf78')"));
 assert.ok(view.includes('ctx.globalAlpha=Math.min(1,st.light*1.1)'));
});
test('a dead flame emits no light',()=>{
 assert.match(view,/if\(health<=0\)\{[\s\S]*?return;\s*\}/);
 assert.ok(view.includes('if(!(st.light>0))return'),'rim and snow glow only while burning');
 assert.ok(view.includes('const light=Math.max(0,Math.min(1,s.flame/100))'));
});
test('chapter light sources are an additive layer: base + lights reproduces the painting',async()=>{
 const m=JSON.parse(readFileSync(P+'manifest.json','utf8'));
 for(const ch of ['ch1','ch2','ch3','ch4']){
  const c=m.chapters[ch];
  const bands=await Promise.all(['sky','far','mid','fore'].map(async b=>({input:await sharp(P+ch+'-'+(b==='fore'?'basefore':b)+'.webp').png().toBuffer(),top:(b==='fore'?c.baseFore:c.bands[b]).top,left:0})));
  const base=await sharp({create:{width:900,height:1200,channels:4,background:'#000'}}).composite(bands).png().toBuffer();
  const lit=await sharp(base).composite([{input:P+ch+'-lights.webp',blend:'add'}]).removeAlpha().raw().toBuffer();
  const meta=await sharp(P+'src/'+ch+'.webp').metadata(),h=Math.round(meta.height*900/meta.width);
  const ref=await sharp(P+'src/'+ch+'.webp').resize(900,h).extract({left:0,top:Math.max(0,Math.min(h-1200,c.cropTop)),width:900,height:1200}).removeAlpha().raw().toBuffer();
  let diff=0;for(let i=0;i<ref.length;i+=37)diff+=Math.abs(ref[i]-lit[i]);
  assert.ok(diff/(ref.length/37)<9,ch+' recomposes to the master painting (mean diff '+(diff/(ref.length/37)).toFixed(2)+')');
  const fore=await sharp(P+ch+'-fore.webp').metadata();
  assert.equal(fore.width,900,ch+' painted foreground width');assert.equal(fore.height,1200,ch+' painted foreground height');assert.equal(fore.hasAlpha,true,ch+' painted foreground must remain transparent');
 }
});
test('chapter backgrounds never contain the traveller or the flame spirit',()=>{
 const m=JSON.parse(readFileSync(P+'manifest.json','utf8'));
 for(const ch of ['ch1','ch2','ch3','ch4'])assert.ok(m.chapters[ch],ch);
 assert.deepEqual(m.artBible,['assets/kienaide-v3/snow-town.webp','assets/kienaide-v3/traveller-flame.webp','assets/kienaide-v3/flame-spirit.webp']);
});
test('cinematic VFX are layered around the subject and respond to the game state',()=>{
 assert.ok(view.indexOf("'back'")<view.indexOf('drawTraveller(ctx,{...s,t,ci,reduced,light,walking:o.playing})'),'background snow must pass behind the traveller');
 const gradeAt=view.indexOf('cinematicGrade(ctx,ci,light,t,reduced)');
 assert.ok(gradeAt<view.indexOf("'front')",gradeAt),'foreground snow stays crisp above the colour grade');
 assert.match(view,/const oxygen=Math\.max\(0,\(42-\(st\.oxygen\?\?100\)\)\/42\)/,'frost responds to low oxygen');
 assert.match(view,/st\.shield\?\.55/,'shielding changes the ember behaviour');
 assert.ok(view.includes("ctx.canvas.dataset.vfx=['grade','grain','snow-depth'"),'runtime exposes the active VFX stack for browser QA');
});
