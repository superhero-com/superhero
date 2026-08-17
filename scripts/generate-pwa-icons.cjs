/**
 * Regenerates public/icons/*.png from the shared native-app icon master.
 *
 * Usage:
 *   node scripts/generate-pwa-icons.cjs [--source <path-to-master.png>]
 *   npm run generate:pwa-icons
 *   npm run generate:pwa-icons -- --source /path/to/icon.png
 *
 * Defaults to the sibling `superhero-app` repo's shipped store icon
 * (`../superhero-app/assets/images/icon.png`, relative to this repo's
 * parent directory) so web and native stay one brand. Override with
 * `--source <path>` or the `PWA_ICON_SOURCE` env var if that checkout
 * isn't available locally. The source must be a square PNG.
 *
 * Idempotent: every run overwrites the same 4 filenames in public/icons/.
 * Deliberately NOT wired into `npm run build` -- the master rarely
 * changes, and a build-time image pipeline is an unnecessary liability.
 *
 * Produces, from the source master:
 *   - icon-192.png             direct resample, alpha preserved
 *   - icon-512.png             direct resample, alpha preserved
 *   - icon-maskable-512.png    art scaled to ~80% of the canvas, centered
 *                              on #0a0a0f (maskable safe-zone requirement --
 *                              a circle of diameter 80% of the canvas must
 *                              contain the meaningful content, or Android
 *                              launchers that mask to a circle will crop it)
 *   - apple-touch-icon-180.png flattened onto opaque #0a0a0f, alpha
 *                              stripped entirely (iOS renders any
 *                              transparency as black)
 *
 * Exits 1 -- without leaving partial output silently unreported -- if the
 * total size of the 4 icons exceeds 150 KB, or any single icon exceeds 60 KB.
 *
 * Why sips *and* a hand-rolled PNG codec: sips (present on every macOS dev
 * machine, no install needed) does the high-quality resampling. But sips
 * has no matte/background-color option for compositing -- its
 * `--padToHeightWidth --padColor` only pads canvas margins, it can't flatten
 * pre-existing internal alpha onto an arbitrary color -- and it always
 * re-encodes PNG output as color-type 6 (RGBA), even from a fully-opaque
 * source, so it cannot produce a PNG with no alpha channel at all (verified:
 * round-tripping through JPEG to force-drop alpha is lossy and silently
 * assumes a white matte, which is wrong here -- our background is
 * `#0a0a0f`). The compositing and the true alpha-channel strip below use
 * only Node's built-in `zlib` (inflate/deflate + crc32) -- no new
 * dependency, no lossy re-encode, exact `#0a0a0f` background.
 *
 * macOS-only (depends on the `sips` CLI), matching this task's brief.
 */
/* eslint-disable no-bitwise -- byte-level PNG codec: masking/shifting is the correct tool. */

const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');
const { spawnSync } = require('child_process');

const REPO_ROOT = path.resolve(__dirname, '..');
const OUT_DIR = path.join(REPO_ROOT, 'public', 'icons');
const DEFAULT_SOURCE = path.resolve(REPO_ROOT, '..', 'superhero-app', 'assets', 'images', 'icon.png');

const BG = [0x0a, 0x0a, 0x0f]; // matches manifest theme_color/background_color
const MASKABLE_SAFE_ZONE_RATIO = 0.8;
const TOTAL_BUDGET_BYTES = 150 * 1024;
const PER_ICON_BUDGET_BYTES = 60 * 1024;

// ---------------------------------------------------------------------------
// CLI args
// ---------------------------------------------------------------------------

function parseArgs(argv) {
  const args = { source: process.env.PWA_ICON_SOURCE || DEFAULT_SOURCE };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--source' && argv[i + 1]) {
      args.source = path.resolve(argv[i + 1]);
      i += 1;
    }
  }
  return args;
}

// ---------------------------------------------------------------------------
// sips wrapper (resampling only -- macOS built-in, no new dependency)
// ---------------------------------------------------------------------------

function requireSips() {
  if (process.platform !== 'darwin') {
    throw new Error(
      'This script shells out to macOS `sips` for image resampling and only runs on macOS. '
      + 'Run it on a Mac, or regenerate public/icons/*.png by hand and commit them.',
    );
  }
  const check = spawnSync('sips', ['--version'], { encoding: 'utf8' });
  if (check.status !== 0) {
    throw new Error('`sips` was not found on PATH (expected on macOS by default).');
  }
}

