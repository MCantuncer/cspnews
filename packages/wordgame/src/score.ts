/**
 * Scoring a guess against the answer.
 *
 * A letter is `correct` in the right place, `present` when the answer has it elsewhere, and `absent`
 * otherwise. Repeated letters are counted: a letter gets as many `correct` and `present` marks as
 * the answer has copies of it, and right-place copies are counted first.
 */
import { lettersOf } from './language.js';

export type Mark = 'correct' | 'present' | 'absent';

/** Marks for each letter of `guess`. Both words must be normalised and the same length. */
export function scoreGuess(guess: string, answer: string): Mark[] {
  const guessLetters = lettersOf(guess);
  const answerLetters = lettersOf(answer);
  if (guessLetters.length !== answerLetters.length) {
    throw new Error(
      `A guess of ${String(guessLetters.length)} letters can't be scored against ${String(answerLetters.length)}.`,
    );
  }

  const marks: Mark[] = guessLetters.map(() => 'absent');
  const unmatched = new Map<string, number>();

  guessLetters.forEach((letter, index) => {
    const answerLetter = answerLetters[index] ?? '';
    if (letter === answerLetter) marks[index] = 'correct';
    else unmatched.set(answerLetter, (unmatched.get(answerLetter) ?? 0) + 1);
  });

  guessLetters.forEach((letter, index) => {
    if (marks[index] === 'correct') return;
    const left = unmatched.get(letter) ?? 0;
    if (left > 0) {
      marks[index] = 'present';
      unmatched.set(letter, left - 1);
    }
  });

  return marks;
}

/** True when every letter is in the right place. */
export function isSolved(marks: readonly Mark[]): boolean {
  return marks.length > 0 && marks.every((mark) => mark === 'correct');
}

const RANK: Record<Mark, number> = { absent: 0, present: 1, correct: 2 };

/**
 * The best mark each letter has earned so far, for colouring the keyboard. A letter that was once
 * `correct` stays `correct` even if a later guess puts it elsewhere.
 */
export function keyboardMarks(guesses: readonly string[], answer: string): Map<string, Mark> {
  const best = new Map<string, Mark>();
  for (const guess of guesses) {
    const marks = scoreGuess(guess, answer);
    lettersOf(guess).forEach((letter, index) => {
      const mark = marks[index] ?? 'absent';
      const known = best.get(letter);
      if (known === undefined || RANK[mark] > RANK[known]) best.set(letter, mark);
    });
  }
  return best;
}

/** Why a guess breaks hard mode, so the screen can say exactly what to fix. */
export type HardModeProblem =
  | { readonly kind: 'keep-letter-in-place'; readonly letter: string; readonly position: number }
  | { readonly kind: 'use-letter'; readonly letter: string };

/**
 * In hard mode every letter found so far must be used again: `correct` letters in the same place,
 * `present` letters anywhere. Returns the first rule the guess breaks, or undefined. `position` is
 * 1-based, as it is shown to the reader.
 */
export function hardModeProblem(
  previous: readonly string[],
  guess: string,
  answer: string,
): HardModeProblem | undefined {
  const guessLetters = lettersOf(guess);

  for (const earlier of previous) {
    const marks = scoreGuess(earlier, answer);
    const earlierLetters = lettersOf(earlier);

    for (const [index, letter] of earlierLetters.entries()) {
      if (marks[index] === 'correct' && guessLetters[index] !== letter) {
        return { kind: 'keep-letter-in-place', letter, position: index + 1 };
      }
    }

    const required = new Map<string, number>();
    earlierLetters.forEach((letter, index) => {
      if (marks[index] !== 'absent') required.set(letter, (required.get(letter) ?? 0) + 1);
    });
    for (const [letter, count] of required) {
      if (guessLetters.filter((candidate) => candidate === letter).length < count) {
        return { kind: 'use-letter', letter };
      }
    }
  }

  return undefined;
}
