"use client";

import { createBrowserClient } from "@supabase/ssr";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY env vars. " +
      "The Supabase client will not work correctly.",
  );
}

// Single shared GoTrue/browser client per tab. Creating a fresh client on
// every call spins up multiple GoTrueClient instances that each run their own
// auto-refresh timer; on reload they race to rotate the single-use refresh
// token and trip "Invalid Refresh Token: Already Used". Memoizing one instance
// keeps token refresh serialized within the tab.
let browserClient: ReturnType<typeof createBrowserClient> | undefined;

export const createSupabaseBrowserClient = () => {
  if (browserClient) return browserClient;

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Cannot create Supabase client: NEXT_PUBLIC_SUPABASE_URL and " +
        "NEXT_PUBLIC_SUPABASE_ANON_KEY must be set.",
    );
  }

  browserClient = createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return browserClient;
};
