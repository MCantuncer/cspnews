import { mkdirSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import type { Bulletin } from '@cspnews/core';

import { looksLikePhoto } from './image.js';
import { articlePhotoUrl, photoWidth } from './photo-size.js';

/**
 * Story photos are served from the site, never hot-linked (apps/web/src/lib/media.ts): the
 * publishing run saves each story's chosen photo as `<media>/<story id>.<ext>`. A photo that
 * can't be saved is left out, and the site falls back to the story's next visual. A feed
 * thumbnail is swapped for the article's own full-size photo when the page has one.
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

/**
 * Feed photos narrower than this are thumbnails: the article page's own photo is tried instead,
 * and kept when it is wider.
 */
export const MIN_PHOTO_WIDTH = 800;

/**
 * A photo narrower than this, after trying the article's own photo, is a thumbnail that would
 * look blurred on the story page: it is not saved, and the story shows its next visual.
 */
export const SMALLEST_PHOTO_WIDTH = 400;

/** Share images with a logo or banner drawn over the photo (image-server overlay parameters). */
const STAMPED = /[?&](?:overlay-[a-z0-9]+|blend-[a-z0-9]+|txt|mark)=/i;

export interface SavedPhoto {
  readonly storyId: string;
  readonly file?: string;
  /** Set when the article's full-size photo replaced the feed thumbnail. */
  readonly url?: string;
  readonly error?: string;
}

interface Photo {
  readonly url: string;
  readonly bytes: Uint8Array;
  readonly extension: string;
}

async function downloadPhoto(url: string, fetchBytes: FetchBytes): Promise<Photo> {
  const { bytes, contentType } = await fetchBytes(url);
  const extension = photoExtension(contentType);
  if (!extension) throw new Error(`not a photo (${contentType ?? 'no content type'})`);
  if (bytes.length === 0 || bytes.length > MAX_PHOTO_BYTES) {
    throw new Error(`unexpected size, ${String(bytes.length)} bytes`);
  }
  return { url, bytes, extension };
}

/** The article page's photo when it is wider than the feed's thumbnail; otherwise undefined. */
async function fullSizePhoto(
  articleUrl: string,
  thumbnailWidth: number,
  fetchBytes: FetchBytes,
): Promise<Photo | undefined> {
  try {
    const page = await fetchBytes(articleUrl);
    const url = articlePhotoUrl(new TextDecoder().decode(page.bytes), articleUrl);
    if (!url || !looksLikePhoto(url) || STAMPED.test(url)) return undefined;
    const photo = await downloadPhoto(url, fetchBytes);
    return (photoWidth(photo.bytes) ?? 0) > thumbnailWidth ? photo : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Saves the photo of every story, every Spotlight (And finally) light story and every transfer move into `mediaDirectory`,
 * replacing an older copy of the same one.
 */
export async function saveStoryPhotos(
  bulletin: Bulletin,
  mediaDirectory: string,
  fetchBytes: FetchBytes,
): Promise<SavedPhoto[]> {
  mkdirSync(mediaDirectory, { recursive: true });
  const results: SavedPhoto[] = [];
  for (const story of [
    ...bulletin.stories,
    ...(bulletin.andFinally?.light ?? []),
    ...(bulletin.transfers ?? []),
  ]) {
    if (!story.image) continue;
    try {
      const feedPhoto = await downloadPhoto(story.image.url, fetchBytes);
      const width = photoWidth(feedPhoto.bytes);
      const better =
        width !== undefined && width < MIN_PHOTO_WIDTH
          ? await fullSizePhoto(story.image.articleUrl, width, fetchBytes)
          : undefined;
      const photo = better ?? feedPhoto;
      const finalWidth = better ? photoWidth(better.bytes) : width;
      if (finalWidth !== undefined && finalWidth < SMALLEST_PHOTO_WIDTH) {
        throw new Error(`only a ${String(finalWidth)}px thumbnail`);
      }
      removeOlderCopies(mediaDirectory, story.id);
      const file = `${story.id}.${photo.extension}`;
      writeFileSync(join(mediaDirectory, file), photo.bytes);
      results.push(
        better ? { storyId: story.id, file, url: better.url } : { storyId: story.id, file },
      );
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
