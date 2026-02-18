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
  Heart,
  MessageCircle,
  ThumbsUp,
  Swords,
  Sprout,
  Shield,
  Gift,
  Filter,
} from "lucide-react";
import type {
  SharedInsightRow,
  SharedInsightCategory,
} from "@/types/sharedInsight";

interface Props {
  insights: SharedInsightRow[];
  userId: string;
}

const CATEGORY_META: Record<
  SharedInsightCategory,
  { label: string; icon: React.ElementType; color: string }
> = {
  emotional_need: {
    label: "Emotional need",
    icon: Heart,
    color: "text-pink-500 bg-pink-500/10 border-pink-500/20",
  },
  communication: {
    label: "Communication",
    icon: MessageCircle,
    color: "text-blue-500 bg-blue-500/10 border-blue-500/20",
  },
  appreciation: {
    label: "Appreciation",
    icon: ThumbsUp,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  },
  conflict_style: {
    label: "Conflict style",
    icon: Swords,
    color: "text-red-500 bg-red-500/10 border-red-500/20",
  },
  growth_area: {
    label: "Growth area",
    icon: Sprout,
    color: "text-green-500 bg-green-500/10 border-green-500/20",
  },
  strength: {
    label: "Strength",
    icon: Shield,
    color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20",
  },
  gift_relevant: {
    label: "Gift relevant",
    icon: Gift,
    color: "text-purple-500 bg-purple-500/10 border-purple-500/20",
  },
};

export default function SharedInsightsTab({ insights, userId }: Props) {
  const [filter, setFilter] = useState<SharedInsightCategory | "all">("all");

  if (!insights.length) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relationship Insights</CardTitle>
          <CardDescription>
            No insights yet. Nova generates relationship insights as it learns
            more about you and your partner through conversations.
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const categories = [...new Set(insights.map((i) => i.category))];
  const filtered =
    filter === "all" ? insights : insights.filter((i) => i.category === filter);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Relationship Insights</CardTitle>
          <CardDescription>
            High-level observations Nova has learned about your relationship
            dynamics. These help Nova give you better advice.
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
              All ({insights.length})
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
                  {insights.filter((i) => i.category === cat).length})
                </button>
              );
            })}
          </div>

          {/* Insight cards grid */}
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((ins) => {
              const meta = CATEGORY_META[ins.category];
              const Icon = meta.icon;
              const aboutLabel =
                ins.about_user === userId
                  ? "About you"
                  : ins.about_user
                    ? "About partner"
                    : "Relationship";

              return (
                <div
                  key={ins.id}
                  className="rounded-lg border border-border p-4 space-y-2"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex size-6 items-center justify-center rounded-md border ${meta.color}`}
                    >
                      <Icon className="size-3" />
                    </span>
                    <h4 className="text-sm font-medium text-foreground">
                      {ins.title}
                    </h4>
                  </div>
                  <p className="text-sm text-muted-foreground">{ins.content}</p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span>{aboutLabel}</span>
                    <span>·</span>
                    <span>{meta.label}</span>
                    {ins.confidence < 1 && (
                      <>
                        <span>·</span>
                        <span>
                          {Math.round(ins.confidence * 100)}% confident
                        </span>
                      </>
                    )}
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
