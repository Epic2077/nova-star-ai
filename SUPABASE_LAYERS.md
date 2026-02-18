# Supabase — Prompt Layers Database Plan

Work through each table in order. Check off when done.

---

## Migration Order

1. [ ] `user_profiles`
2. [ ] `partnerships`
3. [ ] `partner_profiles`
4. [ ] `shared_memories`
5. [ ] `shared_insights`
6. [ ] `detection_config` (optional)

---

## Table 1: `user_profiles`

**Powers**: Main User Layer (`novaMainUser.ts` → `buildMainUserPrompt()`)

### Columns

| Column                | Type        | Nullable | Default     | Notes                                               |
| --------------------- | ----------- | -------- | ----------- | --------------------------------------------------- |
| `id`                  | UUID (PK)   | no       | —           | FK → `auth.users.id`                                |
| `name`                | text        | no       | —           | Seeded from `user_metadata.full_name` on signup     |
| `tone`                | text        | yes      | null        | Preferred communication tone                        |
| `interests`           | text[]      | yes      | null        | List of interests                                   |
| `emotional_patterns`  | text        | yes      | null        | How they handle emotions                            |
| `communication_style` | text        | yes      | null        | Direct, gentle, humor-driven, etc.                  |
| `memory_summary`      | jsonb       | yes      | null        | compressed structured personality profile Ai writes |
| `setup_mode`          | text        | no       | `'pending'` | `'pending'` / `'self_written'` / `'quiz_generated'` |
| `version`             | text        | yes      | 0           | change history, memory re-evaluation, drift detect  |
| `created_at`          | timestamptz | no       | `now()`     |                                                     |
| `updated_at`          | timestamptz | no       | `now()`     |                                                     |

### RLS Policies

