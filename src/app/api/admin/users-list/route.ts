import { NextRequest, NextResponse } from "next/server";
import { createAuthClient, createServiceClient } from "@/lib/supabase/server";

type UserListItem = {
  id: string;
  email: string;
  name: string | null;
  last_sign_in_at: string | null;
  created_at: string;
};

export async function GET(request: NextRequest) {
  try {
    const authClient = createAuthClient(request);

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

    // Verify the requester is an admin
    const { data: requesterProfile } = await service
      .from("user_profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (requesterProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Fetch all auth users (paginated — collect all pages)
    const allUsers: {
      id: string;
      email?: string;
      last_sign_in_at?: string;
      created_at: string;
    }[] = [];

    let page = 1;
    const perPage = 1000;

    while (true) {
      const { data, error } = await service.auth.admin.listUsers({
        page,
        perPage,
      });

      if (error) {
        return NextResponse.json(
          { error: "Failed to list users" },
          { status: 500 },
        );
      }

      allUsers.push(...data.users);

      if (data.users.length < perPage) break;
      page++;
    }

    // Fetch all user profiles to get names
    const { data: profiles } = await service
      .from("user_profiles")
      .select("id, name");

    const profileMap = new Map<string, string | null>();
    for (const p of profiles ?? []) {
      profileMap.set(p.id, p.name ?? null);
    }

    // Build the list and sort by last_sign_in_at descending
    const userList: UserListItem[] = allUsers
      .map((u) => ({
        id: u.id,
        email: u.email ?? "",
        name: profileMap.get(u.id) ?? null,
        last_sign_in_at: u.last_sign_in_at ?? null,
        created_at: u.created_at,
      }))
      .sort((a, b) => {
        // Users who signed in most recently come first
        // Null last_sign_in_at goes to the bottom
        if (!a.last_sign_in_at && !b.last_sign_in_at) return 0;
        if (!a.last_sign_in_at) return 1;
        if (!b.last_sign_in_at) return -1;
        return (
          new Date(b.last_sign_in_at).getTime() -
          new Date(a.last_sign_in_at).getTime()
        );
      });

    return NextResponse.json({
      total: userList.length,
      users: userList,
    });
  } catch (error) {
    console.error("Admin users-list API error:", error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
