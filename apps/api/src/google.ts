/**
 * Sign in with Google: OpenID Connect, authorization code flow with PKCE.
 *
 * We ask for the `openid` scope only, so Google tells us one thing: a stable account number
 * (`sub`). No email, no name, no photo.
 */
import { createRemoteJWKSet, jwtVerify } from 'jose';
import type { JWTVerifyGetKey } from 'jose';
import { z } from 'zod';

const AUTHORIZE_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const JWKS_URL = 'https://www.googleapis.com/oauth2/v3/certs';
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

/** What we keep between sending the reader to Google and their return, in a short-lived cookie. */
export interface PendingSignIn {
  readonly state: string;
  readonly verifier: string;
  readonly nonce: string;
  /** The site path to return to. */
  readonly returnTo: string;
}

export const PendingSignInSchema = z
  .object({
    state: z.string().min(16),
    verifier: z.string().min(43),
    nonce: z.string().min(16),
    returnTo: z.string(),
  })
  .strict();

/** The parts of Google sign-in that talk to Google, so tests can stand in a fake. */
export interface GoogleSignIn {
  /** Google's sign-in page for this attempt. */
  authorizationUrl(pending: PendingSignIn, redirectUri: string): Promise<string>;
  /** Swaps the code for an ID token, checks it, and returns the reader's Google account number. */
  verify(code: string, pending: PendingSignIn, redirectUri: string): Promise<string>;
}

export interface GoogleConfig {
  readonly clientId: string;
  readonly clientSecret: string;
}

const TokenResponseSchema = z.object({ id_token: z.string() });

let googleKeys: JWTVerifyGetKey | undefined;

export function createGoogleSignIn(
  config: GoogleConfig,
  fetchFn: typeof fetch = fetch,
  keys: JWTVerifyGetKey = (googleKeys ??= createRemoteJWKSet(new URL(JWKS_URL))),
): GoogleSignIn {
  return {
    async authorizationUrl(pending, redirectUri) {
      const url = new URL(AUTHORIZE_URL);
      url.search = new URLSearchParams({
        client_id: config.clientId,
        redirect_uri: redirectUri,
        response_type: 'code',
        scope: 'openid',
        state: pending.state,
        nonce: pending.nonce,
        code_challenge: await pkceChallenge(pending.verifier),
        code_challenge_method: 'S256',
        prompt: 'select_account',
      }).toString();
      return url.toString();
    },

    async verify(code, pending, redirectUri) {
      const response = await fetchFn(TOKEN_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          code_verifier: pending.verifier,
          client_id: config.clientId,
          client_secret: config.clientSecret,
          redirect_uri: redirectUri,
        }),
      });
      if (!response.ok)
        throw new GoogleSignInError(`Google refused the code (${String(response.status)}).`);
      const { id_token: idToken } = TokenResponseSchema.parse(await response.json());

      const { payload } = await jwtVerify(idToken, keys, {
        issuer: ISSUERS,
        audience: config.clientId,
      });
      if (payload.nonce !== pending.nonce)
        throw new GoogleSignInError('The sign-in did not match this attempt.');
      if (typeof payload.sub !== 'string' || payload.sub === '') {
        throw new GoogleSignInError('Google sent no account number.');
      }
      return payload.sub;
    },
  };
}

export class GoogleSignInError extends Error {
  override readonly name = 'GoogleSignInError';
}

/** A fresh attempt: random state, PKCE verifier and nonce. */
export function newPendingSignIn(returnTo: string): PendingSignIn {
  return { state: randomToken(), verifier: randomToken(), nonce: randomToken(), returnTo };
}

/**
 * A safe place on our own site to return to: a path that starts with one `/`. Anything else
 * (another site, `//evil.example`, `/\evil.example`) becomes the home page.
 */
export function safeReturnPath(input: string | undefined): string {
  if (!input || input.length > 512) return '/';
  if (!input.startsWith('/') || input.startsWith('//') || input.startsWith('/\\')) return '/';
  if (input.includes('\\') || hasControlCharacter(input)) return '/';
  return input;
}

function hasControlCharacter(text: string): boolean {
  for (let i = 0; i < text.length; i++)
    if (text.charCodeAt(i) < 0x20 || text.charCodeAt(i) === 0x7f) return true;
  return false;
}

async function pkceChallenge(verifier: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier));
  return base64url(new Uint8Array(digest));
}

function randomToken(): string {
  return base64url(crypto.getRandomValues(new Uint8Array(32)));
}

function base64url(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}
