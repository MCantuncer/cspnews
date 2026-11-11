import { isFeedSource, type Source } from '@cspnews/core';

export type FeedHealth =
  { readonly ok: true; readonly items: number } | { readonly ok: false; readonly reason: string };

const FEED_ROOT = /<(rss|feed|rdf:RDF)[\s>]/i;
const FEED_ITEM = /<(item|entry)[\s>]/gi;

/** Sources whose `url` is an RSS, RDF or Atom feed the health check can read. */
export function isFeed(source: Source): boolean {
  return isFeedSource(source);
}

/** Judges a fetched feed: it must answer 2xx, look like RSS/RDF/Atom and contain items. */
export function classifyFeed(status: number, body: string): FeedHealth {
  if (status < 200 || status >= 300) {
    return { ok: false, reason: `HTTP ${String(status)}` };
  }
  if (!FEED_ROOT.test(body)) {
    return { ok: false, reason: 'Not an RSS, RDF or Atom feed' };
  }
  const items = body.match(FEED_ITEM)?.length ?? 0;
  if (items === 0) {
    return { ok: false, reason: 'Feed has no items' };
  }
  return { ok: true, items };
}
