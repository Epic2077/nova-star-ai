"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface AnswerCarouselProps {
  /** Total number of alternatives (including the original). */
  total: number;
  /** Currently displayed index (0-based). */
  current: number;
  onPrev: () => void;
  onNext: () => void;
}

/**
 * Navigation carousel for regenerated answers.
 * Shows "< 1/3 >" style pagination between alternative responses.
 */
export default function AnswerCarousel({
  total,
  current,
  onPrev,
  onNext,
}: AnswerCarouselProps) {
  if (total <= 1) return null;

  return (
    <div className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-full"
        onClick={onPrev}
        disabled={current === 0}
        aria-label="Previous answer"
      >
        <ChevronLeft size={14} />
      </Button>
      <span className="min-w-8 text-center tabular-nums select-none">
        {current + 1}/{total}
      </span>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 rounded-full"
        onClick={onNext}
        disabled={current === total - 1}
        aria-label="Next answer"
      >
        <ChevronRight size={14} />
      </Button>
    </div>
  );
}
