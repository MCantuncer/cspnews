import { parseHotFeed, type HotFeed, type HotStory, type Language } from '@cspnews/core';

import { shortHeadline } from './monitor.js';

/**
 * Hot News in both languages, from an open machine-translation model rather than a paid API.
 *
 * The rules write no text, and the bulletins' newsroom (Verify and Write) is too slow for
 * breaking news, so the monitor has every headline and summary machine-translated into the
 * other language as it publishes. The translator sits behind one function, so the engine can be
 * swapped; the workflow runs `translate/translate.py` (Opus-MT) on its own runner.
 *
 * Breaking news is not checked by anyone, and a machine translation adds its own risk, so the
 * translation is always marked as one on the page, with the outlet's own words a tap away.
 * Anything that goes wrong leaves the feed as the outlets wrote it.
 */

export interface TranslationRequest {
  readonly text: string;
  readonly from: Language;
  readonly to: Language;
}

/** Translates every request, in order. May throw: the feed then stays untranslated. */
export type Translate = (requests: readonly TranslationRequest[]) => Promise<readonly string[]>;

const other = (language: Language): Language => (language === 'tr' ? 'en' : 'tr');

/**
 * Terms of art that stay as the field writes them (docs/publishing.md, "Terms of art stay as
 * they are"): a model would turn SpaceX's "chopsticks" into "yemek çubukları". Each is swapped
 * for a placeholder the model copies through (it even adds Turkish suffixes to it), and put
 * back afterwards. Matched as whole words, case-insensitively except for abbreviations (VAR is
 * not "var"); the original spelling is restored. TL is here because the model turns "45 milyon
 * TL" into "$45 million".
 */
export const KEEP_TERMS: readonly string[] = [
  'chopsticks',
  'Mechazilla',
  'Starship',
  'Super Heavy',
  'Falcon 9',
  'ChatGPT',
  'Copilot',
  'vibe coding',
  'jailbreak',
  'hat-trick',
  'VAR',
  'TL',
];

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const placeholder = (index: number) => `XKEEP${String(index)}X`;
const PLACEHOLDER = /XKEEP(\d+)X/gi;

/** The text with each kept term replaced by a placeholder, and the terms in placeholder order. */
export function protectTerms(
  text: string,
  terms: readonly string[] = KEEP_TERMS,
): { text: string; kept: string[] } {
  const kept: string[] = [];
  let out = text;
  for (const term of [...terms].sort((a, b) => b.length - a.length)) {
    const flags = term === term.toUpperCase() ? 'gu' : 'giu';
    const pattern = new RegExp(`(?<![\\p{L}\\p{N}])${escape(term)}(?![\\p{L}\\p{N}])`, flags);
    out = out.replace(pattern, (match) => {
      kept.push(match);
      return placeholder(kept.length - 1);
    });
  }
  return { text: out, kept };
}

/**
 * Puts the kept terms back. Undefined when the model lost or invented a placeholder, so a
 * mangled translation is never shown.
 */
export function restoreTerms(text: string, kept: readonly string[]): string | undefined {
  const used = new Set<number>();
  const found = [...text.matchAll(PLACEHOLDER)].map((match) => Number(match[1]));
  if (found.some((index) => kept[index] === undefined)) return undefined;
  for (const index of found) used.add(index);
  if (used.size !== kept.length) return undefined;
  return text.replace(PLACEHOLDER, (_match, index: string) => kept[Number(index)] ?? '');
}

