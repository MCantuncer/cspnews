/**
 * Fills a bulletin's Tonight list from the score sources, by rules only, and saves the team logos
 * the rows use. Runs on the bulletin's pull request, where the sources can be reached
 * (.github/workflows/bulletin-photos.yml):
 *
 *   pnpm --filter @cspnews/scores fill-tonight "$PWD/data/bulletins/<file>.json"
 *   pnpm --filter @cspnews/scores fill-tonight --dry-run     # prints the rows for right now
 *
 * Rows the writer added (shows, and matches no source covers) are kept as they are. The Today
 * line's match gets its live score address when its fixture is found.
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

import { httpFetchText } from '@cspnews/collector';
import {
  ABROAD_PEOPLE,
  CLUB_LEAGUES,
  ESPN_LEAGUES,
  EUROLEAGUE_CLUBS,
  EUROLEAGUE_COMPETITION,
  NATIONAL_LEAGUES,
  NATIONAL_TEAM,
  PERSON_CLUBS,
  TURKISH_CLUBS,
} from '@cspnews/config';
import { parseBulletin, type TonightItem } from '@cspnews/core';

import { fetchFixtures, logosToSave } from './fetch.js';
import { withLiveMatch } from './today.js';
import { buildTonight, tonightWindow, type TonightWatch } from './tonight.js';

const watch: TonightWatch = {
  espnLeagues: ESPN_LEAGUES,
  nationalTeam: NATIONAL_TEAM,
  nationalLeagues: NATIONAL_LEAGUES,
  turkishClubs: TURKISH_CLUBS,
  clubLeagues: CLUB_LEAGUES,
  personClubs: PERSON_CLUBS,
  euroleagueClubs: EUROLEAGUE_CLUBS,
  euroleague: EUROLEAGUE_COMPETITION,
  people: ABROAD_PEOPLE,
};

const argument = process.argv[2];
if (!argument) {
  console.error('Usage: fill-tonight <absolute path to bulletin.json> | --dry-run');
  process.exit(1);
}
const dryRun = argument === '--dry-run';
const path = dryRun ? undefined : resolve(argument);
const raw: unknown = path ? JSON.parse(readFileSync(path, 'utf8')) : undefined;
const bulletin = raw === undefined ? undefined : parseBulletin(raw);

const window = tonightWindow(bulletin ? new Date(bulletin.publishAt) : new Date());
const { fixtures, failures } = await fetchFixtures(watch, window, httpFetchText(15_000));
for (const failure of failures) console.log(`❌ ${failure.url}: ${failure.reason}`);
console.log(
  `Read ${String(fixtures.length)} matches from ${window.from.toISOString()} to ${window.until.toISOString()}.`,
);

const written = bulletin?.tonight ?? [];
let rows: TonightItem[] = buildTonight(fixtures, watch, window, written);
if (fixtures.length === 0 && failures.length > 0) {
  // Every source failed: keep what the bulletin had rather than empty it on a bad night.
  console.log('No source could be read; the Tonight list is left as it was.');
  rows = [...written];
}
for (const row of rows) {
  const teams =
    row.home && row.away ? `${row.home.name} v ${row.away.name}` : (row.event?.en ?? '');
  const score = row.result ? ` ${String(row.result.home)}–${String(row.result.away)}` : '';
  console.log(`• ${row.startsAt} ${row.name.en}: ${teams}, ${row.competition.en}${score}`);
}

if (path && raw !== undefined && bulletin) {
  const media = join(dirname(path), 'media', 'teams');
  await saveLogos(media, rows);
  const rest = { ...(raw as Record<string, unknown>) };
  delete rest.tonight;
  const today = bulletin.today && withLiveMatch(bulletin.today, fixtures);
  const updated = {
    ...rest,
    ...(today && { today }),
    ...(rows.length > 0 && { tonight: rows }),
  };
  parseBulletin(updated);
  writeFileSync(path, `${JSON.stringify(updated, null, 2)}\n`);
  console.log(`Wrote ${String(rows.length)} Tonight rows to ${path}.`);
}

/** Saves each row's team logo once; a logo already saved is never fetched again. */
async function saveLogos(directory: string, items: readonly TonightItem[]) {
  const teams = new Set(
    items.flatMap((item) => [item.home?.team, item.away?.team]).filter((t): t is string => !!t),
  );
  const saved = existsSync(directory)
    ? new Set(readdirSync(directory).map((file) => file.slice(0, file.lastIndexOf('.'))))
    : new Set<string>();
  for (const [team, url] of logosToSave(fixtures, teams)) {
    if (saved.has(team)) continue;
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });
      if (!response.ok) throw new Error(`HTTP ${String(response.status)}`);
      const type = response.headers.get('content-type') ?? '';
      const extension = type.includes('svg') ? 'svg' : type.includes('webp') ? 'webp' : 'png';
      if (!type.includes('image/')) throw new Error(`Not an image: ${type}`);
      mkdirSync(directory, { recursive: true });
      writeFileSync(
        join(directory, `${team}.${extension}`),
        Buffer.from(await response.arrayBuffer()),
      );
      console.log(`✅ logo ${team}`);
    } catch (error) {
      console.log(`❌ logo ${team}: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}
