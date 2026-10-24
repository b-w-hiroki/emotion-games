// Build lightweight portrait scene paintings from the preserved generated masters.
import path from 'node:path';
import sharp from 'sharp';

const root = path.resolve('chahan/art');
for (const scene of ['street', 'train', 'sky']) {
  await sharp(path.join(root, 'src', `${scene}.png`))
    .extract({ left: 0, top: 0, width: 1024, height: 1182 })
    .resize(780, 900)
    .webp({ quality: 83, effort: 6 })
    .toFile(path.join(root, `${scene}.webp`));
}
await sharp(path.join(root, 'src', 'wok-v2.png'))
  .resize({ width: 780 })
  .webp({ quality: 85, effort: 6, alphaQuality: 90 })
  .toFile(path.join(root, 'wok-v2.webp'));
await sharp(path.join(root, 'src', 'toss-v2.png'))
  .resize({ width: 780 })
  .webp({ quality: 84, effort: 6, alphaQuality: 90 })
  .toFile(path.join(root, 'toss-v2.webp'));
await sharp(path.join(root, 'src', 'rice-v2.png'))
  .resize({ width: 780 })
  .webp({ quality: 85, effort: 6, alphaQuality: 90 })
  .toFile(path.join(root, 'rice-v2.webp'));
await sharp(path.join(root, 'src', 'flight-v3.png'))
  .resize(780, 260)
  .webp({ quality: 88, effort: 6, alphaQuality: 94 })
  .toFile(path.join(root, 'flight-v3.webp'));
