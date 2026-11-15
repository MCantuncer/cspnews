/**
 * Lists the optional parts a written bulletin left empty: stories with no facts or no visual,
 * and Spotlight, Transfers or Turks abroad missing although their desk had candidates
 * (docs/publishing.md, "Filling every part"). It never fails: an empty part can be right, but
 * the writer must have looked.
 *
 *   pnpm build && pnpm --filter @cspnews/pipeline check-parts <bulletin.json> [candidates.json]
 */
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  DESKS,
  describeEmptyPart,
  emptyParts,
  parseBulletin,
  type DeskCandidates,
} from '@cspnews/core';

import type { CandidatesFile } from './candidates.js';

const [bulletinPath, candidatesPath] = process.argv.slice(2);
if (!bulletinPath) {
  console.error('Usage: check-parts <bulletin.json> [candidates.json]');
  process.exit(2);
}

const readJson = (path: string): unknown => JSON.parse(readFileSync(resolve(path), 'utf8'));

function deskCandidates(path: string): DeskCandidates {
  const { desks } = readJson(path) as Pick<CandidatesFile, 'desks'>;
  return Object.fromEntries(DESKS.map((desk) => [desk, desks[desk].length]));
}

const bulletin = parseBulletin(readJson(bulletinPath));
const empty = emptyParts(bulletin, candidatesPath ? deskCandidates(candidatesPath) : undefined);

if (empty.length === 0) {
  console.log('Every part is filled.');
} else {
  console.log(`${String(empty.length)} empty part${empty.length === 1 ? '' : 's'}:`);
  for (const part of empty) console.log(`- ${describeEmptyPart(part)}`);
  console.log('Fill each one from the sources, or say in the pull request why it stays empty.');
}
