import { describe, expect, it } from 'vitest';

import { markRead, readStories } from './read.js';

function memory(initial?: string) {
  const data = new Map<string, string>(initial ? [['cspnews:read', initial]] : []);
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  };
}

describe('read stories', () => {
  it('remembers stories once, newest last', () => {
    const storage = memory();
    markRead(storage, 'a');
    markRead(storage, 'b');
    markRead(storage, 'a');
    expect([...readStories(storage)]).toEqual(['b', 'a']);
  });

  it('ignores broken or missing storage', () => {
    expect(readStories(memory('not json')).size).toBe(0);
    expect(readStories(memory('{"a":1}')).size).toBe(0);
    expect(readStories(undefined).size).toBe(0);
    expect(() => {
      markRead(undefined, 'a');
    }).not.toThrow();
  });
});
