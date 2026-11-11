# @cspnews/web

The CSPNews website: a static Astro site built from published bulletins. The design it follows is in [`docs/design/system.md`](../../docs/design/system.md).

```sh
pnpm --filter @cspnews/web dev        # local server at http://localhost:4321
pnpm --filter @cspnews/web build      # static pages in apps/web/dist
pnpm --filter @cspnews/web typecheck  # astro check
pnpm --filter @cspnews/web dev:sample # the dev server with the sample bulletin
```

Bulletins are read at build time from `data/bulletins/<yyyy-mm-dd>-<slot>.json` at the repository root, or from the folder in `CSPNEWS_BULLETINS`. Each file is validated with `parseBulletin`; a bad file stops the build. `fixtures/bulletins` holds an illustrative sample (not real reporting) for development and tests.

| Path             | What lives there                                           |
| ---------------- | ---------------------------------------------------------- |
| `src/styles`     | Design tokens (both themes, edition hours) and base styles |
| `src/layouts`    | Page shells                                                |
| `src/components` | UI components                                              |
| `src/lib`        | Pure helpers, with unit tests next to them                 |
| `src/pages`      | Routes: `/<date>/<slot>/<story id>` for each story         |

Fonts (Funnel Display and Funnel Sans) are self-hosted from `@fontsource`, so the site makes no third-party requests.
