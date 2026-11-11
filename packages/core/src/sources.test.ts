import { describe, expect, it } from 'vitest';

import { defineSources, type SourceInput } from './sources.js';

const bbcTurkce: SourceInput = {
  id: 'bbc-turkce',
  name: 'BBC Türkçe',
  kind: 'rss',
  url: 'https://feeds.bbci.co.uk/turkce/rss.xml',
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

  it('rejects a source with no sections', () => {
    expect(() => defineSources([{ ...bbcTurkce, sections: [] }])).toThrow();
  });

  it('rejects unknown fields so typos are caught', () => {
    expect(() => defineSources([{ ...bbcTurkce, teir: 'wire' } as SourceInput])).toThrow();
  });
});
