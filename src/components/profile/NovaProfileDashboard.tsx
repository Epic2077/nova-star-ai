"use client";

import { useState, useEffect, useCallback } from "react";
import { useUser } from "@/hooks/useUser";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { User, Heart, BookOpen, Brain, Lightbulb } from "lucide-react";
import UserAIProfileTab from "./UserAIProfileTab";
import PartnerProfileTab from "./PartnerProfileTab";
import PersonalMemoriesTab from "./PersonalMemoriesTab";
import SharedMemoriesTab from "./SharedMemoriesTab";
import SharedInsightsTab from "./SharedInsightsTab";
import type { UserProfileRow } from "@/types/userProfile";
import type { PartnerProfileRow } from "@/types/partnerProfile";
import type { PartnershipRow } from "@/types/partnership";
import type { PersonalMemoryRow } from "@/types/personalMemory";
import type { SharedMemoryRow } from "@/types/sharedMemory";
import type { SharedInsightRow } from "@/types/sharedInsight";

interface NovaProfileData {
  userProfile: UserProfileRow | null;
  partnership: PartnershipRow | null;
  partnerProfile: PartnerProfileRow | null;
  partnerSeesYou: PartnerProfileRow | null;
  partnerName: string | null;
  personalMemories: PersonalMemoryRow[];
  memories: SharedMemoryRow[];
  insights: SharedInsightRow[];
}

export default function NovaProfileDashboard() {
  const { user, isLoading: userLoading } = useUser();
  const [data, setData] = useState<NovaProfileData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch("/api/nova-profile");
      if (!res.ok) throw new Error("Failed to fetch");
      const json = await res.json();
      setData(json);
    } catch (err) {
      console.error("Failed to load Nova profile data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!userLoading && user) {
      fetchData();
    } else if (!userLoading && !user) {
      setLoading(false);
    }
  }, [userLoading, user, fetchData]);

  if (userLoading || loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-64 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!user) {
    return (
      <p className="text-sm text-muted-foreground">
        Please log in to view your Nova profile.
      </p>
    );
  }

  return (
    <Tabs defaultValue="profile" className="w-full">
      <TabsList variant="line" className="w-full justify-start">
        <TabsTrigger value="profile" className="gap-1.5">
          <User className="size-4" />
          My AI Profile
        </TabsTrigger>
        <TabsTrigger value="partner" className="gap-1.5">
          <Heart className="size-4" />
          Partner
        </TabsTrigger>
        <TabsTrigger value="personal-memories" className="gap-1.5">
          <Brain className="size-4" />
          My Memories
          {(data?.personalMemories?.length ?? 0) > 0 && (
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
              {data!.personalMemories.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="memories" className="gap-1.5">
          <BookOpen className="size-4" />
          Shared
          {(data?.memories?.length ?? 0) > 0 && (
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
              {data!.memories.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="insights" className="gap-1.5">
          <Lightbulb className="size-4" />
          Insights
          {(data?.insights?.length ?? 0) > 0 && (
            <span className="ml-1 rounded-full bg-muted px-1.5 py-0.5 text-[10px] leading-none text-muted-foreground">
              {data!.insights.length}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="profile" className="mt-6">
        <UserAIProfileTab
          profile={data?.userProfile ?? null}
          onSaved={fetchData}
        />
      </TabsContent>

      <TabsContent value="partner" className="mt-6">
        <PartnerProfileTab
          partnership={data?.partnership ?? null}
          partnerProfile={data?.partnerProfile ?? null}
          partnerSeesYou={data?.partnerSeesYou ?? null}
          partnerName={data?.partnerName ?? null}
        />
      </TabsContent>

      <TabsContent value="personal-memories" className="mt-6">
        <PersonalMemoriesTab
          memories={data?.personalMemories ?? []}
          onRefresh={fetchData}
        />
      </TabsContent>

      <TabsContent value="memories" className="mt-6">
        <SharedMemoriesTab
          memories={data?.memories ?? []}
          userId={user.id}
          onRefresh={fetchData}
        />
      </TabsContent>

      <TabsContent value="insights" className="mt-6">
        <SharedInsightsTab insights={data?.insights ?? []} userId={user.id} />
      </TabsContent>
    </Tabs>
  );
}
