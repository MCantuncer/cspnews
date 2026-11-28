import { DatabaseSync } from 'node:sqlite';

import { describe, expect, it } from 'vitest';

import { songLabel } from '@cspnews/songgame';

import {
  ENTRIES_PER_NETWORK,
  answersOn,
  boardView,
  join,
  prepare,
  type SqlStore,
} from './board.js';

/** The Durable Object's `storage.sql`, played by Node's own SQLite. */
function memoryStore(): SqlStore {
  const db = new DatabaseSync(':memory:');
  return {
    exec: (query, ...bindings) => {
      const statement = db.prepare(query);
      const rows = /^\s*select/i.test(query)
        ? statement.all(...bindings)
        : (statement.run(...bindings), []);
      return { toArray: () => rows as Record<string, string | number | null>[] };
    },
  };
}

const DAY = '2026-11-28';
const answers = answersOn(DAY);
const right = answers.map((song) => songLabel(song));

/** A finished day that named song i on try tries[i] (0 = gave up). */
function rounds(tries: number[]) {
  return tries.map((count, index) =>
    count === 0
      ? { guesses: [null, null, null, null, null], gaveUp: true }
      : { guesses: [...Array<null>(count - 1).fill(null), right[index] ?? ''] },
  );
}

function entry(id: string, name: string, tries: number[]) {
  return { day: DAY, id, name, rounds: rounds(tries) };
}

describe('the song board', () => {
  it('knows the four answers of a day', () => {
    expect(answers).toHaveLength(4);
  });

  it('ranks by points, then by less heard, then by who came first', () => {
    const sql = memoryStore();
    prepare(sql);
    expect(join(sql, entry('reader-aaaa', 'Velvet Owl', [1, 1, 1, 1]), 'n1', 1).ok).toBe(true);
    join(sql, entry('reader-bbbb', 'deniz_k', [2, 1, 1, 2]), 'n2', 2);
    join(sql, entry('reader-cccc', 'Ayşe', [1, 2, 2, 1]), 'n3', 3);
    const view = boardView(sql, DAY, 'reader-cccc');
    expect(view.players).toBe(3);
    expect(view.top.map((row) => row.name)).toEqual(['Velvet Owl', 'deniz_k', 'Ayşe']);
    expect(view.top[0]).toEqual({ rank: 1, name: 'Velvet Owl', tries: [1, 1, 1, 1], points: 400 });
    expect(view.me?.rank).toBe(3);
  });

  it('shows the top five and the neighbours of a reader below the top ten', () => {
    const sql = memoryStore();
    prepare(sql);
    for (let index = 0; index < 14; index += 1) {
      join(
        sql,
        entry(`reader-${String(index).padStart(4, '0')}`, `Player ${String(index)}`, [1, 1, 1, 1]),
        `n${String(index)}`,
        index,
      );
    }
    join(sql, entry('reader-last', 'Tiny Kazoo', [6, 0, 6, 0]), 'n-last', 99);
    join(sql, entry('reader-below', 'Quiet Owl', [0, 0, 0, 0]), 'n-below', 100);
    const view = boardView(sql, DAY, 'reader-last');
    expect(view.top).toHaveLength(5);
    expect(view.me).toMatchObject({
      rank: 15,
      name: 'Tiny Kazoo',
      points: 20,
      tries: [6, 0, 6, 0],
    });
    expect(view.around?.map((row) => row.rank)).toEqual([14, 15, 16]);
  });

  it('keeps the first row of a reader and refuses bad names and doctored scores', () => {
    const sql = memoryStore();
    prepare(sql);
    join(sql, entry('reader-aaaa', 'Velvet Owl', [2, 2, 2, 2]), 'n1', 1);
    const again = join(sql, entry('reader-aaaa', 'Other Name', [1, 1, 1, 1]), 'n1', 2);
    expect(again.ok && again.view.me).toMatchObject({ name: 'Velvet Owl', points: 320 });
    const spoiler = `${answers[0]?.title ?? ''} fan`;
    expect(join(sql, entry('reader-bbbb', spoiler, [1, 1, 1, 1]), 'n2', 3)).toMatchObject({
      ok: false,
      problem: 'spoiler',
    });
    const doctored = {
      ...entry('reader-cccc', 'Tiny Owl', [1, 1, 1, 1]),
      rounds: rounds([1, 1, 1, 1]).slice(0, 3),
    };
    expect(join(sql, doctored, 'n3', 4)).toMatchObject({ ok: false, problem: 'score' });
  });

  it('caps the names one network can add in a day', () => {
    const sql = memoryStore();
    prepare(sql);
    for (let index = 0; index < ENTRIES_PER_NETWORK; index += 1) {
      expect(
        join(
          sql,
          entry(`reader-${String(index).padStart(4, '0')}`, `Owl ${String(index)}`, [1, 1, 1, 1]),
          'same',
          index,
        ).ok,
      ).toBe(true);
    }
    expect(join(sql, entry('reader-more', 'One More', [1, 1, 1, 1]), 'same', 9)).toMatchObject({
      ok: false,
      status: 429,
    });
  });
});
