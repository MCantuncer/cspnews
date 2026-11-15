# The Today line

A few plain facts for the reader's day sit between the bulletin's header and the day line on the Contents screen: the lira against the dollar and the euro, gold, the weather in Istanbul, and the day's match. It answers the small questions people open another app for, so they don't leave to ask them.

- **One slim line.** This is a news platform, so the stories keep the screen: the strip is 44 px tall and slides sideways slowly, like the crawl on a TV news channel (about 40 px a second, one pass at least 32 seconds). Label, one strong figure, and a short note, all on one line. Where and when the figures were read is the last segment of the pass, once for the whole strip. It holds still on hover, focus or a tap, so a figure can be read. With reduced motion it does not slide: it is the same one line, scrolled by hand.
- **Quiet.** No arrows, no red and green, no sparkline, no "markets up". A rate is a fact, not a mood.
- **From the bulletin.** The figures are written into each bulletin (`today`, up to five) by the Write run from a page it read, so the site makes no live calls, sends nothing to a third party, and costs nothing to run. The cost is that a figure is as old as the bulletin; the time under it says so.
- **Never guessed.** If no page could be read, the item is left out, and the pull request says so. A bulletin with no items shows no Today line at all.
- **Not a story.** No evidence mark, no timeline, no page of its own.

Left out on purpose: crypto and stock tickers (they invite checking, not reading), a forecast for the week, and live scores (Hot News handles anything that breaks).
