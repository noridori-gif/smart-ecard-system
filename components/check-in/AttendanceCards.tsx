import CheckInIcon from "./CheckInIcons";

export type AttendanceMetrics = {
  invitations: number;
  invitedGuests: number;
  singlePasses: number;
  doublePasses: number;
  checkedInGuests: number;
  remainingGuests: number;
};

export default function AttendanceCards({ metrics }: { metrics: AttendanceMetrics }) {
  const cards = [
    ["Total Invitations", metrics.invitations, "ticket"],
    ["Total Guests Invited", metrics.invitedGuests, "users"],
    ["Single Pass Cards", metrics.singlePasses, "pass"],
    ["Double Pass Cards", metrics.doublePasses, "pass"],
    ["Checked In Guests", metrics.checkedInGuests, "success"],
    ["Remaining Guests", metrics.remainingGuests, "clock"],
  ] as const;
  return <section aria-labelledby="live-statistics-title">
    <div className="flex items-end justify-between gap-4"><div><h2 id="live-statistics-title" className="sep-section-title">Live Statistics</h2><p className="sep-secondary mt-1">Current invitation and attendance totals.</p></div><span className="hidden items-center gap-2 text-xs font-semibold text-emerald-700 sm:flex"><span className="h-2 w-2 rounded-full bg-emerald-500" />Live session</span></div>
    <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {cards.map(([label, value, icon]) => <article key={label} className="sep-card min-w-0 p-4">
        <div className="flex items-start justify-between gap-2"><p className="text-xs font-semibold leading-5 text-slate-500">{label}</p><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-700"><CheckInIcon name={icon} className="h-4 w-4" /></span></div>
        <p className="sep-metric mt-3 truncate">{value.toLocaleString()}</p>
      </article>)}
    </div>
  </section>;
}
