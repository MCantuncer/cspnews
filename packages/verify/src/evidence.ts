import type { Camp, Source } from '@cspnews/core';
import type { Story } from '@cspnews/grouping';

/**
 * Evidence labels (US-20), strongest first. Developing is not a label of its own: it is a
 * flag shown next to the label while a young story is still changing (F-11).
 */
export const EVIDENCE_LABELS = ['confirmed', 'reported', 'single-source', 'disputed'] as const;
export type EvidenceLabel = (typeof EVIDENCE_LABELS)[number];

/** Why a story got its label, for the evidence drawer (US-21). */
export type EvidenceReason =
  | 'fact-checked'
  | 'primary-source'
  | 'independent-sources'
  | 'cross-camp'
  | 'single-camp'
  | 'no-strong-source'
  | 'single-owner'
  | 'copies-not-counted'
  | 'unknown-source-ignored';

export interface Evidence {
  readonly label: EvidenceLabel;
  /** True while the story is young and still getting new articles. */
  readonly developing: boolean;
  /** Ids of sources whose reporting counts, one per owner group. */
  readonly confirmingSourceIds: readonly string[];
  readonly camps: readonly Camp[];
  readonly reasons: readonly EvidenceReason[];
}

export interface EvidenceOptions {
  readonly now: Date;
  /** A story younger than this, with an article inside `activeMinutes`, is developing. */
  readonly developingHours?: number;
  readonly activeMinutes?: number;
}

/**
 * The two sides in Turkish politics. A Turkey story reported only by one side (say, two
 * pro-government owners) stays Reported until a neutral outlet or the other side confirms it.
 */
const SIDES: ReadonlySet<Camp> = new Set(['pro-government', 'opposition']);

/** Tiers that can carry a confirmation. Low-tier sources (aggregators) only add discovery. */
const STRONG_TIERS: ReadonlySet<Source['tier']> = new Set(['wire', 'established']);

/** True unless every confirming outlet sits on the same political side. */
function spansCamps(camps: ReadonlySet<Camp>): boolean {
  const [only] = camps;
  return camps.size !== 1 || only === undefined || !SIDES.has(only);
}

/**
 * Computes a story's evidence label from its sources, with rules only (F-06, US-20):
 *
 * - **Disputed:** a fact-checker has published on the story.
 * - **Confirmed:** two or more independent owner groups, at least one of them a wire or
 *   established outlet, and, for Turkey stories, not all from one political side. A primary source (the
 *   organisation itself) plus one independent outlet also confirms.
 * - **Reported:** two or more independent owner groups that don't meet the bar above.
 * - **Single source:** one owner group, however many of its outlets ran it.
 *
 * Wire copies (`copyOf`) never count, and sources missing from the registry are ignored.
 */
export function evidenceFor(
  story: Story,
  sources: ReadonlyMap<string, Source>,
  options: EvidenceOptions,
): Evidence {
  const reasons = new Set<EvidenceReason>();
  const byOwner = new Map<string, Source>();
  let factChecked = false;
  let primary = false;
  let strong = false;

  for (const member of story.articles) {
    const source = sources.get(member.article.sourceId);
    if (!source) {
      reasons.add('unknown-source-ignored');
      continue;
    }
    if (source.kind === 'fact-check') {
      factChecked = true;
      continue;
    }
    if (member.copyOf) {
      reasons.add('copies-not-counted');
      continue;
    }
    if (source.tier === 'low') {
      continue;
    }
    if (source.kind === 'primary') {
      primary = true;
    }
    if (STRONG_TIERS.has(source.tier)) {
      strong = true;
    }
    if (!byOwner.has(source.ownerGroup)) {
      byOwner.set(source.ownerGroup, source);
    }
  }

  const confirming = [...byOwner.values()];
  const camps = new Set(confirming.map((source) => source.camp));
  const independent = confirming.length >= 2;
  const turkey = story.sections.includes('turkey');
  const crossCamp = !turkey || spansCamps(camps);

  let label: EvidenceLabel;
  if (factChecked) {
    label = 'disputed';
    reasons.add('fact-checked');
  } else if (!independent) {
    label = 'single-source';
    reasons.add('single-owner');
  } else {
    reasons.add('independent-sources');
    if (primary) {
      reasons.add('primary-source');
    }
    if (turkey) {
      reasons.add(crossCamp ? 'cross-camp' : 'single-camp');
    }
    if (!strong) {
      reasons.add('no-strong-source');
    }
    label = (primary || strong) && crossCamp ? 'confirmed' : 'reported';
  }

  const { now, developingHours = 6, activeMinutes = 90 } = options;
  const age = now.getTime() - story.firstSeenAt.getTime();
  const sinceUpdate = now.getTime() - story.lastUpdatedAt.getTime();
  const developing = age <= developingHours * 3_600_000 && sinceUpdate <= activeMinutes * 60_000;

  return {
    label,
    developing,
    confirmingSourceIds: confirming.map((source) => source.id),
    camps: [...camps],
    reasons: [...reasons],
  };
}

/**
 * Hot News only alerts on stories that at least two independent owners report and no
 * fact-checker disputes (US-31): speed must not mean misinformation.
 */
export function canAlert(evidence: Evidence): boolean {
  return evidence.label === 'confirmed' || evidence.label === 'reported';
}
