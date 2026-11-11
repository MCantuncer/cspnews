import type { Article, Section } from '@cspnews/core';

import {
  add,
  containment,
  cosine,
  inverseDocumentFrequency,
  shingles,
  weigh,
  type Vector,
} from './similarity.js';
import { terms, words } from './tokens.js';

/** One article inside a story. `copyOf` marks a republished wire copy of another article. */
export interface StoryArticle {
  readonly article: Article;
  /** Id of the earlier article whose text this one repeats; it is not independent reporting. */
  readonly copyOf?: string;
}

/** Articles from one or more outlets about the same event. */
export interface Story {
  /** Stable id: the id of the story's first article. */
  readonly id: string;
  readonly language: string;
  readonly sections: readonly Section[];
  /** Oldest first. */
  readonly articles: readonly StoryArticle[];
  readonly firstSeenAt: Date;
  readonly lastUpdatedAt: Date;
}

export interface GroupOptions {
  /** Minimum similarity between an article and a story to join it. */
  readonly joinThreshold?: number;
  /** Text overlap at which an article counts as a copy of an earlier one. */
  readonly copyThreshold?: number;
  /** An article more than this many hours after a story's latest article starts a new story. */
  readonly maxGapHours?: number;
}

/**
 * Starting values. The Turkish and English cases in group.test.ts pass from 0.2 to 0.4 for
 * joining and from 0.3 to 0.6 for copies; tune these on real collected batches.
 */
export const DEFAULT_GROUP_OPTIONS: Required<GroupOptions> = {
  joinThreshold: 0.3,
  copyThreshold: 0.6,
  maxGapHours: 36,
};

/** Only the start of the summary: it carries the facts; the rest drifts into background. */
const SUMMARY_LEAD_LENGTH = 300;

interface Prepared {
  readonly article: Article;
  readonly terms: readonly string[];
  readonly shingles: ReadonlySet<string>;
}

interface Draft {
  readonly language: string;
  readonly members: StoryArticle[];
  readonly prepared: Prepared[];
  readonly centroid: Map<string, number>;
  latest: Date;
}

function prepare(article: Article): Prepared {
  const lead = article.summary.slice(0, SUMMARY_LEAD_LENGTH);
  const titleTerms = terms(article.title, article.language);
  return {
    article,
    // The headline is listed twice so it outweighs the summary.
    terms: [...titleTerms, ...titleTerms, ...terms(lead, article.language)],
    shingles: shingles(words(`${article.title} ${lead}`, article.language)),
  };
}

function toStory(draft: Draft): Story {
  const first = draft.members[0];
  if (!first) {
    throw new Error('A story needs at least one article');
  }
  const sections = new Set(draft.members.flatMap((member) => member.article.sections));
  return {
    id: first.article.id,
    language: draft.language,
    sections: [...sections],
    articles: draft.members,
    firstSeenAt: first.article.publishedAt,
    lastUpdatedAt: draft.latest,
  };
}

/**
 * Groups articles about the same event into stories, with rules only:
 *
 * 1. Articles are read oldest first. Each joins the most similar open story in its language
 *    (TF-IDF cosine against the story's combined terms), or starts a new one.
 * 2. Inside a story, an article whose wording mostly repeats an earlier article from another
 *    source is marked as a copy (`copyOf`), so wire copies are never counted as independent
 *    confirmation.
 *
 * Stories in different languages are not merged here; matching a Turkish story to an English
 * one needs translation, which the Verify step does.
 */
export function groupStories(articles: readonly Article[], options: GroupOptions = {}): Story[] {
  const { joinThreshold, copyThreshold, maxGapHours } = { ...DEFAULT_GROUP_OPTIONS, ...options };
  const maxGapMs = maxGapHours * 60 * 60 * 1000;

  const prepared = [...articles]
    .sort((a, b) => a.publishedAt.getTime() - b.publishedAt.getTime() || a.id.localeCompare(b.id))
    .map(prepare);
  const idf = inverseDocumentFrequency(prepared.map((item) => item.terms));
  const drafts: Draft[] = [];

  for (const item of prepared) {
    const vector: Vector = weigh(item.terms, idf);
    let best: Draft | undefined;
    let bestScore = joinThreshold;
    for (const draft of drafts) {
      if (
        draft.language !== item.article.language ||
        item.article.publishedAt.getTime() - draft.latest.getTime() > maxGapMs
      ) {
        continue;
      }
      const score = cosine(vector, draft.centroid);
      if (score >= bestScore) {
        best = draft;
        bestScore = score;
      }
    }

    if (!best) {
      drafts.push({
        language: item.article.language,
        members: [{ article: item.article }],
        prepared: [item],
        centroid: new Map(vector),
        latest: item.article.publishedAt,
      });
      continue;
    }

    const original = best.prepared.find(
      (earlier) =>
        earlier.article.sourceId !== item.article.sourceId &&
        containment(earlier.shingles, item.shingles) >= copyThreshold,
    );
    best.members.push(
      original ? { article: item.article, copyOf: original.article.id } : { article: item.article },
    );
    best.prepared.push(item);
    add(best.centroid, vector);
    best.latest = item.article.publishedAt;
  }

  return drafts.map(toStory).sort((a, b) => b.lastUpdatedAt.getTime() - a.lastUpdatedAt.getTime());
}

/** Sources that reported a story themselves, not by republishing another outlet's copy. */
export function reportingSourceIds(story: Story): string[] {
  return [
    ...new Set(
      story.articles.filter((member) => !member.copyOf).map((member) => member.article.sourceId),
    ),
  ];
}
