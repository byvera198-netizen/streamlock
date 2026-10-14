import sharp from "sharp";

const [input, logoOutput, markOutput] = process.argv.slice(2);

if (!input || !logoOutput || !markOutput) {
  throw new Error("Uso: node scripts/make-transparent-logo.mjs <entrada> <logo.png> <marca.png>");
}

const crop = { left: 220, top: 430, width: 2000, height: 930 };
const { data, info } = await sharp(input).extract(crop).raw().toBuffer({ resolveWithObject: true });
const rgba = Buffer.alloc(info.width * info.height * 4);

for (let i = 0, pixel = 0; i < data.length; i += 3, pixel += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const luma = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  let alpha;

  if (luma < 170) alpha = 255;
  else if (luma > 190 && chroma < 43) alpha = 0;
  else alpha = Math.max(0, Math.min(255, Math.round(((chroma - 40) / 28) * 255)));

  rgba[pixel] = r;
  rgba[pixel + 1] = g;
  rgba[pixel + 2] = b;
  rgba[pixel + 3] = alpha;
}

const logoBuffer = await sharp(rgba, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
const trimmedLogo = await sharp(logoBuffer).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).extend({ top: 24, bottom: 24, left: 24, right: 24, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
await sharp(trimmedLogo).toFile(logoOutput);
const markCrop = await sharp(trimmedLogo).extract({ left: 0, top: 0, width: 500, height: 900 }).png().toBuffer();
await sharp(markCrop).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 } }).extend({ top: 20, bottom: 20, left: 20, right: 20, background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toFile(markOutput);
