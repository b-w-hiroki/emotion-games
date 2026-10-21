// Encode the existing painted WebP runtime set without changing its approved source artwork.
// Run after kienaide-paint.mjs whenever a painted layer changes.
import fs from 'node:fs';import path from 'node:path';import sharp from 'sharp';
const dir=path.resolve('assets/kienaide/paint'),manifest=JSON.parse(fs.readFileSync(path.join(dir,'manifest.json'),'utf8'));
const runtimeFiles=manifest.files.filter(file=>!file.endsWith('-basefore.webp'));
let original=0,encoded=0;
for(const file of runtimeFiles){
 const source=path.join(dir,file),target=path.join(dir,file.replace(/\.webp$/,'.avif'));
 original+=fs.statSync(source).size;
 await sharp(source).avif({quality:75,effort:6,chromaSubsampling:'4:4:4'}).toFile(target);
 encoded+=fs.statSync(target).size;
}
console.log(`Encoded ${runtimeFiles.length} AVIF paintings: ${original} -> ${encoded} bytes (${Math.round(encoded/original*100)}%).`);
