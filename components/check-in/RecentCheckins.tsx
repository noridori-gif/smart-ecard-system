import type { Guest } from "@/services/guestService";
import CheckInIcon from "./CheckInIcons";

function passLabel(allowed: number) {
  return allowed === 1 ? "Single Pass" : allowed === 2 ? "Double Pass" : `${allowed}-Guest Pass`;
}

export default function RecentCheckins({ guests }: { guests: Guest[] }) {
  return <section className="sep-card p-4 sm:p-6" aria-labelledby="recent-checkins-title"><div><h2 id="recent-checkins-title" className="sep-card-title">Recent Check-ins</h2><p className="sep-secondary mt-1">The latest successful arrivals for the selected event.</p></div><div className="mt-4 max-h-96 overflow-y-auto">{guests.length ? <ul className="divide-y divide-stone-200">{guests.map((guest) => <li key={guest.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-emerald-50 text-emerald-700"><CheckInIcon name="success" className="h-4 w-4" /></span><div className="min-w-0 flex-1"><p className="truncate font-bold text-slate-900">{guest.full_name}</p><p className="text-xs text-slate-500">{passLabel(guest.allowed_guests)}</p></div><time className="shrink-0 text-sm font-semibold tabular-nums text-slate-600" dateTime={guest.checked_in_at ?? undefined}>{guest.checked_in_at ? new Intl.DateTimeFormat("en-TZ", { hour: "2-digit", minute: "2-digit" }).format(new Date(guest.checked_in_at)) : "—"}</time></li>)}</ul> : <p className="py-10 text-center text-sm text-slate-500">No check-ins recorded for this event yet.</p>}</div></section>;
}
