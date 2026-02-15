"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { HeartIcon, MoonIcon, SunIcon } from "lucide-react";
import { description, name } from "@/constant/landing";
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
    <section className="relative max-w-6xl mx-auto px-6 py-24 pb-10 text-center overflow-hidden text-foreground">
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

      {/* decorative watermark + heart */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute left-6 top-8 transform -rotate-12 opacity-10 text-slate-300 dark:text-slate-700 select-none">
          <span className="text-2xl md:text-4xl italic font-light">
            love you babe!
          </span>
        </div>
        <HeartIcon className="absolute right-6 top-6 rotate-45 text-6xl md:text-9xl opacity-8 text-pink-300 dark:text-pink-700 blur-sm" />
        <div className="absolute inset-0 bg-linear-to-b from-white/60 via-transparent to-transparent dark:from-slate-900/60 dark:via-transparent dark:to-transparent" />
      </div>

      <div className="z-10">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl md:text-6xl font-extrabold tracking-tight leading-tight bg-clip-text text-transparent bg-linear-to-r from-indigo-600 via-pink-500 to-amber-400"
        >
          {name}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-6 text-lg md:text-xl text-slate-500 max-w-2xl mx-auto dark:text-foreground"
        >
          {description}
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="mt-10 flex justify-center gap-4"
        >
          <Link href="/login">
            <Button
              size="lg"
              className="rounded-2xl px-8 bg-linear-to-r from-primary to-secondary dark:from-indigo-700 dark:to-indigo-400 shadow-lg hover:scale-[1.01] transition-transform text-foreground"
            >
              Start Chat
            </Button>
          </Link>

          <Link href="/login/creator">
            <Button
              size="lg"
              variant="outline"
              className="rounded-2xl px-8 text-foreground"
            >
              Creator Portal
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
