# Music for the curious (Meraklısına müzik)

A daily music edition beside the news bulletin, asked for by Can on 2026-11-23: "similar layout as current", with only music, three genres and the reason each song is there. How the songs are picked is in [docs/music.md](../../music.md). Mockups: `/mnt/project-files/music/mock/` in the project files.

## The page

`/music` (Turkish `/tr/music`) shows the latest edition; `/music/<date>` keeps each day. It is the Contents screen again: the title in the headline face, one meta line with the date, the song count and the length ("Monday 23 November, 18:30. 15 songs in three genres, about 55 minutes."), a **Play all 15** line in the place of "In one minute", then the three genres as stations on the day line. The page ends with "End of today's music. Next at 18:30 tomorrow."

Genre colours, each a section hue in both themes: Hip-hop, global in gold (`--gen-global`, #e3b45c dark, #7a5600 light), Türkçe rap in coral (`--gen-turkey`, the Türkiye hue), Techno in steel blue (`--gen-techno`, #7fbccb dark, #1d5f71 light). Genre marks are Stations-style line icons: a globe, a microphone, a waveform. The techno station reads "up to 134 BPM" where the others read "5 songs".

From 1100px the three genres stand as three columns under one hairline, each headed by its name over a 2px rule in its colour, like the flat day line.

## A song row

Cover art (56px on phones, 64px from 1100px, 10px corners, no shadow), the title in the headline face, the artists in the meta colour, and a 44px round play button in the genre colour. Under it, the reason: its mark and kind in the genre colour ("Out today.", "Climbing.", "Old song, big again.", "All-time favourite.") followed by the one line with the numbers. Last, a small meta line: the tempo for techno ("**130** BPM"), then "Full song on SoundCloud, 3:12", or "30-second preview" with links to Spotify and YouTube; and a keep button (a bookmark outline, filled once kept).

Reason marks: a plus in a ring for new, a climbing line for climbing, a turning arrow for back, a ring with a dot (a record) for all-time.

## The player

One player docked at the bottom of the screen, on the surface colour with a hairline above it and a 2px progress line in the playing genre's colour: cover, title, artist, where it plays from, and previous, play/pause and next as 44px buttons. SoundCloud's official widget loads only when the reader first presses play, so the page carries no SoundCloud code or tracking until then; the widget's API drives play, pause, next and the progress line, and the player moves to the next song by itself. Without SoundCloud, the same player plays Apple's 30-second preview in a plain audio element. No YouTube player: it is heavy and shows ads. Under reduced motion the progress line jumps instead of sliding.

## Crate (Plak kutusu)

Every pick is kept: `/music/crate` lists them all, newest day first, filterable by genre and by **Kept by you**, each row playable in the same player. Rows are the compact form: cover, title, artists with the genre (and tempo for techno), the reason kind from 600px, the play button. Kept songs live in the reader's browser until accounts are live, then move to the account. Can chose (2026-11-23) to add each day's picks to three Spotify playlists of his as the next step after the Crate.

## Words

| English               | Türkçe                       |
| --------------------- | ---------------------------- |
| Music for the curious | Meraklısına müzik            |
| Hip-hop, global       | Hip-hop, dünya               |
| Türkçe rap            | Türkçe rap                   |
| Techno, up to 134 BPM | Techno, en fazla 134 BPM     |
| Out today             | Bugün çıktı                  |
| Climbing              | Yükselişte                   |
| Old song, big again   | Eski şarkı, yeniden gündemde |
| All-time favourite    | Tüm zamanların favorisi      |
| Play all 15           | 15’ini de çal                |
| Crate                 | Plak kutusu                  |
| Kept by you           | Sakladıkların                |
