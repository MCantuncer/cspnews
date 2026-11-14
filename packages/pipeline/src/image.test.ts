import { defineSources, type Article } from '@cspnews/core';
import type { Story, StoryArticle } from '@cspnews/grouping';
import { describe, expect, it } from 'vitest';

import { largestPhotoUrl, looksLikePhoto, pickImage } from './image.js';

const SOURCES = new Map(
  defineSources(
    (
      [
        ['aa-tr', 'Anadolu Ajansı', 'wire'],
        ['ntv', 'NTV', 'established'],
        ['sabah', 'Sabah', 'partisan'],
      ] as const
    ).map(([id, name, tier]) => ({
      id,
      name,
      kind: 'rss' as const,
      url: `https://${id}.example/feed`,
      homepage: `https://${id}.example`,
      sections: ['turkey' as const],
      language: 'tr',
      ownerGroup: id,
      camp: 'mainstream' as const,
      tier,
    })),
  ).map((source) => [source.id, source]),
);

function member(sourceId: string, imageUrl?: string, copyOf?: string): StoryArticle {
  const article: Article = {
    id: `${sourceId}-1`,
    sourceId,
    url: `https://${sourceId}.example/haber`,
    title: 'Başlık',
    summary: '',
    publishedAt: new Date('2026-11-11T08:00:00Z'),
    language: 'tr',
    sections: ['turkey'],
    ...(imageUrl ? { imageUrl } : {}),
  };
  return copyOf ? { article, copyOf } : { article };
}

function story(...articles: StoryArticle[]): Story {
  return {
    id: 's1',
    language: 'tr',
    sections: ['turkey'],
    articles,
    firstSeenAt: new Date('2026-11-11T08:00:00Z'),
    lastUpdatedAt: new Date('2026-11-11T08:00:00Z'),
  };
}

describe('pickImage', () => {
  it('prefers the strongest confirming outlet and credits it', () => {
    const image = pickImage(
      story(
        member('sabah', 'https://img.sabah.example/foto.jpg'),
        member('aa-tr', 'https://cdn.aa.example/uploads/deprem.jpg'),
      ),
      SOURCES,
      ['sabah', 'aa-tr'],
    );
    expect(image).toEqual({
      url: 'https://cdn.aa.example/uploads/deprem.jpg',
      sourceId: 'aa-tr',
      sourceName: 'Anadolu Ajansı',
      articleUrl: 'https://aa-tr.example/haber',
    });
  });

  it('prefers a confirming outlet over a stronger one that does not count', () => {
    const image = pickImage(
      story(
        member('aa-tr', 'https://cdn.aa.example/a.jpg'),
        member('ntv', 'https://ntv.example/b.jpg'),
      ),
      SOURCES,
      ['ntv'],
    );
    expect(image?.sourceId).toBe('ntv');
  });

  it('skips logos and placeholders, and returns nothing without a real photo', () => {
    expect(
      pickImage(
        story(
          member('aa-tr', 'https://cdn.aa.example/static/logo.png'),
          member('ntv', 'https://ntv.example/images/default-share.jpg'),
          member('sabah'),
        ),
        SOURCES,
        ['aa-tr', 'ntv', 'sabah'],
      ),
    ).toBeUndefined();
  });
});

describe('looksLikePhoto', () => {
  it('accepts news photos, even on hosts named like assets', () => {
    expect(looksLikePhoto('https://icon-cdn.example/2026/11/deprem-malatya.jpg')).toBe(true);
    expect(looksLikePhoto('https://cdn.example/photos/logolu-tisort.jpg')).toBe(true);
  });

  it('rejects logos, icons, vector and animated images, and bad URLs', () => {
    expect(looksLikePhoto('https://cdn.example/assets/logo.png')).toBe(false);
    expect(looksLikePhoto('https://cdn.example/brand/site_logo_2x.png')).toBe(false);
    expect(looksLikePhoto('https://cdn.example/a/b.svg')).toBe(false);
    expect(looksLikePhoto('https://cdn.example/spacer.gif')).toBe(false);
    expect(looksLikePhoto('not a url')).toBe(false);
  });

  it('rejects hosts that stamp their logo on every photo', () => {
    expect(looksLikePhoto('https://i.guim.co.uk/img/media/abc/master/3334.jpg?width=140')).toBe(
      false,
    );
  });
});

describe('largestPhotoUrl', () => {
  it('asks the BBC image server for its 976px copy', () => {
    expect(
      largestPhotoUrl('https://ichef.bbci.co.uk/ace/standard/240/cpsprodpb/53ad/live/x.jpg'),
    ).toBe('https://ichef.bbci.co.uk/ace/standard/976/cpsprodpb/53ad/live/x.jpg');
    expect(largestPhotoUrl('https://ichef.bbci.co.uk/news/240/cpsprodpb/x.jpg')).toBe(
      'https://ichef.bbci.co.uk/news/976/cpsprodpb/x.jpg',
    );
  });

  it('leaves other photos as they are', () => {
    const url = 'https://cdn.example/photo.jpg?w=240';
    expect(largestPhotoUrl(url)).toBe(url);
  });
});
