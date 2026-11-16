# Turks abroad (Dünyadaki Türkler)

Turkish people making news in other countries: athletes in foreign leagues (Alperen Şengün in the NBA, Turkish players in Europe's big leagues, on the tennis tour, in MotoGP), and scientists, artists, founders and young talents. Can asked for it on 2026-11-14 ("Turks on different countries like Alperen Şengün and many different Turkish athletes", then "for all other brilliant Turkish players, maybe Turkish scientists, young talents") and asked that each one's numbers have a layout that fits the sport ("Alperen's scores should have a cool layout which fits basketball stats").

It is a station of its own on the Contents day line, in rose (`--sec-abroad`), and the last one: after Around the World, [Transfers](transfers.md) and the [And finally](and-finally.md) fold, just before the end of the bulletin (Can, 2026-11-16: "move Turks abroad to the bottom"). This is news a reader looks for, so it is not hidden in a fold like Spotlight. The station only shows when a bulletin has items (`abroad`, at most six: the people with news since the last bulletin), and a quiet day simply has no station.

## A card in Contents

Each person gets a card (`components/abroad/AbroadCard.astro`), because a plain row read as "just text" (Can, 2026-11-16). The card is a quiet surface (`--surf`, 1px hairline, 16px corners, no shadow) in three parts:

- **Who:** a 72px round photo of them with their **club crest** on its edge, the crest Tonight saved for that team (`media/teams/<team key>`, the key read from the club in `where`). With no photo but a crest, the crest stands whole in the circle; with neither, the sport or field (basketball, football, tennis, volleyball, a chequered flag for racing, a flask for science, a chip, a frame, a case) as a ring in the section colour. Never initials. Beside it the name in the headline face, then the sport mark, club and league in the meta colour, and "Rising talent" in the section colour for a young talent.
- **What they did,** under one hairline and only when there is something to show: the final score, then **the few numbers that fit the sport**, each value in the headline face beside its word (basketball: points, rebounds, assists; football: goals and assists, or minutes, and the rating; tennis: the sets, "6–7 6–3 7–5 vs …"; racing: "P3 from P8"; volleyball: points, blocks, aces), kept on one line on a 360px phone; or for someone outside sport their milestone, its type with its mark in the section colour and its name in the headline face.
- **The line on it** in reading text, then the evidence glyph and when it happened **in our time**: "Played at 04:30 our time" / "Maç saati: 04:30 (TSİ)", or "Next: Sunday 23:00". NBA games end while Türkiye sleeps, so the hour as it was here is the useful detail. A time on another day than the bulletin's adds the weekday.

The station name carries the count in the meta colour ("4 names"), not a chip. Cards stack on phones; from 1100px they sit two to a row, and on the flat day line (1400px and wider) three to a row under the section columns, the cards in a row keeping one height.

## The person's page

`/<date>/<slot>/abroad/<item id>`: the face with its sport station, the section and field ("Turks abroad, Basketball"), the person's name, where they play, their age and "Rising talent" when it matters, the headline and its evidence mark, the outlet photo (16:9, credited) when there is one, **the stat board for the sport** (below), at most two more numbers (season context), the story in one to four short paragraphs, **the last games** as up to five stations on a line (filled for a win, hollow for a loss, half filled for a draw, the latest one ringed, the person's own number under each), the next game with where and when in our time, and the sources.

The last games line is the day line again, not a chart: it shows form at a glance without a table of numbers.

## The stat board

One quietly framed block (1px hairline, 14px corners) headed by the sport's mark and its name: the score and the hour it was played here, then the sport's own layout:

- **Basketball, "Box score":** points, rebounds and assists large over a 2px rule in the section colour, then minutes, field goals, three-pointers, free throws (made/tried), steals, blocks and plus-minus small in a row.
- **Football, "Match stats":** goals, assists and minutes played (78′) large, then shots, shots on target, key passes, pass accuracy, saves for a goalkeeper and the match rating.
- **Tennis, "Scoreboard":** the real scoreboard: both names, one column per set, each set's winning number bold, the winner's numbers in the section colour, a tie-break's loser points raised small; then aces and double faults.
- **Volleyball:** points and the set score large, then attack points, blocks and aces.
- **Racing, "Race result":** the finishing place (P3) and the grid place large, "Gained 5 places from the start" on a climbing line, then the gap to the winner, points and the championship place.
- **Outside sport, the milestone:** the mark in a ring (a medal for an award, a page for a paper, a climbing line for a record, a flag for a first, a person for a new role, a frame for a new work), the type in the section colour, the name in the headline face and one line on it.

The board only shows numbers a source gave; a field left out is not drawn. Labels are sentence case words, never upper-case abbreviations.

## Who is watched

`packages/config/src/abroad.ts` lists the people the abroad desk watches for (athletes, scientists, artists, founders), with the other spellings outlets use ("Alperen Sengun"), and phrases that point at a Turk abroad who is not on the list yet ("Türk bilim insanı", "Turkish-born"), so young talents reach the writer too. Any story from any source that names one of them or uses a phrase goes to the desk. The list is a starting point, not a gate: the writer checks that the person still plays abroad and may add someone who is not listed. Writing rules are in `docs/publishing.md`, "Turks abroad".

## Words

Names of people, clubs and leagues, nicknames and sports terms keep their original form in both languages ("double-double", not a translation).
