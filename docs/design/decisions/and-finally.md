# And finally

The bulletin's light close, called **And finally** in English and **Biraz da magazin** in Turkish. It is one closed fold after the last section (and after Transfers): the name, how many items it holds, and one teaser line. Open, it shows a short note ("Facts stay checked; the jokes are ours"), up to four items, and nothing else. It never competes with the news, so readers who come for the news do not leave thinking the site is not serious, and readers who like a lighter end have a reason to read to the bottom.

It holds two kinds of item, at most four in all (`AndFinallySchema` in `packages/core/src/extras.ts`):

- **Light stories.** True, light news: celebrities and television, odd records, animals, small local wonders. Each one is told straight (headline and gist carry no joke), keeps an evidence mark (only Confirmed or Reported) and names its sources, then gets **one line of wit in our own voice**, set apart by a 2px rule in the edition hour colour so the reader always knows which part is the joke.
- **Backstage talk** (Kulis). Rumours we could not confirm, under their own small heading with "Not confirmed. We name who is saying it." Each one has the dashed evidence glyph (`rumour`) and "Heard from" the outlet that is saying it. Football transfer rumours go to [Transfers](transfers.md), not here.

## How funny

The wit is weighed, not free:

- One line per light story, at most 140 characters. The headline and the facts never joke.
- Joke about the situation, never about a person's looks, body, age, accent or private life, and never about a private person at all.
- Never about death, illness, crime victims, children, disasters, war or anything a reader could be hurt by. Stories like these never go into And finally, however odd they are.
- Dry beats loud: understatement, not exclamation marks, puns only when they are good, no emoji.
- Both languages get their own joke, written for that language, not a translated one.

## Where it shows

- Contents, as the last fold before "End of the bulletin". On the upright day line it has its own hollow station in the hour colour; on the flat line (1400px and wider) it runs under the section columns, light stories on the left and backstage talk beside them.
- The caught-up screen, as one quiet way on between "Review the stories" and the word game, with the teaser. It opens Contents at `#and-finally` with the fold open.
- Never in Hot News, the sections, the day lanes, the one-minute brief, "three things to remember", reading time, the feeds or any alert.

## Turning it off

**Light stories** in the reader corner and on Settings is on by default. Turning it off saves `cspnews:light=off` in the browser; the page then hides everything marked `data-and-finally` from the first paint.
