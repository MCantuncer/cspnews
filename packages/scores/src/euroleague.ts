import { z } from 'zod';

import { scoreOf, type Fixture, type FixtureScorer } from './fixture.js';

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

/**
 * The feed answers in XML or JSON by the Accept header, but its cache keys on the address alone,
 * so an address someone else asked for in XML can come back as XML. `format=json` keeps our
 * addresses apart; the feed itself ignores it.
 */
export function euroleagueGamesUrl(season: string, teamCode: string): string {
  return `${EUROLEAGUE_BASE}/${season}/games?teamCode=${encodeURIComponent(teamCode)}&format=json`;
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

/** A game's box score, where each player row carries their points and official headshot. */
export function euroleagueStatsUrl(ref: string): string {
  const [season = '', gameCode = ''] = ref.split('/');
  return `${EUROLEAGUE_BASE}/${season}/games/${gameCode}/stats?format=json`;
}

const StatsPlayerSchema = z.looseObject({
  player: z.looseObject({
    person: z.looseObject({ code: z.string().optional(), name: z.string().min(1).max(60) }),
    images: z.looseObject({ headshot: z.url().optional() }).optional(),
  }),
  stats: z.looseObject({ points: z.number().min(0).max(200) }),
});
const StatsSideSchema = z.looseObject({ players: z.array(z.unknown()) });
const StatsSchema = z.looseObject({ local: StatsSideSchema, road: StatsSideSchema });

/** "HAYES-DAVIS, NIGEL" as "Nigel Hayes-Davis". */
export function euroleaguePlayerName(name: string): string {
  const [last = '', first = ''] = name.split(',').map((part) => part.trim());
  const title = (part: string) =>
    part
      .toLocaleLowerCase('en')
      .replace(
        /(^|[\s'-])(\p{L})/gu,
        (_, cut: string, letter: string) => `${cut}${letter.toLocaleUpperCase('en')}`,
      );
  return [title(first), title(last)].filter((part) => part.length > 0).join(' ');
}

/** Each side's top scorer, with their official photo when the feed has one. */
export function euroleagueTopScorers(json: unknown): FixtureScorer[] {
  const page = StatsSchema.safeParse(json);
  if (!page.success) return [];
  const top = (side: 'home' | 'away', players: readonly unknown[]): FixtureScorer[] => {
    const rows = players.flatMap((raw) => {
      const row = StatsPlayerSchema.safeParse(raw);
      return row.success ? [row.data] : [];
    });
    const best = rows.reduce<(typeof rows)[number] | undefined>(
      (most, row) => (!most || row.stats.points > most.stats.points ? row : most),
      undefined,
    );
    if (!best || best.stats.points === 0) return [];
    const { person, images } = best.player;
    return [
      {
        side,
        name: euroleaguePlayerName(person.name),
        points: Math.round(best.stats.points),
        ...(images?.headshot && {
          photo: {
            key: `euroleague-${(person.code ?? person.name).toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
            url: images.headshot,
          },
        }),
      },
    ];
  };
  return [...top('home', page.data.local.players), ...top('away', page.data.road.players)];
}
