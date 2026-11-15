# Hot News

One quiet 40 px line above the reader, in the interface language, dismissable. Never a pop-up. Its mark animates once on arrival.

## How the feed is made (2026-11-15)

The Hot News workflow (`.github/workflows/hot-news.yml`) runs every ten minutes, reads the wire and established Turkish and world feeds, and publishes the feed on the `hot-feed` branch of the repository. The site fetches that file in the reader's browser, so a new Hot story needs no site rebuild and no Vercel build. It is stateless: a story stays in the feed while several independent outlets are on it and it is under three hours old, and drops out after. Heat, the single-owner hold-back and the fact-check hold-back are the rules in `packages/hotnews`; no model is involved.

Late is expected: GitHub can start a scheduled run several minutes late, and its file cache holds for about five minutes, so a Hot line can appear ten to twenty minutes after the first report. That is slower than a Worker would be, and it is free. `PUBLIC_HOT_FEED_URL` moves the site to a Worker later with no other change.
