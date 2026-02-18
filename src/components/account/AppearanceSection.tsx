"use client";

import { useSyncExternalStore } from "react";
import { useTheme } from "next-themes";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import { Monitor, Moon, Sun, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const emptySubscribe = () => () => {};

const themes = [
  { key: "light", label: "Light", icon: Sun, accent: "bg-amber-100" },
  { key: "dark", label: "Dark", icon: Moon, accent: "bg-slate-800" },
  {
    key: "system",
    label: "System",
    icon: Monitor,
    accent: "bg-gradient-to-br from-amber-100 to-slate-800",
  },
] as const;

export default function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  if (!mounted) return null;

  return (
    <div className="flex-1 space-y-8 p-6">
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-foreground">Appearance</h3>
        <p className="text-sm text-muted-foreground">
          Customize how the app looks and feels
        </p>
      </div>

      <Separator />

      {/* Theme selection */}
      <div className="space-y-4">
        <Label>Theme</Label>
        <div className="grid grid-cols-3 gap-4 max-w-md">
          {themes.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setTheme(key)}
              className={cn(
                "relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all cursor-pointer",
                theme === key
                  ? "border-primary bg-primary/5 shadow-sm"
                  : "border-border hover:border-muted-foreground/30 hover:bg-accent/30",
              )}
            >
              {theme === key && (
                <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Check className="size-3" />
                </span>
              )}
              <span
                className={cn(
                  "flex size-10 items-center justify-center rounded-lg transition-colors",
                  theme === key
                    ? "bg-primary/10 text-primary"
                    : "bg-muted text-muted-foreground",
                )}
              >
                <Icon className="size-5" />
              </span>
              <span
                className={cn(
                  "text-sm font-medium",
                  theme === key ? "text-primary" : "text-foreground",
                )}
              >
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
