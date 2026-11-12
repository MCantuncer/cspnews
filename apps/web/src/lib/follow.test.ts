import { describe, expect, it } from 'vitest';

import {
  changesSince,
  follow,
  followed,
  isFollowed,
  markSeen,
  movedStories,
  seenNow,
  unfollow,
  type StoryNow,
} from './follow.js';
import { changeLine } from './follow-words.js';

function memory(initial?: string) {
  const data = new Map<string, string>(initial ? [['cspnews:follow', initial]] : []);
  return {
    getItem: (key: string) => data.get(key) ?? null,
    setItem: (key: string, value: string) => data.set(key, value),
  };
}

const chp: StoryNow = {
  id: 'chp',
  title: 'CHP congress trial adjourned again',
  href: '/2026-11-11/evening/chp',
  section: 'turkey',
  label: 'confirmed',
  labelWord: 'Confirmed',
  sources: [
    { id: 'hurriyet', name: 'Hürriyet' },
    { id: 'sabah', name: 'Sabah' },
  ],
  updatedAt: '2026-11-11T12:00:00.000Z',
};

const later: StoryNow = {
  ...chp,
  sources: [...chp.sources, { id: 'ntv', name: 'NTV' }, { id: 'sozcu', name: 'Sözcü' }],
  updatedAt: '2026-11-11T13:00:00.000Z',
};

const at = new Date('2026-11-11T12:10:00.000Z');

describe('following stories', () => {
  it('follows, refreshes what was seen, and unfollows', () => {
    const storage = memory();
    expect(isFollowed(storage, 'chp')).toBe(false);
    follow(storage, seenNow(chp, at));
    expect(isFollowed(storage, 'chp')).toBe(true);

    markSeen(storage, seenNow(later, at));
    expect(followed(storage, at.getTime())[0]?.sources).toEqual([
      'hurriyet',
      'sabah',
      'ntv',
      'sozcu',
    ]);

    unfollow(storage, 'chp');
    expect(isFollowed(storage, 'chp')).toBe(false);
  });

  it('does not start following a story just because it was read', () => {
    const storage = memory();
    markSeen(storage, seenNow(chp, at));
    expect(followed(storage)).toEqual([]);
  });

  it('forgets stories nobody looked at for a month', () => {
    const storage = memory();
    follow(storage, seenNow(chp, at));
    expect(followed(storage, at.getTime() + 29 * 86_400_000)).toHaveLength(1);
    expect(followed(storage, at.getTime() + 31 * 86_400_000)).toHaveLength(0);
  });

  it('ignores broken or missing storage', () => {
    expect(followed(memory('not json'))).toEqual([]);
    expect(followed(memory('[{"id":1}]'))).toEqual([]);
    expect(followed(undefined)).toEqual([]);
    expect(() => {
      follow(undefined, seenNow(chp, at));
    }).not.toThrow();
  });
});

describe('what changed', () => {
  it('names the outlets that joined and the new total', () => {
    expect(changesSince(seenNow(chp, at), later)).toEqual([
      { kind: 'joined', names: ['NTV', 'Sözcü'], total: 4 },
    ]);
  });

  it('puts a new evidence label first', () => {
    const disputed = { ...later, label: 'disputed' as const, labelWord: 'Disputed' };
    expect(changesSince(seenNow(chp, at), disputed)[0]).toEqual({
      kind: 'label',
      word: 'Disputed',
    });
  });

  it('falls back to the update time when only the text moved', () => {
    const edited = { ...chp, updatedAt: '2026-11-11T13:00:00.000Z' };
    expect(changesSince(seenNow(chp, at), edited)).toEqual([
      { kind: 'updated', at: '2026-11-11T13:00:00.000Z' },
    ]);
  });

  it('lists only followed stories in this bulletin that moved', () => {
    const list = [seenNow(chp, at), seenNow({ ...chp, id: 'gone' }, at)];
    expect(movedStories(list, [later]).map((m) => m.story.id)).toEqual(['chp']);
    expect(movedStories(list, [chp])).toEqual([]);
  });

  it('says it in both languages', () => {
    const [joined] = changesSince(seenNow(chp, at), later);
    if (!joined) throw new Error('expected a change');
    expect(changeLine(joined, 'en')).toBe('NTV and Sözcü joined, now 4 outlets');
    expect(changeLine(joined, 'tr')).toBe('NTV ve Sözcü katıldı, artık 4 kaynak');
    expect(changeLine({ kind: 'updated', at: '2026-11-11T13:00:00.000Z' }, 'tr')).toBe(
      'Güncellendi 16:00',
    );
  });
});
