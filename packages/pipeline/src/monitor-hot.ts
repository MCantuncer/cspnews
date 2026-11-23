/**
 * Builds the Hot News feed from the outlets that break news, from rules only:
 *
 *   pnpm build && pnpm --filter @cspnews/pipeline monitor-hot [output-file]
 *
 * Reads the Turkish and world wire and established feeds, keeps the last hours, and writes the
 * feed the site reads at /hot.json (default: hot.json in the current directory). Each story's
 * photo is saved next to it, in `media/<story id>.<ext>`, and named in the feed only when it was
 * saved. A feed that can't be read is skipped; with nothing hot the feed is empty, which is a
 * normal answer.
 *
 * With `HOT_TRANSLATOR` set to a translator command (packages/hotnews/translate), every story is
 * also machine-translated into the other language; `HOT_PREVIOUS_FEED` names the last published
 * feed, whose translations are reused. Without them, or when the translator fails, the feed is
 * published as the outlets wrote it.
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { collect, httpFetchText } from '@cspnews/collector';
import { SOURCES } from '@cspnews/config';
import { parseHotFeed, type HotFeed } from '@cspnews/core';
import { MONITOR_WINDOW_HOURS, buildHotFeedWithPhotos, translateHotFeed } from '@cspnews/hotnews';

import { hotSources } from './hot-sources.js';
import { pickImage } from './image.js';
import { httpFetchBytes, savePhotos } from './media.js';
import { commandTranslator } from './translator.js';

const output = resolve(process.argv[2] ?? 'hot.json');
const mediaDirectory = join(dirname(output), 'media');
const now = new Date();
const feeds = hotSources(SOURCES);
const sources = new Map(SOURCES.map((source) => [source.id, source]));

const { articles, failures } = await collect(feeds, {
  fetchText: httpFetchText(15_000),
  now,
  since: new Date(now.getTime() - MONITOR_WINDOW_HOURS * 3_600_000),
});
const { feed, photos } = buildHotFeedWithPhotos({
  now,
  articles,
  sources,
  pickPhoto: (story, confirming) => pickImage(story, sources, confirming),
});

const saved = await savePhotos(
  [...photos].map(([id, image]) => ({ id, image })),
  mediaDirectory,
  httpFetchBytes(15_000),
);
const files = new Map(saved.flatMap((photo) => (photo.file ? [[photo.storyId, photo]] : [])));

const withPhotos = parseHotFeed({
  ...feed,
  stories: feed.stories.map((story) => {
    const photo = photos.get(story.id);
    const file = files.get(story.id)?.file;
    if (!photo || !file) return story;
    return {
      ...story,
      image: {
        file,
        sourceId: photo.sourceId,
        sourceName: photo.sourceName,
        articleUrl: photo.articleUrl,
      },
    };
  }),
});

function readPrevious(path: string | undefined): HotFeed | undefined {
  if (!path || !existsSync(path)) return undefined;
  try {
    return parseHotFeed(JSON.parse(readFileSync(path, 'utf8')));
  } catch {
    // An old feed in another shape only means nothing is reused.
    return undefined;
  }
}

const translator = process.env.HOT_TRANSLATOR?.trim();
const translated = translator
  ? await translateHotFeed(withPhotos, {
      translate: commandTranslator(translator),
      previous: readPrevious(process.env.HOT_PREVIOUS_FEED),
    })
  : undefined;
const published = translated?.feed ?? withPhotos;

writeFileSync(output, `${JSON.stringify(published)}\n`);
console.log(
  `Wrote ${output}: ${String(published.stories.length)} hot stories (${String(files.size)} with a photo) from ${String(articles.length)} articles in ${String(feeds.length)} feeds; ${String(failures.length)} failures.`,
);
if (translated) {
  const done = published.stories.filter((story) => story.translation).length;
  console.log(
    `  Translated ${String(done)} of ${String(published.stories.length)} stories: ${String(translated.translated)} new texts, ${String(translated.reused)} reused.`,
  );
  if (translated.error)
    console.log(`  Translation failed, published untranslated: ${translated.error}`);
}
for (const photo of saved) {
  if (photo.error) console.log(`  No photo for ${photo.storyId}: ${photo.error}`);
}
