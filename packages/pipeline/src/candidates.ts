import type { Camp, Desk, Section, Source, StoryImage, Tier } from '@cspnews/core';
import type { Story } from '@cspnews/grouping';
import {
  evidenceFor,
  storyLifecycle,
  type Evidence,
  type EvidenceLabel,
  type LifecycleEvent,
} from '@cspnews/verify';

import { pickImage } from './image.js';

/**
 * Candidates file: everything the scheduled Verify and Write run needs for one bulletin,
 * as plain JSON. Rules did the collecting, grouping and labelling; the run reads this,
 * checks claims, picks stories and writes them.
 */
export interface CandidatesFile {
  readonly version: 1;
  readonly bulletin: { readonly slot: string; readonly publishAt: string };
  readonly generatedAt: string;
  readonly window: { readonly since: string; readonly until: string };
  readonly sections: Readonly<Record<Section, readonly Candidate[]>>;
  /**
   * Candidates for the parts outside the news: light stories and rumours for And finally, and
   * football moves for Transfers. Filled from the sources that feed each desk.
   */
  readonly desks: Readonly<Record<Desk, readonly Candidate[]>>;
  readonly failures: readonly { readonly sourceId: string; readonly reason: string }[];
}

export interface Candidate {
  readonly storyId: string;
  readonly language: string;
  readonly label: EvidenceLabel;
  readonly developing: boolean;
  readonly reasons: Evidence['reasons'];
  readonly score: number;
  readonly firstSeenAt: string;
  readonly lastUpdatedAt: string;
  /** The story's picture with its credit; absent when no outlet had a real photo. */
  readonly image?: StoryImage;
  readonly sources: readonly CandidateSource[];
  /** The story's own life: first report, outlets joining, label changes. Oldest first. */
  readonly timeline: readonly TimelineEvent[];
  readonly articles: readonly CandidateArticle[];
}

/** A lifecycle event with its time as an ISO string, for JSON. */
export type TimelineEvent = Omit<LifecycleEvent, 'at'> & { readonly at: string };

export interface CandidateSource {
  readonly id: string;
  readonly name: string;
  readonly camp: Camp;
  readonly tier: Tier;
  /** False for outlets that only republished another outlet's text, or don't count. */
  readonly confirms: boolean;
}

export interface CandidateArticle {
  readonly sourceId: string;
  readonly url: string;
  readonly title: string;
  readonly summary: string;
  readonly publishedAt: string;
  readonly copyOf?: string;
  readonly imageUrl?: string;
}

const LABEL_WEIGHT: Readonly<Record<EvidenceLabel, number>> = {
  confirmed: 3,
  reported: 2,
  disputed: 1,
  'single-source': 0,
};

/**
 * Ranks stories for the writer: more independent owners and a stronger label first, then
 * freshness. A score, not a verdict; the Verify and Write run makes the final pick.
 */
export function scoreStory(story: Story, evidence: Evidence, now: Date): number {
  const hoursOld = (now.getTime() - story.lastUpdatedAt.getTime()) / 3_600_000;
  const freshness = Math.max(0, 1 - hoursOld / 24);
  const score =
    evidence.confirmingSourceIds.length * 2 + LABEL_WEIGHT[evidence.label] + freshness * 2;
  return Math.round(score * 100) / 100;
}

export interface CandidateOptions {
  readonly now: Date;
  /** Most stories kept per section. */
  readonly perSection?: number;
}

function candidateFor(story: Story, sources: ReadonlyMap<string, Source>, now: Date): Candidate {
  const evidence = evidenceFor(story, sources, { now });
  const confirming = new Set(evidence.confirmingSourceIds);
  const sourceIds = [...new Set(story.articles.map((member) => member.article.sourceId))];
  const image = pickImage(story, sources, evidence.confirmingSourceIds);
  return {
    storyId: story.id,
    language: story.language,
    label: evidence.label,
    developing: evidence.developing,
    reasons: evidence.reasons,
    score: scoreStory(story, evidence, now),
    firstSeenAt: story.firstSeenAt.toISOString(),
    lastUpdatedAt: story.lastUpdatedAt.toISOString(),
    ...(image ? { image } : {}),
    sources: sourceIds.flatMap((id) => {
      const source = sources.get(id);
      return source
        ? [
            {
              id,
              name: source.name,
              camp: source.camp,
              tier: source.tier,
              confirms: confirming.has(id),
            },
          ]
        : [];
    }),
    timeline: storyLifecycle(story, sources).map((event) => ({
      ...event,
      at: event.at.toISOString(),
    })),
    articles: story.articles.map(({ article, copyOf }) => ({
      sourceId: article.sourceId,
      url: article.url,
      title: article.title,
      summary: article.summary,
      publishedAt: article.publishedAt.toISOString(),
      ...(copyOf ? { copyOf } : {}),
      ...(article.imageUrl ? { imageUrl: article.imageUrl } : {}),
    })),
  };
}

/** Strongest first, then the most recently updated, keeping at most `limit`. */
function ranked(candidates: readonly Candidate[], limit: number): Candidate[] {
  return [...candidates]
    .sort((a, b) => b.score - a.score || b.lastUpdatedAt.localeCompare(a.lastUpdatedAt))
    .slice(0, limit);
}

export function toCandidates(
  stories: readonly Story[],
  sources: ReadonlyMap<string, Source>,
  { now, perSection = 15 }: CandidateOptions,
): Record<Section, Candidate[]> {
  const sections: Record<Section, Candidate[]> = { turkey: [], tech: [], world: [] };

  for (const story of stories) {
    if (story.sections.length === 0) continue;
    const candidate = candidateFor(story, sources, now);
    for (const section of story.sections) {
      sections[section].push(candidate);
    }
  }

  for (const section of Object.keys(sections) as Section[]) {
    sections[section] = ranked(sections[section], perSection);
  }
  return sections;
}

export interface DeskCandidateOptions {
  readonly now: Date;
  /** Most stories kept per desk. */
  readonly perDesk?: number;
}

/**
 * Candidates for each desk: a story goes to a desk when any of its articles came from a source
 * that feeds that desk. A story can also be in a news section when other outlets covered it.
 */
export function toDeskCandidates(
  stories: readonly Story[],
  sources: ReadonlyMap<string, Source>,
  { now, perDesk = 12 }: DeskCandidateOptions,
): Record<Desk, Candidate[]> {
  const desks: Record<Desk, Candidate[]> = { light: [], transfers: [] };

  for (const story of stories) {
    const storyDesks = new Set(
      story.articles.flatMap(({ article }) => sources.get(article.sourceId)?.desks ?? []),
    );
    if (storyDesks.size === 0) continue;
    const candidate = candidateFor(story, sources, now);
    for (const desk of storyDesks) {
      desks[desk].push(candidate);
    }
  }

  for (const desk of Object.keys(desks) as Desk[]) {
    desks[desk] = ranked(desks[desk], perDesk);
  }
  return desks;
}
