import type { D1Database } from './d1.js';

/** The Worker's bindings and settings (wrangler.jsonc). */
export interface Env {
  readonly DB: D1Database;
  /** Origins of the pages that may call the API, comma-separated. */
  readonly ALLOWED_ORIGINS: string;
  /** The site's domain, for the readable "signed in" hint cookie. Empty in local dev. */
  readonly COOKIE_DOMAIN: string;
}

export function allowedOrigins(env: Env): string[] {
  return env.ALLOWED_ORIGINS.split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin !== '');
}
