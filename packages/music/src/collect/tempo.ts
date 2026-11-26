/**
 * Measures a techno song's tempo from its 30-second preview, for the days Beatport cannot be read
 * and Deezer gives no tempo (docs/music.md, "Tempo"). Techno is a steady four-to-the-floor kick, so
 * the low end's onsets repeat at the beat; the tempo is the period whose multiples line up best.
 *
 * Only 110 to 150 BPM is searched, so a half or double reading cannot win; the page takes 120 to
 * 134. A reading whose beats are not clearly alike is not used.
 */

export const TEMPO_RATE = 11_025;
const HOP = 64;
const MIN_BPM = 110;
const MAX_BPM = 150;
const BEATS = 8;
/** How alike the low end must be from beat to beat before the reading is used. */
export const MIN_TEMPO_CONFIDENCE = 0.15;

export interface TempoReading {
  bpm: number;
  /** How much more alike the low end is whole beats apart than half beats apart, about 0 to 1. */
  confidence: number;
}

/** The onset strength of the low end: how much the bass energy rises, hop by hop. */
function onsets(samples: Float32Array, rate: number): Float64Array {
  // One-pole low-pass at about 150 Hz keeps the kick and drops hats and pads.
  const alpha = 1 - Math.exp((-2 * Math.PI * 150) / rate);
  const frames = Math.floor(samples.length / HOP);
  const energy = new Float64Array(frames);
  let low = 0;
  for (let frame = 0; frame < frames; frame++) {
    let sum = 0;
    for (let i = frame * HOP; i < (frame + 1) * HOP; i++) {
      low += alpha * ((samples[i] ?? 0) - low);
      sum += low * low;
    }
    energy[frame] = Math.log1p(1000 * sum);
  }
  const rise = new Float64Array(frames);
  let mean = 0;
  for (let frame = 1; frame < frames; frame++) {
    rise[frame] = Math.max(0, (energy[frame] ?? 0) - (energy[frame - 1] ?? 0));
    mean += rise[frame] ?? 0;
  }
  mean /= Math.max(1, frames - 1);
  for (let frame = 0; frame < frames; frame++) rise[frame] = (rise[frame] ?? 0) - mean;
  return rise;
}

export function estimateTempo(samples: Float32Array, rate = TEMPO_RATE): TempoReading | undefined {
  const signal = onsets(samples, rate);
  const framesPerMinute = (60 * rate) / HOP;
  const maxLag = Math.ceil((BEATS * framesPerMinute) / MIN_BPM) + 2;
  if (signal.length < maxLag * 2) return undefined;

  const correlation = new Float64Array(maxLag + 1);
  for (let lag = 0; lag <= maxLag; lag++) {
    let sum = 0;
    for (let i = lag; i < signal.length; i++) sum += (signal[i] ?? 0) * (signal[i - lag] ?? 0);
    correlation[lag] = sum / (signal.length - lag);
  }
  const at = (lag: number) => {
    const below = Math.floor(lag);
    const part = lag - below;
    return (correlation[below] ?? 0) * (1 - part) + (correlation[below + 1] ?? 0) * part;
  };

  const scores: { bpm: number; score: number }[] = [];
  for (let tenths = MIN_BPM * 10; tenths <= MAX_BPM * 10; tenths++) {
    const bpm = tenths / 10;
    const period = framesPerMinute / bpm;
    let score = 0;
    for (let beat = 1; beat <= BEATS; beat++) score += at(beat * period);
    scores.push({ bpm, score });
  }
  const best = scores.reduce((top, item) => (item.score > top.score ? item : top));
  // How much more alike the low end is whole beats apart than half beats apart: a kick on every
  // beat makes it large, noise or a broken beat keeps it near 0.
  const period = framesPerMinute / best.bpm;
  let offBeat = 0;
  for (let beat = 1; beat <= BEATS; beat++) offBeat += at((beat - 0.5) * period);
  const confidence = (best.score - offBeat) / BEATS / Math.max(1e-12, correlation[0] ?? 0);
  return { bpm: Math.round(best.bpm), confidence: Math.round(confidence * 100) / 100 };
}
