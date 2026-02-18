import React from "react";

/**
 * Manages scroll behaviour for the chat view:
 * - `scrollToBottom` helper (with programmatic-scroll tracking)
 * - "scroll to bottom" button visibility
 * - `userScrolledAwayRef` — set on wheel-up / touch-up, cleared only when
 *   the user manually scrolls back to the bottom or clicks the button
 * - `wasStreamingRef` — prevents the "jump to start of response" scroll
 *   that is designed for non-streamed responses
 */

export interface UseAutoScrollReturn {
  scrollToBottom: (behavior?: ScrollBehavior) => void;
  showScrollToBottom: boolean;
  setShowScrollToBottom: React.Dispatch<React.SetStateAction<boolean>>;
  userScrolledAwayRef: React.MutableRefObject<boolean>;
  wasStreamingRef: React.MutableRefObject<boolean>;
  hasAutoScrolledRef: React.MutableRefObject<string | null>;
  resetScrollLock: () => void;
}

export function useAutoScroll(): UseAutoScrollReturn {
  const userScrolledAwayRef = React.useRef(false);
  const wasStreamingRef = React.useRef(false);
  const hasAutoScrolledRef = React.useRef<string | null>(null);

  // When true, the current scroll position change was caused by our own
  // `scrollToBottom` call — the onScroll handler must NOT re-enable
  // auto-scroll based on the "near bottom" check.
  const isProgrammaticScrollRef = React.useRef(false);
  const programmaticScrollTimerRef = React.useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const [showScrollToBottom, setShowScrollToBottom] = React.useState(false);

  const scrollToBottom = React.useCallback(
    (behavior: ScrollBehavior = "smooth") => {
      if (typeof window === "undefined") return;

      isProgrammaticScrollRef.current = true;

      // Reset any pending timer so the flag stays `true` as long as
      // tokens keep flowing (each call extends the window).
      if (programmaticScrollTimerRef.current) {
        clearTimeout(programmaticScrollTimerRef.current);
      }

      window.scrollTo({
        top: document.documentElement.scrollHeight,
        behavior,
      });

      programmaticScrollTimerRef.current = setTimeout(
        () => {
          isProgrammaticScrollRef.current = false;
          programmaticScrollTimerRef.current = null;
        },
        behavior === "smooth" ? 600 : 100,
      );
    },
    [],
  );

  const resetScrollLock = React.useCallback(() => {
    userScrolledAwayRef.current = false;
  }, []);

  // ── Scroll-detection listeners ────────────────────────────────
  React.useEffect(() => {
    const onScroll = () => {
      if (typeof window === "undefined") return;

      const pageScrollable =
        document.documentElement.scrollHeight - window.innerHeight > 8;

      const nearBottom =
        !pageScrollable ||
        window.scrollY + window.innerHeight >=
          document.documentElement.scrollHeight - 120;

      setShowScrollToBottom(!nearBottom);

      // Re-enable auto-scroll ONLY when the user manually scrolls back to
      // the bottom — NOT when a programmatic scrollToBottom animation
      // reaches the end (that would immediately undo a wheel-up).
      if (nearBottom && !isProgrammaticScrollRef.current) {
        userScrolledAwayRef.current = false;
      }
    };

    // Instant intent detection — a single wheel-up or touch-move-down
    // disables auto-scroll so the user doesn't have to fight the stream.
    const onWheel = (e: WheelEvent) => {
      if (e.deltaY < 0) {
        userScrolledAwayRef.current = true;
      }
    };

    let lastTouchY: number | null = null;
    const onTouchStart = (e: TouchEvent) => {
      lastTouchY = e.touches[0]?.clientY ?? null;
    };
    const onTouchMove = (e: TouchEvent) => {
      if (lastTouchY === null) return;
      const currentY = e.touches[0]?.clientY ?? lastTouchY;
      // finger moving down on screen = scrolling page up
      if (currentY > lastTouchY + 5) {
        userScrolledAwayRef.current = true;
      }
      lastTouchY = currentY;
    };

    // Run once to set initial button state.
    onScroll();

    if (typeof window !== "undefined") {
      window.addEventListener("scroll", onScroll, { passive: true });
      window.addEventListener("resize", onScroll);
      window.addEventListener("wheel", onWheel, { passive: true });
      window.addEventListener("touchstart", onTouchStart, { passive: true });
      window.addEventListener("touchmove", onTouchMove, { passive: true });
    }

    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("scroll", onScroll);
        window.removeEventListener("resize", onScroll);
        window.removeEventListener("wheel", onWheel);
        window.removeEventListener("touchstart", onTouchStart);
        window.removeEventListener("touchmove", onTouchMove);
      }
    };
  }, []);

  // Clean up the programmatic-scroll timer on unmount.
  React.useEffect(() => {
    return () => {
      if (programmaticScrollTimerRef.current) {
        clearTimeout(programmaticScrollTimerRef.current);
      }
    };
  }, []);

  return {
    scrollToBottom,
    showScrollToBottom,
    setShowScrollToBottom,
    userScrolledAwayRef,
    wasStreamingRef,
    hasAutoScrolledRef,
    resetScrollLock,
  };
}
