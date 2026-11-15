import type { TonightItem } from '@cspnews/core';

import type { InterfaceLanguage } from './evidence.js';
import { TIME_ZONE, formatTime } from './format.js';

/**
 * The Tonight list's words and the line each row shows on its right: the big figure (a start
 * time or a score) and the small status under it (docs/design/decisions/tonight.md). The same
 * function runs at build time and again in the browser, so a row moves on by the clock.
 */
const WORDS = {
  en: {
    title: 'Tonight',
    today: 'Today',
    tonight: 'Tonight',
    on: 'Under way',
    showOn: 'On now',
    fullTime: 'Full time',
    final: 'Final',
    ended: 'Ended',
    showOver: 'Over',
    versus: 'v',
    won: 'Won',
    lost: 'Lost',
    drew: 'Drew',
    goals: (n: number) => (n === 1 ? '1 goal' : `${String(n)} goals`),
    assists: (n: number) => (n === 1 ? '1 assist' : `${String(n)} assists`),
    points: (n: number) => (n === 1 ? '1 point' : `${String(n)} points`),
    rebounds: (n: number) => (n === 1 ? '1 rebound' : `${String(n)} rebounds`),
    /** The word after a person's number: whole words for football, short ones for basketball. */
    unit: (kind: MarkKind, n: number, sport: string | undefined) =>
      sport === 'basketball'
        ? { points: 'pts', rebounds: 'reb', assists: 'ast', goals: 'goals' }[kind]
        : {
            goals: n === 1 ? 'goal' : 'goals',
            assists: n === 1 ? 'assist' : 'assists',
            points: n === 1 ? 'point' : 'points',
            rebounds: n === 1 ? 'rebound' : 'rebounds',
          }[kind],
  },
  tr: {
    title: 'Bu gece',
    today: 'Bugün',
    tonight: 'Bu gece',
    on: 'Oynanıyor',
    showOn: 'Yayında',
    fullTime: 'Maç sonu',
    final: 'Maç sonu',
    ended: 'Bitti',
    showOver: 'Bitti',
    versus: '-',
    won: 'Kazandı',
    lost: 'Kaybetti',
    drew: 'Berabere',
    goals: (n: number) => `${String(n)} gol`,
    assists: (n: number) => `${String(n)} asist`,
    points: (n: number) => `${String(n)} sayı`,
    rebounds: (n: number) => `${String(n)} ribaund`,
    // Turkish words do not change with the count, and are short enough for both sports.
    unit: (kind: MarkKind) =>
      ({ points: 'sayı', rebounds: 'ribaund', assists: 'asist', goals: 'gol' })[kind],
  },
} as const;

export function tonightWords(language: InterfaceLanguage) {
  return WORDS[language];
}

/** What a row is about, after its name: "Real Madrid v Getafe" or the show's line. */
export function tonightWhat(
  item: Pick<TonightItem, 'home' | 'away'> & { event?: string | undefined },
  language: InterfaceLanguage,
): string {
  if (item.home && item.away) {
    return `${item.home.name} ${WORDS[language].versus} ${item.away.name}`;
  }
  return item.event ?? '';
}

/** Where a row stands: will start, under way, or over. */
export type TonightState = 'upcoming' | 'on' | 'over';

type Timed = Pick<TonightItem, 'kind' | 'sport' | 'startsAt' | 'result'>;

/** How long each kind of event usually runs, so a row moves on by the clock alone. */
const USUAL_MINUTES = { football: 115, basketball: 150, show: 180 } as const;

/** The row's state at `now`, by the clock, unless a final score already says it is over. */
export function tonightState(item: Timed, now: Date): TonightState {
  if (item.result) return 'over';
  const start = Date.parse(item.startsAt);
  if (now.getTime() < start) return 'upcoming';
  const minutes = USUAL_MINUTES[item.kind === 'show' ? 'show' : (item.sport ?? 'football')];
  return now.getTime() < start + minutes * 60_000 ? 'on' : 'over';
}

export interface TonightStatus {
  readonly state: TonightState;
  /** "21:45" or "2–0". */
  readonly figure: string;
  /** "Tonight", "Under way", "Full time". */
  readonly word: string;
}

const istanbulHour = (iso: string) =>
  Number(
    new Intl.DateTimeFormat('en-GB', { hour: '2-digit', hourCycle: 'h23', timeZone: TIME_ZONE })
      .format(new Date(iso))
      .slice(0, 2),
  );

/** Where a row stands at `now`, in words. */
export function tonightStatus(item: Timed, language: InterfaceLanguage, now: Date): TonightStatus {
  const words = WORDS[language];
  const state = tonightState(item, now);
  const time = formatTime(item.startsAt, language);
  if (state === 'upcoming') {
    const hour = istanbulHour(item.startsAt);
    return { state, figure: time, word: hour >= 17 || hour < 9 ? words.tonight : words.today };
  }
  if (state === 'on') {
    return { state, figure: time, word: item.kind === 'show' ? words.showOn : words.on };
  }
  if (item.kind === 'show') return { state, figure: time, word: words.showOver };
  if (!item.result) return { state, figure: time, word: words.ended };
  return {
    state,
    figure: `${String(item.result.home)}–${String(item.result.away)}`,
    word: item.sport === 'basketball' ? words.final : words.fullTime,
  };
}

/** How the match ended for the side the row follows, when exactly one side is ours. */
export function tonightOutcome(
  item: Pick<TonightItem, 'home' | 'away' | 'result'>,
): 'win' | 'loss' | 'draw' | undefined {
  const { home, away, result } = item;
  if (!home || !away || !result || home.ours === away.ours) return undefined;
  const [ours, theirs] = home.ours ? [result.home, result.away] : [result.away, result.home];
  return ours > theirs ? 'win' : ours < theirs ? 'loss' : 'draw';
}

export type MarkKind = 'goals' | 'assists' | 'points' | 'rebounds';

/**
 * A person's numbers in reading order, leaving out zeros except points. Each number is followed
 * by a word: "1 goal 1 assist", "27 pts 13 reb 8 ast".
 */
export function personMarks(
  line: Partial<Record<MarkKind, number | undefined>>,
): { kind: MarkKind; count: number }[] {
  const order: MarkKind[] = ['goals', 'points', 'rebounds', 'assists'];
  return order.flatMap((kind) => {
    const count = line[kind];
    if (count === undefined || (count === 0 && kind !== 'points')) return [];
    return [{ kind, count }];
  });
}
