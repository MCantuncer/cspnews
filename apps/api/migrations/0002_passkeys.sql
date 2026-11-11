-- Passkeys (US-18): the public half of each passkey. The private half never leaves the reader's
-- device, so nothing here can be used to sign in.

CREATE TABLE passkeys (
  id           TEXT PRIMARY KEY,           -- the credential id, base64url
  account_id   TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  public_key   TEXT NOT NULL,              -- COSE public key, base64url
  counter      INTEGER NOT NULL DEFAULT 0, -- the authenticator's signature counter
  transports   TEXT,                       -- JSON array, as the browser reported it
  backed_up    INTEGER NOT NULL DEFAULT 0, -- synced by a passkey manager, such as iCloud Keychain
  created_at   TEXT NOT NULL,
  last_used_at TEXT
);

CREATE INDEX passkeys_by_account ON passkeys (account_id);

-- Open passkey challenges. Each one can be answered once, within five minutes; the reader's
-- browser holds the challenge in an HttpOnly cookie.
CREATE TABLE passkey_challenges (
  challenge  TEXT PRIMARY KEY,
  purpose    TEXT NOT NULL CHECK (purpose IN ('register', 'login')),
  account_id TEXT,              -- registration: the account the passkey will belong to
  existing   INTEGER NOT NULL DEFAULT 0, -- registration: 1 when adding to a signed-in account
  expires_at TEXT NOT NULL
);
