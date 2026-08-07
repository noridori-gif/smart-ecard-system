/**
 * Formats an Event Pass ID for on-screen reading (e.g. staff reading it aloud
 * during manual entry). Display-only — never changes the stored/looked-up
 * value, which always keeps its "SEP-" prefix.
 */
export function formatPassIdForDisplay(passId: string | null | undefined): string {
  const trimmed = passId?.trim() ?? "";
  if (!trimmed) return "";
  return /^sep-/i.test(trimmed) ? trimmed.slice(4) : trimmed;
}
