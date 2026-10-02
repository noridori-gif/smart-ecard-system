"use client";

import { useState, type FormEvent } from "react";
import Button from "@/components/ui/Button";
import type { Guest } from "@/services/guestService";
import CheckInIcon from "./CheckInIcons";
import NameSearchPanel, { type CardType } from "./NameSearchPanel";

type ManualTab = "pass" | "name";

const tabClass = (active: boolean) =>
  `min-h-11 flex-1 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${active ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-stone-100"}`;

export default function ManualEntryPanel({
  value,
  checking,
  onChange,
  onSubmit,
  guests,
  cardTypeOf,
  nameSearchChecking,
  onNameCheckIn,
}: {
  value: string;
  checking: boolean;
  onChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  guests: Guest[];
  cardTypeOf: (guest: Guest) => CardType;
  nameSearchChecking: boolean;
  onNameCheckIn: (guest: Guest) => Promise<void>;
}) {
  const [tab, setTab] = useState<ManualTab>("pass");

  return <section className="sep-card p-4 sm:p-6" aria-labelledby="manual-entry-title"><div className="flex items-start gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-700"><CheckInIcon name="pass" /></span><div><h2 id="manual-entry-title" className="sep-card-title">Manual Entry</h2><p className="sep-secondary mt-1">Verify a pass when scanning is not available.</p></div></div>
    <div className="mt-5 flex gap-1 rounded-2xl border border-[#e7e1d7] bg-white p-1.5 shadow-sm" role="tablist" aria-label="Manual entry method">
      <button type="button" role="tab" id="manual-tab-pass" aria-selected={tab === "pass"} aria-controls="manual-tabpanel-pass" onClick={() => setTab("pass")} className={tabClass(tab === "pass")}>Pass ID</button>
      <button type="button" role="tab" id="manual-tab-name" aria-selected={tab === "name"} aria-controls="manual-tabpanel-name" onClick={() => setTab("name")} className={tabClass(tab === "name")}>Search by name</button>
    </div>
    {tab === "pass" ? (
      <div id="manual-tabpanel-pass" role="tabpanel" aria-labelledby="manual-tab-pass"><form onSubmit={onSubmit} className="mt-6"><label htmlFor="eventPassId" className="sep-label block">Event Pass ID</label><input id="eventPassId" name="eventPassId" value={value} disabled={checking} onChange={(event) => onChange(event.target.value.toUpperCase())} placeholder="4UGK46" autoComplete="off" className="sep-control mt-2 font-mono text-lg font-bold uppercase tracking-wider" /><p className="sep-caption mt-2">Enter just the code, e.g. 4UGK46 (SEP- prefix is optional).</p><Button type="submit" size="lg" loading={checking} className="mt-5 w-full">{checking ? "Checking…" : "Verify & Check In"}</Button></form><div className="mt-5 rounded-xl border border-[#e7e1d7] bg-stone-50 p-4"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Example pass</p><p className="mt-2 font-mono text-lg font-bold tracking-wider text-slate-900">4UGK46</p></div></div>
    ) : (
      <div id="manual-tabpanel-name" role="tabpanel" aria-labelledby="manual-tab-name" className="mt-6">
        <NameSearchPanel guests={guests} cardTypeOf={cardTypeOf} checking={nameSearchChecking} onCheckIn={onNameCheckIn} />
      </div>
    )}
  </section>;
}
