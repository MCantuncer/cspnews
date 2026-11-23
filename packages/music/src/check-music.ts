/**
 * Checks music editions before they are published (docs/music.md, "Checks"): the schema, five
 * songs a genre, reasons that match the dates and numbers, techno tempo, repeats.
 *
 *   pnpm --filter @cspnews/music build
 *   pnpm --filter @cspnews/music check-music "$PWD/data/music" [file name, default: all]
 */
import { resolve } from 'node:path';

import { problemsIn, readCanon, readEditions } from './files.js';

const directory = resolve(process.argv[2] ?? 'data/music');
const only = process.argv[3];

const editions = readEditions(directory);
const canon = readCanon();
const problems = problemsIn(editions, canon, only);

if (problems.length === 0) {
  console.log(`Music: ${only ?? `${String(editions.length)} editions`} passed.`);
} else {
  for (const problem of problems) console.error(problem);
  process.exitCode = 1;
}
