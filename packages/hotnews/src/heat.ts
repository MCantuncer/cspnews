import type { Source } from '@cspnews/core';
import { words, type Story } from '@cspnews/grouping';
import { canAlert, evidenceFor, type Evidence } from '@cspnews/verify';

/**
 * Words that mark breaking events, by language. A word ending in `*` matches any word that
 * starts with it ("deprem*" matches "depremde"); any other word must match a whole word, so
 * "sel" (flood) never matches "Selahattin" and "dead" never matches "deadline". A phrase matches
 * its words in a row.
 */
const URGENT_WORDS: Readonly<Record<string, readonly string[]>> = {
  tr: [
    'son dakika',
    'deprem*',
    'artçı*',
    'tsunami*',
    'patlama*',
    'saldırı*',
    'silahlı*',
    'bombalı*',
    'füze*',
    'yangın*',
    'sel',
    'selde',
    'heyelan*',
    'çığ',
    'kasırga*',
    'fırtına*',
    'hayatını kaybet*',
    'öldü*',
    'ölü',
    'can kaybı*',
    'yaralı*',
    'yaraland*',
    'enkaz*',
    'tahliye*',
    'rehine*',
    'çatışma*',
    'suikast*',
    'darbe girişimi*',
    'istifa*',
    'gözaltı*',
    'tutuklan*',
    'olağanüstü hal*',
    'ohal',
    'kırmızı alarm*',
  ],
  en: [
    'breaking',
    'earthquake*',
    'aftershock*',
    'tsunami*',
    'explosion*',
    'blast*',
    'attack*',
    'airstrike*',
    'missile*',
    'drone strike*',
    'shooting*',
    'gunman',
    'gunmen',
    'wildfire*',
    'flood*',
    'landslide*',
    'hurricane*',
    'typhoon*',
    'cyclone*',
    'killed',
    'kills',
    'dead',
    'dies',
    'death toll*',
    'injured',
    'evacuat*',
    'hostage*',
    'coup',
    'assassinat*',
    'resign*',
    'arrested',
    'emergency',
    'crash',
    'crashes',
    'collapse*',
  ],
};

/**
 * Earthquake words. Turkish outlets write about small quakes all day, so these words alone
 * don't make a headline urgent: it must also give a magnitude of at least
 * MIN_QUAKE_MAGNITUDE, or carry another urgent word ("yaralı", "enkaz", "son dakika").
 */
const QUAKE_WORDS: Readonly<Record<string, readonly string[]>> = {
  tr: ['deprem*', 'artçı*', 'sarsıntı*'],
  en: ['earthquake*', 'aftershock*', 'quake*', 'tremor*'],
};

/** Words that say a quake did harm; a quake story with one of them is news at any size. */
const HARM_WORDS: Readonly<Record<string, readonly string[]>> = {
  tr: [
    'yaralı*',
    'yaraland*',
    'öldü*',
    'ölü',
    'hayatını kaybet*',
    'can kaybı*',
    'hasar*',
    'yıkıl*',
    'çöktü*',
    'enkaz*',
    'tsunami*',
  ],
  en: ['injur*', 'killed', 'dead', 'death toll*', 'damage*', 'collapse*', 'tsunami*'],
};

/**
 * Figures of speech that use an urgent word ("Trabzonspor fırtına gibi esiyor": storms
 * through the league). They are removed before a headline is matched.
 */
const IDIOMS: Readonly<Record<string, readonly string[]>> = {
  tr: ['fırtına gibi', 'gol fırtınası', 'tepki fırtınası', 'gol yağmuru', 'bomba gibi'],
  en: ['storm of criticism', 'firestorm'],
};

/**
 * Headlines of pages written to answer searches rather than report an event: "Az önce deprem
 * nerede oldu?", "AFAD son depremler 24 Kasım 2026", "Maç hangi kanalda?". Outlets publish
 * them every day, so several outlets "agree" on them without anything having happened.
 * Matched over a headline's words, like the urgent words.
 */
