/**
 * The daily word game's words and small helpers (design: docs/design/system.md, game screens in
 * the word game design). The rules live in @cspnews/wordgame; this file holds what the page shows.
 * Each puzzle language has its own interface words, so a Turkish puzzle reads fully in Turkish.
 */
import {
  MAX_TRIES,
  WORD_LENGTH,
  addDays,
  isPlayableWord,
  type GameDay,
  type GameLanguage,
  type GameResult,
  type Mark,
} from '@cspnews/wordgame';

/** On-screen keyboard rows. `enter` and `delete` are the two wide keys on the last row. */
export const KEYBOARD: Readonly<Record<GameLanguage, readonly (readonly string[])[]>> = {
  en: [
    ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
    ['enter', 'Z', 'X', 'C', 'V', 'B', 'N', 'M', 'delete'],
  ],
  // Turkish Q layout without Q, W and X: exactly the 29 letters, I (dotless) and İ apart.
  tr: [
    ['E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P', 'Ğ', 'Ü'],
    ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L', 'Ş', 'İ'],
    ['enter', 'Z', 'C', 'V', 'B', 'N', 'M', 'Ö', 'Ç', 'delete'],
  ],
};

const WORDS = {
  en: {
    name: 'Daily Word',
    language: 'English',
    languages: 'Puzzle language',
    howToPlay: 'How to play',
    stats: 'Stats',
    enter: 'Enter',
    delete: 'Delete',
    puzzle: 'No.',
    triesLeft: (n: number) => `${String(n)} ${n === 1 ? 'try' : 'tries'} left`,
    tooShort: 'Not enough letters',
    tooShortNote: `The word has ${String(WORD_LENGTH)}`,
    notInList: (word: string) => `${word} is not in the list`,
    noTryUsed: 'No try used',
    praise: [
      'First try.',
      'Two tries. Sharp.',
      'Three tries. Very good.',
      'Steady.',
      'Five tries. Well held.',
      'Last try. Made it.',
    ],
    solvedIn: (n: number) => `Solved in ${String(n)} of ${String(MAX_TRIES)}`,
    notToday: 'Not today.',
    restDayKept: 'This week’s rest day keeps your streak.',
    newStreak: 'A new streak starts tomorrow.',
    tryTomorrow: 'A new word comes at midnight.',
    streak: 'day streak',
    best: (n: number) => `Best ${String(n)}`,
    share: 'Share',
    copied: 'Copied',
    nextWord: 'Next word',
    inBulletin: 'In today’s bulletin',
    played: 'Played',
    solvedShare: 'Solved',
    guessDistribution: 'Solved in',
    noStatsYet: 'Your stats start with your first finished puzzle.',
    restDayNote: 'One missed or unsolved day a week is a rest day and keeps the streak.',
    helpTitle: `Guess the word in ${String(MAX_TRIES)} tries`,
    helpCorrect: 'is in the word, right spot.',
    helpPresent: 'is in the word, wrong spot.',
    helpAbsent: 'is not in the word.',
    helpNote: 'A new word every day at midnight, Istanbul time.',
    play: 'Play',
    close: 'Close',
    loading: 'Loading the word list…',
    unavailable: 'Today’s word is on its way. Check back soon.',
    notStarted: (date: string) => `The first word arrives on ${date}.`,
    weekdays: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
    dayStatus: {
      solved: 'solved',
      rest: 'rest day',
      missed: 'missed',
      unsolved: 'not solved',
      open: 'today',
    },
    letterMark: { correct: 'right spot', present: 'wrong spot', absent: 'not in the word' },
  },
  tr: {
    name: 'Günün Kelimesi',
    language: 'Türkçe',
    languages: 'Bulmaca dili',
    howToPlay: 'Nasıl oynanır',
    stats: 'İstatistik',
    enter: 'Gir',
    delete: 'Sil',
    puzzle: 'No.',
    triesLeft: (n: number) => `${String(n)} hak kaldı`,
    tooShort: 'Harf eksik',
    tooShortNote: `Kelime ${String(WORD_LENGTH)} harfli`,
    notInList: (word: string) => `${word} listede yok`,
    noTryUsed: 'Hakkın gitmedi',
    praise: [
      'İlk denemede.',
      'İki denemede. Keskin.',
      'Üç denemede. Çok iyi.',
      'İstikrarlı.',
      'Beş denemede. İyi direndin.',
      'Son hakta. Yetiştin.',
    ],
    solvedIn: (n: number) => `${String(MAX_TRIES)} hakta ${String(n)}`,
    notToday: 'Bugün olmadı.',
    restDayKept: 'Bu haftanın dinlenme günü serini korudu.',
    newStreak: 'Yarın yeni bir seri başlar.',
    tryTomorrow: 'Yeni kelime gece yarısı gelir.',
    streak: 'günlük seri',
    best: (n: number) => `En iyi ${String(n)}`,
    share: 'Paylaş',
    copied: 'Kopyalandı',
    nextWord: 'Yeni kelime',
    inBulletin: 'Bugünkü bültende',
    played: 'Oynanan',
    solvedShare: 'Çözülen',
    guessDistribution: 'Kaçıncı denemede',
    noStatsYet: 'İstatistiklerin ilk bitirdiğin bulmacayla başlar.',
    restDayNote:
      'Haftada bir kaçırılan ya da çözülemeyen gün dinlenme günü sayılır ve seri bozulmaz.',
    helpTitle: `Kelimeyi ${String(MAX_TRIES)} denemede bul`,
    helpCorrect: 'kelimede var, yeri doğru.',
    helpPresent: 'kelimede var, yeri yanlış.',
    helpAbsent: 'kelimede yok.',
    helpNote: 'Her gün gece yarısı, İstanbul saatiyle yeni kelime.',
    play: 'Oyna',
    close: 'Kapat',
    loading: 'Kelime listesi yükleniyor…',
    unavailable: 'Bugünün kelimesi yolda. Birazdan yeniden bak.',
    notStarted: (date: string) => `İlk kelime ${date} günü geliyor.`,
    weekdays: ['P', 'S', 'Ç', 'P', 'C', 'C', 'P'],
    dayStatus: {
      solved: 'çözüldü',
      rest: 'dinlenme günü',
      missed: 'kaçırıldı',
      unsolved: 'çözülemedi',
      open: 'bugün',
    },
    letterMark: { correct: 'yeri doğru', present: 'yeri yanlış', absent: 'kelimede yok' },
  },
};

