/**
 * Prepares the next bulletin's candidates file. Runs in GitHub Actions shortly before each
 * bulletin, because news sites can't be reached from everywhere:
 *
 *   pnpm build && pnpm --filter @cspnews/pipeline prepare-bulletin [output-directory] [bulletins-directory]
 *
 * Writes <output-directory>/<yyyy-mm-dd>-<slot>.json (default directory: data/candidates). Candidates
 * that share an article with a story of the last three days in <bulletins-directory> (default:
 * data/bulletins) carry a `continues` hint.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { httpFetchText } from '@cspnews/collector';
import { ABROAD_PEOPLE, ABROAD_PHRASES, SOURCES } from '@cspnews/config';
import { nextBulletin } from '@cspnews/core';

import { earlierStories, withContinuesHints } from './earlier.js';
import { bulletinKey, prepareBulletin } from './prepare.js';

const outputDirectory = resolve(process.argv[2] ?? 'data/candidates');
const now = new Date();
const bulletin = nextBulletin(now);

const collected = await prepareBulletin({
  sources: SOURCES,
  people: ABROAD_PEOPLE,
  phrases: ABROAD_PHRASES,
  bulletin,
  fetchText: httpFetchText(20_000),
  now,
});

// Stories of the last three days that these candidates may be the same as (earlier.ts).
const candidates = withContinuesHints(
  collected,
  earlierStories(resolve(process.argv[3] ?? 'data/bulletins'), now),
);

mkdirSync(outputDirectory, { recursive: true });
const file = join(outputDirectory, `${bulletinKey(bulletin)}.json`);
writeFileSync(file, `${JSON.stringify(candidates, null, 2)}\n`);

const counts = Object.entries({ ...candidates.sections, ...candidates.desks })
  .map(([section, list]) => `${section} ${String(list.length)}`)
  .join(', ');
console.log(`Wrote ${file}: ${counts}; ${String(candidates.failures.length)} feed failures.`);
