import { defineSources, type Article, type Section } from '@cspnews/core';
import type { Story, StoryArticle } from '@cspnews/grouping';
import { describe, expect, it } from 'vitest';

import { canAlert, evidenceFor } from './evidence.js';

const SOURCES = new Map(
  defineSources(
    (
      [
        ['aa-tr', 'anadolu', 'state-wire', 'wire', 'rss'],
        ['sabah', 'turkuvaz', 'pro-government', 'partisan', 'rss'],
        ['a-haber', 'turkuvaz', 'pro-government', 'partisan', 'rss'],
        ['star', 'star-group', 'pro-government', 'partisan', 'rss'],
        ['sozcu', 'sozcu', 'opposition', 'partisan', 'rss'],
        ['bbc-turkce', 'bbc', 'international', 'established', 'rss'],
        ['teyit', 'teyit', 'specialist', 'established', 'fact-check'],
        ['openai-news', 'openai', 'specialist', 'established', 'primary'],
        ['hacker-news', 'y-combinator', 'specialist', 'low', 'rss'],
        ['the-verge', 'vox-media', 'specialist', 'established', 'rss'],
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

const NOW = new Date('2026-11-11T12:00:00Z');

function story(
  members: readonly (string | [string, 'copy'])[],
  options: { section?: Section; first?: string; last?: string } = {},
): Story {
  const { section = 'turkey', first = '2026-11-11T08:00:00Z', last = first } = options;
  const articles: StoryArticle[] = members.map((member, index) => {
    const [sourceId, copy] = typeof member === 'string' ? [member, undefined] : member;
    const article: Article = {
      id: `a${String(index)}`,
      sourceId,
      url: `https://${sourceId}.example/${String(index)}`,
      title: 'Headline',
      summary: '',
      publishedAt: new Date(first),
      language: 'tr',
      sections: [section],
    };
    return copy ? { article, copyOf: 'a0' } : { article };
  });
  return {
    id: 'a0',
    language: 'tr',
    sections: [section],
    articles,
    firstSeenAt: new Date(first),
    lastUpdatedAt: new Date(last),
  };
}

const label = (s: Story) => evidenceFor(s, SOURCES, { now: NOW }).label;

describe('evidenceFor', () => {
  it('confirms a story from a wire and an outlet on a political side', () => {
    expect(label(story(['aa-tr', 'sozcu']))).toBe('confirmed');
  });

  it('confirms a story both political sides report', () => {
    const evidence = evidenceFor(story(['sabah', 'sozcu', 'bbc-turkce']), SOURCES, { now: NOW });
    expect(evidence.label).toBe('confirmed');
    expect(evidence.camps).toEqual(['pro-government', 'opposition', 'international']);
    expect(evidence.reasons).toContain('cross-camp');
  });

  it('keeps one political side at Reported, even across owners', () => {
    const evidence = evidenceFor(story(['sabah', 'star']), SOURCES, { now: NOW });
    expect(evidence.label).toBe('reported');
    expect(evidence.reasons).toContain('single-camp');
  });

  it('applies the camp rule only to Turkey stories', () => {
    expect(label(story(['sabah', 'star'], { section: 'world' }))).toBe('reported');
    expect(label(story(['the-verge', 'bbc-turkce'], { section: 'tech' }))).toBe('confirmed');
  });

  it('treats outlets with one owner as a single source', () => {
    const evidence = evidenceFor(story(['sabah', 'a-haber']), SOURCES, { now: NOW });
    expect(evidence.label).toBe('single-source');
    expect(evidence.confirmingSourceIds).toEqual(['sabah']);
  });

  it('does not count wire copies as confirmation', () => {
    const evidence = evidenceFor(story(['aa-tr', ['sabah', 'copy'], ['sozcu', 'copy']]), SOURCES, {
      now: NOW,
    });
    expect(evidence.label).toBe('single-source');
    expect(evidence.reasons).toEqual(['copies-not-counted', 'single-owner']);
  });

  it('marks a story a fact-checker covers as Disputed', () => {
    expect(label(story(['aa-tr', 'sozcu', 'teyit']))).toBe('disputed');
  });

  it('confirms an announcement with its primary source and one outlet', () => {
    expect(label(story(['openai-news', 'the-verge'], { section: 'tech' }))).toBe('confirmed');
  });

  it('ignores low-tier aggregators and unknown sources', () => {
    const evidence = evidenceFor(story(['the-verge', 'hacker-news', 'mystery']), SOURCES, {
      now: NOW,
    });
    expect(evidence.label).toBe('single-source');
    expect(evidence.reasons).toContain('unknown-source-ignored');
  });

  it('flags a young, active story as developing', () => {
    const young = story(['aa-tr'], { first: '2026-11-11T10:00:00Z', last: '2026-11-11T11:30:00Z' });
    const quiet = story(['aa-tr'], { first: '2026-11-11T10:00:00Z', last: '2026-11-11T10:00:00Z' });
    const old = story(['aa-tr'], { first: '2026-11-11T02:00:00Z', last: '2026-11-11T11:50:00Z' });
    expect(evidenceFor(young, SOURCES, { now: NOW }).developing).toBe(true);
    expect(evidenceFor(quiet, SOURCES, { now: NOW }).developing).toBe(false);
    expect(evidenceFor(old, SOURCES, { now: NOW }).developing).toBe(false);
  });
});

describe('canAlert', () => {
  it('holds back single-source and disputed stories', () => {
    const check = (members: string[]) =>
      canAlert(evidenceFor(story(members), SOURCES, { now: NOW }));
    expect(check(['aa-tr', 'sozcu'])).toBe(true);
    expect(check(['sabah', 'star'])).toBe(true);
    expect(check(['aa-tr'])).toBe(false);
    expect(check(['aa-tr', 'sozcu', 'teyit'])).toBe(false);
  });
});
