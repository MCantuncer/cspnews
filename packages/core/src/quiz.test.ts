import { describe, expect, it } from 'vitest';

import { QuizQuestionSchema, quizIn } from './quiz.js';

const question = {
  storyId: 'a',
  answer: 1,
  versions: {
    en: { question: 'Who won?', options: ['A', 'B', 'C'] },
    tr: { question: 'Kim kazandı?', options: ['A', 'B', 'C'] },
  },
};

describe('quiz', () => {
  it('reads a question in the reader’s language', () => {
    const parsed = QuizQuestionSchema.parse(question);
    expect(quizIn(parsed, 'tr')).toEqual({
      storyId: 'a',
      answer: 1,
      question: 'Kim kazandı?',
      options: ['A', 'B', 'C'],
    });
  });

  it('needs three options and an answer among them', () => {
    expect(() =>
      QuizQuestionSchema.parse({
        ...question,
        versions: { ...question.versions, en: { question: 'Q', options: ['A', 'B'] } },
      }),
    ).toThrow();
    expect(() => QuizQuestionSchema.parse({ ...question, answer: 3 })).toThrow();
  });
});
