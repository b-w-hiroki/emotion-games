import fs from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

export async function makeKienaideThumbnail(root=process.cwd()){
 const art=path.join(root,'assets');
 const background=await sharp(path.join(art,'kienaide-thumbnail-bg.webp')).resize(1200,630,{fit:'cover'}).png().toBuffer();
 const hero=await sharp(path.join(art,'kienaide-v3','traveller-flame.webp')).resize({height:586}).png().toBuffer();
 const wordmark=await sharp(path.join(art,'kienaide-lettering.svg')).resize({width:630}).png().toBuffer();
 const shade=Buffer.from('<svg width="1200" height="630" xmlns="http://www.w3.org/2000/svg"><defs><linearGradient id="v"><stop stop-color="#050b17" stop-opacity=".56"/><stop offset=".46" stop-color="#06101e" stop-opacity=".15"/><stop offset="1" stop-color="#050b17" stop-opacity=".48"/></linearGradient><linearGradient id="top" x2="0" y2="1"><stop stop-color="#06101e" stop-opacity=".58"/><stop offset=".48" stop-color="#06101e" stop-opacity="0"/></linearGradient></defs><rect width="1200" height="630" fill="url(#v)"/><rect width="1200" height="630" fill="url(#top)"/></svg>');
 const heroMeta=await sharp(hero).metadata();
 const result=await sharp(background).composite([{input:shade},{input:hero,left:50,top:44},{input:wordmark,left:530,top:120}]).png({compressionLevel:9}).toBuffer();
 if(heroMeta.width>480)throw new Error('Thumbnail subject exceeds its reserved area');
 return result;
}

if(process.argv[1]&&path.resolve(process.argv[1])===path.resolve(import.meta.filename)){
 const output=path.resolve(process.argv[2]||'assets/kienaide-thumbnail.png');
 fs.writeFileSync(output,await makeKienaideThumbnail());
 console.log(output);
}
