"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Separator } from "@/components/ui/separator";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Activity,
  Zap,
  Clock,
  TrendingUp,
  BarChart3,
  Calendar,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface UsageStats {
  today: number;
  last7Days: number;
  last30Days: number;
  allTime: number;
  limit: number;
  byProvider: { provider: string; tokens: number }[];
  byEndpoint: { endpoint: string; tokens: number }[];
  dailyBreakdown: { date: string; tokens: number }[];
}

type ChartRange = "7d" | "14d" | "30d";

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function pct(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function barColor(percent: number): string {
  if (percent < 50) return "bg-emerald-500";
  if (percent < 80) return "bg-amber-500";
  return "bg-red-500";
}

function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const endpointLabels: Record<string, string> = {
  chat: "Chat",
  title: "Title generation",
  memory: "Memory summarization",
  extraction: "Memory extraction",
};

const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "14d", label: "14 days" },
  { value: "30d", label: "30 days" },
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function UsageSection() {
  const [stats, setStats] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [chartRange, setChartRange] = useState<ChartRange>("14d");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/chat/usage");
      if (!res.ok) throw new Error("Failed to fetch usage data");
      const data: UsageStats = await res.json();
      setStats(data);
      setError(null);
    } catch {
      setError("Unable to load usage data");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  const todayPct = stats ? pct(stats.today, stats.limit) : 0;

  /* Slice daily data based on selected range */
  const chartData = useMemo(() => {
    if (!stats?.dailyBreakdown) return [];
    const days = chartRange === "7d" ? 7 : chartRange === "14d" ? 14 : 30;
    return stats.dailyBreakdown.slice(-days);
  }, [stats, chartRange]);

  const chartMax = useMemo(() => {
    if (chartData.length === 0) return 1;
    return Math.max(...chartData.map((d) => d.tokens), 1);
  }, [chartData]);

  /* Provider percentages for donut-style bar */
  const providerTotal = useMemo(() => {
    if (!stats) return 0;
    return stats.byProvider.reduce((s, p) => s + p.tokens, 0);
  }, [stats]);

  return (
    <div className="flex-1 space-y-8 p-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">Usage</h3>
        <p className="text-sm text-muted-foreground">
          Track your token usage and daily limits
        </p>
      </div>

      <Separator />

      {loading && (
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <Activity className="size-4 animate-pulse" />
          Loading usage data…
        </div>
      )}

      {error && <p className="text-sm text-destructive">{error}</p>}

      {stats && !loading && (
        <>
          {/* Daily quota bar */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Zap className="size-4 text-primary" />
                Daily Allowance
              </CardTitle>
              <CardDescription>
                Rolling 24-hour window · resets continuously
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-end justify-between text-sm">
                <span className="font-medium text-foreground">
                  {formatTokens(stats.today)}{" "}
                  <span className="text-muted-foreground font-normal">
                    / {formatTokens(stats.limit)} tokens
                  </span>
                </span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    todayPct >= 80
                      ? "text-destructive"
                      : "text-muted-foreground",
                  )}
                >
                  {todayPct}%
                </span>
              </div>

              {/* Progress bar */}
              <div className="h-2.5 w-full rounded-full bg-muted overflow-hidden">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-500",
                    barColor(todayPct),
                  )}
                  style={{ width: `${todayPct}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Stats cards */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <StatsCard
              icon={Clock}
              label="Last 7 days"
              value={formatTokens(stats.last7Days)}
            />
            <StatsCard
              icon={TrendingUp}
              label="Last 30 days"
              value={formatTokens(stats.last30Days)}
            />
            <StatsCard
              icon={Activity}
              label="All time"
              value={formatTokens(stats.allTime)}
            />
          </div>

          {/* ── Daily usage chart ────────────────────────────────── */}
          {chartData.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <BarChart3 className="size-4 text-primary" />
                    Daily Usage
                  </CardTitle>
                  {/* Range selector */}
                  <div className="flex items-center gap-1 rounded-lg border border-border p-0.5">
                    {RANGE_OPTIONS.map((opt) => (
                      <button
                        key={opt.value}
                        onClick={() => setChartRange(opt.value)}
                        className={cn(
                          "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                          chartRange === opt.value
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground",
                        )}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
                <CardDescription>Tokens consumed per day</CardDescription>
              </CardHeader>
              <CardContent>
                {/* Tooltip area */}
                {hoveredIdx !== null && chartData[hoveredIdx] && (
                  <div className="mb-2 flex items-center gap-2 text-sm">
                    <Calendar className="size-3.5 text-muted-foreground" />
                    <span className="font-medium text-foreground">
                      {shortDate(chartData[hoveredIdx].date)}
                    </span>
                    <span className="text-muted-foreground">—</span>
                    <span className="font-semibold text-primary">
                      {formatTokens(chartData[hoveredIdx].tokens)} tokens
                    </span>
                  </div>
                )}
                {hoveredIdx === null && (
                  <div className="mb-2 h-5 text-xs text-muted-foreground">
                    Hover over bars to see daily details
                  </div>
                )}

                {/* Bar chart */}
                <div className="flex items-end gap-0.75 h-40">
                  {chartData.map((day, i) => {
                    const heightPct =
                      chartMax > 0 ? (day.tokens / chartMax) * 100 : 0;
                    const isToday = i === chartData.length - 1;
                    return (
                      <div
                        key={day.date}
                        className="group relative flex flex-1 flex-col items-center justify-end h-full"
                        onMouseEnter={() => setHoveredIdx(i)}
                        onMouseLeave={() => setHoveredIdx(null)}
                      >
                        {/* Bar */}
                        <div
                          className={cn(
                            "w-full min-h-0.5 rounded-t-sm transition-all duration-300 cursor-pointer",
                            hoveredIdx === i
                              ? "bg-primary"
                              : isToday
                                ? "bg-primary/80"
                                : "bg-primary/40",
                          )}
                          style={{ height: `${Math.max(heightPct, 1)}%` }}
                        />
                      </div>
                    );
                  })}
                </div>

                {/* X-axis labels */}
                <div className="flex gap-0.75 mt-1.5">
                  {chartData.map((day, i) => {
                    const showLabel =
                      chartData.length <= 7 ||
                      (chartData.length <= 14 && i % 2 === 0) ||
                      (chartData.length > 14 && i % 5 === 0) ||
                      i === chartData.length - 1;
                    return (
                      <div
                        key={day.date}
                        className="flex-1 text-center text-[10px] text-muted-foreground truncate"
                      >
                        {showLabel ? shortDate(day.date) : ""}
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Breakdown section ────────────────────────────────── */}
          {(stats.byProvider.length > 0 || stats.byEndpoint.length > 0) && (
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              {/* By provider — horizontal stacked bar + list */}
              {stats.byProvider.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      By Provider (30 days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* Stacked bar */}
                    {providerTotal > 0 && (
                      <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                        {stats.byProvider.map(({ provider, tokens }, i) => {
                          const w = (tokens / providerTotal) * 100;
                          return (
                            <div
                              key={provider}
                              className={cn(
                                "h-full transition-all",
                                PROVIDER_COLORS[i % PROVIDER_COLORS.length],
                              )}
                              style={{ width: `${w}%` }}
                              title={`${provider}: ${formatTokens(tokens)}`}
                            />
                          );
                        })}
                      </div>
                    )}
                    {/* Legend */}
                    <div className="space-y-2">
                      {stats.byProvider.map(({ provider, tokens }, i) => (
                        <div
                          key={provider}
                          className="flex items-center justify-between text-sm"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                "inline-block size-2.5 rounded-full",
                                PROVIDER_COLORS[i % PROVIDER_COLORS.length],
                              )}
                            />
                            <span className="capitalize text-foreground">
                              {provider}
                            </span>
                          </div>
                          <span className="font-medium tabular-nums text-muted-foreground">
                            {formatTokens(tokens)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* By endpoint */}
              {stats.byEndpoint.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      By Type (30 days)
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {stats.byEndpoint.map(({ endpoint, tokens }) => {
                      const epPct =
                        stats.last30Days > 0
                          ? (tokens / stats.last30Days) * 100
                          : 0;
                      return (
                        <div key={endpoint} className="space-y-1.5">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-foreground">
                              {endpointLabels[endpoint] ?? endpoint}
                            </span>
                            <span className="font-medium tabular-nums text-muted-foreground">
                              {formatTokens(tokens)}
                            </span>
                          </div>
                          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full bg-primary/60 transition-all duration-500"
                              style={{ width: `${epPct}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components & constants                                         */
/* ------------------------------------------------------------------ */

const PROVIDER_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

function StatsCard({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-3 p-4">
        <span className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon className="size-4" />
        </span>
        <div>
          <p className="text-xs text-muted-foreground">{label}</p>
          <p className="text-lg font-semibold text-foreground">{value}</p>
        </div>
      </CardContent>
    </Card>
  );
}
