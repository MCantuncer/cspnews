import { collect, type FetchText } from '@cspnews/collector';
import { istanbulDateOf, type ScheduledBulletin, type Source } from '@cspnews/core';
import { groupStories } from '@cspnews/grouping';

import { toCandidates, type CandidatesFile } from './candidates.js';

export interface PrepareOptions {
  readonly sources: readonly Source[];
  readonly bulletin: ScheduledBulletin;
  readonly fetchText: FetchText;
  readonly now: Date;
  /** How far back to read. 14 hours covers the longest gap, Saturday 18:30 to Sunday 07:30. */
  readonly lookbackHours?: number;
  readonly perSection?: number;
}

/** Collects, groups and labels the news for one bulletin, ready for the Verify and Write run. */
export async function prepareBulletin(options: PrepareOptions): Promise<CandidatesFile> {
  const { sources, bulletin, fetchText, now, lookbackHours = 14, perSection } = options;
  const since = new Date(now.getTime() - lookbackHours * 3_600_000);

  const { articles, failures } = await collect(sources, { fetchText, now, since });
  const stories = groupStories(articles);
  const registry = new Map(sources.map((source) => [source.id, source]));

  return {
    version: 1,
    bulletin: { slot: bulletin.slot.id, publishAt: bulletin.publishAt.toISOString() },
    generatedAt: now.toISOString(),
    window: { since: since.toISOString(), until: now.toISOString() },
    sections: toCandidates(stories, registry, {
      now,
      ...(perSection === undefined ? {} : { perSection }),
    }),
    failures,
  };
}

/** File name for a bulletin's candidates, by its Istanbul date and slot: 2026-11-11-morning. */
export function bulletinKey(bulletin: ScheduledBulletin): string {
  const { year, month, day } = istanbulDateOf(bulletin.publishAt);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${String(year)}-${pad(month)}-${pad(day)}-${bulletin.slot.id}`;
}
