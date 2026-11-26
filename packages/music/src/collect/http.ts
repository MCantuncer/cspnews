import type { FetchText } from './types.js';

/**
 * Fetching for the music Collect: a generic client name (never a person's details), a timeout,
 * one retry, and a pause per host so MusicBrainz (one request a second) and Apple (about twenty a
 * minute) are not flooded.
 */

const USER_AGENT = 'cspnews-music-collect/1.0 (+https://www.cspnews.app)';

const PAUSE_MS: Record<string, number> = {
  'musicbrainz.org': 1100,
  'itunes.apple.com': 3100,
  'api.deezer.com': 120,
  'soundcloud.com': 300,
};

const lastCall = new Map<string, number>();
const sleep = (ms: number) => new Promise((done) => setTimeout(done, ms));

async function waitForHost(host: string): Promise<void> {
  const pause = PAUSE_MS[host] ?? 250;
  const last = lastCall.get(host) ?? 0;
  const wait = last + pause - Date.now();
  lastCall.set(host, Math.max(Date.now(), last + pause));
  if (wait > 0) await sleep(wait);
}

/** Posts a JSON body and returns the answer (Bandcamp's discover list is read this way). */
export async function httpPostJson(url: string, body: string, timeoutMs = 20_000): Promise<string> {
  await waitForHost(new URL(url).hostname);
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'user-agent': USER_AGENT, 'content-type': 'application/json' },
    body,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) throw new Error(`${String(response.status)} from ${url}`);
  return await response.text();
}

export function httpFetchText(timeoutMs = 20_000): FetchText {
  return async (url) => {
    const host = new URL(url).hostname;
    for (let attempt = 1; ; attempt++) {
      await waitForHost(host);
      try {
        const response = await fetch(url, {
          headers: { 'user-agent': USER_AGENT, accept: 'application/json, text/html;q=0.9' },
          signal: AbortSignal.timeout(timeoutMs),
        });
        if (!response.ok) throw new Error(`${String(response.status)} from ${url}`);
        return await response.text();
      } catch (error) {
        if (attempt >= 2) throw error;
        await sleep(1500);
      }
    }
  };
}
