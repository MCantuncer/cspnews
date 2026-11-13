# Publishing a bulletin

How one bulletin goes from news feeds to the live site. Rules do the collecting; the Verify and Write run (a scheduled Claude Code task) does the reading and writing. Run everything from the repository root with Node 22 or newer, after `pnpm install && pnpm build`.

1. **Collect.** `pnpm --filter @cspnews/pipeline prepare-bulletin "$PWD/data/candidates"` reads every feed, groups and labels the stories and writes `data/candidates/<yyyy-mm-dd>-<slot>.json`.
2. **Verify and Write.** Read the candidates, open the articles, and write `data/bulletins/<yyyy-mm-dd>-<slot>.json` in the format of `packages/core/src/story.ts`:
   - stories in section order (Türkiye, Tech and AI, Around the World);
   - every story in both languages under `versions.en` and `versions.tr`, and `sourceLanguage` set to the language most of its sources used. See "Writing in two languages" below;
   - only facts from the candidate articles, each claim and quote attributed to its outlet; optional fields left out when the sources don't support them;
   - keep each candidate's label, sources, timeline and `image` (the photo the rules picked, with its credit), but drop the `image` when it is a logo, brand graphic or illustration rather than a news photo; the rules can't always tell.
   - when the candidates file has them, write **And finally** and **Transfers** from `desks.light` and `desks.transfers`. See "And finally and Transfers" below. Both are optional: leave a part out rather than fill it with weak items.
3. **Save the photos.** In a pull request the Bulletin photos workflow does this and adds the photos to the branch. By hand: `pnpm --filter @cspnews/pipeline save-media "$PWD/data/bulletins/<file>.json"` downloads each story's photo to `data/bulletins/media/<story id>.<ext>`. When the feed only carried a thumbnail (under 800 px wide), the article's own full-size photo is saved instead and the bulletin's image URL is updated. A photo that fails is reported and the story falls back to its next visual.
4. **Save the outlet logos** (first time, then when sources change). `pnpm --filter @cspnews/config fetch-logos "$PWD/data/bulletins/media/logos"`. The site shows `svg`, `png` and `webp` logos; convert any other format to `png`.
5. **Check.** `pnpm --filter @cspnews/web build` validates every bulletin with `parseBulletin` and fails on a bad file. Look at it with `pnpm --filter @cspnews/web dev`.
6. **Publish.** Commit `data/bulletins` (JSON and `media/`) to `main`. Vercel deploys it; nothing else is needed.

`data/candidates` is a working file for step 2 and is not committed.

## How it runs by itself

The machine that writes the bulletin cannot reach news sites, so the two steps that need them run on GitHub:

- **Collect** (`.github/workflows/collect.yml`) runs step 1 and saves `candidates/<yyyy-mm-dd>-<slot>.json`, plus the readable text of the articles in `<yyyy-mm-dd>-<slot>.articles.json`, on the `candidates` branch. The branch also holds a `vercel.json` that turns Vercel deployments off for it, because it shares no history with `main`.
- **The Verify and Write run** is a scheduled task that starts forty minutes before each bulletin (the two main bulletins every day, the two side bulletins on weekdays). Its first action is to start Collect, because GitHub's own timer runs late or not at all; the timer in the workflow stays only as a backup, and Collect can also be started by hand from the Actions tab. The run then reads the new pair from the `candidates` branch, writes the bulletin, runs step 5 and opens a pull request with only the bulletin file.
- **Bulletin photos** (`.github/workflows/bulletin-photos.yml`) runs step 3 on that pull request and adds the photos to its branch.
- The run then merges the pull request, which is step 6.

## Writing in two languages

Every reader gets the whole bulletin in their own language, so both versions must read as if a good editor wrote them in that language. They are two versions of one story, not an original and a copy.

