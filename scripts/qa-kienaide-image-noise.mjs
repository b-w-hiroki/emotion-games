// Compare on opaque backgrounds: transparent RGB at alpha=1 is not an opaque coloured fringe.
import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';
import assert from 'node:assert/strict';
const dir='assets/kienaide/paint/',out='artifacts/kienaide';
fs.mkdirSync(out,{recursive:true});
const results=[];
for(const name of ['hero-walk','hero-shield']){
 const before=await sharp(dir+'src/repaint-v2/'+name+'.png').resize(900,1200).webp({quality:90,alphaQuality:96}).toBuffer();
 const after=fs.readFileSync(dir+name+'.webp');
 const raw=async input=>(await sharp(input).ensureAlpha().raw().toBuffer());
 const a=await raw(before),b=await raw(after);let intersection=0,union=0,energyA=0,energyB=0,count=0;
 for(let y=1;y<1199;y++)for(let x=1;x<899;x++){
  const i=(y*900+x)*4,aa=a[i+3]>128,bb=b[i+3]>128;if(aa&&bb)intersection++;if(aa||bb)union++;
  // High-frequency luminance inside both opaque subjects, not silhouette or transparency RGB.
  if(a[i+3]<245||b[i+3]<245)continue;
  const lap=d=>{const l=j=>.2126*d[j]+.7152*d[j+1]+.0722*d[j+2];return Math.abs(4*l(i)-l(i-4)-l(i+4)-l(i-3600)-l(i+3600))};
  energyA+=lap(a);energyB+=lap(b);count++;
 }
 const silhouetteIoU=intersection/union,detailRatio=energyB/energyA;
 assert.ok(silhouetteIoU>.98,name+' must keep pose, scale and ground line: '+silhouetteIoU);
 assert.ok(detailRatio<.9&&detailRatio>.3,name+' must reduce speckle without erasing all texture: '+detailRatio);
 const tiles=[];
 for(const background of ['#122039','#a0a0a0'])for(const input of [before,after]){
  const flat=await sharp({create:{width:900,height:1200,channels:4,background}}).composite([{input}]).png().toBuffer();
  tiles.push(await sharp(flat).resize(360,480).png().toBuffer());
 }
 await sharp({create:{width:1440,height:480,channels:4,background:'#122039'}}).composite(tiles.map((input,i)=>({input,left:i*360,top:0}))).png().toFile(path.join(out,name+'-noise-before-after.png'));
 results.push({name,silhouetteIoU,detailRatio,beforeBytes:before.length,afterBytes:after.length});
}
const files=JSON.parse(fs.readFileSync(dir+'manifest.json','utf8')).files;
for(const file of files){const m=await sharp(dir+file).metadata();assert.ok(m.width>0&&m.height>0,file+' must decode')}
const variants=[];
for(const name of ['hero-body','hero-shield','hero-blink','hero-walk','hero-brace','hero-cold','hero-breathless','hero-relief','hero-lookup','end-blown','end-smother','end-wish','end-survive','end-dawn']){
 const source=dir+name+'.webp',alternative=dir+name+'.avif',meta=await sharp(source).metadata(),w=meta.width,h=meta.height;
 const a=await sharp(source).ensureAlpha().raw().toBuffer(),b=await sharp(alternative).ensureAlpha().raw().toBuffer();let intersection=0,union=0,energyA=0,energyB=0;
 for(let y=1;y<h-1;y++)for(let x=1;x<w-1;x++){
  const i=(y*w+x)*4,aa=a[i+3]>128,bb=b[i+3]>128;if(aa&&bb)intersection++;if(aa||bb)union++;
  if(a[i+3]<245||b[i+3]<245)continue;
  const lap=d=>{const l=j=>.2126*d[j]+.7152*d[j+1]+.0722*d[j+2];return Math.abs(4*l(i)-l(i-4)-l(i+4)-l(i-w*4)-l(i+w*4))};energyA+=lap(a);energyB+=lap(b);
 }
 const silhouetteIoU=intersection/union,detailRatio=energyB/energyA;
 assert.ok(silhouetteIoU>.995,name+' AVIF must keep the approved silhouette: '+silhouetteIoU);
 assert.ok(detailRatio>.9&&detailRatio<1.05,name+' AVIF must preserve painted detail without adding speckle: '+detailRatio);
 variants.push({name,silhouetteIoU,detailRatio});
}
fs.writeFileSync(path.join(out,'image-noise-report.json'),JSON.stringify({filesDecoded:files.length,results,variants},null,2)+'\n');
console.log('PASS image noise / silhouette audit',JSON.stringify({results,variants:variants.length}));
