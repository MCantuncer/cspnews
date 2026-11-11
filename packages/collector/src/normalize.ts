import type { Article, Source } from '@cspnews/core';

import type { FeedItem } from './parse.js';
import { toPlainText } from './text.js';
import { articleIdFor, canonicalUrl } from './url.js';

/** Summaries are only a lead-in for grouping and writing; longer text is cut. */
export const MAX_SUMMARY_LENGTH = 1_000;

function parseDate(value: string | undefined): Date | undefined {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}

function truncate(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/**
 * Turns a feed entry into an Article. Returns undefined for entries that can't be used:
 * no title, or no valid link. A missing or invalid date falls back to `fetchedAt`,
 * and a date in the future is clamped to it.
 */
export function toArticle(item: FeedItem, source: Source, fetchedAt: Date): Article | undefined {
  const title = toPlainText(item.title);
  const url = canonicalUrl(item.link);
  if (!title || !url) {
    return undefined;
  }
  const published = parseDate(item.published);
  const publishedAt = published && published <= fetchedAt ? published : fetchedAt;
  const imageUrl = item.imageUrl ? canonicalUrl(item.imageUrl) : undefined;

  return {
    id: articleIdFor(url),
    sourceId: source.id,
    url,
    title,
    summary: truncate(toPlainText(item.summary), MAX_SUMMARY_LENGTH),
    publishedAt,
    language: source.language,
    sections: source.sections,
    ...(imageUrl ? { imageUrl } : {}),
  };
}
