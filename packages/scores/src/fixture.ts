/**
 * A match as the score sources describe it, before the Tonight rules decide whether it is ours.
 * Both sources are read into this one shape (espn.ts, euroleague.ts).
 */
export interface Fixture {
  /** Stable across runs, so a row keeps its id from one bulletin to the next. */
  readonly id: string;
  readonly source: 'espn' | 'euroleague';
  /** The league as the watch list names it: `basketball/nba`, or `euroleague`. */
  readonly league: string;
  /** Where the live score is read, for the page. */
  readonly ref: string;
  /** UTC, ISO. */
  readonly startsAt: string;
  readonly home: FixtureSide;
  readonly away: FixtureSide;
  /** True once the source calls it final. */
  readonly completed: boolean;
  /** Goal scorers so far, when the source lists them (ESPN football). */
  readonly scorers?: readonly FixtureScorer[];
}

/** A goal scorer, with every minute they scored, or a basketball side's top scorer. */
export interface FixtureScorer {
  readonly side: 'home' | 'away';
  readonly name: string;
  readonly minutes?: readonly string[];
  readonly points?: number;
  readonly own?: boolean;
  readonly penalty?: boolean;
  /** The official photo at the source, and the key it is saved under. */
  readonly photo?: { readonly key: string; readonly url: string };
}

export interface FixtureSide {
  /** Every name the source gives the team: full, short, code. */
  readonly names: readonly string[];
  /** The name to show. */
  readonly display: string;
  readonly score?: number;
  /** The team's logo at the source, to save a copy of. */
  readonly logo?: string;
}

/** A number from a score field that may be a string, a number or missing. */
export function scoreOf(value: unknown): number | undefined {
  const number = typeof value === 'string' ? Number(value) : value;
  return typeof number === 'number' && Number.isInteger(number) && number >= 0 ? number : undefined;
}
