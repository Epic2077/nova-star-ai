# Nova Star AI - Prompt Layer System

## Overview

Nova Star AI uses a modular prompt system that activates different layers based on context and need, optimizing token usage while preserving functionality.

## Layer Architecture

### 1. **Core Layer** (Always Active)

- **File**: `src/lib/prompts/novaCore.ts`
- **Token Cost**: ~1800 tokens
- **Activation**: Always included in every request
- **Content**:
  - Role & Purpose
  - Directive hierarchy (emotional safety → communication → trust)
  - Primary User Awareness (Shadi)
  - Representation of Ashkan
  - Default Emotional Stance
  - Conflict Handling Protocol
  - Relationship Awareness
  - Communication Style
  - Ethical Boundaries

### 2. **Memory Layer** (Always Active)

- **File**: `src/lib/prompts/novaMemory.ts`
- **Token Cost**: ~600 tokens
- **Activation**: Enabled by default (`useMemoryLayer: true`)
- **Status**: **Always ON** for user continuity
- **Content**:
  - Memory storage guidelines (preferences, emotional needs, dates, gift ideas)
  - Passive, respectful, non-invasive rules
  - Never assume permanence or store grievances
- **Includes**: Previous conversation summaries from `memory_summary` field (generated every 20 messages)

### 3. **Insight Layer** (Intelligent Detection)

- **File**: `src/lib/prompts/novaInsight.ts`
- **Token Cost**: ~400 tokens
- **Activation**: Automatically detected by `shouldUseInsightLayer()`
- **Status**: **Auto-activated** when user requests insights
- **Detection Keywords**:
  - "what patterns", "summarize", "tell me about her"
  - "what does she like", "what does she prefer"
  - "gift idea", "gift suggestion", "what should i get"
  - "insight", "overview", "what have you learned"
- **Content**:
  - Instructions for generating high-level relationship insights
  - What she values most, responds to best, needs from relationship
  - Gift-relevant observations
  - Never share conflict transcripts or frame as surveillance

### 4. **Reference Layer** (Intelligent Detection)

- **File**: `src/lib/prompts/novaReference.ts`
- **Token Cost**: ~800 tokens
- **Activation**: Automatically detected by `shouldUseReferenceLayer()`
- **Status**: **Auto-activated** when Ashkan is mentioned or referenced
- **Detection Keywords**:
  - Direct mentions: "ashkan", "اشکان", "boyfriend", "bf", "partner"
  - Pronouns: "he said", "he did", "his", "him"
  - Questions: "why does he", "what does he", "how does he", "is he"
  - Relationship context: "our relationship", "we argued", "between us", "understand him"
- **Content**:
  - Internal knowledge about Ashkan (traits, values, communication style)
  - Relational tendencies and important truths
  - Protective tendency handling guidelines
  - Encouragement protocol

## Intelligent Layer Detection

Nova Star AI now automatically detects which layers to activate based on the user's input, optimizing token usage without sacrificing functionality.

### Detection Logic

**Reference**: `src/lib/promptLayerDetection.ts`

```typescript
// Automatically analyzes user input and activates appropriate layers
const useReferenceLayer = shouldUseReferenceLayer(content);
const useInsightLayer = shouldUseInsightLayer(content);
```

### Example Scenarios

**Scenario 1**: "How are you today?"

```typescript
{
  chatId: "...",
  content: "How are you today?",
  // Auto-detected:
  useMemoryLayer: true,       // ✅ Always on
  useInsightLayer: false,     // ❌ No insight keywords
  useReferenceLayer: false,   // ❌ No Ashkan mention
}
```

**Token Cost**: ~2400 tokens (Core + Memory)

---

**Scenario 2**: "Why did Ashkan say that?"

```typescript
{
  chatId: "...",
  content: "Why did Ashkan say that?",
  // Auto-detected:
  useMemoryLayer: true,       // ✅ Always on
  useInsightLayer: false,     // ❌ No insight keywords
  useReferenceLayer: true,    // ✅ Detected "Ashkan"
}
```

