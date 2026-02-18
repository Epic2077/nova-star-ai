"use client";

import { Folder, MoreHorizontal, Pen, Text, Trash2 } from "lucide-react";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import Link from "next/link";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { Spinner } from "./ui/spinner";
import { TextAnimate } from "./ui/text-animate";

export function NavProjects({
  chats,
  isLoading,
  onRenameChat,
  onChatDelete,
}: {
  chats: {
    title: string;
    created_at: string;
    id: string;
  }[];
  isLoading: boolean;
  onRenameChat: (chatId: string, currentTitle: string) => void;
  onChatDelete: (chatId: string) => void;
}) {
  const { isMobile } = useSidebar();

  return (
    <SidebarGroup>
      <SidebarGroupLabel className="text-xs tracking-wide text-muted-foreground">
        Your Chats
      </SidebarGroupLabel>
      <SidebarMenu className="gap-1">
        {isLoading ? (
          <SidebarMenuItem>
            <div className="flex items-center gap-2 rounded-xl px-3 py-3 text-sm text-muted-foreground">
              <Spinner className="size-4" />
              <span>Loading chats...</span>
            </div>
          </SidebarMenuItem>
        ) : null}
        {!isLoading && chats.length === 0 ? (
          <SidebarMenuItem>
            <div className="px-3 py-3 text-sm text-muted-foreground">
              No chats yet. Start a new conversation!
            </div>
          </SidebarMenuItem>
        ) : null}
        {chats.map((item) => (
          <SidebarMenuItem key={item.id}>
            <SidebarMenuButton asChild>
              <Link
                href={`/chat/${item.id}`}
                className="group/chat flex items-center gap-2 rounded-3xl px-2 py-6 text-sm text-foreground/80 hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60"
              >
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Text className="size-4 text-foreground/60 group-hover/chat:text-foreground" />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>{item.title}</p>
                  </TooltipContent>
                </Tooltip>
                <TextAnimate
                  as="span"
                  by="word"
                  once
                  animation="blurInUp"
                  className="truncate"
                >
                  {item.title}
                </TextAnimate>
              </Link>
            </SidebarMenuButton>
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="mt-3">
                <SidebarMenuAction showOnHover className="text-foreground/50">
                  <MoreHorizontal />
                  <span className="sr-only">More</span>
                </SidebarMenuAction>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                className="w-48 rounded-lg"
                side={isMobile ? "bottom" : "right"}
                align={isMobile ? "end" : "start"}
              >
                <DropdownMenuItem
                  onClick={() => onRenameChat(item.id, item.title)}
                >
                  <Pen className="text-muted-foreground" />
                  <span>Rename Chat</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => window.open(`/chat/${item.id}`, "_blank")}
                >
                  <Folder className="text-muted-foreground" />
                  <span>View Chat In New Tab</span>
                </DropdownMenuItem>

                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => onChatDelete(item.id)}>
                  <Trash2 className="text-muted-foreground" />
                  <span>Delete Chat</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  );
}
