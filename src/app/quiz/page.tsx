import type { Metadata } from "next";
import PersonalityQuiz from "@/components/quiz/PersonalityQuiz";

export const metadata: Metadata = {
  title: "Personality Quiz",
};

export default function QuizPage() {
  return (
    <section className="min-h-screen bg-background">
      <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6 lg:px-8">
        <PersonalityQuiz />
      </div>
    </section>
  );
}
