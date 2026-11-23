/**
 * The numbers a reason line states, so a check can hold each one against the collected evidence.
 * Reads both languages: "2.1 million" and "2,1 milyon", "48 to 9" and "48'den 9'a", "1,400" and
 * "1.400", "4x" and "4 katı". Words for numbers ("nine years on") are not read; the writing rules
 * ask for digits wherever a number is a claim.
 */

const SCALES: Record<string, number> = {
  k: 1e3,
  thousand: 1e3,
  bin: 1e3,
  m: 1e6,
  million: 1e6,
  milyon: 1e6,
  b: 1e9,
  billion: 1e9,
  milyar: 1e9,
};

const NUMBER =
  /(?<![\p{L}\d])(\d{1,3}(?:[.,]\d{3})+|\d+(?:[.,]\d+)?)(?:\s*(k|m|b|thousand|million|billion|bin|milyon|milyar)(?!\p{L}))?/giu;

function readDigits(raw: string): number {
  // "1,400" and "1.400" are thousands; "2.1" and "2,1" are decimals.
  if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) return Number(raw.replace(/[.,]/g, ''));
  return Number(raw.replace(',', '.'));
}

export interface StatedNumber {
  /** As written: "2.1 million". */
  text: string;
  value: number;
  /** The digits had a decimal part or a scale word, so the source number was rounded to write it. */
  rounded: boolean;
}

export function statedNumbers(line: string): StatedNumber[] {
  const found: StatedNumber[] = [];
  for (const match of line.matchAll(NUMBER)) {
    const [text, digits = '', scaleWord] = match;
    const scale = scaleWord ? (SCALES[scaleWord.toLowerCase()] ?? 1) : 1;
    const value = readDigits(digits) * scale;
    if (Number.isFinite(value)) {
      found.push({ text: text.trim(), value, rounded: scale > 1 || /[.,]\d{1,2}$/.test(digits) });
    }
  }
  return found;
}

/**
 * True when a stated number could be `source` written for a reader: equal, or the source rounded
 * to the stated precision (2,134,567 plays read as "2.1 million"; a surge of 4.27 read as "4x").
 */
export function matchesSource(stated: StatedNumber, source: number): boolean {
  if (stated.value === source) return true;
  if (!stated.rounded && !Number.isInteger(source)) {
    return Math.round(source) === stated.value || Math.floor(source) === stated.value;
  }
  if (!stated.rounded) return false;
  const tolerance = Math.max(Math.abs(stated.value) * 0.05, 0.05);
  return Math.abs(source - stated.value) <= tolerance;
}
