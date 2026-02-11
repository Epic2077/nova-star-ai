"use client";

import { dailyQuote } from "@/constant/dailyQuote";
import { motion } from "framer-motion";

const DailyQuote = () => {
  return (
    <section className="pb-10">
      <motion.h5
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="text-xl md:text-3xl font-bold tracking-tight text-center mb-6"
      >
        Daily Quote
      </motion.h5>
      <div className="w-80 md:w-120 py-6 h-8 md:h-16 bg-primary-foreground text-foreground mx-auto rounded-4xl items-center justify-center flex border-primary border-2   hover:scale-105 transition-transform duration-300">
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.6 }}
          className="text-center text-lg md:text-xl animate-bounce"
        >
          {dailyQuote}
        </motion.p>
      </div>
    </section>
  );
};

export default DailyQuote;
