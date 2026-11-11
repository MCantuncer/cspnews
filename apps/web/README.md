# @cspnews/web

The CSPNews website: a static Astro site built from published bulletins. The design it follows is in [`docs/design/system.md`](../../docs/design/system.md).

```sh
pnpm --filter @cspnews/web dev        # local server at http://localhost:4321
pnpm --filter @cspnews/web build      # static pages in apps/web/dist
pnpm --filter @cspnews/web typecheck  # astro check
```

| Path             | What lives there                                           |
| ---------------- | ---------------------------------------------------------- |
| `src/styles`     | Design tokens (both themes, edition hours) and base styles |
| `src/layouts`    | Page shells                                                |
| `src/components` | UI components                                              |
| `src/lib`        | Pure helpers, with unit tests next to them                 |
| `src/pages`      | Routes                                                     |

Fonts (Funnel Display and Funnel Sans) are self-hosted from `@fontsource`, so the site makes no third-party requests.
