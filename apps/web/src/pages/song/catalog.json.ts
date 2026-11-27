import type { APIRoute } from 'astro';

import { songCatalog } from '../../lib/song-data';

/** `/song/catalog.json`: every song name the guess box offers, as [artist, title] pairs. */
export const GET: APIRoute = () =>
  new Response(JSON.stringify(songCatalog()), {
    headers: { 'content-type': 'application/json; charset=utf-8' },
  });
