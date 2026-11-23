import { parseHotFeed, type HotFeed } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import {
  prepareForModel,
  protectTerms,
  restoreTerms,
  translateHotFeed,
  translationMemory,
  type TranslationRequest,
} from './translate.js';

const feed: HotFeed = parseHotFeed({
  version: 1,
  generatedAt: '2026-11-23T11:00:00Z',
  stories: [
    {
      id: 'libya-ships',
      section: 'world',
      language: 'en',
      shortTitle: 'Ukraine responsible for drone strikes on two',
      title: 'Ukraine responsible for drone strikes on two Russian ships off Libya, Zelenskyy says',
      label: 'confirmed',
      firstSeenAt: '2026-11-23T10:00:00Z',
      updatedAt: '2026-11-23T10:30:00Z',
      sources: [
        {
          sourceId: 'bbc-world',
          url: 'https://example.com/a',
          confirms: true,
          title: 'Russian warship hit by Ukrainian drones in Libya',
          language: 'en',
        },
        {
          sourceId: 'aa-tr',
          url: 'https://example.com/b',
          confirms: true,
          title: 'Zelenskiy, Libya kıyılarındaki Rus gemilerini vurduklarını açıkladı',
          language: 'tr',
        },
      ],
      timeline: [],
      summary: {
        text: 'The attacks came after a drone hit a Russian cargo ship.',
        sourceId: 'bbc-world',
      },
    },
  ],
});

/** A stand-in model that tags each text with its target language. */
function fakeModel() {
  const seen: TranslationRequest[] = [];
  return {
    seen,
    translate: (requests: readonly TranslationRequest[]) => {
      seen.push(...requests);
      return Promise.resolve(requests.map(({ text, to }) => `[${to}] ${text}`));
    },
  };
}

describe('prepareForModel', () => {
  it('puts the speaker first in a "…, X says" headline', () => {
    expect(prepareForModel('Ukraine behind ship strikes, Zelenskyy says', 'en')).toBe(
      'Zelenskyy says Ukraine behind ship strikes',
    );
  });

  it('drops what feeds wrap around a text', () => {
    expect(prepareForModel('Live: Zelensky confirms strike – Europe live', 'en')).toBe(
      'Zelensky confirms strike',
    );
    expect(prepareForModel('haberi... Altı şüpheli adliyede.', 'tr')).toBe(
      'Altı şüpheli adliyede.',
    );
  });
});

describe('kept terms', () => {
  it('survive the model, Turkish suffixes included', () => {
    const { text, kept } = protectTerms("SpaceX catches the booster with the tower's chopsticks");
    expect(text).toBe("SpaceX catches the booster with the tower's XKEEP0X");
    expect(restoreTerms('SpaceX, kulenin XKEEP0X’i ile güçlendiriciyi yakaladı', kept)).toBe(
      'SpaceX, kulenin chopsticks’i ile güçlendiriciyi yakaladı',
    );
  });

  it('match abbreviations only in capitals', () => {
    expect(protectTerms('Gözaltılar var! VAR kararı 45 milyon TL').text).toBe(
      'Gözaltılar var! XKEEP0X kararı 45 milyon XKEEP1X',
    );
  });

  it('reject a translation that lost a term', () => {
    const { kept } = protectTerms('Starship flies');
    expect(restoreTerms('Uçuyor', kept)).toBeUndefined();
    expect(restoreTerms('XKEEP3X uçuyor', kept)).toBeUndefined();
  });
});

describe('translateHotFeed', () => {
  it('adds the other language to the story and to each outlet headline', async () => {
    const model = fakeModel();
    const { feed: out, error } = await translateHotFeed(feed, model);
    const story = out.stories[0];
    expect(error).toBeUndefined();
    expect(story?.translation).toEqual({
      language: 'tr',
      shortTitle: '[tr] Zelenskyy says Ukraine responsible for drone strikes',
      title:
        '[tr] Zelenskyy says Ukraine responsible for drone strikes on two Russian ships off Libya',
      summary: '[tr] The attacks came after a drone hit a Russian cargo ship.',
    });
    // Each outlet headline goes the other way from its own language.
    expect(story?.sources.map((source) => source.translatedTitle)).toEqual([
      '[tr] Russian warship hit by Ukrainian drones in Libya',
      '[en] Zelenskiy, Libya kıyılarındaki Rus gemilerini vurduklarını açıkladı',
    ]);
  });

  it('only sends new text to the model', async () => {
    const first = await translateHotFeed(feed, fakeModel());
    const model = fakeModel();
    const second = await translateHotFeed(feed, { ...model, previous: first.feed });
    expect(model.seen).toEqual([]);
    expect(second.reused).toBe(4);
    expect(second.feed).toEqual(first.feed);
    expect(translationMemory(first.feed).size).toBe(4);
  });

  it('publishes the outlets’ own words when the model fails', async () => {
    const { feed: out, error } = await translateHotFeed(feed, {
      translate: () => Promise.reject(new Error('no model')),
    });
    expect(error).toBe('no model');
    expect(out).toEqual(feed);
  });

  it('leaves out a translation that lost a kept term', async () => {
    const withTerm = parseHotFeed({
      ...feed,
      stories: [
        {
          ...feed.stories[0],
          title: 'Starship flies again',
          summary: undefined,
          sources: feed.stories[0]?.sources,
        },
      ],
    });
    const { feed: out } = await translateHotFeed(withTerm, {
      translate: (requests) => Promise.resolve(requests.map(() => 'Yeniden uçuyor')),
    });
    expect(out.stories[0]?.translation).toBeUndefined();
  });
});
