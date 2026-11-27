# @cspnews/songgame

The rules and data of the daily song game (design: `docs/design/decisions/song-game.md`).

- `src/rounds.ts`: genres, clip lengths, points, a round after a guess.
- `src/names.ts`: how guesses are compared and searched.
- `src/days.ts`: which songs play on which day.
- `src/share.ts`: the `?vs=` code a reader sends a friend.
- `src/progress.ts`: streak and stats from the finished days.
- `data/picks/<genre>.txt`: the hand-picked songs, `Artist | Title`.
- `data/songs/`: what the Song Pool workflow found for them (previews, clip starts, the guess list).

To add songs, append lines to a picks file and push a branch: the Song Pool workflow
(`.github/workflows/song-pool.yml`) looks them up and commits `data/songs` back to the branch.
