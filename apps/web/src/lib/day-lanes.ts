/**
 * "When each story broke" (docs/design/decisions/day-lanes.md): one lane per section, one dot
 * per story at the time it was first reported, from the first story of the day to the
 * bulletin's publishing time. Pure layout: positions are fractions of the width, and every story's
 * title is placed above or below its dot, in as many rows as it takes so that none overlap.
 */
import type { LocalStory } from '@cspnews/core';

export interface LaneDot {
  readonly id: string;
  readonly title: string;
  /** 0 at the start of the window, 1 at the bulletin's time. */
  readonly at: number;
  readonly time: string;
  readonly developing: boolean;
  /** Which side of the line the title sits on, and how many rows out from the dot (0 = next to it). */
  readonly side: 'above' | 'below';
  readonly row: number;
  /** Where the title starts, as a fraction of the width (kept inside the lane). */
  readonly labelAt: number;
}

export interface Lane<S extends string = string> {
  readonly section: S;
  readonly dots: readonly LaneDot[];
  /** Rows of titles used above and below the line, so the lane can make room for them. */
  readonly above: number;
  readonly below: number;
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
 * Places every title, left to right, in the nearest free row: just above the line, just below,
 * then one row further out on each side, and so on. `width` and `charWidth` are the expected lane
 * width and average character width in pixels.
 */
export function placeLabels(
  dots: readonly Omit<LaneDot, 'side' | 'row' | 'labelAt'>[],
  width: number,
  charWidth: number,
  gap = 16,
): LaneDot[] {
  // The right edge of the last title in each row: above 0, below 0, above 1, below 1, ...
  const ends: number[] = [];
  return [...dots]
    .sort((a, b) => a.at - b.at)
    .map((dot) => {
      const span = Math.min(width, dot.title.length * charWidth);
      // Titles are centred on their dot but kept inside the lane.
      const left = Math.max(0, Math.min(width - span, dot.at * width - span / 2));
      let slot = ends.findIndex((end) => left >= end + gap);
      if (slot < 0) slot = ends.length;
      ends[slot] = left + span;
      return {
        ...dot,
        side: slot % 2 === 0 ? 'above' : 'below',
        row: Math.floor(slot / 2),
        labelAt: left / width,
      };
    });
}

/** Lanes for a bulletin's sections, each dot placed in the day's window. */
export function dayLanes<S extends string>(
  groups: readonly { section: S; stories: readonly { story: LocalStory }[] }[],
  window: DayWindow,
  formatTime: (iso: string) => string,
  width = 900,
  charWidth = 7.4,
): Lane<S>[] {
  const span = window.end - window.start;
  return groups.map(({ section, stories }) => {
    const dots = placeLabels(
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
    );
    const rows = (side: LaneDot['side']) =>
      Math.max(0, ...dots.filter((d) => d.side === side).map((d) => d.row + 1));
    return { section, dots, above: rows('above'), below: rows('below') };
  });
}
