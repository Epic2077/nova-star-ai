"use client";

import * as React from "react";
import { Frame, Map, PieChart } from "lucide-react";

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
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

// This is sample data.
const falseData = {
  projects: [
    {
      name: "Design Engineering",
      url: "#",
      icon: Frame,
    },
    {
      name: "Sales & Marketing",
      url: "#",
      icon: PieChart,
    },
    {
      name: "Travel",
      url: "#",
      icon: Map,
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, isLoading } = useUser();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const router = useRouter();

  const handleNewChat = async () => {
    if (!user?.id) {
      toast.error("You need to be logged in to start a chat.");
      router.push("/login");
      return;
    }

    const { data, error } = await supabase
      .from("chats")
      .insert([{ user_id: user.id, title: "New Chat" }])
      .select();

    if (error) {
      toast.error(error.message);
      return;
    }

    if (!data || data.length === 0) {
      toast.error("Failed to create a new chat.");
      return;
    }

    router.push(`/chat/${(data[0] as { id: string }).id}`);
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
        <NavProjects projects={falseData.projects} />
      </SidebarContent>
      <SidebarFooter>
        {navUser ? <NavUser user={navUser} loading={isLoading} /> : null}
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
}
