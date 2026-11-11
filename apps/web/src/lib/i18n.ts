import type { Section } from '@cspnews/core';
import type { EvidenceLabel, InterfaceLanguage } from './evidence.js';
import { evidenceWord } from './evidence.js';

/**
 * Interface words in English and Turkish. Stories keep their own language; only the frame
 * around them (headings, buttons, dates) follows the reader's interface language.
 */
const WORDS = {
  en: {
    bulletin: {
      morning: 'Morning bulletin',
      midday: 'Midday bulletin',
      evening: 'Evening bulletin',
      late: 'Late bulletin',
    },
    section: { turkey: 'Türkiye', tech: 'Tech and AI', world: 'Around the World' },
    what: 'What happened',
    why: 'Why it matters',
    next: 'What’s next',
    facts: 'Key numbers',
    fullStory: 'Full story',
    seriesHeading: 'Earlier values',
    lifeHeading: 'How this story developed',
    firstReported: 'First report',
    primarySource: 'Primary source',
    factCheck: 'Fact-check',
    updated: 'Updated',
    developing: 'Developing',
    previous: 'Previous story',
    nextStory: 'Next',
    endOfBulletin: 'End of the bulletin',
    sources: 'Sources',
    latest: 'Latest bulletin',
    startReading: 'Start reading',
    noBulletin: 'No bulletin yet',
    noBulletinBody: 'The first bulletin appears here as soon as it is published.',
  },
  tr: {
    bulletin: {
      morning: 'Sabah bülteni',
      midday: 'Öğle bülteni',
      evening: 'Akşam bülteni',
      late: 'Gece bülteni',
    },
    section: { turkey: 'Türkiye', tech: 'Teknoloji ve yapay zekâ', world: 'Dünya' },
    what: 'Ne oldu',
    why: 'Neden önemli',
    next: 'Sırada ne var',
    facts: 'Rakamlar',
    fullStory: 'Haberin tamamı',
    seriesHeading: 'Önceki değerler',
    lifeHeading: 'Haberin seyri',
    firstReported: 'İlk haber',
    primarySource: 'Birincil kaynak',
    factCheck: 'Doğruluk kontrolü',
    updated: 'Güncellendi',
    developing: 'Gelişiyor',
    previous: 'Önceki haber',
    nextStory: 'Sıradaki',
    endOfBulletin: 'Bülten sonu',
    sources: 'Kaynaklar',
    latest: 'Son bülten',
    startReading: 'Okumaya başla',
    noBulletin: 'Henüz bülten yok',
    noBulletinBody: 'İlk bülten yayımlanır yayımlanmaz burada görünür.',
  },
} as const;

export type Words = (typeof WORDS)[InterfaceLanguage];

export function wordsFor(language: InterfaceLanguage): Words {
  return WORDS[language];
}

/** "Evening bulletin"; unknown slots read as plain "Bulletin". */
export function bulletinName(slot: string, language: InterfaceLanguage): string {
  const names: Record<string, string> = WORDS[language].bulletin;
  return names[slot] ?? (language === 'tr' ? 'Bülten' : 'Bulletin');
}

export function sectionName(section: Section, language: InterfaceLanguage): string {
  return WORDS[language].section[section];
}

/** "3 of 12" / "haber 3 / 12". */
export function storyPosition(index: number, total: number, language: InterfaceLanguage): string {
  const n = String(index + 1);
  return language === 'tr' ? `haber ${n} / ${String(total)}` : `${n} of ${String(total)}`;
}

/** "2nd source" / "2. kaynak", for outlets joining a story. */
export function sourceOrdinal(n: number, language: InterfaceLanguage): string {
  if (language === 'tr') return `${String(n)}. kaynak`;
  const tens = n % 100;
  const ones: Partial<Record<number, string>> = { 1: 'st', 2: 'nd', 3: 'rd' };
  const suffix = tens >= 11 && tens <= 13 ? 'th' : (ones[n % 10] ?? 'th');
  return `${String(n)}${suffix} source`;
}

/** The evidence line's accessible name: "Confirmed, 5 sources: AA, NTV, BBC Türkçe and 2 more". */
export function evidenceSummary(
  label: EvidenceLabel,
  names: readonly string[],
  shown: number,
  language: InterfaceLanguage,
): string {
  const word = evidenceWord(label, language);
  const visible = names.slice(0, shown).join(', ');
  const rest = names.length - shown;
  if (language === 'tr') {
    const tail = rest > 0 ? ` ve ${String(rest)} kaynak daha` : '';
    return `${word}, ${String(names.length)} kaynak: ${visible}${tail}`;
  }
  const count = `${String(names.length)} source${names.length === 1 ? '' : 's'}`;
  const tail = rest > 0 ? ` and ${String(rest)} more` : '';
  return `${word}, ${count}: ${visible}${tail}`;
}
