"use client";
import React from "react";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { featureInfoType } from "@/types/landing";

function FeatureCard({ icon, title, description }: featureInfoType) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      viewport={{ once: true }}
    >
      <Card className="rounded-2xl shadow-sm hover:shadow-md transition-shadow h-full">
        <CardContent className="p-8 text-center">
          <div className="mb-4 flex justify-center">{icon}</div>
          <h3 className="text-xl font-semibold">{title}</h3>
          <p className="mt-4 text-slate-600 dark:text-foreground">
            {description}
          </p>
        </CardContent>
      </Card>
    </motion.div>
  );
}
export default FeatureCard;
