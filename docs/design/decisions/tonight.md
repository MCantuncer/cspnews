# Tonight

A short list on the Contents screen, under the Today line, of the matches and shows a Turkish reader would stay up for: Turks abroad whose team plays, Turkish clubs in the Champions League and the Euroleague, the Türkiye A national teams, and award shows with a Turk on the shortlist. Can asked to see them "in every bulletin until they play, playing, played".

- **A station per row.** Each row starts with a small station on the day line: hollow before, ringed in the Hot colour while it is on, filled once it is over. The status word under the time says the same in words ("Tonight", "Live", "Full time"), so colour is never the only signal.
- **One strong figure.** On the right, the kick-off time in Istanbul time, replaced by the final score once there is one. No live dot, no pulsing, no red and green.
- **Our side in bold.** The side the row follows is set in bold; the other side stays regular. Team logos sit before the names at 16 px (20 px when the fixture is the row's name).
- **The person's own numbers, in words, right after their name.** "1 goal 1 assist" for football, "27 pts 13 reb 8 ast" for basketball (Turkish: gol, asist, sayı, ribaund). Set apart from the name: the number in the reading face at 600, 14px, the word plain lowercase in the quiet colour (Can found spaced capitals too big and odd, 2026-11-16). No icons: drawn ones did not read at this size, and Can chose words (2026-11-16). Zeros are left out, except a basketball player's points. They come from the match's box score (`lines`), read by the rules.
- **Win or loss, said softly.** When the match is over, our side's result tints the filled station green (`--conf`) or red (`--disp`) and the score takes a light tint of the same colour. No badge, no background, no "WIN" label (Can, 2026-11-16: "a bit green or red, but not highlighting").
- **Person rows say who; club rows are the fixture.** "Alperen Şengün / Houston Rockets v LA Lakers / NBA" for a person, "Galatasaray v Liverpool / Champions League" for a club or the national team, so a name is never written twice.
- **Moves by the clock.** The page re-reads the clock every minute while visible, so a row built as "Tonight 21:45" turns "Live" and then "Ended" without a reload. It never invents a score: without a result it says "Ended" and keeps the time. Live scores come from the live scores Worker (`apps/live`): while a row may be playing and the tab is open, the page asks every minute (every five before kick-off, never after the end) and the row shows the score and the source's clock ("63'", "3rd 4:12"). The Today line's match takes the score the same way. Without the Worker the rows keep moving by the clock.
- **Rules, not writers.** Matches come from public schedules, read by rules on the bulletin's pull request (`packages/scores`). The writer only adds award shows and matches no schedule lists. See `docs/publishing.md`, "Tonight".
- **Only when there is something.** No rows, no section.

Logos and player photos come from the leagues' own data and are saved next to the site; Can chose the leagues' official photos over free ones (2026-11-15).

## Scoreboard rows (2026-11-16)

- **A Turkish club or national team match is a scoreline (Can, 2026-11-16).** Home team on the left, away team on the right, each with its crest above its name (national teams: the whole flag as a small rounded rectangle, never cut into a circle), our side in bold. The middle holds the kick-off time, then the score with the minute under it while it is played, then the score with "Full time".
- **Each goal under the side that scored it, minute first, using the row's whole width.** Own goals in a soft red. Football: "49' Topcu OG", "23' 67' Osimhen", from ESPN's scoreboard; the home side's goals in the left half, the away side's in the right half, small type, a long name wrapping under itself. Euroleague: each side's top scorer with their points ("24 PTS Hayes-Davis"), from the game's box score. Our side's scorers in ink, the other side's quieter.
- **Official photos only.** A scorer's photo is the league's or the score source's own (ESPN headshot, Euroleague headshot), saved with the bulletin. No photo means no circle at all: never initials or a stand-in.
- **Live like the rest.** The live Worker adds the scorers (from the league scoreboard or the box score) while a match is played, and the page redraws them.

## Every match a scoreline, closed by default (Can, 2026-11-16)

- **Every match row is a scoreline**, a person's too: home team, score, away team. A person's row puts their name on top and their own numbers on a line of their own, each number over its word, like a small box score.
- **Closed by default.** The scoreline shows only the score and its clock. A tap opens it to show who scored, and closes it again. Nothing to open before the first goal or basket.
- **Room.** Rows have generous padding and space between their lines; nothing sits squeezed beside a name.
- **Before the source starts a game** that is past its start time, the row says "Starting soon" rather than "Live".

## Wide screens (Can, 2026-11-16)

- **Each match row has two parts:** what it is (the name, a person's numbers, the league) and the scoreline. On a phone they stack; from 720px they sit side by side, the scoreline in a fixed column on the right so every row's score lines up, its goals opening under it.
- **Short club names** ("76ers", "Rockets") from the score source, the full name kept for screen readers.
