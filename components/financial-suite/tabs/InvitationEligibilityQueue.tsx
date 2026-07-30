"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Button, { buttonClassName } from "@/components/ui/Button";
import { createInvitation } from "@/services/invitationService";
import type { FinancialGuest, FinancialPledge } from "@/services/financialSuiteService";
import { formatTzs } from "@/services/pledgeMessageService";
import { sendSmsInvitation } from "@/services/smsService";

type QueueFilter = "all" | "pending" | "generated" | "sent" | "checked_in" | "single" | "double";
type InvitationRelation = { id: number; invitation_token: string; invitation_status: string; rsvp_status: string; viewed_at: string | null };
type QueueRow = { pledge: FinancialPledge; guest: FinancialGuest; invitation: InvitationRelation | null };
const pageSize = 10;

export default function InvitationEligibilityQueue({
  eventId, eventTitle, language, template, pledges, guests, onRefresh,
}: {
  eventId: number; eventTitle: string; language: "sw" | "en"; template: string;
  pledges: FinancialPledge[]; guests: FinancialGuest[]; onRefresh: () => Promise<void>;
}) {
  const [filter, setFilter] = useState<QueueFilter>("pending");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [previewOpen, setPreviewOpen] = useState(false);
  const [busy, setBusy] = useState("");
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const guestMap = useMemo(() => new Map(guests.map((guest) => [guest.id, guest])), [guests]);
  const allRows = useMemo<QueueRow[]>(() => pledges.flatMap((pledge) => {
    if (pledge.calculated_status === "cancelled" || !["single","double"].includes(pledge.guest_eligibility_status) || !pledge.guest_id) return [];
    const guest = guestMap.get(pledge.guest_id);
    if (!guest) return [];
    const invitation = Array.isArray(guest.invitations) ? guest.invitations[0] ?? null : guest.invitations;
    return [{ pledge, guest, invitation }];
  }), [pledges, guestMap]);
  const shown = useMemo(() => allRows.filter((row) => {
    const haystack = `${row.pledge.full_name} ${row.pledge.phone} ${row.guest.full_name} ${row.guest.event_pass_id ?? ""}`.toLowerCase();
    if (!haystack.includes(query.toLowerCase())) return false;
    if (filter === "all") return true;
    if (filter === "pending") return !row.invitation;
    if (filter === "generated") return Boolean(row.invitation);
    if (filter === "sent") return Boolean(row.invitation && !["", "pending"].includes(row.invitation.invitation_status ?? ""));
    if (filter === "checked_in") return row.guest.status === "checked_in" || Boolean(row.guest.checked_in_at);
    return row.pledge.guest_eligibility_status === filter;
  }), [allRows, filter, query]);
  const pages = Math.max(1, Math.ceil(shown.length / pageSize));
  const visible = shown.slice((page - 1) * pageSize, page * pageSize);
  const selectedRows = allRows.filter((row) => selected.has(row.pledge.id));
  const ready = allRows.filter((row) => !row.invitation).length;
  const invited = allRows.length - ready;
  const totalContributors = pledges.filter((pledge) => pledge.calculated_status !== "cancelled").length;
  const metrics = [
    ["Ready to Invite", ready], ["Already Invited", invited],
    ["Needs Review", pledges.filter((pledge) => pledge.guest_eligibility_status === "needs_review").length],
    ["Below Minimum", pledges.filter((pledge) => pledge.guest_eligibility_status === "below_minimum").length],
    ["Invitation Rate", totalContributors ? `${((invited / totalContributors) * 100).toFixed(1)}%` : "0.0%"],
  ];
  function toggle(id: number) { setSelected((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); }
  function selectPage() { setSelected((current) => new Set([...current, ...visible.map((row) => row.pledge.id)])); }
  function selectAll() { setSelected(new Set(shown.map((row) => row.pledge.id))); }
  async function generate() {
    const targets = selectedRows.filter((row) => !row.invitation);
    if (!targets.length) { setError("Select at least one eligible guest without an invitation."); return; }
    try {
      setBusy("generate"); setError(""); setNotice("");
      for (const row of targets) await createInvitation(eventId, row.guest.id);
      setNotice(`${targets.length} invitation(s) generated using the existing invitation service.`);
      setSelected(new Set()); setPreviewOpen(false); await onRefresh();
    } catch (err) { setError(err instanceof Error ? err.message : "Invitations could not be generated."); }
    finally { setBusy(""); }
  }
  async function sendSms() {
    const targets = selectedRows.filter((row) => row.invitation && row.guest.phone);
    if (!targets.length) { setError("Select generated invitations with valid phone numbers."); return; }
    try {
      setBusy("sms"); setError(""); setNotice("");
      for (const row of targets) await sendSmsInvitation(row.invitation!.id);
      setNotice(`${targets.length} SMS invitation(s) accepted for delivery.`);
      setSelected(new Set()); await onRefresh();
    } catch (err) { setError(err instanceof Error ? err.message : "SMS invitations could not be sent."); }
    finally { setBusy(""); }
  }

  return <div className="space-y-5">
    <div><h2 className="sep-section-title">Invitation Eligibility Queue</h2><p className="sep-secondary mt-1">Generate and deliver invitations only for financially eligible contributors with linked guests.</p></div>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{metrics.map(([label,value]) => <article key={label} className="sep-card p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p></article>)}</div>
    <section className="sep-card overflow-hidden">
      <div className="space-y-4 border-b border-[#e7e1d7] p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]"><label className="text-sm font-semibold">Search<input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="Name, phone, guest or pass ID" className="mt-1 min-h-12 w-full rounded-xl border border-[#e7e1d7] px-3 font-normal" /></label><label className="text-sm font-semibold">Filter<select value={filter} onChange={(event) => { setFilter(event.target.value as QueueFilter); setPage(1); }} className="mt-1 min-h-12 w-full rounded-xl border border-[#e7e1d7] px-3 font-normal">{["all","pending","generated","sent","checked_in","single","double"].map((value) => <option key={value} value={value} className="capitalize">{value.replace("_"," ")}</option>)}</select></label></div>
        <div className="flex flex-wrap items-center gap-2"><Button variant="secondary" size="sm" onClick={selectPage}>Select page</Button><Button variant="secondary" size="sm" onClick={selectAll}>Select all results</Button><Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>Clear</Button><span className="text-sm font-semibold text-slate-600">{selected.size} selected</span></div>
        <div className="flex flex-wrap gap-2"><Button disabled={!selected.size} onClick={() => setPreviewOpen(true)}>Preview & Generate</Button><Button variant="info" loading={busy === "sms"} disabled={!selected.size} onClick={() => void sendSms()}>Send SMS</Button><Link href="/invitations" className={buttonClassName({ variant:"secondary" })}>WhatsApp & PDF tools</Link><Link href={`/events/${eventId}/guests`} className={buttonClassName({ variant:"secondary" })}>QR & Event Pass tools</Link></div>
      </div>
      <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1200px] text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="p-3"><span className="sr-only">Select</span></th>{["Contributor","Phone","Paid","Card Type","Allowed Guests","Guest","Invitation Status","Eligibility","Actions"].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-stone-200">{visible.map((row) => <tr key={row.pledge.id}><td className="p-3"><input aria-label={`Select ${row.pledge.full_name}`} type="checkbox" checked={selected.has(row.pledge.id)} onChange={() => toggle(row.pledge.id)} /></td><td className="p-3 font-bold">{row.pledge.full_name}</td><td className="p-3">{row.pledge.phone}</td><td className="p-3">{formatTzs(row.pledge.total_paid)}</td><td className="p-3 capitalize">{row.pledge.guest_eligibility_status}</td><td className="p-3">{row.guest.allowed_guests}</td><td className="p-3">{row.guest.full_name}</td><td className="p-3"><Status value={row.invitation ? row.invitation.invitation_status || "generated" : "invitation_pending"} /></td><td className="p-3"><Status value="eligible" /></td><td className="p-3"><RowActions row={row} eventId={eventId} /></td></tr>)}</tbody></table></div>
      <div className="grid gap-3 p-3 lg:hidden">{visible.map((row) => <article key={row.pledge.id} className="rounded-xl border border-[#e7e1d7] p-4"><div className="flex gap-3"><input aria-label={`Select ${row.pledge.full_name}`} type="checkbox" checked={selected.has(row.pledge.id)} onChange={() => toggle(row.pledge.id)} /><div className="min-w-0"><h3 className="font-bold">{row.pledge.full_name}</h3><p className="text-sm text-slate-500">{row.pledge.phone}</p></div></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm">{[["Paid",formatTzs(row.pledge.total_paid)],["Card",row.pledge.guest_eligibility_status],["Guests",String(row.guest.allowed_guests)],["Invitation",row.invitation?.invitation_status ?? "Pending"]].map(([label,value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-semibold capitalize">{value}</dd></div>)}</dl><div className="mt-4"><RowActions row={row} eventId={eventId} /></div></article>)}</div>
      <div className="flex items-center justify-between border-t border-[#e7e1d7] p-4 text-sm"><span>{shown.length} result(s)</span><div className="flex items-center gap-2"><Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</Button><span>{page}/{pages}</span><Button size="sm" variant="secondary" disabled={page === pages} onClick={() => setPage(page + 1)}>Next</Button></div></div>
    </section>
    {previewOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="queue-preview-title"><div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="flex justify-between gap-3"><div><h2 id="queue-preview-title" className="text-xl font-bold">Invitation Preview</h2><p className="text-sm text-slate-600">{eventTitle} · {template} · {language.toUpperCase()}</p></div><Button variant="ghost" onClick={() => setPreviewOpen(false)}>Close</Button></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr>{["Guest Name","Template","Language","Card Type","Allowed Guests","Phone","Invitation Link","QR Preview"].map((heading) => <th key={heading} className="p-2">{heading}</th>)}</tr></thead><tbody className="divide-y">{selectedRows.map((row) => <tr key={row.pledge.id}><td className="p-2 font-bold">{row.guest.full_name}</td><td className="p-2">{template || "Missing template"}</td><td className="p-2 uppercase">{language}</td><td className="p-2 capitalize">{row.pledge.guest_eligibility_status}</td><td className="p-2">{row.guest.allowed_guests}</td><td className="p-2">{row.guest.phone ?? "No phone"}</td><td className="p-2">{row.invitation ? <Link className="text-emerald-700 underline" href={`/invite/${row.invitation.invitation_token}`} target="_blank">Open link</Link> : "Generated after confirmation"}</td><td className="p-2"><Link className="text-emerald-700 underline" href={`/events/${eventId}/guests/${row.guest.id}/qr`} target="_blank">Open QR</Link></td></tr>)}</tbody></table></div><Button className="mt-5 w-full" loading={busy === "generate"} disabled={!template || selectedRows.some((row) => Boolean(row.invitation))} onClick={() => void generate()}>Generate Invitations</Button></div></div>}
  </div>;
}

function Status({ value }: { value: string }) { const tone = value === "eligible" || value === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"; return <span className={`rounded-full px-2.5 py-1 text-xs font-bold capitalize ${tone}`}>{value.replaceAll("_"," ")}</span>; }
function RowActions({ row, eventId }: { row: QueueRow; eventId: number }) { return <div className="flex flex-wrap gap-2">{row.invitation ? <Link href={`/invite/${row.invitation.invitation_token}`} target="_blank" className={buttonClassName({variant:"dark",size:"sm"})}>Open</Link> : <span className="text-xs text-slate-500">Select to generate</span>}<Link href={`/events/${eventId}/guests/${row.guest.id}/qr`} target="_blank" className={buttonClassName({variant:"secondary",size:"sm"})}>QR / Pass</Link></div>; }
