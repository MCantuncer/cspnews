/**
 * Downloads every source's logo into one folder, so the website serves its own copies and
 * never hot-links outlet sites. Runs where news sites can be reached (GitHub Actions):
 *
 *   pnpm build && pnpm --filter @cspnews/config fetch-logos <output-directory>
 *
 * Writes <output-directory>/<source-id>.<ext> and logos.json ({ id: file }). A source whose
 * logo can't be fetched is listed, and the site shows its name alone.
 */
import { appendFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

import { findLogoUrl, logoExtension } from './logo.js';
import { SOURCES } from './sources.js';

const TIMEOUT_MS = 20_000;
const HEADERS = { 'user-agent': 'Mozilla/5.0 (compatible; CSPNews logo fetcher)' };
const MAX_BYTES = 512 * 1024;

const outputDirectory = resolve(process.argv[2] ?? 'logos');
mkdirSync(outputDirectory, { recursive: true });

async function fetchLogo(homepage: string, override: string | undefined) {
  let url = override;
  if (!url) {
    const page = await fetch(homepage, {
      headers: HEADERS,
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    url = findLogoUrl(await page.text(), page.url || homepage);
  }
  const response = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(TIMEOUT_MS) });
  if (!response.ok) {
    throw new Error(`HTTP ${String(response.status)} for ${url}`);
  }
  const type = response.headers.get('content-type');
  if (type && !type.startsWith('image/') && !type.startsWith('application/octet-stream')) {
    throw new Error(`Not an image (${type}) at ${url}`);
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length === 0 || bytes.length > MAX_BYTES) {
    throw new Error(`Unexpected size ${String(bytes.length)} bytes at ${url}`);
  }
  return { url, bytes, extension: logoExtension(type, url) };
}

const manifest: Record<string, string> = {};
const rows: string[] = [];
for (const source of SOURCES.filter((s) => s.enabled)) {
  try {
    const logo = await fetchLogo(source.homepage, source.logoUrl);
    const file = `${source.id}.${logo.extension}`;
    writeFileSync(join(outputDirectory, file), logo.bytes);
    manifest[source.id] = file;
    rows.push(`| ✅ | ${source.name} | ${logo.url} |`);
  } catch (error) {
    rows.push(
      `| ❌ | ${source.name} | ${error instanceof Error ? error.message : String(error)} |`,
    );
  }
}
writeFileSync(join(outputDirectory, 'logos.json'), `${JSON.stringify(manifest, null, 2)}\n`);

const found = Object.keys(manifest).length;
const report = [
  `### Logos: ${String(found)} of ${String(rows.length)} found`,
  '',
  '| | Source | Logo |',
  '| --- | --- | --- |',
  ...rows,
  '',
].join('\n');
console.log(report);
if (process.env.GITHUB_STEP_SUMMARY) {
  appendFileSync(process.env.GITHUB_STEP_SUMMARY, report);
}
