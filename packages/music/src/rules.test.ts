import { readFileSync } from 'node:fs';

import { describe, expect, it } from 'vitest';

import { parseMusicEdition, type MusicEdition, type Pick } from './edition.js';
import { readCanon } from './files.js';
import { checkMusicEdition } from './rules.js';

const sample = (): MusicEdition =>
  parseMusicEdition(
    JSON.parse(readFileSync(new URL('../fixtures/sample-edition.json', import.meta.url), 'utf8')),
  );
const canon = readCanon();
const check = (edition: MusicEdition, history: MusicEdition[] = []) =>
  checkMusicEdition(edition, { history, canon });

function edit(change: (edition: MusicEdition) => void): MusicEdition {
  const edition = sample();
  change(edition);
  return edition;
}

const first = (picks: Pick[]): Pick => {
  const pick = picks[0];
  if (!pick) throw new Error('no pick');
  return pick;
};

describe('music edition check', () => {
  it('passes the sample edition', () => {
    expect(check(sample())).toEqual([]);
  });

  it('needs five songs in every genre', () => {
    const problems = check(edit((e) => e.genres.global.pop()));
    expect(problems).toContain('global has 4 songs; it needs 5.');
  });

  it('refuses techno over 134 BPM', () => {
    const problems = check(
      edit((e) => {
        const pick = first(e.genres.techno);
        if (pick.bpm) pick.bpm.value = 140;
      }),
    );
    expect(problems.join('\n')).toMatch(/140 BPM is over 134/);
  });

  it('refuses techno without a tempo from a source', () => {
    const problems = check(edit((e) => delete first(e.genres.techno).bpm));
    expect(problems.join('\n')).toMatch(/techno needs a BPM/);
  });

  it('drops a tempo two sources disagree on, and a lone half-time reading', () => {
    const problems = check(
      edit((e) => {
        const [a, b] = e.genres.techno;
        if (a?.bpm) a.bpm.confirmedBy = { source: 'deezer', value: 140 };
        if (b?.bpm) b.bpm = { source: b.bpm.source, url: b.bpm.url, value: 66 };
      }),
    );
    expect(problems.join('\n')).toMatch(/beatport says 130 BPM but deezer says 140/);
    expect(problems.join('\n')).toMatch(/66 BPM may be a half-time reading/);
  });

  it('holds every stated number against the evidence', () => {
    const problems = check(
      edit((e) => {
        first(e.genres.turkey).reason.en = 'Number 1 on Spotify Türkiye with 3 million plays.';
      }),
    );
    expect(problems).toEqual([
      'turkey "Gece Vardiyası" (Kuzey Ateş): "3 million" in the en reason is not in the evidence.',
    ]);
  });

  it('only calls a song new in its first week', () => {
    const problems = check(edit((e) => (first(e.genres.global).released = '2026-11-01')));
    expect(problems.join('\n')).toMatch(/"new" needs a release in the last 7 days/);
  });

  it('needs a climb on the same chart for climbing', () => {
    const problems = check(
      edit((e) => {
        const pick = e.genres.turkey[2];
        const before = pick?.evidence.find((item) => item.metric === 'rankBefore');
        if (before) before.value = 5;
        if (pick) pick.reason = { en: 'Climbing on Spotify Türkiye.', tr: 'Yükselişte.' };
      }),
    );
    expect(problems.join('\n')).toMatch(/needs a better rank than before/);
  });

  it('needs a surge or a chart return for an old song', () => {
    const problems = check(
      edit((e) => {
        const pick = e.genres.global[3];
        if (pick) {
          pick.evidence = pick.evidence.filter((item) => item.metric !== 'surge');
          pick.reason = { en: 'Out in 2017, at number 18 on Spotify US.', tr: '2017, 18. sıra.' };
        }
      }),
    );
    expect(problems.join('\n')).toMatch(/needs plays at 2x its usual/);
  });

  it('only takes all-time picks from the list', () => {
    const problems = check(
      edit((e) => {
        const pick = e.genres.global[4];
        if (pick) pick.title = 'Some Other Song';
      }),
    );
    expect(problems.join('\n')).toMatch(/must come from data\/canon.json/);
  });

  it('keeps one song per lead artist per genre and no song twice on the page', () => {
    const problems = check(
      edit((e) => {
        const [a, b] = e.genres.turkey;
        if (a && b) b.artists = [...a.artists];
        const copy = e.genres.global[0];
        const tempo = e.genres.techno[0]?.bpm;
        if (copy && tempo) e.genres.techno[0] = { ...copy, bpm: tempo };
      }),
    );
    expect(problems.join('\n')).toMatch(/Kuzey Ateş already has "Gece Vardiyası" in turkey/);
    expect(problems.join('\n')).toMatch(/is the same song as global "Glass Ceiling"/);
  });

  it('does not repeat a song within 30 days, or an all-time pick within 180', () => {
    const earlier = edit((e) => (e.date = '2026-06-01'));
    const lastWeek = edit((e) => (e.date = '2026-11-16'));
    const problems = check(sample(), [earlier, lastWeek]);
    expect(problems.filter((p) => p.includes('2026-11-16'))).toHaveLength(15);
    expect(problems.filter((p) => p.includes('2026-06-01'))).toHaveLength(3);
  });

  it('needs something to play', () => {
    const problems = check(edit((e) => (first(e.genres.global).play = {})));
    expect(problems.join('\n')).toMatch(/nothing to play/);
  });

  it('refuses numbers read too long before publishing', () => {
    const problems = check(
      edit((e) => {
        const item = first(e.genres.global).evidence[0];
        if (item) item.at = '2026-11-21T12:00:00Z';
      }),
    );
    expect(problems.join('\n')).toMatch(/more than 36 hours before publishing/);
  });
});
