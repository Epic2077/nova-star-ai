/**
 * DELETE /api/partner-profile — remove the current user's AI-built
 * partner profile.
 *
 * Used when a relationship ends: the AI-built profile in `partner_profiles`
 * (and the ex-partner's name on it) is not cleared by dissolving a
 * partnership, so the user needs an explicit way to remove it.
 *
 * Only ever deletes rows the caller owns (`owner_user_id = user.id`), so a
 * partner's own "how they see you" row is never affected.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";

export async function DELETE(req: NextRequest) {
  const authClient = createAuthClient(req);
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  // Optional `id` targets a single profile row; without it, every partner
  // profile the user owns is removed.
  let id: string | undefined;
  try {
    const body = await req.json();
    id = typeof body?.id === "string" ? body.id : undefined;
  } catch {
    /* no body — delete all owned partner profiles */
  }

  let query = service
    .from("partner_profiles")
    .delete()
    .eq("owner_user_id", user.id);

  if (id) {
    query = query.eq("id", id);
  }

  const { error } = await query;

  if (error) {
    console.error("Delete partner profile error:", error);
    return NextResponse.json(
      { error: "Failed to remove partner profile" },
      { status: 500 },
    );
  }

  return NextResponse.json({ success: true });
}
