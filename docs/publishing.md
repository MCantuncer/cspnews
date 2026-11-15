# Publishing a bulletin

How one bulletin goes from news feeds to the live site. Rules do the collecting; the Verify and Write run (a scheduled Claude Code task) does the reading and writing. Run everything from the repository root with Node 22 or newer, after `pnpm install && pnpm build`.

1. **Collect.** `pnpm --filter @cspnews/pipeline prepare-bulletin "$PWD/data/candidates"` reads every feed, groups and labels the stories and writes `data/candidates/<yyyy-mm-dd>-<slot>.json`.
2. **Verify and Write.** Read the candidates, open the articles, and write `data/bulletins/<yyyy-mm-dd>-<slot>.json` in the format of `packages/core/src/story.ts`:
   - stories in section order (Türkiye, Tech and AI, Around the World);
   - every story in both languages under `versions.en` and `versions.tr`, and `sourceLanguage` set to the language most of its sources used. See "Writing in two languages" below;
   - only facts from the candidate articles, each claim and quote attributed to its outlet;
   - a story that is in an earlier bulletin again is either left out or written as a continuing story; see "Continuing stories" below;
   - fill the parts the pages are built around: `facts` on every story, and `keyNumber`, `series` and `place` wherever the story has them. See "Filling every part" below. A part is left out only when the sources really don't support it, never to save time;
   - write the **Today line** (`today`): up to five plain facts for the reader's day, each read from a page, never from memory. See "The Today line" below;
   - write the **quiz** (`quiz`): exactly three questions about stories of this bulletin, for the caught-up screen. See "The quiz" below;
   - keep each candidate's label, sources, timeline and `image` (the photo the rules picked, with its credit). Don't drop an `image` on a guess: the writing run can't see photos, and the rules already leave out logos, icons, small thumbnails and photos with an outlet logo stamped on them (step 3). Drop it only when the article itself says the picture is a logo, a document or an illustration.
   - write **And finally** (Spotlight) and **Transfers** from `desks.light` and `desks.transfers`, and **Turks abroad** (`abroad`) from `desks.abroad`. See "And finally and Transfers" and "Turks abroad" below. These are part of every bulletin, not extras: read every candidate on each desk before deciding. Leave a part out only when no candidate passes its bar, and say so in the pull request.
3. **Save the photos.** In a pull request the Bulletin photos workflow does this and adds the photos to the branch. By hand: `pnpm --filter @cspnews/pipeline save-media "$PWD/data/bulletins/<file>.json"` downloads each story's photo to `data/bulletins/media/<story id>.<ext>`. When the feed only carried a thumbnail (under 800 px wide), the article's own full-size photo is saved instead and the bulletin's image URL is updated, unless that photo has a logo or banner drawn over it. A photo still under 400 px wide is not saved. A photo that fails is reported and the story falls back to its next visual.
4. **Save the outlet logos** (first time, then when sources change). In a pull request that changes `packages/config/src/sources.ts`, the Outlet logos workflow (`.github/workflows/logos.yml`) does this and adds the new logos to the branch; it can also be started by hand from the Actions tab. By hand: `pnpm --filter @cspnews/config fetch-logos "$PWD/data/bulletins/media/logos"`. Logos already saved are kept; add `--refresh` to fetch them all again. The site shows `svg`, `png` and `webp` logos; convert any other format to `png`.
5. **Check.** `pnpm --filter @cspnews/web build` validates every bulletin with `parseBulletin` and fails on a bad file. Then `pnpm --filter @cspnews/pipeline check-parts "$PWD/data/bulletins/<file>.json" <candidates file>` lists every part left empty: stories with no facts or no visual, and Spotlight, Transfers or Turks abroad missing although their desk had candidates. It never fails. Go back and fill each line from the sources, then list whatever is still empty in the pull request with the reason ("no number in any source", "all 14 light candidates were work news"). Look at the result with `pnpm --filter @cspnews/web dev`.
6. **Publish.** Commit `data/bulletins` (JSON and `media/`) to `main`. Vercel deploys it; nothing else is needed.

