# @cspnews/wordgame

The rules of the daily word game (US-70, US-71), with no I/O. The page in `apps/web` and, later, reader accounts both use it, so a reader's streak is the same everywhere.

| File          | What it does                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------- |
| `language.ts` | The two alphabets, Turkish upper-casing (i → İ, ı → I), circumflex folding, which words can be played |
| `score.ts`    | Green, yellow and grey marks with correct repeated letters, keyboard colours, hard mode               |
| `day.ts`      | Game days in Istanbul time, the puzzle number, the day's answer, a fixed shuffle for new word lists   |
| `progress.ts` | Streak with one rest day per week, the last seven days, stats                                         |

## The answer lists

Each language's answers are kept in play order: entry 1 is puzzle 1, played on the language's first day. New words are appended. A word that has to go is replaced in place, so a day that has been played never changes its word.
