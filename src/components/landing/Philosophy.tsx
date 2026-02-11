import { Sparkles } from "lucide-react";
import React from "react";

const Philosophy = () => {
  return (
    <section className="bg-background py-20 border-t">
      <div className="max-w-4xl mx-auto px-6 text-center">
        <Sparkles className="mx-auto mb-6" size={32} />
        <h2 className="text-3xl font-semibold">
          Built for Growth, Not Dependency
        </h2>
        <p className="mt-6 text-slate-600 text-lg">
          Nova Star is designed to encourage direct communication, emotional
          regulation, and mutual understanding. It supports your relationship —
          it never replaces it.
        </p>
      </div>
    </section>
  );
};

export default Philosophy;
