import type { Section } from '@cspnews/core';
import type { EvidenceLabel, InterfaceLanguage } from './evidence.js';
import { evidenceWord } from './evidence.js';

/**
 * Interface words in English and Turkish. The frame around a story (headings, buttons, dates)
 * and the story itself (each is written in both languages) follow the reader's language.
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
    noBulletin: 'No bulletin yet',
    noBulletinBody: 'The first bulletin appears here as soon as it is published.',
    contents: 'Contents',
    before: 'Before',
    now: 'Now',
    photo: 'Photo',
    logo: 'Logo',
    close: 'Close',
    whoReports: 'Who reports it',
    noOutlet: 'No outlet from this camp',
    republished: 'republished it',
    reliability: 'Reliability',
    reliabilityKey: ['News agency', 'Established outlet', 'Other outlet'],
    copyNote: 'An outlet that republished another outlet\u2019s text is listed, but not counted.',
    openEvidence: 'Show sources',
    hotNews: 'Hot News',
    dismissHot: 'Dismiss Hot News',
    storySoFar: 'Story so far',
    backToBulletin: 'Back to the bulletin',
    hotLoading: 'Loading Hot News…',
    hotGone: 'This story is no longer in Hot News.',
    hotError: 'Hot News could not be loaded. Check your connection and try again.',
    tryAgain: 'Try again',
    translatedQuote: 'translated',
    home: 'CSPNews, home',
    settings: 'Settings',
    language: 'Language',
    languageHint: 'Menus, labels and every story.',
    theme: 'Theme',
    themes: { dark: 'Dark', light: 'Light', device: 'Match device' },
    textSize: 'Text size',
    textSizes: { small: 'Small', default: 'Default', large: 'Large', larger: 'Larger' },
    smallerText: 'Smaller text',
    largerText: 'Larger text',
    ruler: 'Reading ruler',
    rulerHint: 'Highlights the line you are on',
    evidenceMarks: 'Evidence marks',
    noneYet: 'None yet',
    moreSettings: 'Evidence marks and more',
    caughtUp: 'You’re caught up',
    finish: 'Finish',
    toRemember: 'Three things to remember',
    reviewStories: 'Review the stories',
    wordGame: 'Today’s word game',
    wordGameHint: 'Five letters, six tries.',
    resume: 'Continue where you left off',
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
    noBulletin: 'Henüz bülten yok',
    noBulletinBody: 'İlk bülten yayımlanır yayımlanmaz burada görünür.',
    contents: 'İçindekiler',
    before: 'Önce',
    now: 'Şimdi',
    photo: 'Fotoğraf',
    logo: 'Logo',
    close: 'Kapat',
    whoReports: 'Kimler bildiriyor',
    noOutlet: 'Bu kesimden kaynak yok',
    republished: 'yeniden yayımladı',
    reliability: 'Güvenilirlik',
    reliabilityKey: ['Haber ajansı', 'Köklü yayın', 'Diğer yayın'],
    copyNote: 'Başka bir yayının metnini yeniden yayımlayan kaynak listelenir, ama sayılmaz.',
    openEvidence: 'Kaynakları göster',
    hotNews: 'Son Dakika',
    dismissHot: 'Son dakikayı kapat',
    storySoFar: 'Şu ana kadar',
    backToBulletin: 'Bültene dön',
    hotLoading: 'Son dakika yükleniyor…',
    hotGone: 'Bu haber artık son dakikada değil.',
    hotError: 'Son dakika yüklenemedi. Bağlantını kontrol edip yeniden dene.',
    tryAgain: 'Yeniden dene',
    translatedQuote: 'çeviri',
    home: 'CSPNews, ana sayfa',
    settings: 'Ayarlar',
    language: 'Dil',
    languageHint: 'Menüler, etiketler ve tüm haberler.',
    theme: 'Tema',
    themes: { dark: 'Koyu', light: 'Açık', device: 'Cihaza uy' },
    textSize: 'Yazı boyutu',
    textSizes: { small: 'Küçük', default: 'Varsayılan', large: 'Büyük', larger: 'Daha büyük' },
    smallerText: 'Yazıyı küçült',
    largerText: 'Yazıyı büyüt',
    ruler: 'Okuma cetveli',
    rulerHint: 'Okuduğun satırı vurgular',
    evidenceMarks: 'Kanıt işaretleri',
    noneYet: 'Henüz yok',
    moreSettings: 'Kanıt işaretleri ve diğerleri',
    caughtUp: 'Hepsi bu kadar',
    finish: 'Bitir',
    toRemember: 'Akılda kalması gereken üç şey',
    reviewStories: 'Haberlere yeniden bak',
    wordGame: 'Günün kelime oyunu',
    wordGameHint: 'Beş harf, altı deneme.',
    resume: 'Kaldığın yerden devam et',
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

/** A run of outlets joining close together: "+4 outlets in 40 min". */
export function moreOutlets(count: number, minutes: number, language: InterfaceLanguage): string {
  const n = String(count);
  const m = String(minutes);
  if (language === 'tr') return minutes >= 1 ? `+${n} kaynak, ${m} dakikada` : `+${n} kaynak`;
  return minutes >= 1 ? `+${n} outlets in ${m} min` : `+${n} outlets`;
}

