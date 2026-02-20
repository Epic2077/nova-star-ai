import type { Metadata } from "next";
import { Suspense } from "react";
import PartnerQuiz from "@/components/quiz/PartnerQuiz";

export const metadata: Metadata = {
  title: "Partner Perception Quiz",
};

export default function PartnerQuizPage() {
  return (
    <section className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <Suspense>
          <PartnerQuiz />
        </Suspense>
      </div>
    </section>
  );
}
