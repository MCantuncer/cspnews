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

For Google sign-in locally, put the client secret in `apps/api/.dev.vars` (ignored by git):

```sh
GOOGLE_CLIENT_SECRET=...
```

and the client id in `GOOGLE_CLIENT_ID` in `wrangler.jsonc`.

## Google sign-in client (once)

1. Open [Google Cloud console](https://console.cloud.google.com/), create a project named `CSPNews`.
2. Open **Google Auth Platform**. Under **Branding**, set the app name `CSPNews`, a support email, and the site's domain as an authorized domain.
3. Under **Audience**, choose **External**, then **Publish app**. With the `openid` scope only, Google needs no verification.
4. Under **Clients**, create a **Web application** client with these **Authorized redirect URIs**:
   - `http://localhost:8787/auth/google/callback`
   - `https://api.<domain>/auth/google/callback`
5. Copy the **Client ID** into `GOOGLE_CLIENT_ID` in `wrangler.jsonc`. Set the secret with `pnpm --filter @cspnews/api exec wrangler secret put GOOGLE_CLIENT_SECRET`. Never commit it.

## First deploy (once)

1. `pnpm --filter @cspnews/api exec wrangler login`
2. `pnpm --filter @cspnews/api exec wrangler d1 create cspnews-accounts --location weur`, then copy the printed `database_id` into `wrangler.jsonc`.
3. In `wrangler.jsonc`, set `ALLOWED_ORIGINS` to the site's address (for example `https://example.com,https://www.example.com`), `SITE_URL` to the main address (`https://example.com`), `COOKIE_DOMAIN` to the domain (`example.com`) and `PASSKEY_RP_ID` to the domain too (`example.com`), so passkeys work on every subdomain.
4. `pnpm --filter @cspnews/api db:migrate:remote`, then `pnpm --filter @cspnews/api deploy`.
5. In the Cloudflare dashboard, add the custom domain `api.<domain>` to the `cspnews-api` Worker.

Everything here fits Cloudflare's free tier.
