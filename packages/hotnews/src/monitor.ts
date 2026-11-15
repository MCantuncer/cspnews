import {
  parseHotFeed,
  type Article,
  type HotFeed,
  type HotStory,
  type Source,
} from '@cspnews/core';
import { groupStories, type Story } from '@cspnews/grouping';
import { storyLifecycle } from '@cspnews/verify';

import { assessHotNews, type HeatAssessment, type HeatOptions } from './heat.js';

/**
 * The Hot News monitor, from rules only: group the latest articles, score every story, and
 * publish the ones that are promoted as a feed the site reads (`/hot.json`). It is stateless:
 * a story stays in the feed while it is still hot and recent, and drops out when it is not, so
 * every run can start from the articles alone and a missed run costs nothing.
 */

/** Articles older than this are not read: a story older than `maxAgeHours` is never hot. */
export const MONITOR_WINDOW_HOURS = 6;
/** The feed shows at most this many stories (the feed schema allows ten). */
export const MONITOR_MAX_STORIES = 5;

const BREAKING_PREFIX = /^\s*(?:son\s+dak[iİıI]ka|breaking(?:\s+news)?)\s*[:|!\-–—]*\s*/i;

/** 3 to 8 words from the lead headline, without a "Breaking:" lead-in, within 60 characters. */
export function shortHeadline(title: string): string {
  const words = title.replace(BREAKING_PREFIX, '').split(/\s+/).filter(Boolean).slice(0, 8);
  let text = words.join(' ');
  while (text.length > 60 && words.length > 1) {
    words.pop();
    text = words.join(' ');
  }
  return text.replace(/[\s,;:–—-]+$/u, '').slice(0, 60);
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

function toHotStory(
  story: Story,
  assessment: HeatAssessment,
  sources: ReadonlyMap<string, Source>,
): HotStory | undefined {
  const label = assessment.evidence.label;
  const section = story.sections[0];
  const lead = story.articles.find((member) => !member.copyOf) ?? story.articles[0];
  if (!section || !lead || (label !== 'confirmed' && label !== 'reported')) return undefined;
  if (story.language !== 'tr' && story.language !== 'en') return undefined;

  const confirming = new Set(assessment.evidence.confirmingSourceIds);
  const seen = new Set<string>();
  const outlets = story.articles.flatMap(({ article }) => {
    if (seen.has(article.sourceId) || !sources.has(article.sourceId)) return [];
    seen.add(article.sourceId);
    return [
      { sourceId: article.sourceId, url: article.url, confirms: confirming.has(article.sourceId) },
    ];
  });
  if (outlets.length < 2) return undefined;

  const title = clip(lead.article.title.replace(BREAKING_PREFIX, '').trim(), 160);
  return {
    id: story.id,
    section,
    language: story.language,
    shortTitle: shortHeadline(lead.article.title),
    title,
    label,
    firstSeenAt: story.firstSeenAt.toISOString(),
    updatedAt: story.lastUpdatedAt.toISOString(),
    sources: outlets,
    timeline: storyLifecycle(story, sources)
      .slice(-40)
      .map((event) => ({ ...event, at: event.at.toISOString() })),
  };
}

export interface MonitorOptions extends Omit<HeatOptions, 'alreadyAlerted'> {
  readonly articles: readonly Article[];
  readonly sources: ReadonlyMap<string, Source>;
}

/** The Hot News feed for the latest articles; empty when nothing is hot. */
export function buildHotFeed({ articles, sources, ...heat }: MonitorOptions): HotFeed {
  const stories = new Map(groupStories(articles).map((story) => [story.id, story]));
  const hot = assessHotNews([...stories.values()], sources, heat)
    .filter((assessment) => assessment.promoted)
    .flatMap((assessment) => {
      const story = stories.get(assessment.storyId);
      const hotStory = story && toHotStory(story, assessment, sources);
      return hotStory ? [hotStory] : [];
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MONITOR_MAX_STORIES);
  return parseHotFeed({ version: 1, generatedAt: heat.now.toISOString(), stories: hot });
}
