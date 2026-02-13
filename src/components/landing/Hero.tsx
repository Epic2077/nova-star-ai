"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { HeartIcon } from "lucide-react";
import { description, name } from "@/constant/landing";
import Link from "next/link";

const Hero = () => {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 pb-10 text-center">
      <div className="z-0">
        <p className="text-(--hidden-message) text-xs md:text-sm absolute top-8 md:top-25 md:left-10 -rotate-20 md:-rotate-45">
          love you babe!
        </p>
        <HeartIcon className="text-(--hidden-message) absolute top-10 right-10 md:top-10 md:right-10 rotate-45 text-4xl md:text-8xl size-20 md:size-40 lg:size-80 opacity-40" />
      </div>
      <div className="z-10">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-5xl md:text-6xl font-bold tracking-tight"
        >
          {name}
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="mt-6 text-lg md:text-xl text-slate-600 max-w-2xl mx-auto"
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
            <Button size="lg" className="rounded-2xl px-8">
              Start Chat
            </Button>
          </Link>
          <Link href="/login/creator">
            <Button size="lg" variant="outline" className="rounded-2xl px-8">
              Creator Portal
            </Button>
          </Link>
        </motion.div>
      </div>
    </section>
  );
};

export default Hero;
