/**
 * Personality quiz questions.
 *
 * These are open-ended questions that the AI uses to build
 * a personality profile. The user types free-form answers.
 */

export interface QuizQuestion {
  id: number;
  question: string;
  placeholder: string;
}

export const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    question: "How would your closest friend describe your personality?",
    placeholder:
      "e.g. Caring, sometimes overthinking, always there for others…",
  },
  {
    id: 2,
    question: "What matters most to you in a relationship?",
    placeholder: "e.g. Trust, open communication, quality time together…",
  },
  {
    id: 3,
    question: "How do you usually handle conflict or disagreements?",
    placeholder: "e.g. I tend to go quiet at first, then want to talk it out…",
  },
  {
    id: 4,
    question: "What helps you feel loved and appreciated?",
    placeholder: "e.g. Words of affirmation, small thoughtful gestures…",
  },
  {
    id: 5,
    question: "How do you deal with stress or emotional overwhelm?",
    placeholder:
      "e.g. I need alone time to recharge, then I can talk about it…",
  },
  {
    id: 6,
    question: "What are your main interests or passions?",
    placeholder: "e.g. Music, cooking, hiking, reading, coding…",
  },
  {
    id: 7,
    question: "How would you describe your communication style?",
    placeholder:
      "e.g. Direct but warm, I prefer deep conversations over small talk…",
  },
  {
    id: 8,
    question: "What's one thing you wish people understood about you?",
    placeholder:
      "e.g. That my silence doesn't mean I'm upset, I'm just processing…",
  },
];
