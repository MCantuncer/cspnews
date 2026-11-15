import { z } from 'zod';

import { scoreOf, type Fixture } from './fixture.js';

/**
 * ESPN's public scoreboard, the one its own site and apps read:
 *
 *   https://site.api.espn.com/apis/site/v2/sports/<sport>/<league>/scoreboard?dates=yyyymmdd
 *
 * It has no contract and can change; anything that does not read as expected is skipped, never
 * guessed. Only the fields below are used.
 */
export const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports';

export function espnScoreboardUrl(league: string, date: string): string {
  return `${ESPN_BASE}/${league}/scoreboard?dates=${date.replaceAll('-', '')}`;
}

const TeamSchema = z.looseObject({
  displayName: z.string().min(1),
  shortDisplayName: z.string().optional(),
  name: z.string().optional(),
  abbreviation: z.string().optional(),
  logo: z.url().optional(),
});

const CompetitorSchema = z.looseObject({
  homeAway: z.enum(['home', 'away']),
  score: z.unknown().optional(),
  team: TeamSchema,
});

const EventSchema = z.looseObject({
  id: z.string().regex(/^\d+$/),
  date: z.string().refine((value) => !Number.isNaN(Date.parse(value))),
  status: z.looseObject({
    type: z.looseObject({ state: z.string(), completed: z.boolean() }),
  }),
  competitions: z.array(z.looseObject({ competitors: z.array(CompetitorSchema).length(2) })).min(1),
});

const ScoreboardSchema = z.looseObject({ events: z.array(z.unknown()) });

/** The matches on one ESPN scoreboard page. Events that don't read cleanly are left out. */
export function parseEspnScoreboard(league: string, json: unknown): Fixture[] {
  const board = ScoreboardSchema.safeParse(json);
  if (!board.success) throw new Error('Not an ESPN scoreboard');
  return board.data.events.flatMap((raw) => {
    const event = EventSchema.safeParse(raw);
    if (!event.success) return [];
    const { id, date, status, competitions } = event.data;
    const competitors = competitions[0]?.competitors ?? [];
    const home = competitors.find((c) => c.homeAway === 'home');
    const away = competitors.find((c) => c.homeAway === 'away');
    if (!home || !away) return [];
    const completed = status.type.completed;
    const side = (competitor: typeof home) => {
      const { team } = competitor;
      const score = completed || status.type.state === 'in' ? scoreOf(competitor.score) : undefined;
      return {
        names: [team.displayName, team.shortDisplayName, team.name].filter(
          (name): name is string => typeof name === 'string' && name.length > 0,
        ),
        display: team.displayName,
        ...(score !== undefined && { score }),
        ...(team.logo && { logo: team.logo }),
      };
    };
    return [
      {
        id: `espn-${id}`,
        source: 'espn' as const,
        league,
        ref: `${league}/${id}`,
        startsAt: new Date(date).toISOString(),
        home: side(home),
        away: side(away),
        completed,
      },
    ];
  });
}
