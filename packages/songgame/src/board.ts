/**
 * The daily board (docs/design/decisions/song-board.md): readers who finished the day's songs may
 * put a name and their score on one board per day. Shared by the page and the live Worker, so
 * both judge names and scores the same way.
 */
import {
  CLIP_SECONDS,
  GENRES,
  giveUp,
  guess,
  isRoundOver,
  pointsFor,
  type Round,
} from './rounds.js';
import { isSameSong, plain, type SongName } from './names.js';

export const NAME_MIN = 2;
export const NAME_MAX = 20;

/** What the page sends when a reader joins the board. */
export interface BoardEntry {
  readonly day: string;
  /** A random id the browser keeps, so one reader holds one row a day. */
  readonly id: string;
  readonly name: string;
  readonly rounds: readonly {
    readonly guesses: readonly (string | null)[];
    readonly gaveUp?: boolean;
  }[];
}

/** One row of the board as the page shows it. */
export interface BoardRow {
  readonly rank: number;
  readonly name: string;
  /** The try each song was named on, 1 to 6, or 0 when it was missed. */
  readonly tries: readonly number[];
  readonly points: number;
}

export interface BoardView {
  readonly day: string;
  /** How many names are on the board. */
  readonly players: number;
  readonly top: readonly BoardRow[];
  /** The reader's own row and, when it is below the top ten, the rows around it. */
  readonly me?: BoardRow;
  readonly around?: readonly BoardRow[];
}

/** A typed name with its spaces tidied; the board keeps it as written. */
export const tidyName = (raw: string): string => raw.normalize('NFC').replace(/\s+/g, ' ').trim();

// Words a name may not hold. Short roots must be a whole word; longer ones may start a word.
const RUDE_WORDS = ['amk', 'aq', 'oc', 'pic', 'sik', 'got', 'mk', 'fag', 'cum', 'tits'];
const RUDE_ROOTS = [
  'fuck',
  'shit',
  'cunt',
  'bitch',
  'nigg',
  'fagg',
  'whore',
  'slut',
  'dick',
  'cock',
  'pussy',
  'rape',
  'rapist',
  'nazi',
  'hitler',
  'porn',
  'penis',
  'vagina',
  'bastard',
  'retard',
  'wank',
  'orospu',
  'yarak',
  'yarrak',
  'siktir',
  'sikik',
  'sikis',
  'sikim',
  'ibne',
  'kahpe',
  'pezevenk',
  'amcik',
  'amina',
  'aminak',
  'surtuk',
  'kaltak',
  'gavat',
  'pust',
  'gotveren',
  'gotune',
  'gotunu',
  'yavsak',
  'serefsiz',
  'dangalak',
  'gerizekali',
  'salak',
  'aptal',
  'pkk',
  'isid',
];

