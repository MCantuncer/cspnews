import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import { loadBulletins, readBulletinFile, storyPath } from './bulletins.js';

const FIXTURES = fileURLToPath(new URL('../../fixtures/bulletins', import.meta.url));
const SAMPLE = '2026-11-11-evening.json';
const sample = () => readFileSync(`${FIXTURES}/${SAMPLE}`, 'utf8');

describe('bulletins', () => {
  it('reads the sample bulletin', () => {
    const [published] = loadBulletins(FIXTURES);
    expect(published?.date).toBe('2026-11-11');
    expect(published?.slot).toBe('evening');
    expect(published?.bulletin.stories.length).toBeGreaterThan(1);
  });

  it('treats a missing directory as nothing published', () => {
    expect(loadBulletins(`${FIXTURES}/missing`)).toEqual([]);
  });

  it('rejects a badly named file', () => {
    expect(() => readBulletinFile('evening.json', sample())).toThrow(/named/);
  });

  it('rejects a file whose name does not match its slot', () => {
    expect(() => readBulletinFile('2026-11-11-morning.json', sample())).toThrow(/slot/);
  });

  it('builds story URLs from date, slot and story id', () => {
    const published = readBulletinFile(SAMPLE, sample());
    const story = published.bulletin.stories[0];
    expect(story && storyPath(published, story)).toBe('/2026-11-11/evening/tcmb-faiz-indirimi');
  });
});
