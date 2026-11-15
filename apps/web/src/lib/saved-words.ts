import type { InterfaceLanguage } from './evidence.js';

/** The words of the saved list and the archive, in English and Turkish. */
const WORDS = {
  en: {
    save: 'Save for later',
    saved: 'Saved',
    savedTitle: 'Saved stories',
    savedIntro: 'Stories you saved to read later. They are kept on this device only.',
    savedEmpty: 'Nothing saved yet. Use “Save for later” on a story and it will wait here.',
    savedFrom: 'Saved from',
    remove: 'Remove',
    archiveTitle: 'Earlier bulletins',
    archiveIntro: 'Every bulletin we have published, newest first.',
    archiveEmpty: 'No bulletins yet.',
    savedLink: 'Saved stories',
    archiveLink: 'Earlier bulletins',
  },
  tr: {
    save: 'Sonra için sakla',
    saved: 'Saklandı',
    savedTitle: 'Saklanan haberler',
    savedIntro: 'Sonra okumak için sakladığın haberler. Yalnızca bu cihazda tutulur.',
    savedEmpty:
      'Henüz bir şey saklanmadı. Bir haberde “Sonra için sakla”ya bas, burada seni beklesin.',
    savedFrom: 'Saklandığı gün',
    remove: 'Kaldır',
    archiveTitle: 'Önceki bültenler',
    archiveIntro: 'Yayımladığımız her bülten, en yenisi başta.',
    archiveEmpty: 'Henüz bülten yok.',
    savedLink: 'Saklanan haberler',
    archiveLink: 'Önceki bültenler',
  },
} as const;

export type SavedWords = (typeof WORDS)[InterfaceLanguage];

export function savedWords(language: InterfaceLanguage): SavedWords {
  return WORDS[language];
}
