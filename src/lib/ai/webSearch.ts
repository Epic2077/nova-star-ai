/**
 * Web Search utility for Nova Star AI.
 *
 * Uses Brave Search API when BRAVE_SEARCH_API_KEY is set.
 * Falls back to a simple summarisation prompt if no key is available.
 */

import type { WebSearchResult } from "@/types/chat";

const BRAVE_KEY = process.env.BRAVE_SEARCH_API_KEY;
const BRAVE_URL = "https://api.search.brave.com/res/v1/web/search";

/* ------------------------------------------------------------------ */
/*  Public API                                                         */
/* ------------------------------------------------------------------ */

/**
 * Search the web for the given query and return a list of results.
 * Returns an empty array when no search backend is configured.
 */
export async function searchWeb(
  query: string,
  count = 5,
): Promise<WebSearchResult[]> {
  if (!BRAVE_KEY) {
    console.warn("BRAVE_SEARCH_API_KEY not set — web search is unavailable.");
    return [];
  }

  try {
    const params = new URLSearchParams({
      q: query,
      count: String(count),
    });

    const resp = await fetch(`${BRAVE_URL}?${params}`, {
      headers: {
        Accept: "application/json",
        "Accept-Encoding": "gzip",
        "X-Subscription-Token": BRAVE_KEY,
      },
    });

    if (!resp.ok) {
      console.error("Brave Search error:", resp.status, await resp.text());
      return [];
    }

    const data = await resp.json();

    const results: WebSearchResult[] = (data.web?.results ?? [])
      .slice(0, count)
      .map((r: { title?: string; url?: string; description?: string }) => ({
        title: r.title ?? "",
        url: r.url ?? "",
        snippet: r.description ?? "",
      }));

    return results;
  } catch (err) {
    console.error("Web search failed:", err);
    return [];
  }
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

/**
 * Format search results into a string suitable for injecting
 * into a system/user prompt.
 */
export function formatSearchResults(results: WebSearchResult[]): string {
  if (results.length === 0) return "";

  const formatted = results
    .map((r, i) => `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.snippet}`)
    .join("\n\n");

  return `WEB SEARCH RESULTS:\n${formatted}`;
}

/**
 * Extract a concise search query from the user's message.
 * Keeps it short to maximise search relevance.
 */
export function extractSearchQuery(userMessage: string): string {
  // Simple heuristic: take the first 200 characters, strip common filler
  const cleaned = userMessage
    .replace(/^(can you |please |could you |help me |tell me )/i, "")
    .replace(/[?!.]+$/g, "")
    .trim();

  return cleaned.slice(0, 200);
}
