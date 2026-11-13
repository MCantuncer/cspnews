/**
 * Saves the photos a written bulletin uses, next to it, so the site serves its own copies:
 *
 *   pnpm build && pnpm --filter @cspnews/pipeline save-media "$PWD/data/bulletins/<file>.json"
 *
 * Writes <bulletin folder>/media/<story id>.<ext>, for stories and And finally light stories. When a feed thumbnail is swapped for the
 * article's full-size photo, the bulletin's image URL is updated to match. Outlet logos are saved by
 * `pnpm --filter @cspnews/config fetch-logos <bulletin folder>/media/logos`.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { parseBulletin, type StoryImage } from '@cspnews/core';

import { httpFetchBytes, saveStoryPhotos } from './media.js';

const file = process.argv[2];
if (!file) {
  console.error('Usage: save-media <absolute path to bulletin.json>');
  process.exit(1);
}
const path = resolve(file);
const bulletin = parseBulletin(JSON.parse(readFileSync(path, 'utf8')));
const results = await saveStoryPhotos(bulletin, join(dirname(path), 'media'), httpFetchBytes());

// Record the full-size photo's address where it replaced the feed thumbnail.
const upgraded = new Map(
  results.flatMap((result) => (result.url ? [[result.storyId, result.url]] : [])),
);
function withFullSize<Item extends { id: string; image?: StoryImage | undefined }>(
  item: Item,
): Item {
  const url = upgraded.get(item.id);
  return url && item.image ? { ...item, image: { ...item.image, url } } : item;
}
if (upgraded.size > 0) {
  const updated = {
    ...bulletin,
    stories: bulletin.stories.map(withFullSize),
    ...(bulletin.andFinally && {
      andFinally: { ...bulletin.andFinally, light: bulletin.andFinally.light.map(withFullSize) },
    }),
  };
  writeFileSync(path, `${JSON.stringify(updated, null, 2)}\n`);
}

for (const result of results) {
  console.log(
    result.file
      ? `✅ ${result.storyId}: ${result.file}${result.url ? ' (full size from the article)' : ''}`
      : `❌ ${result.storyId}: ${result.error ?? 'unknown error'}`,
  );
}
const saved = results.filter((result) => result.file).length;
console.log(`Saved ${String(saved)} of ${String(results.length)} photos.`);
