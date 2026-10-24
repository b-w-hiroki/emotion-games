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
