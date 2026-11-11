import type { LocalStory } from '@cspnews/core';

import { evidenceWord, type EvidenceLabel, type InterfaceLanguage } from './evidence.js';
import { formatShortDate, formatTime } from './format.js';
import { moreOutlets, nameList, sourceOrdinal, wordsFor } from './i18n.js';

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
  /** Outlets behind this point, for their logos. */
  readonly sourceIds?: readonly string[];
  /** The moment the story became Confirmed: drawn stronger than the other steps. */
  readonly confirmed?: boolean;
}

/** Outlets joining within this many minutes of the first in a run share one step. */
export const JOIN_WINDOW_MINUTES = 60;

type TimelineEvent = NonNullable<LocalStory['timeline']>[number];

/**
 * Folds runs of outlets joining close together into one step, so nine arrivals in an hour
 * read as "First report, +7 outlets in 52 min, Confirmed" instead of nine near-identical rows.
 */
export function groupArrivals(
  events: readonly TimelineEvent[],
  windowMinutes = JOIN_WINDOW_MINUTES,
): TimelineEvent[][] {
  const groups: TimelineEvent[][] = [];
  for (const event of events) {
    const last = groups.at(-1);
    const first = last?.[0];
    if (
      event.kind === 'outlet-joined' &&
      last &&
      first?.kind === 'outlet-joined' &&
      Date.parse(event.at) - Date.parse(first.at) <= windowMinutes * 60_000
    ) {
      last.push(event);
    } else {
      groups.push([event]);
    }
  }
  return groups;
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
  story: Pick<LocalStory, 'series' | 'timeline' | 'label'>,
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
    const groups = groupArrivals(events);
    let outlets = 0;
    const points = groups.map((group, index): TimelinePoint => {
      const [event] = group;
      const current = index === groups.length - 1;
      if (!event) return { when: '', title: '', current };
      const when = formatTime(event.at, language);
      const ids = group.flatMap((e) => (e.sourceId ? [e.sourceId] : []));
      const sources = ids.length > 0 ? { sourceIds: ids } : {};
      const source = event.sourceId ? sourceName(event.sourceId) : undefined;
      if (group.length > 1) {
        outlets += group.length;
        const last = group.at(-1) ?? event;
        const minutes = Math.round((Date.parse(last.at) - Date.parse(event.at)) / 60_000);
        return {
          when,
          current,
          title: moreOutlets(group.length, minutes, language),
          detail: nameList(ids.map(sourceName), language),
          ...sources,
        };
      }
      switch (event.kind) {
        case 'first-reported':
          outlets += 1;
          return {
            when,
            current,
            title: words.firstReported,
            ...(source && { detail: source }),
            ...sources,
          };
        case 'outlet-joined':
          outlets += 1;
          return {
            when,
            current,
            title: sourceOrdinal(outlets, language),
            ...(source && { detail: source }),
            ...sources,
          };
        case 'primary-source':
          return {
            when,
            current,
            title: words.primarySource,
            ...(source && { detail: source }),
            ...sources,
          };
        case 'fact-check':
          return {
            when,
            current,
            title: words.factCheck,
            ...(source && { detail: source }),
            ...sources,
          };
        case 'label-changed': {
          const to = event.to ?? story.label;
          const from = event.from ? evidenceWord(event.from, language) : undefined;
          return {
            when,
            current,
            title: evidenceWord(to, language),
            label: to,
            ...(from && { detail: language === 'tr' ? `Önce: ${from}` : `Was: ${from}` }),
            ...(to === 'confirmed' && { confirmed: true }),
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
