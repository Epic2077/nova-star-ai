/**
 * Format an ISO-8601 timestamp into a human-readable string.
 *
 * Falls back to the raw value if parsing fails.
 */
export function formatTimestamp(iso: string | null | undefined): string {
  if (!iso) return "-";
  try {
    return new Intl.DateTimeFormat("en-US", {
      dateStyle: "medium",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}
