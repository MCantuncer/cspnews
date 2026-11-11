/**
 * Keeps the word game's results in step with the reader's account, when they are signed in.
 *
 * The game always saves to the browser first, so it works signed out and offline. When the page
 * opens, and again when a day is finished, a signed-in browser sends its days to the API and gets
 * back every day saved to the account, from any device. The first result saved for a day wins,
 * on the server and here. Signed-out readers never call the API.
 */
import { accountApi, apiBase, hasSignInHint } from './account';
import type { WordResult } from './account';

/** Days from both sides: the account's saved days win, and days only this browser has stay. */
export function combineResults(
  local: readonly WordResult[],
  account: readonly WordResult[],
): WordResult[] {
  const byDay = new Map<string, WordResult>();
  for (const result of local) byDay.set(result.day, result);
  for (const result of account) byDay.set(result.day, result);
  return [...byDay.values()].sort((a, b) => (a.day < b.day ? -1 : a.day > b.day ? 1 : 0));
}

/** Whether two result lists hold the same days with the same results. */
export function sameResults(a: readonly WordResult[], b: readonly WordResult[]): boolean {
  if (a.length !== b.length) return false;
  const byDay = new Map(a.map((r) => [r.day, r]));
  return b.every((r) => {
    const other = byDay.get(r.day);
    return other?.tries === r.tries && other.solved === r.solved;
  });
}

export interface SyncOptions {
  readonly base?: string | undefined;
  readonly cookie?: string;
  readonly fetcher?: typeof fetch;
}

/**
 * Sends this browser's days and returns the combined list, or undefined when the reader is not
 * signed in, accounts are off, or the API can't be reached (the game carries on locally).
 */
export async function syncWordResults(
  lang: 'en' | 'tr',
  local: readonly WordResult[],
  options: SyncOptions = {},
): Promise<WordResult[] | undefined> {
  const base = 'base' in options ? options.base : apiBase();
  const cookie = options.cookie ?? document.cookie;
  if (!base || !hasSignInHint(cookie)) return undefined;
  try {
    const api = accountApi(base, options.fetcher);
    // The API takes at most 400 days at once; send the latest.
    const { results } = await api.syncGame(lang, local.slice(-400));
    return combineResults(local, results);
  } catch {
    // Offline, signed out elsewhere, or the API is down: the browser's copy still stands.
    return undefined;
  }
}