/** Why a name can't go on the board today, or undefined when it can. */
export function nameProblem(
  raw: string,
  answers: readonly SongName[],
): 'short' | 'long' | 'letters' | 'rude' | 'spoiler' | undefined {
  const name = tidyName(raw);
  const length = Array.from(name).length;
  if (length < NAME_MIN) return 'short';
  if (length > NAME_MAX) return 'long';
  if (!/^[\p{L}\p{N}][\p{L}\p{N} ._'’-]*$/u.test(name)) return 'letters';
  const words = plain(name).split(' ').filter(Boolean);
  if (
    words.some(
      (word) => RUDE_WORDS.includes(word) || RUDE_ROOTS.some((root) => word.startsWith(root)),
    )
  ) {
    return 'rude';
  }
  // Squeezed together too, so "s1mge" and "simge2026" still count.
  const joined = words.join('');
  if (RUDE_ROOTS.some((root) => root.length >= 5 && joined.includes(root))) return 'rude';
  const spaced = ` ${words.join(' ')} `;
  for (const answer of answers) {
    for (const part of [plain(answer.artist), plain(answer.title)]) {
      if (part.length < 3) continue;
      if (spaced.includes(` ${part} `) || joined.includes(part.replace(/ /g, ''))) return 'spoiler';
    }
  }
  return undefined;
}

const MADE_UP: Record<'en' | 'tr', { first: readonly string[]; second: readonly string[] }> = {
  en: {
    first: [
      'Sleepy',
      'Off-Beat',
      'Humming',
      'Midnight',
      'Velvet',
      'Dizzy',
      'Lucky',
      'Quiet',
      'Backwards',
      'Wobbly',
      'Fuzzy',
      'Mellow',
      'Restless',
      'Lo-Fi',
      'Shuffled',
      'Muted',
      'Tiny',
      'Curious',
      'Sunday',
      'Half-Asleep',
    ],
    second: [
      'Bassline',
      'Penguin',
      'Cassette',
      'Metronome',
      'Kazoo',
      'Walrus',
      'Tambourine',
      'Jukebox',
      'Earworm',
      'Encore',
      'Vinyl',
      'Cowbell',
      'Synth',
      'Turntable',
      'Ukulele',
      'Chorus',
      'Banjo',
      'Otter',
      'Mixtape',
      'Owl',
    ],
  },
  tr: {
    first: [
      'Uykulu',
      'Ritimsiz',
      'Dalgın',
      'Şanslı',
      'Sessiz',
      'Uykusuz',
      'Telaşlı',
      'Neşeli',
      'Meraklı',
      'Tembel',
      'Yorgun',
      'Sakin',
      'Hevesli',
      'Utangaç',
      'Şaşkın',
      'Gizemli',
      'Afacan',
      'Tatlı',
      'Kıpır',
      'Pazar',
    ],
    second: [
      'Kaset',
      'Plak',
      'Penguen',
      'Tef',
      'Metronom',
      'Darbuka',
      'Kulaklık',
      'Pikap',
      'Bağlama',
      'Zil',
      'Martı',
      'Kirpi',
      'Baykuş',
      'Kaplumbağa',
      'Davul',
      'Nakarat',
      'Mızıka',
      'Hoparlör',
      'Ritim',
      'Kanarya',
    ],
  },
};

/** A made-up name for the board, such as "Sleepy Bassline" or "Uykulu Kaset". */
export function madeUpName(lang: 'en' | 'tr', random: () => number = Math.random): string {
  const { first, second } = MADE_UP[lang];
  const pick = (list: readonly string[]) =>
    list[Math.floor(random() * list.length)] ?? list[0] ?? '';
  return `${pick(first)} ${pick(second)}`;
}

/** "Artist – Title" back into its parts. */
function labelSong(label: string): SongName | undefined {
  const at = label.indexOf(' – ');
  return at > 0 ? { artist: label.slice(0, at), title: label.slice(at + 3) } : undefined;
}

export interface CheckedScore {
  readonly tries: readonly number[];
  readonly points: number;
  /** Seconds heard over the day, a missed song counted as the longest clip: the tie-break. */
  readonly heard: number;
}

/**
 * The score of a finished day, worked out again from the guesses against the day's answers, so
 * the board never takes a score on trust. Undefined when the rounds don't add up to a finished
 * day: a round still open, too many tries, or guesses after the song was named.
 */
export function checkRounds(
  sent: BoardEntry['rounds'],
  answers: readonly SongName[],
): CheckedScore | undefined {
  if (sent.length !== GENRES.length || answers.length !== GENRES.length) return undefined;
  const longest = CLIP_SECONDS[CLIP_SECONDS.length - 1] ?? 16;
  const tries: number[] = [];
  let points = 0;
  let heard = 0;
  for (const [index, round] of sent.entries()) {
    const answer = answers[index];
    if (!answer || round.guesses.length > 40) return undefined;
    let replay: Round = { guesses: [] };
    for (const label of round.guesses) {
      if (isRoundOver(replay)) return undefined;
      if (label !== null && (typeof label !== 'string' || label.length > 200)) return undefined;
      const song = label === null ? undefined : labelSong(label);
      replay = guess(replay, label, song !== undefined && isSameSong(song, answer));
    }
    if (!isRoundOver(replay) && round.gaveUp === true) replay = giveUp(replay);
    if (!isRoundOver(replay)) return undefined;
    points += pointsFor(replay);
    const solved = replay.solvedOn;
    tries.push(solved === undefined ? 0 : Math.min(solved + 1, CLIP_SECONDS.length));
    heard +=
      solved === undefined
        ? longest
        : (CLIP_SECONDS[Math.min(solved, CLIP_SECONDS.length - 1)] ?? longest);
  }
  return { tries, points, heard };
}

/** How many rows the board shows: the top ten, or the top five and the reader's neighbours. */
export const TOP_ROWS = 10;
export const TOP_ROWS_WHEN_BELOW = 5;
