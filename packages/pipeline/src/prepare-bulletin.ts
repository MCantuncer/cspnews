/**
 * Prepares the next bulletin's candidates file. Runs in GitHub Actions shortly before each
 * bulletin, because news sites can't be reached from everywhere:
 *
 *   pnpm build && pnpm --filter @cspnews/pipeline prepare-bulletin [output-directory]
 *
 * Writes <output-directory>/<yyyy-mm-dd>-<slot>.json (default directory: data/candidates).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { httpFetchText } from '@cspnews/collector';
import { SOURCES } from '@cspnews/config';
import { nextBulletin } from '@cspnews/core';

import { bulletinKey, prepareBulletin } from './prepare.js';

const outputDirectory = resolve(process.argv[2] ?? 'data/candidates');
const now = new Date();
const bulletin = nextBulletin(now);

const candidates = await prepareBulletin({
  sources: SOURCES,
  bulletin,
  fetchText: httpFetchText(20_000),
  now,
});

mkdirSync(outputDirectory, { recursive: true });
const file = join(outputDirectory, `${bulletinKey(bulletin)}.json`);
writeFileSync(file, `${JSON.stringify(candidates, null, 2)}\n`);

const counts = Object.entries({ ...candidates.sections, ...candidates.desks })
  .map(([section, list]) => `${section} ${String(list.length)}`)
  .join(', ');
console.log(`Wrote ${file}: ${counts}; ${String(candidates.failures.length)} feed failures.`);
