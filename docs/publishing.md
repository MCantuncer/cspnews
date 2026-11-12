# Publishing a bulletin

How one bulletin goes from news feeds to the live site. Rules do the collecting; the Verify and Write run (a scheduled Claude Code task) does the reading and writing. Run everything from the repository root with Node 22 or newer, after `pnpm install && pnpm build`.

1. **Collect.** `pnpm --filter @cspnews/pipeline prepare-bulletin "$PWD/data/candidates"` reads every feed, groups and labels the stories and writes `data/candidates/<yyyy-mm-dd>-<slot>.json`.
2. **Verify and Write.** Read the candidates, open the articles, and write `data/bulletins/<yyyy-mm-dd>-<slot>.json` in the format of `packages/core/src/story.ts`:
   - stories in section order (Türkiye, Tech and AI, Around the World);
   - every story in both languages under `versions.en` and `versions.tr`, and `sourceLanguage` set to the language most of its sources used. See "Writing in two languages" below;
   - only facts from the candidate articles, each claim and quote attributed to its outlet; optional fields left out when the sources don't support them;
   - keep each candidate's label, sources, timeline and `image` (the photo the rules picked, with its credit), but drop the `image` when it is a logo, brand graphic or illustration rather than a news photo; the rules can't always tell.
3. **Save the photos.** In a pull request the Bulletin photos workflow does this and adds the photos to the branch. By hand: `pnpm --filter @cspnews/pipeline save-media "$PWD/data/bulletins/<file>.json"` downloads each story's photo to `data/bulletins/media/<story id>.<ext>`. When the feed only carried a thumbnail (under 800 px wide), the article's own full-size photo is saved instead and the bulletin's image URL is updated. A photo that fails is reported and the story falls back to its next visual.
4. **Save the outlet logos** (first time, then when sources change). `pnpm --filter @cspnews/config fetch-logos "$PWD/data/bulletins/media/logos"`. The site shows `svg`, `png` and `webp` logos; convert any other format to `png`.
5. **Check.** `pnpm --filter @cspnews/web build` validates every bulletin with `parseBulletin` and fails on a bad file. Look at it with `pnpm --filter @cspnews/web dev`.
6. **Publish.** Commit `data/bulletins` (JSON and `media/`) to `main`. Vercel deploys it; nothing else is needed.

`data/candidates` is a working file for step 2 and is not committed.

## Writing in two languages

Every reader gets the whole bulletin in their own language, so both versions must read as if a good editor wrote them in that language. They are two versions of one story, not an original and a copy.

- **Write each version from the sources**, not from the other version. Read the articles in their own language and write the Turkish version as a Turkish newsroom would and the English one as an English newsroom would: natural word order, the usual terms (_politika faizi_, _policy rate_), no calques. Translating one version into the other is the fallback, never the plan.
- **Same story, same facts.** Both versions carry the same claims, attributions, numbers, dates, names and quotes, in the same order of importance. The build checks the parts it can (the same optional parts, facts, series dates, key numbers, places and quoted outlets); the rest is on the writer.
- **Names and numbers.** Keep people's names exactly as the sources spell them, with Turkish letters (Kavcıoğlu, not Kavcioglu). Write numbers the way each language does: `%31,5` and `1,2 milyar avro` in Turkish, `31.5%` and `€1.2 billion` in English. Give institutions their usual name in each language, and explain once what a Turkish institution is for English readers (_the banking regulator BDDK_).
- **Quotes.** Translate a quote faithfully, never paraphrase it inside quotation marks, and set `"translated": true` on every quote that is given in another language than the speaker used. A quote the source itself translated (a Spanish speaker quoted in English) is marked in both versions.
- **Length.** Turkish needs about a fifth fewer words for the same text, so the body is 300 to 700 words in English and 240 to 560 in Turkish (`BODY_WORDS`).
- **Timeline updates** carry their note in both languages: `"note": { "en": "…", "tr": "…" }`.

Hot News is not written by the Write run (it runs on rules only), so a Hot story shows the lead outlet's headline in its own language until the next bulletin covers it.

## When an edition is late

- **On the site.** The end-of-bulletin line is corrected in the browser: ten minutes after the next edition was due with nothing published it reads "The 22:30 edition is running late", and after six hours "No newer edition has been published yet" (`apps/web/src/lib/next-edition.ts`).
- **For the owner.** `.github/workflows/late-edition.yml` runs 20 minutes after each slot and checks that the edition's file is on `main` (`pnpm --filter @cspnews/pipeline check-edition "$PWD/data/bulletins"`). A missing edition opens one issue labelled `late-edition`, which GitHub emails to the repository owner, and the issue closes itself when an edition is next on time. The check is off until the repository variable `LATE_EDITION_ALERT` is set to `on`.
