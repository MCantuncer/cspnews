import { describe, expect, it } from 'vitest';

import { hardModeProblem, isSolved, keyboardMarks, scoreGuess } from './score.js';

describe('scoreGuess', () => {
  it('marks right places, other places and missing letters', () => {
    expect(scoreGuess('ROUSE', 'SHORE')).toEqual([
      'present',
      'present',
      'absent',
      'present',
      'correct',
    ]);
  });

  it('gives a repeated letter only as many marks as the answer has copies', () => {
    // GÜNEŞ has one Ü: the first Ü is present, the second is absent.
    expect(scoreGuess('ÜZGÜN', 'GÜNEŞ')).toEqual([
      'present',
      'absent',
      'present',
      'absent',
      'present',
    ]);
  });

  it('counts the right-place copy before an earlier other-place copy', () => {
    // THREE has two E: one is matched in place 5, so only the first other E is present.
    expect(scoreGuess('EERIE', 'THREE')).toEqual([
      'present',
      'absent',
      'correct',
      'absent',
      'correct',
    ]);
    expect(scoreGuess('LLAMA', 'HELLO')).toEqual([
      'present',
      'present',
      'absent',
      'absent',
      'absent',
    ]);
  });

  it('keeps I and İ apart in Turkish', () => {
    expect(scoreGuess('KIRIK', 'KİRLİ')).toEqual([
      'correct',
      'absent',
      'correct',
      'absent',
      'absent',
    ]);
  });

  it('refuses words of different lengths', () => {
    expect(() => scoreGuess('SHOR', 'SHORE')).toThrow();
  });
});

describe('isSolved', () => {
  it('is true only when every letter is correct', () => {
    expect(isSolved(scoreGuess('SHORE', 'SHORE'))).toBe(true);
    expect(isSolved(scoreGuess('SPORE', 'SHORE'))).toBe(false);
    expect(isSolved([])).toBe(false);
  });
});

describe('keyboardMarks', () => {
  it('keeps the best mark each letter has earned', () => {
    const marks = keyboardMarks(['ROUSE', 'SPORE'], 'SHORE');
    expect(marks.get('S')).toBe('correct');
    expect(marks.get('R')).toBe('correct');
    expect(marks.get('U')).toBe('absent');
    expect(marks.get('H')).toBeUndefined();
  });
});

describe('hardModeProblem', () => {
  it('requires right-place letters to stay in place', () => {
    expect(hardModeProblem(['SPORE'], 'TORSE', 'SHORE')).toEqual({
      kind: 'keep-letter-in-place',
      letter: 'S',
      position: 1,
    });
  });

  it('requires found letters to be used again', () => {
    expect(hardModeProblem(['TRAIN'], 'SHOVE', 'SHORE')).toEqual({
      kind: 'use-letter',
      letter: 'R',
    });
  });

  it('accepts a guess that uses everything found', () => {
    expect(hardModeProblem(['TRAIN', 'ROUSE'], 'SHORE', 'SHORE')).toBeUndefined();
  });
});
