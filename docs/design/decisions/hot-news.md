# Hot News

One quiet 40 px line above the reader, in the interface language, dismissable. Never a pop-up. Its mark animates once on arrival.

## How the feed is made (2026-11-15)

The Hot News workflow (`.github/workflows/hot-news.yml`) runs every ten minutes, reads the wire and established Turkish and world feeds, and publishes the feed on the `hot-feed` branch of the repository. The site fetches that file in the reader's browser, so a new Hot story needs no site rebuild and no Vercel build. It is stateless: a story is hot when its heat peaked high enough at any point (see below), and stays in the feed until it is six hours old. Heat, the single-owner hold-back and the fact-check hold-back are the rules in `packages/hotnews`; no model is involved.

Late is expected: GitHub can start a scheduled run several minutes late, and its file cache holds for about five minutes, so a Hot line can appear ten to twenty minutes after the first report. That is slower than a Worker would be, and it is free. `PUBLIC_HOT_FEED_URL` moves the site to a Worker later with no other change.

## Fuller Hot News (2026-11-16)

Can found a Hot story "so short, no visuals", and Hot News in general almost empty.

- **Why it was empty.** GitHub dropped nearly every run of the ten-minute cron (two runs in 19 hours on 16 November), so the feed sat for hours. And a story fell out an hour after outlets stopped adding reports, so even a running monitor showed nothing most of the time: replayed over two days of real articles, the feed was empty 69% of the time.
- **A steady monitor.** One run keeps watch for an hour, looking every five minutes, then starts the next run itself (`workflow_dispatch` from the run's own token). The hourly cron only restarts the chain if it ever breaks; the concurrency group keeps one run watching. A whole runner is busy all day, which is free on a public repository; if the repository goes private, move the monitor to a Worker first.
- **Stickier, stricter rules.** A story is promoted on its peak heat (its heat as each report arrived), and stays for six hours, so a reader who comes an hour later still finds it. A story without an urgent headline needs four owners within the hour (heat 12), so a party meeting or a football quote with three outlets stays in the bulletin. Urgent words match whole words or listed word starts ("sel" no longer matches "Selahattin", "dead" no longer matches "deadline"), and a question headline ("deprem mi oldu?") never counts. Replayed on the same two days: about 20 hot stories a day, empty a quarter of the time, mostly at night.
- **A richer page, every word an outlet's.** Under the evidence line: the lead outlet's photo, 16:9 and credited, saved next to the feed (`media/<story id>.<ext>` on the `hot-feed` branch) with the same checks as bulletin photos, never hot-linked; then the lead outlet's own description from its feed, in a faint field of the section's hue, under "NTV reports" / "NTV bildiriyor"; then the story so far; then "What each outlet reports", one card per outlet with its logo, time and own headline; then "Also breaking", the other hot stories, one line each. The rules write no text and translate nothing: a story in the other language says so in one quiet line.
