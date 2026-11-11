import type { Source, Tier } from '@cspnews/core';
import type { Story } from '@cspnews/grouping';

/** The picture shown with a story, always with credit to the outlet it came from. */
export interface StoryImage {
  readonly url: string;
  /** Outlet that published the picture, shown as the credit line. */
  readonly sourceId: string;
  readonly sourceName: string;
  /** Article the picture belongs to; the credit links there. */
  readonly articleUrl: string;
}

const TIER_ORDER: readonly Tier[] = ['wire', 'established', 'partisan', 'low'];

/**
 * Feed images that are not news photos: site logos, placeholders, avatars, tracking pixels.
 * Matched against the URL path, so a CDN host name never triggers it.
 */
const NOT_A_PHOTO =
  /(?:^|[/_.-])(?:logo|logos|placeholder|default|avatar|icon|favicon|sprite|blank|pixel|spacer)(?:[/_.-]|$)|\.(?:svg|gif|ico)$/i;

export function looksLikePhoto(url: string): boolean {
  try {
    return !NOT_A_PHOTO.test(new URL(url).pathname);
  } catch {
    return false;
  }
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
    url: best.member.article.imageUrl,
    sourceId: article.sourceId,
    sourceName: sources.get(article.sourceId)?.name ?? article.sourceId,
    articleUrl: article.url,
  };
}