`data/candidates` is a working file for step 2 and is not committed.

## How it runs by itself

The machine that writes the bulletin cannot reach news sites, so the two steps that need them run on GitHub:

- **Collect** (`.github/workflows/collect.yml`) runs step 1 and saves `candidates/<yyyy-mm-dd>-<slot>.json`, plus the readable text of the articles in `<yyyy-mm-dd>-<slot>.articles.json`, on the `candidates` branch. The branch also holds a `vercel.json` that turns Vercel deployments off for it, because it shares no history with `main`.
- **The Verify and Write run** is a scheduled task that starts forty minutes before each bulletin (the two main bulletins every day, the two side bulletins on weekdays). Its first action is to start Collect, because GitHub's own timer runs late or not at all; the timer in the workflow stays only as a backup, and Collect can also be started by hand from the Actions tab. The run then reads the new pair from the `candidates` branch, writes the bulletin, runs step 5 and opens a pull request with only the bulletin file.
- **Bulletin photos** (`.github/workflows/bulletin-photos.yml`) runs step 3 on that pull request and adds the photos to its branch.
- The run then merges the pull request, which is step 6.

## Continuing stories

A story that ran in a bulletin of the last three days and has new facts today is written once more, as a continuation, never as a fresh story. Readers who read the earlier bulletin should see at once what is new, and a story must never repeat what they already know.

- **Finding them.** A candidate that shares an article with an earlier story carries `continues` (`storyId`, `bulletin`, `title`, `sharedArticles`): the same story again, probably. It points at the newest report of that story. Also skim the titles of the last three days of `data/bulletins/` for stories the hint missed (outlets that wrote it fresh share no article).
- **Real news since? Write it as a continuation.** Set `continues` on the story to the earlier story's id, and write `versions.en.news` and `versions.tr.news`: one sentence, at most 160 characters, saying the new fact itself ("The fund payouts passed ₺161bn", "Kulaksız's suspect was caught in Ankara"), never "an update" or "new developments". The summary and body tell the whole story as it stands now, with the new fact first in the body. Keep the earlier story's section: the same story never moves between sections.
- **Nothing new? Leave it out.** An outlet writing the same thing again, a longer version, or a new quote that adds no fact is not news. A story with nothing new does not appear twice.
- **Not the same story?** A shared article can be a roundup. When the candidate is really another story, ignore the hint and write it as usual, with no `continues`.
- **What the site does.** The story page opens with the `news` line under "New since the evening bulletin", and lists the earlier reports under "Story so far". The earlier story's page links to the newer report, and a reader who follows the earlier story gets the new one in "Since you last read", with the `news` line. The build stops when `continues` names a story that does not exist, was not published earlier, or is already continued by another story.

## Filling every part

The story page, the Contents list and the one-minute page are designed around four optional parts of a story (`packages/core/src/story.ts`). When they are missing, the desktop story page has an empty column and a story without a photo has no picture at all. So look for each of them in every story. Everything still comes from the candidate articles: a part with nothing behind it stays out.

- **`facts`: every story, two to five.** The numbers and hard details a reader would repeat to someone: an amount, a count, a date or deadline, a score, a percentage, a distance. Almost every news story has at least two. `label` says what the value is in a few words, `value` is short enough to read large ("₺6,000", "245", "22:45", "15 Nov"), `source` names who gave it (the outlet, or the institution the outlet cites). Don't repeat the headline's number alone; add the ones around it. A story with truly no number or date (rare) has no facts.
- **`keyNumber`: when the story is about a number that changed.** A rate, a price, a fine, a toll, a poll share, a ranking: `before` and `after` as plain numbers, with the `unit` and the `source`. Both values must be in the articles. It draws the small chart, and it is the story's picture when there is no photo.
- **`series`: when the story is one step in a run.** Earlier values of the same thing, oldest first, ending with today's: the last rate decisions, the earlier rounds of talks, the previous launches. Use it only when the articles give the earlier dates and values; never fill it from memory.
- **`place`: when the story happened somewhere a reader may not be able to point to**, and always when the story has no photo and no key number. `name` is the town or site, `region` the country or province, `lat` and `lon` the town's coordinates to two decimals. The place must be named in the articles; its coordinates are reference data, so use the town's own, never a guessed spot inside it.

