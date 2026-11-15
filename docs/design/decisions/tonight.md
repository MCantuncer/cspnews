# Tonight

A short list on the Contents screen, under the Today line, of the matches and shows a Turkish reader would stay up for: Turks abroad whose team plays, Turkish clubs in the Champions League and the Euroleague, the Türkiye A national teams, and award shows with a Turk on the shortlist. Can asked to see them "in every bulletin until they play, playing, played".

- **A station per row.** Each row starts with a small station on the day line: hollow before, ringed in the Hot colour while it is on, filled once it is over. The status word under the time says the same in words ("Tonight", "Under way", "Full time"), so colour is never the only signal.
- **One strong figure.** On the right, the kick-off time in Istanbul time, replaced by the final score once there is one. No live dot, no pulsing, no red and green.
- **Our side in bold.** The side the row follows is set in bold; the other side stays regular. Team logos sit before the names at 16 px (20 px when the fixture is the row's name).
- **Person rows say who; club rows are the fixture.** "Alperen Şengün / Houston Rockets v LA Lakers / NBA" for a person, "Galatasaray v Liverpool / Champions League" for a club or the national team, so a name is never written twice.
- **Moves by the clock.** The page re-reads the clock every minute while visible, so a row built as "Tonight 21:45" turns "Under way" and then "Ended" without a reload. It never invents a score: without a result it says "Ended" and keeps the time. Live scores come from the live score feed (a later step).
- **Rules, not writers.** Matches come from public schedules, read by rules on the bulletin's pull request (`packages/scores`). The writer only adds award shows and matches no schedule lists. See `docs/publishing.md`, "Tonight".
- **Only when there is something.** No rows, no section.

Logos and player photos come from the leagues' own data and are saved next to the site; Can chose the leagues' official photos over free ones (2026-11-15).
