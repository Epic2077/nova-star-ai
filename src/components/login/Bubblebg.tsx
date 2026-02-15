"use client";
import { motion } from "framer-motion";

const Bubblebg = () => {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(60rem_40rem_at_10%_10%,color-mix(in_oklch,var(--secondary)_65%,transparent),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(50rem_35rem_at_90%_15%,color-mix(in_oklch,var(--accent)_60%,transparent),transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(40rem_30rem_at_50%_90%,color-mix(in_oklch,var(--primary)_60%,transparent),transparent_70%)]" />

      <motion.span
        animate={{
          y: [0, -64, 0],
          x: [0, 48, 0],
          scale: [1, 1.14, 1],
          opacity: [0.35, 0.55, 0.35],
        }}
        transition={{ duration: 6.5, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-10 -left-8 h-48 w-48 rounded-full bg-chart-4 opacity-50 blur-2xl will-change-transform"
      />
      <motion.span
        animate={{
          y: [0, 56, 0],
          x: [0, -44, 0],
          scale: [1, 0.9, 1],
          opacity: [0.35, 0.52, 0.35],
        }}
        transition={{ duration: 7.2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-24 right-10 h-36 w-36 rounded-full bg-chart-1 opacity-50 blur-2xl will-change-transform"
      />
      <motion.span
        animate={{
          y: [0, -58, 0],
          x: [0, 36, 0],
          scale: [1, 1.12, 1],
          opacity: [0.3, 0.48, 0.3],
        }}
        transition={{ duration: 8.1, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-16 left-16 h-56 w-56 rounded-full bg-chart-2 opacity-45 blur-3xl will-change-transform"
      />
      <motion.span
        animate={{
          y: [0, 62, 0],
          x: [0, -46, 0],
          scale: [1, 0.9, 1],
          opacity: [0.35, 0.54, 0.35],
        }}
        transition={{ duration: 6.8, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-10 right-24 h-40 w-40 rounded-full bg-chart-5 opacity-50 blur-2xl will-change-transform"
      />
    </div>
  );
};

export default Bubblebg;
