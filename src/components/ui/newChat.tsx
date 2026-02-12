import Link from "next/link";
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./sidebar";
import { PencilLine } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "./tooltip";

const NewChat = () => {
  return (
    <SidebarGroup>
      <SidebarMenu className="my-5">
        <SidebarMenuItem className="shadow-sm rounded-xl">
          <SidebarMenuButton asChild>
            <Link
              href=""
              className="group/chat flex items-center gap-2 rounded-lg px-2 py-6 text-sm text-foreground/80 hover:bg-muted/60 hover:text-foreground focus-visible:bg-muted/60"
            >
              <Tooltip>
                <TooltipTrigger asChild>
                  <PencilLine className="size-4 text-foreground/60 group-hover/chat:text-foreground" />
                </TooltipTrigger>
                <TooltipContent>
                  <p>New Chat</p>
                </TooltipContent>
              </Tooltip>
              <span className="truncate">New Chat</span>
            </Link>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    </SidebarGroup>
  );
};

export default NewChat;
