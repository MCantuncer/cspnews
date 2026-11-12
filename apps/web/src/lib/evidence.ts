import { EVIDENCE_LABEL_VALUES, type Language } from '@cspnews/core';
import type { IconName } from './icons.js';

/** The four evidence labels a story can carry (docs/design/decisions/evidence.md). */
export type EvidenceLabel = (typeof EVIDENCE_LABEL_VALUES)[number];

/** The reader's language: the interface and the story version both follow it. */
export type InterfaceLanguage = Language;

interface EvidenceStyle {
  /** The Stations glyph that marks the label. */
  readonly icon: IconName;
  /** The colour token, as a CSS custom property name. */
  readonly token: `--${string}`;
  /** The word shown beside the glyph, per interface language. */
  readonly word: Readonly<Record<InterfaceLanguage, string>>;
}

export const EVIDENCE: Readonly<Record<EvidenceLabel, EvidenceStyle>> = {
  confirmed: { icon: 'confirmed', token: '--conf', word: { en: 'Confirmed', tr: 'Doğrulandı' } },
  reported: { icon: 'reported', token: '--rep', word: { en: 'Reported', tr: 'Bildirildi' } },
  'single-source': {
    icon: 'single-source',
    token: '--single',
    word: { en: 'Single source', tr: 'Tek kaynak' },
  },
  disputed: { icon: 'disputed', token: '--disp', word: { en: 'Disputed', tr: 'Tartışmalı' } },
};

/** The word for an evidence label in the reader's interface language. */
export function evidenceWord(label: EvidenceLabel, language: InterfaceLanguage = 'en'): string {
  return EVIDENCE[label].word[language];
}
