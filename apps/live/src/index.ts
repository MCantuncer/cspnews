/**
 * The live scores Worker (docs/design/decisions/tonight.md):
 *
 *   GET /scores?refs=espn:soccer/uefa.champions/401,euroleague:E2026/98
 *
 * answers with the score of each match, read from its source. Every source page is cached at the
 * edge for 20 seconds, so however many readers have a page open, a source sees at most one
 * request per match every 20 seconds. Only well-formed match refs are fetched.
 *
 * It also keeps the Daily Song board (board.ts, docs/design/decisions/song-board.md).
 */
import { ABROAD_PEOPLE } from '@cspnews/config';
import { addDays, gameDayAt } from '@cspnews/wordgame';

import { entrySchema, networkKey } from './board.js';

import {
  espnMatchDay,
  espnScorers,
  euroleagueScorers,
  parseRefs,
  readEspn,
  readEuroleague,
  readEuroleagueHeader,
  type LiveRef,
  type LiveScore,
} from './scores.js';

export interface Env {
  /** Pages that may read the scores and the song board, comma-separated. */
  readonly ALLOWED_ORIGINS: string;
  /** One Durable Object per game day (board.ts). */
  readonly SONG_BOARD: BoardNamespace;
}

interface BoardNamespace {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(request: Request): Promise<Response> };
}

export { SongBoard } from './board.js';

interface EdgeCache {
  match(request: Request): Promise<Response | undefined>;
  put(request: Request, response: Response): Promise<void>;
}
interface WaitUntil {
  waitUntil(promise: Promise<unknown>): void;
}

const SOURCE_SECONDS = 20;

async function sourceJson(url: string, context: WaitUntil): Promise<unknown> {
  const cache = (globalThis as unknown as { caches: { default: EdgeCache } }).caches.default;
  const key = new Request(url);
  let response = await cache.match(key);
  if (!response) {
    const fresh = await fetch(url, {
      headers: { accept: 'application/json', 'user-agent': 'CSPNews live scores' },
    });
    if (!fresh.ok) throw new Error(`HTTP ${String(fresh.status)}`);
    response = new Response(await fresh.text(), {
      headers: {
        'content-type': 'application/json',
        'cache-control': `public, max-age=${String(SOURCE_SECONDS)}`,
      },
    });
    context.waitUntil(cache.put(key, response.clone()));
  }
  return response.json();
}

/** The Euroleague's live header, or nothing when it can't be read and the game page must do. */
async function euroleagueHeader(ref: LiveRef, context: WaitUntil) {
  if (!ref.headerUrl) return undefined;
  try {
    return readEuroleagueHeader(ref.key, await sourceJson(ref.headerUrl, context));
  } catch {
    return undefined;
  }
}

async function scoreOf(ref: LiveRef, context: WaitUntil): Promise<LiveScore | undefined> {
  try {
    const summary = ref.source === 'espn' ? await sourceJson(ref.url, context) : undefined;
    const score =
      ref.source === 'espn'
        ? readEspn(ref.key, ref.ref, summary, ABROAD_PEOPLE)
        : ((await euroleagueHeader(ref, context)) ??
          readEuroleague(ref.key, await sourceJson(ref.url, context)));
    if (!score || score.state === 'pre' || !ref.scorersUrl) return score;
    // The scoreboard of the match's own day: without a date ESPN answers with its current
    // matchday, which can leave out a match that ended earlier.
    const scorers = await scorersOf(ref, onDayOf(ref.scorersUrl, summary), context);
    return scorers.length > 0 ? { ...score, scorers } : score;
  } catch {
    return undefined;
  }
}

function onDayOf(url: string, summary: unknown): string {
  const day = summary === undefined ? undefined : espnMatchDay(summary);
  return day ? `${url}?dates=${day}` : url;
}

/** Who scored, from the second page; a page that fails only leaves the scorers out. */
async function scorersOf(ref: LiveRef, url: string, context: WaitUntil) {
  try {
    const json = await sourceJson(url, context);
    return ref.source === 'espn' ? espnScorers(ref.ref, json) : euroleagueScorers(json);
  } catch {
    return [];
  }
}

export function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = env.ALLOWED_ORIGINS.split(',').map((o) => o.trim());
  return origin && allowed.includes(origin)
    ? {
        'access-control-allow-origin': origin,
        'access-control-allow-methods': 'GET, POST',
        'access-control-allow-headers': 'content-type',
        vary: 'Origin',
      }
    : { vary: 'Origin' };
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * `GET /song/board?day=2026-11-28&me=<id>` reads a day's board; `POST /song/board` puts a name on
 * today's (or, just after midnight, yesterday's) board.
 */
async function songBoard(request: Request, env: Env, cors: Record<string, string>) {
  const headers = { ...cors, 'cache-control': 'no-store' };
  const board = (day: string) => env.SONG_BOARD.get(env.SONG_BOARD.idFromName(`song:${day}`));
  const today = gameDayAt(new Date());
  if (request.method === 'GET') {
    const url = new URL(request.url);
    const day = url.searchParams.get('day') ?? today;
    if (!DAY.test(day)) return Response.json({ problem: 'day' }, { status: 400, headers });
    const me = url.searchParams.get('me');
    const inner = new URL(`https://board/?day=${day}`);
    if (me && /^[\w-]{8,64}$/.test(me)) inner.searchParams.set('me', me);
    const answer = await board(day).fetch(new Request(inner));
    return new Response(answer.body, {
      status: answer.status,
      headers: { ...headers, 'content-type': 'application/json' },
    });
  }
  if (Number(request.headers.get('content-length') ?? '0') > 16_000) {
    return Response.json({ problem: 'size' }, { status: 413, headers });
  }
  const parsed = entrySchema.safeParse(await request.json().catch(() => undefined));
  if (!parsed.success) return Response.json({ problem: 'form' }, { status: 400, headers });
  const entry = parsed.data;
  if (entry.day !== today && entry.day !== addDays(today, -1)) {
    return Response.json({ problem: 'closed' }, { status: 409, headers });
  }
  const network = await networkKey(request.headers.get('cf-connecting-ip') ?? 'unknown', entry.day);
  const answer = await board(entry.day).fetch(
    new Request(`https://board/?day=${entry.day}`, {
      method: 'POST',
      body: JSON.stringify({ entry, network }),
    }),
  );
  return new Response(answer.body, {
    status: answer.status,
    headers: { ...headers, 'content-type': 'application/json' },
  });
}

export default {
  async fetch(request: Request, env: Env, context: WaitUntil): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request.headers.get('origin'), env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (url.pathname === '/song/board' && (request.method === 'GET' || request.method === 'POST')) {
      return songBoard(request, env, cors);
    }
    if (request.method !== 'GET' || url.pathname !== '/scores') {
      return new Response('Not found', { status: 404, headers: cors });
    }
    const refs = parseRefs(url.searchParams.get('refs'));
    const scores = (await Promise.all(refs.map((ref) => scoreOf(ref, context)))).filter(
      (score): score is LiveScore => score !== undefined,
    );
    return Response.json(
      { scores },
      {
        headers: {
          ...cors,
          'cache-control': `public, max-age=${String(SOURCE_SECONDS)}`,
        },
      },
    );
  },
};
