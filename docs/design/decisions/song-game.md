# Daily Song (Günün Şarkısı)

A second daily game beside the word game, asked for by Can on 2026-11-27: hear a tiny piece of a song, guess it, and hear more only when you need to. The aim is to name each song with as little listening as possible.

## Rules

- Four rounds a day, one song each: **Turkish pop**, **Hip-hop**, **Rock** (all-time) and an all-time **Global hit**. The same four songs for everyone; new songs at 00:00 Istanbul time, like the word.
- Each round starts with **0.1 s**. A wrong guess or a skip opens the next clip: 1, 2, 4, 8, then 16 s.
- On the 16 s clip the round stays open: the reader may keep guessing until they name the song or press **Give up** (Can, 2026-11-27).
- Points per round by the clip the song was named on: 100, 80, 60, 40, 25, 10; a song not named is 0. The best day is 400.
- Streak: days in a row with all four rounds played, whatever the score. Stats show games played, average and best score, and how many songs were named on each clip.

## The page

`/song` (Turkish `/tr/song`), reached from the header's **Games** place (Oyunlar, formerly Word) and from a **Word / Song** switch at the top of both game pages, with the help and stats icons on the same row.

Redesigned the same day after Can found the first version "amateur", "like a Notepad app from 2010 which also can record audio". The page is now built around the sound itself:

- **Progress**: four thin segments in the genre colours fill as the rounds end. Under them, the round's genre as one large title ("Turkish pop", "Global hit") and "1 of 4" at the right. No numbered list of four labels, which wrapped on phones.
- **Waveform**: 56 bars drawn from the song's real loudness over its first 16 s, on a square-root time scale so 0.1 s is a visible sliver. Bars the reader may hear are in ink, the rest faded; the clip being played lights up as it plays. Clip marks (0.1, 1, 2, 4, 8, 16 s) sit under the bars, the open one in bold.
- **Controls**: a 64 px round play button (a stop square while playing) beside the clip length in the headline face. At the far end of the row, **Skip**: its name over what it opens ("+0.9 s") beside an outlined ring with the skip mark, so Play is the filled circle and Skip the outlined one. On the last clip it reads **Give up** with a flag. The clip marks under the waveform already show the tries left, so there are no separate marks for them.
- **Tries**: plain rows with a mark (skip arrow, red cross, green tick), the guess, and the clip length at the right.
- **Guess box**: one tall field with a search icon and the submit arrow inside it; at most four suggestions open upward so the waveform stays in view.
- **After a round**: a 112 px cover beside the verdict ("Named in 1 s" in green, or "Not this time"), the title, artist and year; the points large; **The full song** with three underlined links (YouTube first, free and no account, then Spotify and Apple Music; YouTube and Spotify open a search, Apple links the exact track); and **Next song**. The play button now plays the whole 30-second preview.
- **Score**: the day's score very large ("340 of 400"), one calm line by score, then one row per song with its cover, a meter of how much was heard in the genre colour, the clip length and the points; the streak as a sentence; **Send to a friend**; and the countdown to the next songs.

## Playing against a friend

**Send to a friend** shares a link such as `/song?vs=20261127-13x2`: the day and the try each song was named on (`x` for missed). Nothing else is stored anywhere. A friend who opens it sees "A friend scored 240 on today's songs. Your turn." above the rounds, plays the same four songs, and their score screen shows both scores side by side, the higher one with an ink bar above it, and one line: "You win.", "Your friend wins this one." or "A tie." A link from another day says which day it was for and invites them to play today's.

## Clips

Clips are Apple Music's 30-second previews, played straight from Apple (`audio-ssl.itunes.apple.com` answers with `Access-Control-Allow-Origin: *`, checked 2026-11-27). The page fetches the preview once and decodes it with Web Audio, so a 0.1 s clip starts and stops on the sample; an `<audio>` element paused by a timer drifts by tens of milliseconds, which is most of a 0.1 s clip. 4 ms fades keep the cut from clicking. If a browser cannot decode it, an audio element stopped on every animation frame is the fallback.

Apple's previews fade in, so each song carries a `start`: the first moment, at least 1 s in, where the sound is at its usual level and stays there. It is measured once when the song joins the pool (`packages/songgame/scripts/resolve-songs.js`, ffmpeg loudness every 50 ms).

## The songs

Hand-picked songs most listeners know within seconds, one file per genre in `packages/songgame/data/picks/` (`Artist | Title`). The Song Pool workflow finds each one on Apple, measures its start and commits `packages/songgame/data/songs/<genre>.json` in play order: songs already there keep their day, new ones are shuffled with a fixed seed and appended. Songs Apple does not have are listed in `missing.txt`. The guess box offers every answer plus other well-known songs by the same artists (`catalog.json`), so the answer is never the only name to pick. A list that runs out starts over from the top, so the game never stops; add picks before that happens.

## Words

| English             | Türkçe                   |
| ------------------- | ------------------------ |
| Daily Song          | Günün Şarkısı            |
| Games / Word / Song | Oyunlar / Kelime / Şarkı |
| Turkish pop         | Türkçe pop               |
| Global hit          | Global hit               |
| Play 0.1 s          | 0,1 sn dinle             |
| Skip, +1 s          | Geç, +1 sn               |
| Give up             | Pes et                   |
| Named in 1 s        | 1 sn dinleyip bildin     |
| Not this time       | Bu sefer olmadı          |
| The full song       | Şarkının tamamı          |
| Send to a friend    | Arkadaşına gönder        |