- User can **SELECT** and **UPDATE** their own row (`auth.uid() = id`)
- Service role can **SELECT** any row (needed to load partner's profile as Reference)
- Service role can **UPDATE** `memory_summary` on any row (AI learning)
- User can **never** read another user's row via client

### When to Create Row

On signup — insert with `name` from auth and `setup_mode = 'pending'`

### Maps to TypeScript

```typescript
// novaMainUser.ts
interface UserProfile {
  name: string;
  tone?: string;
  interests?: string[];
  emotionalPatterns?: string;
  communicationStyle?: string;
  memory_summary?: jsonb;
}
```

### Route.ts Change

Replace:

```typescript
buildMainUserPrompt({
  name: user.user_metadata?.full_name ?? user.email?.split("@")[0] ?? "there",
});
```

With: query `user_profiles` by `user.id`, pass full `UserProfile` to `buildMainUserPrompt()`. Fall back to name-only if row doesn't exist.

---

## Table 2: `partnerships`

**Powers**: Links two users together. Backbone for Reference, Memory, Insight, Detection layers.

### Columns

| Column        | Type          | Nullable | Default             | Notes                                            |
| ------------- | ------------- | -------- | ------------------- | ------------------------------------------------ |
| `id`          | UUID (PK)     | no       | `gen_random_uuid()` |                                                  |
| `user_a`      | UUID          | no       | —                   | FK → `auth.users.id` — the creator               |
| `user_b`      | UUID          | yes      | null                | FK → `auth.users.id` — filled when partner joins |
| `invite_code` | text (unique) | no       | —                   | The "shared code" one partner generates          |
| `status`      | text          | no       | `'pending'`         | `'pending'` / `'active'` / `'dissolved'`         |
| `created_at`  | timestamptz   | no       | `now()`             |                                                  |

### How It Works

1. User A creates partnership → gets unique `invite_code`, `user_b = null`, `status = 'pending'`
2. User B enters the code → `user_b` filled, `status = 'active'`
3. System now knows: User A's partner is User B (and vice versa)

### RLS Policies

- Users can **SELECT** partnerships where `auth.uid() = user_a OR auth.uid() = user_b`
- Only service role can **UPDATE** `user_b` and `status`
- No visibility for non-members

### Route.ts Change

After auth, query `partnerships` to find active partnership → derive partner's `user_id`.

---

## Table 3: `partner_profiles`

**Powers**: Reference Layer (`novaReference.ts` → `buildReferencePrompt()`)

Used when the partner does NOT have an account yet, or hasn't linked. The AI builds this from conversations.

### Columns

| Column                  | Type        | Nullable | Default             | Notes                                                        |
| ----------------------- | ----------- | -------- | ------------------- | ------------------------------------------------------------ |
| `id`                    | UUID (PK)   | no       | `gen_random_uuid()` |                                                              |
| `owner_user_id`         | UUID        | no       | —                   | FK → `auth.users.id` — the user who talks about this partner |
| `partnership_id`        | UUID        | yes      | null                | FK → `partnerships.id` — linked once partner joins           |
| `name`                  | text        | no       | —                   | Partner's name (used for detection too)                      |
| `traits`                | text[]      | yes      | null                | Core personality traits                                      |
| `relational_tendencies` | text[]      | yes      | null                | How they behave in the relationship                          |
| `important_truths`      | text[]      | yes      | null                | Things to know                                               |
| `ai_notes`              | text        | yes      | null                | AI-generated notes                                           |
| `source`                | text        | no       | `'ai_generated'`    | `'ai_generated'` / `'partner_account'`                       |
| `created_at`            | timestamptz | no       | `now()`             |                                                              |
| `updated_at`            | timestamptz | no       | `now()`             |                                                              |

### Key Logic

- **Partnership active** (both linked) → load partner's `user_profiles` row as Reference instead
- **Partner has no account** → use this table (AI-built profile)
- **Partner links account** → `source` flips to `'partner_account'`, data sourced from `user_profiles`

### RLS Policies

- Only service role can **SELECT** and **INSERT/UPDATE** (never exposed to client)
- Injected server-side into system prompt only

### Maps to TypeScript

```typescript
// novaReference.ts
interface PartnerProfile {
  name: string;
  traits?: string[];
  relationalTendencies?: string[];
  importantTruths?: string[];
  aiNotes?: string;
}
```

### Route.ts Change

Replace `DEFAULT_PARTNER_PROFILE` with a DB query. If partnership is active, load partner's `user_profiles` row instead.

---

## Table 4: `shared_memories`

**Powers**: Shared Memory Layer (`novaMemory.ts`)

Cross-chat memory visible to both partners. AI-only editable.

### Columns

| Column           | Type        | Nullable | Default             | Notes                                                                                                                    |
| ---------------- | ----------- | -------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| `id`             | UUID (PK)   | no       | `gen_random_uuid()` |                                                                                                                          |
| `partnership_id` | UUID        | no       | —                   | FK → `partnerships.id`                                                                                                   |
| `category`       | text        | no       | `'general'`         | `'preference'` / `'emotional_need'` / `'important_date'` / `'gift_idea'` / `'growth_moment'` / `'pattern'` / `'general'` |
| `about_user`     | UUID        | yes      | null                | FK → `auth.users.id` — null means about the relationship                                                                 |
| `content`        | text        | no       | —                   | The actual memory                                                                                                        |
| `confidence`     | float       | no       | `1.0`               | 0–1, how confident the AI is                                                                                             |
| `is_active`      | boolean     | no       | `true`              | Soft delete for outdated memories                                                                                        |
| `created_at`     | timestamptz | no       | `now()`             |                                                                                                                          |
| `updated_at`     | timestamptz | no       | `now()`             |                                                                                                                          |

### RLS Policies

- Both partners can **SELECT** (view shared memories)
- Only service role can **INSERT/UPDATE/DELETE** (AI-only editable)

### Route.ts Change

Query `shared_memories` for the active partnership, format into a string, append alongside `NOVA_MEMORY_LAYER_PROMPT`. The per-chat `memory_summary` on `chats` stays as-is for conversation-level context.

### AI Update Flow

After generating a response, a secondary LLM call (or background job) asks: "What new memories should be stored from this conversation?" → insert/update rows.

---

## Table 5: `shared_insights`

**Powers**: Shared Insight Layer (`novaInsight.ts`)

AI-generated relationship insights. Future dashboard.

### Columns

| Column           | Type        | Nullable | Default             | Notes                                                                                                                               |
| ---------------- | ----------- | -------- | ------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `id`             | UUID (PK)   | no       | `gen_random_uuid()` |                                                                                                                                     |
| `partnership_id` | UUID        | no       | —                   | FK → `partnerships.id`                                                                                                              |
| `category`       | text        | no       | —                   | `'emotional_need'` / `'communication'` / `'appreciation'` / `'conflict_style'` / `'growth_area'` / `'strength'` / `'gift_relevant'` |
| `about_user`     | UUID        | yes      | null                | FK → `auth.users.id` — which partner this is about                                                                                  |
| `title`          | text        | no       | —                   | Short label for dashboard                                                                                                           |
| `content`        | text        | no       | —                   | The insight itself                                                                                                                  |
| `is_active`      | boolean     | no       | `true`              | Soft delete                                                                                                                         |
| `created_at`     | timestamptz | no       | `now()`             |                                                                                                                                     |
| `updated_at`     | timestamptz | no       | `now()`             |                                                                                                                                     |

### RLS Policies

- Both partners can **SELECT** (dashboard access)
- Only service role can **INSERT/UPDATE** (AI-only)

### Route.ts Change

Query `shared_insights` for active partnership, inject alongside `NOVA_INSIGHT_LAYER_PROMPT`.

---

## Table 6: `detection_config` (Optional)

**Powers**: Dynamic layer detection (`promptLayerDetection.ts`)

Makes keyword detection configurable per partnership instead of hardcoded.

### Columns

| Column                   | Type      | Nullable | Default             | Notes                                  |
| ------------------------ | --------- | -------- | ------------------- | -------------------------------------- |
| `id`                     | UUID (PK) | no       | `gen_random_uuid()` |                                        |
| `partnership_id`         | UUID      | no       | —                   | FK → `partnerships.id`                 |
| `partner_names`          | text[]    | no       | —                   | Names/nicknames to detect              |
| `custom_keywords`        | jsonb     | yes      | null                | Additional strong/medium/weak keywords |
| `relationship_threshold` | float     | no       | `2.0`               | Scoring threshold override             |

### RLS Policies

- Service role only (system config, not user-facing)

### Route.ts Change

Load detection config before calling `shouldUseRelationshipLayer(content, config)`. Populate `partnerNames` from this table instead of hardcoded defaults.

---

## What Stays as Files (Not DB)

| File                      | Reason                                                                  |
| ------------------------- | ----------------------------------------------------------------------- |
| `novaCore.ts`             | Creator-controlled, never user-editable                                 |
| `novaRelationship.ts`     | Instruction template (names come from DB config)                        |
| `novaMemory.ts`           | Instruction prompt (actual data comes from `shared_memories`)           |
| `novaInsight.ts`          | Instruction prompt (actual data comes from `shared_insights`)           |
| `novaMainUser.ts`         | Builder function (data comes from `user_profiles`)                      |
| `novaReference.ts`        | Builder function (data comes from `partner_profiles` / `user_profiles`) |
| `promptLayerDetection.ts` | Scoring logic (config comes from `detection_config`)                    |

---

## Route.ts — New Query Flow

Current: 3 queries (chat ownership, history, memory summary)

New (all parallelizable with `Promise.all()`):

1. **`user_profiles`** → pass to `buildMainUserPrompt()`
2. **`partnerships`** → find active partnership, get partner's user ID
3. **`partner_profiles`** (or partner's `user_profiles`) → pass to `buildReferencePrompt()`
4. **`detection_config`** → pass to `shouldUseRelationshipLayer()`
5. **`shared_memories`** → format and append to system prompt
6. **`shared_insights`** → format and append to system prompt (if insight layer active)

---

## Notes & Decisions

<!-- Add your notes here as you work through each table -->

-
