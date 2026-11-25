import { z } from 'zod';

/**
 * Our own daily record of every chart we read (`music/history/<date>.json` on the candidates
 * branch). It is what turns "plays at 4x its usual" and "back after 412 days" into measured
 * numbers: the charts themselves only show today.
 */

export const SnapshotSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  rows: z.array(
    z.object({
      key: z.string(),
      chart: z.string(),
      rank: z.number().int().positive(),
      plays: z.number().nonnegative().optional(),
    }),
  ),
});
export type Snapshot = z.infer<typeof SnapshotSchema>;

/** How far back "usual plays" looks. */
export const USUAL_WINDOW_DAYS = 28;

export interface ChartSignals {
  /** The best earlier rank to compare with: 1, 3 or 7 days ago, the first one found. */
  rankBefore?: { rank: number; date: string };
  /** Median daily plays on this chart over the last 28 days, without today. */
  usualPlays?: number;
  /** Today's plays divided by usualPlays. */
  surge?: number;
  /** Days in a row on the chart up to today, as far as our history reaches. */
  daysOnChart: number;
  /** Days between the last time it was on the chart and today, when it was off yesterday. */
  daysOffChart?: number;
}

const DAY = 86_400_000;
export const addDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY).toISOString().slice(0, 10);

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2
    ? sorted[middle]
    : ((sorted[middle - 1] ?? 0) + (sorted[middle] ?? 0)) / 2;
}

export class History {
  private readonly byDate = new Map<string, Map<string, { rank: number; plays?: number }>>();

  constructor(snapshots: readonly Snapshot[]) {
    for (const snapshot of snapshots) {
      const rows = new Map<string, { rank: number; plays?: number }>();
      for (const row of snapshot.rows) {
        rows.set(`${row.chart}|${row.key}`, {
          rank: row.rank,
          ...(row.plays === undefined ? {} : { plays: row.plays }),
        });
      }
      this.byDate.set(snapshot.date, rows);
    }
  }

  /** Whether any saved day has this chart, so "new on the chart today" means something. */
  has(chart: string): boolean {
    for (const rows of this.byDate.values()) {
      for (const id of rows.keys()) if (id.startsWith(`${chart}|`)) return true;
    }
    return false;
  }

  private on(date: string, chart: string, key: string) {
    return this.byDate.get(date)?.get(`${chart}|${key}`);
  }

  signals(today: string, chart: string, key: string, plays?: number): ChartSignals {
    let rankBefore: ChartSignals['rankBefore'];
    for (const days of [1, 3, 7]) {
      const date = addDays(today, -days);
      const row = this.on(date, chart, key);
      if (row) {
        rankBefore = { rank: row.rank, date };
        break;
      }
    }

    const past: number[] = [];
    for (let days = 1; days <= USUAL_WINDOW_DAYS; days++) {
      const row = this.on(addDays(today, -days), chart, key);
      if (row?.plays !== undefined) past.push(row.plays);
    }
    // A usual level needs a week of readings, or one good day would look like a surge.
    const usualPlays = past.length >= 7 ? median(past) : undefined;

    let daysOnChart = 1;
    while (this.on(addDays(today, -daysOnChart), chart, key)) daysOnChart++;

    let daysOffChart: number | undefined;
    if (!this.on(addDays(today, -1), chart, key)) {
      const seen = [...this.byDate.keys()]
        .filter((date) => date < today && this.on(date, chart, key))
        .sort();
      const last = seen.at(-1);
      if (last) daysOffChart = Math.round((Date.parse(today) - Date.parse(last)) / DAY);
    }

    return {
      ...(rankBefore ? { rankBefore } : {}),
      ...(usualPlays ? { usualPlays } : {}),
      ...(usualPlays && plays !== undefined
        ? { surge: Math.round((plays / usualPlays) * 100) / 100 }
        : {}),
      daysOnChart,
      ...(daysOffChart === undefined ? {} : { daysOffChart }),
    };
  }
}
