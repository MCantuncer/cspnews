# @cspnews/live

Live scores for the Tonight list and the Today line's match: a small Cloudflare Worker that reads a match's score from its source (ESPN's game summary, the Euroleague's game page) and caches each source page for 20 seconds at the edge. The site stays static; a page asks only while one of its matches is being played, and only while the reader has the tab open.

| Path            | What lives there                                |
| --------------- | ----------------------------------------------- |
| `src/index.ts`  | The `/scores` route, CORS and the edge cache    |
| `src/scores.ts` | Which refs are allowed, and reading each source |

It costs nothing on Cloudflare's free plan (100,000 requests a day), and nothing on Vercel.

## Setup (once)

1. In the Cloudflare dashboard, add the site's domain if it isn't there yet.
2. From the repository root: `pnpm install && pnpm --filter @cspnews/live... build`, then `pnpm --filter @cspnews/live exec wrangler login` and `pnpm --filter @cspnews/live run deploy` (with `run`: plain `pnpm deploy` is a pnpm command of its own).
3. Deploying connects the Worker to `live.cspnews.app` by itself (`routes` in `wrangler.jsonc`), DNS record included. The domain must be in the same Cloudflare account. If a deploy asks to register a `workers.dev` subdomain, answer yes once.
4. In Vercel's project settings, add the environment variable `PUBLIC_LIVE_SCORES_URL` = `https://live.<domain>` and redeploy once. Without it the pages simply don't ask, and every row moves on by the clock.

## Local development

```sh
pnpm --filter @cspnews/live... build
pnpm --filter @cspnews/live dev     # http://localhost:8787/scores?refs=espn:basketball/nba/401
```