- **Write each version from the sources**, not from the other version. Read the articles in their own language and write the Turkish version as a Turkish newsroom would and the English one as an English newsroom would: natural word order, the usual terms (_politika faizi_, _policy rate_), no calques. Translating one version into the other is the fallback, never the plan.
- **Same story, same facts.** Both versions carry the same claims, attributions, numbers, dates, names and quotes, in the same order of importance. The build checks the parts it can (the same optional parts, facts, series dates, key numbers, places and quoted outlets); the rest is on the writer.
- **Names and numbers.** Keep people's names exactly as the sources spell them, with Turkish letters (Kavcıoğlu, not Kavcioglu). Write numbers the way each language does: `%31,5` and `1,2 milyar avro` in Turkish, `31.5%` and `€1.2 billion` in English. Give institutions their usual name in each language, and explain once what a Turkish institution is for English readers (_the banking regulator BDDK_).
- **Quotes.** Translate a quote faithfully, never paraphrase it inside quotation marks, and set `"translated": true` on every quote that is given in another language than the speaker used. A quote the source itself translated (a Spanish speaker quoted in English) is marked in both versions.
- **Length.** Turkish needs about a fifth fewer words for the same text, so the body is 300 to 700 words in English and 240 to 560 in Turkish (`BODY_WORDS`).
- **Timeline updates** carry their note in both languages: `"note": { "en": "…", "tr": "…" }`.

Hot News is not written by the Write run (it runs on rules only), so a Hot story shows the lead outlet's headline in its own language until the next bulletin covers it.

## And finally and Transfers

Two parts sit outside the news sections, in `andFinally` and `transfers` (format in `packages/core/src/extras.ts`, design in `docs/design/decisions/and-finally.md` and `transfers.md`). Their candidates come from sources that feed only these desks, in `desks.light` and `desks.transfers` of the candidates file.

**And finally** holds at most four items in all:

- `light`: true light stories (celebrities and television, odd records, animals, small local wonders) that are Confirmed or Reported. The `title` and `gist` are written straight. The `aside` is one line of wit in our own voice, at most 140 characters: dry, about the situation, never about a person's looks, body, age, accent or private life, never about a private person, no emoji. Write a separate joke in each language rather than translating one.
- `rumours`: talk we could not confirm, each with `heardFrom`, the outlet that is saying it. Leave out a rumour about someone's health, relationships or private life, a rumour that accuses anyone of a crime, and any rumour about a private person.
- Never put death, illness, crime victims, children, disasters or war in And finally, however odd the story is.
- Give every item a `kind` for its badge: `screen`, `music`, `people`, `odd`, `animals` or `town`. Give a light story an `image` when one of its sources has a real news photo (same rules as a story photo), and keep the `gist` to one sentence.

**Transfers** covers moves to clubs in the Süper Lig, Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, Eredivisie and Primeira Liga, at most six per bulletin: the ones that moved forward since the last bulletin.

- `stage` is the furthest stage a confirming report supports: `talk` (an outlet links the player with the club), `talks` (negotiations), `agreed` (fee or terms agreed), `signed` (the buying club announced it). Only the club's own announcement makes a move `signed` with `clubConfirmed: true`.
- `steps` repeat the stages of the move that earlier bulletins showed, with the day each stage was first reported, and add the new one. `reports` list each outlet with the stage it reported and the day.
- `now` says where the move stands. `signedWhen` says what would make it signed, until it is. `facts` give at most two numbers (fee, contract length) only when an outlet reports them.
- A move whose talks broke down leaves Transfers. Football rumours go to Transfers, never to And finally.

## When an edition is late

- **On the site.** The end-of-bulletin line is corrected in the browser: ten minutes after the next edition was due with nothing published it reads "The 22:30 edition is running late", and after six hours "No newer edition has been published yet" (`apps/web/src/lib/next-edition.ts`).
- **For the owner.** `.github/workflows/late-edition.yml` runs 20 minutes after each slot and checks that the edition's file is on `main` (`pnpm --filter @cspnews/pipeline check-edition "$PWD/data/bulletins"`). A missing edition opens one issue labelled `late-edition`, which GitHub emails to the repository owner, and the issue closes itself when an edition is next on time. The check is off until the repository variable `LATE_EDITION_ALERT` is set to `on`.
