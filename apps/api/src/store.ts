/**
 * Every database read and write for accounts. Routes call these; nothing else writes SQL.
 */
import {
  hashSessionToken,
  newAccountId,
  newSessionToken,
  parseAvatar,
  randomAvatar,
  formatAvatar,
  sessionExpiry,
} from '@cspnews/accounts';
import type {
  InterfaceLanguage,
  ProfilePatch,
  ReaderProfile,
  SignInMethod,
  Theme,
} from '@cspnews/accounts';

import type { D1Database } from './d1.js';

/** A sign-in is refreshed at most once a day, so reading pages costs no database writes. */
const REFRESH_AFTER_MS = 24 * 60 * 60 * 1000;

interface AccountRow {
  id: string;
  name: string | null;
  avatar: string;
  lang: InterfaceLanguage;
  theme: Theme;
  created_at: string;
}

interface SessionRow {
  token_hash: string;
  account_id: string;
  refreshed_at: string;
  expires_at: string;
}

export interface Session {
  readonly tokenHash: string;
  readonly accountId: string;
  readonly expiresAt: Date;
  /** True when the expiry should move out again on this request. */
  readonly needsRefresh: boolean;
}

/** Creates an account with a random avatar. Returns its id. */
export async function createAccount(db: D1Database, now: Date): Promise<string> {
  const id = newAccountId();
  await db
    .prepare('INSERT INTO accounts (id, avatar, created_at) VALUES (?, ?, ?)')
    .bind(id, formatAvatar(randomAvatar()), now.toISOString())
    .run();
  return id;
}

/** Starts a sign-in for an account. Returns the token for the cookie; only its hash is stored. */
export async function createSession(
  db: D1Database,
  accountId: string,
  now: Date,
): Promise<{ token: string; expiresAt: Date }> {
  const token = newSessionToken();
  const expiresAt = sessionExpiry(now);
  await db
    .prepare(
      'INSERT INTO sessions (token_hash, account_id, created_at, refreshed_at, expires_at) VALUES (?, ?, ?, ?, ?)',
    )
    .bind(
      await hashSessionToken(token),
      accountId,
      now.toISOString(),
      now.toISOString(),
      expiresAt.toISOString(),
    )
    .run();
  return { token, expiresAt };
}

/** The sign-in a cookie token belongs to, or null when it is unknown or has expired. */
export async function findSession(
  db: D1Database,
  token: string,
  now: Date,
): Promise<Session | null> {
  const tokenHash = await hashSessionToken(token);
  const row = await db
    .prepare(
      'SELECT token_hash, account_id, refreshed_at, expires_at FROM sessions WHERE token_hash = ?',
    )
    .bind(tokenHash)
    .first<SessionRow>();
  if (!row) return null;

  const expiresAt = new Date(row.expires_at);
  if (expiresAt <= now) {
    await deleteSession(db, tokenHash);
    return null;
  }
  return {
    tokenHash,
    accountId: row.account_id,
    expiresAt,
    needsRefresh: now.getTime() - new Date(row.refreshed_at).getTime() >= REFRESH_AFTER_MS,
  };
}

/** Moves a sign-in's expiry out again. Returns the new expiry. */
export async function refreshSession(db: D1Database, tokenHash: string, now: Date): Promise<Date> {
  const expiresAt = sessionExpiry(now);
  await db
    .prepare('UPDATE sessions SET refreshed_at = ?, expires_at = ? WHERE token_hash = ?')
    .bind(now.toISOString(), expiresAt.toISOString(), tokenHash)
    .run();
  return expiresAt;
}

export async function deleteSession(db: D1Database, tokenHash: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE token_hash = ?').bind(tokenHash).run();
}

/** Signs an account out on every device. */
export async function deleteAllSessions(db: D1Database, accountId: string): Promise<void> {
  await db.prepare('DELETE FROM sessions WHERE account_id = ?').bind(accountId).run();
}

export async function getProfile(db: D1Database, accountId: string): Promise<ReaderProfile | null> {
  const row = await db
    .prepare('SELECT id, name, avatar, lang, theme, created_at FROM accounts WHERE id = ?')
    .bind(accountId)
    .first<AccountRow>();
  if (!row) return null;

  const methods = await db
    .prepare('SELECT DISTINCT provider FROM identities WHERE account_id = ? ORDER BY provider')
    .bind(accountId)
    .all<{ provider: SignInMethod }>();

  return {
    id: row.id,
    name: row.name,
    // A stored code always parses; fall back to a fresh avatar rather than fail if one ever doesn't.
    avatar: parseAvatar(row.avatar) ?? randomAvatar(),
    settings: { lang: row.lang, theme: row.theme },
    signInMethods: methods.results.map((method) => method.provider),
  };
}

/** Applies a change from the account page. Fields left out stay as they are. */
export async function updateProfile(
  db: D1Database,
  accountId: string,
  patch: ProfilePatch,
): Promise<void> {
  const sets: string[] = [];
  const values: unknown[] = [];
  if (patch.name !== undefined) {
    sets.push('name = ?');
    values.push(patch.name);
  }
  if (patch.avatar !== undefined) {
    sets.push('avatar = ?');
    values.push(formatAvatar(patch.avatar));
  }
  if (patch.settings?.lang !== undefined) {
    sets.push('lang = ?');
    values.push(patch.settings.lang);
  }
  if (patch.settings?.theme !== undefined) {
    sets.push('theme = ?');
    values.push(patch.settings.theme);
  }
  if (sets.length === 0) return;

  await db
    .prepare(`UPDATE accounts SET ${sets.join(', ')} WHERE id = ?`)
    .bind(...values, accountId)
    .run();
}

/** Everything stored about an account, for "Download my data". */
export async function exportAccount(db: D1Database, accountId: string) {
  const account = await db.prepare('SELECT * FROM accounts WHERE id = ?').bind(accountId).first();
  if (!account) return null;
  const identities = await db
    .prepare('SELECT provider, subject, created_at FROM identities WHERE account_id = ?')
    .bind(accountId)
    .all();
  const sessions = await db
    .prepare('SELECT created_at, refreshed_at, expires_at FROM sessions WHERE account_id = ?')
    .bind(accountId)
    .all();
  return { account, identities: identities.results, sessions: sessions.results };
}

/** Deletes an account and every row that belongs to it, in one transaction. */
export async function deleteAccount(db: D1Database, accountId: string): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE account_id = ?').bind(accountId),
    db.prepare('DELETE FROM identities WHERE account_id = ?').bind(accountId),
    db.prepare('DELETE FROM accounts WHERE id = ?').bind(accountId),
  ]);
}
