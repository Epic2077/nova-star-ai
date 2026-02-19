"use client";

import React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useCreatorAdmin } from "@/components/creator/CreatorAdminContext";
import { formatTimestamp } from "@/lib/formatTimestamp";
import type { PersonalMemoryCategory } from "@/types/personalMemory";

const CATEGORY_COLORS: Record<PersonalMemoryCategory, string> = {
  preference: "text-blue-600 bg-blue-500/10 border-blue-500/20",
  emotional_need: "text-pink-600 bg-pink-500/10 border-pink-500/20",
  important_date: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  growth_moment: "text-green-600 bg-green-500/10 border-green-500/20",
  pattern: "text-purple-600 bg-purple-500/10 border-purple-500/20",
  goal: "text-cyan-600 bg-cyan-500/10 border-cyan-500/20",
  general: "text-slate-600 bg-slate-500/10 border-slate-500/20",
};

export default function CreatorPersonalMemoriesPage() {
  const { result } = useCreatorAdmin();
  const nova = result?.nova;
  const memories = nova?.personalMemories ?? [];

  if (!result) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Search for a user email above to view personal memories.
        </CardContent>
      </Card>
    );
  }

  // Category breakdown
  const categoryCounts = memories.reduce(
    (acc, m) => {
      acc[m.category] = (acc[m.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Personal Memories ({memories.length})</CardTitle>
          <CardDescription>
            Cross-chat memories about this user (no partnership required).
          </CardDescription>
        </CardHeader>
        {Object.keys(categoryCounts).length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryCounts).map(([cat, count]) => (
                <span
                  key={cat}
                  className={`rounded-full border px-2.5 py-0.5 text-xs ${CATEGORY_COLORS[cat as PersonalMemoryCategory] ?? ""}`}
                >
                  {cat.replace("_", " ")} ({count})
                </span>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Table */}
      {memories.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Category</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead className="w-20 text-right">Confidence</TableHead>
                  <TableHead className="w-32">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {memories.map((mem) => (
                  <TableRow key={mem.id}>
                    <TableCell>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${CATEGORY_COLORS[mem.category] ?? ""}`}
                      >
                        {mem.category.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell>{mem.content}</TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {Math.round(mem.confidence * 100)}%
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTimestamp(mem.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {memories.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No personal memories have been extracted yet for this user.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
