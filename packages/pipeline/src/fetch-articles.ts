/**
 * Reads the articles behind a candidates file, so the Verify and Write run can check every
 * claim against its source even where news sites can't be reached:
 *
 *   pnpm build && pnpm --filter @cspnews/pipeline fetch-articles "$PWD/data/candidates/<file>.json"
 *
 * Writes <same folder>/<same name>.articles.json: the readable text of each article, by URL.
 * Copies of another outlet's text are skipped, and an article that can't be read is listed
 * under `failures` instead of stopping the run.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

import { httpFetchText } from '@cspnews/collector';

import { articleText } from './article-text.js';
import type { CandidatesFile } from './candidates.js';

/** Articles read per story: enough to compare outlets, few enough to stay polite and quick. */
const PER_STORY = 5;
const AT_ONCE = 8;

const file = process.argv[2];
if (!file) {
  console.error('Usage: fetch-articles <absolute path to candidates.json>');
  process.exit(1);
}
const path = resolve(file);
const candidates = JSON.parse(readFileSync(path, 'utf8')) as CandidatesFile;
const urls = [
  ...new Set(
    [...Object.values(candidates.sections), ...Object.values(candidates.desks)]
      .flat()
      .flatMap((candidate) =>
        candidate.articles
          .filter((article) => !article.copyOf)
          .slice(0, PER_STORY)
          .map((article) => article.url),
      ),
  ),
];

const fetchText = httpFetchText(15_000);
const texts: Record<string, string> = {};
const failures: { url: string; reason: string }[] = [];
const queue = [...urls];
await Promise.all(
  Array.from({ length: AT_ONCE }, async () => {
    for (let url = queue.shift(); url; url = queue.shift()) {
      try {
        const text = articleText(await fetchText(url));
        if (text) texts[url] = text;
        else failures.push({ url, reason: 'no readable text' });
      } catch (error) {
        failures.push({ url, reason: error instanceof Error ? error.message : String(error) });
      }
    }
  }),
);

const output = path.replace(/\.json$/, '.articles.json');
writeFileSync(output, `${JSON.stringify({ version: 1, texts, failures }, null, 2)}\n`);
console.log(
  `Wrote ${output}: ${String(Object.keys(texts).length)} articles read, ${String(failures.length)} failed.`,
);
