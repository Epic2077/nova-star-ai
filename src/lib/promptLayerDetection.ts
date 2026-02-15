export function shouldUseReferenceLayer(input: string): boolean {
  const lowerInput = input.toLowerCase().trim();

  const ashkanKeywords = [
    // English
    "ashkan",
    "Ashkan",
    "my boyfriend",
    "boyfriend",
    "love",
    "bf",
    "partner",
    "my partner",
    "for me",

    // Persian (natural)
    "اشکان",
    "اشکانم",
    "دوست پسر",
    "دوستپسر",
    "دوست‌پسر",
    "دوس پسر",
    "همسرم",
    "شوهرم",
    "نامزدم",
    "عشقم",
    "برام",

    // Finglish
    "ashkan",
    "ashkanam",
    "dost pesar",
    "doost pesar",
    "namzadam",
    "eshgham",
  ];

  const relationshipKeywords = [
    // English natural
    "he",
    "he said",
    "he did",
    "love",
    "he told me",
    "he feels",
    "why is he",
    "why did he",
    "does he",
    "should i tell him",
    "we argued",
    "we fought",
    "between us",
    "about him",
    "he's",

    // Persian conversational
    "گفت",
    "گفتش",
    "بهم گفت",
    "باهاش حرف زدم",
    "باهاش صحبت کردم",
    "بحث کردیم",
    "بحث",
    "دعوا",
    "دعوا کردیم",
    "بینمون",
    "بین ما",
    "احساس می‌کنم دور شده",
    "فکر می‌کنم تغییر کرده",
    "رفتارش عوض شده",
    "نسبت بهم",
    "در موردش",
    "به نظرت",
    "نظرش",
    "درباره",

    // Emotional relational Persian
    "دوستم داره",
    "دوستم داره؟",
    "دوست",
    "عشق",
    "عاشق",
    "حس می‌کنم",
    "نگرانشم",
    "حسم میگه",

    // Finglish relationship
    "baash harf zadam",
    "ba ham bahs kardim",
    "delam gerefte",
    "ehsas mikonam dur shode",
    "be nazaret",
    "doosam dare",
  ];

  const hasAshkanMention = ashkanKeywords.some((keyword) =>
    lowerInput.includes(keyword),
  );

  const hasRelationshipContext = relationshipKeywords.some((keyword) =>
    lowerInput.includes(keyword),
  );

  return hasAshkanMention || hasRelationshipContext;
}

export function shouldUseInsightLayer(input: string): boolean {
  const lowerInput = input.toLowerCase().trim();

  const insightKeywords = [
    // English
    "summarize",
    "overview",
    "what have you learned",
    "what do you know about her",
    "tell me about her",
    "what does she like",
    "gift idea",
    "what should i improve",
    "am i doing something wrong",
    "be honest",
    "tell me straight",
    "what do i need to know",

    // Persian conversational
    "خلاصه کن",
    "خلاصه بگو",
    "درباره‌ش چی میدونی",
    "چی دوست داره",
    "چه هدیه‌ای بگیرم",
    "چی بخرم براش",
    "من کجام اشتباهه",
    "راستشو بگو",
    "صادقانه بگو",
    "چی کار کنم بهتر بشم",
    "چی باید بدونم",

    // Finglish
    "kholase kon",
    "chi doost dare",
    "che hedye begiram",
    "man koja eshtebaham",
    "rastesh ro begu",
    "sade begu",
  ];

  return insightKeywords.some((keyword) => lowerInput.includes(keyword));
}
