# User stories

These stories describe what CSPNews must do for its reader. They drive the features in [features.md](features.md) and the design brief in [../design/brief.md](../design/brief.md). Each story has an ID so code, PRs and designs can refer to it.

**The reader.** One person who wants to stay aware of what matters in Turkey, in tech and AI, and in the world, without losing hours to feeds. They read on a phone during the commute and on a desktop at work. Their attention is precious and easily pulled away, so the product must keep them focused on one thing at a time and give them the most information for the least attention.

Format: _As the reader, I want …, so that …_, followed by acceptance criteria.

---

## Bulletins

**US-01 Read the morning bulletin.** As the reader, I want a complete bulletin ready at 07:30, so that I know what happened overnight before my day starts.

- Published by 07:30 Istanbul time on weekdays and weekends.
- Sections appear in order: Turkish news, Tech, Around the World.
- Turkish stories are in Turkish. All other stories are in English.

**US-02 Catch up at lunch.** As the reader, I want a short side bulletin at 12:30, so that I see what changed since the morning without rereading it.

- Contains only new stories and meaningful updates since the last main bulletin.
- Weekdays only.

**US-03 Read the evening bulletin.** As the reader, I want a full bulletin at 18:30, so that I understand how the day ended.

- Published by 18:30 Istanbul time every day.

**US-04 Catch late tech news.** As the reader, I want a side bulletin at 22:30, so that I see US tech and AI launches that happen in the Istanbul evening.

- Weekdays only.

**US-05 Finish a bulletin.** As the reader, I want each bulletin to have a clear end, so that I can stop reading with confidence that I've seen what matters.

- At most about 12 stories per main bulletin and 6 per side bulletin.
- A visible progress indicator ("6 of 12").
- A "You're caught up" screen at the end.

**US-06 Browse past bulletins.** As the reader, I want to open earlier bulletins, so that I can find something I skimmed.

- An archive by date and bulletin time.

## Focused reading

**US-10 One story at a time.** As the reader, I want to see one story at a time, so that nothing else competes for my attention.

- Phone: one story per screen, next and previous by swipe.
- Desktop: a single reading column, next and previous with `j`/`k`.
- No sidebars, ads, autoplay or "related" lists.

**US-11 Read only as deep as I want.** As the reader, I want each story in layers, so that I can stop at the depth that's enough for me.

- Layers: headline, then a 3-line gist, then the full summary, then the evidence.
- The gist is visible without a tap.

**US-12 Scan the facts.** As the reader, I want numbers, names and dates to stand out, so that I can take in a story in seconds.

**US-13 Pick up where I left off.** As the reader, I want the site to remember my place, so that an interruption costs me nothing.

- Reopening a bulletin returns to the last story I was on.
- Works without an account (stored in the browser).

**US-14 See what's new since my last visit.** As the reader, I want a short summary of what changed since I last opened the site, so that I don't have to work it out myself.

- Shows only changed stories, and folds away once read.

**US-15 Read comfortably.** As the reader, I want comfortable typography and controls, so that reading doesn't tire me.

- Lines of about 60 to 70 characters, dark theme by default, a light theme, adjustable text size.
- An optional reading ruler that dims everything except the current paragraph.
- Respects the reduced-motion setting.

**US-16 Save for later.** As the reader, I want to save a story, so that I can come back to it when I have time.

**US-17 Use the site in my language.** As the reader, I want to switch the menus and labels between English and Turkish, so that the interface feels natural.

- Switching changes interface text only. Story language follows the section rule (US-01).

## Trust and verification

**US-20 Know how solid a story is.** As the reader, I want every story to carry a clear evidence label, so that I know how much to trust it at a glance.

- Labels: Confirmed, Reported, Single source, Disputed (and Developing for Hot News).
- The label is never conveyed by colour alone.

**US-21 See the evidence.** As the reader, I want to open the evidence behind a story, so that I can judge it myself.

- Lists each source with its outlet, camp and reliability tier, with links.
- Links the primary source (statement, filing, dataset, paper) when one exists.
- Shows fact-checker verdicts when they exist.

**US-22 See both sides when sources disagree.** As the reader, I want disputed claims shown side by side, so that I'm not given one version as fact.

**US-23 Follow a developing story.** As the reader, I want a story that continues to update in place, so that I see what's new instead of a duplicate.

- Shows "updated N times today", a "what's new" line and a short timeline.
- Label changes (for example Reported to Confirmed) are visible.

**US-24 See corrections.** As the reader, I want corrections shown openly, so that I can trust the site to admit mistakes.

## Hot News

**US-30 Know about breaking news quickly.** As the reader, I want breaking news to reach me between bulletins, so that I'm never unaware of a major event.

- A story appears within about 10 minutes of breaking.
- Shown as a quiet strip at the top, never a pop-up.

**US-31 Only trustworthy alerts.** As the reader, I want Hot News held back when it rests on a single source or a disputed claim, so that speed doesn't mean misinformation.

**US-32 Optional phone notifications.** As the reader, I want to opt in to notifications for Hot News, with a daily cap and quiet hours, so that alerts stay useful and don't become noise.

## Monitoring

**US-40 See that the system is alive.** As the reader, I want a Monitor page, so that I can trust that silence means nothing happened, not that something broke.

- Shows the last check time, source health, watched candidates with their heat score, and why each was or wasn't promoted.

**US-41 Get told when something breaks.** As the owner, I want an alert when a check is missed, a feed fails for over an hour, or a bulletin is late, so that failures are never silent.

## Owner and maintenance

**US-50 Change sources without code.** As the owner, I want sources, tiers, camps and schedules in one config file, so that most changes are one line.

**US-51 Keep quality from slipping.** As the owner, I want automated checks on every change, including a verification spot-check suite, so that improvements never silently break the product.

**US-52 Switch the model provider.** As the owner, I want the AI model behind one interface, so that I can move between my Claude subscription, the paid API, another model or no model with a config change.

## Later

**US-60 Email bulletin.** As the reader, I want the bulletin in my inbox at bulletin time, so that I can read it without opening the site.

**US-61 Listen mode.** As the reader, I want to hear a bulletin read aloud, so that I can follow the news while commuting.
