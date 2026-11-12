import type { APIRoute } from 'astro';

import { loadBulletins } from '../../lib/bulletins';
import { rssFeed, siteOrigin } from '../../lib/feed';

/** `/tr/feed.xml`: the newest stories in Turkish, for feed readers. */
export const GET: APIRoute = () =>
  new Response(rssFeed(loadBulletins(), 'tr', siteOrigin()), {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
  });
