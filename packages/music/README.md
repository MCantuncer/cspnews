# @cspnews/music

The daily music edition (docs/music.md): its format, the rules it must pass, the all-time list and Can's taste. No I/O except `files.ts`, which reads the lists and a folder of editions for the check script and the tests.

| File             | What it does                                                                                         |
| ---------------- | ---------------------------------------------------------------------------------------------------- |
| `edition.ts`     | The edition format: three genres of five picks, reason kinds, evidence, tempo, where it plays        |
| `rules.ts`       | `checkMusicEdition`: counts, kinds against dates and numbers, tempo, repeats, freshness              |
| `numbers.ts`     | Reads the numbers a reason line states, in English and Turkish, and matches them to sources          |
| `song.ts`        | One key per song, however a source spells it (featuring, remaster and sped-up tags, Turkish letters) |
| `canon.ts`       | The all-time list's format                                                                           |
| `taste.ts`       | Can's taste profile, a smaller ranking weight                                                        |
| `check-music.ts` | `pnpm --filter @cspnews/music check-music "$PWD/data/music"`                                         |

`data/canon.json` and `data/taste.json` can be edited by hand; the tests check both. `fixtures/sample-edition.json` is a made-up edition used by the tests and, later, by the page's sample build.