export type GameWords = (typeof WORDS)[GameLanguage];

export function gameWordsFor(language: GameLanguage): GameWords {
  return WORDS[language];
}

/** The calm line for a solved puzzle: one per number of tries, never an exclamation. */
export function praiseFor(tries: number, language: GameLanguage): string {
  const lines = WORDS[language].praise;
  return lines[Math.min(lines.length, Math.max(1, tries)) - 1] ?? '';
}

/** The page of each puzzle language. */
export const GAME_PATHS: Readonly<Record<GameLanguage, string>> = { en: '/word', tr: '/word/tr' };

/** One day of the word window shipped with the page: the day, its puzzle number and its word. */
export interface WindowDay {
  readonly day: GameDay;
  readonly number: number;
  /** The answer, scrambled with `hideWord`. */
  readonly word: string;
}

/** How many days of answers a build carries, from yesterday on, in case the next build is late. */
export const WINDOW_DAYS = 10;

/** The days a build ships: yesterday (for clocks a little behind) up to `WINDOW_DAYS` ahead. */
export function windowDays(today: GameDay): GameDay[] {
  return Array.from({ length: WINDOW_DAYS + 2 }, (_, index) => addDays(today, index - 1));
}

/** The puzzle in progress, as saved in the browser. */
export interface SavedGame {
  readonly day: GameDay;
  readonly guesses: readonly string[];
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A saved game read back from storage; anything malformed counts as no game. */
export function parseSavedGame(text: string | null, language: GameLanguage): SavedGame | undefined {
  const value = parseJson(text);
  if (!isRecord(value) || typeof value.day !== 'string' || !DAY.test(value.day)) return undefined;
  if (!Array.isArray(value.guesses)) return undefined;
  const guesses = value.guesses.filter(
    (guess): guess is string => typeof guess === 'string' && isPlayableWord(guess, language),
  );
  return { day: value.day, guesses: guesses.slice(0, MAX_TRIES) };
}

/** Finished days read back from storage; malformed entries are skipped. */
export function parseResults(text: string | null): GameResult[] {
  const value = parseJson(text);
  if (!Array.isArray(value)) return [];
  return value.filter(
    (entry): entry is GameResult =>
      isRecord(entry) &&
      typeof entry.day === 'string' &&
      DAY.test(entry.day) &&
      typeof entry.tries === 'number' &&
      Number.isInteger(entry.tries) &&
      entry.tries >= 1 &&
      entry.tries <= MAX_TRIES &&
      typeof entry.solved === 'boolean',
  );
}

function parseJson(text: string | null): unknown {
  if (!text) return undefined;
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

const SQUARES: Readonly<Record<Mark, string>> = {
  correct: '\u{1F7E9}',
  present: '\u{1F7E8}',
  absent: '⬛',
};

/** The text a reader shares: name, number, score and the coloured rows, never the letters. */
export function shareText(
  language: GameLanguage,
  number: number,
  rows: readonly (readonly Mark[])[],
  solved: boolean,
  url: string,
): string {
  const score = `${solved ? String(rows.length) : 'X'}/${String(MAX_TRIES)}`;
  const grid = rows.map((marks) => marks.map((mark) => SQUARES[mark]).join('')).join('\n');
  return `CSPNews ${WORDS[language].name} ${String(number)} ${score}\n\n${grid}\n\n${url}`;
}

/** "Wed 11 Nov" / "11 Kasım Çar", for the puzzle line. */
export function puzzleDate(day: GameDay, language: GameLanguage): string {
  const date = new Date(`${day}T12:00:00Z`);
  const options: Intl.DateTimeFormatOptions =
    language === 'tr'
      ? { day: 'numeric', month: 'long', weekday: 'short', timeZone: 'UTC' }
      : { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' };
  return new Intl.DateTimeFormat(language === 'tr' ? 'tr-TR' : 'en-GB', options)
    .format(date)
    .replace(',', '');
}

/** Turkey keeps UTC+3 all year, so midnight in Istanbul is 21:00 UTC the day before. */
const ISTANBUL_OFFSET_MS = 3 * 3_600_000;

/** Milliseconds from `now` until the next word, at 00:00 Istanbul time. */
export function msUntilNextWord(now: Date): number {
  const local = now.getTime() + ISTANBUL_OFFSET_MS;
  const nextMidnight = (Math.floor(local / 86_400_000) + 1) * 86_400_000;
  return nextMidnight - local;
}

/** "07:04:09", for the countdown to the next word. */
export function countdown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const parts = [Math.floor(total / 3600), Math.floor(total / 60) % 60, total % 60];
  return parts.map((part) => String(part).padStart(2, '0')).join(':');
}