const SEARCH_PAGE_WORDS: Readonly<Record<string, readonly string[]>> = {
  tr: [
    'mi oldu',
    'mı oldu',
    'nerede oldu',
    'nerede deprem',
    'son depremler*',
    'deprem listesi*',
    'il il',
    'ne zaman',
    'hangi kanalda',
    'canlı izle*',
    'kimdir',
    'nedir',
    'neden oldu',
  ],
  en: [
    'was there an earthquake',
    'earthquake today',
    'latest earthquakes',
    'where to watch',
    'how to watch',
    'what time',
    'what we know so far about',
  ],
};

/** A full date with its year, "24 Kasım 2026" or "24 November 2026": a daily page's stamp. */
const DATED_PAGE =
  /\b\d{1,2} (?:ocak|şubat|mart|nisan|mayıs|haziran|temmuz|ağustos|eylül|ekim|kasım|aralık|january|february|march|april|may|june|july|august|september|october|november|december) \d{4}\b/u;

/** Quakes smaller than this are left to the bulletins, unless they did harm. */
export const MIN_QUAKE_MAGNITUDE = 4.5;

/** Word lists as patterns over a title's words, separated and wrapped by single spaces. */
function patterns(
  lists: Readonly<Record<string, readonly string[]>>,
): Readonly<Record<string, readonly RegExp[]>> {
  return Object.fromEntries(
    Object.entries(lists).map(([language, list]) => [
      language,
      list.map((word) => {
        const prefix = word.endsWith('*');
        const body = (prefix ? word.slice(0, -1) : word).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        return new RegExp(` ${body}${prefix ? '' : ' '}`, 'u');
      }),
    ]),
  );
}

const URGENT_PATTERNS = patterns(URGENT_WORDS);
const QUAKE_PATTERNS = patterns(QUAKE_WORDS);
const HARM_PATTERNS = patterns(HARM_WORDS);
const IDIOM_PATTERNS = patterns(IDIOMS);
const SEARCH_PAGE_PATTERNS = patterns(SEARCH_PAGE_WORDS);

/** A text's words, separated and wrapped by single spaces, without figures of speech. */
function wordText(text: string, language: string): string {
  let joined = ` ${words(text, language).join(' ')} `;
  for (const idiom of IDIOM_PATTERNS[language] ?? []) joined = joined.replace(idiom, ' ');
  return joined;
}

const matches = (
  text: string,
  list: Readonly<Record<string, readonly RegExp[]>>,
  language: string,
) => (list[language] ?? []).some((pattern) => pattern.test(text));

/**
 * The largest earthquake magnitude a text gives: "5,8 büyüklüğünde", "M4.6", "Mw 6.1",
 * "magnitude 6.2", "a 5.1-magnitude quake". Undefined when it gives none.
 */
export function magnitudeIn(text: string): number | undefined {
  const lower = text.toLocaleLowerCase('tr-TR');
  const found = [
    ...lower.matchAll(
      /(\d(?:[.,]\d{1,2})?)\s*[-‐‑]?\s*(?:büyüklüğ|şiddetinde|magnitude|richter)/gu,
    ),
    ...lower.matchAll(/(?:magnitude(?: of)?|\bm[wl]?)\s?[:=]?\s?(\d[.,]\d{1,2})\b/gu),
  ].map((match) => Number((match[1] ?? '').replace(',', '.')));
  const valid = found.filter((value) => value > 0 && value < 10);
  return valid.length > 0 ? Math.max(...valid) : undefined;
}

/** True when a headline is a search page ("Deprem mi oldu?"), not a report of an event. */
export function isSearchPageTitle(title: string, language: string): boolean {
  if (title.includes('?')) return true;
  const text = wordText(title, language);
  return DATED_PAGE.test(text) || matches(text, SEARCH_PAGE_PATTERNS, language);
}

/** Why a story was or wasn't promoted to Hot News; shown on the Monitor page (US-40). */
export type HeatReason =
  | 'promoted'
  | 'below-threshold'
  | 'single-source'
  | 'disputed'
  | 'already-alerted'
  | 'too-old'
  | 'search-page'
  | 'minor-quake';

export interface HeatComponents {
  /** Independent owners with an article in the last `windowMinutes`. */
  readonly recentOwners: number;
  /** Independent owners overall. */
  readonly owners: number;
  readonly urgent: boolean;
  readonly wire: boolean;
}