// Resamples `srcPath` to an exact `size`x`size` PNG at `outPath` using sips.
function sipsResample(srcPath, outPath, size) {
  const result = spawnSync('sips', ['-s', 'format', 'png', '-z', String(size), String(size), srcPath, '--out', outPath], {
    encoding: 'utf8',
  });
  if (result.status !== 0) {
    throw new Error(`sips resample failed for ${srcPath} -> ${outPath}: ${result.stderr || result.stdout}`);
  }
}

function sipsDimensions(imgPath) {
  const result = spawnSync('sips', ['-g', 'pixelWidth', '-g', 'pixelHeight', imgPath], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(`sips could not read ${imgPath}: ${result.stderr || result.stdout}`);
  }
  const width = Number(/pixelWidth:\s*(\d+)/.exec(result.stdout)?.[1]);
  const height = Number(/pixelHeight:\s*(\d+)/.exec(result.stdout)?.[1]);
  if (!width || !height) throw new Error(`Could not parse dimensions of ${imgPath} from sips output: ${result.stdout}`);
  return { width, height };
}

// ---------------------------------------------------------------------------
// Minimal pure-Node PNG decode/encode (8-bit, non-interlaced, color type 2
// RGB or 6 RGBA). Only Node core `zlib` -- no new npm dependency.
// ---------------------------------------------------------------------------

const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

function readChunks(buf) {
  if (!buf.subarray(0, 8).equals(PNG_SIG)) throw new Error('Not a PNG file');
  const chunks = [];
  let pos = 8;
  while (pos < buf.length) {
    const length = buf.readUInt32BE(pos);
    const type = buf.toString('ascii', pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + length);
    chunks.push({ type, data });
    pos += 8 + length + 4; // length + type + data + crc
    if (type === 'IEND') break;
  }
  return chunks;
}