Both languages carry the same parts with the same numbers, dates and coordinates; the build checks this.

## The Today line

`today` holds up to five plain facts for the day (format in `packages/core/src/today.ts`, design in `docs/design/decisions/today-line.md`). They are shown on the bulletin's Contents screen, above the day line. Every figure is read from a page during this run, and written with where and when it was read; if no page could be read, leave the item out and say so in the pull request. A number from memory, from an older bulletin or from a search snippet is never allowed: a wrong rate is worse than no rate.

In this order, when available:

1. `fx`: the US dollar and the euro against the lira, from the Central Bank's page (`https://www.tcmb.gov.tr/kurlar/today.xml`, the foreign-exchange selling rate). `value` like `34.21 ₺`, `source` `TCMB`.
2. `gold`: gram gold in lira, from a Turkish market page that shows the day's price. `value` like `3,120 ₺`.
3. `weather`: Istanbul now, from Open-Meteo or the Meteorology Service (MGM). `value` like `14°C`, `note` the sky in a few words in each language.
4. `match`: the one match of the day a reader would ask about that is not already on the Tonight list (the Türkiye A national team, Turkish clubs in Europe and Turks abroad belong there): the Süper Lig's biggest match, or else a top European fixture, from the sports candidates. `label` the fixture ("Türkiye – France"), `value` the kick-off time in Istanbul ("22:45"), `note` the competition. Leave it out on a day with no such match.

`label` and `note` are written in both languages; `value` is the same in both. `asOf` is when you read the page, with the Istanbul offset.

## The quiz

`quiz` holds exactly three questions (format in `packages/core/src/quiz.ts`, design in `docs/design/decisions/caught-up.md`). Each has a `storyId` (a story of this bulletin, from any section), three `options` in each language, and `answer`, the number of the right option counted from 0, the same in both languages, so write the options in the same order.

- Ask about something the reader can only know from reading the story: a number, a name, a place, what was decided. Take the answer from the story's summary or facts, so the page can be checked.
- Three different stories, and not all from one section. Never ask about death tolls, victims or anything the reader could find upsetting to get wrong.
- Wrong options are plausible and short (at most 80 characters), and never a joke. Don't use "all of the above", and don't put the right answer first every time.
- Questions are at most 140 characters and written natively in each language, not translated.

## The mix of stories

Readers should find the day's money and AI news, not only politics and football. Before settling the story list, look through the candidates for these and say in the pull request when one is left out and why.

- **Economy.** Every bulletin has at least one economy story when any candidate covers it: rates, prices, wages, the lira, markets, a big company's results, a trade deal. Türkiye gets one from the economy feeds (Anadolu Ajansı Ekonomi, Bloomberg HT); Around the World gets one from the business feeds (BBC Business, The Guardian Business) when the news is global. Prefer the story that changes what a household or a business pays or earns.
- **AI.** Tech and AI is mostly about AI: take the AI category feeds (The Verge AI, The Guardian AI, OpenAI, DeepMind, Hugging Face) before general gadget news. A new model, a court ruling, a chip shortage, a company reversal. Skip launch-day hype with no number or source behind it.
- **Around the World is not two outlets.** Look at Euronews, DW, France 24, NPR and SCMP as well as BBC and Al Jazeera, and when the same event is in several, write it from the widest set so the evidence drawer shows them all.
- **Headlines are short.** `title` is at most 12 words and `shortTitle` at most 6. Lead with the new fact or the number, not the person's title or the place: "Rate held at 35%", not "Central Bank's Monetary Policy Committee decides to keep policy rate unchanged". Cut the second clause: it belongs in `summary.what`.

