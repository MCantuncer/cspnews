import type { Source } from '@cspnews/core';
import type { Story } from '@cspnews/grouping';

import { evidenceFor, type EvidenceLabel } from './evidence.js';

/**
 * A story's own life, for the timeline on stories without a key number: who reported it
 * first, when other outlets joined, when the primary source and fact-checkers spoke, and
 * how its evidence label changed.
 */
export type LifecycleEvent =
  | { readonly kind: 'first-reported'; readonly at: Date; readonly sourceId: string }
  | { readonly kind: 'outlet-joined'; readonly at: Date; readonly sourceId: string }
  | { readonly kind: 'primary-source'; readonly at: Date; readonly sourceId: string }
  | { readonly kind: 'fact-check'; readonly at: Date; readonly sourceId: string }
  | {
      readonly kind: 'label-changed';
      readonly at: Date;
      readonly from: EvidenceLabel;
      readonly to: EvidenceLabel;
    };

/**
 * Rebuilds the timeline from the story's articles alone, so it needs no stored history:
 * the label is recomputed after each article, and every change is an event.
 *
 * Wire copies never count as an outlet joining, and only the first article of each owner
 * group does, matching how evidence counts independent sources.
 */
export function storyLifecycle(
  story: Story,
  sources: ReadonlyMap<string, Source>,
): LifecycleEvent[] {
  const events: LifecycleEvent[] = [];
  const owners = new Set<string>();
  let label: EvidenceLabel | undefined;

  story.articles.forEach((member, index) => {
    const { article, copyOf } = member;
    const source = sources.get(article.sourceId);
    const at = article.publishedAt;

    if (index === 0) {
      events.push({ kind: 'first-reported', at, sourceId: article.sourceId });
      if (source) {
        owners.add(source.ownerGroup);
      }
    } else if (source?.kind === 'fact-check') {
      events.push({ kind: 'fact-check', at, sourceId: source.id });
    } else if (source?.kind === 'primary') {
      events.push({ kind: 'primary-source', at, sourceId: source.id });
      owners.add(source.ownerGroup);
    } else if (source && !copyOf && source.tier !== 'low' && !owners.has(source.ownerGroup)) {
      owners.add(source.ownerGroup);
      events.push({ kind: 'outlet-joined', at, sourceId: source.id });
    }

    const sofar: Story = {
      ...story,
      articles: story.articles.slice(0, index + 1),
      lastUpdatedAt: at,
    };
    const next = evidenceFor(sofar, sources, { now: at }).label;
    if (label !== undefined && next !== label) {
      events.push({ kind: 'label-changed', at, from: label, to: next });
    }
    label = next;
  });

  return events;
}
