"use client";

import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Suspense } from "react";
import { User, Palette, Shield, Heart, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  {
    key: "profile",
    label: "Profile",
    icon: User,
    description: "Manage your personal info",
  },
  {
    key: "appearance",
    label: "Appearance",
    icon: Palette,
    description: "Theme & display settings",
  },
  {
    key: "security",
    label: "Security",
    icon: Shield,
    description: "Password & account safety",
  },
  {
    key: "usage",
    label: "Usage",
    icon: Activity,
    description: "Token usage & limits",
  },
  {
    key: "partnership",
    label: "Partnership",
    icon: Heart,
    description: "Link with your partner",
  },
] as const;

function AsideNav() {
  const searchParams = useSearchParams();
  const active = searchParams.get("section") ?? "profile";

  return (
    <>
      {/* ── Mobile: horizontal scrollable tabs ── */}
      <nav
        className="flex gap-1.5 overflow-x-auto pb-2 md:hidden -mx-1 px-1"
        style={{ scrollbarWidth: "none" }}
      >
        {navItems.map(({ key, label, icon: Icon }) => (
          <Link
            key={key}
            href={`/setting/account?section=${key}`}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
              active === key
                ? "border-primary/30 bg-primary/10 text-primary font-medium"
                : "border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground",
            )}
          >
            <Icon className="size-3.5" />
            {label}
          </Link>
        ))}
      </nav>

      {/* ── Desktop: vertical sidebar ── */}
      <aside className="hidden w-64 shrink-0 border-r border-border py-2 pr-4 md:block">
        <nav className="flex flex-col gap-1">
          {navItems.map(({ key, label, icon: Icon, description }) => (
            <Link
              key={key}
              href={`/setting/account?section=${key}`}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                active === key
                  ? "bg-primary/10 text-primary font-medium"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "flex size-8 items-center justify-center rounded-md border transition-colors",
                  active === key
                    ? "border-primary/20 bg-primary/10 text-primary"
                    : "border-border bg-muted text-muted-foreground group-hover:text-foreground",
                )}
              >
                <Icon className="size-4" />
              </span>
              <div className="flex flex-col">
                <span>{label}</span>
                <span className="text-xs text-muted-foreground">
                  {description}
                </span>
              </div>
            </Link>
          ))}
        </nav>
      </aside>
    </>
  );
}

export default function Aside() {
  return (
    <Suspense
      fallback={
        <>
          <div className="h-10 md:hidden" />
          <aside className="hidden w-64 md:block" />
        </>
      }
    >
      <AsideNav />
    </Suspense>
  );
}
