# Publishing the music edition

Music for the curious (Meraklısına müzik) is a daily edition beside the news bulletins: five songs in each of three genres, every one with the reason it is there and the measured numbers behind that reason. Can asked for it on 2026-11-23 and asked for "serious flows" to pick each day's five, not a casual list. The design is in [design/decisions/music.md](design/decisions/music.md); the format and the checks are in `packages/music`.

| Genre                 | Key      | What belongs                                                                            |
| --------------------- | -------- | --------------------------------------------------------------------------------------- |
| Hip-hop, global       | `global` | Rap by artists from outside Türkiye, in any language                                    |
| Türkçe rap            | `turkey` | Rap by Turkish artists, in Turkish or not, wherever the song charts                     |
| Techno, up to 134 BPM | `techno` | Techno with a tempo of 134 or less, read from Beatport or Deezer; never a guessed tempo |

One file a day, `data/music/<yyyy-mm-dd>.json`, published at 18:30 Istanbul time with the evening bulletin, every day of the week.

## The four steps

Steps 1, 2 and 4 are rules, with no model. Step 3 is a scheduled Claude Code task, like the bulletins, so there is no API bill.

1. **Collect** (GitHub Actions, 17:15). Reads the charts and release lists below and saves the day's snapshot on the `candidates` branch. The machine that writes the edition cannot reach these sites, which is why this runs on GitHub, like the news Collect.
2. **Enrich and score** (same job). Joins the same song across sources, finds its first release date, checks its genre and tempo, works out the signals and ranks about 25 candidates per genre, each with its evidence.
3. **Pick and write** (scheduled task, 17:30). Fills the five slots per genre from the candidates, writes the reasons in both languages and finds each song's SoundCloud page.
4. **Check and publish.** `pnpm --filter @cspnews/music check-music "$PWD/data/music"` must pass; then the pull request is merged and Vercel deploys it.

## Sources

