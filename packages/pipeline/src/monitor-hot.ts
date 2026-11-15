/**
 * Builds the Hot News feed from the outlets that break news, from rules only:
 *
 *   pnpm build && pnpm --filter @cspnews/pipeline monitor-hot [output-file]
 *
 * Reads the Turkish and world wire and established feeds, keeps the last six hours, and writes
 * the feed the site reads at /hot.json (default: hot.json in the current directory). A feed
 * that can't be read is skipped; with nothing hot the feed is empty, which is a normal answer.
 */
import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { collect, httpFetchText } from '@cspnews/collector';
import { SOURCES } from '@cspnews/config';
import { hotSources } from './hot-sources.js';
import { MONITOR_WINDOW_HOURS, buildHotFeed } from '@cspnews/hotnews';

const output = resolve(process.argv[2] ?? 'hot.json');
const now = new Date();
const sources = hotSources(SOURCES);

const { articles, failures } = await collect(sources, {
  fetchText: httpFetchText(15_000),
  now,
  since: new Date(now.getTime() - MONITOR_WINDOW_HOURS * 3_600_000),
});
const feed = buildHotFeed({
  now,
  articles,
  sources: new Map(SOURCES.map((source) => [source.id, source])),
});

writeFileSync(output, `${JSON.stringify(feed)}\n`);
console.log(
  `Wrote ${output}: ${String(feed.stories.length)} hot stories from ${String(articles.length)} articles in ${String(sources.length)} feeds; ${String(failures.length)} failures.`,
);