export interface HeatAssessment {
  readonly storyId: string;
  readonly title: string;
  /** Heat now. */
  readonly heat: number;
  /** The highest heat the story reached; promotion is decided on this. */
  readonly peakHeat: number;
  readonly components: HeatComponents;
  readonly evidence: Evidence;
  readonly promoted: boolean;
  readonly reason: HeatReason;
}

export interface HeatOptions {
  readonly now: Date;
  /** Story ids already sent as Hot News; they are never sent twice. */
  readonly alreadyAlerted?: ReadonlySet<string>;
  /** Heat needed to promote a story with an urgent headline. */
  readonly threshold?: number;
  /** Heat needed to promote a story without one. */
  readonly calmThreshold?: number;
  /** How recent an article must be to count towards velocity. */
  readonly windowMinutes?: number;
  /** Stories first seen longer ago than this are not breaking any more. */
  readonly maxAgeHours?: number;
}

export const DEFAULT_HEAT_THRESHOLD = 8;
/**
 * Heat needed when no headline carries an urgent word: four outlets with different owners
 * within the hour. Three outlets on a party meeting or a football quote is a busy news day,
 * not breaking news.
 */
export const DEFAULT_CALM_THRESHOLD = 12;
/** A story stays Hot News this long after it was first seen; the next bulletin takes it on. */
export const DEFAULT_MAX_AGE_HOURS = 6;

/**
 * True when a headline carries an urgent word in its own language. A search page never is,
 * and an earthquake headline is only when it gives a magnitude of MIN_QUAKE_MAGNITUDE or more,
 * or carries another urgent word.
 */
export function isUrgentTitle(title: string, language: string): boolean {
  if (isSearchPageTitle(title, language)) return false;
  const text = wordText(title, language);
  const urgent = (URGENT_PATTERNS[language] ?? []).filter((pattern) => pattern.test(text));
  if (urgent.length === 0) return false;
  const quake = new Set((QUAKE_PATTERNS[language] ?? []).map(String));
  if (urgent.some((pattern) => !quake.has(String(pattern)))) return true;
  return (magnitudeIn(title) ?? 0) >= MIN_QUAKE_MAGNITUDE;
}

/**
 * A story whose headlines are mostly search pages: the daily "Deprem mi oldu?" pages of
 * several outlets group together, but nothing happened.
 */
function isSearchPageStory(story: Story): boolean {
  const titles = story.articles.filter(({ copyOf }) => !copyOf);
  const pages = titles.filter(({ article }) => isSearchPageTitle(article.title, article.language));
  return pages.length * 2 >= titles.length;
}

/**
 * A story about a quake smaller than MIN_QUAKE_MAGNITUDE that did no harm: some headline is
 * about a quake, the largest magnitude its headlines and summaries give is below the minimum,
 * and no headline tells of harm. A quake story that gives no magnitude at all is judged like
 * any other story, by its heat without the urgent bonus.
 */
function isMinorQuakeStory(story: Story): boolean {
  const titles = story.articles.map(({ article }) => ({
    text: wordText(article.title, article.language),
    language: article.language,
  }));
  if (!titles.some(({ text, language }) => matches(text, QUAKE_PATTERNS, language))) return false;
  if (titles.some(({ text, language }) => matches(text, HARM_PATTERNS, language))) return false;
  const magnitudes = story.articles.flatMap(
    ({ article }) => magnitudeIn(`${article.title} ${article.summary}`) ?? [],
  );
  return magnitudes.length > 0 && Math.max(...magnitudes) < MIN_QUAKE_MAGNITUDE;
}

function isUrgent(story: Story, at: Date): boolean {
  return story.articles.some(
    ({ article }) => article.publishedAt <= at && isUrgentTitle(article.title, article.language),
  );
}

/**
 * Heat: how strongly a story looks like breaking news at a moment `now`, from rules only and
 * from the articles published by then.
 *
 *   heat = 2 × owners in the last hour + owners overall + 3 if urgent + 1 if a wire has it
 *
 * Three outlets with different owners on an earthquake within the hour scores 13; two
 * outlets on a scheduled rate decision score about 7, which stays in the next bulletin.
 */
