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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [chatData, setChatData] = React.useState<Chat[]>([]);
  const [isChatsLoading, setIsChatsLoading] = React.useState(true);
  const [renameDialog, setRenameDialog] = React.useState<{
    isOpen: boolean;
    chatId: string;
    currentTitle: string;
  }>({ isOpen: false, chatId: "", currentTitle: "" });
  const [newTitle, setNewTitle] = React.useState("");

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

  const handleRenameChat = async (chatId: string, currentTitle: string) => {
    setRenameDialog({ isOpen: true, chatId, currentTitle });
    setNewTitle(currentTitle);
  };

  const handleConfirmRename = async () => {
    const { chatId } = renameDialog;
    const trimmedTitle = newTitle.trim();

    if (!trimmedTitle || trimmedTitle === renameDialog.currentTitle) {
      setRenameDialog({ isOpen: false, chatId: "", currentTitle: "" });
      return;
    }

    if (!user?.id) {
      toast.error("You need to be logged in to rename a chat.");
      return;
    }

    const { error } = await supabase
      .from("chats")
      .update({ title: trimmedTitle })
      .eq("id", chatId)
      .eq("user_id", user.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setChatData((previous) =>
      previous.map((chat) =>
        chat.id === chatId ? { ...chat, title: trimmedTitle } : chat,
      ),
    );

    toast.success("Chat renamed");

    // Notify other components (e.g., header) to update the title
    window.dispatchEvent(
      new CustomEvent("chatRenamed", {
        detail: { chatId, newTitle: trimmedTitle },
      }),
    );

    setRenameDialog({ isOpen: false, chatId: "", currentTitle: "" });
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
    <>
      <Sidebar collapsible="icon" {...props} className="max-w-60">
        <SidebarHeader>
          <TeamSwitcher />
        </SidebarHeader>
        <SidebarContent>
          <div onClick={handleNewChat}>
            <NewChat />
          </div>
          <NavProjects
            chats={chatData}
            isLoading={isChatsLoading}
            onRenameChat={handleRenameChat}
          />
        </SidebarContent>
        <SidebarFooter>
          {navUser ? <NavUser user={navUser} loading={isLoading} /> : null}
        </SidebarFooter>
        <SidebarRail />
      </Sidebar>
      <Dialog
        open={renameDialog.isOpen}
        onOpenChange={(open) =>
          setRenameDialog({ ...renameDialog, isOpen: open })
        }
      >
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Rename Chat</DialogTitle>
            <DialogDescription className="text-foreground">
              Enter a new name for your chat.
            </DialogDescription>
          </DialogHeader>
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            placeholder="Chat title"
            className="bg-input selection:bg-chart-3/20 selection:text-foreground text-foreground"
          />
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-muted cursor-pointer"
              onClick={() =>
                setRenameDialog({ isOpen: false, chatId: "", currentTitle: "" })
              }
            >
              Cancel
            </Button>
            <Button
              onClick={handleConfirmRename}
              className="bg-primary text-muted hover:bg-secondary cursor-pointer"
            >
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
