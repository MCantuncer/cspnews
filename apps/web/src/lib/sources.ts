import { SOURCES } from '@cspnews/config';
import type { StorySource } from '@cspnews/core';

const NAMES = new Map(SOURCES.map((source) => [source.id, source.name]));

/** The outlet's display name from the source registry; an unknown id shows as itself. */
export function sourceName(id: string): string {
  return NAMES.get(id) ?? id;
}

/** Outlet names for the evidence line: confirming outlets first, in the order the run gave. */
export function outletNames(sources: readonly StorySource[]): string[] {
  const ordered = [...sources.filter((s) => s.confirms), ...sources.filter((s) => !s.confirms)];
  return [...new Set(ordered.map((s) => sourceName(s.sourceId)))];
}
