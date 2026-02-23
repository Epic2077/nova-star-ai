/**
 * Partner quiz questions.
 *
 * These open-ended prompts help Nova understand how the user
 * perceives their partner — strengths, needs, dynamics.
 * Answers are AI-processed into the partner profile and shared memories.
 */

export interface PartnerQuizQuestion {
  id: number;
  section: "perception" | "dynamics" | "appreciation" | "growth";
  question: string;
  placeholder: string;
}

export const partnerQuizQuestions: PartnerQuizQuestion[] = [
  // — Perception —
  {
    id: 1,
    section: "perception",
    question: "How would you describe your partner in a few words?",
    placeholder:
      "e.g. Kind, a bit stubborn, incredibly funny, always supportive…",
  },
  {
    id: 2,
    section: "perception",
    question: "What do you think your partner's love language is?",
    placeholder:
      "e.g. Quality time — they light up when we do things together…",
  },

  // — Dynamics —
  {
    id: 3,
    section: "dynamics",
    question: "How does your partner usually handle conflict or disagreements?",
    placeholder:
      "e.g. They go quiet first, then come back to talk when they're ready…",
  },
  {
    id: 4,
    section: "dynamics",
    question: "What makes your partner feel most loved and appreciated?",
    placeholder:
      "e.g. When I notice the little things they do and thank them for it…",
  },

  // — Appreciation —
  {
    id: 5,
    section: "appreciation",
    question: "What do you admire most about your partner?",
    placeholder:
      "e.g. Their patience — they never rush me even when I'm overthinking…",
  },
  {
    id: 6,
    section: "appreciation",
    question:
      "What's something small your partner does that means a lot to you?",
    placeholder:
      "e.g. They always text me when they get home safe without me asking…",
  },

  // — Growth —
  {
    id: 7,
    section: "growth",
    question: "What's one thing you wish your partner understood about you?",
    placeholder:
      "e.g. That when I'm quiet it doesn't mean I'm upset, I'm just processing…",
  },
  {
    id: 8,
    section: "growth",
    question: "What's an area you're both growing in together?",
    placeholder:
      "e.g. Learning to communicate more openly instead of assuming…",
  },
];
