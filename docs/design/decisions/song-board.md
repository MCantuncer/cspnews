# Daily Song board (Bugünün listesi)

Asked for by Can on 2026-11-27: a global board for each day's songs, where a reader may add a name or keep a funny made-up one that gives nothing away. Design picked on 2026-11-28.

## On the score screen

Right under the day's score, after a heavy rule: **Today's board** with the number of players at the right. Each row is the rank, the name, four small bars and the points. The bars stand for the four songs in their genre colours; the sooner a song was named, the taller its bar, and a missed song is a grey stub. So readers compare how a day went without seeing a single song.

- Not on the board yet: the top three, then the name step.
- On the board and in the top ten: the top ten, the reader's own row on a soft background with "(you)", and "You're 7th of 1,032."
- Below the top ten: the top five, a "···" gap, then the reader's row with the rows just above and below.
- An empty board says "Nobody is on today's board yet." above the name step.

## The name step

Can found the first version, a card with the name in large type, "jammed" and hard to read as a place to type. So the name is a real text box:

- A label, **Your name on the board**, and one line saying a made-up name was picked and can be typed over.
- The box comes filled with a made-up name ("Sleepy Bassline", "Uykulu Kaset": an adjective and a music word or animal, 400 pairs per language). The round-arrows button inside the box draws another.
- **Add me to the board** sends it; nothing is sent before. "Only this name and your score are shown." sits under the button.
- Problems show under the box in the soft red, and the box border turns red: too short (2 letters at least), too long (20 at most), not letters, numbers and spaces, a rude word, or a name that holds one of today's artists or titles ("That gives away one of today's songs. Try another.").
- The name is remembered for the next days; a remembered name that would give away the new songs is swapped for a made-up one.

## Rules on the server

The board lives in the live Worker (`apps/live/src/board.ts`): one SQLite-backed Durable Object per game day, created by deploying, with no database to set up and nothing on Vercel.

- A reader is a random id their browser keeps; one row per id per day, and the first row stays.
- The score is never taken on trust: the Worker replays the guesses against the day's answers (`checkRounds` in `packages/songgame/src/board.ts`) and refuses an unfinished or doctored day.
- Names go through the same checks as on the page (`nameProblem`).
- Ties: more points first, then less heard (a missed song counts as 16 s), then who joined first.
- At most 5 names per network per day. The network address is kept only as a hash mixed with the day, so days can't be linked. Nothing else about the reader is stored.
- A name can be added to today's board, or to yesterday's just after midnight. Each day's board is its own.

## Words

| English                                  | Türkçe                                        |
| ---------------------------------------- | --------------------------------------------- |
| Today's board                            | Bugünün listesi                               |
| 1,032 players                            | 1.032 oyuncu                                  |
| Your name on the board                   | Listedeki adın                                |
| Add me to the board                      | Beni listeye ekle                             |
| Only this name and your score are shown. | Yalnızca bu isim ve puanın görünür.           |
| You're 7th of 1,032.                     | 1.032 kişi içinde 7. sıradasın.               |
| That gives away one of today's songs.    | Bu, bugünün şarkılarından birini ele veriyor. |
