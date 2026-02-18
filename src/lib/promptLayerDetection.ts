/**
 * Prompt Layer Detection — Scoring System
 *
 * Instead of any-match triggering, keywords are assigned weight tiers:
 *   - STRONG  (2 pts) — unambiguous: partner name, "my boyfriend", "نامزدم"
 *   - MEDIUM  (1 pt)  — likely relationship: "he said", "we argued", "بهم گفت"
 *   - WEAK    (0.5 pt) — common words that *could* be relationship: "feel", "عشق"
 *
 * Threshold: score >= 2 activates the layer.
 * A single strong signal is enough; weak signals need multiple co-occurrences.
 *
 * The partner name is configurable — passed in at runtime so it can be
 * loaded from the database per user in the future.
 */

// ─── Helpers ─────────────────────────────────────────────────

function matchesWholeWord(input: string, keyword: string): boolean {
  const hasNonLatin = /[^\u0000-\u007F]/.test(keyword);
  if (hasNonLatin) {
    const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(?:^|\\s)${escaped}(?:\\s|$)`, "u");
    return re.test(input);
  }
  const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const re = new RegExp(`\\b${escaped}\\b`, "i");
  return re.test(input);
}

type WeightedKeyword = { word: string; weight: number };

function score(input: string, keywords: WeightedKeyword[]): number {
  let total = 0;
  for (const { word, weight } of keywords) {
    if (matchesWholeWord(input, word)) {
      total += weight;
    }
  }
  return total;
}

// ─── Relationship Layer Detection ────────────────────────────

const RELATIONSHIP_THRESHOLD = 2;

export interface RelationshipDetectionConfig {
  /** The partner's name(s) — loaded from DB in the future */
  partnerNames?: string[];
}

/**
 * Default config — will be replaced by per-user DB config later.
 */
const DEFAULT_CONFIG: RelationshipDetectionConfig = {
  partnerNames: ["ashkan", "اشکان", "اشکانم", "ashkanam"],
};

export function shouldUseRelationshipLayer(
  input: string,
  config: RelationshipDetectionConfig = DEFAULT_CONFIG,
): boolean {
  const lowerInput = input.toLowerCase().trim();

  // Build dynamic strong signals from partner names
  const partnerKeywords: WeightedKeyword[] = (config.partnerNames ?? []).map(
    (name) => ({ word: name, weight: 2 }),
  );

  const keywords: WeightedKeyword[] = [
    // ── STRONG (2) — unambiguous relationship identifiers ──
    ...partnerKeywords,
    { word: "my boyfriend", weight: 2 },
    { word: "my partner", weight: 2 },
    { word: "my husband", weight: 2 },
    { word: "my fiancé", weight: 2 },
    { word: "my fiance", weight: 2 },
    { word: "my love", weight: 2 },
    { word: "دوست پسرم", weight: 2 },
    { word: "دوستپسرم", weight: 2 },
    { word: "دوست‌پسرم", weight: 2 },
    { word: "همسرم", weight: 2 },
    { word: "شوهرم", weight: 2 },
    { word: "نامزدم", weight: 2 },
    { word: "عشقم", weight: 2 },
    { word: "namzadam", weight: 2 },
    { word: "eshgham", weight: 2 },
    { word: "dost pesaram", weight: 2 },
    { word: "doost pesaram", weight: 2 },

    // ── MEDIUM (1) — likely relationship context ──
    { word: "boyfriend", weight: 1 },
    { word: "partner", weight: 1 },
    { word: "he said", weight: 1 },
    { word: "he did", weight: 1 },
    { word: "he told me", weight: 1.5 },
    { word: "he feels", weight: 1 },
    { word: "why is he", weight: 1 },
    { word: "why did he", weight: 1 },
    { word: "does he", weight: 1 },
    { word: "should i tell him", weight: 1.5 },
    { word: "we argued", weight: 2 },
    { word: "we fought", weight: 2 },
    { word: "between us", weight: 1.5 },
    { word: "about him", weight: 1 },
    { word: "our relationship", weight: 2 },
    { word: "بهم گفت", weight: 1.5 },
    { word: "باهاش حرف زدم", weight: 1.5 },
    { word: "باهاش صحبت کردم", weight: 1.5 },
    { word: "بحث کردیم", weight: 2 },
    { word: "دعوا کردیم", weight: 2 },
    { word: "بینمون", weight: 1.5 },
    { word: "بین ما", weight: 1 },
    { word: "رفتارش عوض شده", weight: 1.5 },
    { word: "احساس می‌کنم دور شده", weight: 2 },
    { word: "فکر می‌کنم تغییر کرده", weight: 1.5 },
    { word: "نسبت بهم", weight: 1 },
    { word: "در موردش", weight: 1 },
    { word: "دوستم داره", weight: 1.5 },
    { word: "دوستم داره؟", weight: 1.5 },
    { word: "نگرانشم", weight: 1 },
    { word: "ba ham bahs kardim", weight: 2 },
    { word: "baash harf zadam", weight: 1.5 },
    { word: "ehsas mikonam dur shode", weight: 2 },
    { word: "doosam dare", weight: 1.5 },

    // ── WEAK (0.5) — very common words, need multiple to trigger ──
    { word: "he's", weight: 0.5 },
    { word: "دعوا", weight: 0.5 },
    { word: "بحث", weight: 0.5 },
    { word: "عشق", weight: 0.5 },
    { word: "عاشق", weight: 0.5 },
    { word: "حس می‌کنم", weight: 0.5 },
    { word: "حسم میگه", weight: 0.5 },
    { word: "به نظرت", weight: 0.5 },
    { word: "نظرش", weight: 0.5 },
    { word: "delam gerefte", weight: 0.5 },
    { word: "be nazaret", weight: 0.5 },
  ];

  return score(lowerInput, keywords) >= RELATIONSHIP_THRESHOLD;
}

// ─── Insight Layer Detection ─────────────────────────────────

const INSIGHT_THRESHOLD = 2;

export function shouldUseInsightLayer(input: string): boolean {
  const lowerInput = input.toLowerCase().trim();

  const keywords: WeightedKeyword[] = [
    // ── STRONG (2) — clearly asking for insights ──
    { word: "what have you learned", weight: 2 },
    { word: "what do you know about her", weight: 2 },
    { word: "what do you know about him", weight: 2 },
    { word: "tell me about her", weight: 2 },
    { word: "tell me about him", weight: 2 },
    { word: "what does she like", weight: 2 },
    { word: "what does he like", weight: 2 },
    { word: "gift idea", weight: 2 },
    { word: "gift suggestion", weight: 2 },
    { word: "what should i improve", weight: 2 },
    { word: "am i doing something wrong", weight: 2 },
    { word: "درباره‌ش چی میدونی", weight: 2 },
    { word: "چی دوست داره", weight: 2 },
    { word: "چه هدیه‌ای بگیرم", weight: 2 },
    { word: "چی بخرم براش", weight: 2 },
    { word: "من کجام اشتباهه", weight: 2 },
    { word: "چی کار کنم بهتر بشم", weight: 2 },
    { word: "chi doost dare", weight: 2 },
    { word: "che hedye begiram", weight: 2 },
    { word: "man koja eshtebaham", weight: 2 },

    // ── MEDIUM (1) — could be insight requests ──
    { word: "summarize", weight: 1 },
    { word: "overview", weight: 1 },
    { word: "be honest", weight: 1 },
    { word: "tell me straight", weight: 1 },
    { word: "what do i need to know", weight: 1.5 },
    { word: "خلاصه کن", weight: 1.5 },
    { word: "خلاصه بگو", weight: 1.5 },
    { word: "راستشو بگو", weight: 1.5 },
    { word: "صادقانه بگو", weight: 1.5 },
    { word: "چی باید بدونم", weight: 1.5 },
    { word: "kholase kon", weight: 1.5 },
    { word: "rastesh ro begu", weight: 1.5 },
    { word: "sade begu", weight: 1.5 },
  ];

  return score(lowerInput, keywords) >= INSIGHT_THRESHOLD;
}
