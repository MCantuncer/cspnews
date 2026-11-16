import {
  abroadIn,
  type AbroadItem,
  type AbroadKind,
  type Language,
  type LocalAbroadItem,
  type MilestoneType,
  type StatLine,
  type TennisLine,
} from '@cspnews/core';

import { bulletinPath, type PublishedBulletin } from './bulletins.js';
import type { InterfaceLanguage } from './evidence.js';
import { TIME_ZONE, formatTime } from './format.js';
import type { IconName } from './icons.js';

/**
 * Turks abroad (docs/design/decisions/turks-abroad.md): Turkish people making news in other
 * countries, one row each on Contents and a page of their own.
 */

/** The bulletin's Turks abroad items in the reader's language, in the order the run gave. */
export function abroadItemsIn(published: PublishedBulletin, language: Language): LocalAbroadItem[] {
  return (published.bulletin.abroad ?? []).map((item) => abroadIn(item, language));
}

/** The URL of a person's page: `/2026-11-14/morning/abroad/<item id>`. */
export function abroadPath(
  published: PublishedBulletin,
  item: Pick<AbroadItem, 'id'>,
  lang: InterfaceLanguage = 'en',
): string {
  return `${bulletinPath(published, lang)}/abroad/${encodeURIComponent(item.id)}`;
}

/** Initials for the round mark when there is no photo: "Alperen Şengün" → "AŞ". */
export function initials(person: string): string {
  const parts = person.split(/\s+/).filter(Boolean);
  const picked = parts.length > 1 ? [parts[0], parts.at(-1)] : parts;
  return picked.map((part) => part?.charAt(0).toLocaleUpperCase('tr') ?? '').join('');
}

/**
 * The club or team in a `where` line, for its crest: "Houston Rockets, NBA" → "Houston Rockets".
 * Crests are the ones Tonight saves (media/teams), so a club only has one once it has played there.
 */
export function clubOf(where: string): string {
  return where.split(',')[0]?.trim() ?? '';
}

const locale = (lang: InterfaceLanguage) => (lang === 'tr' ? 'tr-TR' : 'en-GB');

const dayOf = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(new Date(iso));

/**
 * "04:30" when the moment falls on the bulletin's own Istanbul day, else "Thursday 21:45", so a
 * night game in America reads as the hour it was here.
 */
export function istanbulMoment(iso: string, bulletinAt: string, lang: InterfaceLanguage): string {
  const time = formatTime(iso, lang);
  if (dayOf(iso) === dayOf(bulletinAt)) return time;
  return `${weekday(iso, lang)} ${time}`;
}

const weekday = (iso: string, lang: InterfaceLanguage) =>
  new Intl.DateTimeFormat(locale(lang), { weekday: 'long', timeZone: TIME_ZONE }).format(
    new Date(iso),
  );

/**
 * The short line under a row: when the game or race was, or when the next one is, in our time:
 * "Played at 04:30 our time", "Raced on Friday at 15:00 our time", "Next: Sunday 23:00".
 */
export function whenLine(
  item: Pick<LocalAbroadItem, 'playedAt' | 'nextAt'> & { kind?: AbroadKind },
  bulletinAt: string,
  lang: InterfaceLanguage,
): string | undefined {
  const words = abroadWords(lang);
  if (item.playedAt) {
    const time = formatTime(item.playedAt, lang);
    const day =
      dayOf(item.playedAt) === dayOf(bulletinAt) ? undefined : weekday(item.playedAt, lang);
    return words.played(time, day, item.kind === 'motorsport');
  }
  if (item.nextAt) return words.nextAt(istanbulMoment(item.nextAt, bulletinAt, lang));
  return undefined;
}