## Writing in two languages

Every reader gets the whole bulletin in their own language, so both versions must read as if a good editor wrote them in that language. They are two versions of one story, not an original and a copy.

- **Write each version from the sources**, not from the other version. Read the articles in their own language and write the Turkish version as a Turkish newsroom would and the English one as an English newsroom would: natural word order, the usual terms (_politika faizi_, _policy rate_), no calques. Translating one version into the other is the fallback, never the plan.
- **Same story, same facts.** Both versions carry the same claims, attributions, numbers, dates, names and quotes, in the same order of importance. The build checks the parts it can (the same optional parts, facts, series dates, key numbers, places and quoted outlets); the rest is on the writer.
- **Names and numbers.** Keep people's names exactly as the sources spell them, with Turkish letters (Kavcıoğlu, not Kavcioglu). Write numbers the way each language does: `%31,5` and `1,2 milyar avro` in Turkish, `31.5%` and `€1.2 billion` in English. Give institutions their usual name in each language, and explain once what a Turkish institution is for English readers (_the banking regulator BDDK_).
- **Terms of art stay as they are.** A nickname, product name or piece of jargon that the field itself uses in English stays in its original form in the Turkish version, in quotation marks or italics the first time, with a short Turkish explanation if a reader might not know it. Translate only what Turkish readers already say in Turkish (_faiz_, _roket_, _yapay zekâ_). Examples: SpaceX's tower arms are _“chopsticks”_ (kulenin “chopsticks” denen mekanik kolları), never _yemek çubukları_; _Mechazilla_, _Starship_, _Super Heavy_, _Falcon 9_; _large language model_ may be glossed once as _büyük dil modeli (LLM)_, but _ChatGPT_, _Copilot_, _vibe coding_ and _jailbreak_ stay as they are; in sport, _VAR_, _hat-trick_ and _Champions League_ follow Turkish usage (_VAR_, _hat-trick_, _Şampiyonlar Ligi_). When unsure, keep the original term and add a brief explanation in parentheses.
- **Quotes.** Translate a quote faithfully, never paraphrase it inside quotation marks, and set `"translated": true` on every quote that is given in another language than the speaker used. A quote the source itself translated (a Spanish speaker quoted in English) is marked in both versions.
- **Length.** Turkish needs about a fifth fewer words for the same text, so the body is 300 to 700 words in English and 240 to 560 in Turkish (`BODY_WORDS`).
- **Timeline updates** carry their note in both languages: `"note": { "en": "…", "tr": "…" }`.

Hot News is not written by the Write run (it runs on rules only), so a Hot story shows the lead outlet's headline in its own language until the next bulletin covers it.

## And finally and Transfers

Two parts sit outside the news sections, in `andFinally` and `transfers` (format in `packages/core/src/extras.ts`, design in `docs/design/decisions/and-finally.md` and `transfers.md`). Their candidates come from sources that feed only these desks, in `desks.light` and `desks.transfers` of the candidates file.

**And finally** holds at most four items in all:

- `light`: real magazine news (magazin), the kind a reader opens and passes on to a friend. **The bar is jaw-dropping:** the reader should think "no way" on reading the headline. Every item stands on one hard, surprising fact: a figure, a price, a name. "The national team coach earns X a year" passes. "A star talks about her new role" does not, however famous she is. Mildly nice or mildly interesting is not enough, so leave it out. A story about a person must be **gossip about their life, not news about their work**, and it must fit one of these:
  - **Love:** a romance confirmed, denied, spotted or ended; an engagement or wedding.
  - **Money:** a price tag on something they own, bought, wore or spent (a watch, a car, a house, a bill).
  - **Spat:** a public row or feud, on social media or face to face.
  - **Look:** a red-carpet, award-night or fashion moment people are talking about.
  - **Seen:** where and with whom they were seen, a holiday, a surprising sighting.
  - **Viral:** a post, video or on-stage moment that went round.

  Other light stories may only be **odd** news (a strange record, a bizarre event) or **animals**. The field doesn't matter: screen, music, sport, business and politics people all count. Never magazine, however soft it looks: anything about their work, such as a new series, film or album, a role, a cast change, a plot, a set visit, a premiere, an anniversary or tribute, a veteran meeting a newcomer, an interview about a job, ratings, broadcast rights or business deals. Never a story the news sections carry as news. For example, Hülya Koçyiğit meeting the actress who plays her old role in a new series is work news, so leave it out. The test before writing an item: name its kind from the list above in one word. If you can't, leave it out. The candidates file already leaves out stories that three or more news owners carry, and obvious heavy topics, but read every candidate against this test.

