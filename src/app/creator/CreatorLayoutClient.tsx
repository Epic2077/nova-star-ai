"use client";

import React from "react";
import { usePathname, useRouter } from "next/navigation";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  CreatorAdminProvider,
  useCreatorAdmin,
} from "@/components/creator/CreatorAdminContext";
import { useUser } from "@/hooks/useUser";
import { toast } from "sonner";

function CreatorLookupBar() {
  const { email, setEmail, isLoading, lookupByEmail } = useCreatorAdmin();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Creator Admin Portal</CardTitle>
        <CardDescription>
          Search once by email, then switch tabs without re-entering it.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void lookupByEmail();
          }}
          className="flex flex-col gap-3 md:flex-row"
        >
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="user@example.com"
            className="md:flex-1"
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Loading..." : "Lookup"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

export default function CreatorLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { signOut } = useUser();

  const currentTab = pathname.startsWith("/creator/chats")
    ? "chats"
    : pathname.startsWith("/creator/ai-profile")
      ? "ai-profile"
      : pathname.startsWith("/creator/memories")
        ? "memories"
        : pathname.startsWith("/creator/insights")
          ? "insights"
          : "user";

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
    <TooltipProvider>
      <CreatorAdminProvider>
        <main className="min-h-screen p-6 md:p-10 bg-background text-foreground">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex justify-between items-center">
              <Tabs
                value={currentTab}
                onValueChange={(value) => {
                  const routes: Record<string, string> = {
                    user: "/creator/user",
                    chats: "/creator/chats",
                    "ai-profile": "/creator/ai-profile",
                    memories: "/creator/memories",
                    insights: "/creator/insights",
                  };
                  router.push(routes[value] ?? "/creator/user");
                }}
              >
                <TabsList variant="default">
                  <TabsTrigger value="user">User</TabsTrigger>
                  <TabsTrigger value="chats">Chats</TabsTrigger>
                  <TabsTrigger value="ai-profile">AI Profile</TabsTrigger>
                  <TabsTrigger value="memories">Memories</TabsTrigger>
                  <TabsTrigger value="insights">Insights</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>

            <CreatorLookupBar />

            {children}
          </div>
        </main>
      </CreatorAdminProvider>
    </TooltipProvider>
  );
}
