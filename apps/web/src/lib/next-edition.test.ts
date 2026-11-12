import { describe, expect, it } from 'vitest';

import { editionState, nextEditionLine } from './next-edition';

const due = new Date('2026-11-11T19:30:00Z'); // 22:30 in Istanbul

describe('editionState', () => {
  it('is due before the time and for a short grace after it', () => {
    expect(editionState(due, new Date('2026-11-11T19:00:00Z'))).toBe('due');
    expect(editionState(due, new Date('2026-11-11T19:39:00Z'))).toBe('due');
  });

  it('is late once the grace has passed', () => {
    expect(editionState(due, new Date('2026-11-11T19:40:00Z'))).toBe('late');
    expect(editionState(due, new Date('2026-11-12T01:00:00Z'))).toBe('late');
  });

  it('is stalled after six hours', () => {
    expect(editionState(due, new Date('2026-11-12T01:30:00Z'))).toBe('stalled');
  });
});

describe('nextEditionLine', () => {
  it('promises the next edition while it is due', () => {
    expect(nextEditionLine('due', '22:30', 'en')).toBe('Next at 22:30.');
    expect(nextEditionLine('due', '22:30', 'tr')).toBe('Sıradaki 22:30’da.');
  });

  it('says so when the edition is late', () => {
    expect(nextEditionLine('late', '22:30', 'en')).toBe('The 22:30 edition is running late.');
    expect(nextEditionLine('late', '22:30', 'tr')).toBe('22:30 bülteni gecikti.');
  });

  it('stops naming a time once the schedule has stalled', () => {
    expect(nextEditionLine('stalled', '22:30', 'en')).toBe(
      'No newer edition has been published yet.',
    );
    expect(nextEditionLine('stalled', '22:30', 'tr')).toBe('Henüz yeni bir bülten yayımlanmadı.');
  });
});
