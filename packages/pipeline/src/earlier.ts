import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseBulletin } from '@cspnews/core';

import type { Candidate, CandidatesFile } from './candidates.js';

/**
 * Stories published in the last few days, so a candidate that is the same story again can say
 * so. Two stories are the same when they share an article: outlets keep updating one article
 * as a story moves, and that article is already in the earlier story's sources. The writer
 * still decides (a shared article is a hint, not a verdict) and names the earlier story in
 * `continues` (docs/publishing.md, "Continuing stories").
 */
export interface EarlierStory {
  readonly id: string;
  /** `<yyyy-mm-dd>-<slot>`, the bulletin's file name without `.json`. */
  readonly bulletin: string;
  readonly publishAt: string;
  readonly title: string;
  readonly urls: ReadonlySet<string>;
  /** The id of the earlier story it continues, if any. */
  readonly continues?: string;
}

/** What a candidate may continue: the newest published version of the same story. */
export interface ContinuesHint {
  readonly storyId: string;
  readonly bulletin: string;
  readonly title: string;
  /** How many articles the two share. */
  readonly sharedArticles: number;
}

/** An article address without the parts that differ between links to the same page. */
export function normalizeUrl(url: string): string {
  try {
    const parsed = new URL(url);
    parsed.hash = '';
    for (const key of [...parsed.searchParams.keys()]) {
      if (key.startsWith('utm_')) parsed.searchParams.delete(key);
    }
    return `${parsed.hostname.toLowerCase()}${parsed.pathname.replace(/\/+$/, '')}${parsed.search}`;
  } catch {
    return url;
  }
}

/** The stories of bulletins published in the `days` before `now`. Unreadable files are skipped. */
export function earlierStories(directory: string, now: Date, days = 3): EarlierStory[] {
  if (!existsSync(directory)) return [];
  const from = now.getTime() - days * 24 * 3_600_000;
  return readdirSync(directory)
    .filter((name) => /^\d{4}-\d{2}-\d{2}-[a-z]+\.json$/.test(name))
    .flatMap((name) => {
      try {
        const bulletin = parseBulletin(JSON.parse(readFileSync(join(directory, name), 'utf8')));
        const at = Date.parse(bulletin.publishAt);
        if (at < from || at >= now.getTime()) return [];
        return bulletin.stories.map((story): EarlierStory => ({
          id: story.id,
          bulletin: name.replace(/\.json$/, ''),
          publishAt: bulletin.publishAt,
          title: story.versions.en.shortTitle,
          urls: new Set(story.sources.map((source) => normalizeUrl(source.url))),
          ...(story.continues === undefined ? {} : { continues: story.continues }),
        }));
      } catch {
        return [];
      }
    });
}

/**
 * The earlier story a candidate shares the most articles with, moved on to the newest report of
 * that story (a story already continued by a later one is never continued twice).
 */
export function continuesHint(
  candidate: Pick<Candidate, 'articles'>,
  earlier: readonly EarlierStory[],
): ContinuesHint | undefined {
  const urls = new Set(candidate.articles.map((article) => normalizeUrl(article.url)));
  let best: { story: EarlierStory; shared: number } | undefined;
  for (const story of earlier) {
    const shared = [...story.urls].filter((url) => urls.has(url)).length;
    if (shared === 0) continue;
    if (
      !best ||
      shared > best.shared ||
      (shared === best.shared && story.publishAt > best.story.publishAt)
    ) {
      best = { story, shared };
    }
  }
  if (!best) return undefined;
  let newest = best.story;
  for (;;) {
    const next = earlier.find((story) => story.continues === newest.id);
    if (!next) break;
    newest = next;
  }
  return {
    storyId: newest.id,
    bulletin: newest.bulletin,
    title: newest.title,
    sharedArticles: best.shared,
  };
}

/** The candidates file with a `continues` hint on every news candidate that has one. */
export function withContinuesHints(
  file: CandidatesFile,
  earlier: readonly EarlierStory[],
): CandidatesFile {
  const sections = Object.fromEntries(
    Object.entries(file.sections).map(([section, list]) => [
      section,
      list.map((candidate): Candidate => {
        const hint = continuesHint(candidate, earlier);
        return hint ? { ...candidate, continues: hint } : candidate;
      }),
    ]),
  ) as unknown as CandidatesFile['sections'];
  return { ...file, sections };
}
