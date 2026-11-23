import { describe, expect, it } from 'vitest';

import { baseTitle, leadArtist, songKey } from './song.js';

describe('one song, however it is spelled', () => {
  it('drops featuring credits and edition tags', () => {
    expect(baseTitle('Holocaust (feat. X) - Remastered 2014')).toBe('Holocaust');
    expect(baseTitle('Halcyon Drift - Original Mix')).toBe('Halcyon Drift');
    expect(baseTitle('Geceler (Sped Up)')).toBe('Geceler');
    expect(baseTitle('Low Tide feat. Someone')).toBe('Low Tide');
  });

  it('keeps a remix as its own song', () => {
    expect(baseTitle('Subzero (Remix by Someone)')).toBe('Subzero (Remix by Someone)');
  });

  it('folds Turkish letters and featured artists', () => {
    expect(leadArtist('Dr. Dre feat. Snoop Dogg')).toBe('Dr. Dre');
    expect(songKey('Şanışer', 'Susamam')).toBe('saniser-susamam');
    expect(songKey('Kuzey Ateş & Mira Kaan', 'Gece Vardiyası (Slowed + Reverb)')).toBe(
      'kuzey-ates-gece-vardiyasi',
    );
  });
});
