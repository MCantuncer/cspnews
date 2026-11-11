# @cspnews/web

The CSPNews website: a static Astro site built from published bulletins. The design it follows is in [`docs/design/system.md`](../../docs/design/system.md).

```sh
pnpm --filter @cspnews/web dev        # local server at http://localhost:4321
pnpm --filter @cspnews/web build      # static pages in apps/web/dist
pnpm --filter @cspnews/web typecheck  # astro check
pnpm --filter @cspnews/web dev:sample # the dev server with the sample bulletin
```

Bulletins are read at build time from `data/bulletins/<yyyy-mm-dd>-<slot>.json` at the repository root, or from the folder in `CSPNEWS_BULLETINS`. Each file is validated with `parseBulletin`; a bad file stops the build. Photos and organisation logos are served from the site, never hot-linked: the publishing run saves them in `<bulletins>/media` (`<story id>.jpg` for a story's photo, `org/<org id>.svg` for a logo), and the build copies that folder to `/media`. Locator maps are drawn at build time from Natural Earth shapes (`world-atlas`). `fixtures/bulletins` holds an illustrative sample (not real reporting) for development and tests.

The daily word game lives at `/word` (English) and `/word/tr` (Turkish). Each build ships only a short window of answers, from yesterday to ten days ahead, scrambled with `hideWord` (`src/lib/word-data.ts`); the browser picks today's by the Istanbul date. Every bulletin build refreshes the window, so the site needs a build at least every ten days, which publishing gives it. The accepted guesses are served as `/word/guesses-<language>.txt`. Games, streaks and stats are kept in the reader's browser.

| Path             | What lives there                                            |
| ---------------- | ----------------------------------------------------------- |
| `src/styles`     | Design tokens (both themes, edition hours) and base styles  |
| `src/layouts`    | Page shells                                                 |
| `src/components` | UI components                                               |
| `src/lib`        | Pure helpers, with unit tests next to them                  |
| `src/pages`      | Routes: `/<date>/<slot>/<story id>` for each story, `/word` |

Fonts (Funnel Display and Funnel Sans) are self-hosted from `@fontsource`, so the site makes no third-party requests.
