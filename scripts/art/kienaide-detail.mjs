import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

const source=path.resolve('artifacts/kienaide');
const target=path.resolve('assets/kienaide-detail');
const frames=[
 ['title','chromium-390x844-title-collection.png'],
 ['street','chromium-390x844-chapter1.png'],
 ['bridge','chromium-390x844-chapter3.png']
];
fs.mkdirSync(target,{recursive:true});
for(const [name,file] of frames){
 const input=path.join(source,file);
 const info=await sharp(input).metadata();
 if(info.width!==390||info.height!==844)throw new Error(`${file}: expected 390×844 screenshot`);
 await sharp(input).webp({quality:78,effort:6}).toFile(path.join(target,`${name}.webp`));
}
console.log('Prepared Kienaide detail screenshots from browser QA captures');
