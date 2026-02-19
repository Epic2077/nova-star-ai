"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, X } from "lucide-react";
import { useUser } from "@/hooks/useUser";

/**
 * Shows a modal on first login when the user's AI profile has
 * setup_mode === "pending". Asks if they want to take the
 * personality quiz or skip it.
 */
export default function OnboardingQuizModal() {
  const { user, isLoading } = useUser();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [checked, setChecked] = useState(false);

  const checkProfile = useCallback(async () => {
    if (!user) return;
    try {
      // If the user already dismissed the quiz, don't show again
      if (localStorage.getItem("nova_quiz_dismissed")) {
        return;
      }
      const res = await fetch("/api/nova-profile");
      if (!res.ok) return;
      const data = await res.json();
      if (data.userProfile?.setup_mode === "pending") {
        setOpen(true);
      }
    } catch {
      // silently fail
    } finally {
      setChecked(true);
    }
  }, [user]);

  useEffect(() => {
    if (!isLoading && user && !checked) {
      checkProfile();
    }
  }, [isLoading, user, checked, checkProfile]);

  const handleTakeQuiz = () => {
    setOpen(false);
    router.push("/quiz?onboarding=1");
  };

  const handleSkip = () => {
    setOpen(false);
    // Remember that the user dismissed the quiz so it won't show again
    localStorage.setItem("nova_quiz_dismissed", "1");
    // Show partner popup after skipping
    sessionStorage.setItem("nova_show_partner_popup", "1");
  };

  if (!open) return null;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="mx-auto mb-2 flex size-14 items-center justify-center rounded-2xl bg-linear-to-br from-indigo-500 to-pink-500">
            <Sparkles className="size-7 text-white" />
          </div>
          <DialogTitle className="text-center text-xl">
            Welcome to Nova Star!
          </DialogTitle>
          <DialogDescription className="text-center text-base leading-relaxed">
            Want to take a quick personality quiz so Nova can understand you
            right away? It only takes 2 minutes.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-3 mt-4">
          <Button
            onClick={handleTakeQuiz}
            className="gap-2 bg-linear-to-r from-indigo-600 to-pink-500 text-white hover:from-indigo-700 hover:to-pink-600"
            size="lg"
          >
            <Sparkles className="size-4" />
            Take the Quiz
            <ArrowRight className="size-4" />
          </Button>

          <Button
            variant="ghost"
            onClick={handleSkip}
            className="gap-2 text-muted-foreground"
          >
            <X className="size-4" />
            Skip — let Nova learn over time
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
