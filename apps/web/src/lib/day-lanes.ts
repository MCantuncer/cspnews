/**
 * "When each story broke" (docs/design/decisions/day-lanes.md): one lane per section, one dot
 * per story at the time it was first reported, from the first story of the day to the
 * bulletin's publishing time. Pure layout: positions are fractions of the width, and labels are
 * placed above or below their dot only where they fit, so nothing ever overlaps.
 */
import type { LocalStory } from '@cspnews/core';

export interface LaneDot {
  readonly id: string;
  readonly title: string;
  /** 0 at the start of the window, 1 at the bulletin's time. */
  readonly at: number;
  readonly time: string;
  readonly developing: boolean;
  /** Where the label goes; none when it would collide with a neighbour. */
  readonly label: 'above' | 'below' | 'none';
}

export interface Lane<S extends string = string> {
  readonly section: S;
  readonly dots: readonly LaneDot[];
}

export interface DayWindow {
  readonly start: number;
  readonly end: number;
  /** Whole hours inside the window, for the scale. */
  readonly ticks: readonly { readonly at: number; readonly time: string }[];
}

const HOUR = 3_600_000;

/** When a story first broke: its first report, else when it was published. */
export function brokeAt(story: Pick<LocalStory, 'timeline' | 'publishedAt'>): string {
  return story.timeline?.find((t) => t.kind === 'first-reported')?.at ?? story.publishedAt;
}

/**
 * The window runs from the hour before the earliest story to the bulletin's time, with a tick
 * every `step` hours.
 */
export function dayWindow(
  times: readonly string[],
  publishAt: string,
  formatHour: (iso: string) => string,
  step = 3,
): DayWindow {
  const end = Date.parse(publishAt);
  const earliest = Math.min(end - HOUR, ...times.map((t) => Date.parse(t)));
  const start = Math.floor(earliest / HOUR) * HOUR;
  const ticks: { at: number; time: string }[] = [];
  for (let t = start; t < end - HOUR / 2; t += step * HOUR) {
    ticks.push({ at: (t - start) / (end - start), time: formatHour(new Date(t).toISOString()) });
  }
  return { start, end, ticks };
}

/**
 * Places labels in two rows per lane, left to right. `width` and `charWidth` are the expected
 * lane width and average character width in pixels; a label that fits in neither row is left
 * to the dot's tooltip.
 */
export function placeLabels(
  dots: readonly Omit<LaneDot, 'label'>[],
  width: number,
  charWidth: number,
  gap = 16,
): LaneDot[] {
  const ends = { above: -Infinity, below: -Infinity };
  return [...dots]
    .sort((a, b) => a.at - b.at)
    .map((dot) => {
      const half = (dot.title.length * charWidth) / 2;
      const centre = dot.at * width;
      // Labels are centred on their dot but kept inside the lane.
      const left = Math.max(0, Math.min(width - 2 * half, centre - half));
      const row = (['above', 'below'] as const).find((r) => left >= ends[r] + gap);
      if (!row) return { ...dot, label: 'none' as const };
      ends[row] = left + 2 * half;
      return { ...dot, label: row };
    });
}

/** Lanes for a bulletin's sections, each dot placed in the day's window. */
export function dayLanes<S extends string>(
  groups: readonly { section: S; stories: readonly { story: LocalStory }[] }[],
  window: DayWindow,
  formatTime: (iso: string) => string,
  width = 850,
  charWidth = 7.4,
): Lane<S>[] {
  const span = window.end - window.start;
  return groups.map(({ section, stories }) => ({
    section,
    dots: placeLabels(
      stories.map(({ story }) => {
        const at = brokeAt(story);
        return {
          id: story.id,
          title: story.shortTitle,
          at: Math.min(1, Math.max(0, (Date.parse(at) - window.start) / span)),
          time: formatTime(at),
          developing: story.developing,
        };
      }),
      width,
      charWidth,
    ),
  }));
}
