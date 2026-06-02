/**
 * Detect a mobile (touch phone/tablet) user agent.
 *
 * Returns `false` during SSR (no `navigator`) so the first client render
 * matches the server, avoiding hydration mismatches.
 */
export default function isMobileDevice(): boolean {
  return (
    typeof navigator !== "undefined" &&
    /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
  );
}
