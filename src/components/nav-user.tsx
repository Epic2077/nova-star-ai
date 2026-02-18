"use client";

import {
  BadgeCheck,
  ChevronsUpDown,
  LogOut,
  MoonIcon,
  SunIcon,
  ToolCase,
} from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";
import { Skeleton } from "./ui/skeleton";
import { Switch } from "./ui/switch";
import { useTheme } from "next-themes";
import { useProfile } from "@/hooks/useProfile";

export function NavUser({
  user,
  loading,
}: {
  user: {
    full_name: string;
    email: string;
    avatar?: string;
  };
  loading: boolean;
}) {
  const { isMobile } = useSidebar();
  const { signOut } = useUser();
  const { setTheme, theme } = useTheme();
  const { role } = useProfile();

  const handleLogout = async () => {
    try {
      await signOut();
      window.location.href = "/";
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to log out.";
      toast.error(message);
    }
  };

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
            >
              {loading ? (
                <Skeleton className="h-8 w-8 rounded-full" />
              ) : (
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.full_name} />
                  <AvatarFallback className="rounded-lg">
                    {user.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              )}
              <div className="grid flex-1 text-left text-sm leading-tight">
                {loading ? (
                  <Skeleton className="h-4 w-37.5" />
                ) : (
                  <span className="truncate font-medium">{user.full_name}</span>
                )}
                {loading ? (
                  <Skeleton className="h-3 w-25" />
                ) : (
                  <>
                    <span className="truncate text-xs">{user.email}</span>
                  </>
                )}
              </div>
              <ChevronsUpDown className="ml-auto size-4" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            side={isMobile ? "bottom" : "right"}
            align="end"
            sideOffset={4}
          >
            <DropdownMenuLabel className="p-0 font-normal">
              <div className="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
                <Avatar className="h-8 w-8 rounded-lg">
                  <AvatarImage src={user.avatar} alt={user.full_name} />
                  <AvatarFallback className="rounded-lg">
                    {user.full_name.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">{user.full_name}</span>
                  <span className="truncate text-xs">{user.email}</span>
                </div>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />

            <DropdownMenuGroup>
              <DropdownMenuItem
                onClick={() => (window.location.href = "/setting/account")}
              >
                <BadgeCheck />
                Account
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={(e) => e.preventDefault()}>
                {theme === "dark" ? (
                  <>
                    <MoonIcon />
                    Dark Mode
                  </>
                ) : (
                  <>
                    <SunIcon />
                    Light Mode
                  </>
                )}
                <Switch
                  className="ml-auto "
                  defaultChecked={theme === "dark"}
                  onCheckedChange={() =>
                    setTheme(theme === "light" ? "dark" : "light")
                  }
                />
              </DropdownMenuItem>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            {role === "admin" && (
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => (window.location.href = "/creator/user")}
                >
                  <ToolCase />
                  Admin Management
                </DropdownMenuItem>
              </DropdownMenuGroup>
            )}
            <DropdownMenuItem onClick={handleLogout}>
              <LogOut />
              Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
