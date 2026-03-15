const fs = require('fs');
const path = require('path');
let sharp;
try {
  sharp = require('sharp');
} catch (_) {
  sharp = null;
}

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

async function createFromSource(srcPath, outPath, size) {
  if (!sharp) throw new Error('sharp is not installed');
  await sharp(srcPath)
    .resize(size, size, { fit: 'cover' })
    .png()
    .toFile(outPath);
}

async function main() {
  const iconsDir = path.resolve(__dirname, '../public/icons');
  ensureDir(iconsDir);
  const source = path.join(iconsDir, 'logo.png'); // 1080x1080 provided
  const sizes = [16, 32, 48, 128];
  if (!sharp) {
    console.error('Error: sharp not installed. Run `npm install` to install dependencies.');
    process.exit(1);
  }
  if (!fs.existsSync(source)) {
    console.error('Error: source logo not found at', source);
    process.exit(1);
  }
  for (const s of sizes) {
    const outFile = path.join(iconsDir, `logo-${s}.png`);
    await createFromSource(source, outFile, s);
    console.log('Generated', outFile);
  }
}

main().catch((e)=>{ console.error(e); process.exit(1); });
