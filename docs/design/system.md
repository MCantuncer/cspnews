# Design system: Meridian

The approved design for the CSPNews website. It answers the [design brief](brief.md) and is the reference for every UI change. The rendered mockups live in [`mockups/`](mockups/): open them in a browser.

| Mockup                             | What it shows                                                                                                      |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| [`board.html`](mockups/board.html) | Every screen: Contents, story page (phone and desktop), evidence drawer, Hot News, Developing, caught up, Settings |
| [`icons.html`](mockups/icons.html) | The Stations icon set and controls, at 16, 20 and 24 px in both themes                                             |
| [`type.html`](mockups/type.html)   | The type options that were compared (Funnel was chosen)                                                            |

The stories in the mockups are illustrative, not real reporting.

## The idea

**The bulletin is one line through the day.** Four bulletins are four stations on a plain line (07:30, 12:30, 18:30, 22:30). The line sits under the header on every screen, stands upright as the spine of the Contents list, carries a story's timeline, and every icon is a small station on a piece of it. Identity comes from this structure, strong type and generous space, never from light effects.

## Decisions

Each design decision lives in its own file in [`decisions/`](decisions/), named after its area (`decisions/contents.md`, `decisions/follow.md`). A new area is a new file. Nothing lists the files, so two pull requests that each add or change a different area never touch the same lines. Keep prose out of tables there too: the formatter re-pads every row when one cell changes.

## Tokens

Values are taken from the mockups. Components use tokens only, never raw colours.

| Token      | Dark      | Light     | Use                       |
| ---------- | --------- | --------- | ------------------------- |
| `--bg`     | `#11100e` | `#f7f4ee` | Page                      |
| `--surf`   | `#1c1a17` | `#ffffff` | Drawers, panels           |
| `--ink`    | `#f5f0e8` | `#12100d` | Headlines, primary text   |
| `--ink2`   | `#e2dbcf` | `#2b2722` | Body text                 |
| `--meta`   | `#c9c2b6` | `#48423a` | Meta lines (at least 7:1) |
| `--line`   | `#2f2b27` | `#e0d9cd` | Hairlines                 |
| `--line2`  | `#6a6258` | `#9a9183` | The day line, outlines    |
| `--conf`   | `#7cc48f` | `#1d7339` | Confirmed                 |
| `--rep`    | `#e2dbcf` | `#2b2722` | Reported                  |
| `--single` | `#e0ad4c` | `#835700` | Single source             |
| `--disp`   | `#d26a5c` | `#a5402f` | Disputed                  |
| `--hot`    | `#ff5c45` | `#b3261e` | Hot News                  |
| `--dawn`   | `#e9b04a` | `#8a5a00` | 07:30 edition             |
| `--noon`   | `#d9c79a` | `#6b5e3a` | 12:30 edition             |
| `--dusk`   | `#f39a4a` | `#b5531a` | 18:30 edition             |
| `--night`  | `#86a2ea` | `#3a5bb0` | 22:30 edition             |

Section hues:

| Token          | Dark      | Light     | Use             |
| -------------- | --------- | --------- | --------------- |
| `--sec-turkey` | `#f08a72` | `#a8432c` | Türkiye section |
| `--sec-tech`   | `#7fb3f0` | `#1f5f9e` | Tech section    |
| `--sec-world`  | `#62c2b2` | `#13695d` | World section   |

`--hour` points at the current edition's colour; `--sec` at the section's hue inside `data-section`.

## Never

The owner's ban list for anything that reads as generated UI: glowing orbs and blurred glows, decorative gradients, purple or neon accents, monospace for flavour, uppercase micro-labels, meta lines joined with middle dots, rows of big stat numbers, pills and chips, keyboard-hint chips on screen, cards inside cards, icons in tinted squares, emoji, copy that describes the UI to the reader, and looping or pulsing animation.

## Quality bar

Every UI change ships with screenshots at 1280 dark, 390 light and 360 light; no horizontal scroll at 360, 390 and 430; text contrast of at least 7:1 for meta and AA everywhere; tap targets of at least 44 px; correct behaviour under reduced motion; and designed loading, empty, error and stale states.
