"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { HeartIcon, MoonIcon, SunIcon } from "lucide-react";
import { description, name, tagline } from "@/constant/landing";
import Link from "next/link";
import { useTheme } from "next-themes";
import { Switch } from "../ui/switch";

const Hero = () => {
  const { resolvedTheme, setTheme } = useTheme();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const isDark = mounted && resolvedTheme === "dark";

  return (
    <section className="relative max-w-6xl mx-auto px-6 pt-20 pb-16 text-center overflow-hidden text-foreground">
      {/* top-right theme control */}
      <div className="absolute right-6 top-6 z-20 flex items-center gap-3 bg-muted/40 backdrop-blur rounded-full px-3 py-1 shadow-sm">
        <motion.div
          key={mounted ? resolvedTheme : "not-mounted"}
          initial={{ rotate: -10, scale: 0.9, opacity: 0 }}
          animate={{ rotate: 0, scale: 1, opacity: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
          aria-hidden
          className="text-foreground"
        >
          {isDark ? <MoonIcon size={16} /> : <SunIcon size={16} />}
        </motion.div>

        <Switch
          aria-label="Toggle color theme"
          checked={isDark}
          disabled={!mounted}
          onCheckedChange={(checked) => setTheme(checked ? "dark" : "light")}
        />
      </div>

      {/* decorative watermark */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <HeartIcon className="absolute right-12 top-12 rotate-12 size-32 md:size-48 opacity-[0.06] text-pink-400 dark:text-pink-600" />
        <HeartIcon className="absolute left-8 bottom-8 -rotate-12 size-20 md:size-32 opacity-[0.04] text-indigo-400 dark:text-indigo-600" />
        <div className="absolute inset-0 bg-linear-to-b from-white/60 via-transparent to-transparent dark:from-slate-900/60 dark:via-transparent dark:to-transparent" />
      </div>

      <div className="z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mx-auto mb-4 flex size-16 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-pink-500 shadow-lg"
        >
          <HeartIcon className="size-8 text-white" />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="text-sm font-medium uppercase tracking-widest text-primary/70"
        >
          {tagline}
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-3 text-5xl md:text-7xl font-extrabold tracking-tight leading-tight bg-clip-text text-transparent bg-linear-to-r from-indigo-600 via-pink-500 to-amber-400"
        >
          {name}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35, duration: 0.6 }}
          className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
        >
          {description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.6 }}
          className="mt-10 flex flex-col sm:flex-row justify-center gap-4"
        >
          <Link href="/signup">
            <Button
              size="lg"
              className="rounded-2xl px-10 py-6 text-base bg-linear-to-r from-indigo-600 to-pink-500 hover:from-indigo-700 hover:to-pink-600 shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all text-white"
            >
              Get Started Free
            </Button>
          </Link>

          <Link href="/login">
            <Button
              variant="outline"
              size="lg"
              className="rounded-2xl px-10 py-6 text-base border-2 hover:bg-muted/50 transition-all"
            >
              Sign In
            </Button>
          </Link>
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7, duration: 0.6 }}
          className="mt-4 text-xs text-muted-foreground"
        >
          No credit card required · Free to use
        </motion.p>
      </div>
    </section>
  );
};

export default Hero;
