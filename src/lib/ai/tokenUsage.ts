/**
 * Token usage tracking & rate limiting.
 *
 * ──────────────────────────────────────
 * Database table: `token_usage`
 * ──────────────────────────────────────
 * id              uuid   PK   default gen_random_uuid()
 * user_id         uuid   FK → auth.users(id)
 * tokens_used     int    NOT NULL
 * provider        text   NOT NULL  ("deepseek" | "openai")
 * model           text   NOT NULL
 * endpoint        text   NOT NULL  ("chat" | "title" | "memory" | "extraction")
 * created_at      timestamptz  default now()
 *
 * ──────────────────────────────────────
 * Rate Limits (daily rolling window)
 * ──────────────────────────────────────
 * Free tier:   100 000 tokens / 24 h
 *
 * The limit is intentionally generous — it exists to prevent abuse,
 * not to gate normal usage.
 */

import type { SupabaseClient } from "@supabase/supabase-js";

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

/** Daily token budget per user */
export const DAILY_TOKEN_LIMIT = 100_000;

/** Rough chars-to-tokens ratio (1 token ≈ 4 chars for English) */
const CHARS_PER_TOKEN = 4;

/* ------------------------------------------------------------------ */
/*  Token estimation                                                   */
/* ------------------------------------------------------------------ */

/**
 * Cheap token estimate from character count.
 * When the provider returns actual usage numbers we prefer those,
 * but this gives a reasonable fallback.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN);
}

/**
 * Extract token usage from a provider response payload.
 * Returns `null` when the payload doesn't include usage info.
 */
