import { z } from 'zod';

import type { FetchText } from './types.js';

/**
 * SoundCloud's public oEmbed: confirms that a song's page exists and can be embedded, and names
 * the account that uploaded it, so a re-upload by a stranger is not used (docs/music.md, "Playing").
 */

export const oembedUrl = (page: string) =>
  `https://soundcloud.com/oembed?${new URLSearchParams({ format: 'json', url: page }).toString()}`;

const OembedSchema = z.looseObject({ author_name: z.string(), html: z.string() });

export interface Embeddable {
  uploader: string;
}

export async function checkSoundCloud(
  page: string,
  fetchText: FetchText,
): Promise<Embeddable | undefined> {
  try {
    const oembed = OembedSchema.parse(JSON.parse(await fetchText(oembedUrl(page))));
    return oembed.html.includes('w.soundcloud.com/player')
      ? { uploader: oembed.author_name }
      : undefined;
  } catch {
    return undefined;
  }
}

const fold = (value: string) => value.toLocaleLowerCase('tr').replace(/[^\p{L}\p{N}]/gu, '');

/** The uploader is the artist or the label, give or take "official", "music" or "records". */
export function isOfficialUploader(uploader: string, names: readonly string[]): boolean {
  const account = fold(uploader).replace(/official|music|records|recordings|offical/g, '');
  return names.some((name) => {
    const wanted = fold(name);
    return (
      wanted.length > 0 &&
      (account === wanted || account.includes(wanted) || wanted.includes(account))
    );
  });
}
