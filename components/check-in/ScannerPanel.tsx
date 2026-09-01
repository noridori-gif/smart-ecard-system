import Button from "@/components/ui/Button";
import type { CheckInResult } from "@/services/guestService";
import { formatPassIdForDisplay } from "@/lib/passId";
import CheckInIcon from "./CheckInIcons";

function formatTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-TZ", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value)) : "Not available";
}

function Detail({ label, value, mono = false, wide = false }: { label: string; value: string; mono?: boolean; wide?: boolean }) {
  return <div className={`rounded-xl border border-white/70 bg-white/70 p-3 ${wide ? "sm:col-span-2 lg:col-span-4" : ""}`}><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className={`mt-1 break-words font-bold text-slate-900 ${mono ? "font-mono" : ""}`}>{value}</dd></div>;
}

export default function ScannerPanel({
  scannerReady,
  checking,
  cameraError,
  onRetry,
  result,
  errorMessage,
  onNext,
}: {
  scannerReady: boolean;
  checking: boolean;
  cameraError: string | null;
  onRetry: () => void;
  result: CheckInResult | null;
  errorMessage: string;
  onNext: () => void;
}) {
  const state = errorMessage ? "invalid" : result?.status;
  const showResult = checking || Boolean(state);
  const config = state === "checked_in"
    ? { title: "Check-in Successful", icon: "success" as const, shell: "border-emerald-200 bg-emerald-50", accent: "text-emerald-700" }
    : state === "partially_checked_in"
      ? { title: "Partially Checked In", icon: "clock" as const, shell: "border-sky-200 bg-sky-50", accent: "text-sky-700" }
      : state === "already_checked_in"
        ? { title: "Fully Checked In", icon: "warning" as const, shell: "border-amber-200 bg-amber-50", accent: "text-amber-700" }
        : { title: "Invalid Event Pass", icon: "error" as const, shell: "border-red-200 bg-red-50", accent: "text-red-700" };
  const remainingGuests = result?.guest ? result.guest.allowed_guests - result.guest.checked_in_count : 0;

  return <section className="sep-card min-w-0 p-4 sm:p-6" aria-labelledby="scanner-title">
    <div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CheckInIcon name="camera" /></span><div><h2 id="scanner-title" className="sep-card-title">QR Scanner</h2><p className="sep-secondary mt-1">Point the camera at the guest&apos;s QR code or use the upload option in the scanner.</p></div></div>

    {/* The camera target stays mounted (just hidden) whenever a result is showing, so the
        scanner never has to restart — "Check In Next Guest" just reveals it again instantly. */}
    <div className={`mt-5 overflow-hidden rounded-2xl border border-[#e7e1d7] bg-stone-50 p-2 sm:p-3 ${showResult || cameraError ? "hidden" : ""}`}>
      <div id="qr-reader" className="w-full" />
      {!scannerReady && <p role="status" className="p-6 text-center text-sm text-slate-500">Requesting camera permission and starting scanner…</p>}
    </div>

    {cameraError && !showResult && (
      <div role="alert" className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center">
        <span className="mx-auto grid h-11 w-11 place-items-center rounded-full bg-white text-amber-700"><CheckInIcon name="warning" className="h-5 w-5" /></span>
        <p className="mt-3 font-bold text-amber-900">Camera unavailable</p>
        <p className="mt-1 text-sm text-amber-800">{cameraError}</p>
        <Button type="button" variant="secondary" size="sm" onClick={onRetry} className="mt-4">Try camera again</Button>
      </div>
    )}

    {showResult && (
      <div aria-live="polite" aria-atomic="true" className={`mt-5 min-h-40 rounded-2xl border p-5 shadow-sm sm:p-6 ${checking ? "border-emerald-200 bg-emerald-50" : config.shell}`}>
        {checking
          ? <div className="flex min-h-28 items-center justify-center gap-3 text-emerald-700"><span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" /><b>Verifying Event Pass…</b></div>
          : <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
              <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white ${config.accent}`}><CheckInIcon name={config.icon} /></span>
              <div className="min-w-0 flex-1">
                <h3 className={`text-xl font-bold ${config.accent}`}>{config.title}</h3>
                <p className="mt-1 text-sm text-slate-700">{errorMessage || result?.message}</p>
                {result?.guest && result.guest.allowed_guests > 1 && (state === "checked_in" || state === "partially_checked_in" || state === "already_checked_in") && (
                  <p className={`mt-2 text-sm font-bold ${config.accent}`}>
                    Checked in: {result.guest.checked_in_count} of {result.guest.allowed_guests}
                    {state === "partially_checked_in" && ` — ${remainingGuests} more guest${remainingGuests === 1 ? "" : "s"} expected`}
                  </p>
                )}
                {result?.guest && <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Detail label="Guest Name" value={result.guest.full_name} />
                  <Detail label="Pass ID" value={result.guest.event_pass_id ? formatPassIdForDisplay(result.guest.event_pass_id) : "Not available"} mono />
                  <Detail label="Checked In Progress" value={`${result.guest.checked_in_count} of ${result.guest.allowed_guests}`} />
                  <Detail label="Category" value={result.guest.category || "Normal"} />
                  <Detail label="Checked In Time" value={formatTime(result.guest.checked_in_at)} wide />
                </dl>}
                <Button variant="dark" onClick={onNext} className="mt-5 w-full sm:w-auto">{state === "invalid" ? "Try Again" : "Check In Next Guest"}</Button>
              </div>
            </div>}
      </div>
    )}

    {!showResult && (
      <div className="mt-4 flex items-center gap-2 text-sm"><span className={`h-2.5 w-2.5 rounded-full ${cameraError ? "bg-red-500" : scannerReady ? "bg-emerald-500" : "bg-amber-500"}`} /><span className="font-semibold text-slate-700">{cameraError ? "Camera unavailable — use manual entry" : scannerReady ? "Scanner ready" : "Camera permission pending"}</span></div>
    )}
  </section>;
}
