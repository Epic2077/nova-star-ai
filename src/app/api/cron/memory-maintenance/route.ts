/**
 * POST /api/cron/memory-maintenance
 *
 * Periodic memory maintenance job. Designed to be called by a cron
 * scheduler (e.g. Vercel Cron, GitHub Actions, or external service).
 *
 * Performs:
 *   1. Confidence decay on all active users' memories
 *   2. Insight regeneration for active partnerships
 *
 * Protected by CRON_SECRET environment variable.
 */

import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  runConfidenceDecay,
  runInsightRegeneration,
} from "@/lib/ai/memoryMaintenance";

export async function POST(req: NextRequest) {
  // Verify cron secret
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createServiceClient();
  if (!supabase) {
    return NextResponse.json(
      { error: "Server misconfiguration" },
      { status: 500 },
    );
  }

  try {
    const stats = {
      decayed: 0,
      deactivated: 0,
      insightsDeactivated: 0,
      insightsCreated: 0,
      usersProcessed: 0,
      partnershipsProcessed: 0,
    };

    // ── 1. Confidence Decay ──
    // Get all users who have active memories
    const { data: usersWithMemories } = await supabase
      .from("personal_memories")
      .select("user_id")
      .eq("is_active", true)
      .limit(500);

    const uniqueUserIds = [
      ...new Set((usersWithMemories ?? []).map((r) => r.user_id)),
    ];

    // For each user, find their active partnership (if any) and run decay
    for (const userId of uniqueUserIds) {
      const { data: partnership } = await supabase
        .from("partnerships")
        .select("id")
        .eq("status", "active")
        .or(`user_a.eq.${userId},user_b.eq.${userId}`)
        .maybeSingle();

      const result = await runConfidenceDecay(
        supabase,
        userId,
        partnership?.id ?? null,
      );

      stats.decayed += result.decayed;
      stats.deactivated += result.deactivated;
      stats.usersProcessed++;
    }

    // ── 2. Insight Regeneration ──
    // Get all active partnerships
    const { data: activePartnerships } = await supabase
      .from("partnerships")
      .select("id, user_a, user_b")
      .eq("status", "active")
      .limit(200);

    for (const p of activePartnerships ?? []) {
      // Run insight regen from perspective of user_a
      const result = await runInsightRegeneration(
        supabase,
        p.user_a,
        p.id,
        p.user_b,
      );

      stats.insightsDeactivated += result.deactivated;
      stats.insightsCreated += result.created;
      stats.partnershipsProcessed++;
    }

    console.log("[cron/memory-maintenance] Complete:", stats);

    return NextResponse.json({
      ok: true,
      stats,
    });
  } catch (err) {
    console.error("[cron/memory-maintenance] Error:", err);
    return NextResponse.json(
      { error: "Maintenance job failed" },
      { status: 500 },
    );
  }
}
