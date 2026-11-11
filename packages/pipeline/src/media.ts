import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Bulletin } from '@cspnews/core';

/**
 * Story photos are served from the site, never hot-linked (apps/web/src/lib/media.ts): the
 * publishing run saves each story's chosen photo as `<media>/<story id>.<ext>`. A photo that
 * can't be saved is left out, and the site falls back to the story's next visual.
 */

/** Bytes of a downloaded file and its content type, or an error the run reports. */
export type FetchBytes = (
  url: string,
) => Promise<{ bytes: Uint8Array; contentType: string | null }>;

/** Photos larger than this are skipped: the site is for reading, not for big downloads. */
export const MAX_PHOTO_BYTES = 2 * 1024 * 1024;

const PHOTO_TYPES: Readonly<Record<string, string>> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/avif': 'avif',
};

/** The file extension for a photo, from its content type; undefined when it isn't a photo. */
export function photoExtension(contentType: string | null): string | undefined {
  const type = (contentType ?? '').split(';')[0]?.trim().toLowerCase();
  return type ? PHOTO_TYPES[type] : undefined;
}

export interface SavedPhoto {
  readonly storyId: string;
  readonly file?: string;
  readonly error?: string;
}

/** Saves every story's photo into `mediaDirectory`, replacing an older copy of the same story. */
export async function saveStoryPhotos(
  bulletin: Bulletin,
  mediaDirectory: string,
  fetchBytes: FetchBytes,
): Promise<SavedPhoto[]> {
  mkdirSync(mediaDirectory, { recursive: true });
  const results: SavedPhoto[] = [];
  for (const story of bulletin.stories) {
    if (!story.image) continue;
    try {
      const { bytes, contentType } = await fetchBytes(story.image.url);
      const extension = photoExtension(contentType);
      if (!extension) throw new Error(`not a photo (${contentType ?? 'no content type'})`);
      if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) {
        throw new Error(`unexpected size, ${String(bytes.length)} bytes`);
      }
      removeOlderCopies(mediaDirectory, story.id);
      const file = `${story.id}.${extension}`;
      writeFileSync(join(mediaDirectory, file), bytes);
      results.push({ storyId: story.id, file });
    } catch (error) {
      results.push({
        storyId: story.id,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return results;
}

function removeOlderCopies(directory: string, storyId: string): void {
  for (const file of readdirSync(directory)) {
    if (file.slice(0, file.lastIndexOf('.')) === storyId) rmSync(join(directory, file));
  }
}

/** Downloads over HTTPS with a timeout, as a browser-like client so outlets serve the photo. */
export function httpFetchBytes(timeoutMs = 20_000): FetchBytes {
  return async (url) => {
    const response = await fetch(url, {
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; CSPNews photo fetcher)' },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
    return {
      bytes: new Uint8Array(await response.arrayBuffer()),
      contentType: response.headers.get('content-type'),
    };
  };
}
