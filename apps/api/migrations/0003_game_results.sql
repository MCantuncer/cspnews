-- Word game results kept with an account: one row per finished day and language.
-- A saved day never changes; the first result sent for a day wins.
CREATE TABLE game_results (
  account_id TEXT NOT NULL REFERENCES accounts (id) ON DELETE CASCADE,
  lang TEXT NOT NULL CHECK (lang IN ('en', 'tr')),
  day TEXT NOT NULL,
  tries INTEGER NOT NULL CHECK (tries BETWEEN 1 AND 6),
  solved INTEGER NOT NULL CHECK (solved IN (0, 1)),
  saved_at TEXT NOT NULL,
  PRIMARY KEY (account_id, lang, day)
) WITHOUT ROWID;
