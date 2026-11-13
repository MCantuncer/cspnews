import {
  TRANSFER_STAGES,
  lightIn,
  rumourIn,
  transferIn,
  type Language,
  type LocalLightStory,
  type LocalRumour,
  type LocalTransferMove,
  type LightKind,
  type TransferLeague,
  type TransferStage,
} from '@cspnews/core';

import { bulletinPath, type PublishedBulletin } from './bulletins.js';
import type { InterfaceLanguage } from './evidence.js';
import type { IconName } from './icons.js';
import { TIER_RANK, sourceName, sourceTier } from './sources.js';

/**
 * The parts of a bulletin outside the news sections (docs/design/decisions/and-finally.md and
 * transfers.md): the light close, "And finally", and football Transfers.
 */

/** The anchor of the And finally fold, so other screens can open it. */
export const AND_FINALLY_ID = 'and-finally';

export interface LocalAndFinally {
  readonly light: readonly LocalLightStory[];
  readonly rumours: readonly LocalRumour[];
  readonly count: number;
}

/** And finally in the reader's language, or nothing when the bulletin has none. */
export function andFinallyIn(
  published: PublishedBulletin,
  language: Language,
): LocalAndFinally | undefined {
  const close = published.bulletin.andFinally;
  if (!close) return undefined;
  const light = close.light.map((story) => lightIn(story, language));
  const rumours = close.rumours.map((rumour) => rumourIn(rumour, language));
  return { light, rumours, count: light.length + rumours.length };
}

/** The bulletin's transfer moves in the reader's language, furthest along first. */
export function transfersIn(published: PublishedBulletin, language: Language): LocalTransferMove[] {
  return (published.bulletin.transfers ?? [])
    .map((move) => transferIn(move, language))
    .sort((a, b) => stageNumber(b.stage) - stageNumber(a.stage));
}

/** 0 for talk up to 3 for signed. */
export function stageNumber(stage: TransferStage): number {
  return TRANSFER_STAGES.indexOf(stage);
}

/** The URL of a move's page: `/2026-11-13/evening/transfers/<move id>`. */
export function transferPath(
  published: PublishedBulletin,
  move: { id: string },
  lang: InterfaceLanguage = 'en',
): string {
  return `${bulletinPath(published, lang)}/transfers/${encodeURIComponent(move.id)}`;
}

/** Outlets that report a move, each once at the furthest stage it reported, strongest first. */
export function transferReporters(move: LocalTransferMove) {
  const furthest = new Map<string, LocalTransferMove['reports'][number]>();
  for (const report of move.reports) {
    const seen = furthest.get(report.sourceId);
    if (!seen || stageNumber(report.stage) > stageNumber(seen.stage)) {
      furthest.set(report.sourceId, report);
    }
  }
  return [...furthest.values()]
    .map((report) => ({
      ...report,
      name: sourceName(report.sourceId),
      tier: sourceTier(report.sourceId),
    }))
    .sort(
      (a, b) =>
        TIER_RANK[a.tier] - TIER_RANK[b.tier] ||
        stageNumber(b.stage) - stageNumber(a.stage) ||
        a.on.localeCompare(b.on),
    );
}

const WORDS = {
  en: {
    andFinally: 'And finally',
    count: (n: number) => (n === 1 ? '1 light story' : `${String(n)} light stories`),
    note: 'The lighter side of today. Facts stay checked; the jokes are ours.',
    backstage: 'Backstage talk',
    backstageNote: 'Not confirmed. We name who is saying it.',
    heardFrom: 'Heard from',
    transfers: 'Transfers',
    stages: { talk: 'Talk', talks: 'Talks', agreed: 'Agreed', signed: 'Signed' },
    outlets: (n: number) => (n === 1 ? '1 outlet' : `${String(n)} outlets`),
    clubConfirmed: 'Club confirmed',
    stageOf: (stage: string) => `Stage: ${stage}`,
    who: 'Who is saying it',
    whoNote: 'Agencies and established outlets first.',
    reported: (stage: string, day: string) => `${stage}, ${day}`,
    signedWhen: 'What would make it signed',
    kinds: {
      screen: 'Screen',
      music: 'Music',
      people: 'People',
      odd: 'Odd news',
      animals: 'Animals',
      town: 'Around town',
    },
    rumour: 'Rumour',
    lightSetting: 'Light stories',
    lightHint: '“And finally” at the end of each bulletin.',
    leagues: {
      'super-lig': 'Süper Lig',
      'premier-league': 'Premier League',
      laliga: 'LaLiga',
      'serie-a': 'Serie A',
      bundesliga: 'Bundesliga',
      'ligue-1': 'Ligue 1',
      eredivisie: 'Eredivisie',
      'primeira-liga': 'Primeira Liga',
    },
  },
  tr: {
    andFinally: 'Biraz da magazin',
    count: (n: number) => `${String(n)} hafif haber`,
    note: 'Günün hafif tarafı. Bilgiler yine doğrulanır, espriler bizden.',
    backstage: 'Kulis',
    backstageNote: 'Doğrulanmadı. Kimin söylediğini yazıyoruz.',
    heardFrom: 'Kaynak:',
    transfers: 'Transferler',
    stages: { talk: 'Söylenti', talks: 'Görüşme', agreed: 'Anlaşma', signed: 'İmza' },
    outlets: (n: number) => `${String(n)} kaynak`,
    clubConfirmed: 'Kulüp açıkladı',
    stageOf: (stage: string) => `Aşama: ${stage}`,
    who: 'Kim söylüyor',
    whoNote: 'Önce ajanslar ve köklü yayın organları.',
    reported: (stage: string, day: string) => `${stage}, ${day}`,
    signedWhen: 'İmza aşamasına ne geçirir',
    kinds: {
      screen: 'Ekran',
      music: 'Müzik',
      people: 'Ünlüler',
      odd: 'İlginç',
      animals: 'Hayvanlar',
      town: 'Şehirden',
    },
    rumour: 'Söylenti',
    lightSetting: 'Hafif haberler',
    lightHint: 'Her bültenin sonunda “Biraz da magazin”.',
    leagues: {
      'super-lig': 'Süper Lig',
      'premier-league': 'Premier Lig',
      laliga: 'LaLiga',
      'serie-a': 'Serie A',
      bundesliga: 'Bundesliga',
      'ligue-1': 'Ligue 1',
      eredivisie: 'Eredivisie',
      'primeira-liga': 'Primeira Liga',
    },
  },
} as const;

export type ExtrasWords = (typeof WORDS)[InterfaceLanguage];

export function extrasWords(lang: InterfaceLanguage): ExtrasWords {
  return WORDS[lang];
}

/** Each kind of light story has a Stations icon of its own, for its badge. */
export const LIGHT_KIND_ICON: Readonly<Record<LightKind, IconName>> = {
  screen: 'screen',
  music: 'music',
  people: 'people',
  odd: 'odd',
  animals: 'animals',
  town: 'town',
};

export function kindWord(kind: LightKind, lang: InterfaceLanguage): string {
  return WORDS[lang].kinds[kind];
}

export function stageWord(stage: TransferStage, lang: InterfaceLanguage): string {
  return WORDS[lang].stages[stage];
}

export function leagueName(league: TransferLeague, lang: InterfaceLanguage): string {
  return WORDS[lang].leagues[league];
}
