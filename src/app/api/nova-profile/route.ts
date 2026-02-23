/**
 * GET  /api/nova-profile  — fetch user AI profile + partner + memories + insights
 * PATCH /api/nova-profile — update editable user AI profile fields
 */

import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";

/* ------------------------------------------------------------------ */
/*  GET — load all Nova profile data for the current user              */
/* ------------------------------------------------------------------ */

export async function GET(req: NextRequest) {
  const authClient = createAuthClient(req);
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  if (!serviceClient) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  // Fetch user AI profile + active partnership + personal memories in parallel
  const [profileRes, partnershipRes, personalMemoriesRes] = await Promise.all([
    serviceClient
      .from("user_profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle(),
    serviceClient
      .from("partnerships")
      .select("*")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .eq("status", "active")
      .maybeSingle(),
    serviceClient
      .from("personal_memories")
      .select("*")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false }),
  ]);

  const userProfile = profileRes.data ?? null;
  const partnership = partnershipRes.data ?? null;
  const personalMemories = personalMemoriesRes.data ?? [];

  let partnerProfile = null;
  let partnerSeesYou = null; // partner's quiz answers about the current user
  let memories: unknown[] = [];
  let insights: unknown[] = [];
  let partnerName: string | null = null;

  if (partnership) {
    const partnerId =
      partnership.user_a === user.id ? partnership.user_b : partnership.user_a;

    // Fetch partner info, memories, insights, and AI partner profile in parallel
    const [
      partnerNameRes,
      aiPartnerRes,
      partnerSeesYouRes,
      memoriesRes,
      insightsRes,
    ] = await Promise.all([
      // Partner's display name from user_profiles (linked account)
      partnerId
        ? serviceClient
            .from("user_profiles")
            .select("name")
            .eq("id", partnerId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      // User's own partner profile (any source — ai_generated or quiz_generated)
      serviceClient
        .from("partner_profiles")
        .select("*")
        .eq("owner_user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
      // Partner's quiz answers about the current user ("How they see you")
      partnerId
        ? serviceClient
            .from("partner_profiles")
            .select("*")
            .eq("owner_user_id", partnerId)
            .eq("about_user_id", user.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      // Shared memories
      serviceClient
        .from("shared_memories")
        .select("*")
        .eq("partnership_id", partnership.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
      // Shared insights
      serviceClient
        .from("shared_insights")
        .select("*")
        .eq("partnership_id", partnership.id)
        .eq("is_active", true)
        .order("created_at", { ascending: false }),
    ]);

    partnerName = partnerNameRes.data?.name ?? null;
    partnerProfile = aiPartnerRes.data ?? null;
    partnerSeesYou = partnerSeesYouRes.data ?? null;
    memories = memoriesRes.data ?? [];
    insights = insightsRes.data ?? [];
  } else {
    // No active partnership — check for any partner profile
    const { data: aiPartner } = await serviceClient
      .from("partner_profiles")
      .select("*")
      .eq("owner_user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    partnerProfile = aiPartner ?? null;
  }

  return NextResponse.json({
    userProfile,
    partnership,
    partnerProfile,
    partnerSeesYou,
    partnerName,
    personalMemories,
    memories,
    insights,
  });
}

/* ------------------------------------------------------------------ */
/*  PATCH — update editable user AI profile fields                     */
/* ------------------------------------------------------------------ */

export async function PATCH(req: NextRequest) {
  const authClient = createAuthClient(req);
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const serviceClient = createServiceClient();
  if (!serviceClient) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  const body = await req.json();

  // Only allow specific fields to be updated
  const allowedFields = [
    "name",
    "tone",
    "interests",
    "emotional_patterns",
    "communication_style",
  ] as const;

  const updates: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (field in body) {
      updates[field] = body[field];
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No valid fields" }, { status: 400 });
  }

  updates.updated_at = new Date().toISOString();

  const { error } = await serviceClient
    .from("user_profiles")
    .update(updates)
    .eq("id", user.id);

  if (error) {
    console.error("PATCH nova-profile error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
