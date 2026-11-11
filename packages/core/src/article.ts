import type { Section } from './sections.js';

/**
 * One article as read from a source feed, normalised so every later step (grouping,
 * verification, writing) works with the same shape whatever the feed format was.
 */
export interface Article {
  /** Stable id derived from the canonical URL. */
  readonly id: string;
  readonly sourceId: string;
  /** Canonical URL: tracking parameters and fragments removed. */
  readonly url: string;
  readonly title: string;
  /** Plain-text summary from the feed, HTML removed. May be empty. */
  readonly summary: string;
  readonly publishedAt: Date;
  /** ISO 639-1 language of the article. */
  readonly language: string;
  readonly sections: readonly Section[];
  readonly imageUrl?: string;
}