/** Up to three names, then a count: "NTV, Habertürk, DW Türkçe and 2 more". */
export function nameList(names: readonly string[], language: InterfaceLanguage): string {
  const shown = names.slice(0, 3);
  const rest = names.length - shown.length;
  const and = language === 'tr' ? 've' : 'and';
  if (rest > 0) {
    const more = language === 'tr' ? `${String(rest)} kaynak daha` : `${String(rest)} more`;
    return `${shown.join(', ')} ${and} ${more}`;
  }
  if (shown.length <= 1) return shown.join('');
  return `${shown.slice(0, -1).join(', ')} ${and} ${shown.at(-1) ?? ''}`;
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

/** "3 stories, about 4 minutes" / "3 haber, yaklaşık 4 dakika". */
export function bulletinSize(
  stories: number,
  minutes: number,
  language: InterfaceLanguage,
): string {
  const m = String(Math.max(1, minutes));
  if (language === 'tr') return `${String(stories)} haber, yaklaşık ${m} dakika`;
  const s = stories === 1 ? 'story' : 'stories';
  return `${String(stories)} ${s}, about ${m} minute${m === '1' ? '' : 's'}`;
}

/** "Next at 22:30." / "Sıradaki 22:30'da." */
export function nextBulletinAt(time: string, language: InterfaceLanguage): string {
  return language === 'tr' ? `Sıradaki ${time}’da.` : `Next at ${time}.`;
}

/** "4 read" / "4 okundu", for read stories folded into one line. */
export function readCount(count: number, language: InterfaceLanguage): string {
  return `${String(count)} ${language === 'tr' ? 'okundu' : 'read'}`;
}

/** "5 outlets" / "5 kaynak". */
export function outletCount(count: number, language: InterfaceLanguage): string {
  if (language === 'tr') return `${String(count)} kaynak`;
  return `${String(count)} outlet${count === 1 ? '' : 's'}`;
}

/**
 * "2 independent reports" / "2 bağımsız haber": what a camp's large number counts. An outlet
 * that only republished another's text is listed under the camp but is not one of these.
 */
export function independentReports(count: number, language: InterfaceLanguage): string {
  if (language === 'tr') return `${String(count)} bağımsız haber`;
  return `${String(count)} independent report${count === 1 ? '' : 's'}`;
}

/**
 * The drawer's total, in the same terms as the evidence line that opens it: every listed
 * outlet is either independent or a copy, so the two numbers add up to the line's count.
 * "9 independent, 1 copy" / "9 bağımsız, 1 kopya"; with no copies, "9 independent".
 */
export function reportTotals(
  independent: number,
  copies: number,
  language: InterfaceLanguage,
): string {
  if (language === 'tr') {
    const base = `${String(independent)} bağımsız`;
    return copies > 0 ? `${base}, ${String(copies)} kopya` : base;
  }
  const base = `${String(independent)} independent`;
  return copies > 0 ? `${base}, ${String(copies)} ${copies === 1 ? 'copy' : 'copies'}` : base;
}

/** "Reliability 2 of 3" / "Güvenilirlik 3 üzerinden 2". */
export function reliabilityLabel(steps: number, language: InterfaceLanguage): string {
  return language === 'tr'
    ? `Güvenilirlik 3 üzerinden ${String(steps)}`
    : `Reliability ${String(steps)} of 3`;
}

/** "Updated 18:04" / "Güncellendi 18:04". */
export function updatedAt(time: string, language: InterfaceLanguage): string {
  return `${WORDS[language].updated} ${time}`;
}
