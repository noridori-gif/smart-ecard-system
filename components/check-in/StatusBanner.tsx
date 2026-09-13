import Button from "@/components/ui/Button";
import type { CheckInResult } from "@/services/guestService";
import { formatPassIdForDisplay } from "@/lib/passId";
import CheckInIcon from "./CheckInIcons";

function formatTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-TZ", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not available";
}

function initialsOf(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  return (parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "") || "?";
}

export default function StatusBanner({
  checking,
  result,
  errorMessage,
  onNext,
}: {
  checking: boolean;
  result: CheckInResult | null;
  errorMessage: string;
  onNext: () => void;
}) {
  const state = errorMessage ? "invalid" : result?.status;
  if (!checking && !state) return null;

  const config = state === "checked_in"
    ? { title: "Check-in Successful", icon: "success" as const, shell: "border-emerald-200 bg-emerald-50", accent: "text-emerald-700", avatar: "bg-emerald-100 text-emerald-800", pill: "bg-emerald-600 text-white", pillLabel: "Checked In" }
    : state === "partially_checked_in"
      ? { title: "Partially Checked In", icon: "clock" as const, shell: "border-sky-200 bg-sky-50", accent: "text-sky-700", avatar: "bg-sky-100 text-sky-800", pill: "bg-sky-600 text-white", pillLabel: "Partial" }
      : state === "already_checked_in"
        ? { title: "Fully Checked In", icon: "warning" as const, shell: "border-amber-200 bg-amber-50", accent: "text-amber-700", avatar: "bg-amber-100 text-amber-800", pill: "bg-amber-600 text-white", pillLabel: "Already In" }
        : { title: "Invalid Event Pass", icon: "error" as const, shell: "border-red-200 bg-red-50", accent: "text-red-700", avatar: "bg-red-100 text-red-800", pill: "bg-red-600 text-white", pillLabel: "Rejected" };

  const guest = result?.guest ?? null;
  const remainingGuests = guest ? guest.allowed_guests - guest.checked_in_count : 0;

  return (
    <div aria-live="polite" aria-atomic="true" className={`overflow-hidden rounded-2xl border p-4 shadow-sm sm:p-5 ${checking ? "border-emerald-200 bg-emerald-50" : config.shell}`}>
      {checking ? (
        <div className="flex min-h-16 items-center justify-center gap-3 text-emerald-700">
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" />
          <b>Verifying Event Pass…</b>
        </div>
      ) : (
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-3.5">
            <span className={`grid h-14 w-14 shrink-0 place-items-center rounded-full text-lg font-bold ${guest ? config.avatar : `bg-white ${config.accent}`}`}>
              {guest ? initialsOf(guest.full_name) : <CheckInIcon name={config.icon} className="h-6 w-6" />}
            </span>
            <div className="min-w-0">
              <p className={`flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${config.accent}`}>
                <CheckInIcon name={config.icon} className="h-3.5 w-3.5" />
                {config.title}
              </p>
              <p className="mt-0.5 truncate text-lg font-bold text-slate-900">{guest?.full_name ?? (errorMessage || result?.message)}</p>
              {guest && (
                <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1"><CheckInIcon name="users" className="h-3.5 w-3.5" />{guest.allowed_guests} Guest{guest.allowed_guests === 1 ? "" : "s"}</span>
                  <span className="inline-flex items-center gap-1"><CheckInIcon name="ticket" className="h-3.5 w-3.5" />{guest.category || "Normal"}</span>
                  <span className="font-mono text-xs font-bold text-slate-500">{guest.event_pass_id ? formatPassIdForDisplay(guest.event_pass_id) : "Pass ID not available"}</span>
                </p>
              )}
              {!guest && (errorMessage || result?.message) && <p className="mt-1 text-sm text-slate-600">{errorMessage || result?.message}</p>}
              {guest && guest.allowed_guests > 1 && (
                <p className={`mt-1.5 text-sm font-bold ${config.accent}`}>
                  Checked in: {guest.checked_in_count} of {guest.allowed_guests}
                  {state === "partially_checked_in" && ` — ${remainingGuests} more guest${remainingGuests === 1 ? "" : "s"} expected`}
                </p>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-row items-center justify-between gap-3 sm:flex-col sm:items-end">
            <div className="flex flex-col items-start gap-1 sm:items-end">
              <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ${config.pill}`}>
                <CheckInIcon name={config.icon} className="h-3.5 w-3.5" />
                {config.pillLabel}
              </span>
              {guest && <span className="text-xs font-semibold text-slate-500">{formatTime(guest.checked_in_at)}</span>}
            </div>
            <Button variant="dark" size="sm" onClick={onNext}>{state === "invalid" ? "Try Again" : "Next Guest"}</Button>
          </div>
        </div>
      )}
    </div>
  );
}
