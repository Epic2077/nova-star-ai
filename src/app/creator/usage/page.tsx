"use client";

import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useCreatorAdmin } from "@/components/creator/CreatorAdminContext";
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

type ChartRange = "7d" | "14d" | "30d";

const RANGE_OPTIONS: { value: ChartRange; label: string }[] = [
  { value: "7d", label: "7 days" },
  { value: "14d", label: "14 days" },
  { value: "30d", label: "30 days" },
];

const PROVIDER_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-rose-500",
  "bg-cyan-500",
];

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CreatorUsagePage() {
  const { result } = useCreatorAdmin();
  const [chartRange, setChartRange] = useState<ChartRange>("14d");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!result) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          Search for a user email above to view token usage data.
        </CardContent>
      </Card>
    );
  }

  const usage = result.usage;

  if (!usage) {
    return (
      <Card>
        <CardContent className="pt-6 text-sm text-muted-foreground">
          No usage data available for this user.
        </CardContent>
      </Card>
    );
  }

  const todayPct = pct(usage.today, usage.limit);

  return (
    <CreatorUsageInner
      usage={usage}
      todayPct={todayPct}
      email={result.user.email}
      chartRange={chartRange}
      setChartRange={setChartRange}
      hoveredIdx={hoveredIdx}
      setHoveredIdx={setHoveredIdx}
    />
  );
}

/* Separate inner component so hooks like useMemo work unconditionally */
function CreatorUsageInner({
  usage,
  todayPct,
  email,
  chartRange,
  setChartRange,
  hoveredIdx,
  setHoveredIdx,
}: {
  usage: NonNullable<ReturnType<typeof useCreatorAdmin>["result"]>["usage"] &
    object;
  todayPct: number;
  email: string;
  chartRange: ChartRange;
  setChartRange: (r: ChartRange) => void;
  hoveredIdx: number | null;
  setHoveredIdx: (i: number | null) => void;
}) {
  const daily = useMemo(
    () => usage.dailyBreakdown ?? [],
    [usage.dailyBreakdown],
  );

  const chartData = useMemo(() => {
    const days = chartRange === "7d" ? 7 : chartRange === "14d" ? 14 : 30;
    return daily.slice(-days);
  }, [daily, chartRange]);

  const chartMax = useMemo(() => {
    if (chartData.length === 0) return 1;
    return Math.max(...chartData.map((d) => d.tokens), 1);
  }, [chartData]);

  const providerTotal = useMemo(
    () => usage.byProvider.reduce((s, p) => s + p.tokens, 0),
    [usage.byProvider],
  );

  return (
    <div className="space-y-6">
      {/* Daily quota */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Zap className="size-4 text-primary" />
            Daily Allowance — {email}
          </CardTitle>
          <CardDescription>
            Rolling 24-hour window · {formatTokens(usage.limit)} token limit
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-end justify-between text-sm">
            <span className="font-medium text-foreground">
              {formatTokens(usage.today)}{" "}
              <span className="text-muted-foreground font-normal">
                / {formatTokens(usage.limit)} tokens
              </span>
            </span>
            <span
              className={cn(
                "text-xs font-medium",
                todayPct >= 80 ? "text-destructive" : "text-muted-foreground",
              )}
            >
              {todayPct}%
            </span>
          </div>

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

      {/* Stats overview */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <StatsCard icon={Zap} label="Today" value={formatTokens(usage.today)} />
        <StatsCard
          icon={Clock}
          label="Last 7 days"
          value={formatTokens(usage.last7Days)}
        />
        <StatsCard
          icon={TrendingUp}
          label="Last 30 days"
          value={formatTokens(usage.last30Days)}
        />
        <StatsCard
          icon={Activity}
          label="All time"
          value={formatTokens(usage.allTime)}
        />
      </div>

      {/* ── Daily usage chart ──────────────────────────────────── */}
      {chartData.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="size-4 text-primary" />
                Daily Usage
              </CardTitle>
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

      {/* Breakdowns */}
      {(usage.byProvider.length > 0 || usage.byEndpoint.length > 0) && (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {usage.byProvider.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">By Provider (30 days)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {providerTotal > 0 && (
                  <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
                    {usage.byProvider.map(({ provider, tokens }, i) => {
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
                <div className="space-y-2">
                  {usage.byProvider.map(({ provider, tokens }, i) => (
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

          {usage.byEndpoint.length > 0 && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">By Type (30 days)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {usage.byEndpoint.map(({ endpoint, tokens }) => {
                  const epPct =
                    usage.last30Days > 0
                      ? (tokens / usage.last30Days) * 100
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
    </div>
  );
}

/* ---- Sub-component ---- */

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
