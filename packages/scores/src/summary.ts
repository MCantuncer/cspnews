import { z } from 'zod';

import { foldName, type AbroadPerson, type PersonLine } from '@cspnews/core';

import { ESPN_BASE } from './espn.js';

/**
 * A followed person's own numbers from ESPN's game summary, the page behind its box scores:
 *
 *   https://site.api.espn.com/apis/site/v2/sports/<sport>/<league>/summary?event=<id>
 *
 * Football summaries list each squad with season-style stat names (`totalGoals`, `goalAssists`);
 * basketball summaries give a box score with one row of strings per player under `keys`. A person
 * the page doesn't list (not in the squad, or the page changed) simply has no line.
 */
export function espnSummaryUrl(ref: string): string {
  const cut = ref.lastIndexOf('/');
  return `${ESPN_BASE}/${ref.slice(0, cut)}/summary?event=${ref.slice(cut + 1)}`;
}

const AthleteSchema = z.looseObject({ displayName: z.string() });

const isPerson = (displayName: string, person: AbroadPerson) => {
  const name = foldName(displayName);
  return [person.name, ...person.aliases].some((alias) => foldName(alias) === name);
};

const SubSchema = z.union([z.boolean(), z.looseObject({ didSub: z.boolean() })]).optional();

const FootballSchema = z.looseObject({
  header: z
    .looseObject({
      competitions: z.array(
        z.looseObject({
          status: z.looseObject({ type: z.looseObject({ state: z.string() }) }).optional(),
        }),
      ),
    })
    .optional(),
  rosters: z.array(
    z.looseObject({
      roster: z.array(
        z.looseObject({
          athlete: AthleteSchema,
          starter: z.boolean().optional(),
          subbedIn: SubSchema,
          subbedOut: SubSchema,
          plays: z
            .array(
              z.looseObject({
                substitution: z.boolean().optional(),
                clock: z.looseObject({ displayValue: z.string() }).optional(),
              }),
            )
            .optional(),
          stats: z
            .array(z.looseObject({ name: z.string(), value: z.number().optional() }))
            .optional(),
        }),
      ),
    }),
  ),
});

type FootballEntry = z.infer<typeof FootballSchema>['rosters'][number]['roster'][number];

/** A football match's length in minutes; stoppage time is left out, as the scores apps do. */
const FULL_MATCH = 90;

const didSub = (value: FootballEntry['subbedIn']) =>
  typeof value === 'object' ? value.didSub : value === true;

/** The minutes of a player's substitutions, in order: "64'" and "90'+2'" read as 64 and 90. */
const subMinutes = (entry: FootballEntry) =>
  (entry.plays ?? []).flatMap((play) => {
    const minute = play.substitution ? Number.parseInt(play.clock?.displayValue ?? '', 10) : NaN;
    return Number.isInteger(minute) && minute >= 0 ? [Math.min(minute, FULL_MATCH)] : [];
  });

/**
 * Minutes on the pitch, from the squad sheet: a starter until they came off (or the whole
 * match), a substitute from when they came on. Undefined when the sheet doesn't say when.
 */
export function minutesPlayed(entry: FootballEntry): number | undefined {
  const inOn = didSub(entry.subbedIn);
  const off = didSub(entry.subbedOut);
  if (!entry.starter && !inOn) return 0;
  const subs = subMinutes(entry);
  const on = inOn ? subs[0] : 0;
  const offAt = off ? subs[inOn ? 1 : 0] : FULL_MATCH;
  if (on === undefined || offAt === undefined) return undefined;
  return Math.max(offAt - on, 1);
}

export function footballLine(json: unknown, person: AbroadPerson): PersonLine | undefined {
  const page = FootballSchema.safeParse(json);
  if (!page.success) return undefined;
  const over = page.data.header?.competitions[0]?.status?.type.state === 'post';
  for (const team of page.data.rosters) {
    const entry = team.roster.find((row) => isPerson(row.athlete.displayName, person));
    if (!entry) continue;
    const stat = (name: string) => {
      const value = entry.stats?.find((s) => s.name === name)?.value;
      return value !== undefined && Number.isInteger(value) && value >= 0 ? value : undefined;
    };
    const goals = stat('totalGoals');
    const assists = stat('goalAssists');
    const minutes = over ? minutesPlayed(entry) : undefined;
    return {
      person: person.id,
      ...(goals !== undefined && { goals }),
      ...(assists !== undefined && { assists }),
      ...(minutes !== undefined && minutes > 0 && { minutes }),
      ...(minutes === 0 && { didNotPlay: 'unused' as const }),
    };
  }
  // Both full squad sheets are out and the match is over, yet they are on neither: not in the
  // squad. A short or missing sheet says nothing.
  const full =
    page.data.rosters.length === 2 && page.data.rosters.every((t) => t.roster.length >= 11);
  return over && full ? { person: person.id, didNotPlay: 'notInSquad' } : undefined;
}

const BasketballSchema = z.looseObject({
  boxscore: z.looseObject({
    players: z.array(
      z.looseObject({
        statistics: z.array(
          z.looseObject({
            keys: z.array(z.string()).optional(),
            labels: z.array(z.string()).optional(),
            athletes: z.array(
              z.looseObject({
                athlete: AthleteSchema,
                stats: z.array(z.string()),
                didNotPlay: z.boolean().optional(),
              }),
            ),
          }),
        ),
      }),
    ),
  }),
});

export function basketballLine(json: unknown, person: AbroadPerson): PersonLine | undefined {
  const page = BasketballSchema.safeParse(json);
  if (!page.success) return undefined;
  for (const team of page.data.boxscore.players) {
    for (const table of team.statistics) {
      const row = table.athletes.find((a) => isPerson(a.athlete.displayName, person));
      if (!row) continue;
      const at = (key: string, label: string) => {
        const index = table.keys?.indexOf(key) ?? table.labels?.indexOf(label) ?? -1;
        const value = Number(row.stats[index]);
        return index >= 0 && Number.isInteger(value) && value >= 0 ? value : undefined;
      };
      // A player who did not play is listed with an empty row.
      if (row.didNotPlay === true) return { person: person.id, didNotPlay: 'unused' };
      const points = at('points', 'PTS');
      const rebounds = at('rebounds', 'REB');
      const assists = at('assists', 'AST');
      const minutes = at('minutes', 'MIN');
      // A row of dashes says nothing yet: no line.
      if (points === undefined) return undefined;
      return {
        person: person.id,
        points,
        ...(minutes !== undefined && minutes > 0 && { minutes }),
        ...(rebounds !== undefined && { rebounds }),
        ...(assists !== undefined && { assists }),
      };
    }
  }
  return undefined;
}
