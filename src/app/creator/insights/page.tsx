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
import type { SharedInsightCategory } from "@/types/sharedInsight";

const CATEGORY_COLORS: Record<SharedInsightCategory, string> = {
  emotional_need: "text-pink-600 bg-pink-500/10 border-pink-500/20",
  communication: "text-blue-600 bg-blue-500/10 border-blue-500/20",
  appreciation: "text-amber-600 bg-amber-500/10 border-amber-500/20",
  conflict_style: "text-red-600 bg-red-500/10 border-red-500/20",
  growth_area: "text-green-600 bg-green-500/10 border-green-500/20",
  strength: "text-emerald-600 bg-emerald-500/10 border-emerald-500/20",
  gift_relevant: "text-purple-600 bg-purple-500/10 border-purple-500/20",
};

export default function CreatorInsightsPage() {
  const { result } = useCreatorAdmin();
  const nova = result?.nova;
  const insights = nova?.insights ?? [];

  if (!result) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Search for a user email above to view relationship insights.
        </CardContent>
      </Card>
    );
  }

  if (!nova?.partnership) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Relationship Insights</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            This user has no active partnership — insights require one.
          </p>
        </CardContent>
      </Card>
    );
  }

  const categoryCounts = insights.reduce(
    (acc, i) => {
      acc[i.category] = (acc[i.category] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Relationship Insights ({insights.length})</CardTitle>
          <CardDescription>
            Active insights for partnership {nova.partnership.id.slice(0, 8)}…
          </CardDescription>
        </CardHeader>
        {Object.keys(categoryCounts).length > 0 && (
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {Object.entries(categoryCounts).map(([cat, count]) => (
                <span
                  key={cat}
                  className={`rounded-full border px-2.5 py-0.5 text-xs ${CATEGORY_COLORS[cat as SharedInsightCategory] ?? ""}`}
                >
                  {cat.replace("_", " ")} ({count})
                </span>
              ))}
            </div>
          </CardContent>
        )}
      </Card>

      {/* Table */}
      {insights.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-28">Category</TableHead>
                  <TableHead className="w-40">Title</TableHead>
                  <TableHead>Content</TableHead>
                  <TableHead className="w-24">About</TableHead>
                  <TableHead className="w-20 text-right">Confidence</TableHead>
                  <TableHead className="w-32">Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {insights.map((ins) => (
                  <TableRow key={ins.id}>
                    <TableCell>
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs ${CATEGORY_COLORS[ins.category] ?? ""}`}
                      >
                        {ins.category.replace("_", " ")}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{ins.title}</TableCell>
                    <TableCell>{ins.content}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {ins.about_user === result.user.id
                        ? "User"
                        : ins.about_user
                          ? "Partner"
                          : "Relationship"}
                    </TableCell>
                    <TableCell className="text-right font-mono text-xs">
                      {Math.round(ins.confidence * 100)}%
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {formatTimestamp(ins.created_at)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {insights.length === 0 && (
        <Card>
          <CardContent className="pt-6 text-sm text-muted-foreground">
            No relationship insights have been extracted yet.
          </CardContent>
        </Card>
      )}
    </div>
  );
}
