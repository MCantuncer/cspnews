import { SignJWT, createLocalJWKSet, exportJWK, generateKeyPair } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';

import { createGoogleSignIn, newPendingSignIn, safeReturnPath } from './google.js';
import type { GoogleSignIn, PendingSignIn } from './google.js';

const CONFIG = { clientId: 'client-id.apps.googleusercontent.com', clientSecret: 'shh' };
const REDIRECT = 'https://api.cspnews.example/auth/google/callback';

let privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];
let keys: ReturnType<typeof createLocalJWKSet>;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  keys = createLocalJWKSet({
    keys: [{ ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256' }],
  });
});

/** An ID token as Google would sign it, with any claim overridden. */
function idToken(claims: Record<string, unknown> = {}, pending: PendingSignIn) {
  return new SignJWT({ nonce: pending.nonce, ...claims })
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer((claims.iss as string | undefined) ?? 'https://accounts.google.com')
    .setAudience((claims.aud as string | undefined) ?? CONFIG.clientId)
    .setSubject((claims.sub as string | undefined) ?? '1234567890')
    .setIssuedAt()
    .setExpirationTime('5m')
    .sign(privateKey);
}

/** A Google whose token endpoint answers with `token`, recording what it was sent. */
function googleAnswering(token: string | Promise<string>, status = 200) {
  const sent: URLSearchParams[] = [];
  const fetchFn: typeof fetch = async (_url, init) => {
    sent.push(new URLSearchParams(init?.body as URLSearchParams));
    return new Response(JSON.stringify({ id_token: await token }), { status });
  };
  return { google: createGoogleSignIn(CONFIG, fetchFn, keys), sent };
}

describe('authorizationUrl', () => {
  it('asks for openid only, with PKCE, state and nonce', async () => {
    const pending = newPendingSignIn('/');
    const { google } = googleAnswering('');
    const url = new URL(await google.authorizationUrl(pending, REDIRECT));
    expect(url.origin + url.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(url.searchParams.get('scope')).toBe('openid');
    expect(url.searchParams.get('state')).toBe(pending.state);
    expect(url.searchParams.get('nonce')).toBe(pending.nonce);
    expect(url.searchParams.get('code_challenge_method')).toBe('S256');
    expect(url.searchParams.get('code_challenge')).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(url.searchParams.get('code_challenge')).not.toBe(pending.verifier);
    expect(url.searchParams.get('redirect_uri')).toBe(REDIRECT);
  });
});

describe('verify', () => {
  it("returns Google's account number from a valid token", async () => {
    const pending = newPendingSignIn('/');
    const { google, sent } = googleAnswering(idToken({}, pending));
    expect(await google.verify('the-code', pending, REDIRECT)).toBe('1234567890');
    expect(sent[0]?.get('code_verifier')).toBe(pending.verifier);
    expect(sent[0]?.get('grant_type')).toBe('authorization_code');
  });

  const refuse = async (google: GoogleSignIn, pending: PendingSignIn) =>
    expect(google.verify('the-code', pending, REDIRECT)).rejects.toThrow();

  it('refuses a token for another app', async () => {
    const pending = newPendingSignIn('/');
    await refuse(googleAnswering(idToken({ aud: 'someone-else' }, pending)).google, pending);
  });

  it('refuses a token from another issuer', async () => {
    const pending = newPendingSignIn('/');
    await refuse(
      googleAnswering(idToken({ iss: 'https://evil.example' }, pending)).google,
      pending,
    );
  });

  it('refuses a token from another sign-in attempt', async () => {
    const pending = newPendingSignIn('/');
    await refuse(googleAnswering(idToken({ nonce: 'other' }, pending)).google, pending);
  });

  it('refuses a token signed by someone else', async () => {
    const pending = newPendingSignIn('/');
    const stranger = await generateKeyPair('RS256');
    const forged = new SignJWT({ nonce: pending.nonce })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer('https://accounts.google.com')
      .setAudience(CONFIG.clientId)
      .setSubject('1')
      .setExpirationTime('5m')
      .sign(stranger.privateKey);
    await refuse(googleAnswering(forged).google, pending);
  });

  it('fails when Google refuses the code', async () => {
    const pending = newPendingSignIn('/');
    await refuse(googleAnswering('', 400).google, pending);
  });
});

describe('safeReturnPath', () => {
  it('keeps paths on our own site', () => {
    expect(safeReturnPath('/2026-11-11/evening/rate-decision')).toBe(
      '/2026-11-11/evening/rate-decision',
    );
    expect(safeReturnPath('/word?lang=tr')).toBe('/word?lang=tr');
  });

  it('turns anything else into the home page', () => {
    for (const input of [
      undefined,
      '',
      'https://evil.example',
      '//evil.example',
      '/\\evil.example',
      'javascript:alert(1)',
      '/ok\nSet-Cookie: x',
      `/${'a'.repeat(600)}`,
    ]) {
      expect(safeReturnPath(input), String(input)).toBe('/');
    }
  });
});
