/**
 * Application-level prompt cache.
 *
 * The large layered system prompt is rebuilt on every request from
 * multiple DB reads + string concatenation.  Most of the time the
 * prompt is identical across consecutive requests for the same user
 * because profiles / memories only change every few messages.
 *
 * This module keeps a lightweight in-memory LRU cache keyed by a
 * fast hash of the inputs, so repeated calls within the same server
 * instance reuse the assembled string without re-querying the DB.
 *
 * It also signals to the provider layer whether the prompt was a
 * cache hit so provider-level caching headers can be set.
 *
 * The cache has a short TTL (5 minutes) so profile / memory
 * updates propagate quickly without manual invalidation.
 */

/* ------------------------------------------------------------------ */
/*  Fast string hash (FNV-1a 32-bit)                                   */
/* ------------------------------------------------------------------ */

function fnv1a(str: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = (hash * 0x01000193) >>> 0;
  }
  return hash.toString(36);
}

/* ------------------------------------------------------------------ */
/*  Cache entry                                                        */
/* ------------------------------------------------------------------ */

interface CacheEntry {
  prompt: string;
  createdAt: number;
}

const MAX_ENTRIES = 200;
const TTL_MS = 5 * 60 * 1000; // 5 minutes

const cache = new Map<string, CacheEntry>();

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

export interface PromptCacheResult {
  prompt: string;
  /** `true` when the prompt was served from cache */
  cacheHit: boolean;
}

/**
 * Build a cache key from the raw ingredients that make up the
 * system prompt.  If a cached version exists (and is fresh), return
 * it; otherwise call `buildFn` and store the result.
 *
 * @param keyParts  Serialisable values that uniquely determine the prompt
 * @param buildFn   Function that produces the system prompt string
 */
export function getCachedPrompt(
  keyParts: unknown[],
  buildFn: () => string,
): PromptCacheResult {
  const raw = JSON.stringify(keyParts);
  const key = fnv1a(raw);
  const now = Date.now();

  // Check existing entry
  const existing = cache.get(key);
  if (existing && now - existing.createdAt < TTL_MS) {
    return { prompt: existing.prompt, cacheHit: true };
  }

  // Build and store
  const prompt = buildFn();
  cache.set(key, { prompt, createdAt: now });

  // Evict oldest entries when over capacity
  if (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }

  return { prompt, cacheHit: false };
}

/**
 * Invalidate all cached prompts for a given user.
 * Called when a profile or memory is updated.
 */
export function invalidatePromptCache(): void {
  cache.clear();
}
