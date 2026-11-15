import {
  cpSync,
  createReadStream,
  existsSync,
  readdirSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { extname, join, normalize, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { defineConfig } from 'astro/config';

// Photos and logos saved next to the bulletins (src/lib/media.ts), served at /media, and the
// Hot News feed (src/lib/hot.ts), served at /hot.json.
const bulletins = resolve(
  process.env.CSPNEWS_BULLETINS ?? resolve(process.cwd(), '../../data/bulletins'),
);
const media = join(bulletins, 'media');
// The Hot News feed. In production the monitor publishes it; locally a saved copy is served.
const hotFeed = join(bulletins, 'hot.json');
const TYPES = new Map([
  ['.avif', 'image/avif'],
  ['.jpeg', 'image/jpeg'],
  ['.jpg', 'image/jpeg'],
  ['.png', 'image/png'],
  ['.svg', 'image/svg+xml'],
  ['.webp', 'image/webp'],
]);

// Saved photos are full-size outlet pictures, often over 1 MB. The built copies are scaled down
// to the widest the site ever shows one (a story's photo at twice the screen's pixels) and
// re-encoded in the same format, so every URL stays the same. Originals are never touched.
const PHOTO_WIDTH = 1200;

/** @param {string} directory */
async function shrinkPhotos(directory) {
  const { default: sharp } = await import('sharp');
  for (const file of readdirSync(directory)) {
    const path = join(directory, file);
    const format = /\.jpe?g$/.test(file)
      ? 'jpeg'
      : file.endsWith('.png')
        ? 'png'
        : file.endsWith('.webp')
          ? 'webp'
          : undefined;
    if (!format || !statSync(path).isFile()) continue;
    try {
      const image = sharp(path).rotate();
      const { width } = await image.metadata();
      const small = image.resize({
        width: Math.min(width, PHOTO_WIDTH),
        withoutEnlargement: true,
      });
      const output = await (
        format === 'jpeg'
          ? small.jpeg({ quality: 78, mozjpeg: true })
          : format === 'webp'
            ? small.webp({ quality: 78 })
            : small.png({ compressionLevel: 9, palette: true })
      ).toBuffer();
      if (output.length < statSync(path).size) writeFileSync(path, output);
    } catch {
      // A file sharp cannot read is served as it is.
    }
  }
}

/** @type {import('astro').AstroIntegration} */
const bulletinFiles = {
  name: 'cspnews-bulletin-files',
  hooks: {
    'astro:server:setup': ({ server }) => {
      server.middlewares.use('/hot.json', (_req, res, next) => {
        if (!existsSync(hotFeed)) {
          next();
          return;
        }
        res.setHeader('content-type', 'application/json');
        res.setHeader('cache-control', 'no-store');
        createReadStream(hotFeed).pipe(res);
      });
      server.middlewares.use('/media', (req, res, next) => {
        const file = normalize(join(media, decodeURIComponent((req.url ?? '/').split('?')[0])));
        const type = TYPES.get(extname(file));
        if (
          !file.startsWith(media + sep) ||
          !type ||
          !existsSync(file) ||
          !statSync(file).isFile()
        ) {
          next();
          return;
        }
        res.setHeader('content-type', type);
        createReadStream(file).pipe(res);
      });
    },
    'astro:build:done': async ({ dir }) => {
      const out = fileURLToPath(dir);
      if (existsSync(media)) {
        cpSync(media, join(out, 'media'), { recursive: true });
        await shrinkPhotos(join(out, 'media'));
      }
      // With no saved feed, publish an empty one: the site then asks for /hot.json and gets
      // "nothing breaking" instead of a 404 on every page, until the monitor publishes its own.
      if (existsSync(hotFeed)) cpSync(hotFeed, join(out, 'hot.json'));
      else {
        const empty = { version: 1, generatedAt: new Date().toISOString(), stories: [] };
        writeFileSync(join(out, 'hot.json'), `${JSON.stringify(empty)}\n`);
      }
    },
  },
};

// A static site: every bulletin is built into plain pages when it is published (see docs/design/system.md).
export default defineConfig({
  output: 'static',
  trailingSlash: 'never',
  build: { format: 'file' },
  integrations: [bulletinFiles],
  vite: {
    resolve: {
      // Use workspace packages' TypeScript source, so the site builds without building them first.
      conditions: ['source'],
    },
  },
});
