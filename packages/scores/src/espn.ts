import { z } from 'zod';

import { scoreOf, type Fixture, type FixtureScorer } from './fixture.js';

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
  id: z.string().optional(),
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
  competitions: z
    .array(
      z.looseObject({
        competitors: z.array(CompetitorSchema).length(2),
        details: z.array(z.unknown()).optional(),
      }),
    )
    .min(1),
});

/** A goal in a scoreboard's `details`: who, when, for which team. */
const GoalSchema = z.looseObject({
  scoringPlay: z.literal(true),
  ownGoal: z.boolean().optional(),
  penaltyKick: z.boolean().optional(),
  clock: z.looseObject({ displayValue: z.string().regex(/^\d{1,3}(\+\d{1,2})?'$/) }),
  team: z.looseObject({ id: z.string() }),
  athletesInvolved: z
    .array(
      z.looseObject({
        id: z.string().regex(/^\d+$/),
        displayName: z.string().min(1).max(60),
        headshot: z.url().optional(),
      }),
    )
    .min(1),
});

/**
 * The goal scorers in a scoreboard's `details`, one entry per player and side with every minute
 * they scored. Entries that don't read cleanly are skipped.
 */
export function goalScorers(
  details: readonly unknown[],
  teamIds: { readonly home?: string | undefined; readonly away?: string | undefined },
): FixtureScorer[] {
  const scorers = new Map<string, FixtureScorer & { minutes: string[] }>();
  for (const raw of details) {
    const goal = GoalSchema.safeParse(raw);
    if (!goal.success) continue;
    const { team, athletesInvolved, clock, ownGoal, penaltyKick } = goal.data;
    const side = team.id === teamIds.home ? 'home' : team.id === teamIds.away ? 'away' : undefined;
    const athlete = athletesInvolved[0];
    if (!side || !athlete) continue;
    const key = `${side}-${athlete.id}-${ownGoal ? 'og' : ''}`;
    const known = scorers.get(key);
    if (known) {
      if (known.minutes.length < 8) known.minutes.push(clock.displayValue);
      continue;
    }
    scorers.set(key, {
      side,
      name: athlete.displayName,
      minutes: [clock.displayValue],
      ...(ownGoal && { own: true }),
      ...(penaltyKick && { penalty: true }),
      ...(athlete.headshot && { photo: { key: `espn-${athlete.id}`, url: athlete.headshot } }),
    });
  }
  return [...scorers.values()];
}

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
    const scorers = goalScorers(competitions[0]?.details ?? [], {
      home: home.team.id,
      away: away.team.id,
    });
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
        ...(scorers.length > 0 && { scorers }),
      },
    ];
  });
}
