/**
 * A stand-in for D1 in tests: a fresh in-memory SQLite database (node:sqlite) with the real
 * migrations applied. Implements only the D1 calls the Worker uses (src/d1.ts).
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import type { SQLInputValue } from 'node:sqlite';

import type { D1Database, D1PreparedStatement, D1Result } from '../d1.js';

const MIGRATIONS = join(import.meta.dirname, '../../migrations');

export function createTestDatabase(): D1Database & { sqlite: DatabaseSync } {
  const sqlite = new DatabaseSync(':memory:');
  sqlite.exec('PRAGMA foreign_keys = ON'); // on by default in D1
  for (const file of readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith('.sql'))
    .sort()) {
    sqlite.exec(readFileSync(join(MIGRATIONS, file), 'utf8'));
  }

  const statement = (query: string, values: SQLInputValue[] = []): D1PreparedStatement => ({
    bind: (...next: unknown[]) => statement(query, next.map(toSqlite)),
    first: <T>() => Promise.resolve((sqlite.prepare(query).get(...values) ?? null) as T | null),
    // The generic mirrors D1's own signature: callers name the row type.
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-parameters
    all: <T>() =>
      Promise.resolve({
        results: sqlite.prepare(query).all(...values) as T[],
        success: true,
        meta: {},
      }),
    run: () => Promise.resolve(run(query, values)),
  });

  const run = (query: string, values: SQLInputValue[]): D1Result => {
    const result = sqlite.prepare(query).run(...values);
    return { results: [], success: true, meta: { changes: Number(result.changes) } };
  };

  return {
    sqlite,
    prepare: (query) => statement(query),
    batch: async (statements) => {
      sqlite.exec('BEGIN');
      try {
        const results = [];
        for (const s of statements) results.push(await s.run());
        sqlite.exec('COMMIT');
        return results;
      } catch (error) {
        sqlite.exec('ROLLBACK');
        throw error;
      }
    },
  };
}

function toSqlite(value: unknown): SQLInputValue {
  if (value === undefined || value === null) return null;
  if (typeof value === 'boolean') return value ? 1 : 0;
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'bigint')
    return value;
  if (value instanceof Uint8Array) return value;
  throw new TypeError(`Cannot bind ${typeof value} to SQLite`);
}