const WORDS = {
  en: {
    abroad: 'Turks abroad',
    count: (n: number) => (n === 1 ? '1 name' : `${String(n)} names`),
    note: 'What our people did in other countries since the last bulletin.',
    played: (time: string, day: string | undefined, race: boolean) =>
      `${race ? 'Raced' : 'Played'}${day ? ` on ${day}` : ''} at ${time} our time`,
    nextAt: (when: string) => `Next: ${when}`,
    next: 'Next',
    nextLine: (where: string, when: string) => `${where}, ${when} our time`,
    form: 'Last games',
    formNote: (of: string) => `${of}. Filled for a win, hollow for a loss, half for a draw.`,
    results: { win: 'Win', draw: 'Draw', loss: 'Loss' },
    sources: 'Sources',
    rising: 'Rising talent',
    age: (n: number) => `Age ${String(n)}`,
    kinds: {
      basketball: 'Basketball',
      football: 'Football',
      volleyball: 'Volleyball',
      tennis: 'Tennis',
      motorsport: 'Motorsport',
      sport: 'Sport',
      science: 'Science',
      tech: 'Technology',
      arts: 'Arts',
      business: 'Business',
    },
    milestones: {
      award: 'Award',
      paper: 'Paper',
      record: 'Record',
      first: 'A first',
      role: 'New role',
      work: 'New work',
    },
    statTitle: {
      basketball: 'Box score',
      football: 'Match stats',
      volleyball: 'Match stats',
      tennis: 'Scoreboard',
      motorsport: 'Race result',
    },
    vs: (name: string) => `vs ${name}`,
    stats: {
      points: ['point', 'points'],
      rebounds: ['rebound', 'rebounds'],
      assists: ['assist', 'assists'],
      goals: ['goal', 'goals'],
      minutes: ['minute', 'minutes'],
      blocks: ['block', 'blocks'],
      aces: ['ace', 'aces'],
    },
    labels: {
      points: 'Points',
      rebounds: 'Rebounds',
      assists: 'Assists',
      minutes: 'Minutes',
      fieldGoals: 'Field goals',
      threes: 'Three-pointers',
      freeThrows: 'Free throws',
      steals: 'Steals',
      blocks: 'Blocks',
      plusMinus: 'Plus-minus',
      goals: 'Goals',
      played: 'Played',
      shots: 'Shots',
      shotsOnTarget: 'On target',
      keyPasses: 'Key passes',
      passAccuracy: 'Pass accuracy',
      saves: 'Saves',
      rating: 'Rating',
      attacks: 'Attack points',
      aces: 'Aces',
      sets: 'Sets',
      doubleFaults: 'Double faults',
      finished: 'Finished',
      dnf: 'Did not finish',
      grid: 'Started',
      gap: 'Gap to the winner',
      racePoints: 'Points',
      standing: 'In the championship',
    },
    from: (grid: string) => `from ${grid}`,
    gained: (n: number) =>
      `${n > 0 ? 'Gained' : 'Lost'} ${String(Math.abs(n))} ${Math.abs(n) === 1 ? 'place' : 'places'} from the start`,
    ordinal: (n: number) => {
      const tens = n % 100;
      const suffix =
        tens >= 11 && tens <= 13
          ? 'th'
          : (({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[n % 10] ?? 'th');
      return `${String(n)}${suffix}`;
    },
  },
  tr: {
    abroad: 'Dünyadaki Türkler',
    count: (n: number) => `${String(n)} isim`,
    note: 'Son bültenden bu yana yurt dışındaki isimlerimizden haberler.',
    played: (time: string, day: string | undefined, race: boolean) =>
      `${race ? 'Yarış saati' : 'Maç saati'}: ${day ? `${day} ` : ''}${time} (TSİ)`,
    nextAt: (when: string) => `Sıradaki: ${when}`,
    next: 'Sıradaki maç',
    nextLine: (where: string, when: string) => `${where}, ${when} (TSİ)`,
    form: 'Son maçlar',
    formNote: (of: string) => `${of}. Dolu: galibiyet, boş: mağlubiyet, yarım: beraberlik.`,
    results: { win: 'Galibiyet', draw: 'Beraberlik', loss: 'Mağlubiyet' },
    sources: 'Kaynaklar',
    rising: 'Yükselen yetenek',
    age: (n: number) => `${String(n)} yaşında`,
    kinds: {
      basketball: 'Basketbol',
      football: 'Futbol',
      volleyball: 'Voleybol',
      tennis: 'Tenis',
      motorsport: 'Motor sporları',
      sport: 'Spor',
      science: 'Bilim',
      tech: 'Teknoloji',
      arts: 'Sanat',
      business: 'İş dünyası',
    },
    milestones: {
      award: 'Ödül',
      paper: 'Makale',
      record: 'Rekor',
      first: 'Bir ilk',
      role: 'Yeni görev',
      work: 'Yeni eser',
    },
    statTitle: {
      basketball: 'Maç istatistiği',
      football: 'Maç istatistiği',
      volleyball: 'Maç istatistiği',
      tennis: 'Skor tablosu',
      motorsport: 'Yarış sonucu',
    },
    vs: (name: string) => `Rakip: ${name}`,
    stats: {
      points: ['sayı', 'sayı'],
      rebounds: ['ribaunt', 'ribaunt'],
      assists: ['asist', 'asist'],
      goals: ['gol', 'gol'],
      minutes: ['dakika', 'dakika'],
      blocks: ['blok', 'blok'],
      aces: ['as', 'as'],
    },
    labels: {
      points: 'Sayı',
      rebounds: 'Ribaunt',
      assists: 'Asist',
      minutes: 'Dakika',
      fieldGoals: 'Saha içi',
      threes: 'Üçlük',
      freeThrows: 'Serbest atış',
      steals: 'Top çalma',
      blocks: 'Blok',
      plusMinus: 'Artı-eksi',
      goals: 'Gol',
      played: 'Süre',
      shots: 'Şut',
      shotsOnTarget: 'İsabetli şut',
      keyPasses: 'Kilit pas',
      passAccuracy: 'Pas isabeti',
      saves: 'Kurtarış',
      rating: 'Maç puanı',
      attacks: 'Hücum sayısı',
      aces: 'Servis sayısı',
      sets: 'Setler',
      doubleFaults: 'Çift hata',
      finished: 'Bitiriş',
      dnf: 'Yarışı bitiremedi',
      grid: 'Start',
      gap: 'Lidere fark',
      racePoints: 'Puan',
      standing: 'Şampiyonada',
    },
    from: (grid: string) => `${grid} startından`,
    gained: (n: number) =>
      `Starta göre ${String(Math.abs(n))} sıra ${n > 0 ? 'yükseldi' : 'geriledi'}`,
    ordinal: (n: number) => `${String(n)}.`,
  },
} as const;

export type AbroadWords = (typeof WORDS)[InterfaceLanguage];

export function abroadWords(lang: InterfaceLanguage): AbroadWords {
  return WORDS[lang];
}

/** The Stations icon for each kind of person. */
export const KIND_ICON: Readonly<Record<AbroadKind, IconName>> = {
  basketball: 'basketball',
  football: 'football',
  volleyball: 'volleyball',
  tennis: 'tennis',
  motorsport: 'motorsport',
  sport: 'abroad',
  science: 'science',
  tech: 'chip',
  arts: 'arts',
  business: 'business',
};

/** The Stations icon for each kind of milestone. */
export const MILESTONE_ICON: Readonly<Record<MilestoneType, IconName>> = {
  award: 'award',
  paper: 'paper',
  record: 'record',
  first: 'first',
  role: 'role',
  work: 'arts',
};

/** One number with its words: "28" "points". */
export interface StatCell {
  readonly value: string;
  readonly label: string;
}

const signed = (n: number) => (n > 0 ? `+${String(n)}` : String(n));
const madeOf = (shots: { made: number; tried: number }) =>
  `${String(shots.made)}/${String(shots.tried)}`;
const decimal = (n: number, lang: InterfaceLanguage) =>
  new Intl.NumberFormat(lang === 'tr' ? 'tr-TR' : 'en-GB', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(n);
const percent = (n: number, lang: InterfaceLanguage) =>
  lang === 'tr' ? `%${String(n)}` : `${String(n)}%`;

/** "P3": the position on a race result, the same in both languages. */
export const place = (n: number) => `P${String(n)}`;

/** A tennis set as a scoreboard writes it: "7–6⁽⁴⁾" is left to the page; here "7–6". */
export function setsLine(line: TennisLine): string {
  return line.sets.map((set) => `${String(set.us)}–${String(set.them)}`).join('  ');
}

/** The few numbers a Contents row shows, in words: "28 points", "12 rebounds", "7 assists". */
export function statStrip(stats: StatLine, lang: InterfaceLanguage): StatCell[] {
  const words = abroadWords(lang);
  const cell = (n: number, [one, many]: readonly [string, string]): StatCell => ({
    value: String(n),
    label: n === 1 ? one : many,
  });
  switch (stats.sport) {
    case 'basketball':
      return [
        cell(stats.points, words.stats.points),
        cell(stats.rebounds, words.stats.rebounds),
        cell(stats.assists, words.stats.assists),
      ];
    case 'football': {
      const cells = [
        ...(stats.goals > 0 ? [cell(stats.goals, words.stats.goals)] : []),
        ...(stats.assists > 0 ? [cell(stats.assists, words.stats.assists)] : []),
      ];
      if (cells.length === 0 && stats.minutes !== undefined) {
        cells.push(cell(stats.minutes, words.stats.minutes));
      }
      if (stats.rating !== undefined) {
        cells.push({
          value: decimal(stats.rating, lang),
          label: words.labels.rating.toLocaleLowerCase(lang),
        });
      }
      return cells;
    }
    case 'volleyball':
      return [
        cell(stats.points, words.stats.points),
        ...(stats.blocks !== undefined ? [cell(stats.blocks, words.stats.blocks)] : []),
        ...(stats.aces !== undefined ? [cell(stats.aces, words.stats.aces)] : []),
      ];
    case 'tennis':
      return [{ value: setsLine(stats), label: words.vs(stats.opponent) }];
    case 'motorsport':
      return stats.position === undefined
        ? [{ value: 'DNF', label: '' }]
        : [
            {
              value: place(stats.position),
              label: stats.grid ? words.from(place(stats.grid)) : '',
            },
          ];
  }
}

/** The page's stat layout: the main numbers large, the rest in a quiet row under them. */
export function statBoard(
  stats: Exclude<StatLine, TennisLine>,
  lang: InterfaceLanguage,
): { main: StatCell[]; more: StatCell[] } {
  const words = abroadWords(lang);
  const l = words.labels;
  const opt = (value: string | undefined, label: string): StatCell[] =>
    value === undefined ? [] : [{ value, label }];
  const n = (value: number | undefined) => (value === undefined ? undefined : String(value));
  switch (stats.sport) {
    case 'basketball':
      return {
        main: [
          { value: String(stats.points), label: l.points },
          { value: String(stats.rebounds), label: l.rebounds },
          { value: String(stats.assists), label: l.assists },
        ],
        more: [
          ...opt(n(stats.minutes), l.minutes),
          ...opt(stats.fieldGoals && madeOf(stats.fieldGoals), l.fieldGoals),
          ...opt(stats.threes && madeOf(stats.threes), l.threes),
          ...opt(stats.freeThrows && madeOf(stats.freeThrows), l.freeThrows),
          ...opt(n(stats.steals), l.steals),
          ...opt(n(stats.blocks), l.blocks),
          ...opt(stats.plusMinus === undefined ? undefined : signed(stats.plusMinus), l.plusMinus),
        ],
      };
    case 'football':
      return {
        main: [
          { value: String(stats.goals), label: l.goals },
          { value: String(stats.assists), label: l.assists },
          ...opt(stats.minutes === undefined ? undefined : `${String(stats.minutes)}′`, l.played),
        ],
        more: [
          ...opt(n(stats.shots), l.shots),
          ...opt(n(stats.shotsOnTarget), l.shotsOnTarget),
          ...opt(n(stats.keyPasses), l.keyPasses),
          ...opt(
            stats.passAccuracy === undefined ? undefined : percent(stats.passAccuracy, lang),
            l.passAccuracy,
          ),
          ...opt(n(stats.saves), l.saves),
          ...opt(stats.rating === undefined ? undefined : decimal(stats.rating, lang), l.rating),
        ],
      };
    case 'volleyball':
      return {
        main: [
          { value: String(stats.points), label: l.points },
          ...opt(stats.sets && `${String(stats.sets.us)}–${String(stats.sets.them)}`, l.sets),
        ],
        more: [
          ...opt(n(stats.attacks), l.attacks),
          ...opt(n(stats.blocks), l.blocks),
          ...opt(n(stats.aces), l.aces),
        ],
      };
    case 'motorsport':
      return {
        main: [
          stats.position === undefined
            ? { value: 'DNF', label: l.dnf }
            : { value: place(stats.position), label: l.finished },
          ...opt(stats.grid === undefined ? undefined : place(stats.grid), l.grid),
        ],
        more: [
          ...opt(stats.gap, l.gap),
          ...opt(stats.points === undefined ? undefined : String(stats.points), l.racePoints),
          ...opt(
            stats.standing === undefined ? undefined : words.ordinal(stats.standing),
            l.standing,
          ),
        ],
      };
  }
}
