import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = '/Users/robertrodrigues/Desktop/Fihan';
const SRC = join(ROOT, 'images/brand/logo-green.svg');
const OUT_DIR = join(ROOT, 'creatives/google-ads/logo');
mkdirSync(OUT_DIR, { recursive: true });

const svg = readFileSync(SRC, 'utf8');
const logoW = 176;
const logoH = 71;
const ratio = logoW / logoH;

async function render({ canvasW, canvasH, scale, name }) {
  const targetW = Math.round(canvasW * scale);
  const targetH = Math.round(targetW / ratio);
  const left = Math.round((canvasW - targetW) / 2);
  const top = Math.round((canvasH - targetH) / 2);

  const logoPng = await sharp(Buffer.from(svg), { density: 1200 })
    .resize(targetW, targetH, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer();

  await sharp({
    create: { width: canvasW, height: canvasH, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: logoPng, top, left }])
    .png()
    .toFile(join(OUT_DIR, name));
  console.log('wrote', name, `${canvasW}x${canvasH}, logo ${targetW}x${targetH}`);
}

await render({ canvasW: 1200, canvasH: 1200, scale: 0.66, name: 'fihan-logo-square-1200x1200.png' });
await render({ canvasW: 1200, canvasH: 300,  scale: 0.55, name: 'fihan-logo-landscape-1200x300.png' });
await render({ canvasW: 1200, canvasH: 1200, scale: 0.66, name: 'fihan-logo-square-1200x1200-white-bg.png' });
await render({ canvasW: 1200, canvasH: 300,  scale: 0.55, name: 'fihan-logo-landscape-1200x300-white-bg.png' });

async function withWhiteBg(filename) {
  const path = join(OUT_DIR, filename);
  const buf = readFileSync(path);
  await sharp({
    create: { width: buf ? (await sharp(buf).metadata()).width : 1200, height: (await sharp(buf).metadata()).height, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } },
  })
    .composite([{ input: buf }])
    .png()
    .toFile(path);
}
await withWhiteBg('fihan-logo-square-1200x1200-white-bg.png');
await withWhiteBg('fihan-logo-landscape-1200x300-white-bg.png');
console.log('done');
