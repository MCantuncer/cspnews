# Features

The feature list behind [the user stories](user-stories.md). Each feature names the stories it serves and its release stage:

- **MVP**: the first usable version.
- **Next**: right after the MVP.
- **Later**: planned, not scheduled.

## Product features

| ID   | Feature                                                                                                 | Stories        | Stage |
| ---- | ------------------------------------------------------------------------------------------------------- | -------------- | ----- |
| F-01 | Bulletin schedule: weekdays 07:30, 12:30, 18:30, 22:30; weekends 07:30 and 18:30 (Istanbul time)        | US-01 to US-04 | MVP   |
| F-02 | Three sections in a fixed order with language rules (Turkish stays Turkish, everything else in English) | US-01          | MVP   |
| F-03 | Finite bulletins: story caps, progress indicator, "You're caught up" screen                             | US-05          | MVP   |
| F-04 | Focus reader: one story per screen, swipe and `j`/`k` navigation                                        | US-10          | MVP   |
| F-05 | Layered story: headline, gist, summary, evidence                                                        | US-11, US-12   | MVP   |
| F-06 | Evidence label on every story                                                                           | US-20          | MVP   |
| F-07 | Evidence drawer: sources, camps, tiers, primary source, fact-checks                                     | US-21, US-22   | MVP   |
| F-08 | Resume position, stored in the browser                                                                  | US-13          | MVP   |
| F-09 | Interface language switch (English and Turkish)                                                         | US-17          | MVP   |
| F-10 | Themes, text size and reduced motion                                                                    | US-15          | MVP   |
| F-11 | Hot News strip with the Developing label                                                                | US-30, US-31   | MVP   |
| F-12 | Monitor page                                                                                            | US-40          | MVP   |
| F-13 | Failure alerts (email or Telegram)                                                                      | US-41          | MVP   |
| F-14 | Living stories: updates in place, timeline, label history                                               | US-23, US-24   | Next  |
| F-15 | "Since your last visit" card                                                                            | US-14          | Next  |
| F-16 | Archive of past bulletins                                                                               | US-06          | Next  |
| F-17 | Save for later                                                                                          | US-16          | Next  |
| F-18 | Reading ruler                                                                                           | US-15          | Next  |
| F-19 | Hot News notifications (web push), with cap and quiet hours                                             | US-32          | Next  |
| F-20 | Installable app with offline reading                                                                    | US-13          | Next  |
| F-21 | Email bulletin                                                                                          | US-60          | Later |
| F-22 | Listen mode                                                                                             | US-61          | Later |
| F-24 | Daily word game in English and Turkish, with streaks and stats                                          | US-70, US-71   | Next  |

## Shared systems

These systems sit under several features. They're built once and reused, so each feature stays small.

| System                  | What it does                                                                                                                              | Used by                                            |
| ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| **Source registry**     | One typed config of every source: feed URL, section, language, owner group, political camp, reliability tier                              | Collection, verification, evidence drawer, Monitor |
| **Collector**           | Fetches feeds and GDELT, normalises articles, removes duplicates                                                                          | Bulletins, Hot News                                |
| **Story grouping**      | Groups articles about the same event across outlets and languages, and folds wire copies into one source                                  | Bulletins, Hot News, living stories                |
| **Verification engine** | Computes the evidence label from independent sources, camps, primary sources and fact-checks; adds claim checks when a model is available | Every story, Hot News                              |
| **Model gateway**       | One interface for AI work (claim checks, writing, translation). Providers: Claude subscription runs (default), Claude API, none           | Verification, writing                              |
| **Story store**         | Postgres tables for articles, stories, labels and their history                                                                           | Bulletins, living stories, archive, Monitor        |
| **Scheduler**           | Runs bulletins on the schedule and the Hot News monitor every 2 minutes (4 on weekends)                                                   | Bulletins, Hot News                                |
| **Health monitor**      | Records every run, source failure and late bulletin, and sends alerts                                                                     | Monitor page, failure alerts                       |
| **Design system**       | Tokens, type, icons and components shared by every page                                                                                   | Every page                                         |
| **Reader state**        | Position, saved stories, settings and last visit, kept in the browser                                                                     | Resume, since last visit, save, settings           |
| **Localisation**        | Interface strings in English and Turkish                                                                                                  | Every page                                         |

## Out of scope for now

- Accounts and sign-in (one reader; state lives in the browser)
- Comments or social features
- Ads or tracking
