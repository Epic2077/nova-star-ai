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
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Bookmark,
  Heart,
  Calendar,
  Gift,
  Sprout,
  Repeat,
  MessageSquare,
  Filter,
  ThumbsUp,
  ThumbsDown,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import type {
  SharedMemoryRow,
  SharedMemoryCategory,
} from "@/types/sharedMemory";

interface Props {
  memories: SharedMemoryRow[];
  userId: string;
  onRefresh?: () => void;
}

const CATEGORY_META: Record<
  SharedMemoryCategory,
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
  gift_idea: {
    label: "Gift idea",
    icon: Gift,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
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
  general: {
    label: "General",
    icon: MessageSquare,
    color: "text-slate-500 bg-slate-500/10 border-slate-500/20",
  },
};

async function memoryAction(
  id: string,
  action: "confirm" | "wrong" | "delete",
  onRefresh?: () => void,
) {
  const method = action === "delete" ? "DELETE" : "PATCH";
  const body =
    action === "delete"
      ? { id, type: "shared" }
      : { id, type: "shared", action };

  const res = await fetch("/api/nova-profile/memory", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    toast.error("Something went wrong. Please try again.");
    return;
  }

  const data = await res.json();

  if (action === "confirm") {
    toast.success("Memory confirmed — confidence boosted.");
  } else if (action === "wrong") {
    toast.success(
      data.deactivated
        ? "Memory removed — confidence was too low."
        : "Memory marked as wrong — confidence lowered.",
    );
  } else {
    toast.success("Memory deleted.");
  }

  onRefresh?.();
}

export default function SharedMemoriesTab({
  memories,
  userId,
  onRefresh,
}: Props) {
  const [filter, setFilter] = useState<SharedMemoryCategory | "all">("all");

  if (!memories.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Shared Memories</CardTitle>
          <CardDescription>
            No memories yet. As you chat with Nova, it will remember important
            details about you and your partner here.
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
          <CardTitle>Shared Memories</CardTitle>
          <CardDescription>
            Facts and preferences Nova has learned from your conversations.
            These persist across all chats.
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
              const aboutLabel =
                mem.about_user === userId
                  ? "About you"
                  : mem.about_user
                    ? "About partner"
                    : "Relationship";

              return (
                <div
                  key={mem.id}
                  className="group flex items-start gap-3 rounded-lg border border-border p-3 transition-colors hover:bg-muted/40"
                >
                  <span
                    className={`mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md border ${meta.color}`}
                  >
                    <Icon className="size-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-foreground">{mem.content}</p>
                    <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                      <span>{aboutLabel}</span>
                      <span>·</span>
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

                  {/* Action buttons — visible on hover (desktop) / always visible on touch */}
                  <TooltipProvider>
                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 max-sm:opacity-100">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() =>
                              memoryAction(mem.id, "confirm", onRefresh)
                            }
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-green-500/10 hover:text-green-500"
                          >
                            <ThumbsUp className="size-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Confirm — boost confidence</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() =>
                              memoryAction(mem.id, "wrong", onRefresh)
                            }
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-orange-500/10 hover:text-orange-500"
                          >
                            <ThumbsDown className="size-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Wrong — lower confidence</p>
                        </TooltipContent>
                      </Tooltip>

                      <Tooltip>
                        <TooltipTrigger asChild>
                          <button
                            onClick={() =>
                              memoryAction(mem.id, "delete", onRefresh)
                            }
                            className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-red-500/10 hover:text-red-500"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <p>Delete memory</p>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </TooltipProvider>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
