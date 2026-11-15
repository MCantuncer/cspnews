# Tonight

A short list on the Contents screen, under the Today line, of the matches and shows a Turkish reader would stay up for: Turks abroad whose team plays, Turkish clubs in the Champions League and the Euroleague, the Türkiye A national teams, and award shows with a Turk on the shortlist. Can asked to see them "in every bulletin until they play, playing, played".

- **A station per row.** Each row starts with a small station on the day line: hollow before, ringed in the Hot colour while it is on, filled once it is over. The status word under the time says the same in words ("Tonight", "Under way", "Full time"), so colour is never the only signal.
- **One strong figure.** On the right, the kick-off time in Istanbul time, replaced by the final score once there is one. No live dot, no pulsing, no red and green.
- **Our side in bold.** The side the row follows is set in bold; the other side stays regular. Team logos sit before the names at 16 px (20 px when the fixture is the row's name).
- **The person's own numbers, right after their name.** Football: a ball for goals and a boot for assists, each with its count. The icons come from Phosphor Icons (regular weight, MIT licence), not drawn by hand: hand-drawn marks did not read at 18px. Basketball: bold numbers with short words ("27 pts 13 reb 8 ast", "27 sayı 13 ribaund 8 asist"). Zeros are left out, except a basketball player's points. They come from the match's box score (`lines`), read by the rules.
- **Win or loss, said softly.** When the match is over, our side's result tints the filled station green (`--conf`) or red (`--disp`) and the score takes a light tint of the same colour. No badge, no background, no "WIN" label (Can, 2026-11-16: "a bit green or red, but not highlighting").
- **Person rows say who; club rows are the fixture.** "Alperen Şengün / Houston Rockets v LA Lakers / NBA" for a person, "Galatasaray v Liverpool / Champions League" for a club or the national team, so a name is never written twice.
- **Moves by the clock.** The page re-reads the clock every minute while visible, so a row built as "Tonight 21:45" turns "Under way" and then "Ended" without a reload. It never invents a score: without a result it says "Ended" and keeps the time. Live scores come from the live score feed (a later step).
- **Rules, not writers.** Matches come from public schedules, read by rules on the bulletin's pull request (`packages/scores`). The writer only adds award shows and matches no schedule lists. See `docs/publishing.md`, "Tonight".
- **Only when there is something.** No rows, no section.

Logos and player photos come from the leagues' own data and are saved next to the site; Can chose the leagues' official photos over free ones (2026-11-15).
