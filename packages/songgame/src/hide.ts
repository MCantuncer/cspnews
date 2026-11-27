/**
 * The build ships a few days of answers, each scrambled so it is not readable at a glance in the
 * page source. This keeps honest readers from spoiling the song by accident; it is not a secret,
 * since the browser has to work the answer out to check a guess.
 */
import type { GameDay } from '@cspnews/wordgame';

function keyStream(day: GameDay, genre: string): () => number {
  let hash = 0x811c9dc5;
  for (const char of `cspnews-song-${genre}-${day}`) {
    hash = Math.imul(hash ^ (char.codePointAt(0) ?? 0), 0x01000193);
  }
  let state = hash >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) & 0xffff;
  };
}

/** Any text scrambled for one day and genre, as hex: four digits per character. */
export function hideText(text: string, day: GameDay, genre: string): string {
  const key = keyStream(day, genre);
  return Array.from(text, (char) =>
    (((char.codePointAt(0) ?? 0) ^ key()) & 0xffff).toString(16).padStart(4, '0'),
  ).join('');
}

/** The text back from `hideText`; undefined when it is not scrambled text. */
export function revealText(hidden: string, day: GameDay, genre: string): string | undefined {
  if (!/^(?:[0-9a-f]{4})+$/.test(hidden)) return undefined;
  const key = keyStream(day, genre);
  return (hidden.match(/.{4}/g) ?? [])
    .map((chunk) => String.fromCodePoint(Number.parseInt(chunk, 16) ^ key()))
    .join('');
}
