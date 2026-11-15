/**
 * The share picture of one photo (src/lib/share.ts): the saved photo cut to 1200 x 630 and
 * compressed, built once with the site. Chat apps skip pictures that are large, and the saved
 * photos are often over a megabyte.
 */
import type { APIRoute } from 'astro';
import sharp from 'sharp';

import { allBulletins } from '../../lib/bulletins';
import { photoFile } from '../../lib/media';
import { SHARE_SIZE } from '../../lib/share';

/** Every story, Spotlight story, transfer and person item that has a saved photo. */
function photoIds(): string[] {
  const ids = allBulletins().flatMap(({ bulletin }) => [
    ...bulletin.stories.map((item) => item.id),
    ...(bulletin.andFinally?.light ?? []).map((item) => item.id),
    ...(bulletin.transfers ?? []).map((item) => item.id),
    ...(bulletin.abroad ?? []).map((item) => item.id),
  ]);
  return [...new Set(ids)].filter((id) => photoFile(id) !== undefined);
}

export function getStaticPaths() {
  return photoIds().map((id) => ({ params: { id } }));
}

export const GET: APIRoute = async ({ params }) => {
  const file = params.id ? photoFile(params.id) : undefined;
  if (!file) return new Response(null, { status: 404 });
  const jpeg = await sharp(file)
    .resize(SHARE_SIZE.width, SHARE_SIZE.height, { fit: 'cover', position: 'attention' })
    .jpeg({ quality: 78, mozjpeg: true })
    .toBuffer();
  return new Response(new Uint8Array(jpeg), { headers: { 'content-type': 'image/jpeg' } });
};
