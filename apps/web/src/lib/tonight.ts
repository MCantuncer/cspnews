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
