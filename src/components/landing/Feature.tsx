"use client";

import React from "react";
import FeatureCard from "./FeatureCard";
import { featureInfo } from "@/constant/landing";

const Feature = () => {
  return (
    <section className="max-w-6xl mx-auto px-6 pb-24 grid md:grid-cols-3 gap-8">
      {featureInfo.map((feature, index) => (
        <FeatureCard
          key={index}
          icon={feature.icon}
          title={feature.title}
          description={feature.description}
        />
      ))}
    </section>
  );
};

export default Feature;
