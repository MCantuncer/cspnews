-- Reader accounts: the least we can keep (docs/product/user-stories.md, US-18).
-- No email, no password, no IP addresses.

CREATE TABLE accounts (
  id         TEXT PRIMARY KEY,           -- random, carries no meaning
  name       TEXT,                       -- optional, only the reader sees it
  avatar     TEXT NOT NULL,              -- an avatar code, such as station:junction:dusk
  lang       TEXT NOT NULL DEFAULT 'en' CHECK (lang IN ('en', 'tr')),
  theme      TEXT NOT NULL DEFAULT 'dark' CHECK (theme IN ('dark', 'light')),
  created_at TEXT NOT NULL               -- ISO 8601, UTC
);

-- How an account signs in from outside: for Google, the account number Google gives us (`sub`).
CREATE TABLE identities (
  provider   TEXT NOT NULL CHECK (provider IN ('google')),
  subject    TEXT NOT NULL,
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL,
  PRIMARY KEY (provider, subject)
);

CREATE INDEX identities_by_account ON identities (account_id);

-- Sign-ins. Only the SHA-256 hash of the cookie token is stored.
CREATE TABLE sessions (
  token_hash   TEXT PRIMARY KEY,
  account_id   TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  created_at   TEXT NOT NULL,
  refreshed_at TEXT NOT NULL,
  expires_at   TEXT NOT NULL
);

CREATE INDEX sessions_by_account ON sessions (account_id);
