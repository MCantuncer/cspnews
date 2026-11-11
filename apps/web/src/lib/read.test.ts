import { describe, expect, it } from 'vitest';

import { markRead, readStories, resumeIndex } from './read.js';

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

describe('resumeIndex', () => {
  const keys = ['a', 'b', 'c', 'd'];

  it('offers nothing before the first story is read', () => {
    expect(resumeIndex(keys, [])).toBeUndefined();
  });

  it('continues after the story read last', () => {
    expect(resumeIndex(keys, ['a', 'b'])).toBe(2);
    expect(resumeIndex(keys, ['c', 'a'])).toBe(1);
  });

  it('goes back to the first unread story at the end', () => {
    expect(resumeIndex(keys, ['b', 'c', 'd'])).toBe(0);
  });

  it('offers nothing once everything is read', () => {
    expect(resumeIndex(keys, ['a', 'b', 'c', 'd'])).toBeUndefined();
  });
});
