import type { InterfaceLanguage } from './evidence.js';
import type { Change } from './follow.js';
import { formatTime } from './format.js';

/** The words of following a story, in English and Turkish. */
const WORDS = {
  en: {
    title: 'Follow this story',
    hint: 'When it moves, it comes first in the next bulletin, with what changed.',
    follow: 'Follow',
    following: 'Following',
    followingHint: 'You follow this story. When it moves, the next bulletin starts with it.',
    since: 'Since you last read',
    joined: (names: string, total: number) => `${names} joined, now ${String(total)} outlets`,
    label: (word: string) => `Now marked ${word}`,
    updated: (time: string) => `Updated ${time}`,
  },
  tr: {
    title: 'Bu hikâyeyi takip et',
    hint: 'Gelişme olursa sonraki bültende en üstte, neyin değiştiğiyle birlikte görürsün.',
    follow: 'Takip et',
    following: 'Takip ediliyor',
    followingHint: 'Bu hikâyeyi takip ediyorsun. Gelişme olursa sonraki bülten onunla başlar.',
    since: 'Son okuduğundan beri',
    joined: (names: string, total: number) => `${names} katıldı, artık ${String(total)} kaynak`,
    label: (word: string) => `Artık "${word}" olarak işaretli`,
    updated: (time: string) => `Güncellendi ${time}`,
  },
} as const;

export type FollowWords = (typeof WORDS)[InterfaceLanguage];

export function followWords(language: InterfaceLanguage): FollowWords {
  return WORDS[language];
}

/** "NTV", "NTV and Sözcü", "NTV, Sözcü and BBC" (Turkish: "ve"). */
function nameList(names: readonly string[], language: InterfaceLanguage): string {
  return new Intl.ListFormat(language === 'tr' ? 'tr-TR' : 'en-GB', {
    style: 'long',
    type: 'conjunction',
  }).format(names);
}

/** One line for one change. */
export function changeLine(change: Change, language: InterfaceLanguage): string {
  const words = WORDS[language];
  switch (change.kind) {
    case 'joined':
      return words.joined(nameList(change.names, language), change.total);
    case 'label':
      return words.label(change.word);
    case 'updated':
      return words.updated(formatTime(change.at, language));
  }
}
