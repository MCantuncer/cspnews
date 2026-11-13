import { SOURCES } from '@cspnews/config';
import type { StorySource, Tier } from '@cspnews/core';

const NAMES = new Map(SOURCES.map((source) => [source.id, source.name]));
const TIERS = new Map(SOURCES.map((source) => [source.id, source.tier]));

/** Strongest first; an outlet missing from the registry counts as the weakest. */
export const TIER_RANK: Readonly<Record<Tier, number>> = {
  wire: 0,
  established: 1,
  partisan: 2,
  low: 3,
};

/** The outlet's reliability tier from the source registry. */
export function sourceTier(id: string): Tier {
  return TIERS.get(id) ?? 'low';
}

/** The outlet's display name from the source registry; an unknown id shows as itself. */
export function sourceName(id: string): string {
  return NAMES.get(id) ?? id;
}

/** Outlet names for the evidence line: confirming outlets first, in the order the run gave. */
export function outletNames(sources: readonly StorySource[]): string[] {
  const ordered = [...sources.filter((s) => s.confirms), ...sources.filter((s) => !s.confirms)];
  return [...new Set(ordered.map((s) => sourceName(s.sourceId)))];
}
