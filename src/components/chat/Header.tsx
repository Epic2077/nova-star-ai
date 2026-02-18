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
import { Download, Settings } from "lucide-react";
import { Separator } from "../ui/separator";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";

import { useUser } from "@/hooks/useUser";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { toast } from "sonner";
import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { TextAnimate } from "../ui/text-animate";

const ChatHeader = () => {
  const { user, isLoading } = useUser();
  const supabase = React.useMemo(() => createSupabaseBrowserClient(), []);
  const params = useParams<{ dataId?: string }>();
  const chatId = params?.dataId;
  const [chatTitle, setChatTitle] = useState("");
  const [isChatTitleLoading, setIsChatTitleLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async (format: "markdown" | "pdf") => {
    if (!chatId || isExporting) return;
    setIsExporting(true);
    try {
      const resp = await fetch("/api/chat/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatId, format }),
      });

      if (!resp.ok) {
        throw new Error("Export failed");
      }

      if (format === "pdf") {
        // Open the printable HTML in a new tab
        const html = await resp.text();
        const blob = new Blob([html], { type: "text/html" });
        const url = URL.createObjectURL(blob);
        window.open(url, "_blank");
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      } else {
        // Download as .md
        const text = await resp.text();
        const blob = new Blob([text], { type: "text/markdown" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `${chatTitle || "chat"}.md`;
        a.click();
        URL.revokeObjectURL(url);
      }

      toast.success(`Exported as ${format === "pdf" ? "PDF" : "Markdown"}`);
    } catch {
      toast.error("Export failed");
    } finally {
      setIsExporting(false);
    }
  };

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
    <header className="sticky top-0 flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 bg-chat-background z-10 ">
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
                  <span className="text-sm text-muted-foreground">
                    Loading…
                  </span>
                ) : (
                  <TextAnimate as="span" by="word" once animation="blurInUp">
                    {String(user?.user_metadata?.full_name || "User")}
                  </TextAnimate>
                )}
              </BreadcrumbLink>
            </BreadcrumbItem>
            <BreadcrumbSeparator className="hidden md:block" />
            <BreadcrumbItem>
              <BreadcrumbPage>
                {isChatTitleLoading ? (
                  <span className="text-sm text-muted-foreground">
                    Loading…
                  </span>
                ) : (
                  <TextAnimate as="span" by="word" once animation="blurInUp">
                    {chatTitle}
                  </TextAnimate>
                )}
              </BreadcrumbPage>
            </BreadcrumbItem>
          </BreadcrumbList>
        </Breadcrumb>
      </div>
      <div className="ml-auto hidden items-center gap-1 px-4 text-xs text-muted-foreground md:flex">
        {chatId && (
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="rounded-lg"
                    disabled={isExporting}
                  >
                    <Download className="size-4 text-foreground" />
                  </Button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Export chat</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => handleExport("markdown")}>
                Export as Markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExport("pdf")}>
                Export as PDF
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
        <Button variant="ghost" className="rounded-lg">
          <Settings className="size-4 text-foreground" />
        </Button>
      </div>
    </header>
  );
};

export default ChatHeader;
