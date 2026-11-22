/**
 * Line-breaking for the big numbers in a story's key facts.
 *
 * A value such as "34,3 milyon ₺" must never break so that a currency sign or
 * a scale word ends up alone on a line. We join the parts that belong together
 * with no-break spaces; the browser can still wrap a longer phrase between them.
 */

const NBSP = ' ';

/** Signs and short units that always stay with the number before them. */
const SYMBOL = /^(?:[₺$€£¥%‰°]|TL|USD|EUR|GBP|bps?|pp|km|kg|m|cm|mm)\.?$/iu;

/** Scale words in Turkish and English: "34,3 milyon", "1.2 billion". */
const SCALE =
  /^(?:bin|milyon|milyar|trilyon|thousand|million|billion|trillion|mn|bn|tn|m|k)[,.]?$/iu;

/** Money words that stay with the scale word before them: "milyar dolar". */
const MONEY =
  /^(?:dolar|doları|lira|lirası|liralık|TL’?\S*|euro|avro|sterlin|dollars?|euros?|pounds?)[,.]?$/iu;

const hasDigit = (token: string) => /\d/u.test(token);

/** A unit or a short word like "yıl", "gün", "Mart", "km/sa"; long words may wrap away. */
const isShortWord = (token: string) => !hasDigit(token) && token.length <= 5;

/** Whether the space between two neighbouring words must not break. */
function keepTogether(left: string, right: string): boolean {
  if (/[,;:]$/u.test(left)) return false; // a list: "2027, Birmingham"
  if (SYMBOL.test(right)) return true; // "34,3 milyon ₺", "12 %"
  if (/^[₺$€£¥~≈<>±+-]+$/u.test(left)) return true; // "$ 12", "~ 40"
  if (hasDigit(left) && (SCALE.test(right) || isShortWord(right))) return true; // "34,3 milyon", "7 yıl"
  if (SCALE.test(left) && MONEY.test(right)) return true; // "milyon dolar"
  return false;
}

/**
 * The value with no-break spaces where a line must not break.
 * "34,3 milyon ₺" → "34,3 milyon ₺" (one unit); "7 yıl 3 ay" → "7 yıl" + "3 ay".
 */
export function bindFactValue(value: string): string {
  const words = value.trim().split(/\s+/u);
  return words.reduce((text, word, index) => {
    if (index === 0) return word;
    const previous = words[index - 1] ?? '';
    return text + (keepTogether(previous, word) ? NBSP : ' ') + word;
  }, '');
}
