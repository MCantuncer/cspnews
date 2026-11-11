import type { Source } from '@cspnews/core';
import { words, type Story } from '@cspnews/grouping';
import { canAlert, evidenceFor, type Evidence } from '@cspnews/verify';

/**
 * Words that mark breaking events, by language. Matched as whole words or word starts
 * ("deprem" matches "depremde"), never inside other words.
 */
const URGENT_WORDS: Readonly<Record<string, readonly string[]>> = {
  tr: [
    'son dakika',
    'deprem',
    'patlama',
    'saldırı',
    'yangın',
    'sel',
    'hayatını kaybetti',
    'öldü',
    'yaralı',
    'istifa',
    'gözaltı',
    'tutuklandı',
    'olağanüstü',
  ],
  en: [
    'breaking',
    'earthquake',
    'explosion',
    'blast',
    'attack',
    'wildfire',
    'flood',
    'killed',
    'dead',
    'dies',
    'resigns',
    'arrested',
    'emergency',
  ],
};

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
  readonly heat: number;
  readonly components: HeatComponents;
  readonly evidence: Evidence;
  readonly promoted: boolean;
  readonly reason: HeatReason;
}

export interface HeatOptions {
  readonly now: Date;
  /** Story ids already sent as Hot News; they are never sent twice. */
  readonly alreadyAlerted?: ReadonlySet<string>;
  /** Heat needed to promote a story. */
  readonly threshold?: number;
  /** How recent an article must be to count towards velocity. */
  readonly windowMinutes?: number;
  /** Stories first seen longer ago than this are not breaking any more. */
  readonly maxAgeHours?: number;
}

export const DEFAULT_HEAT_THRESHOLD = 8;

function isUrgent(story: Story): boolean {
  return story.articles.some(({ article }) => {
    const text = ` ${words(article.title, article.language).join(' ')} `;
    return (URGENT_WORDS[article.language] ?? []).some((word) => text.includes(` ${word}`));
  });
}

/**
 * Heat: how strongly a story looks like breaking news, from rules only.
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
  const owners = new Set(
    evidence.confirmingSourceIds.flatMap((id) => sources.get(id)?.ownerGroup ?? []),
  );
  const since = now.getTime() - windowMinutes * 60_000;
  const recent = new Set<string>();
  let wire = false;

  for (const { article, copyOf } of story.articles) {
    const source = sources.get(article.sourceId);
    // Only reporting that counts as confirmation adds heat: no copies, aggregators or checks.
    if (!source || copyOf || source.tier === 'low' || !owners.has(source.ownerGroup)) {
      continue;
    }
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
    urgent: isUrgent(story),
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
    windowMinutes = 60,
    maxAgeHours = 3,
  } = options;

  return stories
    .map((story): HeatAssessment => {
      const evidence = evidenceFor(story, sources, { now });
      const { heat, components } = heatOf(story, evidence, sources, now, windowMinutes);
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
      } else if (heat < threshold) {
        reason = 'below-threshold';
      } else {
        reason = 'promoted';
      }

      return {
        storyId: story.id,
        title: story.articles[0]?.article.title ?? '',
        heat,
        components,
        evidence,
        promoted: reason === 'promoted',
        reason,
      };
    })
    .sort((a, b) => b.heat - a.heat);
}
