import {
  istanbulDateOf,
  SECTIONS,
  type Bulletin,
  type Language,
  type Section,
} from '@cspnews/core';

/**
 * The message that tells a Telegram channel a bulletin is out (docs/design/decisions/
 * announcements.md): the bulletin's name and time, every story's short title under its
 * section, and one link, which Telegram turns into the bulletin's share picture. The words are
 * the site's own, in the channel's language.
 */
const WORDS: Record<
  Language,
  {
    bulletin: Record<string, string>;
    section: Record<Section, string>;
    stories: (n: number) => string;
    brief: string;
    locale: string;
  }
> = {
  en: {
    bulletin: {
      morning: 'Morning bulletin',
      midday: 'Midday bulletin',
      evening: 'Evening bulletin',
      late: 'Late bulletin',
    },
    section: { turkey: 'Türkiye', tech: 'Tech and AI', world: 'Around the World' },
    stories: (n) => `${String(n)} ${n === 1 ? 'story' : 'stories'}`,
    brief: 'In one minute',
    locale: 'en-GB',
  },
  tr: {
    bulletin: {
      morning: 'Sabah bülteni',
      midday: 'Öğle bülteni',
      evening: 'Akşam bülteni',
      late: 'Gece bülteni',
    },
    section: { turkey: 'Türkiye', tech: 'Teknoloji ve yapay zekâ', world: 'Dünya' },
    stories: (n) => `${String(n)} haber`,
    brief: 'Bir dakikada',
    locale: 'tr-TR',
  },
};

const escapeHtml = (text: string) =>
  text.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');

export interface Announcement {
  /** HTML for Telegram's `parse_mode: HTML`. */
  readonly text: string;
  /** The page whose preview Telegram shows. */
  readonly previewUrl: string;
}

/** The address of the bulletin's page: `/2026-11-15/morning`, under `/tr` in Turkish. */
export function bulletinUrl(
  origin: string,
  bulletin: Pick<Bulletin, 'slot' | 'publishAt'>,
  language: Language,
  suffix = '',
): string {
  const { year, month, day } = istanbulDateOf(new Date(bulletin.publishAt));
  const pad = (value: number) => String(value).padStart(2, '0');
  const date = `${String(year)}-${pad(month)}-${pad(day)}`;
  const path = `/${date}/${bulletin.slot}${suffix}`;
  return `${origin.replace(/\/+$/, '')}${language === 'tr' ? `/tr${path}` : path}`;
}

export function announcement(bulletin: Bulletin, language: Language, origin: string): Announcement {
  const words = WORDS[language];
  const at = new Date(bulletin.publishAt);
  const when = new Intl.DateTimeFormat(words.locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
    timeZone: 'Europe/Istanbul',
  }).format(at);
  const name = words.bulletin[bulletin.slot] ?? bulletin.slot;

  const groups = SECTIONS.flatMap((section) => {
    const titles = bulletin.stories
      .filter((story) => story.section === section)
      .map((story) => `• ${escapeHtml(story.versions[language].shortTitle)}`);
    return titles.length > 0 ? [`<b>${words.section[section]}</b>\n${titles.join('\n')}`] : [];
  });

  const previewUrl = bulletinUrl(origin, bulletin, language);
  const text = [
    `<b>${escapeHtml(name)}</b>`,
    `${escapeHtml(when)}. ${words.stories(bulletin.stories.length)}.`,
    ...groups,
    `${words.brief}: ${bulletinUrl(origin, bulletin, language, '/brief')}`,
    previewUrl,
  ].join('\n\n');
  return { text, previewUrl };
}
