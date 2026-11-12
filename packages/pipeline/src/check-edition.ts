/**
 * Fails when the bulletin that was due most recently has not been published (F-13, US-41).
 * Run by .github/workflows/late-edition.yml shortly after each slot; a failure opens an issue,
 * which GitHub emails to the repository owner.
 *
 *   pnpm build && pnpm --filter @cspnews/pipeline check-edition "$PWD/data/bulletins" [ISO time]
 */
import { appendFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { lastDueBulletin } from '@cspnews/core';

import { bulletinKey } from './prepare.js';

const directory = resolve(process.argv[2] ?? 'data/bulletins');
const now = new Date(process.argv[3] ?? Date.now());
if (Number.isNaN(now.getTime())) {
  console.error(`Not a time: ${process.argv[3] ?? ''}`);
  process.exit(2);
}

const due = lastDueBulletin(now);
const key = bulletinKey(due);
const edition = `${key} (${due.slot.time} Istanbul time)`;

if (existsSync(join(directory, `${key}.json`))) {
  console.log(`Published: ${edition}.`);
} else {
  console.error(`Late: ${edition} is not published. Expected ${key}.json in ${directory}.`);
  if (process.env.GITHUB_OUTPUT) {
    appendFileSync(process.env.GITHUB_OUTPUT, `edition=${edition}\nfile=${key}.json\n`);
  }
  process.exitCode = 1;
}