- Turkish outlets publish two or three stories like this every six to eight hours, so aim for three and look through the whole light desk before settling for fewer. Still, two good items beat four dull ones, and none beats filler: leave `light` empty rather than pad it, and leave `andFinally` out of the bulletin when nothing passes. Items must be Confirmed or Reported. The `title` and `gist` are written straight and lead with the person and the detail. The `aside` is one line of wit in our own voice, at most 140 characters: dry, about the situation, never about a person's looks, body, age, accent, health or family, never about a private person, no emoji. Write a separate joke in each language rather than translating one.
- Every light story opens on its own page on our site, not on the outlet's, so always write `story`: two to four short paragraphs, about 100 to 200 words in each language. Put the jaw-dropping fact first, then who, how it came out and what each outlet says, with each claim attributed and no stock phrases. Use only facts from the sources, and keep the joke in the `aside`.
- `rumours`: magazine talk we could not confirm, each with `heardFrom`, the outlet that is saying it: who is said to be dating whom, who was seen with whom, a rumoured split or feud between public figures. Leave out a rumour about health, pregnancy, cheating, violence or a court case, a rumour that accuses anyone of a crime, a rumour about a child, and any rumour about a private person.
- Never put death, illness, crime victims, children, disasters or war in And finally, however odd the story is.
- Give every item a `kind` for its badge: `screen`, `music`, `people`, `odd`, `animals` or `town`. Give a light story an `image` when one of its sources has a real news photo (same rules as a story photo), and keep the `gist` to one sentence.

**Transfers** covers moves to clubs in the Süper Lig, Premier League, LaLiga, Serie A, Bundesliga, Ligue 1, Eredivisie and Primeira Liga, at most six per bulletin: the ones that moved forward since the last bulletin.

- `stage` is the furthest stage a confirming report supports: `talk` (an outlet links the player with the club), `talks` (negotiations), `agreed` (fee or terms agreed), `signed` (the buying club announced it). Only the club's own announcement makes a move `signed` with `clubConfirmed: true`.
- `steps` repeat the stages of the move that earlier bulletins showed, with the day each stage was first reported, and add the new one. `reports` list each outlet with the stage it reported and the day.
- `now` says where the move stands. `signedWhen` says what would make it signed, until it is. `facts` give at most two numbers (fee, contract length) only when an outlet reports them.
- Always write `story` in both languages: two to four short paragraphs (about 120 to 220 words in all) that read like a short story, not a list of claims. Say who the player or coach is and why the move matters to both clubs, how it came about, what each outlet says (attributed), and what happens next. Use only facts from the articles; no stock phrases like "the move is expected to be completed soon".
- Give the move an `image` when one of its articles has a real news photo of the player or coach (same rules as a story photo). The row in Contents and the move's page show it.
- A gossip column that only names a player with no detail is too thin for a move: leave it out rather than write a story around one line.
- A move whose talks broke down leaves Transfers. Football rumours go to Transfers, never to And finally.

## Turks abroad

