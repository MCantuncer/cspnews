import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { parseBulletin, type Bulletin } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import { MAX_PHOTO_BYTES, photoExtension, saveStoryPhotos, type FetchBytes } from './media.js';
import { jpeg } from './photo-size.test.js';

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

  it('saves the photos of And finally light stories too', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'media-'));
    const image = withImage[0]?.image;
    if (!image) throw new Error('The sample needs a story photo');
    const light = {
      id: 'light-ferry-cat',
      kind: 'animals' as const,
      label: 'confirmed' as const,
      versions: {
        en: { title: 'Ferry cat gets a badge', gist: 'It rides daily.', aside: 'No comment.' },
        tr: { title: 'Vapur kedisine kart', gist: 'Her gün biniyor.', aside: 'Yorum yok.' },
      },
      sources: [{ sourceId: 'ntv', url: 'https://ntv.example/' }],
      image,
    };
    const withLight = { ...bulletin, andFinally: { light: [light], rumours: [] } };
    const fetchBytes: FetchBytes = () =>
      Promise.resolve({ bytes: JPEG, contentType: 'image/jpeg' });
    const results = await saveStoryPhotos(withLight, directory, fetchBytes);
    expect(results.at(-1)).toEqual({ storyId: 'light-ferry-cat', file: 'light-ferry-cat.jpg' });
  });

  it('saves the photos of transfer moves too', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'media-'));
    const image = withImage[0]?.image;
    if (!image) throw new Error('The sample needs a story photo');
    const version = {
      shortTitle: 'Club signs a new striker',
      title: 'Club signs a new striker',
      now: 'The club announced it.',
    };
    const move = {
      id: 'move-striker',
      league: 'super-lig' as const,
      from: 'A',
      to: 'B',
      stage: 'signed' as const,
      clubConfirmed: true,
      steps: [{ stage: 'signed' as const, on: '2026-11-13' }],
      reports: [
        {
          sourceId: 'ntv',
          url: 'https://ntv.example/',
          stage: 'signed' as const,
          on: '2026-11-13',
        },
      ],
      versions: { en: version, tr: version },
      image,
      updatedAt: '2026-11-13T18:00:00+03:00',
    };
    const fetchBytes: FetchBytes = () =>
      Promise.resolve({ bytes: JPEG, contentType: 'image/jpeg' });
    const results = await saveStoryPhotos(
      { ...bulletin, transfers: [move] },
      directory,
      fetchBytes,
    );
    expect(results.at(-1)).toEqual({ storyId: 'move-striker', file: 'move-striker.jpg' });
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

  it('swaps a feed thumbnail for the article page photo when that one is wider', async () => {
    const story = withImage[0];
    if (!story?.image) throw new Error('the sample needs a story with a photo');
    const big = 'https://news.example/big.jpg';
    const responses = new Map<string, Awaited<ReturnType<FetchBytes>>>([
      [story.image.url, { bytes: jpeg(140), contentType: 'image/jpeg' }],
      [
        story.image.articleUrl,
        {
          bytes: new TextEncoder().encode(`<meta property="og:image" content="${big}">`),
          contentType: 'text/html',
        },
      ],
      [big, { bytes: jpeg(1400), contentType: 'image/jpeg' }],
    ]);
    const fetchBytes: FetchBytes = (url) => {
      const response = responses.get(url);
      return response ? Promise.resolve(response) : Promise.reject(new Error('HTTP 404'));
    };
    const directory = mkdtempSync(join(tmpdir(), 'media-'));
    const [result] = await saveStoryPhotos(bulletin, directory, fetchBytes);
    expect(result).toEqual({ storyId: story.id, file: `${story.id}.jpg`, url: big });
    expect(readFileSync(join(directory, `${story.id}.jpg`))).toEqual(Buffer.from(jpeg(1400)));
  });

  it('keeps a mid-size photo when the article has no bigger one', async () => {
    const story = withImage[0];
    if (!story?.image) throw new Error('the sample needs a story with a photo');
    const image = story.image;
    const fetchBytes: FetchBytes = (url) =>
      url === image.url
        ? Promise.resolve({ bytes: jpeg(640), contentType: 'image/jpeg' })
        : Promise.reject(new Error('HTTP 403'));
    const directory = mkdtempSync(join(tmpdir(), 'media-'));
    const [result] = await saveStoryPhotos(bulletin, directory, fetchBytes);
    expect(result).toEqual({ storyId: story.id, file: `${story.id}.jpg` });
  });

  it('leaves out a small thumbnail rather than show it blurred', async () => {
    const story = withImage[0];
    if (!story?.image) throw new Error('the sample needs a story with a photo');
    const image = story.image;
    const fetchBytes: FetchBytes = (url) =>
      url === image.url
        ? Promise.resolve({ bytes: jpeg(140), contentType: 'image/jpeg' })
        : Promise.reject(new Error('HTTP 403'));
    const directory = mkdtempSync(join(tmpdir(), 'media-'));
    const [result] = await saveStoryPhotos(bulletin, directory, fetchBytes);
    expect(result?.file).toBeUndefined();
    expect(result?.error).toMatch(/140px/);
  });

  it('never takes an article photo with a logo drawn over it', async () => {
    const story = withImage[0];
    if (!story?.image) throw new Error('the sample needs a story with a photo');
    const stamped = 'https://img.example/photo.jpg?width=1200&overlay-base64=abc';
    const responses = new Map<string, Awaited<ReturnType<FetchBytes>>>([
      [story.image.url, { bytes: jpeg(640), contentType: 'image/jpeg' }],
      [
        story.image.articleUrl,
        {
          bytes: new TextEncoder().encode(`<meta property="og:image" content="${stamped}">`),
          contentType: 'text/html',
        },
      ],
      [stamped, { bytes: jpeg(1200), contentType: 'image/jpeg' }],
    ]);
    const fetchBytes: FetchBytes = (url) => {
      const response = responses.get(url);
      return response ? Promise.resolve(response) : Promise.reject(new Error('HTTP 404'));
    };
    const directory = mkdtempSync(join(tmpdir(), 'media-'));
    const [result] = await saveStoryPhotos(bulletin, directory, fetchBytes);
    expect(result).toEqual({ storyId: story.id, file: `${story.id}.jpg` });
  });

  it('keeps a wider copy saved earlier when the server now hands back a smaller one', async () => {
    const story = withImage[0];
    if (!story?.image) throw new Error('the sample needs a story with a photo');
    const image = story.image;
    const directory = mkdtempSync(join(tmpdir(), 'media-'));
    writeFileSync(join(directory, `${story.id}.jpg`), jpeg(1280));
    const fetchBytes: FetchBytes = (url) =>
      url === image.url
        ? Promise.resolve({ bytes: jpeg(600), contentType: 'image/webp' })
        : Promise.reject(new Error('HTTP 403'));
    const [result] = await saveStoryPhotos(bulletin, directory, fetchBytes);
    expect(result).toEqual({ storyId: story.id, file: `${story.id}.jpg` });
    expect(readFileSync(join(directory, `${story.id}.jpg`))).toEqual(Buffer.from(jpeg(1280)));
    expect(existsSync(join(directory, `${story.id}.webp`))).toBe(false);
  });

  it('replaces an earlier copy with a new full-width photo', async () => {
    const story = withImage[0];
    if (!story?.image) throw new Error('the sample needs a story with a photo');
    const directory = mkdtempSync(join(tmpdir(), 'media-'));
    writeFileSync(join(directory, `${story.id}.jpg`), jpeg(1600));
    const fetchBytes: FetchBytes = () =>
      Promise.resolve({ bytes: jpeg(1000), contentType: 'image/jpeg' });
    await saveStoryPhotos(bulletin, directory, fetchBytes);
    expect(readFileSync(join(directory, `${story.id}.jpg`))).toEqual(Buffer.from(jpeg(1000)));
  });
});
