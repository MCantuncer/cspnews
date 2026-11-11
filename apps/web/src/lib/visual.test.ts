import type { LocalStory } from '@cspnews/core';
import { describe, expect, it } from 'vitest';

import { locatorMap } from './map.js';
import { formatValue, visualFor } from './visual.js';

const image = {
  url: 'https://example.com/a.jpg',
  sourceId: 'x',
  sourceName: 'X',
  articleUrl: 'https://example.com/a',
};
const keyNumber = { label: 'Rate', unit: '%', before: 33, after: 31.5, source: 'Bank' };
const place = { name: 'Doha', lat: 25.29, lon: 51.53, region: 'Qatar' };
const saved = { photo: () => '/media/s.jpg', logo: () => '/media/org/o.svg' };
const missing = { photo: () => undefined, logo: () => undefined };
const story = (fields: Partial<LocalStory>) => ({ id: 's', ...fields }) as LocalStory;

describe('visualFor', () => {
  it('prefers a saved photo, then chart, map, logo, nothing', () => {
    const all = story({ image, keyNumber, place, orgId: 'o' });
    expect(visualFor(all, saved).kind).toBe('photo');
    expect(visualFor(all, missing).kind).toBe('chart');
    expect(visualFor(story({ place, orgId: 'o' }), saved).kind).toBe('map');
    expect(visualFor(story({ orgId: 'o' }), saved).kind).toBe('logo');
    expect(visualFor(story({ orgId: 'o' }), missing).kind).toBe('none');
    expect(visualFor(story({}), saved).kind).toBe('none');
  });

  it('never shows a photo the run did not save', () => {
    expect(visualFor(story({ image }), missing).kind).toBe('none');
  });
});

describe('formatValue', () => {
  it('writes numbers the way each language does', () => {
    expect(formatValue(31.5, '%', 'tr')).toBe('%31,5');
    expect(formatValue(31.5, '%', 'en')).toBe('31.5%');
    expect(formatValue(1200, 'MW', 'en')).toBe('1,200 MW');
  });
});

describe('locatorMap', () => {
  it('centres the place and marks its country', () => {
    const map = locatorMap(place, 320, 200);
    expect(map.x).toBeCloseTo(160);
    expect(map.y).toBeCloseTo(100);
    expect(map.land.filter((shape) => shape.home)).toHaveLength(1);
  });
});
