import type { WrittenStory } from '@cspnews/core';

import { evidenceWord, type EvidenceLabel, type InterfaceLanguage } from './evidence.js';
import { formatShortDate, formatTime } from './format.js';
import { sourceOrdinal, wordsFor } from './i18n.js';

/** One station on a story's timeline. */
export interface TimelinePoint {
  /** The date or time above the station. */
  readonly when: string;
  /** The value or event, large under the station. */
  readonly title: string;
  readonly detail?: string;
  /** The evidence label the story earned at this point, for label changes. */
  readonly label?: EvidenceLabel;
  /** The latest point; it takes the edition colour. */
  readonly current: boolean;
}

export interface Timeline {
  /** `series`: earlier values of a number; `life`: the story's own life. */
  readonly kind: 'series' | 'life';
  readonly heading: string;
  readonly points: readonly TimelinePoint[];
}

/**
 * The timeline a story shows (docs/design/system.md, "Timeline"): series stories show earlier
 * values; every other story shows its own life. Fewer than two points is no timeline.
 */
export function timelineFor(
  story: Pick<WrittenStory, 'series' | 'timeline' | 'label'>,
  language: InterfaceLanguage,
  sourceName: (id: string) => string,
): Timeline | undefined {
  const words = wordsFor(language);

  if (story.series && story.series.length >= 2) {
    const series = [...story.series].sort((a, b) => a.date.localeCompare(b.date));
    return {
      kind: 'series',
      heading: words.seriesHeading,
      points: series.map((point, index) => ({
        when: formatShortDate(point.date, language),
        title: point.value,
        detail: point.label,
        current: index === series.length - 1,
      })),
    };
  }

  if (story.timeline && story.timeline.length >= 2) {
    const events = [...story.timeline].sort((a, b) => a.at.localeCompare(b.at));
    let outlets = 0;
    const points = events.map((event, index): TimelinePoint => {
      const when = formatTime(event.at, language);
      const current = index === events.length - 1;
      const source = event.sourceId ? sourceName(event.sourceId) : undefined;
      switch (event.kind) {
        case 'first-reported':
          outlets += 1;
          return { when, current, title: words.firstReported, ...(source && { detail: source }) };
        case 'outlet-joined':
          outlets += 1;
          return {
            when,
            current,
            title: sourceOrdinal(outlets, language),
            ...(source && { detail: source }),
          };
        case 'primary-source':
          return { when, current, title: words.primarySource, ...(source && { detail: source }) };
        case 'fact-check':
          return { when, current, title: words.factCheck, ...(source && { detail: source }) };
        case 'label-changed': {
          const to = event.to ?? story.label;
          const from = event.from ? evidenceWord(event.from, language) : undefined;
          return {
            when,
            current,
            title: evidenceWord(to, language),
            label: to,
            ...(from && { detail: language === 'tr' ? `Önce: ${from}` : `Was: ${from}` }),
          };
        }
        case 'updated':
          return { when, current, title: words.updated, ...(event.note && { detail: event.note }) };
      }
    });
    return { kind: 'life', heading: words.lifeHeading, points };
  }

  return undefined;
}

/** A station on the folded, horizontal line, or the marker for stations folded away. */
export type CompactStation =
  | { readonly kind: 'point'; readonly point: TimelinePoint }
  | { readonly kind: 'gap'; readonly hidden: number };

/**
 * The horizontal line a timeline starts as: every station when they fit, otherwise the first
 * one, a "+N" marker and the latest ones, so the line never gets squeezed.
 */
export function compactStations(points: readonly TimelinePoint[], max = 6): CompactStation[] {
  const all = points.map((point): CompactStation => ({ kind: 'point', point }));
  if (points.length <= max) return all;
  const tail = max - 2;
  return [
    ...all.slice(0, 1),
    { kind: 'gap', hidden: points.length - 1 - tail },
    ...all.slice(-tail),
  ];
}
