/**
 * Saves the photos a written bulletin uses, next to it, so the site serves its own copies:
 *
 *   pnpm build && pnpm --filter @cspnews/pipeline save-media "$PWD/data/bulletins/<file>.json"
 *
 * Writes <bulletin folder>/media/<story id>.<ext>. Outlet logos are saved by
 * `pnpm --filter @cspnews/config fetch-logos <bulletin folder>/media/logos`.
 */
import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { parseBulletin } from '@cspnews/core';

import { httpFetchBytes, saveStoryPhotos } from './media.js';

const file = process.argv[2];
if (!file) {
  console.error('Usage: save-media <absolute path to bulletin.json>');
  process.exit(1);
}
const path = resolve(file);
const bulletin = parseBulletin(JSON.parse(readFileSync(path, 'utf8')));
const results = await saveStoryPhotos(bulletin, join(dirname(path), 'media'), httpFetchBytes());

for (const result of results) {
  console.log(
    result.file
      ? `✅ ${result.storyId}: ${result.file}`
      : `❌ ${result.storyId}: ${result.error ?? 'unknown error'}`,
  );
}
const saved = results.filter((result) => result.file).length;
console.log(`Saved ${String(saved)} of ${String(results.length)} photos.`);
