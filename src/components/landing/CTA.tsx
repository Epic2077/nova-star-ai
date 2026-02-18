"use client";

import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ArrowRight } from "lucide-react";

const CTA = () => {
  return (
    <section className="py-20">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="rounded-3xl bg-linear-to-br from-indigo-600 via-pink-500 to-amber-400 p-0.5"
        >
          <div className="rounded-[calc(1.5rem-2px)] bg-background px-8 py-14 md:px-16">
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Ready to Strengthen Your Connection?
            </h2>
            <p className="mt-4 text-muted-foreground text-lg max-w-xl mx-auto">
              Start chatting with Nova Star today. Take the personality quiz,
              connect with your partner, and let AI help you grow together.
            </p>
            <div className="mt-8 flex flex-col sm:flex-row justify-center gap-4">
              <Link href="/signup">
                <Button
                  size="lg"
                  className="rounded-2xl px-10 py-6 text-base bg-linear-to-r from-indigo-600 to-pink-500 hover:from-indigo-700 hover:to-pink-600 shadow-lg text-white"
                >
                  Get Started
                  <ArrowRight className="ml-2 size-4" />
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default CTA;
