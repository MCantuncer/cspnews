import { describe, expect, it } from 'vitest';

import {
  AndFinallySchema,
  TransferMoveSchema,
  lightIn,
  rumourIn,
  transferIn,
  type LightStory,
  type Rumour,
  type TransferMove,
} from './extras.js';

/** A copy of `value` without `key`, to test a missing field. */
const without = <T extends object>(value: T, key: keyof T) =>
  Object.fromEntries(Object.entries(value).filter(([name]) => name !== key));

const LIGHT: LightStory = {
  id: 'light-ferry-cat',
  label: 'confirmed',
  versions: {
    en: {
      title: 'Kadıköy ferry cat given an honorary crew badge',
      gist: 'The city ferry operator made the cat that rides the morning boat an honorary crew member.',
      aside: 'She has not commented, but she was seen inspecting the deck.',
    },
    tr: {
      title: 'Kadıköy vapurunun kedisine onursal mürettebat kartı',
      gist: 'Şehir Hatları, sabah vapurunda yolculuk eden kediyi onursal mürettebat yaptı.',
      aside: 'Kendisi açıklama yapmadı, ama güverteyi denetlerken görüldü.',
    },
  },
  sources: [{ sourceId: 'ntv', url: 'https://ntv.example/kedi' }],
};

const RUMOUR: Rumour = {
  id: 'rumour-drama-ends',
  versions: {
    en: { title: 'Hit TV drama said to end after this season' },
    tr: { title: 'Sevilen dizinin bu sezon final yapacağı konuşuluyor' },
  },
  heardFrom: { sourceId: 'onedio', url: 'https://onedio.example/dizi' },
};

const MOVE: TransferMove = {
  id: 'move-napoli-fenerbahce',
  league: 'super-lig',
  from: 'Napoli',
  to: 'Fenerbahçe',
  stage: 'agreed',
  clubConfirmed: false,
  steps: [
    { stage: 'talk', on: '2026-11-02' },
    { stage: 'talks', on: '2026-11-08' },
    { stage: 'agreed', on: '2026-11-13' },
  ],
  reports: [
    { sourceId: 'fanatik', url: 'https://fanatik.example/a', stage: 'talks', on: '2026-11-08' },
  ],
  versions: {
    en: {
      shortTitle: 'Fenerbahçe agree fee for Napoli midfielder',
      title: 'Fenerbahçe agree a fee with Napoli for their midfielder',
      now: 'The clubs have agreed a fee. The medical and signing are still to come.',
      signedWhen: 'A club statement or the signing photo.',
      facts: [{ value: '€18m', label: 'Fee, plus €2m in add-ons' }],
    },
    tr: {
      shortTitle: 'Fenerbahçe, Napoli’li orta saha için anlaştı',
      title: 'Fenerbahçe, Napoli ile orta sahası için bonservis konusunda anlaştı',
      now: 'Kulüpler bonservis üzerinde anlaştı. Sağlık kontrolü ve imza bekleniyor.',
      signedWhen: 'Kulüp açıklaması ya da imza fotoğrafı.',
      facts: [{ value: '18 milyon €', label: 'Bonservis, artı 2 milyon € bonus' }],
    },
  },
  updatedAt: '2026-11-13T18:00:00+03:00',
};

describe('AndFinallySchema', () => {
  it('accepts light stories and rumours', () => {
    expect(AndFinallySchema.safeParse({ light: [LIGHT], rumours: [RUMOUR] }).success).toBe(true);
  });

  it('holds 1 to 4 items in all', () => {
    expect(AndFinallySchema.safeParse({ light: [], rumours: [] }).success).toBe(false);
    const five = { light: [LIGHT, LIGHT, LIGHT], rumours: [RUMOUR, RUMOUR] };
    expect(AndFinallySchema.safeParse(five).success).toBe(false);
  });

  it('keeps light stories to confirmed or reported news', () => {
    const shaky = { ...LIGHT, label: 'single-source' };
    expect(AndFinallySchema.safeParse({ light: [shaky], rumours: [] }).success).toBe(false);
  });

  it('needs the aside in both languages', () => {
    const story = {
      ...LIGHT,
      versions: { ...LIGHT.versions, tr: without(LIGHT.versions.tr, 'aside') },
    };
    expect(AndFinallySchema.safeParse({ light: [story], rumours: [] }).success).toBe(false);
  });

  it('needs to know who is saying a rumour', () => {
    const anonymous = without(RUMOUR, 'heardFrom');
    expect(AndFinallySchema.safeParse({ light: [], rumours: [anonymous] }).success).toBe(false);
  });
});

describe('TransferMoveSchema', () => {
  it('accepts a move in progress', () => {
    expect(TransferMoveSchema.safeParse(MOVE).success).toBe(true);
  });

  it('only follows the Süper Lig and the big European leagues', () => {
    expect(TransferMoveSchema.safeParse({ ...MOVE, league: 'mls' }).success).toBe(false);
  });

  it('ends the steps at the current stage', () => {
    expect(TransferMoveSchema.safeParse({ ...MOVE, stage: 'talks' }).success).toBe(false);
  });

  it('keeps the steps going forward in stage and date order', () => {
    const backwards = [MOVE.steps[1], MOVE.steps[0], MOVE.steps[2]];
    expect(TransferMoveSchema.safeParse({ ...MOVE, steps: backwards }).success).toBe(false);
    const early = [MOVE.steps[0], { stage: 'talks', on: '2026-11-01' }, MOVE.steps[2]];
    expect(TransferMoveSchema.safeParse({ ...MOVE, steps: early }).success).toBe(false);
  });

  it('only calls a move signed when the club says so', () => {
    const en = without(MOVE.versions.en, 'signedWhen');
    const tr = without(MOVE.versions.tr, 'signedWhen');
    const signed = {
      ...MOVE,
      stage: 'signed',
      steps: [...MOVE.steps, { stage: 'signed', on: '2026-11-14' }],
      versions: { en, tr },
    };
    expect(TransferMoveSchema.safeParse(signed).success).toBe(false);
    expect(TransferMoveSchema.safeParse({ ...signed, clubConfirmed: true }).success).toBe(true);
  });

  it('says what would make it signed until it is', () => {
    const en = without(MOVE.versions.en, 'signedWhen');
    const move = { ...MOVE, versions: { ...MOVE.versions, en } };
    expect(TransferMoveSchema.safeParse(move).success).toBe(false);
  });

  it('keeps the same facts in both versions', () => {
    const tr = { ...MOVE.versions.tr, facts: [] };
    expect(
      TransferMoveSchema.safeParse({ ...MOVE, versions: { ...MOVE.versions, tr } }).success,
    ).toBe(false);
  });
});

describe('reading in one language', () => {
  it('gives each item in the reader’s language', () => {
    expect(lightIn(LIGHT, 'tr').aside).toBe(LIGHT.versions.tr.aside);
    expect(rumourIn(RUMOUR, 'en').title).toBe(RUMOUR.versions.en.title);
    const move = transferIn(MOVE, 'tr');
    expect(move.shortTitle).toBe(MOVE.versions.tr.shortTitle);
    expect(move.stage).toBe('agreed');
    expect(move).not.toHaveProperty('versions');
  });
});
