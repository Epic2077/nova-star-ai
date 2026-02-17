import { NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import type { SupabaseCookieMethods } from "@/types/supabase";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

type ChatRow = {
  id: string;
  title: string;
  created_at: string;
};

type MessageRow = {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export async function GET(request: NextRequest) {
  try {
    const email = request.nextUrl.searchParams
      .get("email")
      ?.trim()
      .toLowerCase();

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const authClient = createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {
          // no-op for this route
        },
      } as SupabaseCookieMethods,
    });

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: requesterProfile } = await service
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (requesterProfile?.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Look up user by email directly instead of fetching all users
    const { data: usersById, error: listError } = await service
      .rpc("get_user_id_by_email", { lookup_email: email })
      .maybeSingle();

    // Fallback: if the RPC doesn't exist yet, use the admin API with a filter
    let targetUser;
    if (listError || !usersById) {
      // Fallback to listing, but this is O(n) — add the RPC for production use
      const { data: listedUsers, error: fallbackError } =
        await service.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });

      if (fallbackError) {
        return NextResponse.json(
          { error: "Failed to lookup user" },
          { status: 500 },
        );
      }

      targetUser = listedUsers.users.find(
        (candidate) => candidate.email?.toLowerCase() === email,
      );
    } else {
      // RPC returned a user id — fetch the full user object
      const { data: userData, error: userError } =
        await service.auth.admin.getUserById(usersById.id);
      if (!userError && userData?.user) {
        targetUser = userData.user;
      }
    }

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { data: profile } = await service
      .from("profiles")
      .select("*")
      .eq("id", targetUser.id)
      .maybeSingle();

    const { data: chatsRaw, error: chatsError } = await service
      .from("chats")
      .select("id, title, created_at")
      .eq("user_id", targetUser.id)
      .order("created_at", { ascending: false });

    if (chatsError) {
      return NextResponse.json(
        { error: "Failed to fetch chats" },
        { status: 500 },
      );
    }

    const chats = (chatsRaw ?? []) as ChatRow[];
    const chatIds = chats.map((chat) => chat.id);

    let messages: MessageRow[] = [];
    if (chatIds.length > 0) {
      const { data: messagesRaw, error: messagesError } = await service
        .from("messages")
        .select("id, chat_id, role, content, created_at")
        .in("chat_id", chatIds)
        .order("created_at", { ascending: true });

      if (messagesError) {
        return NextResponse.json(
          { error: "Failed to fetch messages" },
          { status: 500 },
        );
      }

      messages = (messagesRaw ?? []) as MessageRow[];
    }

    const chatsWithMessages = chats.map((chat) => ({
      ...chat,
      messages: messages.filter((message) => message.chat_id === chat.id),
    }));

    return NextResponse.json({
      user: {
        id: targetUser.id,
        email: targetUser.email,
        role: targetUser.role,
        app_metadata: targetUser.app_metadata,
        user_metadata: targetUser.user_metadata,
        identities: targetUser.identities,
        created_at: targetUser.created_at,
        last_sign_in_at: targetUser.last_sign_in_at,
      },
      profile,
      chats: chatsWithMessages,
    });
  } catch (error) {
    console.error("Admin user-data API error:", error);
    return NextResponse.json(
      { error: "Unexpected server error" },
      { status: 500 },
    );
  }
}
