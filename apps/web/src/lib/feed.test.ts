import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { loadBulletins } from './bulletins.js';
import { feedPath, robotsTxt, rssFeed, sitemapPaths, sitemapXml } from './feed.js';

const FIXTURES = fileURLToPath(new URL('../../fixtures/bulletins', import.meta.url));
const ORIGIN = 'https://news.example';
const bulletins = loadBulletins(FIXTURES);
const stories = bulletins.flatMap((published) => published.bulletin.stories);

describe('rss feed', () => {
  it('has one item per story, linking to the story page with a full URL', () => {
    const feed = rssFeed(bulletins, 'en', ORIGIN);
    expect(feed.match(/<item>/g)).toHaveLength(stories.length);
    expect(feed).toContain(`<link>${ORIGIN}/2026-11-11/evening/${stories[0]?.id ?? ''}</link>`);
    expect(feed).toContain(`href="${ORIGIN}/feed.xml"`);
  });

  it('writes the Turkish feed from the Turkish versions, under /tr', () => {
    const feed = rssFeed(bulletins, 'tr', ORIGIN);
    expect(feed).toContain('<language>tr</language>');
    expect(feed).toContain(`<link>${ORIGIN}/tr/2026-11-11/evening/${stories[0]?.id ?? ''}</link>`);
    expect(feed).toContain(stories[0]?.versions.tr.title.replaceAll('&', '&amp;'));
    expect(feedPath('tr')).toBe('/tr/feed.xml');
  });

  it('escapes text, so a title can never break the feed', () => {
    const [first] = bulletins;
    const story = first?.bulletin.stories[0];
    if (!first || !story) throw new Error('The sample bulletin needs a story');
    const versions = { ...story.versions, en: { ...story.versions.en, title: 'R&D <cuts> "now"' } };
    const edited = { ...first, bulletin: { ...first.bulletin, stories: [{ ...story, versions }] } };
    const feed = rssFeed([edited], 'en', ORIGIN);
    expect(feed).toContain('<title>R&amp;D &lt;cuts&gt; &quot;now&quot;</title>');
  });

  it('is still a valid, empty feed before anything is published', () => {
    const feed = rssFeed([], 'en', ORIGIN);
    expect(feed).toContain('<channel>');
    expect(feed).not.toContain('<item>');
  });
});

describe('sitemap', () => {
  it('lists the front page, each bulletin and each story in both languages', () => {
    const paths = sitemapPaths(bulletins);
    expect(paths).toContain('/');
    expect(paths).toContain('/tr');
    expect(paths).toContain('/2026-11-11/evening');
    expect(paths).toContain('/tr/2026-11-11/evening/brief');
    expect(paths).toContain(`/tr/2026-11-11/evening/${stories[0]?.id ?? ''}`);
    expect(paths).toHaveLength(2 * (1 + 2 * bulletins.length + stories.length));
    expect(new Set(paths).size).toBe(paths.length);
  });

  it('writes full URLs and robots.txt points at it', () => {
    expect(sitemapXml(bulletins, ORIGIN)).toContain(`<loc>${ORIGIN}/2026-11-11/evening</loc>`);
    expect(robotsTxt(ORIGIN)).toContain(`Sitemap: ${ORIGIN}/sitemap.xml`);
  });
});