`abroad` follows Turkish people in other countries (format in `packages/core/src/abroad.ts`, design in `docs/design/decisions/turks-abroad.md`): athletes in foreign leagues, and scientists, artists, founders and young talents when they reach a milestone (a prize, a paper in a major journal, a record, a first, a new role). The candidates in `desks.abroad` are stories that name someone on the watch list in `packages/config/src/abroad.ts` or use a phrase that points at a Turk abroad ("Türk bilim insanı", "Turkish-born"), from any source, with the ids of the people they name in `people`. Look hard for young talents: they are rarely on the list.

- At most six people per bulletin, one item each: the ones with news since the last bulletin (a game, a record, an injury, a move, an award). Most important first. A plain appearance with nothing to tell is not news; leave the person out.
- Check that the person still plays or works outside Türkiye before writing. A player who moved to a Turkish club leaves Turks abroad (tell the owner the watch list needs updating). You may add someone who is not on the list when outlets clearly cover a Turkish person abroad.
- `label` is `confirmed` or `reported` only. A score or a statistic needs the league's own box score or two outlets.
- `person` is the name as they write it, with Turkish letters. `where` names the club and league ("Houston Rockets, NBA") or the sport and tour ("Tennis, WTA tour" / "Tenis, WTA turu").
- `title` is one line for Contents with the result first ("28 points and 12 rebounds as the Rockets beat the Lakers"). `headline` is the page's headline. `story` is one to four short paragraphs: what happened, what was said (attributed), what it means for the season.
- `score` is the final score of the game the item is about, with `playedAt`, the time it started. The site shows times in Istanbul time, so a night game in America reads as the hour it was here. `nextAt` and `next` (where: "At Denver" / "Denver deplasmanında") give the next game when an outlet or the league's schedule says it.
- `kind` is the sport or field: `basketball`, `football`, `volleyball`, `tennis`, `motorsport`, `sport` (other sports), `science`, `tech`, `arts` or `business`. Set `rising: true` for a young talent on the way up, and `age` when it matters.
- `stats` holds the person's own numbers in the game, laid out by sport (`sport` must match `kind`). Fill only what a source gives (the league's box score first): basketball `points`, `rebounds`, `assists` and if given `minutes`, `steals`, `blocks`, `fieldGoals`/`threes`/`freeThrows` as `{made, tried}`, `plusMinus`; football `goals`, `assists` and if given `minutes`, `shots`, `shotsOnTarget`, `keyPasses`, `passAccuracy`, `saves`, `rating` (name the outlet that rated); tennis `opponent`, `sets` as `{us, them, tiebreak?}` from the person's side, `aces`, `doubleFaults`, with the round in `event`; volleyball `points`, `attacks`, `blocks`, `aces`, `sets`; racing `position` (left out for a DNF), `grid`, `gap`, `points`, `standing`, with the race in `event`.
- For someone outside sport, set `milestone` (`award`, `paper`, `record`, `first`, `role` or `work`) and `versions.*.milestone` with its `name` (the prize, the paper's title, the record) and one line of `detail`.
- `form` lists up to five recent games, oldest first, with the result for their side and their own number in each (points for a basketball player, goals and assists as "1+1" for a footballer), and `formOf` says what the number counts. Only when a source gives every game; never guess one.
- `facts`: at most two numbers worth showing large (a season high, a ranking).
- Keep nicknames, team names and sports terms as the sources use them ("double-double", "Alpi"); explain one only when a Turkish reader would not know it.
- Give the item an `image` when one of its articles has a real news photo of the person.

## When an edition is late

- **On the site.** The end-of-bulletin line is corrected in the browser: ten minutes after the next edition was due with nothing published it reads "The 22:30 edition is running late", and after six hours "No newer edition has been published yet" (`apps/web/src/lib/next-edition.ts`).
- **For the owner.** `.github/workflows/late-edition.yml` runs 20 minutes after each slot and checks that the edition's file is on `main` (`pnpm --filter @cspnews/pipeline check-edition "$PWD/data/bulletins"`). A missing edition opens one issue labelled `late-edition`, which GitHub emails to the repository owner, and the issue closes itself when an edition is next on time. The check is off until the repository variable `LATE_EDITION_ALERT` is set to `on`.