const SAYS =
  /^(.+?),\s+((?:\p{Lu}[\p{L}.'’-]*\s+){0,3}\p{Lu}[\p{L}.'’-]*)\s+(says|said|claims|warns|confirms|announces)$/u;

/**
 * A headline in the shape the model reads best. Headline shorthand trips it up: "Ukraine
 * responsible for strikes, Zelenskyy says" comes out as a broken sentence, while "Zelenskyy
 * says Ukraine responsible for strikes" is translated well. Also drops what feeds wrap around a
 * text: "Live:", "– Europe live", a leading "..." or "haberi...".
 */
export function prepareForModel(text: string, from: Language): string {
  let out = text
    .replace(/^\s*(?:haberi\s*)?(?:\.{3}|…)\s*/iu, '')
    .replace(/^\s*live:\s*/i, '')
    .replace(/\s+[–—-]\s+[^–—-]*\blive$/i, '')
    .trim();
  if (from === 'en') {
    const says = SAYS.exec(out);
    if (says?.[1] && says[2] && says[3]) out = `${says[2]} ${says[3]} ${says[1]}`;
  }
  return out;
}

const key = ({ text, from, to }: TranslationRequest) => `${from}>${to}:${text}`;

/**
 * What an earlier feed already translated, so each pass only sends new text to the model: the
 * last published feed is the translation memory.
 */
export function translationMemory(feed: HotFeed | undefined): Map<string, string> {
  const memory = new Map<string, string>();
  for (const story of feed?.stories ?? []) {
    const translation = story.translation;
    if (translation) {
      const from = story.language;
      const to = translation.language;
      memory.set(key({ text: story.title, from, to }), translation.title);
      if (story.summary && translation.summary) {
        memory.set(key({ text: story.summary.text, from, to }), translation.summary);
      }
    }
    for (const source of story.sources) {
      const from = source.language ?? story.language;
      if (source.title && source.translatedTitle) {
        memory.set(key({ text: source.title, from, to: other(from) }), source.translatedTitle);
      }
    }
  }
  return memory;
}

function clip(text: string, max: number): string {
  return text.length <= max ? text : `${text.slice(0, max - 1).trimEnd()}…`;
}

/** The requests a story needs: its headline, its summary and each outlet's headline. */
function requestsFor(story: HotStory): TranslationRequest[] {
  const to = other(story.language);
  const requests: TranslationRequest[] = [{ text: story.title, from: story.language, to }];
  if (story.summary) requests.push({ text: story.summary.text, from: story.language, to });
  for (const source of story.sources) {
    const from = source.language ?? story.language;
    if (source.title) requests.push({ text: source.title, from, to: other(from) });
  }
  return requests;
}

export interface TranslateFeedOptions {
  readonly translate: Translate;
  /** The last published feed, whose translations are reused. */
  readonly previous?: HotFeed;
  readonly keepTerms?: readonly string[];
}

export interface TranslatedFeed {
  readonly feed: HotFeed;
  /** How many texts were sent to the model, and how many came from the earlier feed. */
  readonly translated: number;
  readonly reused: number;
  /** Set when the model failed; the feed is then as the outlets wrote it. */
  readonly error?: string;
}

/** The feed with every story also in the other language. */
export async function translateHotFeed(
  feed: HotFeed,
  { translate, previous, keepTerms = KEEP_TERMS }: TranslateFeedOptions,
): Promise<TranslatedFeed> {
  const memory = translationMemory(previous);
  const results = new Map<string, string>();
  const missing = new Map<string, TranslationRequest>();
  for (const request of feed.stories.flatMap(requestsFor)) {
    const known = memory.get(key(request));
    if (known) results.set(key(request), known);
    else missing.set(key(request), request);
  }
  const reused = results.size;

  let error: string | undefined;
  if (missing.size > 0) {
    const pending = [...missing.values()].map((request) => ({
      request,
      ...protectTerms(prepareForModel(request.text, request.from), keepTerms),
    }));
    try {
      const answers = await translate(
        pending.map(({ request, text }) => ({ text, from: request.from, to: request.to })),
      );
      if (answers.length !== pending.length) throw new Error('Wrong number of translations');
      pending.forEach(({ request, kept }, index) => {
        const answer = answers[index]?.replace(/\s+/g, ' ').trim();
        const text = answer ? restoreTerms(answer, kept) : undefined;
        if (text && text !== request.text) results.set(key(request), text);
      });
    } catch (cause) {
      error = cause instanceof Error ? cause.message : String(cause);
    }
  }

  const stories = feed.stories.map((story): HotStory => {
    const to = other(story.language);
    const found = (text: string, from: Language = story.language) =>
      results.get(key({ text, from, to: other(from) }));
    const title = found(story.title);
    const summary = story.summary && found(story.summary.text);
    const sources = story.sources.map((source) => {
      const from = source.language ?? story.language;
      const translatedTitle = source.title && found(source.title, from);
      return translatedTitle ? { ...source, translatedTitle: clip(translatedTitle, 200) } : source;
    });
    return {
      ...story,
      sources,
      ...(title
        ? {
            translation: {
              language: to,
              shortTitle: shortHeadline(title) || clip(title, 60),
              title: clip(title, 160),
              ...(summary ? { summary: clip(summary, 420) } : {}),
            },
          }
        : {}),
    };
  });
  return {
    feed: parseHotFeed({ ...feed, stories }),
    translated: missing.size,
    reused,
    ...(error ? { error } : {}),
  };
}
