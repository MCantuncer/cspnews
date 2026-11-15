import { z } from 'zod';

import type { Language } from './language.js';

/**
 * The bulletin quiz (docs/design/decisions/caught-up.md): three questions about the stories
 * of one bulletin, shown on the caught-up screen with the answers behind a tap. Each question
 * has three options and one right answer, and is written in both languages. The right answer
 * is the same option number in both, so the options are written in the same order.
 */
export const QUIZ_LENGTH = 3;
export const QUIZ_OPTIONS = 3;

const text = (max: number) => z.string().trim().min(1).max(max);

const QuizVersionSchema = z
  .object({
    question: text(140),
    options: z.array(text(80)).length(QUIZ_OPTIONS),
  })
  .strict();

export const QuizQuestionSchema = z
  .object({
    /** The story the answer comes from, so the reader can go back and read it. */
    storyId: text(64),
    /** Position of the right option, counted from 0. */
    answer: z
      .number()
      .int()
      .min(0)
      .max(QUIZ_OPTIONS - 1),
    versions: z.object({ en: QuizVersionSchema, tr: QuizVersionSchema }).strict(),
  })
  .strict();

export type QuizQuestion = z.infer<typeof QuizQuestionSchema>;

export interface LocalQuizQuestion {
  readonly storyId: string;
  readonly answer: number;
  readonly question: string;
  readonly options: readonly string[];
}

/** A question in the reader's language. */
export function quizIn(question: QuizQuestion, language: Language): LocalQuizQuestion {
  const { storyId, answer } = question;
  return { storyId, answer, ...question.versions[language] };
}
