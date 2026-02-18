"use client";

import React from "react";
import { motion } from "framer-motion";
import FeatureCard from "./FeatureCard";
import { featureInfo } from "@/constant/landing";

const Feature = () => {
  return (
    <section className="max-w-6xl mx-auto px-6 py-20">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="text-center mb-12"
      >
        <h2 className="text-3xl md:text-4xl font-bold text-foreground">
          Built for Real Relationships
        </h2>
        <p className="mt-4 text-muted-foreground text-lg max-w-2xl mx-auto">
          Nova Star combines emotional intelligence with cutting-edge AI to help
          you understand yourself and your partner better.
        </p>
      </motion.div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {featureInfo.map((feature, index) => (
          <FeatureCard
            key={index}
            icon={feature.icon}
            title={feature.title}
            description={feature.description}
          />
        ))}
      </div>
    </section>
  );
};

export default Feature;
