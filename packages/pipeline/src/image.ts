import type { Source, StoryImage, Tier } from '@cspnews/core';
import type { Story } from '@cspnews/grouping';

const TIER_ORDER: readonly Tier[] = ['wire', 'established', 'partisan', 'low'];

/**
 * Feed images that are not news photos: site logos, placeholders, avatars, tracking pixels.
 * Matched against the URL path, so a CDN host name never triggers it.
 */
const NOT_A_PHOTO =
  /(?:^|[/_.-])(?:logo|logos|placeholder|default|avatar|icon|favicon|sprite|blank|pixel|spacer)(?:[/_.-]|$)|\.(?:svg|gif|ico)$/i;

/**
 * Image hosts whose full-size photos carry the outlet's logo stamped on them (The Guardian adds
 * it to every share image, and its feeds only carry 140px thumbnails), so neither size is usable.
 */
const LOGO_STAMPED_HOSTS = new Set(['i.guim.co.uk']);

export function looksLikePhoto(url: string): boolean {
  try {
    const { hostname, pathname } = new URL(url);
    return !LOGO_STAMPED_HOSTS.has(hostname) && !NOT_A_PHOTO.test(pathname);
  } catch {
    return false;
  }
}

/**
 * The largest size of a feed photo that the outlet's image server offers for the same picture.
 * BBC feeds point at a 240px copy (`/ace/standard/240/…`); the same path serves 976px.
 */
export function largestPhotoUrl(url: string): string {
  try {
    const parsed = new URL(url);
    if (parsed.hostname === 'ichef.bbci.co.uk') {
      parsed.pathname = parsed.pathname.replace(
        /^\/(ace\/standard|ace\/ws|news)\/\d+\//,
        '/$1/976/',
      );
      return parsed.href;
    }
  } catch {
    // Not a URL: leave it as it is.
  }
  return url;
}

/**
 * Picks the most trustworthy picture for a story: from an outlet that confirms it, the
 * strongest tier first, original reporting before copies, earliest first. Returns undefined
 * when no article has a real photo; the site then shows the story without one, never a
 * random stock image.
 */
export function pickImage(
  story: Story,
  sources: ReadonlyMap<string, Source>,
  confirmingSourceIds: readonly string[],
): StoryImage | undefined {
  const confirming = new Set(confirmingSourceIds);
  const rank = (sourceId: string, copy: boolean): number => {
    const source = sources.get(sourceId);
    const tier = source ? TIER_ORDER.indexOf(source.tier) : TIER_ORDER.length;
    return (confirming.has(sourceId) ? 0 : 100) + tier * 10 + (copy ? 1 : 0);
  };

  const best = story.articles
    .filter(({ article }) => article.imageUrl && looksLikePhoto(article.imageUrl))
    .map((member, index) => ({
      member,
      index,
      rank: rank(member.article.sourceId, !!member.copyOf),
    }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)[0];
  if (!best?.member.article.imageUrl) {
    return undefined;
  }
  const { article } = best.member;
  return {
    url: largestPhotoUrl(best.member.article.imageUrl),
    sourceId: article.sourceId,
    sourceName: sources.get(article.sourceId)?.name ?? article.sourceId,
    articleUrl: article.url,
  };
}
