# @cspnews/wordgame

The rules of the daily word game (US-70, US-71), with no I/O. The page in `apps/web` and, later, reader accounts both use it, so a reader's streak is the same everywhere.

| File          | What it does                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| `language.ts` | The two alphabets, Turkish upper-casing (i → İ, ı → I), circumflex folding, which words can be played |
| `score.ts`    | Green, yellow and grey marks with correct repeated letters, keyboard colours, hard mode               |
| `day.ts`      | Game days in Istanbul time, the puzzle number, the day's answer, a fixed shuffle for new word lists   |
| `progress.ts` | Streak with one rest day per week, the last seven days, stats                                         |

## The word lists

`data/<language>/` holds three files, checked by the tests on every change:

- `answers.txt`: the answers in play order, one per line. Line 1 is puzzle 1, played on the language's first day (`FIRST_DAY`). The order was shuffled once with a fixed seed, so it is not alphabetical, and it is stored, so no word ever repeats.
- `guesses.txt`: every word accepted as a guess, answers included. Swear words are left out.
- `blocked.txt`: words that must never be an answer, each with its reason.

Rules for changing them:

- **Add** new answers at the end of `answers.txt` (propose them with `scripts/candidates.py`, check them by hand, shuffle the batch with `seededShuffle`).
- **Remove** an answer that has not been played yet by replacing its line with a new word, and add the old word to `blocked.txt`. A day that has been played never changes its word.
- The tests fail when an answer repeats, is blocked or is not a guess, and when fewer than 90 days of answers are left.

Sources and licences: [data/SOURCES.md](data/SOURCES.md).
