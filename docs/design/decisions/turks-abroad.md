# Turks abroad (Dünyadaki Türkler)

Turkish people making news in other countries: mostly athletes in foreign leagues (Alperen Şengün in the NBA, Turkish players in Europe's big leagues, Turkish players on the tennis tour), and people in science, the arts or business only for a big moment. Can asked for it on 2026-11-14 ("Turks on different countries like Alperen Şengün and many different Turkish athletes").

It is a station of its own on the Contents day line, after Around the World and before [Transfers](transfers.md), in rose (`--sec-abroad`). This is news a reader looks for, so it is not hidden in a fold like [Spotlight](and-finally.md). The station only shows when a bulletin has items (`abroad`, at most six: the people with news since the last bulletin), and a quiet day simply has no station.

## A row in Contents

One row per person: a round photo of them (or their initials in a soft field of the section colour when there is no photo), the name in the headline face, the club and league in the meta colour, one line on what happened with the result first, and then the evidence glyph and when it happened **in our time**: "Played at 04:30 our time" / "Maç saati: 04:30 (TSİ)", or "Next: Sunday 23:00". NBA games end while Türkiye sleeps, so the hour as it was here is the useful detail. A time on another day than the bulletin's adds the weekday.

The station name carries the count in the meta colour ("4 names"), not a chip. On wide screens the rows sit two to a row under the lead column layout; on the flat day line (1400px and wider) they run under the section columns, three to a row.

## The person's page

`/<date>/<slot>/abroad/<item id>`: the face, the section name, the person's name and where they play, the headline and its evidence mark, the outlet photo (16:9, credited) when there is one, the final score with the time it was played here, at most two numbers, the story in one to four short paragraphs, **the last games** as up to five stations on a line (filled for a win, hollow for a loss, half filled for a draw, the latest one ringed, the person's own number under each), the next game with where and when in our time, and the sources.

The last games line is the day line again, not a chart: it shows form at a glance without a table of numbers.

## Who is watched

`packages/config/src/abroad.ts` lists the people the abroad desk watches for, with the other spellings outlets use ("Alperen Sengun"). Any story from any source that names one of them goes to the desk. The list is a starting point, not a gate: the writer checks that the person still plays abroad and may add someone who is not listed. Writing rules are in `docs/publishing.md`, "Turks abroad".

## Words

Names of people, clubs and leagues, nicknames and sports terms keep their original form in both languages ("double-double", not a translation).
