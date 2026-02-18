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
import { useParams, useRouter } from "next/navigation";
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
  const params = useParams<{ dataId?: string }>();
  const activeChatId = params?.dataId;
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const [chatData, setChatData] = React.useState<Chat[]>([]);
  const [isChatsLoading, setIsChatsLoading] = React.useState(true);
  const [renameDialog, setRenameDialog] = React.useState<{
    isOpen: boolean;
    chatId: string;
    currentTitle: string;
  }>({ isOpen: false, chatId: "", currentTitle: "" });
  const [newTitle, setNewTitle] = React.useState("");
  const [deleteDialog, setDeleteDialog] = React.useState<{
    isOpen: boolean;
    chatId: string;
    chatTitle: string;
  }>({ isOpen: false, chatId: "", chatTitle: "" });

  React.useEffect(() => {
    if (!user?.id) {
      setChatData([]);
      setIsChatsLoading(false);
      return;
    }

    let isMounted = true;
    const fetchChats = async () => {
      setIsChatsLoading(true);

      const { data, error } = await supabase
        .from("chats")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (error) {
        console.error("Error fetching chats:", error);
        if (isMounted) setIsChatsLoading(false);
        return;
      }

      if (isMounted) {
        setChatData(data || []);
        setIsChatsLoading(false);
      }
    };

    void fetchChats();

    // realtime updates for chats (insert / update / delete)
    const channel = supabase
      .channel(`public:chats:user_id=eq.${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "chats",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as Chat;
          setChatData((prev) => [row, ...prev.filter((c) => c.id !== row.id)]);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "chats",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const row = payload.new as Chat;
          setChatData((prev) => prev.map((c) => (c.id === row.id ? row : c)));
        },
      )
      .on(
        "postgres_changes",
        {
          event: "DELETE",
          schema: "public",
          table: "chats",
          filter: `user_id=eq.${user.id}`,
        },
        (payload) => {
          const oldRow = payload.old as Chat;
          setChatData((prev) => prev.filter((c) => c.id !== oldRow.id));
        },
      )
      .subscribe();

    return () => {
      isMounted = false;
      try {
        channel.unsubscribe();
      } catch {
        // ignore
      }
    };
  }, [user, supabase]);

  React.useEffect(() => {
    const handleChatCreated = (event: CustomEvent) => {
      const chat = event.detail?.chat as Chat | undefined;
      if (!chat?.id) return;

      setChatData((previous) => [
        chat,
        ...previous.filter((item) => item.id !== chat.id),
      ]);
      setIsChatsLoading(false);
    };

    const handleChatRenamed = (event: CustomEvent) => {
      const renamedChatId = event.detail?.chatId as string | undefined;
      const newTitle = event.detail?.newTitle as string | undefined;
      if (!renamedChatId || !newTitle) return;

      setChatData((previous) =>
        previous.map((chat) =>
          chat.id === renamedChatId ? { ...chat, title: newTitle } : chat,
        ),
      );
    };

    window.addEventListener("chatCreated", handleChatCreated as EventListener);
    window.addEventListener("chatRenamed", handleChatRenamed as EventListener);

    return () => {
      window.removeEventListener(
        "chatCreated",
        handleChatCreated as EventListener,
      );
      window.removeEventListener(
        "chatRenamed",
        handleChatRenamed as EventListener,
      );
    };
  }, []);

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

  const handleChatDelete = async (chatId: string) => {
    // Find the chat title for the confirmation dialog
    const chat = chatData.find((c) => c.id === chatId);
    setDeleteDialog({
      isOpen: true,
      chatId,
      chatTitle: chat?.title ?? "this chat",
    });
  };

  const handleConfirmDelete = async () => {
    const { chatId } = deleteDialog;

    if (!user?.id) {
      toast.error("You need to be logged in to delete a chat.");
      return;
    }

    const { error } = await supabase
      .from("chats")
      .delete()
      .eq("id", chatId)
      .eq("user_id", user.id);

    if (error) {
      toast.error(error.message);
      return;
    }

    setChatData((previous) => previous.filter((chat) => chat.id !== chatId));

    // Only navigate away if the user deleted the chat they are currently viewing
    if (activeChatId === chatId) {
      router.replace("/chat");
    }

    toast.success("Chat deleted");
    setDeleteDialog({ isOpen: false, chatId: "", chatTitle: "" });
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
          <button
            onClick={handleNewChat}
            className="w-full text-left cursor-pointer"
            aria-label="Start a new chat"
          >
            <NewChat />
          </button>
          <NavProjects
            chats={chatData}
            isLoading={isChatsLoading}
            onRenameChat={handleRenameChat}
            onChatDelete={handleChatDelete}
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
      <Dialog
        open={deleteDialog.isOpen}
        onOpenChange={(open) =>
          setDeleteDialog({ ...deleteDialog, isOpen: open })
        }
      >
        <DialogContent className="bg-card">
          <DialogHeader>
            <DialogTitle>Delete Chat</DialogTitle>
            <DialogDescription className="text-foreground">
              Are you sure you want to delete &quot;{deleteDialog.chatTitle}
              &quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              className="bg-muted cursor-pointer"
              onClick={() =>
                setDeleteDialog({ isOpen: false, chatId: "", chatTitle: "" })
              }
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              className="cursor-pointer"
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
