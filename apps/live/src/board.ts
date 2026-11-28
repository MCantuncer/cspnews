/**
 * The Daily Song board (docs/design/decisions/song-board.md): one Durable Object per game day,
 * holding that day's names and scores in its own SQLite table. Nothing else about a reader is
 * kept: no account, no cookie, and the address only as a salted hash to cap entries per network.
 */
import {
  GENRES,
  TOP_ROWS,
  TOP_ROWS_WHEN_BELOW,
  checkRounds,
  nameProblem,
  songOn,
  tidyName,
  type BoardEntry,
  type BoardRow,
  type BoardView,
  type SongName,
} from '@cspnews/songgame';
import hits from '@cspnews/songgame/data/songs/hits.json' with { type: 'json' };
import popTr from '@cspnews/songgame/data/songs/pop-tr.json' with { type: 'json' };
import rap from '@cspnews/songgame/data/songs/rap.json' with { type: 'json' };
import rock from '@cspnews/songgame/data/songs/rock.json' with { type: 'json' };
import { z } from 'zod';

const POOLS: Record<(typeof GENRES)[number], readonly SongName[]> = {
  'pop-tr': popTr,
  rap,
  rock,
  hits,
};

/** A network may put at most this many names on one day's board. */
export const ENTRIES_PER_NETWORK = 5;

/** The day's four answers, in round order. */
export function answersOn(day: string): SongName[] {
  return GENRES.map((genre) => songOn(POOLS[genre], day)).filter(
    (song): song is SongName => song !== undefined,
  );
}

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export const entrySchema = z.object({
  day: z.string().regex(DAY),
  id: z.string().regex(/^[\w-]{8,64}$/),
  name: z.string().max(80),
  rounds: z
    .array(
      z.object({
        guesses: z.array(z.string().max(200).nullable()).max(40),
        gaveUp: z.boolean().optional(),
      }),
    )
    .length(GENRES.length),
});

/** The SQL a Durable Object offers (`ctx.storage.sql`), as far as the board uses it. */
export interface SqlStore {
  exec(
    query: string,
    ...bindings: (string | number | null)[]
  ): {
    toArray(): Record<string, string | number | null>[];
  };
}

export function prepare(sql: SqlStore): void {
  sql.exec(`CREATE TABLE IF NOT EXISTS entries (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    tries TEXT NOT NULL,
    points INTEGER NOT NULL,
    heard REAL NOT NULL,
    at INTEGER NOT NULL,
    network TEXT NOT NULL
  )`);
  sql.exec('CREATE INDEX IF NOT EXISTS entries_rank ON entries (points DESC, heard, at)');
}

const ORDER = 'ORDER BY points DESC, heard ASC, at ASC';

function toRow(record: Record<string, string | number | null>, rank: number): BoardRow {
  return {
    rank,
    name: String(record.name),
    tries: String(record.tries).split('').map(Number),
    points: Number(record.points),
  };
}

/** The board as one reader sees it: the top, and their own place when they are on it. */
export function boardView(sql: SqlStore, day: string, me?: string): BoardView {
  const players = Number(sql.exec('SELECT COUNT(*) AS n FROM entries').toArray()[0]?.n ?? 0);
  const own = me ? sql.exec('SELECT * FROM entries WHERE id = ?', me).toArray()[0] : undefined;
  if (!own) {
    const top = sql.exec(`SELECT * FROM entries ${ORDER} LIMIT ?`, TOP_ROWS).toArray();
    return { day, players, top: top.map((row, index) => toRow(row, index + 1)) };
  }
  const points = Number(own.points);
  const heard = Number(own.heard);
  const at = Number(own.at);
  const rank =
    Number(
      sql
        .exec(
          `SELECT COUNT(*) AS n FROM entries WHERE points > ?
             OR (points = ? AND heard < ?) OR (points = ? AND heard = ? AND at < ?)`,
          points,
          points,
          heard,
          points,
          heard,
          at,
        )
        .toArray()[0]?.n ?? 0,
    ) + 1;
  const mine = toRow(own, rank);
  if (rank <= TOP_ROWS) {
    const top = sql.exec(`SELECT * FROM entries ${ORDER} LIMIT ?`, TOP_ROWS).toArray();
    return { day, players, top: top.map((row, index) => toRow(row, index + 1)), me: mine };
  }
  const top = sql.exec(`SELECT * FROM entries ${ORDER} LIMIT ?`, TOP_ROWS_WHEN_BELOW).toArray();
  const around = sql.exec(`SELECT * FROM entries ${ORDER} LIMIT 3 OFFSET ?`, rank - 2).toArray();
  return {
    day,
    players,
    top: top.map((row, index) => toRow(row, index + 1)),
    me: mine,
    around: around.map((row, index) => toRow(row, rank - 1 + index)),
  };
}

export type JoinResult =
  | { readonly ok: true; readonly view: BoardView }
  | { readonly ok: false; readonly status: number; readonly problem: string };

/**
 * Puts a reader on the board. The score is worked out again from the guesses; a reader already
 * on today's board keeps the row they have.
 */
export function join(sql: SqlStore, entry: BoardEntry, network: string, now: number): JoinResult {
  const known = sql.exec('SELECT id FROM entries WHERE id = ?', entry.id).toArray()[0];
  if (known) return { ok: true, view: boardView(sql, entry.day, entry.id) };
  const answers = answersOn(entry.day);
  const problem = nameProblem(entry.name, answers);
  if (problem) return { ok: false, status: 422, problem };
  const score = checkRounds(entry.rounds, answers);
  if (!score) return { ok: false, status: 422, problem: 'score' };
  const fromNetwork = Number(
    sql.exec('SELECT COUNT(*) AS n FROM entries WHERE network = ?', network).toArray()[0]?.n ?? 0,
  );
  if (fromNetwork >= ENTRIES_PER_NETWORK) return { ok: false, status: 429, problem: 'busy' };
  sql.exec(
    'INSERT INTO entries (id, name, tries, points, heard, at, network) VALUES (?, ?, ?, ?, ?, ?, ?)',
    entry.id,
    tidyName(entry.name),
    score.tries.join(''),
    score.points,
    score.heard,
    now,
    network,
  );
  return { ok: true, view: boardView(sql, entry.day, entry.id) };
}

/** A network's address as the board keeps it: hashed with the day, so days can't be linked. */
export async function networkKey(address: string, day: string): Promise<string> {
  const bytes = new TextEncoder().encode(`cspnews-song-board|${day}|${address}`);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
  return Array.from(digest.slice(0, 12), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

interface DurableState {
  readonly storage: { readonly sql: SqlStore };
}

/** One day's board. The Worker sends it the reader's request, already checked. */
export class SongBoard {
  private readonly sql: SqlStore;

  constructor(state: DurableState) {
    this.sql = state.storage.sql;
    prepare(this.sql);
  }

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const day = url.searchParams.get('day') ?? '';
    if (request.method === 'GET') {
      return Response.json(boardView(this.sql, day, url.searchParams.get('me') ?? undefined));
    }
    const { entry, network } = (await request.json()) as { entry: BoardEntry; network: string };
    const result = join(this.sql, entry, network, Date.now());
    return result.ok
      ? Response.json(result.view)
      : Response.json({ problem: result.problem }, { status: result.status });
  }
}
