import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

import {
  FIRST_DAY,
  answerOn,
  hideWord,
  parseWordList,
  puzzleNumber,
  type GameDay,
  type GameLanguage,
} from '@cspnews/wordgame';

import { windowDays, type WindowDay } from './word';

/**
 * The word lists, read at build time from packages/wordgame/data. Only a few days of answers
 * leave the build (see `windowDays`); the full answer list never reaches the browser.
 */
function readList(language: GameLanguage, name: 'answers' | 'guesses'): string[] {
  const file = resolve(process.cwd(), '../../packages/wordgame/data', language, `${name}.txt`);
  return parseWordList(readFileSync(file, 'utf8'), language);
}

/** The scrambled answers from yesterday up to the end of the window, for one language. */
export function wordWindow(language: GameLanguage, today: GameDay): WindowDay[] {
  const answers = readList(language, 'answers');
  const firstDay = FIRST_DAY[language];
  return windowDays(today).flatMap((day) => {
    const answer = answerOn(answers, day, firstDay);
    const number = puzzleNumber(day, firstDay);
    return answer && number ? [{ day, number, word: hideWord(answer, day, language) }] : [];
  });
}

/** Every accepted guess, one per line, upper case: the file the page fetches to check a guess. */
export function guessFile(language: GameLanguage): string {
  return `${readList(language, 'guesses').join('\n')}\n`;
}
