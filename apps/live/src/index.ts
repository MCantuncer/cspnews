/**
 * The live scores Worker (docs/design/decisions/tonight.md):
 *
 *   GET /scores?refs=espn:soccer/uefa.champions/401,euroleague:E2026/98
 *
 * answers with the score of each match, read from its source. Every source page is cached at the
 * edge for 20 seconds, so however many readers have a page open, a source sees at most one
 * request per match every 20 seconds. Only well-formed match refs are fetched.
 */
import { ABROAD_PEOPLE } from '@cspnews/config';

import {
  espnScorers,
  euroleagueScorers,
  parseRefs,
  readEspn,
  readEuroleague,
  type LiveRef,
  type LiveScore,
} from './scores.js';

export interface Env {
  /** Pages that may read the scores, comma-separated. */
  readonly ALLOWED_ORIGINS: string;
}

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

async function scoreOf(ref: LiveRef, context: WaitUntil): Promise<LiveScore | undefined> {
  try {
    const json = await sourceJson(ref.url, context);
    const score =
      ref.source === 'espn'
        ? readEspn(ref.key, ref.ref, json, ABROAD_PEOPLE)
        : readEuroleague(ref.key, json);
    if (!score || score.state === 'pre' || !ref.scorersUrl) return score;
    const scorers = await scorersOf(ref, ref.scorersUrl, context);
    return scorers.length > 0 ? { ...score, scorers } : score;
  } catch {
    return undefined;
  }
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
    ? { 'access-control-allow-origin': origin, vary: 'Origin' }
    : { vary: 'Origin' };
}

export default {
  async fetch(request: Request, env: Env, context: WaitUntil): Promise<Response> {
    const url = new URL(request.url);
    const cors = corsHeaders(request.headers.get('origin'), env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
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