| Genre  | Where candidates come from                                                                                                                                                                                                         | Evidence only (never a reason on its own)                                    |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| global | Apple Music US Hip-Hop/Rap top songs, Deezer rap chart, new releases of followed artists                                                                                                                                           | Spotify daily Global and US (read through kworb), Apple Music US most played |
| turkey | Apple Music Türkiye Hip-Hop/Rap top songs, Deezer Türkçe rap playlists, new releases of followed Turkish rappers                                                                                                                   | Spotify daily Türkiye (read through kworb), Apple Music Türkiye most played  |
| techno | Apple Music US Techno chart and Deezer's editors' Techno Tunnel playlist every day; Beatport Raw / Deep / Hypnotic and Peak Time / Driving whenever Beatport can be read (it answers GitHub's runners with a Cloudflare challenge) | Deezer tempo                                                                 |

Since 25 November (Can: "Music selections were bad"), a song is a candidate only when it shows up on a rap chart or a techno chart; a chart of every genre can add numbers but never brings a song in. That keeps out pop and R&B songs with a rap feature and long-running hits. For techno, Raw / Deep / Hypnotic comes first because Peak Time / Driving leans to big-room festival tracks; a Peak Time song needs a followed label or artist, or a heavy, driving sound by the writer's ear.

Hard Techno is not read: most of it is above 134 BPM. Every chart reading is saved each day, so the edition can compare a song with its own past: "plays at 4x its usual" and "back after 412 days" are measured from that history. In the first two to four weeks the history is short, so an old song qualifies mostly by coming back to a chart.

## Joining one song across sources

- The key is the ISRC when a source gives one (Deezer, Beatport). Otherwise it is the folded lead artist and title (`songKey` in `packages/music/src/song.ts`): featuring credits, "Original Mix", remaster tags and sped-up or slowed edits are the same song; a remix by another artist is its own song.
- **First release** is the earliest date that MusicBrainz, Deezer or Apple gives, so a remaster or a deluxe edition does not make an old song new.
- **Genre**: a store's genre tag must say hip-hop/rap or techno. Global or Türkiye follows the lead artist's country (MusicBrainz) and the language, so a Turkish rapper on the global chart is a Türkçe rap song.
- **Tempo** (techno): a measured BPM is required, from Beatport or else Deezer; a song whose tempo neither gives is left out. When both give one and the two differ by more than 3, the song is dropped. A reading under 100 is probably half-time and needs a second source. Over 134 is out, with no exceptions.

## Reason kinds and the five slots

| Kind       | English / Türkçe                                   | It must have                                                                                                                                 |
| ---------- | -------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `new`      | New / Yeni                                         | A first release in the last 14 days and a measured reaction: a chart place, plays, or several charts                                         |
| `climbing` | Climbing / Yükselişte                              | A first release in the last year and a better place than before on the same chart                                                            |
| `back`     | Old song, big again / Eski şarkı, yeniden gündemde | A first release 2+ years ago, and plays at 2x its usual or a chart return after 90+ days off (until 24 November a top 50 place also counted) |
| `alltime`  | All-time favourite / Tüm zamanların favorisi       | A place on the all-time list, `packages/music/data/canon.json`                                                                               |

A rap pick (other than all-time) must have at least one number from a rap chart, one whose name says hip-hop or rap; the check refuses it otherwise.

Each genre's five are **2 `new`, 1 `climbing`, 1 `back` and 1 `alltime`**. When no candidate passes a slot's rule, the slot goes to the best candidate that passes another rule; the bar is never lowered to fill a slot.

## Ranking

Within a kind, candidates rank by the strength of their numbers (chart place, plays, the size of a climb or a surge) and by breadth: how many independent sources show the song. Can's taste (`packages/music/data/taste.json`) moves the score by up to 15%, never more than the evidence: his favourite artists (Wegh first), vibing, rhyming and flexing rap of every kind, and for techno a heavy kick and heavy bass with a screaming, driving feel, never trashy or noisy. The writer also leaves out what numbers can't: intros, skits, interludes, pop songs with only a rap feature, bootleg remixes of pop songs, and more than one song from the same album unless both are big on their own.

## The all-time list

`packages/music/data/canon.json` holds the songs an `alltime` pick is drawn from, each with where its standing comes from: a published best-of list (`list`, with its address), Can's own favourite (`can`), or the editors (`editor`, until a list is checked). Can's own entries go first. On a day when an artist has news or a new release, their classic is preferred. A techno entry needs a verified `bpm` before it can be picked. Add songs there freely; the tests check every entry.

## Writing a reason

- One line, in both languages, each written natively, not translated. Names of songs, artists, labels and charts keep their own form.
- Only numbers from the pick's `evidence`, its first release year, its age and its tempo, written in digits. The check reads every number in both lines and refuses one it cannot find. Rounding is fine ("2.1 million" for 2,134,567).
- Say what happened, not how good it is: "Number 1 on Spotify Türkiye on its first day", not "a banger".

## Playing

`play.soundcloud` is the song's page on the artist's or label's own SoundCloud account, never a re-upload. The Collect confirms it embeds with SoundCloud's public oEmbed and that the uploader is the artist or the label. Without one, `play.preview` is Apple's 30-second preview, and `spotify`, `youtube` and `appleMusic` link to the full song. Every pick needs one of the two to play.

## Checks

`checkMusicEdition` (`packages/music/src/rules.ts`) refuses an edition unless:

- every genre has exactly 5 songs, no song is on the page twice (by id, folded name or ISRC), and no lead artist has two songs in one genre;
- every kind matches the dates and the numbers above;
- every number in either reason line is in the evidence (days since release and years are counted from the dates);
- techno has a sourced tempo of 134 or less, two sources agree, and a half-time reading is confirmed;
- the numbers were read at most 36 hours before publishing;
- no song was picked in the last 30 days, and no all-time pick in the last 180;
- every song can play.

The tests in `packages/music` run the same check on every file in `data/music`, so a bad edition fails CI.

## The daily run

1. **Music Collect** (`.github/workflows/music-collect.yml`, 16:30 Istanbul) reads every chart in `packages/music/src/collect/charts.ts`, adds the day to `music/history/` and writes `music/candidates/<date>.json` on the `candidates` branch: for each genre, up to 30 songs that are on a genre chart, ranked, each with its preview, cover, links, tempo, release date, short notes ("out 3 days ago", "up 12 on Apple Music Türkiye Hip-Hop/Rap", "old and only still charting: not a comeback") and the numbers a reason may quote.
2. **The writer** (a scheduled task, 17:08 Istanbul) reads that file and `packages/music/data/taste.json`, picks five per genre (two new, one climbing, one back, one all-time when the candidates allow; otherwise the best that pass), listens with the taste in mind rather than the score alone, writes `data/music/<date>.json` with a reason in both languages, runs `check-music`, and publishes it.

A song picked in the last 30 days is not picked again (all-time: 180 days), so the page changes every day.
