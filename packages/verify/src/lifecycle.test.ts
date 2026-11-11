import { defineSources, type Article } from '@cspnews/core';
import type { Story, StoryArticle } from '@cspnews/grouping';
import { describe, expect, it } from 'vitest';

import { storyLifecycle } from './lifecycle.js';

const SOURCES = new Map(
  defineSources(
    (
      [
        ['sabah', 'turkuvaz', 'pro-government', 'partisan', 'rss'],
        ['a-haber', 'turkuvaz', 'pro-government', 'partisan', 'rss'],
        ['aa-tr', 'anadolu', 'state-wire', 'wire', 'rss'],
        ['sozcu', 'sozcu', 'opposition', 'partisan', 'rss'],
        ['teyit', 'teyit', 'specialist', 'established', 'fact-check'],
        ['openai-news', 'openai', 'specialist', 'established', 'primary'],
      ] as const
    ).map(([id, ownerGroup, camp, tier, kind]) => ({
      id,
      name: id,
      kind,
      url: `https://${id}.example/feed`,
      homepage: `https://${id}.example`,
      sections: ['turkey'],
      language: 'tr',
      ownerGroup,
      camp,
      tier,
    })),
  ).map((source) => [source.id, source]),
);

function story(...members: [sourceId: string, time: string, copy?: boolean][]): Story {
  const articles: StoryArticle[] = members.map(([sourceId, time, copy], index) => {
    const article: Article = {
      id: `a${String(index)}`,
      sourceId,
      url: `https://${sourceId}.example/${String(index)}`,
      title: 'Başlık',
      summary: '',
      publishedAt: new Date(`2026-11-11T${time}:00Z`),
      language: 'tr',
      sections: ['turkey'],
    };
    return copy ? { article, copyOf: 'a0' } : { article };
  });
  const first = articles[0]?.article.publishedAt ?? new Date();
  const last = articles.at(-1)?.article.publishedAt ?? first;
  return {
    id: 'a0',
    language: 'tr',
    sections: ['turkey'],
    articles,
    firstSeenAt: first,
    lastUpdatedAt: last,
  };
}

const summary = (s: Story) =>
  storyLifecycle(s, SOURCES).map((event) =>
    event.kind === 'label-changed'
      ? `${event.at.toISOString().slice(11, 16)} ${event.from} → ${event.to}`
      : `${event.at.toISOString().slice(11, 16)} ${event.kind} ${event.sourceId}`,
  );

describe('storyLifecycle', () => {
  it('tells who reported first, who joined, and when the label changed', () => {
    expect(
      summary(
        story(['sabah', '08:00'], ['a-haber', '08:10'], ['sozcu', '08:30'], ['aa-tr', '09:00']),
      ),
    ).toEqual([
      '08:00 first-reported sabah',
      '08:30 outlet-joined sozcu',
      '08:30 single-source → reported',
      '09:00 outlet-joined aa-tr',
      '09:00 reported → confirmed',
    ]);
  });

  it('does not count a republished copy as an outlet joining', () => {
    expect(
      summary(story(['aa-tr', '08:00'], ['sozcu', '08:05', true], ['a-haber', '08:10'])),
    ).toEqual([
      '08:00 first-reported aa-tr',
      '08:10 outlet-joined a-haber',
      '08:10 single-source → confirmed',
    ]);
  });

  it('marks the primary source and fact-checks', () => {
    expect(
      summary(story(['aa-tr', '08:00'], ['openai-news', '08:20'], ['teyit', '10:00'])),
    ).toEqual([
      '08:00 first-reported aa-tr',
      '08:20 primary-source openai-news',
      '08:20 single-source → confirmed',
      '10:00 fact-check teyit',
      '10:00 confirmed → disputed',
    ]);
  });
});
