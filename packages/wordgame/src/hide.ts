/**
 * The site ships only a few days of answers, and each one is scrambled so it is not readable at a
 * glance in the page source. This keeps honest readers from spoiling the word by accident; it is
 * not a secret, since the browser has to work the word out to score guesses.
 */
import type { GameDay } from './day.js';
import type { GameLanguage } from './language.js';
import { lettersOf } from './language.js';
import { seededRandom } from './random.js';

function keyStream(day: GameDay, language: GameLanguage): () => number {
  const random = seededRandom(`cspnews-word-${language}-${day}`);
  return () => Math.floor(random() * 0x10000);
}

/** The word scrambled for one day and language, as hex: four digits per letter. */
export function hideWord(word: string, day: GameDay, language: GameLanguage): string {
  const key = keyStream(day, language);
  return lettersOf(word)
    .map((letter) =>
      (((letter.codePointAt(0) ?? 0) ^ key()) & 0xffff).toString(16).padStart(4, '0'),
    )
    .join('');
}

/** The word back from `hideWord`; undefined when the text is not a scrambled word. */
export function revealWord(
  hidden: string,
  day: GameDay,
  language: GameLanguage,
): string | undefined {
  if (!/^(?:[0-9a-f]{4})+$/.test(hidden)) return undefined;
  const key = keyStream(day, language);
  const letters = hidden.match(/.{4}/g) ?? [];
  return letters.map((chunk) => String.fromCodePoint(Number.parseInt(chunk, 16) ^ key())).join('');
}
