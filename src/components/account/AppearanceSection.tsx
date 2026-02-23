"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";
import { useTheme } from "next-themes";
import { Separator } from "@/components/ui/separator";
import { Label } from "@/components/ui/label";
import {
  Monitor,
  Moon,
  Sun,
  Waves,
  TreePine,
  Palette,
  Check,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Constants                                                         */
/* ------------------------------------------------------------------ */

const emptySubscribe = () => () => {};

const CUSTOM_THEME_KEY = "nova-custom-theme";

interface PresetTheme {
  key: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  preview: { bg: string; fg: string; accent: string };
}

const presetThemes: PresetTheme[] = [
  {
    key: "light",
    label: "Light",
    icon: Sun,
    preview: { bg: "#f6d1d1", fg: "#2b2b2b", accent: "#d4735c" },
  },
  {
    key: "dark",
    label: "Dark",
    icon: Moon,
    preview: { bg: "#1e1e1e", fg: "#f5f5f5", accent: "#e0e0e0" },
  },
  {
    key: "system",
    label: "System",
    icon: Monitor,
    preview: {
      bg: "linear-gradient(135deg,#f6d1d1 50%,#1e1e1e 50%)",
      fg: "#2b2b2b",
      accent: "#888",
    },
  },
  {
    key: "ocean",
    label: "Ocean",
    icon: Waves,
    preview: { bg: "#1a2a40", fg: "#e8f0f8", accent: "#4da6c9" },
  },
  {
    key: "forest",
    label: "Forest",
    icon: TreePine,
    preview: { bg: "#1a2e1a", fg: "#e2edd6", accent: "#5cb85c" },
  },
];

/* ---- Custom theme colour slots ---- */
interface CustomColors {
  background: string;
  foreground: string;
  primary: string;
  card: string;
  accent: string;
  muted: string;
  border: string;
}

const defaultCustomColors: CustomColors = {
  background: "#1e1e2e",
  foreground: "#cdd6f4",
  primary: "#89b4fa",
  card: "#28283e",
  accent: "#f5c2e7",
  muted: "#313244",
  border: "#45475a",
};

const colorSlotLabels: Record<keyof CustomColors, string> = {
  background: "Background",
  foreground: "Text",
  primary: "Primary",
  card: "Card",
  accent: "Accent",
  muted: "Muted",
  border: "Border",
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                           */
/* ------------------------------------------------------------------ */

/** Read saved custom colours from localStorage */
function loadCustomColors(): CustomColors {
  if (typeof window === "undefined") return defaultCustomColors;
  try {
    const raw = localStorage.getItem(CUSTOM_THEME_KEY);
    if (raw) return { ...defaultCustomColors, ...JSON.parse(raw) };
  } catch {
    /* ignore */
  }
  return defaultCustomColors;
}

/** Persist and apply custom CSS variables to <html> */
function applyCustomColors(colors: CustomColors) {
  localStorage.setItem(CUSTOM_THEME_KEY, JSON.stringify(colors));
  const root = document.documentElement;
  root.style.setProperty("--background", colors.background);
  root.style.setProperty("--foreground", colors.foreground);
  root.style.setProperty("--primary", colors.primary);
  root.style.setProperty("--primary-foreground", colors.background);
  root.style.setProperty("--card", colors.card);
  root.style.setProperty("--card-foreground", colors.foreground);
  root.style.setProperty("--popover", colors.card);
  root.style.setProperty("--popover-foreground", colors.foreground);
  root.style.setProperty("--accent", colors.accent);
  root.style.setProperty("--accent-foreground", colors.foreground);
  root.style.setProperty("--muted", colors.muted);
  root.style.setProperty("--muted-foreground", colors.foreground + "99");
  root.style.setProperty("--secondary", colors.muted);
  root.style.setProperty("--secondary-foreground", colors.foreground);
  root.style.setProperty("--border", colors.border);
  root.style.setProperty("--input", colors.border);
  root.style.setProperty("--ring", colors.primary);
  root.style.setProperty("--chat-background", colors.background);
  root.style.setProperty("--chat-input", colors.card);
  root.style.setProperty("--chat-bubble", colors.muted);
  root.style.setProperty("--hidden-message", colors.muted);
  root.style.setProperty("--sidebar", colors.card);
  root.style.setProperty("--sidebar-foreground", colors.foreground);
  root.style.setProperty("--sidebar-primary", colors.primary);
  root.style.setProperty("--sidebar-primary-foreground", colors.foreground);
  root.style.setProperty("--sidebar-accent", colors.muted);
  root.style.setProperty("--sidebar-accent-foreground", colors.foreground);
  root.style.setProperty("--sidebar-border", colors.border);
  root.style.setProperty("--sidebar-ring", colors.primary);
}

/** Strip inline custom vars so CSS-class theme takes over again */
function clearCustomColorVars() {
  const root = document.documentElement;
  const props = [
    "--background",
    "--foreground",
    "--primary",
    "--primary-foreground",
    "--card",
    "--card-foreground",
    "--popover",
    "--popover-foreground",
    "--accent",
    "--accent-foreground",
    "--muted",
    "--muted-foreground",
    "--secondary",
    "--secondary-foreground",
    "--border",
    "--input",
    "--ring",
    "--chat-background",
    "--chat-input",
    "--chat-bubble",
    "--hidden-message",
    "--sidebar",
    "--sidebar-foreground",
    "--sidebar-primary",
    "--sidebar-primary-foreground",
    "--sidebar-accent",
    "--sidebar-accent-foreground",
    "--sidebar-border",
    "--sidebar-ring",
  ];
  props.forEach((p) => root.style.removeProperty(p));
}

/* ------------------------------------------------------------------ */
/*  Component                                                         */
/* ------------------------------------------------------------------ */

export default function AppearanceSection() {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const [customColors, setCustomColors] =
    useState<CustomColors>(defaultCustomColors);
  const [customExpanded, setCustomExpanded] = useState(false);

  /* Load saved custom colours once */
  useEffect(() => {
    setCustomColors(loadCustomColors());
  }, []);

  /* When switching TO custom-theme, apply colours; switching AWAY, clear them */
  useEffect(() => {
    if (!mounted) return;
    if (theme === "custom-theme") {
      applyCustomColors(customColors);
    } else {
      clearCustomColorVars();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [theme, mounted]);

  const handlePresetClick = useCallback(
    (key: string) => {
      if (key !== "custom-theme") clearCustomColorVars();
      setTheme(key);
      if (key === "custom-theme") {
        setCustomExpanded(true);
        applyCustomColors(customColors);
      }
    },
    [customColors, setTheme],
  );

  const handleColorChange = useCallback(
    (slot: keyof CustomColors, value: string) => {
      setCustomColors((prev) => {
        const next = { ...prev, [slot]: value };
        applyCustomColors(next);
        return next;
      });
    },
    [],
  );

  const handleResetCustom = useCallback(() => {
    setCustomColors(defaultCustomColors);
    applyCustomColors(defaultCustomColors);
  }, []);

  const isCustom = theme === "custom-theme";

  /* Build the full list: presets + custom */
  const allThemes = useMemo(
    () => [
      ...presetThemes,
      {
        key: "custom-theme",
        label: "Custom",
        icon: Palette,
        preview: {
          bg: customColors.background,
          fg: customColors.foreground,
          accent: customColors.primary,
        },
      },
    ],
    [customColors],
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

      {/* Theme grid */}
      <div className="space-y-4">
        <Label>Theme</Label>
        <div className="grid grid-cols-3 gap-4 max-w-lg">
          {allThemes.map(({ key, label, icon: Icon, preview }) => {
            const active = theme === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => handlePresetClick(key)}
                className={cn(
                  "relative flex flex-col items-center gap-3 rounded-xl border-2 p-4 transition-all cursor-pointer",
                  active
                    ? "border-primary bg-primary/5 shadow-sm"
                    : "border-border hover:border-muted-foreground/30 hover:bg-accent/30",
                )}
              >
                {active && (
                  <span className="absolute top-2 right-2 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <Check className="size-3" />
                  </span>
                )}

                {/* Mini preview swatch */}
                <span
                  className="flex size-10 items-center justify-center rounded-lg overflow-hidden"
                  style={{
                    background: preview.bg,
                  }}
                >
                  <Icon className="size-5" style={{ color: preview.accent }} />
                </span>

                <span
                  className={cn(
                    "text-sm font-medium",
                    active ? "text-primary" : "text-foreground",
                  )}
                >
                  {label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Custom colour picker (expandable) */}
      {(isCustom || customExpanded) && (
        <>
          <Separator />
          <div className="space-y-4 max-w-lg">
            <div className="flex items-center justify-between">
              <Label className="text-base">Custom Theme Colors</Label>
              <button
                type="button"
                onClick={handleResetCustom}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <RotateCcw className="size-3.5" />
                Reset
              </button>
            </div>

            <div className="grid grid-cols-2 gap-x-6 gap-y-4">
              {(Object.keys(colorSlotLabels) as (keyof CustomColors)[]).map(
                (slot) => (
                  <label key={slot} className="flex items-center gap-3">
                    <input
                      type="color"
                      value={customColors[slot]}
                      onChange={(e) => handleColorChange(slot, e.target.value)}
                      className="size-8 cursor-pointer rounded-md border border-border bg-transparent p-0.5 [&::-webkit-color-swatch-wrapper]:p-0 [&::-webkit-color-swatch]:rounded-sm [&::-webkit-color-swatch]:border-none"
                    />
                    <span className="text-sm text-foreground">
                      {colorSlotLabels[slot]}
                    </span>
                  </label>
                ),
              )}
            </div>

            {/* Live preview strip */}
            <div
              className="mt-2 flex items-center gap-3 rounded-lg border p-3"
              style={{
                background: customColors.background,
                borderColor: customColors.border,
              }}
            >
              <span
                className="rounded-md px-3 py-1 text-xs font-semibold"
                style={{
                  background: customColors.primary,
                  color: customColors.background,
                }}
              >
                Primary
              </span>
              <span
                className="rounded-md px-3 py-1 text-xs"
                style={{
                  background: customColors.accent,
                  color: customColors.background,
                }}
              >
                Accent
              </span>
              <span
                className="rounded-md px-3 py-1 text-xs"
                style={{
                  background: customColors.card,
                  color: customColors.foreground,
                }}
              >
                Card
              </span>
              <span
                className="ml-auto text-xs"
                style={{ color: customColors.foreground }}
              >
                Preview
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
