/**
 * The rules of the daily song game (docs/song-game.md).
 *
 * Each day has four rounds, one song each: Turkish pop, hip-hop, rock and a global hit. A round starts with the
 * first 0.1 s of the song. Every miss or skip unlocks the next, longer clip. On the last clip
 * (16 s) the reader may keep guessing; the round ends when they name the song or give up. The
 * less you needed to hear, the more points you get.
 */

export const GENRES = ['pop-tr', 'rap', 'rock', 'hits'] as const;
export type Genre = (typeof GENRES)[number];

/** How much of the song each try plays, in seconds. Try 1 is 0.1 s. */
export const CLIP_SECONDS = [0.1, 1, 2, 4, 8, 16] as const;
export const MAX_TRIES = CLIP_SECONDS.length;

/** Points for naming the song on each try: 100 on the 0.1 s clip down to 10 on the 16 s one. */
export const POINTS = [100, 80, 60, 40, 25, 10] as const;
export const MAX_POINTS = POINTS[0] * GENRES.length;

/**
 * One finished or running round: what was guessed on each try, in order. `null` is a skip.
 * `solvedOn` is the try (0-based) that named the song; `gaveUp` ends a round unnamed. Tries past
 * the last clip all play the 16 s clip.
 */
export interface Round {
  readonly guesses: readonly (string | null)[];
  readonly solvedOn?: number;
  readonly gaveUp?: boolean;
}

/** The step (0-based) a try plays: tries past the last clip stay on it. */
export const stepOf = (tryIndex: number): number => Math.min(Math.max(tryIndex, 0), MAX_TRIES - 1);

export const isRoundOver = (round: Round): boolean =>
  round.solvedOn !== undefined || round.gaveUp === true;

/** Whether the next skip ends the round: the reader is already on the last clip. */
export const isOnLastClip = (round: Round): boolean => round.guesses.length >= MAX_TRIES - 1;

/** Seconds of the song the reader may play now: the clip of the next try. */
export function clipFor(round: Round): number {
  const tries = round.solvedOn ?? round.guesses.length;
  return CLIP_SECONDS[stepOf(tries)] ?? CLIP_SECONDS[0];
}

/** Points for one round: 0 when the song was not named. */
export function pointsFor(round: Round): number {
  return round.solvedOn === undefined ? 0 : (POINTS[stepOf(round.solvedOn)] ?? 0);
}

/** Seconds heard before the song was named; undefined when it was not. */
export function secondsHeard(round: Round): number | undefined {
  return round.solvedOn === undefined ? undefined : CLIP_SECONDS[stepOf(round.solvedOn)];
}

/**
 * The round after a guess. A wrong guess or a skip opens the next clip; on the last clip a wrong
 * guess leaves the round open, and a skip (`null`) gives up.
 */
export function guess(round: Round, answer: string | null, isRight: boolean): Round {
  if (isRoundOver(round)) return round;
  if (answer === null && isOnLastClip(round)) return { guesses: round.guesses, gaveUp: true };
  const guesses = [...round.guesses, answer];
  return isRight ? { guesses, solvedOn: guesses.length - 1 } : { guesses };
}

/** Gives the round up at any point. */
export const giveUp = (round: Round): Round =>
  isRoundOver(round) ? round : { guesses: round.guesses, gaveUp: true };

export const totalPoints = (rounds: readonly Round[]): number =>
  rounds.reduce((sum, round) => sum + pointsFor(round), 0);
