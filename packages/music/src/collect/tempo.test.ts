import { describe, expect, it } from 'vitest';

import { MIN_TEMPO_CONFIDENCE, TEMPO_RATE, estimateTempo } from './tempo.js';

/** A seeded random, so the tests read the same noise every time. */
function random(seed: number): () => number {
  let state = seed >>> 0 || 1;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4_294_967_296 - 0.5;
  };
}

/** Thirty seconds of a four-to-the-floor kick with off-beat hats, a bass line and noise. */
function techno(bpm: number, seed = 1): Float32Array {
  const noise = random(seed);
  const samples = new Float32Array(TEMPO_RATE * 30);
  const beat = (60 / bpm) * TEMPO_RATE;
  for (let i = 0; i < samples.length; i++) {
    const t = i / TEMPO_RATE;
    const sinceBeat = (i % beat) / TEMPO_RATE;
    const kick =
      Math.sin(2 * Math.PI * (50 + 80 * Math.exp(-sinceBeat * 30)) * sinceBeat) *
      Math.exp(-sinceBeat * 9);
    const sinceHat = ((i + beat / 2) % beat) / TEMPO_RATE;
    const hat = noise() * Math.exp(-sinceHat * 60) * 0.6;
    const bass = 0.25 * Math.sin(2 * Math.PI * 55 * t) * (sinceHat < 0.12 ? 1 : 0.2);
    samples[i] = 0.8 * kick + hat + bass + noise() * 0.15;
  }
  return samples;
}

describe('tempo from a preview', () => {
  it.each([122, 128, 130, 132, 134, 140])('reads %i BPM', (bpm) => {
    const reading = estimateTempo(techno(bpm));
    expect(reading?.bpm).toBeGreaterThanOrEqual(bpm - 1);
    expect(reading?.bpm).toBeLessThanOrEqual(bpm + 1);
    expect(reading?.confidence).toBeGreaterThanOrEqual(MIN_TEMPO_CONFIDENCE);
  });

  it('is not sure of noise', () => {
    const noise = random(7);
    const samples = Float32Array.from({ length: TEMPO_RATE * 30 }, () => noise());
    expect(estimateTempo(samples)?.confidence ?? 0).toBeLessThan(MIN_TEMPO_CONFIDENCE);
  });

  it('needs enough sound', () => {
    expect(estimateTempo(new Float32Array(TEMPO_RATE))).toBeUndefined();
  });
});
