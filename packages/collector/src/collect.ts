import { isFeedSource, type Article, type Source } from '@cspnews/core';

import { toArticle } from './normalize.js';
import { parseFeed } from './parse.js';

export type FetchText = (url: string) => Promise<string>;

export interface CollectOptions {
  /** Fetches a URL and returns its body; throws on failure. Injected so tests need no network. */
  readonly fetchText: FetchText;
  /** The moment of collection. */
  readonly now: Date;
  /** Only articles published at or after this instant are kept. */
  readonly since?: Date;
}

export interface SourceFailure {
  readonly sourceId: string;
  readonly reason: string;
}

export interface CollectResult {
  /** New articles, newest first, one per canonical URL. */
  readonly articles: Article[];
  /** Sources that couldn't be read this run. One failure never stops the others. */
  readonly failures: SourceFailure[];
}

async function collectSource(source: Source, options: CollectOptions): Promise<Article[]> {
  const items = parseFeed(await options.fetchText(source.url));
  return items
    .map((item) => toArticle(item, source, options.now))
    .filter((article): article is Article => article !== undefined)
    .filter((article) => !options.since || article.publishedAt >= options.since);
}

/** Reads every enabled feed source and returns their articles, de-duplicated by URL. */
export async function collect(
  sources: readonly Source[],
  options: CollectOptions,
): Promise<CollectResult> {
  const feeds = sources.filter((source) => source.enabled && isFeedSource(source));
  const settled = await Promise.allSettled(feeds.map((source) => collectSource(source, options)));

  const failures: SourceFailure[] = [];
  const byId = new Map<string, Article>();
  settled.forEach((result, index) => {
    const source = feeds[index];
    if (!source) {
      return;
    }
    if (result.status === 'rejected') {
      const reason: unknown = result.reason;
      failures.push({
        sourceId: source.id,
        reason: reason instanceof Error ? reason.message : String(reason),
      });
      return;
    }
    for (const article of result.value) {
      // The first source to report a URL keeps it; sources are ordered in the registry.
      if (!byId.has(article.id)) {
        byId.set(article.id, article);
      }
    }
  });

  const articles = [...byId.values()].sort(
    (a, b) => b.publishedAt.getTime() - a.publishedAt.getTime(),
  );
  return { articles, failures };
}

/** A `fetchText` backed by the global fetch, with a timeout and a clear user agent. */
export function httpFetchText(timeoutMs = 20_000): FetchText {
  return async (url) => {
    const response = await fetch(url, {
      headers: {
        'user-agent': 'CSPNews collector (+https://github.com/MCantuncer/cspnews)',
        accept: 'application/rss+xml, application/atom+xml, application/xml, */*',
      },
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!response.ok) {
      throw new Error(`HTTP ${String(response.status)}`);
    }
    return response.text();
  };
}
