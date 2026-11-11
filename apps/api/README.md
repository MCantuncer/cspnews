# @cspnews/api

The accounts API: a Cloudflare Worker with a D1 (SQLite) database, served on `api.` under the site's domain. The site itself stays static on Vercel. Readers who never signed in never call this API: the site calls `/me` only when the `cspn_signed_in` hint cookie is there.

| Path             | What lives there                                               |
| ---------------- | -------------------------------------------------------------- |
| `src/app.ts`     | Routes, CORS and the same-site check                           |
| `src/store.ts`   | Every database read and write                                  |
| `src/cookies.ts` | The HttpOnly sign-in cookie and the readable hint cookie       |
| `migrations/`    | The schema, as numbered SQL files                              |
| `src/testing/`   | An in-memory SQLite stand-in for D1, so tests run the real SQL |

Rules and data shapes live in [`@cspnews/accounts`](../../packages/accounts). Privacy: no email, no password, no IP addresses, and only the SHA-256 hash of a sign-in token is stored.

## Local development

```sh
pnpm --filter @cspnews/api... build    # builds the packages the Worker imports
pnpm --filter @cspnews/api db:migrate:local
pnpm --filter @cspnews/api dev         # http://localhost:8787
```

## First deploy (once)

1. `pnpm --filter @cspnews/api exec wrangler login`
2. `pnpm --filter @cspnews/api exec wrangler d1 create cspnews-accounts --location weur`, then copy the printed `database_id` into `wrangler.jsonc`.
3. In `wrangler.jsonc`, set `ALLOWED_ORIGINS` to the site's address (for example `https://example.com,https://www.example.com`) and `COOKIE_DOMAIN` to the domain (`example.com`).
4. `pnpm --filter @cspnews/api db:migrate:remote`, then `pnpm --filter @cspnews/api deploy`.
5. In the Cloudflare dashboard, add the custom domain `api.<domain>` to the `cspnews-api` Worker.

Everything here fits Cloudflare's free tier.
