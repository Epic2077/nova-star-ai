import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { fetchUsageStats } from "@/lib/ai/tokenUsage";

/**
 * GET /api/chat/usage
 *
 * Returns token usage statistics for the authenticated user.
 */
export async function GET(req: NextRequest) {
  try {
    const serviceClient = createServiceClient();
    if (!serviceClient) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 },
      );
    }

    const authClient = createAuthClient(req);
    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const stats = await fetchUsageStats(serviceClient, user.id);
    return NextResponse.json(stats);
  } catch (err) {
    console.error("Usage API error:", err);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
