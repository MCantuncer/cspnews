import { z } from 'zod';

import { scoreOf, type Fixture } from './fixture.js';

/**
 * The Euroleague's own public game data, the feed behind its site:
 *
 *   https://api-live.euroleague.net/v2/competitions/E/seasons/E2026/games?teamCode=ULK
 *
 * Like ESPN's it has no contract. Games that don't read cleanly are left out.
 */
export const EUROLEAGUE_BASE = 'https://api-live.euroleague.net/v2/competitions/E/seasons';

/** The season a date falls in: E2026 runs from autumn 2026 to spring 2027. */
export function euroleagueSeason(at: Date): string {
  const year = at.getUTCFullYear();
  return `E${String(at.getUTCMonth() >= 7 ? year : year - 1)}`;
}

export function euroleagueGamesUrl(season: string, teamCode: string): string {
  return `${EUROLEAGUE_BASE}/${season}/games?teamCode=${encodeURIComponent(teamCode)}`;
}

const ClubSchema = z.looseObject({
  code: z.string().min(1),
  name: z.string().min(1),
  abbreviatedName: z.string().optional(),
  images: z.looseObject({ crest: z.url().optional() }).optional(),
});
const SideSchema = z.looseObject({ club: ClubSchema, score: z.unknown().optional() });
const GameSchema = z.looseObject({
  gameCode: z.number().int().positive(),
  date: z.string().min(10),
  utcDate: z.string().optional(),
  played: z.boolean().optional(),
  local: SideSchema,
  road: SideSchema,
});

const PageSchema = z.looseObject({ data: z.array(z.unknown()) });

/**
 * The Euroleague writes tip-off in Central European time without an offset ("2026-11-20T19:45:00"
 * is 21:45 in Istanbul). `utcDate`, when given, wins.
 */
export function euroleagueStart(game: { date: string; utcDate?: string | undefined }): string {
  if (game.utcDate && !Number.isNaN(Date.parse(game.utcDate))) {
    const utc = /[zZ]|[+-]\d\d:?\d\d$/.test(game.utcDate) ? game.utcDate : `${game.utcDate}Z`;
    return new Date(utc).toISOString();
  }
  return centralEuropeanToUtc(game.date);
}

/** "2026-11-20T19:45:00" in Madrid time, as UTC. */
export function centralEuropeanToUtc(local: string): string {
  const guess = new Date(`${local.slice(0, 19)}Z`);
  if (Number.isNaN(guess.getTime())) throw new Error(`Unreadable date: ${local}`);
  const offset = (at: Date) => {
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Europe/Madrid',
      timeZoneName: 'shortOffset',
    })
      .formatToParts(at)
      .find((part) => part.type === 'timeZoneName')?.value;
    const match = /GMT([+-]\d+)/.exec(parts ?? '');
    return Number(match?.[1] ?? 1) * 60;
  };
  return new Date(guess.getTime() - offset(guess) * 60_000).toISOString();
}

/** A team's games for a season. */
export function parseEuroleagueGames(season: string, json: unknown): Fixture[] {
  const page = PageSchema.safeParse(json);
  if (!page.success) throw new Error('Not a Euroleague games page');
  return page.data.data.flatMap((raw) => {
    const game = GameSchema.safeParse(raw);
    if (!game.success) return [];
    const { gameCode, local, road, played } = game.data;
    let startsAt: string;
    try {
      startsAt = euroleagueStart(game.data);
    } catch {
      return [];
    }
    const completed = played === true;
    const side = (s: typeof local) => {
      const score = scoreOf(s.score);
      return {
        names: [s.club.name, s.club.abbreviatedName, s.club.code].filter(
          (name): name is string => typeof name === 'string' && name.length > 0,
        ),
        display: s.club.name,
        ...(s.club.images?.crest && { logo: s.club.images.crest }),
        // A game not yet started reads 0–0; only a played game's score is a result.
        ...(completed && score !== undefined && { score }),
      };
    };
    return [
      {
        id: `euroleague-${season.toLowerCase()}-${String(gameCode)}`,
        source: 'euroleague' as const,
        league: 'euroleague',
        ref: `${season}/${String(gameCode)}`,
        startsAt,
        home: side(local),
        away: side(road),
        completed,
      },
    ];
  });
}
