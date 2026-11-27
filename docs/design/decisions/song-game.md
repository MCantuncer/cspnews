# Daily Song (Günün Şarkısı)

A second daily game beside the word game, asked for by Can on 2026-11-27: hear a tiny piece of a song, guess it, and hear more only when you need to. The aim is to name each song with as little listening as possible.

## Rules

- Four rounds a day, one song each: **Turkish pop**, **Hip-hop**, **Rock** (all-time) and an all-time **Global hit**. The same four songs for everyone; new songs at 00:00 Istanbul time, like the word.
- Each round starts with **0.1 s**. A wrong guess or a skip opens the next clip: 1, 2, 4, 8, then 16 s.
- On the 16 s clip the round stays open: the reader may keep guessing until they name the song or press **Give up** (Can, 2026-11-27).
- Points per round by the clip the song was named on: 100, 80, 60, 40, 25, 10; a song not named is 0. The best day is 400.
- Streak: days in a row with all four rounds played, whatever the score. Stats show games played, average and best score, and how many songs were named on each clip.

## The page

`/song` (Turkish `/tr/song`), reached from the header's **Games** place (Oyunlar, formerly Word) and from a **Word · Song** switch at the top of both game pages. Under the switch, the four rounds stand as stations on the day line, each in its genre colour; a filled station is a song named, a hollow one a song missed, and the points sit under it.

The stage, in a phone-wide column: one large round play button (it turns into a stop square while the clip plays, so a clip can always be cut short), then the clip bar. The bar runs from 0 to 16 s on a square-root scale, so 0.1 s is a visible sliver and 16 s is the full width; the part the reader may hear is shaded, and the clip being played fills it in ink. Under it, the tries as slim lines: the clip length at the left, then "Skipped", a struck-through wrong guess, or the right answer on the word game's green. Then the guess box with suggestions opening upward, and two buttons: **Skip, +1 s** (it names how much more you will hear) and **Guess**. On the last clip, Skip becomes **Give up**.

After a round: a card with the cover, the verdict ("Named in 1 s" in the confirmed green, or "Not this time"), the title in the headline face, artist and year, and the round's points. Under it, **The full song** with three pill links: YouTube first (free, no account), then Spotify and Apple Music. YouTube and Spotify open a search for the song, which always finds the official version, without an API key or a list of video ids to keep up to date; Apple Music links the exact track. The play button now plays the whole 30-second preview.

After the fourth round: the score large in the headline face ("280 of 400"), one calm line by score (no exclamation marks, same tone as the word game), the four songs with the clip each was named on and the points, the streak, **Send to a friend**, and the countdown to the next songs.

## Playing against a friend

**Send to a friend** shares a link such as `/song?vs=20261127-13x2`: the day and the try each song was named on (`x` for missed). Nothing else is stored anywhere. A friend who opens it sees "A friend scored 240 on today's songs. Your turn." above the rounds, plays the same four songs, and their score screen shows both scores side by side with the higher one outlined and one line: "You win.", "Your friend wins this one." or "A tie." A link from another day says which day it was for and invites them to play today's.

## Clips

Clips are Apple Music's 30-second previews, played straight from Apple (`audio-ssl.itunes.apple.com` answers with `Access-Control-Allow-Origin: *`, checked 2026-11-27). The page fetches the preview once and decodes it with Web Audio, so a 0.1 s clip starts and stops on the sample; an `<audio>` element paused by a timer drifts by tens of milliseconds, which is most of a 0.1 s clip. 4 ms fades keep the cut from clicking. If a browser cannot decode it, an audio element stopped on every animation frame is the fallback.

Apple's previews fade in, so each song carries a `start`: the first moment, at least 1 s in, where the sound is at its usual level and stays there. It is measured once when the song joins the pool (`packages/songgame/scripts/resolve-songs.js`, ffmpeg loudness every 50 ms).

## The songs

Hand-picked songs most listeners know within seconds, one file per genre in `packages/songgame/data/picks/` (`Artist | Title`). The Song Pool workflow finds each one on Apple, measures its start and commits `packages/songgame/data/songs/<genre>.json` in play order: songs already there keep their day, new ones are shuffled with a fixed seed and appended. Songs Apple does not have are listed in `missing.txt`. The guess box offers every answer plus other well-known songs by the same artists (`catalog.json`), so the answer is never the only name to pick. A list that runs out starts over from the top, so the game never stops; add picks before that happens.

## Words

| English             | Türkçe                   |
| ------------------- | ------------------------ |
| Daily Song          | Günün Şarkısı            |
| Games · Word · Song | Oyunlar · Kelime · Şarkı |
| Turkish pop         | Türkçe pop               |
| Global hit          | Dünya hiti               |
| Play 0.1 s          | 0,1 sn dinle             |
| Skip, +1 s          | Geç, +1 sn               |
| Give up             | Pes et                   |
| Named in 1 s        | 1 sn dinleyip bildin     |
| Not this time       | Bu sefer olmadı          |
| The full song       | Şarkının tamamı          |
| Send to a friend    | Arkadaşına gönder        |
