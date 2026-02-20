/**
 * PATCH /api/nova-profile/memory — confirm or mark a memory as wrong
 * DELETE /api/nova-profile/memory — soft-delete (deactivate) a memory
 *
 * Both personal and shared memories are supported via the `type` field.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const CONFIRM_BOOST = 0.2;
const WRONG_PENALTY = 0.3;
const MIN_CONFIDENCE = 0.3;

type MemoryType = "personal" | "shared";

/**
 * Verify the authenticated user owns the memory.
 * Returns the current memory row or null.
 */
async function verifyOwnership(
  serviceClient: ReturnType<typeof createServiceClient>,
  userId: string,
  memoryId: string,
  type: MemoryType,
) {
  if (!serviceClient) return null;

  if (type === "personal") {
    const { data } = await serviceClient
      .from("personal_memories")
      .select("*")
      .eq("id", memoryId)
      .eq("user_id", userId)
      .maybeSingle();
    return data;
  }

  // For shared memories, verify the user belongs to the partnership
  const { data: mem } = await serviceClient
    .from("shared_memories")
    .select("*, partnerships!inner(user_a, user_b)")
    .eq("id", memoryId)
    .maybeSingle();

  if (!mem) return null;

  const p = (mem as Record<string, unknown>).partnerships as {
    user_a: string;
    user_b: string;
  };
  if (p.user_a !== userId && p.user_b !== userId) return null;

  return mem;
}

/* ------------------------------------------------------------------ */
/*  PATCH — confirm / wrong                                            */
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

  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.type || !body?.action) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { id, type, action } = body as {
    id: string;
    type: MemoryType;
    action: "confirm" | "wrong";
  };

  if (!["personal", "shared"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }
  if (!["confirm", "wrong"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const memory = await verifyOwnership(serviceClient, user.id, id, type);
  if (!memory) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const currentConfidence = (memory as { confidence: number }).confidence ?? 1;
  let newConfidence: number;

  if (action === "confirm") {
    newConfidence = Math.min(1, currentConfidence + CONFIRM_BOOST);
  } else {
    newConfidence = Math.max(0, currentConfidence - WRONG_PENALTY);
  }

  const table = type === "personal" ? "personal_memories" : "shared_memories";

  const shouldDeactivate = action === "wrong" && newConfidence < MIN_CONFIDENCE;

  const { error } = await serviceClient
    .from(table)
    .update({
      confidence: newConfidence,
      is_active: shouldDeactivate ? false : true,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Memory PATCH error:", error);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  return NextResponse.json({
    confidence: newConfidence,
    deactivated: shouldDeactivate,
  });
}

/* ------------------------------------------------------------------ */
/*  DELETE — soft-delete (deactivate) a memory                         */
/* ------------------------------------------------------------------ */

export async function DELETE(req: NextRequest) {
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

  const body = await req.json().catch(() => null);
  if (!body?.id || !body?.type) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { id, type } = body as { id: string; type: MemoryType };

  if (!["personal", "shared"].includes(type)) {
    return NextResponse.json({ error: "Invalid type" }, { status: 400 });
  }

  const memory = await verifyOwnership(serviceClient, user.id, id, type);
  if (!memory) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const table = type === "personal" ? "personal_memories" : "shared_memories";

  const { error } = await serviceClient
    .from(table)
    .update({
      is_active: false,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (error) {
    console.error("Memory DELETE error:", error);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }

  return NextResponse.json({ deleted: true });
}
