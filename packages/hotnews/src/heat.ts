import type { Source } from '@cspnews/core';
import { words, type Story } from '@cspnews/grouping';
import { canAlert, evidenceFor, type Evidence } from '@cspnews/verify';

/**
 * Words that mark breaking events, by language. A word ending in `*` matches any word that
 * starts with it ("deprem*" matches "depremde"); any other word must match a whole word, so
 * "sel" (flood) never matches "Selahattin" and "dead" never matches "deadline". A phrase matches
 * its words in a row.
 */
const URGENT_WORDS: Readonly<Record<string, readonly string[]>> = {
  tr: [
    'son dakika',
    'deprem*',
    'artçı*',
    'tsunami*',
    'patlama*',
    'saldırı*',
    'silahlı*',
    'bombalı*',
    'füze*',
    'yangın*',
    'sel',
    'selde',
    'heyelan*',
    'çığ',
    'kasırga*',
    'fırtına*',
    'hayatını kaybet*',
    'öldü*',
    'ölü',
    'can kaybı*',
    'yaralı*',
    'yaraland*',
    'enkaz*',
    'tahliye*',
    'rehine*',
    'çatışma*',
    'suikast*',
    'darbe girişimi*',
    'istifa*',
    'gözaltı*',
    'tutuklan*',
    'olağanüstü hal*',
    'ohal',
    'kırmızı alarm*',
  ],
  en: [
    'breaking',
    'earthquake*',
    'aftershock*',
    'tsunami*',
    'explosion*',
    'blast*',
    'attack*',
    'airstrike*',
    'missile*',
    'drone strike*',
    'shooting*',
    'gunman',
    'gunmen',
    'wildfire*',
    'flood*',
    'landslide*',
    'hurricane*',
    'typhoon*',
    'cyclone*',
    'killed',
    'kills',
    'dead',
    'dies',
    'death toll*',
    'injured',
    'evacuat*',
    'hostage*',
    'coup',
    'assassinat*',
    'resign*',
    'arrested',
    'emergency',
    'crash',
    'crashes',
    'collapse*',
  ],
};

