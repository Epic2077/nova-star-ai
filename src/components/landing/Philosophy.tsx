"use client";

import { Sparkles } from "lucide-react";
import React from "react";
import { motion } from "framer-motion";

const Philosophy = () => {
  return (
    <section className="py-20 border-t">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
        >
          <Sparkles className="mx-auto mb-6 text-primary" size={32} />
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            Built for Growth, Not Dependency
          </h2>
          <p className="mt-6 text-muted-foreground text-lg leading-relaxed max-w-2xl mx-auto">
            Nova Star is designed to encourage direct communication, emotional
            regulation, and mutual understanding. It supports your relationship
            — it never replaces it.
          </p>

          <div className="mt-10 grid sm:grid-cols-3 gap-6 text-left">
            {[
              {
                title: "Encourages Dialogue",
                text: "Nova never suggests avoiding real conversations — it helps you prepare for them.",
              },
              {
                title: "Respects Boundaries",
                text: "Information shared in confidence stays protected. No surveillance, no manipulation.",
              },
              {
                title: "Grows With You",
                text: "The more you interact, the better Nova understands your needs and communication style.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 15 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="rounded-xl border bg-muted/30 p-5"
              >
                <h3 className="font-semibold text-foreground mb-2">
                  {item.title}
                </h3>
                <p className="text-sm text-foreground leading-relaxed">
                  {item.text}
                </p>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default Philosophy;
