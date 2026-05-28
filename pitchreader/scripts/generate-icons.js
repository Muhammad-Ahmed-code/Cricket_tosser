// Generates icon.png and adaptive-icon.png from the cinematic splash design.
// Crops a 1170×1170 square centred on the cricket ball (lower portion of
// the 1170×2532 source) then resizes to 1024×1024.
const { Jimp } = require('jimp');
const path = require('path');

const SRC = path.join(__dirname, '../app/assets/design/A _ Cinematic.png');
const ICON_OUT = path.join(__dirname, '../app/assets/icon.png');
const ADAPTIVE_OUT = path.join(__dirname, '../app/assets/adaptive-icon.png');

const SIZE = 1024;
// The ball is roughly centred at y≈1600 in the 2532-tall image.
// A 1170×1170 square from y=1065 captures the ball nicely.
const CROP_X = 0;
const CROP_Y = 850;
const CROP_W = 1170;
const CROP_H = 1170;

async function main() {
  const img = await Jimp.read(SRC);

  const cropped = img.clone()
    .crop({ x: CROP_X, y: CROP_Y, w: CROP_W, h: CROP_H })
    .resize({ w: SIZE, h: SIZE });

  await cropped.write(ICON_OUT);
  console.log('Written:', ICON_OUT);

  await cropped.write(ADAPTIVE_OUT);
  console.log('Written:', ADAPTIVE_OUT);
}

main().catch(err => { console.error(err); process.exit(1); });
