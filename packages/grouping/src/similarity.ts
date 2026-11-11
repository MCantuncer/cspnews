/** A sparse term-weight vector. */
export type Vector = ReadonlyMap<string, number>;

/** Inverse document frequency over a batch of term lists: rare terms weigh more. */
export function inverseDocumentFrequency(
  documents: readonly (readonly string[])[],
): ReadonlyMap<string, number> {
  const documentCount = new Map<string, number>();
  for (const document of documents) {
    for (const term of new Set(document)) {
      documentCount.set(term, (documentCount.get(term) ?? 0) + 1);
    }
  }
  const idf = new Map<string, number>();
  for (const [term, count] of documentCount) {
    idf.set(term, Math.log(1 + documents.length / count));
  }
  return idf;
}

/** TF-IDF vector; terms listed twice (headline terms) count twice. */
export function weigh(document: readonly string[], idf: ReadonlyMap<string, number>): Vector {
  const vector = new Map<string, number>();
  for (const term of document) {
    vector.set(term, (vector.get(term) ?? 0) + (idf.get(term) ?? 0));
  }
  return vector;
}

export function add(target: Map<string, number>, vector: Vector): void {
  for (const [term, weight] of vector) {
    target.set(term, (target.get(term) ?? 0) + weight);
  }
}

/** Cosine similarity, 0 (nothing shared) to 1 (same direction). */
export function cosine(a: Vector, b: Vector): number {
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (const [term, weight] of a) {
    normA += weight * weight;
    dot += weight * (b.get(term) ?? 0);
  }
  for (const weight of b.values()) {
    normB += weight * weight;
  }
  return normA === 0 || normB === 0 ? 0 : dot / Math.sqrt(normA * normB);
}

/** Word 3-grams, for spotting copied text (wire copy), where word order matters. */
export function shingles(words: readonly string[], size = 3): ReadonlySet<string> {
  const result = new Set<string>();
  if (words.length < size) {
    if (words.length > 0) {
      result.add(words.join(' '));
    }
    return result;
  }
  for (let i = 0; i + size <= words.length; i += 1) {
    result.add(words.slice(i, i + size).join(' '));
  }
  return result;
}

/** Share of the smaller set found in the larger one, 0 to 1. */
export function containment(a: ReadonlySet<string>, b: ReadonlySet<string>): number {
  const [small, large] = a.size <= b.size ? [a, b] : [b, a];
  if (small.size === 0) {
    return 0;
  }
  let shared = 0;
  for (const item of small) {
    if (large.has(item)) {
      shared += 1;
    }
  }
  return shared / small.size;
}
