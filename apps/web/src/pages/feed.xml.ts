import type { APIRoute } from 'astro';

import { loadBulletins } from '../lib/bulletins';
import { rssFeed, siteOrigin } from '../lib/feed';

/** `/feed.xml`: the newest stories in English, for feed readers. */
export const GET: APIRoute = () =>
  new Response(rssFeed(loadBulletins(), 'en', siteOrigin()), {
    headers: { 'content-type': 'application/rss+xml; charset=utf-8' },
  });
