import { z } from 'zod';

import { foldName } from './abroad.js';
import type { Language } from './language.js';

/**
 * Tonight (Bu gece): the matches and shows a Turkish reader would stay up for, on the bulletin's
 * Contents screen (docs/design/decisions/tonight.md). A row is a Turk abroad whose team plays, a
 * Turkish club in the Champions League or the Euroleague, a Türkiye A national team match, or an
 * award show with a Turk on its public shortlist. Each row says whether it will start, is under
 * way or has ended, so it stays in every bulletin until it is played.
 *
 * Matches come from rules (packages/scores), never from a writer: they carry `live`, the address
 * of the score in its source. Shows are written by the bulletin writer and have no `live`.
 */

export const TONIGHT_MAX = 10;
export const TONIGHT_KINDS = ['match', 'show'] as const;
export const TONIGHT_SPORTS = ['football', 'basketball'] as const;
/** Why the row is there: a person on the Turks abroad list, a Turkish club, or the national team. */
export const TONIGHT_FOCUS = ['person', 'club', 'national'] as const;
export const LIVE_SOURCES = ['espn', 'euroleague'] as const;

const text = (max: number) => z.string().trim().min(1).max(max);
const bilingual = (max: number) => z.object({ en: text(max), tr: text(max) }).strict();
const slug = z
  .string()
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  .max(80);
const score = z.number().int().min(0).max(300);

/** Where a match's live score is read: `basketball/nba/401909980` on ESPN, `E2026/123` on Euroleague. */
export const LiveSchema = z.object({ source: z.enum(LIVE_SOURCES), ref: text(80) }).strict();

export const TonightSideSchema = z
  .object({
    /** The team as its source names it: "Real Madrid", "Houston Rockets", "Türkiye". */
    name: text(60),
    /** True for the side the row follows; it is shown in bold. */
    ours: z.boolean(),
    /** The team's logo file, `media/teams/<team>.png`, saved by the rules when the source has one. */
    team: slug.optional(),
  })
  .strict();

export const TonightItemSchema = z
  .object({
    id: slug,
    kind: z.enum(TONIGHT_KINDS),
    sport: z.enum(TONIGHT_SPORTS).optional(),
    focus: z.enum(TONIGHT_FOCUS),
    /** Ids from the Turks abroad list, when the row follows people. */
    people: z.array(slug).min(1).max(4).optional(),
    /** The row's name: "Alperen Şengün", "Galatasaray", "Türkiye". */
    name: bilingual(80),
    /** "NBA", "Champions League" / "Şampiyonlar Ligi", "Ballon d'Or". */
    competition: bilingual(60),
    home: TonightSideSchema.optional(),
    away: TonightSideSchema.optional(),
    /** A show's one line: "Nominated for the Kopa Trophy". */
    event: bilingual(120).optional(),
    startsAt: z.iso.datetime({ offset: true }),
    /** Where the live score is read, set by the rules. */
    live: LiveSchema.optional(),
    /** The final score, once the match has ended. */
    result: z.object({ home: score, away: score }).strict().optional(),
  })
  .strict()
  .refine(
    (item) =>
      item.kind === 'match'
        ? item.sport !== undefined && item.home !== undefined && item.away !== undefined
        : item.event !== undefined && item.result === undefined,
    'A match needs its sport and both sides; a show needs its event line and has no score',
  );

export type TonightItem = z.infer<typeof TonightItemSchema>;
export type TonightSide = z.infer<typeof TonightSideSchema>;
export type TonightSport = (typeof TONIGHT_SPORTS)[number];
export type TonightFocus = (typeof TONIGHT_FOCUS)[number];
export type LiveSource = (typeof LIVE_SOURCES)[number];
export type Live = z.infer<typeof LiveSchema>;

export interface LocalTonightItem extends Omit<TonightItem, 'name' | 'competition' | 'event'> {
  readonly name: string;
  readonly competition: string;
  readonly event?: string;
}

/** A row in the reader's language. */
export function tonightIn(item: TonightItem, language: Language): LocalTonightItem {
  const { name, competition, event, ...shared } = item;
  return {
    ...shared,
    name: name[language],
    competition: competition[language],
    ...(event && { event: event[language] }),
  };
}

/** Rows in the order they happen; the national team first among rows that start together. */
export function sortTonight<Item extends Pick<TonightItem, 'startsAt' | 'focus'>>(
  items: readonly Item[],
): Item[] {
  const rank: Record<TonightFocus, number> = { national: 0, club: 1, person: 2 };
  return [...items].sort(
    (a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt) || rank[a.focus] - rank[b.focus],
  );
}

/** The file name a team's logo is saved under: "Fenerbahçe Beko" is `fenerbahce-beko`. */
export function teamKey(name: string): string {
  return foldName(name)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}
