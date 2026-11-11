/**
 * The two puzzle languages and their letters.
 *
 * Words are kept in upper case. Turkish upper-casing follows Turkish rules (i → İ, ı → I), and the
 * Turkish alphabet has exactly 29 letters: no Q, W or X. Circumflex letters (â, î, û) count as their
 * plain letters, so "kâğıt" is played as KAĞIT.
 */

/** Letters in every word. */
export const WORD_LENGTH = 5;

/** Tries a reader has for one word. */
export const MAX_TRIES = 6;

export const GAME_LANGUAGES = ['en', 'tr'] as const;
export type GameLanguage = (typeof GAME_LANGUAGES)[number];

const ALPHABETS: Record<GameLanguage, readonly string[]> = {
  en: Array.from('ABCDEFGHIJKLMNOPQRSTUVWXYZ'),
  tr: Array.from('ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ'),
};

const LOCALES: Record<GameLanguage, string> = { en: 'en-US', tr: 'tr-TR' };

/** Circumflex letters, after upper-casing, and the letter each one is played as. */
const TURKISH_FOLDS: Readonly<Record<string, string>> = { Â: 'A', Î: 'İ', Û: 'U' };

/** The letters of a language, in alphabetical order. */
export function alphabetOf(language: GameLanguage): readonly string[] {
  return ALPHABETS[language];
}

/** Splits a word into letters. Every letter is one code point once the word is normalised. */
export function lettersOf(word: string): string[] {
  return Array.from(word);
}

/**
 * Turns typed or listed text into the form the game compares: trimmed, composed (NFC) and upper
 * case under the language's rules, with Turkish circumflex letters folded.
 */
export function normalizeWord(text: string, language: GameLanguage): string {
  // Upper-case Turkish i and ı by hand: ICU-free runtimes would otherwise turn both into I.
  const prepared =
    language === 'tr' ? text.normalize('NFC').replaceAll('i', 'İ').replaceAll('ı', 'I') : text;
  const upper = prepared.trim().toLocaleUpperCase(LOCALES[language]).normalize('NFC');
  if (language !== 'tr') return upper;
  return lettersOf(upper)
    .map((letter) => TURKISH_FOLDS[letter] ?? letter)
    .join('');
}

/** True when `word` (already normalised) has the right length and only the language's letters. */
export function isPlayableWord(word: string, language: GameLanguage): boolean {
  const letters = lettersOf(word);
  const alphabet = ALPHABETS[language];
  return letters.length === WORD_LENGTH && letters.every((letter) => alphabet.includes(letter));
}
