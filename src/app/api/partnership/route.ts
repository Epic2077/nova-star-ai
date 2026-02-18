import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";
import { nanoid } from "nanoid";
import { archiveAIPartnerProfile } from "@/lib/supabase/partnerProfile";
import type { PartnershipRow } from "@/types/partnership";

/**
 * GET /api/partnership — fetch the current user's active partnership
 */
export async function GET(req: NextRequest) {
  const authClient = createAuthClient(req);
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  // Find any partnership where user is user_a or user_b (not dissolved)
  const { data, error } = await service
    .from("partnerships")
    .select("*")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .in("status", ["pending", "active"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error("Partnership fetch error:", error);
    return NextResponse.json(
      { error: "Failed to fetch partnership" },
      { status: 500 },
    );
  }

  if (!data) {
    return NextResponse.json({ partnership: null });
  }

  const partnership = data as PartnershipRow;

  // Resolve partner's name
  const partnerId =
    partnership.user_a === user.id ? partnership.user_b : partnership.user_a;

  let partnerName: string | null = null;
  if (partnerId) {
    const { data: partnerProfile } = await service
      .from("user_profiles")
      .select("name")
      .eq("id", partnerId)
      .maybeSingle();
    partnerName = partnerProfile?.name ?? null;
  }

  return NextResponse.json({
    partnership: { ...partnership, partnerName },
  });
}

/**
 * POST /api/partnership — create a new partnership (generates invite code)
 */
export async function POST(req: NextRequest) {
  const authClient = createAuthClient(req);
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  // Check if user already has an active/pending partnership
  const { data: existing } = await service
    .from("partnerships")
    .select("id")
    .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
    .in("status", ["pending", "active"])
    .limit(1)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "You already have an active partnership" },
      { status: 409 },
    );
  }

  // Generate a unique, readable invite code (8 chars)
  const inviteCode = nanoid(8);

  const { data, error } = await service
    .from("partnerships")
    .insert({
      user_a: user.id,
      invite_code: inviteCode,
      status: "pending",
    })
    .select("*")
    .single();

  if (error) {
    console.error("Partnership create error:", error);
    return NextResponse.json(
      { error: "Failed to create partnership" },
      { status: 500 },
    );
  }

  return NextResponse.json({ partnership: data });
}

/**
 * PATCH /api/partnership — join a partnership with an invite code,
 * or dissolve an existing partnership
 */
export async function PATCH(req: NextRequest) {
  const authClient = createAuthClient(req);
  const {
    data: { user },
    error: authError,
  } = await authClient.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = createServiceClient();
  if (!service) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  const body = await req.json();

  // ── Join via invite code ──
  if (body.action === "join" && body.inviteCode) {
    // Check if user already has an active/pending partnership
    const { data: existing } = await service
      .from("partnerships")
      .select("id")
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .in("status", ["pending", "active"])
      .limit(1)
      .maybeSingle();

    if (existing) {
      return NextResponse.json(
        { error: "You already have an active partnership" },
        { status: 409 },
      );
    }

    // Find the pending partnership by invite code
    const { data: partnership, error: findError } = await service
      .from("partnerships")
      .select("*")
      .eq("invite_code", body.inviteCode)
      .eq("status", "pending")
      .maybeSingle();

    if (findError || !partnership) {
      return NextResponse.json(
        { error: "Invalid or expired invite code" },
        { status: 404 },
      );
    }

    if (partnership.user_a === user.id) {
      return NextResponse.json(
        { error: "You cannot join your own partnership" },
        { status: 400 },
      );
    }

    // Activate the partnership
    const { data: updated, error: updateError } = await service
      .from("partnerships")
      .update({
        user_b: user.id,
        status: "active",
      })
      .eq("id", partnership.id)
      .select("*")
      .single();

    if (updateError) {
      console.error("Partnership join error:", updateError);
      return NextResponse.json(
        { error: "Failed to join partnership" },
        { status: 500 },
      );
    }

    // Archive AI-built partner profiles for both users now that
    // they are linked and will use each other's user_profiles instead
    await Promise.all([
      archiveAIPartnerProfile(service, partnership.user_a, partnership.id),
      archiveAIPartnerProfile(service, user.id, partnership.id),
    ]);

    return NextResponse.json({ partnership: updated });
  }

  // ── Dissolve partnership ──
  if (body.action === "dissolve" && body.partnershipId) {
    // Verify user is part of this partnership
    const { data: partnership } = await service
      .from("partnerships")
      .select("*")
      .eq("id", body.partnershipId)
      .or(`user_a.eq.${user.id},user_b.eq.${user.id}`)
      .in("status", ["pending", "active"])
      .maybeSingle();

    if (!partnership) {
      return NextResponse.json(
        { error: "Partnership not found" },
        { status: 404 },
      );
    }

    const { error: dissolveError } = await service
      .from("partnerships")
      .update({
        status: "dissolved",
        ended_at: new Date().toISOString(),
      })
      .eq("id", partnership.id);

    if (dissolveError) {
      console.error("Partnership dissolve error:", dissolveError);
      return NextResponse.json(
        { error: "Failed to dissolve partnership" },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
