# Nova Star AI — Prompt Layer Architecture

## Overview

Nova Star AI uses a **5-layer modular prompt system** designed for a two-partner relationship AI. Each layer has specific **ownership**, **editability**, and **visibility** rules. Layers activate based on context and need, optimizing tokens while preserving deep personalization.

## Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│  1. CORE              Always active   Creator-only control  │
│  2. MAIN USER         Always active   User / AI editable    │
│  3. REFERENCE          Conditional    Partner / AI editable  │
│  4. SHARED MEMORY     Always active   AI-only editable      │
│  5. SHARED INSIGHT     Conditional    AI-only editable      │
│  (+) RELATIONSHIP      Conditional    Paired with Reference  │
└─────────────────────────────────────────────────────────────┘
```

---

### 1. Core Layer — Always Active

|                   |                                    |
| ----------------- | ---------------------------------- |
| **File**          | `src/lib/prompts/novaCore.ts`      |
| **Export**        | `NOVA_CORE_PROMPT` (static string) |
| **Controlled by** | Creator only — invisible to users  |
| **Activation**    | Every request                      |

**Content**: Identity, tone, formatting (LaTeX/Markdown), emotional stance, conflict handling, ethics, long-term goal. Generic and user-agnostic — never references specific users or relationships.

---

### 2. Main User Layer — Always Active

|                 |                                                                |
| --------------- | -------------------------------------------------------------- |
| **File**        | `src/lib/prompts/novaMainUser.ts`                              |
| **Export**      | `buildMainUserPrompt(profile: UserProfile)`                    |
| **Editable by** | User (self-write or personality quiz) or AI (gradual learning) |
| **Activation**  | Every request — built dynamically per user                     |

**Content**: User's name, personality traits, emotional patterns, communication style, interests, AI-generated notes.

**Setup modes**:

1. **Self-written** — user fills out their own profile
2. **Personality quiz** — user answers questions, AI generates the profile

**Key**: Can double as the Reference layer for the partner's account.

**Interface**: `UserProfile { name, tone?, interests?, emotionalPatterns?, communicationStyle?, aiNotes? }`

**Future**: Loaded from `user_profiles` table. AI updates fields over time.

---

### 3. Reference Layer — Conditional (Paired with Relationship)

|                 |                                                            |
| --------------- | ---------------------------------------------------------- |
| **File**        | `src/lib/prompts/novaReference.ts`                         |
| **Export**      | `buildReferencePrompt(profile: PartnerProfile)`            |
| **Editable by** | Partner themselves or AI — current user cannot view/modify |
| **Activation**  | When relationship context is detected                      |

**Content**: Partner's name, core traits, relational tendencies, important truths, AI-generated notes.

**Setup modes**:

1. **AI-generated** — Nova builds the profile over time from conversations
2. **Shared via code** — partner fills it out, or their Main User profile is used

**Interface**: `PartnerProfile { name, traits?, relationalTendencies?, importantTruths?, aiNotes? }`

**Default**: `DEFAULT_PARTNER_PROFILE` (Ashkan — hardcoded until DB is ready)

**Future**: Loaded from `partner_profiles` table.

---

### 4. Shared Memory Layer — Always Active

|                 |                                            |
| --------------- | ------------------------------------------ |
| **File**        | `src/lib/prompts/novaMemory.ts`            |
| **Export**      | `NOVA_MEMORY_LAYER_PROMPT` (static string) |
| **Editable by** | AI only — both partners can view           |
| **Activation**  | Every request (`useMemoryLayer: true`)     |

**Content**: Preferences, emotional needs, important dates, routines, sensitivities, growth moments. Balanced — stores memories from both partners fairly.

**Privacy rule**: Never share one partner's private disclosures with the other without consent.

**Includes**: Conversation summaries from `memory_summary` field (generated every 20 messages).

**Future**: `shared_memory` table — AI writes, both partners read.

---

### 5. Shared Insight Layer — Conditional

|                 |                                                     |
| --------------- | --------------------------------------------------- |
| **File**        | `src/lib/prompts/novaInsight.ts`                    |
| **Export**      | `NOVA_INSIGHT_LAYER_PROMPT` (static string)         |
| **Editable by** | AI only — both partners can view (future dashboard) |
| **Activation**  | When insight context is detected                    |

**Content**: Emotional needs, communication preferences, appreciation patterns, conflict style, growth areas, actionable suggestions. Gender-neutral, balanced for both partners.

**Future**: Dashboard showing each partner what the other needs — without exposing private conversations.

---

### (+) Relationship Layer — Conditional (Paired with Reference)

|                |                                                                   |
| -------------- | ----------------------------------------------------------------- |
| **File**       | `src/lib/prompts/novaRelationship.ts`                             |
| **Export**     | `NOVA_RELATIONSHIP_PROMPT` (static string)                        |
| **Activation** | When relationship context is detected (same trigger as Reference) |

**Content**: Directive hierarchy (emotional safety → communication → trust), relationship awareness, partner representation rules, conflict protocol, long-term relationship goal.

**Note**: Focuses on the relationship _as a whole_, not individual profiles.

---

## Intelligent Layer Detection

Layers are activated server-side based on message content using a weighted scoring system.

**Detection file**: `src/lib/promptLayerDetection.ts`

```typescript
const useRelationshipLayer = shouldUseRelationshipLayer(content);
const useInsightLayer = shouldUseInsightLayer(content);
```

**Scoring system**:

- STRONG keywords (2 pts) — e.g., partner name, "رابطه", "relationship"
- MEDIUM keywords (1–1.5 pts) — e.g., "partner", "عشق"
- WEAK keywords (0.5 pts) — e.g., "he said", "she feels"
- **Threshold**: 2 points to activate
- **Configurable**: `partnerNames` via `RelationshipDetectionConfig`

### Example Scenarios

**"How are you today?"**

```
Core ✅ | Main User ✅ | Memory ✅ | Relationship ❌ | Reference ❌ | Insight ❌
```

**"Why did Ashkan say that?"**

```
Core ✅ | Main User ✅ | Memory ✅ | Relationship ✅ | Reference ✅ | Insight ❌
```

**"What gift ideas do you have for him?"**

```
Core ✅ | Main User ✅ | Memory ✅ | Relationship ✅ | Reference ✅ | Insight ✅
```

## System Prompt Composition

```typescript
const layeredSystemPrompt = [
  NOVA_CORE_PROMPT, // Always
  buildMainUserPrompt({ name: user.full_name }), // Always (dynamic)
  useMemoryLayer ? NOVA_MEMORY_LAYER_PROMPT : null, // Always
  useInsightLayer ? NOVA_INSIGHT_LAYER_PROMPT : null, // When insights detected
  useRelationshipLayer ? NOVA_RELATIONSHIP_PROMPT : null, // When relationship detected
  useRelationshipLayer ? buildReferencePrompt(profile) : null, // Paired with relationship
]
  .filter(Boolean)
  .join("\n\n");
```

## Access Control Summary

| Layer          | Who edits    | Who views                 | Activation  |
| -------------- | ------------ | ------------------------- | ----------- |
| Core           | Creator      | Nobody (system)           | Always      |
| Main User      | User + AI    | User                      | Always      |
| Reference      | Partner + AI | System only               | Conditional |
| Shared Memory  | AI only      | Both partners             | Always      |
| Shared Insight | AI only      | Both partners (dashboard) | Conditional |
| Relationship   | Creator      | System only               | Conditional |

## Future Enhancements

- ~~Dynamic layer selection based on conversation context~~ ✅ **IMPLEMENTED**
- ~~Dynamic Reference prompt (partner profile builder)~~ ✅ **IMPLEMENTED**
- ~~Server-side layer detection~~ ✅ **IMPLEMENTED**
- Per-user Main User profile from `user_profiles` table
- AI self-updating user profiles (tone, emotional patterns, interests)
- Personality quiz → AI generates Main User profile
- Shared code system for partner profile exchange
- `shared_memory` table — AI writes, both partners read
- Insight dashboard — each partner sees what the other needs
- Admin panel for detection keywords and profile management
- Token usage analytics per layer and conversation