/** The urgent words as patterns over a title's words, separated and wrapped by single spaces. */
const URGENT_PATTERNS: Readonly<Record<string, readonly RegExp[]>> = Object.fromEntries(
  Object.entries(URGENT_WORDS).map(([language, list]) => [
    language,
    list.map((word) => {
      const prefix = word.endsWith('*');
      const body = (prefix ? word.slice(0, -1) : word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      return new RegExp(` ${body}${prefix ? '' : ' '}`, 'u');
    }),
  ]),
);

/** Why a story was or wasn't promoted to Hot News; shown on the Monitor page (US-40). */
export type HeatReason =
  'promoted' | 'below-threshold' | 'single-source' | 'disputed' | 'already-alerted' | 'too-old';

export interface HeatComponents {
  /** Independent owners with an article in the last `windowMinutes`. */
  readonly recentOwners: number;
  /** Independent owners overall. */
  readonly owners: number;
  readonly urgent: boolean;
  readonly wire: boolean;
}

export interface HeatAssessment {
  readonly storyId: string;
  readonly title: string;
  /** Heat now. */
  readonly heat: number;
  /** The highest heat the story reached; promotion is decided on this. */
  readonly peakHeat: number;
  readonly components: HeatComponents;
  readonly evidence: Evidence;
  readonly promoted: boolean;
  readonly reason: HeatReason;
}

export interface HeatOptions {
  readonly now: Date;
  /** Story ids already sent as Hot News; they are never sent twice. */
  readonly alreadyAlerted?: ReadonlySet<string>;
  /** Heat needed to promote a story with an urgent headline. */
  readonly threshold?: number;
  /** Heat needed to promote a story without one. */
  readonly calmThreshold?: number;
  /** How recent an article must be to count towards velocity. */
  readonly windowMinutes?: number;
  /** Stories first seen longer ago than this are not breaking any more. */
  readonly maxAgeHours?: number;
}

export const DEFAULT_HEAT_THRESHOLD = 8;
/**
 * Heat needed when no headline carries an urgent word: four outlets with different owners
 * within the hour. Three outlets on a party meeting or a football quote is a busy news day,
 * not breaking news.
 */
export const DEFAULT_CALM_THRESHOLD = 12;
/** A story stays Hot News this long after it was first seen; the next bulletin takes it on. */
export const DEFAULT_MAX_AGE_HOURS = 6;

/** True when a headline carries an urgent word in its own language. */
export function isUrgentTitle(title: string, language: string): boolean {
  // "Deprem mi oldu?" pages answer searches; they are not reports of an event.
  if (title.trim().endsWith('?')) return false;
  const text = ` ${words(title, language).join(' ')} `;
  return (URGENT_PATTERNS[language] ?? []).some((pattern) => pattern.test(text));
}

function isUrgent(story: Story, at: Date): boolean {
  return story.articles.some(
    ({ article }) => article.publishedAt <= at && isUrgentTitle(article.title, article.language),
  );
}

/**
 * Heat: how strongly a story looks like breaking news at a moment `now`, from rules only and
 * from the articles published by then.
 *
 *   heat = 2 × owners in the last hour + owners overall + 3 if urgent + 1 if a wire has it
 *
 * Three outlets with different owners on an earthquake within the hour scores 13; two
 * outlets on a scheduled rate decision score about 7, which stays in the next bulletin.
 */
export function heatOf(
  story: Story,
  evidence: Evidence,
  sources: ReadonlyMap<string, Source>,
  now: Date,
  windowMinutes = 60,
): { heat: number; components: HeatComponents } {
  const confirmingOwners = new Set(
    evidence.confirmingSourceIds.flatMap((id) => sources.get(id)?.ownerGroup ?? []),
  );
  const since = now.getTime() - windowMinutes * 60_000;
  const owners = new Set<string>();
  const recent = new Set<string>();
  let wire = false;

  for (const { article, copyOf } of story.articles) {
    const source = sources.get(article.sourceId);
    // Only reporting that counts as confirmation adds heat: no copies, aggregators or checks.
    if (
      !source ||
      copyOf ||
      source.tier === 'low' ||
      !confirmingOwners.has(source.ownerGroup) ||
      article.publishedAt > now
    ) {
      continue;
    }
    owners.add(source.ownerGroup);
    if (source.tier === 'wire') {
      wire = true;
    }
    if (article.publishedAt.getTime() >= since) {
      recent.add(source.ownerGroup);
    }
  }

  const components: HeatComponents = {
    recentOwners: recent.size,
    owners: owners.size,
    urgent: isUrgent(story, now),
    wire,
  };
  const heat =
    2 * components.recentOwners +
    components.owners +
    (components.urgent ? 3 : 0) +
    (components.wire ? 1 : 0);
  return { heat, components };
}

/**
 * The highest heat a story has reached so far: its heat as each article arrived, and now.
 * Heat falls once outlets stop adding reports, but a story that was breaking stays Hot News
 * for `maxAgeHours`, so a reader who arrives an hour later still finds it. Computed from the
 * articles alone, so the monitor needs no memory of earlier runs.
 */
export function peakHeatOf(
  story: Story,
  evidence: Evidence,
  sources: ReadonlyMap<string, Source>,
  now: Date,
  windowMinutes = 60,
): number {
  const moments = [
    now,
    ...story.articles.map(({ article }) => article.publishedAt).filter((at) => at <= now),
  ];
  return Math.max(...moments.map((at) => heatOf(story, evidence, sources, at, windowMinutes).heat));
}

/**
 * Scores every story and decides which become Hot News. Every story gets a reason, so the
 * Monitor page can show why something was or wasn't promoted. Hottest first.
 */
export function assessHotNews(
  stories: readonly Story[],
  sources: ReadonlyMap<string, Source>,
  options: HeatOptions,
): HeatAssessment[] {
  const {
    now,
    alreadyAlerted = new Set<string>(),
    threshold = DEFAULT_HEAT_THRESHOLD,
    calmThreshold = DEFAULT_CALM_THRESHOLD,
    windowMinutes = 60,
    maxAgeHours = DEFAULT_MAX_AGE_HOURS,
  } = options;

  return stories
    .map((story): HeatAssessment => {
      const evidence = evidenceFor(story, sources, { now });
      const { heat, components } = heatOf(story, evidence, sources, now, windowMinutes);
      const peakHeat = Math.max(heat, peakHeatOf(story, evidence, sources, now, windowMinutes));
      const ageHours = (now.getTime() - story.firstSeenAt.getTime()) / 3_600_000;

      let reason: HeatReason;
      if (alreadyAlerted.has(story.id)) {
        reason = 'already-alerted';
      } else if (evidence.label === 'disputed') {
        reason = 'disputed';
      } else if (!canAlert(evidence)) {
        reason = 'single-source';
      } else if (ageHours > maxAgeHours) {
        reason = 'too-old';
      } else if (peakHeat < (isUrgent(story, now) ? threshold : calmThreshold)) {
        reason = 'below-threshold';
      } else {
        reason = 'promoted';
      }

      return {
        storyId: story.id,
        title: story.articles[0]?.article.title ?? '',
        heat,
        peakHeat,
        components,
        evidence,
        promoted: reason === 'promoted',
        reason,
      };
    })
    .sort((a, b) => b.heat - a.heat);
}
