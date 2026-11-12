/**
 * The "Today's word" line on the home page: it shows where the reader is with today's puzzle,
 * read from what the word game keeps in the browser. Before a first guess it keeps its words;
 * after, the words move to screen readers and the line shows a badge and the six try marks.
 * Without storage it keeps its first words.
 */
import { GAME_LANGUAGES, MAX_TRIES, gameDayAt, type GameLanguage } from '@cspnews/wordgame';

import { ICONS } from './icons';

import {
  gameKey,
  parseResults,
  parseSavedGame,
  resultsKey,
  todayLine,
  todayState,
  type TodayState,
} from './word';

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
  link.dataset.state = state.kind;
  const marks = link.querySelector('[data-word-marks]');
  if (!marks || state.kind === 'new') return;
  line.classList.add('visually-hidden');
  marks.replaceChildren(...badgeOf(state), pipsOf(state));
  marks.removeAttribute('hidden');
}

/** A finished day leads with a round badge: a tick when solved, a cross when out of tries. */
function badgeOf(state: TodayState): HTMLElement[] {
  if (state.kind !== 'solved' && state.kind !== 'lost') return [];
  const badge = document.createElement('i');
  badge.className = 'word-badge';
  const path = state.kind === 'solved' ? ICONS.tick : ICONS.close;
  badge.innerHTML = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">${path}</svg>`;
  return [badge];
}

/** The six tries, as in the game: the tries used are filled, the rest stay open. */
function pipsOf(state: TodayState): HTMLElement {
  const used = state.kind === 'lost' ? MAX_TRIES : state.kind === 'new' ? 0 : state.tries;
  const pips = document.createElement('span');
  pips.className = 'word-pips';
  for (let index = 0; index < MAX_TRIES; index += 1) {
    const pip = document.createElement('i');
    if (index < used) pip.className = 'used';
    pips.append(pip);
  }
  return pips;
}
