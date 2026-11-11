/**
 * The accounts API. Small on purpose: the site is static, and the browser calls this only for a
 * reader who has signed in.
 *
 *   GET    /health         is the Worker up
 *   GET    /me             the signed-in reader's profile
 *   PATCH  /me             change name, avatar or settings
 *   GET    /me/export      everything stored, as one JSON file
 *   DELETE /me             delete the account and every row
 *   POST   /auth/signout   sign out here, or everywhere with {"everywhere": true}
 *   GET    /auth/google    sign in with Google (auth-google.ts)
 *   POST   /auth/passkey/* make an account or sign in with a passkey (auth-passkey.ts)
 *   GET    /me/passkeys    your passkeys; DELETE /me/passkeys/:id removes one
 *   GET    /me/game/:lang  word game results; POST saves new days (game.ts)
 */
import { ProfilePatchSchema, profileToJson } from '@cspnews/accounts';
import { Hono } from 'hono';
import type { MiddlewareHandler } from 'hono';
import { cors } from 'hono/cors';
import { z } from 'zod';

import { googleRoutes } from './auth-google.js';
import { passkeyAccountRoutes, passkeyRoutes } from './auth-passkey.js';
import { gameRoutes } from './game.js';
import { clearSignInCookies, readSessionCookie, setSignInCookies } from './cookies.js';
import { allowedOrigins } from './env.js';
import type { Env } from './env.js';
import { createGoogleSignIn } from './google.js';
import type { GoogleSignIn } from './google.js';
import { createPasskeyCeremonies } from './passkeys.js';
import type { PasskeyCeremonies } from './passkeys.js';
import {
  deleteAccount,
  deleteAllSessions,
  deleteSession,
  exportAccount,
  findSession,
  getProfile,
  refreshSession,
  updateProfile,
} from './store.js';
import type { Session } from './store.js';

export interface App {
  Bindings: Env;
  Variables: { session: Session };
}

const SignOutSchema = z.object({ everywhere: z.boolean().optional() }).strict();

export interface AppOptions {
  /** The current time. Tests pass a fixed clock. */
  readonly clock?: () => Date;
  /** How to talk to Google. Tests pass a fake. */
  readonly google?: (env: Env) => GoogleSignIn;
  /** How to check passkeys. Tests pass a fake. */
  readonly passkeys?: (env: Env) => PasskeyCeremonies;
}

export function createApp({
  clock = () => new Date(),
  google = (env) =>
    createGoogleSignIn({ clientId: env.GOOGLE_CLIENT_ID, clientSecret: env.GOOGLE_CLIENT_SECRET }),
  passkeys = (env) =>
    createPasskeyCeremonies({ rpId: env.PASSKEY_RP_ID, origins: allowedOrigins(env) }),
}: AppOptions = {}) {
  const app = new Hono<App>();

  // Nothing here may be cached: every answer belongs to one reader.
  app.use(async (c, next) => {
    await next();
    c.header('Cache-Control', 'no-store');
  });

  app.use(
    cors({
      origin: (origin, c) => (allowedOrigins(c.env as Env).includes(origin) ? origin : null),
      credentials: true,
      allowMethods: ['GET', 'PATCH', 'POST', 'DELETE'],
      allowHeaders: ['Content-Type'],
      maxAge: 86_400,
    }),
  );

  // Requests that change something must come from our own pages. Together with SameSite cookies
  // and JSON-only bodies, this keeps other sites from acting for a signed-in reader.
  app.use(async (c, next) => {
    if (!['GET', 'HEAD', 'OPTIONS'].includes(c.req.method)) {
      const origin = c.req.header('Origin');
      if (!origin || !allowedOrigins(c.env).includes(origin)) {
        return c.json({ error: 'This request must come from the CSPNews site.' }, 403);
      }
    }
    await next();
  });

  app.get('/health', (c) => c.json({ ok: true }));

  app.route(
    '/',
    googleRoutes((c) => google(c.env), clock),
  );
  app.route(
    '/',
    passkeyRoutes((c) => passkeys(c.env), clock),
  );

  const signedIn = new Hono<App>();

  // Routes below need a sign-in. Listed by path, so unknown paths still answer 404.
  const requireSession: MiddlewareHandler<App> = async (c, next) => {
    const token = readSessionCookie(c);
    const session = token ? await findSession(c.env.DB, token, clock()) : null;
    if (!session || !token) {
      clearSignInCookies(c);
      return c.json({ error: 'Not signed in.' }, 401);
    }
    if (session.needsRefresh) {
      setSignInCookies(c, token, await refreshSession(c.env.DB, session.tokenHash, clock()));
    }
    c.set('session', session);
    await next();
  };
  signedIn.use('/me', requireSession);
  signedIn.use('/me/*', requireSession);
  signedIn.use('/auth/signout', requireSession);

  signedIn.get('/me', async (c) => {
    const profile = await getProfile(c.env.DB, c.get('session').accountId);
    if (!profile) return c.json({ error: 'Not signed in.' }, 401);
    return c.json(profileToJson(profile));
  });

  signedIn.patch('/me', async (c) => {
    const parsed = ProfilePatchSchema.safeParse(await readJson(c.req.raw));
    if (!parsed.success) {
      return c.json({ error: parsed.error.issues[0]?.message ?? 'Invalid change.' }, 400);
    }
    const { accountId } = c.get('session');
    await updateProfile(c.env.DB, accountId, parsed.data);
    const profile = await getProfile(c.env.DB, accountId);
    if (!profile) return c.json({ error: 'Not signed in.' }, 401);
    return c.json(profileToJson(profile));
  });

  signedIn.get('/me/export', async (c) => {
    const data = await exportAccount(c.env.DB, c.get('session').accountId);
    c.header('Content-Disposition', 'attachment; filename="cspnews-account.json"');
    return c.json({ exportedAt: clock().toISOString(), ...data });
  });

  signedIn.delete('/me', async (c) => {
    await deleteAccount(c.env.DB, c.get('session').accountId);
    clearSignInCookies(c);
    return c.body(null, 204);
  });

  signedIn.post('/auth/signout', async (c) => {
    const parsed = SignOutSchema.safeParse((await readJson(c.req.raw)) ?? {});
    if (!parsed.success) return c.json({ error: 'Invalid request.' }, 400);
    const { accountId, tokenHash } = c.get('session');
    if (parsed.data.everywhere) await deleteAllSessions(c.env.DB, accountId);
    else await deleteSession(c.env.DB, tokenHash);
    clearSignInCookies(c);
    return c.body(null, 204);
  });

  signedIn.route('/', passkeyAccountRoutes());
  signedIn.route('/', gameRoutes(clock));
  app.route('/', signedIn);
  app.notFound((c) => c.json({ error: 'Not found.' }, 404));

  return app;
}

/** The JSON body, or undefined when there is none or it isn't JSON. */
async function readJson(request: Request): Promise<unknown> {
  const text = await request.text();
  if (text === '') return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}
