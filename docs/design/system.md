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

| Area            | Decision                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Type            | One family, Funnel. **Funnel Display** for headlines, facts and the wordmark (as **CSP Display**, our cut without the square feet on a, b, d and u); **Funnel Sans** for reading. Self-hosted. No monospace anywhere. Facts are emphasised by weight only: no underlines, no boxes.                                                                                                                                                                                                                                    |
| Colour          | Warm black (dark, the default) or paper (light). The only colour is the **edition hour**, used flat: a 3 px top edge and the current station. Evidence marks and Hot News are the only other hues.                                                                                                                                                                                                                                                                                                                     |
| Icons           | **Stations**: every icon is a station on a short line, 24 px grid, 1.75 px stroke, round caps. Filled means settled, open means waiting, a broken line means disputed.                                                                                                                                                                                                                                                                                                                                                 |
| Controls        | Own controls, never native-looking: the **Day line** toggle (rounded track with the day line inside; on fills with the hour colour and the knob becomes a filled station), a tick for the selected row, stations for choices.                                                                                                                                                                                                                                                                                          |
| Evidence        | Four marks, each with its own shape, always with its word in the reader and drawer: Confirmed, Reported, Single source, Disputed. In the Contents list the mark stands alone.                                                                                                                                                                                                                                                                                                                                          |
| Contents        | The day line set upright. Sections are stations. Each row is one **short title** (3 to 6 words with the key fact). Each section's lead story is larger and carries its visual. Read stories fold into one line.                                                                                                                                                                                                                                                                                                        |
| Story page      | Desktop: the **fact sheet**. Headline and gist, the key numbers in their own column, a three-line summary (what happened, why it matters, what's next), then the full story. Phone: the same layers, one story per screen.                                                                                                                                                                                                                                                                                             |
| Timeline        | Series stories (rate decisions, inflation…) show earlier values on the line. Every other story shows its own life: first report, outlets joining, primary source, label set, updates.                                                                                                                                                                                                                                                                                                                                  |
| Visuals         | One per story, in this order: the lead outlet's credited photo, a labelled chart (`keyNumber`), a locator map (`place`), a logo (`orgId`), or nothing. Never a stock or decorative image.                                                                                                                                                                                                                                                                                                                              |
| Evidence drawer | The **camp map**: one row per camp (government-aligned, opposition, independent, international) with a large count and each outlet by name, logo and a three-step reliability meter. An empty camp shows as an empty slot. The count is labelled as independent reports; an outlet that only republished another's text is listed without a meter and not counted, and the header total says so ("9 independent, 1 copy"), so it adds up to the evidence line's outlet count. A key under the list explains the meter. |
| Badges          | Five only: evidence mark, outlet names (up to 3, then a count), section, Developing, Updated.                                                                                                                                                                                                                                                                                                                                                                                                                          |
| Hot News        | One quiet 40 px line above the reader, in the interface language, dismissable. Never a pop-up. Its mark animates once on arrival.                                                                                                                                                                                                                                                                                                                                                                                      |
| Caught up       | Three things to remember, any open Hot story, and the next bulletin time.                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| Language        | The reader's language (English or Turkish) is set in the reader corner sheet and on the Settings page only. It sets the interface and the story version: every story is written in both.                                                                                                                                                                                                                                                                                                                               |
| Reader corner   | One button at the right end of the header: the settings mark, or the reader's avatar once signed in. It opens a sheet (bottom sheet on phones, side panel from 720px) with the account row, language, theme, text size and the reading ruler. Changes apply at once.                                                                                                                                                                                                                                                   |
| Navigation      | The bulletin name in the header opens Contents. Every story has its own URL; browser Back returns to Contents. Swipe or Next for the next story. Desktop shows Contents as a left rail and evidence as a right panel.                                                                                                                                                                                                                                                                                                  |

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

`--hour` points at the current edition's colour.

## Never

The owner's ban list for anything that reads as generated UI: glowing orbs and blurred glows, decorative gradients, purple or neon accents, monospace for flavour, uppercase micro-labels, meta lines joined with middle dots, rows of big stat numbers, pills and chips, keyboard-hint chips on screen, cards inside cards, icons in tinted squares, emoji, copy that describes the UI to the reader, and looping or pulsing animation.

## Quality bar

Every UI change ships with screenshots at 1280 dark, 390 light and 360 light; no horizontal scroll at 360, 390 and 430; text contrast of at least 7:1 for meta and AA everywhere; tap targets of at least 44 px; correct behaviour under reduced motion; and designed loading, empty, error and stale states.
