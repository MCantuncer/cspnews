import type { APIRoute } from 'astro';

import { robotsTxt, siteOrigin } from '../lib/feed';

/** `/robots.txt`: everything may be read, and where the sitemap is. */
export const GET: APIRoute = () =>
  new Response(robotsTxt(siteOrigin()), {
    headers: { 'content-type': 'text/plain; charset=utf-8' },
  });
