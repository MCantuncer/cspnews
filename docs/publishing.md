# Publishing a bulletin

How one bulletin goes from news feeds to the live site. Rules do the collecting; the Verify and Write run (a scheduled Claude Code task) does the reading and writing. Run everything from the repository root with Node 22 or newer, after `pnpm install && pnpm build`.

1. **Collect.** `pnpm --filter @cspnews/pipeline prepare-bulletin "$PWD/data/candidates"` reads every feed, groups and labels the stories and writes `data/candidates/<yyyy-mm-dd>-<slot>.json`.
2. **Verify and Write.** Read the candidates, open the articles, and write `data/bulletins/<yyyy-mm-dd>-<slot>.json` in the format of `packages/core/src/story.ts`:
   - stories in section order (Türkiye, Tech and AI, Around the World); Turkish stories in Turkish, the rest in English;
   - only facts from the candidate articles, each claim and quote attributed to its outlet; optional fields left out when the sources don't support them;
   - keep each candidate's label, sources, timeline and `image` (the photo the rules picked, with its credit), but drop the `image` when it is a logo, brand graphic or illustration rather than a news photo; the rules can't always tell.
3. **Save the photos.** `pnpm --filter @cspnews/pipeline save-media "$PWD/data/bulletins/<file>.json"` downloads each story's photo to `data/bulletins/media/<story id>.<ext>`. When the feed only carried a thumbnail (under 800 px wide), the article's own full-size photo is saved instead and the bulletin's image URL is updated. A photo that fails is reported and the story falls back to its next visual.
4. **Save the outlet logos** (first time, then when sources change). `pnpm --filter @cspnews/config fetch-logos "$PWD/data/bulletins/media/logos"`. The site shows `svg`, `png` and `webp` logos; convert any other format to `png`.
5. **Check.** `pnpm --filter @cspnews/web build` validates every bulletin with `parseBulletin` and fails on a bad file. Look at it with `pnpm --filter @cspnews/web dev`.
6. **Publish.** Commit `data/bulletins` (JSON and `media/`) to `main`. Vercel deploys it; nothing else is needed.

`data/candidates` is a working file for step 2 and is not committed.
