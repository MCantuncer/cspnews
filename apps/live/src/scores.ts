import { z } from 'zod';

import type { AbroadPerson, PersonLine } from '@cspnews/core';
import {
  ESPN_BASE,
  EUROLEAGUE_BASE,
  basketballLine,
  espnSummaryUrl,
  euroleagueStatsUrl,
  euroleagueTopScorers,
  footballLine,
  parseEspnScoreboard,
  scoreOf,
  type FixtureScorer,
} from '@cspnews/scores';

/**
 * One match's score as the pages read it (docs/design/decisions/tonight.md). `state` is the
 * source's own: not started, being played, or over. `clock` is the source's short line while it
 * is played ("63'", "3rd 4:12"). Nothing here is guessed: a field the source doesn't give is left
 * out, and the page keeps what it showed.
 */
export interface LiveScore {
  readonly ref: string;
  readonly state: 'pre' | 'in' | 'post';
  readonly home?: number;
  readonly away?: number;
  readonly clock?: string;
  readonly lines?: readonly PersonLine[];
  /** Goal scorers so far (football), or each side's top scorer (Euroleague). */
  readonly scorers?: readonly LiveScorer[];
}

/** A scorer as the page draws it; `photo` is the official photo's address at the source. */
export interface LiveScorer {
  readonly side: 'home' | 'away';
  readonly name: string;
  readonly minutes?: readonly string[];
  readonly points?: number;
  readonly own?: boolean;
  readonly penalty?: boolean;
  readonly photo?: string;
}

export function liveScorer(scorer: FixtureScorer): LiveScorer {
  return {
    side: scorer.side,
    name: scorer.name,
    ...(scorer.minutes && { minutes: scorer.minutes }),
    ...(scorer.points !== undefined && { points: scorer.points }),
    ...(scorer.own && { own: true }),
    ...(scorer.penalty && { penalty: true }),
    ...(scorer.photo && { photo: scorer.photo.url }),
  };
}

/** A match the pages may ask about: `espn:<sport>/<league>/<id>` or `euroleague:<season>/<game>`. */
export interface LiveRef {
  readonly key: string;
  readonly source: 'espn' | 'euroleague';
  readonly ref: string;
  readonly url: string;
  /** A second page with who scored: the league's scoreboard (football) or the box score. */
  readonly scorersUrl?: string;
  /**
   * The Euroleague's live game header, asked first: the season's game page keeps 0–0 and
   * `played: false` until a game is over, so it never shows a game being played.
   */
  readonly headerUrl?: string;
}

/** The Euroleague's live game centre, which updates while a game is played. */
export const EUROLEAGUE_LIVE = 'https://live.euroleague.net/api';

const ESPN_REF = /^(basketball|soccer)\/[a-z0-9.]{2,30}\/\d{1,12}$/;
const EUROLEAGUE_REF = /^E\d{4}\/\d{1,4}$/;
export const MAX_REFS = 12;

/** The refs a request names, keeping only well-formed ones, so the Worker is never an open proxy. */
export function parseRefs(query: string | null): LiveRef[] {
  const keys = [...new Set((query ?? '').split(',').map((key) => key.trim()))];
  return keys.slice(0, MAX_REFS).flatMap((key): LiveRef[] => {
    const cut = key.indexOf(':');
    const source = key.slice(0, cut);
    const ref = key.slice(cut + 1);
    if (source === 'espn' && ESPN_REF.test(ref)) {
      const league = ref.slice(0, ref.lastIndexOf('/'));
      return [
        {
          key,
          source,
          ref,
          url: espnSummaryUrl(ref),
          // Today's scoreboard lists each goal; the summary does not.
          ...(ref.startsWith('soccer/') && { scorersUrl: `${ESPN_BASE}/${league}/scoreboard` }),
        },
      ];
    }
    if (source === 'euroleague' && EUROLEAGUE_REF.test(ref)) {
      const [season, game] = ref.split('/');
      return [
        {
          key,
          source,
          ref,
          url: `${EUROLEAGUE_BASE}/${season ?? ''}/games/${game ?? ''}?format=json`,
          scorersUrl: euroleagueStatsUrl(ref),
          headerUrl: `${EUROLEAGUE_LIVE}/Header?gamecode=${game ?? ''}&seasoncode=${season ?? ''}`,
        },
      ];
    }
    return [];
  });
}

const EspnHeaderSchema = z.looseObject({
  header: z.looseObject({
    competitions: z
      .array(
        z.looseObject({
          status: z.looseObject({
            type: z.looseObject({
              state: z.enum(['pre', 'in', 'post']),
              shortDetail: z.string().optional(),
            }),
          }),
          competitors: z.array(
            z.looseObject({ homeAway: z.enum(['home', 'away']), score: z.unknown().optional() }),
          ),
        }),
      )
      .min(1),
  }),
});

const EspnDateSchema = z.looseObject({
  header: z.looseObject({
    competitions: z.array(z.looseObject({ date: z.string() })).min(1),
  }),
});

/**
 * The match's day as ESPN's scoreboards file it (yyyymmdd, UTC), from its game summary, or
 * nothing when the summary does not say.
 */