function paethPredictor(a, b, c) {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

// Decodes an 8-bit, non-interlaced PNG (color type 2=RGB or 6=RGBA) into a
// flat RGBA pixel buffer (always normalized to 4 bytes/pixel, alpha=255 for
// RGB sources).
function decodePng(buf) {
  const chunks = readChunks(buf);
  const ihdrChunk = chunks.find((c) => c.type === 'IHDR');
  if (!ihdrChunk) throw new Error('Missing IHDR chunk');
  const width = ihdrChunk.data.readUInt32BE(0);
  const height = ihdrChunk.data.readUInt32BE(4);
  const bitDepth = ihdrChunk.data.readUInt8(8);
  const colorType = ihdrChunk.data.readUInt8(9);
  const interlace = ihdrChunk.data.readUInt8(12);
  if (bitDepth !== 8) throw new Error(`Unsupported PNG bit depth ${bitDepth} (need 8)`);
  if (interlace !== 0) throw new Error('Interlaced PNG not supported');
  if (colorType !== 2 && colorType !== 6) throw new Error(`Unsupported PNG color type ${colorType} (need 2 or 6)`);

  const idat = Buffer.concat(chunks.filter((c) => c.type === 'IDAT').map((c) => c.data));
  const raw = zlib.inflateSync(idat);

  const srcBpp = colorType === 6 ? 4 : 3;
  const stride = width * srcBpp;
  const pixels = Buffer.alloc(width * height * 4);
  let prevRow = Buffer.alloc(stride);
  let pos = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[pos];
    pos += 1;
    const row = Buffer.from(raw.subarray(pos, pos + stride));
    pos += stride;
    for (let x = 0; x < stride; x += 1) {
      const a = x >= srcBpp ? row[x - srcBpp] : 0;
      const b = prevRow[x];
      const c = x >= srcBpp ? prevRow[x - srcBpp] : 0;
      let val = row[x];
      if (filter === 1) val = (val + a) & 0xff;
      else if (filter === 2) val = (val + b) & 0xff;
      else if (filter === 3) val = (val + Math.floor((a + b) / 2)) & 0xff;
      else if (filter === 4) val = (val + paethPredictor(a, b, c)) & 0xff;
      else if (filter !== 0) throw new Error(`Unsupported PNG scanline filter ${filter}`);
      row[x] = val;
    }
    for (let px = 0; px < width; px += 1) {
      const outIdx = (y * width + px) * 4;
      const srcIdx = px * srcBpp;
      pixels[outIdx] = row[srcIdx];
      pixels[outIdx + 1] = row[srcIdx + 1];
      pixels[outIdx + 2] = row[srcIdx + 2];
      pixels[outIdx + 3] = srcBpp === 4 ? row[srcIdx + 3] : 255;
    }
    prevRow = row;
  }
  return { width, height, pixels };
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(zlib.crc32(Buffer.concat([typeBuf, data])) >>> 0, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

// Encodes a flat RGBA pixel buffer as PNG. colorType 6 keeps alpha; 2 drops
// it entirely (true alpha-channel strip, not just alpha=255 pixels).
// Per-scanline filter is chosen with the same minimum-sum-of-absolute-values
// heuristic libpng's default encoder uses, so output size stays reasonable.
function encodePng({
  width, height, pixels, colorType,
}) {
  const dstBpp = colorType === 6 ? 4 : 3;
  const stride = width * dstBpp;
  const raw = Buffer.alloc((stride + 1) * height);
  let prevRow = Buffer.alloc(stride);

  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(stride);
    for (let x = 0; x < width; x += 1) {
      const srcIdx = (y * width + x) * 4;
      const dstIdx = x * dstBpp;
      row[dstIdx] = pixels[srcIdx];
      row[dstIdx + 1] = pixels[srcIdx + 1];
      row[dstIdx + 2] = pixels[srcIdx + 2];
      if (dstBpp === 4) row[dstIdx + 3] = pixels[srcIdx + 3];
    }

    let best = null;
    let bestScore = Infinity;
    for (let filter = 0; filter <= 4; filter += 1) {
      const out = Buffer.alloc(stride);
      for (let x = 0; x < stride; x += 1) {
        const a = x >= dstBpp ? row[x - dstBpp] : 0;
        const b = prevRow[x];
        const c = x >= dstBpp ? prevRow[x - dstBpp] : 0;
        let val = row[x];
        if (filter === 1) val = (val - a) & 0xff;
        else if (filter === 2) val = (val - b) & 0xff;
        else if (filter === 3) val = (val - Math.floor((a + b) / 2)) & 0xff;
        else if (filter === 4) val = (val - paethPredictor(a, b, c)) & 0xff;
        out[x] = val;
      }
      let score = 0;
      for (let x = 0; x < stride; x += 1) {
        score += out[x] < 128 ? out[x] : 256 - out[x];
      }
      if (score < bestScore) {
        bestScore = score;
        best = { filter, out };
      }
    }

    const base = y * (stride + 1);
    raw[base] = best.filter;
    best.out.copy(raw, base + 1);
    prevRow = row;
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr.writeUInt8(8, 8); // bit depth
  ihdr.writeUInt8(colorType, 9);
  ihdr.writeUInt8(0, 10); // compression method
  ihdr.writeUInt8(0, 11); // filter method
  ihdr.writeUInt8(0, 12); // interlace method

  return Buffer.concat([
    PNG_SIG,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

// Composites `src` (RGBA) centered onto a canvasW x canvasH canvas filled
// with solid `bg`. Real alpha blending (not a hard paste), so it stays
// correct even if a future source master has partially-transparent edges.
function compositeCentered(src, canvasW, canvasH, bg) {
  const [bgR, bgG, bgB] = bg;
  const out = Buffer.alloc(canvasW * canvasH * 4);
  for (let i = 0; i < canvasW * canvasH; i += 1) {
    out[i * 4] = bgR;
    out[i * 4 + 1] = bgG;
    out[i * 4 + 2] = bgB;
    out[i * 4 + 3] = 255;
  }
  const offX = Math.round((canvasW - src.width) / 2);
  const offY = Math.round((canvasH - src.height) / 2);
  for (let y = 0; y < src.height; y += 1) {
    const dy = y + offY;
    if (dy < 0 || dy >= canvasH) continue; // eslint-disable-line no-continue
    for (let x = 0; x < src.width; x += 1) {
      const dx = x + offX;
      if (dx < 0 || dx >= canvasW) continue; // eslint-disable-line no-continue
      const srcIdx = (y * src.width + x) * 4;
      const dstIdx = (dy * canvasW + dx) * 4;
      const a = src.pixels[srcIdx + 3] / 255;
      out[dstIdx] = Math.round(src.pixels[srcIdx] * a + out[dstIdx] * (1 - a));
      out[dstIdx + 1] = Math.round(src.pixels[srcIdx + 1] * a + out[dstIdx + 1] * (1 - a));
      out[dstIdx + 2] = Math.round(src.pixels[srcIdx + 2] * a + out[dstIdx + 2] * (1 - a));
      out[dstIdx + 3] = 255;
    }
  }
  return { width: canvasW, height: canvasH, pixels: out };
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
  const { source } = parseArgs(process.argv.slice(2));
  requireSips();

  if (!fs.existsSync(source)) {
    throw new Error(
      `Icon source not found: ${source}\n`
      + 'Pass --source <path-to-1024x1024-master.png>, or set PWA_ICON_SOURCE, '
      + 'or check out the sibling `superhero-app` repo next to this one.',
    );
  }
  const { width: srcW, height: srcH } = sipsDimensions(source);
  if (srcW !== srcH) {
    throw new Error(`Icon source must be square, got ${srcW}x${srcH}: ${source}`);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pwa-icons-'));

  try {
    // icon-192 / icon-512: direct resample, alpha preserved as-is (sips
    // handles this correctly; no compositing needed).
    const icon192 = path.join(OUT_DIR, 'icon-192.png');
    const icon512 = path.join(OUT_DIR, 'icon-512.png');
    sipsResample(source, icon192, 192);
    sipsResample(source, icon512, 512);

    // icon-maskable-512: resample the source down to ~80% of the 512
    // canvas, then composite it centered onto an opaque #0a0a0f 512x512
    // canvas -- keeps the meaningful content inside the maskable safe zone
    // (a circle of diameter 80% of the canvas).
    const maskableInnerSize = Math.round(512 * MASKABLE_SAFE_ZONE_RATIO);
    const maskableInnerPath = path.join(tmpDir, 'maskable-inner.png');
    sipsResample(source, maskableInnerPath, maskableInnerSize);
    const maskableInner = decodePng(fs.readFileSync(maskableInnerPath));
    const maskableCanvas = compositeCentered(maskableInner, 512, 512, BG);
    const maskablePath = path.join(OUT_DIR, 'icon-maskable-512.png');
    fs.writeFileSync(maskablePath, encodePng({ ...maskableCanvas, colorType: 6 }));

    // apple-touch-icon-180: resample to 180x180, flatten onto opaque
    // #0a0a0f, and strip the alpha channel entirely (color type 2) -- iOS
    // renders any remaining transparency as black.
    const appleInnerPath = path.join(tmpDir, 'apple-inner.png');
    sipsResample(source, appleInnerPath, 180);
    const appleInner = decodePng(fs.readFileSync(appleInnerPath));
    const appleCanvas = compositeCentered(appleInner, 180, 180, BG);
    const applePath = path.join(OUT_DIR, 'apple-touch-icon-180.png');
    fs.writeFileSync(applePath, encodePng({ ...appleCanvas, colorType: 2 }));

    // Size budget -- report every file's size regardless of outcome.
    const outputs = [icon192, icon512, maskablePath, applePath];
    let total = 0;
    let overBudget = false;
    console.log('Generated:');
    outputs.forEach((file) => {
      const { size } = fs.statSync(file);
      total += size;
      const flag = size > PER_ICON_BUDGET_BYTES ? '  <-- OVER 60 KB budget' : '';
      if (flag) overBudget = true;
      console.log(`  ${path.relative(REPO_ROOT, file)}: ${size} bytes${flag}`);
    });
    console.log(`Total: ${total} bytes (budget: ${TOTAL_BUDGET_BYTES} bytes)`);
    if (total > TOTAL_BUDGET_BYTES) {
      overBudget = true;
      console.error(`Total icon size ${total} bytes exceeds the ${TOTAL_BUDGET_BYTES}-byte budget.`);
    }
    if (overBudget) {
      process.exitCode = 1;
      throw new Error('Icon size budget exceeded -- see sizes above.');
    }
  } finally {
    fs.rmSync(tmpDir, { recursive: true, force: true });
  }
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    console.error(err.message);
    process.exit(process.exitCode || 1);
  }
}

module.exports = {
  decodePng, encodePng, compositeCentered,
};
