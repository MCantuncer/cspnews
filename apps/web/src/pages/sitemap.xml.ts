import type { APIRoute } from 'astro';

import { loadBulletins } from '../lib/bulletins';
import { siteOrigin, sitemapXml } from '../lib/feed';

/** `/sitemap.xml`: every bulletin and story, in both languages, for search engines. */
export const GET: APIRoute = () =>
  new Response(sitemapXml(loadBulletins(), siteOrigin()), {
    headers: { 'content-type': 'application/xml; charset=utf-8' },
  });
