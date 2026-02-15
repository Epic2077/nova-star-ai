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

export default function CreatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

  const currentTab = pathname.startsWith("/creator/chats") ? "chats" : "user";

  return (
    <TooltipProvider>
      <CreatorAdminProvider>
        <main className="min-h-screen p-6 md:p-10 bg-background text-foreground">
          <div className="mx-auto max-w-6xl space-y-6">
            <Tabs
              value={currentTab}
              onValueChange={(value) => {
                router.push(
                  value === "chats" ? "/creator/chats" : "/creator/user",
                );
              }}
            >
              <TabsList variant="default">
                <TabsTrigger value="user">User & Profile</TabsTrigger>
                <TabsTrigger value="chats">Chats</TabsTrigger>
              </TabsList>
            </Tabs>

            <CreatorLookupBar />

            {children}
          </div>
        </main>
      </CreatorAdminProvider>
    </TooltipProvider>
  );
}
