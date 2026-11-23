import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseCanon, type CanonEntry } from './canon.js';
import { parseMusicEdition, type MusicEdition } from './edition.js';
import { checkMusicEdition } from './rules.js';
import { parseTaste, type Taste } from './taste.js';

/** Reading the package's lists and a folder of editions, for the check script and the tests. */

const DATA = new URL('../data/', import.meta.url);

export function readCanon(): CanonEntry[] {
  return parseCanon(JSON.parse(readFileSync(new URL('canon.json', DATA), 'utf8')));
}

export function readTaste(): Taste {
  return parseTaste(JSON.parse(readFileSync(new URL('taste.json', DATA), 'utf8')));
}

export interface EditionFile {
  file: string;
  edition: MusicEdition;
}

/** Every `<date>.json` in a folder, oldest first. A missing folder has none. */
export function readEditions(directory: string): EditionFile[] {
  if (!existsSync(directory)) return [];
  return readdirSync(directory)
    .filter((file) => /^\d{4}-\d{2}-\d{2}\.json$/.test(file))
    .sort()
    .map((file) => {
      const edition = parseMusicEdition(JSON.parse(readFileSync(join(directory, file), 'utf8')));
      if (`${edition.date}.json` !== file) {
        throw new Error(`${file} holds the edition of ${edition.date}.`);
      }
      return { file, edition };
    });
}

/** The problems of every edition (or only `file`), each checked against the others. */
export function problemsIn(
  editions: readonly EditionFile[],
  canon: readonly CanonEntry[],
  file?: string,
): string[] {
  const history = editions.map((item) => item.edition);
  return editions
    .filter((item) => !file || item.file === file)
    .flatMap((item) =>
      checkMusicEdition(item.edition, { history, canon }).map(
        (problem) => `${item.file}: ${problem}`,
      ),
    );
}
