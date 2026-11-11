/** A repeatable stream of numbers from 0 (inclusive) to 1: the same seed always gives the same stream. */
export function seededRandom(seed: string): () => number {
  return mulberry32(hashSeed(seed));
}

function hashSeed(seed: string): number {
  // FNV-1a, 32 bit.
  let hash = 0x811c9dc5;
  for (const char of seed) {
    hash ^= char.codePointAt(0) ?? 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mulberry32(state: number): () => number {
  let current = state;
  return () => {
    current = (current + 0x6d2b79f5) >>> 0;
    let value = current;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}
