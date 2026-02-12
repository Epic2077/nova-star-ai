"use client";

import * as React from "react";

import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import { TeamSwitcher } from "@/components/team-switcher";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar";
import { useUser } from "@/hooks/useUser";
import NewChat from "./ui/newChat";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Chat } from "@/types/chat";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [chatData, setChatData] = React.useState<Chat[]>([]);
  const [isChatsLoading, setIsChatsLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchChats = async () => {
      if (!user?.id) {
        setChatData([]);
        setIsChatsLoading(false);
        return;
      }

      setIsChatsLoading(true);

      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching chats:", error);
        setIsChatsLoading(false);
        return;
      }
      setChatData(data || []);
      setIsChatsLoading(false);
    };
    fetchChats();
  }, [user, supabase]);

  const handleNewChat = async () => {
    if (!user?.id) {
      toast.error("You need to be logged in to start a chat.");
      window.location.href = "/login";
      return;
    }

    router.replace(`/chat`);
  };

  const navUser = user
    ? {
        full_name:
          (user.user_metadata?.full_name as string | undefined) ??
          user.email ??
          "User",
        email: user.email ?? "",
        avatar: user.user_metadata?.avatar as string | undefined,
      }
    : null;
  return (
    <Sidebar collapsible="icon" {...props} className="max-w-60">
      <SidebarHeader>
        <TeamSwitcher />
      </SidebarHeader>
      <SidebarContent>
        <div onClick={handleNewChat}>
          <NewChat />
        </div>
        <NavProjects chats={chatData} isLoading={isChatsLoading} />
      </SidebarContent>
      <SidebarFooter>
        {navUser ? <NavUser user={navUser} loading={isLoading} /> : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
