"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { toast } from "sonner";
import {
  Loader2,
  ArrowRight,
  ArrowLeft,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import { quizQuestions } from "@/constant/quizQuestions";

export default function PersonalityQuiz() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isOnboarding = searchParams.get("onboarding") === "1";
  const fromProfile = searchParams.get("from") === "profile";

  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);

  const question = quizQuestions[currentStep];
  const totalSteps = quizQuestions.length;
  const progress = ((currentStep + 1) / totalSteps) * 100;

  const currentAnswer = answers[question.id] ?? "";
  const canProceed = currentAnswer.trim().length >= 3;

  const handleNext = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((s) => s - 1);
    }
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const payload = quizQuestions.map((q) => ({
        question: q.question,
        answer: answers[q.id] ?? "",
      }));

      const res = await fetch("/api/quiz", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers: payload }),
      });

      if (!res.ok) throw new Error("Failed to process quiz");

      setCompleted(true);
      toast.success("Personality profile created!");

      // Redirect after a short delay
      setTimeout(() => {
        if (isOnboarding) {
          // Set flag so the chat page shows the partner connection popup
          sessionStorage.setItem("nova_show_partner_popup", "1");
          router.push("/chat");
        } else if (fromProfile) {
          router.push("/profile");
        } else {
          router.push("/chat");
        }
      }, 2000);
    } catch {
      toast.error("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (completed) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="flex flex-col items-center justify-center py-20 text-center"
      >
        <CheckCircle2 className="size-16 text-green-500 mb-4" />
        <h2 className="text-2xl font-bold text-foreground">All Done!</h2>
        <p className="mt-2 text-muted-foreground">
          Nova has built your personality profile. Redirecting…
        </p>
      </motion.div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-xl bg-primary/10">
          <Sparkles className="size-6 text-primary" />
        </div>
        <h1 className="text-2xl font-bold text-foreground">Personality Quiz</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Answer {totalSteps} questions so Nova can understand you better.
        </p>
      </div>

      {/* Progress bar */}
      <div className="relative h-2 rounded-full bg-muted overflow-hidden">
        <motion.div
          className="absolute inset-y-0 left-0 bg-linear-to-r from-indigo-500 to-pink-500 rounded-full"
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.3 }}
        />
      </div>
      <p className="text-xs text-center text-muted-foreground">
        Question {currentStep + 1} of {totalSteps}
      </p>

      {/* Question card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={question.id}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg leading-relaxed">
                {question.question}
              </CardTitle>
              <CardDescription>
                Take your time — there are no wrong answers.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={currentAnswer}
                onChange={(e) =>
                  setAnswers((prev) => ({
                    ...prev,
                    [question.id]: e.target.value,
                  }))
                }
                placeholder={question.placeholder}
                rows={4}
                className="resize-none"
                autoFocus
              />
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>

      {/* Navigation */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          disabled={currentStep === 0}
          className="gap-1"
        >
          <ArrowLeft className="size-4" />
          Back
        </Button>

        {currentStep < totalSteps - 1 ? (
          <Button onClick={handleNext} disabled={!canProceed} className="gap-1">
            Next
            <ArrowRight className="size-4" />
          </Button>
        ) : (
          <Button
            onClick={handleSubmit}
            disabled={!canProceed || submitting}
            className="gap-1 bg-linear-to-r from-indigo-600 to-pink-500 text-white"
          >
            {submitting ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Building Profile…
              </>
            ) : (
              <>
                <Sparkles className="size-4" />
                Finish Quiz
              </>
            )}
          </Button>
        )}
      </div>

      {/* Skip option during onboarding */}
      {isOnboarding && (
        <div className="text-center">
          <button
            onClick={() => {
              sessionStorage.setItem("nova_show_partner_popup", "1");
              router.push("/chat");
            }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors underline underline-offset-2"
          >
            Skip for now — let Nova learn about me through conversations
          </button>
        </div>
      )}
    </div>
  );
}
