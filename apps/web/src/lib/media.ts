import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import type { StorySource } from '@cspnews/core';

import { bulletinsDirectory } from './bulletins.js';
import { sourceName } from './sources.js';

/**
 * Photos and organisation logos are served from the site itself, never hot-linked: the run
 * that publishes a bulletin saves them next to it, in `<bulletins>/media`:
 *
 * - `<story id>.<jpg|jpeg|png|webp|avif>`: the lead outlet's photo for a story;
 * - `org/<org id>.<svg|png|webp>`: an organisation's logo.
 *
 * The build copies that folder to `/media` (see astro.config.mjs). A missing file means the
 * story falls back to its next visual.
 */
export const MEDIA_URL = '/media';

const PHOTO = /\.(jpe?g|png|webp|avif)$/;
const LOGO = /\.(svg|png|webp)$/;

export function mediaDirectory(): string {
  return join(bulletinsDirectory(), 'media');
}

function find(directory: string, name: string, extension: RegExp): string | undefined {
  if (!existsSync(directory)) return undefined;
  return readdirSync(directory).find(
    (file) => extension.test(file) && file.slice(0, file.lastIndexOf('.')) === name,
  );
}

/** The site URL of a story's saved photo, if the run saved one. */
export function photoUrl(storyId: string, directory = mediaDirectory()): string | undefined {
  const file = find(directory, storyId, PHOTO);
  return file && `${MEDIA_URL}/${encodeURIComponent(file)}`;
}

/** The site URL of an organisation's saved logo, if there is one. */
export function logoUrl(orgId: string, directory = mediaDirectory()): string | undefined {
  const file = find(join(directory, 'org'), orgId, LOGO);
  return file && `${MEDIA_URL}/org/${encodeURIComponent(file)}`;
}

/** The site URL of an outlet's saved logo (`logos/<source id>`, from the fetch-logos job). */
export function outletLogoUrl(sourceId: string, directory = mediaDirectory()): string | undefined {
  const file = find(join(directory, 'logos'), sourceId, LOGO);
  return file && `${MEDIA_URL}/logos/${encodeURIComponent(file)}`;
}

/** An outlet logo to show beside a story: its name stays as the image's text alternative. */
export interface OutletLogo {
  readonly sourceId: string;
  readonly name: string;
  readonly src: string;
}

/**
 * Up to `max` logos of the outlets reporting a story, confirming outlets first, skipping
 * outlets whose logo is not saved. Shown as images only; outlet names are on the story page.
 */
export function outletLogos(
  sources: readonly StorySource[],
  max = 3,
  directory = mediaDirectory(),
): OutletLogo[] {
  const ordered = [...sources.filter((s) => s.confirms), ...sources.filter((s) => !s.confirms)];
  return logosFor(
    ordered.map((s) => s.sourceId),
    max,
    directory,
  );
}

/** Saved logos for these outlets, in order, without repeats, at most `max`. */
export function logosFor(
  sourceIds: readonly string[],
  max: number,
  directory = mediaDirectory(),
): OutletLogo[] {
  const logos: OutletLogo[] = [];
  for (const sourceId of new Set(sourceIds)) {
    if (logos.length >= max) break;
    const src = outletLogoUrl(sourceId, directory);
    if (src) logos.push({ sourceId, name: sourceName(sourceId), src });
  }
  return logos;
}
