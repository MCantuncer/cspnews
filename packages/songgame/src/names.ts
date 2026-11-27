/**
 * Song names as the guess box compares them: case, accents, punctuation, "feat." parts and
 * "- Remastered" tails do not matter, so "Sweet Child O' Mine" and "sweet child o mine" match.
 */

export interface SongName {
  readonly artist: string;
  readonly title: string;
}

/** A name folded for comparison and search. Turkish dotless ı folds to i. */
export function plain(text: string): string {
  return text
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/\s+[-–]\s+.*$/, '')
    .replace(/[([](feat|ft|with|from|remaster|\d{4}).*?[)\]]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** "Artist – Title", the one way a song is written in the game. */
export const songLabel = (song: SongName): string => `${song.artist} – ${song.title}`;

/** Whether a guessed song is the answer: same title, and the artists overlap. */
export function isSameSong(guess: SongName, answer: SongName): boolean {
  if (plain(guess.title) !== plain(answer.title)) return false;
  const a = plain(guess.artist);
  const b = plain(answer.artist);
  return a === b || a.includes(b) || b.includes(a);
}

/**
 * The catalog entries that fit what the reader typed, best first: every typed word must start a
 * word of "artist title". Titles that start with the text come before the rest.
 */
export function searchSongs<T extends SongName>(
  catalog: readonly T[],
  typed: string,
  limit = 8,
): T[] {
  const words = plain(typed).split(' ').filter(Boolean);
  if (words.length === 0) return [];
  const scored: { song: T; rank: number }[] = [];
  for (const song of catalog) {
    const title = plain(song.title);
    const haystack = ` ${plain(song.artist)} ${title}`;
    if (!words.every((word) => haystack.includes(` ${word}`))) continue;
    const query = words.join(' ');
    const rank = title.startsWith(query) ? 0 : plain(song.artist).startsWith(query) ? 1 : 2;
    scored.push({ song, rank });
  }
  return scored
    .sort((x, y) => x.rank - y.rank || songLabel(x.song).localeCompare(songLabel(y.song), 'tr'))
    .slice(0, limit)
    .map((entry) => entry.song);
}

/** One letter folded the way plain() folds it, so a match can be found in the text as written. */
function foldLetter(letter: string): string {
  const folded = letter
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFD')
    .replace(/\p{M}/gu, '');
  return folded.length === 1 && /[a-z0-9]/.test(folded) ? folded : ' ';
}

/**
 * Where the typed words appear in a name, as [start, end) ranges of the text as written, so the
 * guess box can set them in bold. Only matches at the start of a word count, as in searchSongs.
 */
export function matchRanges(text: string, typed: string): [number, number][] {
  const words = plain(typed).split(' ').filter(Boolean);
  const letters = Array.from(text);
  const folded = letters.map(foldLetter).join('');
  const ranges: [number, number][] = [];
  for (const word of words) {
    let from = 0;
    for (;;) {
      const at = folded.indexOf(word, from);
      if (at < 0) break;
      if (at === 0 || folded[at - 1] === ' ') {
        ranges.push([at, at + word.length]);
        break;
      }
      from = at + 1;
    }
  }
  ranges.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const range of ranges) {
    const last = merged.at(-1);
    if (last && range[0] <= last[1]) last[1] = Math.max(last[1], range[1]);
    else merged.push(range);
  }
  // Ranges count letters (code points); turn them into string offsets.
  const offsets = [0];
  for (const letter of letters) offsets.push((offsets.at(-1) ?? 0) + letter.length);
  return merged.map(([start, end]) => [offsets[start] ?? 0, offsets[end] ?? text.length]);
}
