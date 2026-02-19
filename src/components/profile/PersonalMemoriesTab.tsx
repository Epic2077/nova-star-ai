"use client";

import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Bookmark,
  Heart,
  Calendar,
  Sprout,
  Repeat,
  Target,
  MessageSquare,
  Filter,
} from "lucide-react";
import type {
  PersonalMemoryRow,
  PersonalMemoryCategory,
} from "@/types/personalMemory";

interface Props {
  memories: PersonalMemoryRow[];
}

const CATEGORY_META: Record<
  PersonalMemoryCategory,
  { label: string; icon: React.ElementType; color: string }
> = {
  preference: {
    label: "Preference",
    icon: Bookmark,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  emotional_need: {
    label: "Emotional need",
    icon: Heart,
    color: "text-pink-500 bg-pink-500/10 border-pink-500/20",
  },
  important_date: {
    label: "Important date",
    icon: Calendar,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  growth_moment: {
    label: "Growth",
    icon: Sprout,
    color: "text-green-500 bg-green-500/10 border-green-500/20",
  },
  pattern: {
    label: "Pattern",
    icon: Repeat,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  },
  goal: {
    label: "Goal",
    icon: Target,
    color: "text-cyan-500 bg-cyan-500/10 border-cyan-500/20",
  },
  general: {
    label: "General",
    icon: MessageSquare,
    color: "text-slate-500 bg-slate-500/10 border-slate-500/20",
  },
};

export default function PersonalMemoriesTab({ memories }: Props) {
  const [filter, setFilter] = useState<PersonalMemoryCategory | "all">("all");

  if (!memories.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Personal Memories</CardTitle>
          <CardDescription>
            No memories yet. As you chat with Nova, it will remember important
            details about you — your preferences, goals, and milestones.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const categories = [...new Set(memories.map((m) => m.category))];
  const filtered =
    filter === "all" ? memories : memories.filter((m) => m.category === filter);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Personal Memories</CardTitle>
          <CardDescription>
            Facts and preferences Nova has learned about you from your
            conversations. These are yours alone and persist across all chats.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filter bar */}
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Filter className="size-4 text-muted-foreground" />
            <button
              onClick={() => setFilter("all")}
              className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                filter === "all"
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              All ({memories.length})
            </button>
            {categories.map((cat) => {
              const meta = CATEGORY_META[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setFilter(cat)}
                  className={`rounded-full border px-2.5 py-0.5 text-xs transition-colors ${
                    filter === cat
                      ? meta.color
                      : "border-border text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {meta.label} (
                  {memories.filter((m) => m.category === cat).length})
                </button>
              );
            })}
          </div>

          {/* Memory list */}
          <div className="space-y-2">
            {filtered.map((mem) => {
              const meta = CATEGORY_META[mem.category];
              const Icon = meta.icon;

              return (
                <div
                  key={mem.id}
                  className="flex items-start gap-3 rounded-lg border border-border p-3"
                >
                  <span
                    className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border ${meta.color}`}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{mem.content}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{meta.label}</span>
                      {mem.confidence < 1 && (
                        <>
                          <span>·</span>
                          <span>
                            {Math.round(mem.confidence * 100)}% confident
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
