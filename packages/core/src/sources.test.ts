import { describe, expect, it } from 'vitest';

import { defineSources, type SourceInput } from './sources.js';

const bbcTurkce: SourceInput = {
  id: 'bbc-turkce',
  name: 'BBC Türkçe',
  kind: 'rss',
  url: 'https://feeds.bbci.co.uk/turkce/rss.xml',
  homepage: 'https://www.bbc.com/turkce',
  sections: ['turkey'],
  language: 'tr',
  ownerGroup: 'bbc',
  camp: 'international',
  tier: 'established',
};

describe('defineSources', () => {
  it('accepts a valid source and enables it by default', () => {
    const [source] = defineSources([bbcTurkce]);
    expect(source).toMatchObject({ id: 'bbc-turkce', enabled: true });
  });

  it('rejects duplicate ids', () => {
    expect(() => defineSources([bbcTurkce, { ...bbcTurkce, name: 'Copy' }])).toThrow(
      /Duplicate source ids: bbc-turkce/,
    );
  });

  it('rejects an unknown camp', () => {
    expect(() => defineSources([{ ...bbcTurkce, camp: 'neutral' as never }])).toThrow();
  });

  it('rejects an id that is not kebab-case', () => {
    expect(() => defineSources([{ ...bbcTurkce, id: 'BBC Türkçe' }])).toThrow(/hyphens/);
  });

  it('rejects a source that feeds no section and no desk', () => {
    expect(() => defineSources([{ ...bbcTurkce, sections: [] }])).toThrow(/section or desk/);
    expect(() => defineSources([{ ...bbcTurkce, sections: [], desks: [] }])).toThrow();
  });

  it('accepts a source that only feeds a desk', () => {
    const [source] = defineSources([{ ...bbcTurkce, sections: [], desks: ['transfers'] }]);
    expect(source?.desks).toEqual(['transfers']);
  });

  it('rejects unknown fields so typos are caught', () => {
    expect(() => defineSources([{ ...bbcTurkce, teir: 'wire' } as SourceInput])).toThrow();
  });
});

describe('source homepage and logo', () => {
  it('requires an https homepage', () => {
    const { homepage, ...withoutHomepage } = bbcTurkce;
    expect(homepage).toBeTruthy();
    expect(() => defineSources([withoutHomepage as SourceInput])).toThrow();
    expect(() => defineSources([{ ...bbcTurkce, homepage: 'http://www.bbc.com' }])).toThrow();
  });

  it('accepts an optional https logo override', () => {
    const [source] = defineSources([{ ...bbcTurkce, logoUrl: 'https://cdn.example/bbc.png' }]);
    expect(source?.logoUrl).toBe('https://cdn.example/bbc.png');
  });
});
