/**
 * Server-side Supabase client helpers.
 *
 * Provides a cookie-aware auth client and a service-role client
 * so API routes don't need to repeat the same boilerplate.
 */

import { createServerClient } from "@supabase/ssr";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { NextRequest } from "next/server";
import type { SupabaseCookieMethods } from "@/types/supabase";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error(
    "SUPABASE_SERVICE_ROLE_KEY is not set — refusing to fall back to anon key.",
  );
}

/**
 * Create a cookie-aware Supabase client for authenticating the
 * current request (reads the session from request cookies).
 */
export function createAuthClient(req: NextRequest) {
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return req.cookies.getAll();
      },
      setAll() {
        // no-op for API routes
      },
    } as SupabaseCookieMethods,
  });
}

/**
 * Create a Supabase client with the service-role key.
 * Returns `null` when the key is missing so callers can
 * respond with a 500 early.
 */
export function createServiceClient(): SupabaseClient | null {
  if (!SUPABASE_SERVICE_ROLE_KEY) return null;
  return createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
}
