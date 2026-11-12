/**
 * The "Today's word" line on the home page: it says where the reader is with today's puzzle,
 * read from what the word game keeps in the browser. Without storage it keeps its first words.
 */
import { GAME_LANGUAGES, gameDayAt, type GameLanguage } from '@cspnews/wordgame';

import { gameKey, parseResults, parseSavedGame, resultsKey, todayLine, todayState } from './word';

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

const isGameLanguage = (value: string): value is GameLanguage =>
  (GAME_LANGUAGES as readonly string[]).includes(value);

export function showWordToday(root: ParentNode): void {
  const link = root.querySelector<HTMLElement>('[data-word-today]');
  const line = link?.querySelector('[data-word-line]');
  const language = link?.dataset.wordToday;
  if (!line || !language || !isGameLanguage(language)) return;
  const state = todayState(
    parseSavedGame(read(gameKey(language)), language),
    parseResults(read(resultsKey(language))),
    gameDayAt(new Date()),
  );
  line.textContent = todayLine(state, language);
}
