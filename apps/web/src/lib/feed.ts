import { briefPath, bulletinPath, storiesIn, storyPath } from './bulletins.js';
import type { PublishedBulletin } from './bulletins.js';
import { evidenceWord, type InterfaceLanguage } from './evidence.js';
import { sectionName } from './i18n.js';
import { INTERFACE_LANGUAGES, localePath } from './locale.js';

/**
 * The site's feeds, built with the pages: an RSS feed per language, so a reader can follow
 * CSPNews from any feed reader, and a sitemap for search engines. Both need full URLs, so
 * they are the only place that knows the site's address.
 */

/** Where the site is published: `CSPNEWS_SITE`, or the site's own domain. */
export function siteOrigin(): string {
  return (process.env.CSPNEWS_SITE ?? 'https://www.cspnews.app').replace(/\/+$/, '');
}

/** Stories from this many newest bulletins stay in the feed: about a day and a half. */
export const FEED_BULLETINS = 6;

const FEED_WORDS = {
  en: {
    title: 'CSPNews',
    description: 'Four calm bulletins a day, every story with its evidence.',
  },
  tr: { title: 'CSPNews', description: 'Günde dört sakin bülten, her haber kanıtıyla.' },
} as const;

/** The feed's own path: `/feed.xml`, `/tr/feed.xml`. */
export function feedPath(lang: InterfaceLanguage): string {
  return localePath('/feed.xml', lang);
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

/**
 * RSS 2.0 for one language: one item per story of the newest bulletins, newest bulletin first
 * and in reading order inside it. An item carries the three summary lines and the evidence
 * label, never the full text: the story page is where the sources and the timeline are.
 */
export function rssFeed(
  bulletins: readonly PublishedBulletin[],
  lang: InterfaceLanguage,
  origin: string,
): string {
  const words = FEED_WORDS[lang];
  const recent = bulletins.slice(0, FEED_BULLETINS);
  const items = recent.flatMap((published) =>
    storiesIn(published, lang).map((story) => {
      const link = origin + storyPath(published, story, lang);
      const { what, why, next } = story.summary;
      const description = `${evidenceWord(story.label, lang)}. ${what} ${why} ${next}`;
      return [
        '    <item>',
        `      <title>${escapeXml(story.title)}</title>`,
        `      <link>${escapeXml(link)}</link>`,
        `      <guid isPermaLink="true">${escapeXml(link)}</guid>`,
        `      <pubDate>${new Date(story.updatedAt).toUTCString()}</pubDate>`,
        `      <category>${escapeXml(sectionName(story.section, lang))}</category>`,
        `      <description>${escapeXml(description)}</description>`,
        '    </item>',
      ].join('\n');
    }),
  );
  const newest = recent[0]?.bulletin.publishAt;
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '  <channel>',
    `    <title>${escapeXml(words.title)}</title>`,
    `    <link>${escapeXml(origin + localePath('/', lang))}</link>`,
    `    <description>${escapeXml(words.description)}</description>`,
    `    <language>${lang}</language>`,
    `    <atom:link href="${escapeXml(origin + feedPath(lang))}" rel="self" type="application/rss+xml"/>`,
    ...(newest ? [`    <lastBuildDate>${new Date(newest).toUTCString()}</lastBuildDate>`] : []),
    ...items,
    '  </channel>',
    '</rss>',
    '',
  ].join('\n');
}

/**
 * Every page worth finding, in both languages: the front page, each bulletin's Contents and
 * one-minute page, and each story. Settings, account and the Hot News shell are left out: they hold nothing to
 * search for.
 */
export function sitemapPaths(bulletins: readonly PublishedBulletin[]): string[] {
  return INTERFACE_LANGUAGES.flatMap((lang) => [
    localePath('/', lang),
    ...bulletins.flatMap((published) => [
      bulletinPath(published, lang),
      briefPath(published, lang),
      ...published.bulletin.stories.map((story) => storyPath(published, story, lang)),
    ]),
  ]);
}

export function sitemapXml(bulletins: readonly PublishedBulletin[], origin: string): string {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    ...sitemapPaths(bulletins).map((path) => `  <url><loc>${escapeXml(origin + path)}</loc></url>`),
    '</urlset>',
    '',
  ].join('\n');
}

export function robotsTxt(origin: string): string {
  return `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`;
}
