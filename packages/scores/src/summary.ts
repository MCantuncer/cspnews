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

const FootballSchema = z.looseObject({
  rosters: z.array(
    z.looseObject({
      roster: z.array(
        z.looseObject({
          athlete: AthleteSchema,
          stats: z
            .array(z.looseObject({ name: z.string(), value: z.number().optional() }))
            .optional(),
        }),
      ),
    }),
  ),
});

export function footballLine(json: unknown, person: AbroadPerson): PersonLine | undefined {
  const page = FootballSchema.safeParse(json);
  if (!page.success) return undefined;
  for (const team of page.data.rosters) {
    const entry = team.roster.find((row) => isPerson(row.athlete.displayName, person));
    if (!entry) continue;
    const stat = (name: string) => {
      const value = entry.stats?.find((s) => s.name === name)?.value;
      return value !== undefined && Number.isInteger(value) && value >= 0 ? value : undefined;
    };
    const goals = stat('totalGoals');
    const assists = stat('goalAssists');
    return {
      person: person.id,
      ...(goals !== undefined && { goals }),
      ...(assists !== undefined && { assists }),
    };
  }
  return undefined;
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
              z.looseObject({ athlete: AthleteSchema, stats: z.array(z.string()) }),
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
      const points = at('points', 'PTS');
      const rebounds = at('rebounds', 'REB');
      const assists = at('assists', 'AST');
      // A player who did not play has a row of dashes: no line.
      if (points === undefined) return undefined;
      return {
        person: person.id,
        points,
        ...(rebounds !== undefined && { rebounds }),
        ...(assists !== undefined && { assists }),
      };
    }
  }
  return undefined;
}
