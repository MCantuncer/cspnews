/**
 * Finds an outlet's logo on its homepage, so sources can be shown by name with their real
 * brand mark (never hot-linked: the site build downloads and serves its own copy).
 *
 * Preference: the largest apple-touch-icon (a square brand mark, usually 180 px), then the
 * largest declared icon (SVG counts as largest), then /favicon.ico.
 */

interface IconLink {
  readonly href: string;
  readonly rel: string;
  readonly size: number;
}

function attribute(tag: string, name: string): string | undefined {
  const match = new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i').exec(tag);
  return match ? (match[2] ?? match[3] ?? match[4]) : undefined;
}

function sizeOf(tag: string, href: string): number {
  if (/\.svg(?:$|\?)/i.test(href) || attribute(tag, 'type') === 'image/svg+xml') {
    return Number.MAX_SAFE_INTEGER;
  }
  const sizes = attribute(tag, 'sizes') ?? '';
  if (sizes.toLowerCase() === 'any') {
    return Number.MAX_SAFE_INTEGER;
  }
  return Math.max(0, ...sizes.split(/\s+/).map((size) => Number.parseInt(size, 10) || 0));
}

function iconLinks(html: string): IconLink[] {
  const links: IconLink[] = [];
  for (const [tag] of html.matchAll(/<link\b[^>]*>/gi)) {
    const rel = attribute(tag, 'rel')?.toLowerCase() ?? '';
    const href = attribute(tag, 'href');
    if (!href || !/(?:^|\s)(?:apple-touch-icon(?:-precomposed)?|icon)(?:\s|$)/.test(rel)) {
      continue;
    }
    links.push({ href, rel, size: sizeOf(tag, href) });
  }
  return links;
}

/** The best logo URL on a page, resolved against the page URL (or its <base href>). */
export function findLogoUrl(html: string, pageUrl: string): string {
  const baseTag = /<base\b[^>]*>/i.exec(html)?.[0];
  const base = new URL((baseTag && attribute(baseTag, 'href')) ?? pageUrl, pageUrl);
  const links = iconLinks(html);
  const rank = (link: IconLink) => (link.rel.includes('apple-touch-icon') ? 1 : 0);
  const best = links.sort((a, b) => rank(b) - rank(a) || b.size - a.size)[0];
  return best ? new URL(best.href, base).href : new URL('/favicon.ico', base).href;
}

/** File extension for a downloaded logo, from its content type or URL. */
export function logoExtension(contentType: string | null, url: string): string {
  const type = (contentType ?? '').split(';')[0]?.trim().toLowerCase();
  const byType: Record<string, string> = {
    'image/png': 'png',
    'image/svg+xml': 'svg',
    'image/x-icon': 'ico',
    'image/vnd.microsoft.icon': 'ico',
    'image/jpeg': 'jpg',
    'image/webp': 'webp',
  };
  if (type && byType[type]) {
    return byType[type];
  }
  return (
    /\.(png|svg|ico|jpe?g|webp)(?:$|\?)/i.exec(url)?.[1]?.toLowerCase().replace('jpeg', 'jpg') ??
    'png'
  );
}
