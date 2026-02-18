"use client";

import React from "react";
import { motion } from "framer-motion";
import { capabilityInfo } from "@/constant/landing";

const Capabilities = () => {
  return (
    <section className="bg-muted/30 border-y py-20">
      <div className="max-w-6xl mx-auto px-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl md:text-4xl font-bold text-foreground">
            What Nova Can Do
          </h2>
          <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
            More than just a chatbot — Nova is a full relationship companion
            with powerful capabilities.
          </p>
        </motion.div>

        <div className="grid sm:grid-cols-2 gap-6 max-w-4xl mx-auto">
          {capabilityInfo.map((cap, index) => (
            <motion.div
              key={index}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: index * 0.1 }}
              className="flex gap-4 items-start rounded-xl border bg-background/80 backdrop-blur p-5 shadow-sm hover:shadow-md transition-shadow"
            >
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                {cap.icon}
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{cap.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">
                  {cap.description}
                </p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Capabilities;
