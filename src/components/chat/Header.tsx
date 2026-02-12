"use client";

import { SidebarTrigger } from "../ui/sidebar";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "../ui/breadcrumb";
import { Button } from "../ui/button";
import { Settings } from "lucide-react";
import { Separator } from "../ui/separator";

import { useUser } from "@/hooks/useUser";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Skeleton } from "../ui/skeleton";

const ChatHeader = () => {
  const { user, isLoading } = useUser();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const params = useParams<{ dataId?: string }>();
  const chatId = params?.dataId;
  const [chatTitle, setChatTitle] = useState("");
  const [isChatTitleLoading, setIsChatTitleLoading] = useState(true);

  useEffect(() => {
    const fetchChatTitle = async () => {
      if (!chatId) {
        setChatTitle("New Chat");
        setIsChatTitleLoading(false);
        return;
      }

      let query = supabase.from("chats").select("title").eq("id", chatId);

      if (user?.id) {
        query = query.eq("user_id", user.id);
      }

      const { data, error } = await query.maybeSingle();

      if (error) {
        toast.error(error.message);
        setChatTitle("New Chat");
        setIsChatTitleLoading(false);
        return;
      }

      setChatTitle(data?.title || "New Chat");
      setIsChatTitleLoading(false);
    };

    void fetchChatTitle();
  }, [chatId, supabase, user?.id]);

  useEffect(() => {
    const handleChatRenamed = (event: CustomEvent) => {
      const { chatId: renamedChatId, newTitle } = event.detail;
      if (renamedChatId === chatId) {
        setChatTitle(newTitle);
      }
    };

    window.addEventListener("chatRenamed", handleChatRenamed as EventListener);

    return () => {
      window.removeEventListener(
        "chatRenamed",
        handleChatRenamed as EventListener,
      );
    };
  }, [chatId]);

  return (
    <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 bg-chat-background">
      <div className="flex items-center gap-2 px-4">
        <SidebarTrigger className="-ml-1" />
        <Separator
          orientation="vertical"
          className="mr-2 data-[orientation=vertical]:h-4"
        />
        <Breadcrumb>
          <BreadcrumbList>
            <BreadcrumbItem className="hidden md:block">
              <BreadcrumbLink href="#" className="text-foreground">
                {isLoading ? (
                  <Skeleton className="h-4 w-20 bg-muted" />
                ) : (
                  user?.user_metadata?.full_name || "User"
                )}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {isChatTitleLoading ? (
                  <Skeleton className="h-4 w-20 bg-muted" />
                ) : (
                  chatTitle
                )}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="ml-auto hidden items-center px-4 text-xs text-muted-foreground md:flex">
        <Button variant="ghost" className="rounded-lg">
          <Settings className="size-4 text-foreground" />
        </Button>
      </div>
    </header>
  );
};

export default ChatHeader;
