# @cspnews/accounts

Reader accounts, kept to the minimum: a random id, the ways it signs in (a Google account number or passkeys), an optional name only the reader sees, an avatar and settings. No email, no password.

| File         | What it holds                                                                       |
| ------------ | ----------------------------------------------------------------------------------- |
| `avatar.ts`  | The Stations avatars: 16 designs on 6 grounds, or an initial, drawn as one SVG      |
| `account.ts` | Names, profile changes, account ids and sign-in tokens (only token hashes are kept) |
| `game.ts`    | Word game results per day and language, and how a browser's history merges in       |

Pure logic with no I/O, so the same code runs in the browser and in the API. The API, database and sign-in flows build on it in later steps.