**Token Cost**: ~3200 tokens (Core + Memory + Reference)

---

**Scenario 3**: "What gift ideas do you have for him?"

```typescript
{
  chatId: "...",
  content: "What gift ideas do you have for him?",
  // Auto-detected:
  useMemoryLayer: true,       // ✅ Always on
  useInsightLayer: true,      // ✅ Detected "gift ideas"
  useReferenceLayer: true,    // ✅ Detected "him" (pronoun)
}
```

**Token Cost**: ~3600 tokens (all layers)

## Memory System Integration

When `useMemoryLayer: true`:

1. System fetches `memory_summary` from the `chats` table
2. Includes it in the system prompt as: `PREVIOUS CONVERSATION MEMORY:\n{summary}`
3. Every 20 messages, generates a new summary segment via AI
4. Appends summary to `memory_summary` field in database
5. Updates `memory_updated_at` timestamp

**Benefits**:

- Long-term continuity without sending full message history
- Token-efficient context preservation
- Automatic background processing (non-blocking)

## How Layer Detection Works

### Automatic Detection

Layers are automatically activated by analyzing user input through detection functions in `src/lib/promptLayerDetection.ts`:

**Frontend Components** (`NewChatInput.tsx` and `ChatBody.tsx`):

```typescript
import {
  shouldUseReferenceLayer,
  shouldUseInsightLayer,
} from "@/lib/promptLayerDetection";

// Automatically detect which layers are needed
const resp = await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chatId,
    content,
    useReferenceLayer: shouldUseReferenceLayer(content), // Auto-detected
    useInsightLayer: shouldUseInsightLayer(content), // Auto-detected
    // useMemoryLayer defaults to true in API
  }),
});
```

### Manual Override (Advanced)

If needed, you can manually override detection by passing flags directly:

```typescript
await fetch("/api/chat", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chatId: "uuid",
    content: "message text",
    useMemoryLayer: false, // optional, defaults to true
    useInsightLayer: true, // optional, overrides detection
    useReferenceLayer: true, // optional, overrides detection
    systemPrompt: "...", // optional, overrides all layers
  }),
});
```

## Token Optimization Strategy

With intelligent detection, token usage is automatically optimized based on context:

| Scenario        | Core    | Memory | Insight | Reference | Total    | Example               |
| --------------- | ------- | ------ | ------- | --------- | -------- | --------------------- |
| General chat    | ✅ 1800 | ✅ 600 | ❌ 0    | ❌ 0      | **2400** | "How are you?"        |
| About Ashkan    | ✅ 1800 | ✅ 600 | ❌ 0    | ✅ 800    | **3200** | "What does he think?" |
| Insight request | ✅ 1800 | ✅ 600 | ✅ 400  | ✅ 800    | **3600** | "Gift ideas for him?" |

**Benefits of Intelligent Detection**:

- ✅ **Automatic optimization**: Only loads necessary context
- ✅ **Token efficiency**: Saves ~800 tokens when Ashkan isn't mentioned
- ✅ **No manual toggling**: Detection happens automatically
- ✅ **Memory always active**: Ensures continuity across all conversations
- ✅ **Context-aware**: Reference layer activates for pronouns ("he", "him", "his")

## Customizing Detection

To add more trigger keywords, edit `src/lib/promptLayerDetection.ts`:

```typescript
export function shouldUseReferenceLayer(input: string): boolean {
  const ashkanKeywords = [
    "ashkan",
    "boyfriend",
    "partner",
    // Add more keywords here
  ];

  // Your custom logic
  return ashkanKeywords.some((keyword) =>
    input.toLowerCase().includes(keyword),
  );
}
```

## Future Enhancements

Potential improvements:

- ~~Dynamic layer selection based on conversation context~~ ✅ **IMPLEMENTED**
- Machine learning-based context detection for improved accuracy
- User preferences to manually override detection per chat
- Admin panel to view/modify detection keywords
- Token usage analytics per layer and conversation
- A/B testing different detection strategies
