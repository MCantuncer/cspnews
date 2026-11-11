/**
 * Source health check. Fetches every enabled feed in the registry and reports which ones work.
 * Run with `pnpm --filter @cspnews/config check-sources` after a build. In GitHub Actions the
 * report is also written to the job summary.
 */
import { appendFileSync } from 'node:fs';

import { classifyFeed, isFeed, type FeedHealth } from './feed-health.js';
import { SOURCES } from './sources.js';

const TIMEOUT_MS = 20_000;
const USER_AGENT = 'CSPNews source health check (+https://github.com/MCantuncer/cspnews)';

async function check(url: string): Promise<FeedHealth> {
  try {
    const response = await fetch(url, {
      headers: { 'user-agent': USER_AGENT, accept: 'application/rss+xml, application/xml, */*' },
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    return classifyFeed(response.status, await response.text());
  } catch (error) {
    return { ok: false, reason: error instanceof Error ? error.message : String(error) };
  }
}

const feeds = SOURCES.filter((source) => source.enabled && isFeed(source));
const results = await Promise.all(
  feeds.map(async (source) => ({ source, health: await check(source.url) })),
);

const rows = results.map(({ source, health }) =>
  health.ok
    ? `| ✅ | ${source.id} | ${String(health.items)} items |`
    : `| ❌ | ${source.id} | ${health.reason} |`,
);
const failed = results.filter(({ health }) => !health.ok).length;
const report = [
  `### Source health: ${String(results.length - failed)} of ${String(results.length)} feeds OK`,
  '',
  '| | Source | Result |',
  '| --- | --- | --- |',
  ...rows,
  '',
].join('\n');

console.log(report);
const summaryPath = process.env.GITHUB_STEP_SUMMARY;
if (summaryPath) {
  appendFileSync(summaryPath, report);
}
process.exitCode = failed > 0 ? 1 : 0;
