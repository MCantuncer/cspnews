import { z } from 'zod';

import type { AbroadPerson, PersonLine } from '@cspnews/core';
import {
  EUROLEAGUE_BASE,
  basketballLine,
  espnSummaryUrl,
  footballLine,
  scoreOf,
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
}

/** A match the pages may ask about: `espn:<sport>/<league>/<id>` or `euroleague:<season>/<game>`. */
export interface LiveRef {
  readonly key: string;
  readonly source: 'espn' | 'euroleague';
  readonly ref: string;
  readonly url: string;
}

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
      return [{ key, source, ref, url: espnSummaryUrl(ref) }];
    }
    if (source === 'euroleague' && EUROLEAGUE_REF.test(ref)) {
      const [season, game] = ref.split('/');
      return [
        {
          key,
          source,
          ref,
          url: `${EUROLEAGUE_BASE}/${season ?? ''}/games/${game ?? ''}?format=json`,
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

/**
 * A score from the Euroleague's game page. It says whether a game is over but not which quarter
 * it is in, so a game being played shows its score with no clock.
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