export function heatOf(
  story: Story,
  evidence: Evidence,
  sources: ReadonlyMap<string, Source>,
  now: Date,
  windowMinutes = 60,
): { heat: number; components: HeatComponents } {
  const confirmingOwners = new Set(
    evidence.confirmingSourceIds.flatMap((id) => sources.get(id)?.ownerGroup ?? []),
  );
  const since = now.getTime() - windowMinutes * 60_000;
  const owners = new Set<string>();
  const recent = new Set<string>();
  let wire = false;

  for (const { article, copyOf } of story.articles) {
    const source = sources.get(article.sourceId);
    // Only reporting that counts as confirmation adds heat: no copies, aggregators or checks.
    if (
      !source ||
      copyOf ||
      source.tier === 'low' ||
      !confirmingOwners.has(source.ownerGroup) ||
      article.publishedAt > now
    ) {
      continue;
    }
    owners.add(source.ownerGroup);
    if (source.tier === 'wire') {
      wire = true;
    }
    if (article.publishedAt.getTime() >= since) {
      recent.add(source.ownerGroup);
    }
  }

  const components: HeatComponents = {
    recentOwners: recent.size,
    owners: owners.size,
    urgent: isUrgent(story, now),
    wire,
  };
  const heat =
    2 * components.recentOwners +
    components.owners +
    (components.urgent ? 3 : 0) +
    (components.wire ? 1 : 0);
  return { heat, components };
}

/**
 * The highest heat a story has reached so far: its heat as each article arrived, and now.
 * Heat falls once outlets stop adding reports, but a story that was breaking stays Hot News
 * for `maxAgeHours`, so a reader who arrives an hour later still finds it. Computed from the
 * articles alone, so the monitor needs no memory of earlier runs.
 */
export function peakHeatOf(
  story: Story,
  evidence: Evidence,
  sources: ReadonlyMap<string, Source>,
  now: Date,
  windowMinutes = 60,
): number {
  const moments = [
    now,
    ...story.articles.map(({ article }) => article.publishedAt).filter((at) => at <= now),
  ];
  return Math.max(...moments.map((at) => heatOf(story, evidence, sources, at, windowMinutes).heat));
}

/**
 * Scores every story and decides which become Hot News. Every story gets a reason, so the
 * Monitor page can show why something was or wasn't promoted. Hottest first.
 */
export function assessHotNews(
  stories: readonly Story[],
  sources: ReadonlyMap<string, Source>,
  options: HeatOptions,
): HeatAssessment[] {
  const {
    now,
    alreadyAlerted = new Set<string>(),
    threshold = DEFAULT_HEAT_THRESHOLD,
    calmThreshold = DEFAULT_CALM_THRESHOLD,
    windowMinutes = 60,
    maxAgeHours = DEFAULT_MAX_AGE_HOURS,
  } = options;

  return stories
    .map((story): HeatAssessment => {
      const evidence = evidenceFor(story, sources, { now });
      const { heat, components } = heatOf(story, evidence, sources, now, windowMinutes);
      const peakHeat = Math.max(heat, peakHeatOf(story, evidence, sources, now, windowMinutes));
      const ageHours = (now.getTime() - story.firstSeenAt.getTime()) / 3_600_000;

      let reason: HeatReason;
      if (alreadyAlerted.has(story.id)) {
        reason = 'already-alerted';
      } else if (evidence.label === 'disputed') {
        reason = 'disputed';
      } else if (!canAlert(evidence)) {
        reason = 'single-source';
      } else if (ageHours > maxAgeHours) {
        reason = 'too-old';
      } else if (isSearchPageStory(story)) {
        reason = 'search-page';
      } else if (isMinorQuakeStory(story)) {
        reason = 'minor-quake';
      } else if (peakHeat < (isUrgent(story, now) ? threshold : calmThreshold)) {
        reason = 'below-threshold';
      } else {
        reason = 'promoted';
      }

      return {
        storyId: story.id,
        title: story.articles[0]?.article.title ?? '',
        heat,
        peakHeat,
        components,
        evidence,
        promoted: reason === 'promoted',
        reason,
      };
    })
    .sort((a, b) => b.heat - a.heat);
}
