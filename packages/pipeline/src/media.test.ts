import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseBulletin, type Bulletin } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import { MAX_PHOTO_BYTES, photoExtension, saveStoryPhotos, type FetchBytes } from './media.js';

const SAMPLE = join(
  import.meta.dirname,
  '../../../apps/web/fixtures/bulletins/2026-11-11-evening.json',
);

function sampleBulletin(): Bulletin {
  return parseBulletin(JSON.parse(readFileSync(SAMPLE, 'utf8')));
}

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0]);

describe('photoExtension', () => {
  it('maps photo types and ignores parameters', () => {
    expect(photoExtension('image/jpeg; charset=binary')).toBe('jpg');
    expect(photoExtension('image/webp')).toBe('webp');
  });

  it('rejects anything that is not a photo', () => {
    expect(photoExtension('text/html')).toBeUndefined();
    expect(photoExtension('image/svg+xml')).toBeUndefined();
    expect(photoExtension(null)).toBeUndefined();
  });
});

describe('saveStoryPhotos', () => {
  const bulletin = sampleBulletin();
  const withImage = bulletin.stories.filter((story) => story.image);

  it('saves each story photo as <story id>.<ext>', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'media-'));
    const fetchBytes: FetchBytes = () =>
      Promise.resolve({ bytes: JPEG, contentType: 'image/jpeg' });
    const results = await saveStoryPhotos(bulletin, directory, fetchBytes);
    expect(results).toEqual(
      withImage.map((story) => ({ storyId: story.id, file: `${story.id}.jpg` })),
    );
    expect(readdirSync(directory).sort()).toEqual(
      withImage.map((story) => `${story.id}.jpg`).sort(),
    );
  });

  it('replaces an older copy saved with another extension', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'media-'));
    const id = withImage[0]?.id ?? '';
    writeFileSync(join(directory, `${id}.png`), 'old');
    const fetchBytes: FetchBytes = () =>
      Promise.resolve({ bytes: JPEG, contentType: 'image/jpeg' });
    await saveStoryPhotos(bulletin, directory, fetchBytes);
    expect(existsSync(join(directory, `${id}.png`))).toBe(false);
    expect(existsSync(join(directory, `${id}.jpg`))).toBe(true);
  });

  it('reports pages, empty or oversized files and failed downloads without saving them', async () => {
    const cases: FetchBytes[] = [
      () => Promise.resolve({ bytes: JPEG, contentType: 'text/html' }),
      () => Promise.resolve({ bytes: new Uint8Array(), contentType: 'image/jpeg' }),
      () =>
        Promise.resolve({ bytes: new Uint8Array(MAX_PHOTO_BYTES + 1), contentType: 'image/jpeg' }),
      () => Promise.reject(new Error('HTTP 403')),
    ];
    for (const fetchBytes of cases) {
      const directory = mkdtempSync(join(tmpdir(), 'media-'));
      const results = await saveStoryPhotos(bulletin, directory, fetchBytes);
      expect(results.every((result) => result.error && !result.file)).toBe(true);
      expect(readdirSync(directory)).toEqual([]);
    }
  });
});
