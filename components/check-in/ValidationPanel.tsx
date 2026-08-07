import Button from "@/components/ui/Button";
import type { CheckInResult } from "@/services/guestService";
import { formatPassIdForDisplay } from "@/lib/passId";
import CheckInIcon from "./CheckInIcons";

function formatTime(value: string | null) {
  return value ? new Intl.DateTimeFormat("en-TZ", { dateStyle: "medium", timeStyle: "medium" }).format(new Date(value)) : "Not available";
}

export default function ValidationPanel({ result, errorMessage, checking, onNext }: { result: CheckInResult | null; errorMessage: string; checking: boolean; onNext: () => void }) {
  const state = errorMessage ? "invalid" : result?.status;
  const config = state === "checked_in"
    ? { title: "Check-in Successful", icon: "success" as const, shell: "border-emerald-200 bg-emerald-50", accent: "text-emerald-700" }
    : state === "already_checked_in"
      ? { title: "Already Checked In", icon: "warning" as const, shell: "border-amber-200 bg-amber-50", accent: "text-amber-700" }
      : { title: "Invalid Event Pass", icon: "error" as const, shell: "border-red-200 bg-red-50", accent: "text-red-700" };
  return <section aria-labelledby="validation-title">
    <h2 id="validation-title" className="sep-section-title">Validation Result</h2>
    <div aria-live="polite" aria-atomic="true" className={`mt-4 min-h-40 rounded-2xl border p-5 shadow-sm sm:p-6 ${checking ? "border-blue-200 bg-blue-50" : state ? config.shell : "border-[#e7e1d7] bg-white"}`}>
      {checking ? <div className="flex min-h-28 items-center justify-center gap-3 text-blue-700"><span className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent motion-reduce:animate-none" /><b>Verifying Event Pass…</b></div>
      : !state ? <div className="flex min-h-28 flex-col items-center justify-center text-center"><span className="grid h-11 w-11 place-items-center rounded-full bg-stone-100 text-slate-500"><CheckInIcon name="pass" className="h-5 w-5" /></span><p className="mt-3 font-semibold text-slate-700">Ready for the next guest</p><p className="sep-secondary mt-1">A scan or manual verification result will remain visible here.</p></div>
      : <div className="flex flex-col gap-5 lg:flex-row lg:items-start"><span className={`grid h-12 w-12 shrink-0 place-items-center rounded-full bg-white ${config.accent}`}><CheckInIcon name={config.icon} /></span><div className="min-w-0 flex-1"><h3 className={`text-xl font-bold ${config.accent}`}>{config.title}</h3><p className="mt-1 text-sm text-slate-700">{errorMessage || result?.message}</p>{result?.guest && <dl className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4"><Detail label="Guest Name" value={result.guest.full_name} /><Detail label="Pass ID" value={result.guest.event_pass_id ? formatPassIdForDisplay(result.guest.event_pass_id) : "Not available"} mono /><Detail label="Allowed Guests" value={String(result.guest.allowed_guests)} /><Detail label="Category" value={result.guest.category || "Normal"} /><Detail label="Checked In Time" value={formatTime(result.guest.checked_in_at)} wide /></dl>}<Button variant="dark" onClick={onNext} className="mt-5 w-full sm:w-auto">{state === "invalid" ? "Try Again" : "Check In Next Guest"}</Button></div></div>}
    </div>
  </section>;
}

function Detail({ label, value, mono = false, wide = false }: { label: string; value: string; mono?: boolean; wide?: boolean }) {
  return <div className={`rounded-xl border border-white/70 bg-white/70 p-3 ${wide ? "sm:col-span-2 lg:col-span-4" : ""}`}><dt className="text-xs font-bold uppercase tracking-wide text-slate-500">{label}</dt><dd className={`mt-1 break-words font-bold text-slate-900 ${mono ? "font-mono" : ""}`}>{value}</dd></div>;
}