export function espnMatchDay(json: unknown): string | undefined {
  const page = EspnDateSchema.safeParse(json);
  const at = page.success ? Date.parse(page.data.header.competitions[0]?.date ?? '') : Number.NaN;
  return Number.isNaN(at) ? undefined : new Date(at).toISOString().slice(0, 10).replaceAll('-', '');
}

/** A score from ESPN's game summary, with the followed people's own numbers. */
export function readEspn(
  key: string,
  ref: string,
  json: unknown,
  people: readonly AbroadPerson[],
): LiveScore | undefined {
  const page = EspnHeaderSchema.safeParse(json);
  const competition = page.success ? page.data.header.competitions[0] : undefined;
  if (!competition) return undefined;
  const { state, shortDetail } = competition.status.type;
  const side = (homeAway: 'home' | 'away') =>
    state === 'pre'
      ? undefined
      : scoreOf(competition.competitors.find((c) => c.homeAway === homeAway)?.score);
  const home = side('home');
  const away = side('away');
  const basketball = ref.startsWith('basketball/');
  const lines =
    state === 'pre'
      ? []
      : people.flatMap((person) => {
          const line = basketball ? basketballLine(json, person) : footballLine(json, person);
          return line ? [line] : [];
        });
  return {
    ref: key,
    state,
    ...(home !== undefined && { home }),
    ...(away !== undefined && { away }),
    ...(state === 'in' && shortDetail && { clock: shortDetail.slice(0, 24) }),
    ...(lines.length > 0 && { lines }),
  };
}

const EuroleagueGameSchema = z.looseObject({
  played: z.boolean().optional(),
  local: z.looseObject({ score: z.unknown().optional() }),
  road: z.looseObject({ score: z.unknown().optional() }),
});

const EuroleagueHeaderSchema = z.looseObject({
  Live: z.boolean(),
  ScoreA: z.unknown().optional(),
  ScoreB: z.unknown().optional(),
  Quarter: z.unknown().optional(),
  RemainingPartialTime: z.unknown().optional(),
});

/** "03:35" → "3:35"; anything else is left out. */
const remaining = (value: unknown) =>
  typeof value === 'string' && /^\d{1,2}:\d{2}$/.test(value.trim())
    ? value.trim().replace(/^0(\d)/, '$1')
    : undefined;

/**
 * A score from the Euroleague's live game header: `Live` while a game is played, with the
 * quarter and the time left in it ("Q3 3:35", "OT 1:12"). A game that is not live but has points
 * and no quarter is over; one with no points has yet to start. Between quarters the header can
 * drop `Live` while it still names the quarter, so that reads as being played.
 */
export function readEuroleagueHeader(key: string, json: unknown): LiveScore | undefined {
  const page = EuroleagueHeaderSchema.safeParse(json);
  if (!page.success) return undefined;
  const { Live, ScoreA, ScoreB, Quarter, RemainingPartialTime } = page.data;
  const home = scoreOf(ScoreA);
  const away = scoreOf(ScoreB);
  const quarter = Number(typeof Quarter === 'string' ? Quarter.trim() : Quarter);
  const inQuarter = Number.isInteger(quarter) && quarter > 0;
  const points = (home ?? 0) + (away ?? 0) > 0;
  const state = Live || (points && inQuarter) ? 'in' : points ? 'post' : 'pre';
  const left = remaining(RemainingPartialTime);
  const period = inQuarter ? (quarter > 4 ? 'OT' : `Q${String(quarter)}`) : undefined;
  const clock = state === 'in' && period ? [period, left].filter(Boolean).join(' ') : undefined;
  return {
    ref: key,
    state,
    ...(state !== 'pre' && home !== undefined && { home }),
    ...(state !== 'pre' && away !== undefined && { away }),
    ...(clock && { clock }),
  };
}

/**
 * A score from the Euroleague's season game page, used when the live header can't be read. It
 * says whether a game is over but not which quarter it is in, and it keeps 0–0 while a game is
 * played, so on its own a game being played reads as not started.
 */
export function readEuroleague(key: string, json: unknown): LiveScore | undefined {
  const page = EuroleagueGameSchema.safeParse(json);
  if (!page.success) return undefined;
  const home = scoreOf(page.data.local.score);
  const away = scoreOf(page.data.road.score);
  // Before tip-off the page reads 0–0.
  const started = (home ?? 0) + (away ?? 0) > 0;
  const state = page.data.played === true ? 'post' : started ? 'in' : 'pre';
  return {
    ref: key,
    state,
    ...(state !== 'pre' && home !== undefined && { home }),
    ...(state !== 'pre' && away !== undefined && { away }),
  };
}

/** The goal scorers of one ESPN match, from its league's scoreboard. */
export function espnScorers(ref: string, json: unknown): LiveScorer[] {
  const league = ref.slice(0, ref.lastIndexOf('/'));
  let fixtures;
  try {
    fixtures = parseEspnScoreboard(league, json);
  } catch {
    return [];
  }
  return (fixtures.find((f) => f.ref === ref)?.scorers ?? []).map(liveScorer);
}

/** Each side's top scorer from a Euroleague box score. */
export function euroleagueScorers(json: unknown): LiveScorer[] {
  return euroleagueTopScorers(json).map(liveScorer);
}
