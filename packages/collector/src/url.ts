import { createHash } from 'node:crypto';

const TRACKING_PARAMS = /^(utm_[a-z]+|fbclid|gclid|mc_cid|mc_eid|ocid|cmpid|ref|ref_src)$/i;

/**
 * Canonical form of an article URL, so the same article reached through different links
 * is recognised as one: tracking parameters and the fragment are removed.
 * Returns undefined for anything that isn't an http(s) URL.
 */
export function canonicalUrl(raw: string): string | undefined {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return undefined;
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') {
    return undefined;
  }
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING_PARAMS.test(key)) {
      url.searchParams.delete(key);
    }
  }
  url.hostname = url.hostname.toLowerCase();
  return url.toString();
}

/** Stable article id: the first 16 hex characters of the canonical URL's SHA-256. */
export function articleIdFor(canonical: string): string {
  return createHash('sha256').update(canonical).digest('hex').slice(0, 16);
}
