import {
  parseHotFeed,
  type Article,
  type HotFeed,
  type HotStory,
  type HotSummary,
  type Language,
  type Source,
  type StoryImage,
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
export const MONITOR_WINDOW_HOURS = 8;
/** The feed shows at most this many stories (the feed schema allows ten). */
export const MONITOR_MAX_STORIES = 8;

const isLanguage = (value: string): value is Language => value === 'tr' || value === 'en';

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

/** A summary is shown up to this long, cut after a whole sentence where one fits. */
export const SUMMARY_MAX = 320;
const SUMMARY_MIN = 60;

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * An outlet's feed description, cleaned of what feeds add around the text: a repeated
 * headline, a date stamp, the outlet's own name, WordPress's "The post … appeared first on"
 * line. Cut after whole sentences within SUMMARY_MAX. Undefined when too little is left.
 */
export function cleanSummary(
  summary: string,
  title: string,
  outletName: string,
): string | undefined {
  let text = summary
    .replace(/\s+/g, ' ')
    .replace(/\bThe post .*? appeared first on .*$/i, '')
    .replace(BREAKING_PREFIX, '');
  const headline = title.replace(BREAKING_PREFIX, '').trim();
  if (headline.length > 0) text = text.replace(new RegExp(escape(headline), 'g'), ' ');
  text = text
    .replace(/^\s*\d{1,2}[./]\d{1,2}[./]\d{4}\s*/, '')
    .replace(new RegExp(`^\\s*${escape(outletName)}\\s+`), '')
    .replace(new RegExp(`\\s+${escape(outletName)}\\s*$`), '')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length < SUMMARY_MIN) return undefined;
  if (text.length <= SUMMARY_MAX) return text;
  const sentences = text.match(/[^.!?…]+[.!?…]+["'”’)]*\s*/gu) ?? [];
  let cut = '';
  for (const sentence of sentences) {
    if ((cut + sentence).trim().length > SUMMARY_MAX) break;
    cut += sentence;
  }
  return cut.trim().length >= SUMMARY_MIN ? cut.trim() : clip(text, SUMMARY_MAX);
}

/**
 * The story's summary: the first outlet, in the order they reported, whose feed gives a usable
 * description in the story's language. Original reporting before copies.
 */
function summaryOf(story: Story, sources: ReadonlyMap<string, Source>): HotSummary | undefined {
  const members = [
    ...story.articles.filter((member) => !member.copyOf),
    ...story.articles.filter((member) => member.copyOf),
  ];
  for (const { article } of members) {
    const source = sources.get(article.sourceId);
    if (!source || article.language !== story.language) continue;
    const text = cleanSummary(article.summary, article.title, source.name);
    if (text) return { text, sourceId: article.sourceId };
  }
  return undefined;
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
      {
        sourceId: article.sourceId,
        url: article.url,
        confirms: confirming.has(article.sourceId),
        title: clip(article.title.replace(BREAKING_PREFIX, '').trim(), 200),
        ...(isLanguage(article.language) ? { language: article.language } : {}),
        publishedAt: article.publishedAt.toISOString(),
      },
    ];
  });
  if (outlets.length < 2) return undefined;

  const title = clip(lead.article.title.replace(BREAKING_PREFIX, '').trim(), 160);
  const summary = summaryOf(story, sources);
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
    ...(summary ? { summary } : {}),
  };
}

export interface MonitorOptions extends Omit<HeatOptions, 'alreadyAlerted'> {
  readonly articles: readonly Article[];
  readonly sources: ReadonlyMap<string, Source>;
  /**
   * Picks a hot story's photo from its articles (the pipeline's `pickImage`). The monitor
   * only names it; the run saves it next to the feed and adds it to the story.
   */
  readonly pickPhoto?: (
    story: Story,
    confirmingSourceIds: readonly string[],
  ) => StoryImage | undefined;
}

export interface HotFeedWithPhotos {
  readonly feed: HotFeed;
  /** Story id to the photo `pickPhoto` chose, for the stories in the feed. */
  readonly photos: ReadonlyMap<string, StoryImage>;
}

/** The Hot News feed for the latest articles, and the photo picked for each story. */
export function buildHotFeedWithPhotos({
  articles,
  sources,
  pickPhoto,
  ...heat
}: MonitorOptions): HotFeedWithPhotos {
  const stories = new Map(groupStories(articles).map((story) => [story.id, story]));
  const photos = new Map<string, StoryImage>();
  const hot = assessHotNews([...stories.values()], sources, heat)
    .filter((assessment) => assessment.promoted)
    .flatMap((assessment) => {
      const story = stories.get(assessment.storyId);
      const hotStory = story && toHotStory(story, assessment, sources);
      if (!story || !hotStory) return [];
      const photo = pickPhoto?.(story, assessment.evidence.confirmingSourceIds);
      if (photo) photos.set(story.id, photo);
      return [hotStory];
    })
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    .slice(0, MONITOR_MAX_STORIES);
  const feed = parseHotFeed({ version: 1, generatedAt: heat.now.toISOString(), stories: hot });
  const kept = new Set(feed.stories.map((story) => story.id));
  return { feed, photos: new Map([...photos].filter(([id]) => kept.has(id))) };
}

/** The Hot News feed for the latest articles; empty when nothing is hot. */
export function buildHotFeed(options: MonitorOptions): HotFeed {
  return buildHotFeedWithPhotos(options).feed;
}
