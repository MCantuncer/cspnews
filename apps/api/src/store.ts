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
import type { StoredPasskey } from './passkeys.js';

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

/** The account a Google (or later, other) sign-in belongs to, if any. */
export async function findAccountByIdentity(
  db: D1Database,
  provider: 'google',
  subject: string,
): Promise<string | null> {
  const row = await db
    .prepare('SELECT account_id FROM identities WHERE provider = ? AND subject = ?')
    .bind(provider, subject)
    .first<{ account_id: string }>();
  return row?.account_id ?? null;
}

/** Lets an existing account also sign in with Google. */
export async function linkIdentity(
  db: D1Database,
  accountId: string,
  provider: 'google',
  subject: string,
  now: Date,
): Promise<void> {
  await db
    .prepare(
      'INSERT INTO identities (provider, subject, account_id, created_at) VALUES (?, ?, ?, ?)',
    )
    .bind(provider, subject, accountId, now.toISOString())
    .run();
}

/** Creates an account that signs in with Google, in one transaction. Returns its id. */
export async function createAccountWithIdentity(
  db: D1Database,
  provider: 'google',
  subject: string,
  now: Date,
): Promise<string> {
  const id = newAccountId();
  await db.batch([
    db
      .prepare('INSERT INTO accounts (id, avatar, created_at) VALUES (?, ?, ?)')
      .bind(id, formatAvatar(randomAvatar()), now.toISOString()),
    db
      .prepare(
        'INSERT INTO identities (provider, subject, account_id, created_at) VALUES (?, ?, ?, ?)',
      )
      .bind(provider, subject, id, now.toISOString()),
  ]);
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
    .prepare(
      `SELECT DISTINCT provider AS method FROM identities WHERE account_id = ?1
       UNION SELECT 'passkey' FROM passkeys WHERE account_id = ?1
       ORDER BY method`,
    )
    .bind(accountId)
    .all<{ method: SignInMethod }>();

  return {
    id: row.id,
    name: row.name,
    // A stored code always parses; fall back to a fresh avatar rather than fail if one ever doesn't.
    avatar: parseAvatar(row.avatar) ?? randomAvatar(),
    settings: { lang: row.lang, theme: row.theme },
    signInMethods: methods.results.map((row) => row.method),
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
  const passkeys = await db
    .prepare('SELECT id, backed_up, created_at, last_used_at FROM passkeys WHERE account_id = ?')
    .bind(accountId)
    .all();
  return {
    account,
    identities: identities.results,
    passkeys: passkeys.results,
    sessions: sessions.results,
  };
}

/** Deletes an account and every row that belongs to it, in one transaction. */
export async function deleteAccount(db: D1Database, accountId: string): Promise<void> {
  await db.batch([
    db.prepare('DELETE FROM sessions WHERE account_id = ?').bind(accountId),
    db.prepare('DELETE FROM identities WHERE account_id = ?').bind(accountId),
    db.prepare('DELETE FROM passkeys WHERE account_id = ?').bind(accountId),
    db.prepare('DELETE FROM passkey_challenges WHERE account_id = ?').bind(accountId),
    db.prepare('DELETE FROM accounts WHERE id = ?').bind(accountId),
  ]);
}

interface PasskeyRow {
  id: string;
  public_key: string;
  counter: number;
  transports: string | null;
  backed_up: number;
  account_id: string;
  created_at: string;
  last_used_at: string | null;
}

function toPasskey(row: PasskeyRow): StoredPasskey {
  return {
    id: row.id,
    publicKey: row.public_key,
    counter: row.counter,
    transports: row.transports ? (JSON.parse(row.transports) as string[]) : [],
    backedUp: row.backed_up === 1,
  };
}

const insertPasskey = (db: D1Database, accountId: string, passkey: StoredPasskey, now: Date) =>
  db
    .prepare(
      'INSERT INTO passkeys (id, account_id, public_key, counter, transports, backed_up, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
    )
    .bind(
      passkey.id,
      accountId,
      passkey.publicKey,
      passkey.counter,
      JSON.stringify(passkey.transports),
      passkey.backedUp ? 1 : 0,
      now.toISOString(),
    );

/** An account's passkeys, oldest first. */
export async function listPasskeys(db: D1Database, accountId: string) {
  const rows = await db
    .prepare('SELECT * FROM passkeys WHERE account_id = ? ORDER BY created_at, id')
    .bind(accountId)
    .all<PasskeyRow>();
  return rows.results.map((row) => ({
    ...toPasskey(row),
    createdAt: row.created_at,
    lastUsedAt: row.last_used_at,
  }));
}

/** A passkey by its credential id, with the account it belongs to. */
export async function findPasskey(
  db: D1Database,
  id: string,
): Promise<{ accountId: string; passkey: StoredPasskey } | null> {
  const row = await db.prepare('SELECT * FROM passkeys WHERE id = ?').bind(id).first<PasskeyRow>();
  return row ? { accountId: row.account_id, passkey: toPasskey(row) } : null;
}

export async function addPasskey(
  db: D1Database,
  accountId: string,
  passkey: StoredPasskey,
  now: Date,
) {
  await insertPasskey(db, accountId, passkey, now).run();
}

/** Creates an account that signs in with a passkey, in one transaction. */
export async function createAccountWithPasskey(
  db: D1Database,
  accountId: string,
  passkey: StoredPasskey,
  now: Date,
): Promise<void> {
  await db.batch([
    db
      .prepare('INSERT INTO accounts (id, avatar, created_at) VALUES (?, ?, ?)')
      .bind(accountId, formatAvatar(randomAvatar()), now.toISOString()),
    insertPasskey(db, accountId, passkey, now),
  ]);
}

/** Records a sign-in with a passkey: its new counter and when it was used. */
export async function touchPasskey(
  db: D1Database,
  id: string,
  counter: number,
  now: Date,
): Promise<void> {
  await db
    .prepare('UPDATE passkeys SET counter = ?, last_used_at = ? WHERE id = ?')
    .bind(counter, now.toISOString(), id)
    .run();
}

/** How many ways an account can sign in: Google accounts plus passkeys. */
export async function countSignInWays(db: D1Database, accountId: string): Promise<number> {
  const row = await db
    .prepare(
      `SELECT (SELECT count(*) FROM identities WHERE account_id = ?1)
            + (SELECT count(*) FROM passkeys WHERE account_id = ?1) AS n`,
    )
    .bind(accountId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Removes one of an account's passkeys. Returns false when the account has no such passkey. */
export async function deletePasskey(
  db: D1Database,
  accountId: string,
  id: string,
): Promise<boolean> {
  const result = await db
    .prepare('DELETE FROM passkeys WHERE id = ? AND account_id = ?')
    .bind(id, accountId)
    .run();
  return (result.meta.changes ?? 0) > 0;
}

/** How long a passkey challenge can be answered. */
export const CHALLENGE_SECONDS = 300;

/** A passkey ceremony in progress: the challenge we handed out, and for whom. */
export interface PendingCeremony {
  readonly purpose: 'register' | 'login';
  readonly challenge: string;
  /** For registration: the account the passkey will belong to (new or signed in). */
  readonly accountId: string | null;
  /** For registration: true when adding to the signed-in account, false for a new account. */
  readonly existing: boolean;
}

/** Records an open challenge, and clears out any that have expired. */
export async function saveChallenge(
  db: D1Database,
  ceremony: PendingCeremony,
  now: Date,
): Promise<void> {
  const expiresAt = new Date(now.getTime() + CHALLENGE_SECONDS * 1000).toISOString();
  await db.batch([
    db.prepare('DELETE FROM passkey_challenges WHERE expires_at <= ?').bind(now.toISOString()),
    db
      .prepare(
        'INSERT INTO passkey_challenges (challenge, purpose, account_id, existing, expires_at) VALUES (?, ?, ?, ?, ?)',
      )
      .bind(
        ceremony.challenge,
        ceremony.purpose,
        ceremony.accountId,
        ceremony.existing ? 1 : 0,
        expiresAt,
      ),
  ]);
}

/**
 * Uses up an open challenge: it is deleted as it is read, so each can be answered once. Returns
 * null when it is unknown, already used, expired, or for another purpose.
 */
export async function takeChallenge(
  db: D1Database,
  challenge: string,
  purpose: PendingCeremony['purpose'],
  now: Date,
): Promise<PendingCeremony | null> {
  const row = await db
    .prepare(
      'DELETE FROM passkey_challenges WHERE challenge = ? RETURNING purpose, account_id, existing, expires_at',
    )
    .bind(challenge)
    .first<{ purpose: string; account_id: string | null; existing: number; expires_at: string }>();
  if (row?.purpose !== purpose || new Date(row.expires_at) <= now) return null;
  return { purpose, challenge, accountId: row.account_id, existing: row.existing === 1 };
}
