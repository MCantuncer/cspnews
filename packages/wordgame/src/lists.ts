/**
 * The word lists in `data/<language>/`.
 *
 * - `answers.txt`: the answers in play order, one per line. Line 1 is puzzle 1. New words are
 *   appended; a word that has to go is replaced on its own line, so a played day keeps its word.
 * - `guesses.txt`: every word accepted as a guess. All answers are in it too.
 * - `blocked.txt`: words that must never be an answer, each with the reason after `#`.
 *
 * Words are written in lower case as a reader would type them; the game normalises them.
 */
import type { GameDay } from './day.js';
import { isPlayableWord, normalizeWord, type GameLanguage } from './language.js';

/** Puzzle 1 of each language is played on this day. */
export const FIRST_DAY: Readonly<Record<GameLanguage, GameDay>> = {
  en: '2026-11-23',
  tr: '2026-11-23',
};

/** CI fails when fewer days of answers than this are left, so the list never runs out. */
export const MIN_DAYS_LEFT = 90;

/** The words in a list file, normalised. Blank lines and anything after `#` are ignored. */
export function parseWordList(text: string, language: GameLanguage): string[] {
  return text
    .split('\n')
    .map((line) => (line.split('#')[0] ?? '').trim())
    .filter((line) => line.length > 0)
    .map((word) => normalizeWord(word, language));
}

export interface WordLists {
  readonly answers: readonly string[];
  readonly guesses: readonly string[];
  readonly blocked: readonly string[];
}

/** Everything wrong with a language's lists, as readable sentences. Empty when they are sound. */
export function listProblems(lists: WordLists, language: GameLanguage): string[] {
  const problems: string[] = [];
  const guesses = new Set(lists.guesses);
  const blocked = new Set(lists.blocked);
  const seen = new Set<string>();

  lists.answers.forEach((word, index) => {
    const where = `answer ${String(index + 1)} (${word})`;
    if (!isPlayableWord(word, language)) problems.push(`${where} is not five ${language} letters.`);
    if (seen.has(word)) problems.push(`${where} is listed twice.`);
    if (blocked.has(word)) problems.push(`${where} is blocked.`);
    if (!guesses.has(word)) problems.push(`${where} is not accepted as a guess.`);
    seen.add(word);
  });

  for (const word of lists.guesses) {
    if (!isPlayableWord(word, language))
      problems.push(`guess ${word} is not five ${language} letters.`);
  }

  return problems;
}
