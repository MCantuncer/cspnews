# Games: one frame for Word and Song

Set on 2026-11-27, after Can found both game pages weak on a wide screen and asked for a design pass grounded in how good interface designers work. Six rules came out of it, and each one names what it changed.

## The rules

1. **One object per screen.** The board or the player is the page. Everything else is quiet: the header carries no game name (the Word and Song switch under it already says where you are), and on a phone shorter than 720 px the site's second row of links gives its space to the board.
2. **One frame for both games.** The same bar sits at the top of each: Word and Song at the left, the tools at the right. Switching games moves nothing. Word adds its puzzle language to the tools as EN and TR, with a green dot on a language already solved today.
3. **One grid.** On a phone the board is as wide as the column, so the bar, the board and the keyboard share their edges.
4. **Sized by the screen, not for one phone.** One tile size drives the board and its letters. It is the largest that fits the column's width and the height between the header and the keyboard (40 to 64 px with touch, up to 72 px with a mouse), so the game never needs a scroll to reach the keyboard.
5. **Say it once.** The board shows the tries left, so there are no tries marks. The finish sheet does not repeat the board as a small grid; the finished board keeps only the rows that were played. The puzzle number and date sit in the finish sheet as a dateline.
6. **Native to the device.** On a phone, help, stats and the result rise as sheets. From 720 px, help and stats open in the middle of the screen, and the result is part of the page under the board. With a mouse, the board and keyboard are one block set a little above the middle of the free space.

## Parts

- **Message slot**: a 40 px slot above the board, as wide as the board, empty until a word is not in the list.
- **Keys**: a letter that is not in the word keeps its key shape in a faded fill, so the keyboard stays whole.
- **Streak**: a band between two hairlines (count, label, the last seven days), not a card inside the sheet.
- **Stats**: a try count nobody has hit yet is a bare figure, not an empty bar.
- **Song help**: the clip lengths over their points as one small table, in place of two paragraphs of numbers.
- **Skip** (Song): see [song-game.md](song-game.md).
