"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { HeartIcon } from "lucide-react";
import { description, name } from "@/constant/landing";

const Hero = () => {
  return (
    <section className="max-w-6xl mx-auto px-6 py-24 text-center">
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
        <Button size="lg" className="rounded-2xl px-8">
          Start Chat
        </Button>
        <Button size="lg" variant="outline" className="rounded-2xl px-8">
          Creator Portal
        </Button>
      </motion.div>
      <div>
        <p className="text-(--hidden-message) absolute top-25 left-10 -rotate-45">
          love you babe!
        </p>
        <HeartIcon className="text-(--hidden-message) absolute top-20 right-20 rotate-45 text-8xl size-80" />
      </div>
    </section>
  );
};

export default Hero;