export function extractTokensFromPayload(
  payload: Record<string, unknown>,
  provider: "deepseek" | "openai",
): {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
} | null {
  if (provider === "deepseek") {
    const usage = payload.usage as
      | {
          prompt_tokens?: number;
          completion_tokens?: number;
          total_tokens?: number;
        }
      | undefined;
    if (usage?.total_tokens) {
      return {
        promptTokens: usage.prompt_tokens ?? 0,
        completionTokens: usage.completion_tokens ?? 0,
        totalTokens: usage.total_tokens,
      };
    }
  }

  if (provider === "openai") {
    const usage = payload.usage as
      | { input_tokens?: number; output_tokens?: number; total_tokens?: number }
      | undefined;
    if (usage?.total_tokens) {
      return {
        promptTokens: usage.input_tokens ?? 0,
        completionTokens: usage.output_tokens ?? 0,
        totalTokens: usage.total_tokens,
      };
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Database operations                                                */
/* ------------------------------------------------------------------ */

export type TokenEndpoint = "chat" | "title" | "memory" | "extraction";

/**
 * Record a token usage event.
 */
export async function recordTokenUsage(
  supabase: SupabaseClient,
  params: {
    userId: string;
    tokensUsed: number;
    provider: string;
    model: string;
    endpoint: TokenEndpoint;
  },
): Promise<void> {
  const { userId, tokensUsed, provider, model, endpoint } = params;
  if (tokensUsed <= 0) return;

  const { error } = await supabase.from("token_usage").insert({
    user_id: userId,
    tokens_used: tokensUsed,
    provider,
    model,
    endpoint,
  });

  if (error) {
    console.error("Failed to record token usage:", error);
  }
}

/* ------------------------------------------------------------------ */
/*  Rate-limit check                                                   */
/* ------------------------------------------------------------------ */

export interface UsageSummary {
  tokensUsedToday: number;
  remaining: number;
  limit: number;
  allowed: boolean;
}

/**
 * Check whether a user is within their daily token budget.
 * Uses a 24-hour rolling window.
 *
 * Exempt roles (admin, creator) bypass the limit entirely —
 * pass the user's `role` from `user_profiles` to enable this.
 */
export async function checkRateLimit(
  supabase: SupabaseClient,
  userId: string,
  role?: string | null,
): Promise<UsageSummary> {
  // Admin and creator roles are exempt from rate limits
  if (role === "admin" || role === "creator") {
    return {
      tokensUsedToday: 0,
      remaining: DAILY_TOKEN_LIMIT,
      limit: DAILY_TOKEN_LIMIT,
      allowed: true,
    };
  }

  const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const { data, error } = await supabase
    .from("token_usage")
    .select("tokens_used")
    .eq("user_id", userId)
    .gte("created_at", since);

  if (error) {
    console.error("Rate-limit query failed:", error);
    // Fail open — allow the request, log the error
    return {
      tokensUsedToday: 0,
      remaining: DAILY_TOKEN_LIMIT,
      limit: DAILY_TOKEN_LIMIT,
      allowed: true,
    };
  }

  const tokensUsedToday = (data ?? []).reduce(
    (sum, row) => sum + (row.tokens_used ?? 0),
    0,
  );

  const remaining = Math.max(0, DAILY_TOKEN_LIMIT - tokensUsedToday);

  return {
    tokensUsedToday,
    remaining,
    limit: DAILY_TOKEN_LIMIT,
    allowed: remaining > 0,
  };
}

/* ------------------------------------------------------------------ */
/*  User-facing usage stats  (for the settings page)                   */
/* ------------------------------------------------------------------ */

export interface UsageStats {
  today: number;
  last7Days: number;
  last30Days: number;
  allTime: number;
  limit: number;
  /** Breakdown by provider for the last 30 days */
  byProvider: { provider: string; tokens: number }[];
  /** Breakdown by endpoint for the last 30 days */
  byEndpoint: { endpoint: string; tokens: number }[];
  /** Per-day token totals for the last 30 days (ascending by date) */
  dailyBreakdown: { date: string; tokens: number }[];
}

/**
 * Fetch usage statistics for display in the account settings page.
 */
export async function fetchUsageStats(
  supabase: SupabaseClient,
  userId: string,
): Promise<UsageStats> {
  const now = Date.now();
  const since24h = new Date(now - 24 * 60 * 60 * 1000).toISOString();
  const since7d = new Date(now - 7 * 24 * 60 * 60 * 1000).toISOString();
  const since30d = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

  // Fetch last 30 days of records (covers all windows)
  const { data: records, error } = await supabase
    .from("token_usage")
    .select("tokens_used, provider, endpoint, created_at")
    .eq("user_id", userId)
    .gte("created_at", since30d)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Usage stats query failed:", error);
    return {
      today: 0,
      last7Days: 0,
      last30Days: 0,
      allTime: 0,
      limit: DAILY_TOKEN_LIMIT,
      byProvider: [],
      byEndpoint: [],
      dailyBreakdown: [],
    };
  }

  const rows = records ?? [];

  let today = 0;
  let last7Days = 0;
  let last30Days = 0;

  const providerMap = new Map<string, number>();
  const endpointMap = new Map<string, number>();
  const dailyMap = new Map<string, number>();

  for (const row of rows) {
    const tokens = row.tokens_used ?? 0;
    const createdAt = row.created_at as string;

    last30Days += tokens;
    if (createdAt >= since7d) last7Days += tokens;
    if (createdAt >= since24h) today += tokens;

    // Aggregate by calendar date (YYYY-MM-DD)
    const dayKey = createdAt.slice(0, 10);
    dailyMap.set(dayKey, (dailyMap.get(dayKey) ?? 0) + tokens);

    providerMap.set(
      row.provider,
      (providerMap.get(row.provider) ?? 0) + tokens,
    );
    endpointMap.set(
      row.endpoint,
      (endpointMap.get(row.endpoint) ?? 0) + tokens,
    );
  }

  // Build a complete 30-day array (fill missing days with 0)
  const dailyBreakdown: { date: string; tokens: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    dailyBreakdown.push({ date: key, tokens: dailyMap.get(key) ?? 0 });
  }

  // All-time total (separate query — not bounded by 30d)
  const { data: allTimeData } = await supabase
    .from("token_usage")
    .select("tokens_used")
    .eq("user_id", userId);

  const allTime = (allTimeData ?? []).reduce(
    (sum, r) => sum + (r.tokens_used ?? 0),
    0,
  );

  return {
    today,
    last7Days,
    last30Days,
    allTime,
    limit: DAILY_TOKEN_LIMIT,
    byProvider: Array.from(providerMap, ([provider, tokens]) => ({
      provider,
      tokens,
    })),
    byEndpoint: Array.from(endpointMap, ([endpoint, tokens]) => ({
      endpoint,
      tokens,
    })),
    dailyBreakdown,
  };
}
