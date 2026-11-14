# Spotlight (Magazin)

The bulletin's light close, called **Spotlight** in English and **Magazin** in Turkish (Can picked the names on 2026-11-14; it was first called "And finally" / "Biraz da magazin", and the code still says `andFinally`). It is one fold after the last section (and after Transfers). Closed, it is a soft card in the edition hour colour: a filled station on the day line, the cup icon and the name as large as a section name, a count chip, a round open button, one teaser line and a row of badges, one per item. Open, the card falls away and the name heads the items like a section. Open, it shows a short note ("Facts stay checked; the jokes are ours"), up to four items, and nothing else. It never competes with the news, so readers who come for the news do not leave thinking the site is not serious, and readers who like a lighter end have a reason to read to the bottom.

It holds two kinds of item, at most four in all (`AndFinallySchema` in `packages/core/src/extras.ts`):

- **Light stories.** Real magazine news: specific stories about a named public person with one eye-catching detail (a romance confirmed, a fortune-priced watch, a red-carpet moment, a public spat), plus odd records and animals. Not industry news such as broadcast deals, ratings or cast changes (Can, 2026-11-14: "specific news and attractive"). Better two good items than four dull ones. Each one is told straight (the headline and a one-sentence gist carry no joke), keeps an evidence mark (only Confirmed or Reported) and names its sources, then gets **one line of wit in our own voice**, set apart by a 2px rule in the edition hour colour so the reader always knows which part is the joke.
- **Backstage talk** (Kulis). Magazine rumours we could not confirm (who is said to be dating whom, a rumoured feud), never about health, pregnancy, cheating, courts, children or private people, under their own small heading with "Not confirmed. We name who is saying it." Each one has the dashed evidence glyph (`rumour`) and "Heard from" the outlet that is saying it. Football transfer rumours go to [Transfers](transfers.md), not here.

## Badges and pictures

A light close must never look like homework, so every item leads with a picture, not a paragraph:

- **Kind badges.** Every item has a kind (`LIGHT_KINDS`): Screen, Music, People, Odd news, Animals, Around town (Ekran, Müzik, Ünlüler, İlginç, Hayvanlar, Şehirden). Each kind has a Stations icon. It shows as a 44px badge in a soft field of the hour colour, with the kind word above the title. A rumour's badge is drawn with a dashed outline instead, the same dashes as its evidence glyph.
- **Teaser badges.** The closed fold shows one small badge per item under the teaser, so the reader can see what is inside before opening it.
- **One path.** Open, the items run down a short line of their own, badge to badge, so the eye always knows where the next item starts.
- **Photos.** A light story can carry the outlet photo (`image`, saved by `save-media` like a story's photo). It shows as a small square thumbnail (88px on wide screens, beside the text; 64px on phones, in place of the badge), never a wide photo: small but effective, so the close never turns into a gallery (Can, 2026-11-14). A light story without a real news photo has none.
- **Outlet logos** sit next to the source names, as on Contents.
- **The punchline** is set in the headline face, so the one funny line is what the eye lands on after the facts.

## How funny

The wit is weighed, not free:

- One line per light story, at most 140 characters. The headline and the facts never joke.
- Joke about the situation, never about a person's looks, body, age, accent, health or family, and never about a private person at all.
- Never about death, illness, crime victims, children, disasters, war or anything a reader could be hurt by. Stories like these never go into Spotlight, however odd they are.
- Dry beats loud: understatement, not exclamation marks, puns only when they are good, no emoji.
- Both languages get their own joke, written for that language, not a translated one.

## Where it shows

- Contents, as the last fold before "End of the bulletin". On the upright day line it has its own hollow station in the hour colour; on the flat line (1400px and wider) it runs under the section columns, light stories on the left and backstage talk beside them.
- The caught-up screen, as one quiet way on between "Review the stories" and the word game, with the teaser. It opens Contents at `#and-finally` with the fold open.
- Never in Hot News, the sections, the day lanes, the one-minute brief, "three things to remember", reading time, the feeds or any alert.

## Turning it off

**Spotlight** (Magazin) in the reader corner and on Settings is on by default. Turning it off saves `cspnews:light=off` in the browser; the page then hides everything marked `data-and-finally` from the first paint.
