/**
 * Word game results kept with an account, so the streak follows the reader to every device.
 *
 *   GET  /me/game/:lang   the saved days in that language
 *   POST /me/game/:lang   { results: [...] } saves new days, then answers with every saved day
 *
 * The browser sends its days when the game page opens and again when a day is finished, so one
 * route both imports a browser's history and saves a single day. A saved day never changes: the
 * first result sent for it wins. Days that haven't started in Istanbul, or came before the game
 * opened, are refused.
 */
import { GAME_LANGUAGES, GameImportSchema, mergeResults, rejectReason } from '@cspnews/accounts';
import type { GameLanguage } from '@cspnews/accounts';
import { FIRST_DAY } from '@cspnews/wordgame';
import { Hono } from 'hono';

import type { App } from './app.js';
import { addGameResults, listGameResults } from './store.js';

function gameLanguage(value: string): GameLanguage | undefined {
  return (GAME_LANGUAGES as readonly string[]).includes(value)
    ? (value as GameLanguage)
    : undefined;
}

export function gameRoutes(clock: () => Date) {
  const routes = new Hono<App>();

  routes.get('/me/game/:lang', async (c) => {
    const lang = gameLanguage(c.req.param('lang'));
    if (!lang) return c.json({ error: 'Unknown language.' }, 404);
    const results = await listGameResults(c.env.DB, c.get('session').accountId, lang);
    return c.json({ results });
  });

  routes.post('/me/game/:lang', async (c) => {
    const lang = gameLanguage(c.req.param('lang'));
    if (!lang) return c.json({ error: 'Unknown language.' }, 404);
    const parsed = GameImportSchema.safeParse(await readJson(c.req.raw));
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid results.' }, 400);
    }
    const now = clock();
    const { accountId } = c.get('session');
    const valid = parsed.data.results.filter(
      (result) => rejectReason(result, now, FIRST_DAY[lang]) === undefined,
    );
    const saved = await listGameResults(c.env.DB, accountId, lang);
    const { added, conflicts } = mergeResults(saved, valid);
    await addGameResults(c.env.DB, accountId, lang, added, now);
    const results = await listGameResults(c.env.DB, accountId, lang);
    return c.json({
      results,
      added: added.length,
      conflicts,
      refused: parsed.data.results.length - valid.length,
    });
  });

  return routes;
}

async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    return undefined;
  }
}
