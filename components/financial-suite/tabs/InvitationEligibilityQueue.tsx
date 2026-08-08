"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import Button, { buttonClassName } from "@/components/ui/Button";
import { createInvitation } from "@/services/invitationService";
import type { FinancialGuest, FinancialPledge } from "@/services/financialSuiteService";
import { formatTzs } from "@/services/pledgeMessageService";
import { sendSmsInvitation } from "@/services/smsService";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import { formatAppNumber } from "@/lib/i18n/formatters";

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
  const { language: appLanguage, t } = useAppLanguage();
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
    [t("queue.ready"), ready], [t("queue.invited"), invited], [t("eligibility.needsReview"), pledges.filter((pledge) => pledge.guest_eligibility_status === "needs_review").length], [t("eligibility.belowMinimum"), pledges.filter((pledge) => pledge.guest_eligibility_status === "below_minimum").length], [t("queue.rate"), formatAppNumber(totalContributors ? invited / totalContributors : 0, appLanguage, { style: "percent", maximumFractionDigits: 1 })],
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
    <div><h2 className="sep-section-title">{t("queue.title")}</h2></div>
    {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">{notice}</p>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="grid grid-cols-2 gap-3 md:grid-cols-5">{metrics.map(([label,value]) => <article key={label} className="sep-card p-4"><p className="text-xs font-semibold text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums">{value}</p></article>)}</div>
    <section className="sep-card overflow-hidden">
      <div className="space-y-4 border-b border-[#e7e1d7] p-4">
        <div className="grid gap-3 md:grid-cols-[1fr_220px]"><label className="text-sm font-semibold">{t("queue.search")}<input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} className="mt-1 min-h-12 w-full rounded-xl border border-[#e7e1d7] px-3 font-normal" /></label><label className="text-sm font-semibold">{t("common.all")}<select value={filter} onChange={(event) => { setFilter(event.target.value as QueueFilter); setPage(1); }} className="mt-1 min-h-12 w-full rounded-xl border border-[#e7e1d7] px-3 font-normal">{[["all",t("common.all")],["pending",t("queue.pending")],["generated",t("queue.generated")],["sent",t("queue.sent")],["checked_in",t("queue.checkedIn")],["single",t("queue.single")],["double",t("queue.double")]].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
        <div className="flex flex-wrap items-center gap-2"><Button variant="secondary" size="sm" onClick={selectPage}>{t("queue.selectPage")}</Button><Button variant="secondary" size="sm" onClick={selectAll}>{t("queue.selectAll")}</Button><Button variant="ghost" size="sm" onClick={() => setSelected(new Set())}>{t("queue.clear")}</Button><span className="text-sm font-semibold text-slate-600">{formatAppNumber(selected.size, appLanguage)} {t("common.selected")}</span></div>
        <div className="flex flex-wrap gap-2"><Button disabled={!selected.size} onClick={() => setPreviewOpen(true)}>{t("queue.preview")}</Button><Button variant="info" loading={busy === "sms"} disabled={!selected.size} onClick={() => void sendSms()}>{t("queue.sendSms")}</Button><Link href="/invitations" className={buttonClassName({ variant:"secondary" })}>WhatsApp / PDF</Link><Link href={`/events/${eventId}/guests`} className={buttonClassName({ variant:"secondary" })}>QR / Event Pass</Link></div>
      </div>
      <div className="overflow-x-auto"><table className="w-full table-fixed text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="w-10 p-3"><span className="sr-only">Chagua</span></th><th className="w-[32%] break-words p-3 lg:w-[20%] xl:w-[14%]">Mchangiaji</th><th className="hidden break-words p-3 xl:table-cell xl:w-[10%]">Simu</th><th className="hidden break-words p-3 lg:table-cell lg:w-[10%] xl:w-[8%]">Amelipa</th><th className="hidden break-words p-3 lg:table-cell lg:w-[10%] xl:w-[8%]">Aina ya Kadi</th><th className="hidden break-words p-3 lg:table-cell lg:w-[12%] xl:w-[9%]">Wageni Wanaoruhusiwa</th><th className="w-[24%] break-words p-3 lg:w-[14%] xl:w-[11%]">Hali ya Mwaliko</th><th className="hidden break-words p-3 lg:table-cell lg:w-[12%] xl:w-[9%]">Ustahiki</th><th className="w-[32%] break-words p-3 lg:w-[22%] xl:w-[16%]">Vitendo</th></tr></thead><tbody className="divide-y divide-stone-200">{visible.map((row) => <tr key={row.pledge.id}><td className="p-3"><input aria-label={`Chagua ${row.pledge.full_name}`} type="checkbox" checked={selected.has(row.pledge.id)} onChange={() => toggle(row.pledge.id)} /></td><td className="min-w-0 p-3"><p className="break-words font-bold text-slate-950">{row.pledge.full_name}</p><p className="mt-0.5 text-xs text-slate-500">{row.pledge.phone || <NoPhoneBadge />}</p><p className="mt-0.5 truncate text-xs text-slate-400">{row.guest.full_name}</p></td><td className="hidden p-3 xl:table-cell">{row.pledge.phone || <NoPhoneBadge />}</td><td className="hidden p-3 tabular-nums lg:table-cell">{formatTzs(row.pledge.total_paid)}</td><td className="hidden p-3 capitalize lg:table-cell">{row.pledge.guest_eligibility_status}</td><td className="hidden p-3 lg:table-cell">{row.guest.allowed_guests}</td><td className="p-3"><Status value={row.invitation ? row.invitation.invitation_status || "generated" : "invitation_pending"} /></td><td className="hidden p-3 lg:table-cell"><Status value="eligible" /></td><td className="p-3"><RowActions row={row} eventId={eventId} /></td></tr>)}</tbody></table></div>
      <div className="flex items-center justify-between border-t border-[#e7e1d7] p-4 text-sm"><span>{formatAppNumber(shown.length, appLanguage)}</span><div className="flex items-center gap-2"><Button size="sm" variant="secondary" disabled={page === 1} onClick={() => setPage(page - 1)}>{t("common.previous")}</Button><span>{page}/{pages}</span><Button size="sm" variant="secondary" disabled={page === pages} onClick={() => setPage(page + 1)}>{t("common.next")}</Button></div></div>
    </section>
    {previewOpen && <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/50 p-4" role="dialog" aria-modal="true" aria-labelledby="queue-preview-title"><div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl"><div className="flex justify-between gap-3"><div><h2 id="queue-preview-title" className="text-xl font-bold">Invitation Preview</h2><p className="text-sm text-slate-600">{eventTitle} · {template} · {language.toUpperCase()}</p></div><Button variant="ghost" onClick={() => setPreviewOpen(false)}>Close</Button></div><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead><tr>{["Guest Name","Template","Language","Card Type","Allowed Guests","Phone","Invitation Link","QR Preview"].map((heading) => <th key={heading} className="p-2">{heading}</th>)}</tr></thead><tbody className="divide-y">{selectedRows.map((row) => <tr key={row.pledge.id}><td className="p-2 font-bold">{row.guest.full_name}</td><td className="p-2">{template || "Missing template"}</td><td className="p-2 uppercase">{language}</td><td className="p-2 capitalize">{row.pledge.guest_eligibility_status}</td><td className="p-2">{row.guest.allowed_guests}</td><td className="p-2">{row.guest.phone ?? "No phone"}</td><td className="p-2">{row.invitation ? <Link className="text-emerald-700 underline" href={`/invite/${row.invitation.invitation_token}`} target="_blank">Open link</Link> : "Generated after confirmation"}</td><td className="p-2"><Link className="text-emerald-700 underline" href={`/events/${eventId}/guests/${row.guest.id}/qr`} target="_blank">Open QR</Link></td></tr>)}</tbody></table></div><Button className="mt-5 w-full" loading={busy === "generate"} disabled={!template || selectedRows.some((row) => Boolean(row.invitation))} onClick={() => void generate()}>Generate Invitations</Button></div></div>}
  </div>;
}

function Status({ value }: { value: string }) { const { t } = useAppLanguage(); const tone = value === "eligible" || value === "sent" ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-800"; const labels: Record<string,string> = { eligible:t("eligibility.eligible"), invitation_pending:t("queue.pending"), generated:t("queue.generated"), sent:t("queue.sent"), checked_in:t("queue.checkedIn") }; return <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{labels[value] ?? value.replaceAll("_"," ")}</span>; }
function NoPhoneBadge() { const { t } = useAppLanguage(); return <span className="inline-flex rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">{t("queue.noPhone")}</span>; }
function RowActions({ row, eventId }: { row: QueueRow; eventId: number }) { const { t } = useAppLanguage(); return <div className="flex flex-wrap gap-2">{row.invitation ? <Link href={`/invite/${row.invitation.invitation_token}`} target="_blank" className={buttonClassName({variant:"dark",size:"sm"})}>{t("queue.openInvitation")}</Link> : <span className="text-xs text-slate-500">{t("queue.pending")}</span>}<Link href={`/events/${eventId}/guests/${row.guest.id}/qr`} target="_blank" className={buttonClassName({variant:"secondary",size:"sm"})}>{t("queue.openQr")}</Link></div>; }
