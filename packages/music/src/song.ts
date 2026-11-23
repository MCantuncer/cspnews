import { foldName } from '@cspnews/core';

/**
 * One song, however a source spells it. Charts, stores and SoundCloud write the same recording as
 * "Song (feat. X)", "Song - Original Mix", "Song (Remastered 2011)" or a sped-up TikTok edit; all
 * of these are the same song for the page and for the repeat rules. A remix by another artist is a
 * different song and keeps its remix name.
 */

const EDITION_TAGS =
  /\s*[([]\s*(?:feat\.?|ft\.?|featuring|with|prod\.?|original mix|extended mix|radio edit|clean|explicit|remaster(?:ed)?(?: \d{4})?|\d{4} remaster(?:ed)?|sped up|speed up|slowed(?: \+ reverb| and reverb)?|super slowed)\b[^)\]]*[)\]]/giu;
const DASH_TAGS =
  /\s+-\s+(?:original mix|extended mix|radio edit|remaster(?:ed)?(?: \d{4})?|\d{4} remaster(?:ed)?|sped up|slowed(?: \+ reverb)?)\s*$/iu;
const INLINE_FEAT = /\s+(?:feat\.?|ft\.?|featuring)\s+.*$/iu;

/** The title with featuring credits and edition tags removed: "Holocaust (feat. X) - Remastered" → "Holocaust". */
export function baseTitle(title: string): string {
  let result = title;
  for (let previous = ''; previous !== result;) {
    previous = result;
    result = result.replace(EDITION_TAGS, '').replace(DASH_TAGS, '').replace(INLINE_FEAT, '');
  }
  return result.trim();
}

const fold = (value: string) =>
  foldName(value)
    .replace(/&/g, ' and ')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

/** The lead artist without featured names: "Dr. Dre feat. Snoop Dogg" → "Dr. Dre". */
export function leadArtist(artist: string): string {
  return artist.split(/\s+(?:feat\.?|ft\.?|featuring|x|&|,)\s+/iu)[0]?.trim() ?? artist.trim();
}

/** The stable id of a song: folded lead artist and base title, `ceza-holocaust`. */
export function songKey(artist: string, title: string): string {
  return `${fold(leadArtist(artist))}-${fold(baseTitle(title))}`.slice(0, 80).replace(/-+$/, '');
}
