import { SOURCES } from '@cspnews/config';
import type { Section, Source, StorySource } from '@cspnews/core';

import type { EvidenceLabel, InterfaceLanguage } from './evidence.js';

/**
 * The evidence drawer's camp map (docs/design/system.md, "Evidence drawer"): one row per
 * editorial camp, each outlet by name with a three-step reliability meter. For Türkiye stories
 * the political camps always show, so an empty camp is visible as an empty slot; elsewhere only
 * camps with outlets show.
 */
export type CampId =
  'government' | 'mainstream' | 'opposition' | 'independent' | 'international' | 'specialist';

const CAMP_OF: Record<Source['camp'], CampId> = {
  'pro-government': 'government',
  'state-wire': 'government',
  mainstream: 'mainstream',
  opposition: 'opposition',
  independent: 'independent',
  international: 'international',
  specialist: 'specialist',
};

const ORDER: readonly CampId[] = [
  'government',
  'mainstream',
  'opposition',
  'independent',
  'international',
  'specialist',
];

const ALWAYS_FOR_TURKEY: ReadonlySet<CampId> = new Set([
  'government',
  'mainstream',
  'opposition',
  'independent',
  'international',
]);

const CAMP_NAMES: Record<InterfaceLanguage, Record<CampId, string>> = {
  en: {
    government: 'Government-aligned',
    mainstream: 'Mainstream',
    opposition: 'Opposition',
    independent: 'Independent',
    international: 'International',
    specialist: 'Specialist press',
  },
  tr: {
    government: 'Hükümete yakın',
    mainstream: 'Ana akım',
    opposition: 'Muhalif',
    independent: 'Bağımsız',
    international: 'Uluslararası',
    specialist: 'Uzman yayınlar',
  },
};

/** Reliability on a three-step meter: wires 3, established outlets 2, the rest 1. */
export function reliabilitySteps(tier: Source['tier']): 1 | 2 | 3 {
  if (tier === 'wire') return 3;
  if (tier === 'established') return 2;
  return 1;
}

export interface CampOutlet {
  readonly sourceId: string;
  readonly name: string;
  readonly url: string;
  readonly steps: 1 | 2 | 3;
  /** False when the outlet only republished another outlet's text: shown, never counted. */
  readonly confirms: boolean;
}

export interface CampRow {
  readonly camp: CampId;
  readonly name: string;
  /** Outlets that confirm the story independently. */
  readonly count: number;
  readonly outlets: readonly CampOutlet[];
}

const REGISTRY = new Map(SOURCES.map((source) => [source.id, source]));

export function campMap(
  sources: readonly StorySource[],
  section: Section,
  language: InterfaceLanguage,
  registry: ReadonlyMap<string, Source> = REGISTRY,
): CampRow[] {
  const rows = new Map<CampId, CampOutlet[]>();
  for (const story of sources) {
    const source = registry.get(story.sourceId);
    if (!source) continue;
    const camp = CAMP_OF[source.camp];
    const list = rows.get(camp) ?? [];
    if (list.some((outlet) => outlet.sourceId === source.id)) continue;
    list.push({
      sourceId: source.id,
      name: source.name,
      url: story.url,
      steps: reliabilitySteps(source.tier),
      confirms: story.confirms,
    });
    rows.set(camp, list);
  }
  return ORDER.filter(
    (camp) => rows.has(camp) || (section === 'turkey' && ALWAYS_FOR_TURKEY.has(camp)),
  ).map((camp) => {
    const outlets = rows.get(camp) ?? [];
    return {
      camp,
      name: CAMP_NAMES[language][camp],
      count: outlets.filter((outlet) => outlet.confirms).length,
      outlets,
    };
  });
}

const MEANING: Record<InterfaceLanguage, Record<EvidenceLabel, string>> = {
  en: {
    confirmed:
      'At least two independent outlets, including a wire, an established outlet or the primary source. For Türkiye stories, not all from one side.',
    reported: 'Two or more independent outlets report it, but not enough yet to confirm it.',
    'single-source': 'Only one outlet group has reported it so far.',
    disputed: 'A fact-checker has challenged what is being reported.',
  },
  tr: {
    confirmed:
      'En az iki bağımsız kaynak; aralarında bir ajans, köklü bir yayın ya da birincil kaynak var. Türkiye haberlerinde hepsi tek bir kesimden değil.',
    reported:
      'İki ya da daha fazla bağımsız kaynak bildiriyor, ancak doğrulamak için henüz yeterli değil.',
    'single-source': 'Şimdilik yalnızca tek bir yayın grubu bildirdi.',
    disputed: 'Bir doğruluk kontrolü kuruluşu bildirilenlere itiraz etti.',
  },
};

/** What a label means, in one or two plain sentences. */
export function labelMeaning(label: EvidenceLabel, language: InterfaceLanguage): string {
  return MEANING[language][label];
}
