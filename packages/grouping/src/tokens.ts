/**
 * Turns headline and summary text into comparable terms, with rules only (no model).
 *
 * Turkish is agglutinative: "seçim", "seçimde", "seçimlerin" are one word with suffixes.
 * Cutting every word to its first 5 letters is a well-known, cheap stemmer for Turkish
 * search, and it works well enough for English ("election", "elections" → "elect").
 * Numbers are kept whole, because "4.6" and "35%" are what tell two stories apart.
 */

export const STEM_LENGTH = 5;

const STOPWORDS: Readonly<Record<string, ReadonlySet<string>>> = {
  tr: new Set(
    'acaba ama ancak artık aslında az bana bazı belki ben beni benim bile bir biri birkaç birşey biz bize bizi bu buna bunda bundan bunu bunun burada çok çünkü da daha de defa diye en gibi hem hep hepsi her hiç için ile ise kez ki kim mı mi mu mü nasıl ne neden nerde nerede nereye niye niçin o olan olarak oldu olduğu olduğunu olmak olması olur ona ondan onlar onu onun sonra şey şu şuna şunu tüm ve veya ya yani yine yeni son dakika'.split(
      ' ',
    ),
  ),
  en: new Set(
    'a about after again against all also an and any are as at be been before being but by can could did do does for from had has have he her his how i if in into is it its just more most new no not of on once only or other our out over said says she so some than that the their them then there these they this to too under up was we were what when where which while who why will with would you live latest update'.split(
      ' ',
    ),
  ),
};

/** Lower-cases with the right rules for the language (Turkish İ→i, I→ı). */
function lower(text: string, language: string): string {
  return language === 'tr' ? text.toLocaleLowerCase('tr-TR') : text.toLowerCase();
}

/** Words and numbers in the text, lower-cased; decimals like "4,6" and "4.6" read the same. */
export function words(text: string, language: string): string[] {
  const matches = lower(text, language).match(/\d+(?:[.,]\d+)*|[\p{L}]+/gu) ?? [];
  return matches.map((word) => (/^\d/.test(word) ? word.replace(/,/g, '.') : word));
}

/** Terms used for similarity: stopwords and 1-letter words dropped, words cut to STEM_LENGTH. */
export function terms(text: string, language: string): string[] {
  const stopwords = STOPWORDS[language];
  return words(text, language)
    .filter((word) => word.length > 1 && !stopwords?.has(word))
    .map((word) => (/^\d/.test(word) ? word : word.slice(0, STEM_LENGTH)));
}
