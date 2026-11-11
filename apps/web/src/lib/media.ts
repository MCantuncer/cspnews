import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { bulletinsDirectory } from './bulletins.js';

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
