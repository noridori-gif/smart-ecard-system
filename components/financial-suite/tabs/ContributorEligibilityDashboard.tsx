"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { ContributorGuestSettings } from "@/services/contributorGuestService";
import { recalculateContributorGuest } from "@/services/contributorGuestService";
import type { FinancialGuest, FinancialPledge } from "@/services/financialSuiteService";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import { formatAppNumber, formatAppTzs } from "@/lib/i18n/formatters";
import { formatTzs } from "@/services/pledgeMessageService";

type Filter = "all" | "eligible" | "single" | "double" | "below_minimum" | "needs_review" | "linked" | "not_linked" | "invitation_sent" | "invitation_not_sent";

export default function ContributorEligibilityDashboard({
  eventId, pledges, guests, settings, onRefresh, onEdit, onUnlink,
}: {
  eventId: number;
  pledges: FinancialPledge[];
  guests: FinancialGuest[];
  settings: ContributorGuestSettings;
  onRefresh: () => Promise<void>;
  onEdit: (pledge: FinancialPledge) => void;
  onUnlink: (pledge: FinancialPledge) => Promise<void>;
}) {
  const { language, t } = useAppLanguage();
  const [filter, setFilter] = useState<Filter>("all");
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const guestMap = useMemo(() => new Map(guests.map((guest) => [guest.id, guest])), [guests]);
  const active = useMemo(() => pledges.filter((pledge) => pledge.calculated_status !== "cancelled"), [pledges]);
  const rows = useMemo(() => active.map((pledge) => {
    const guest = pledge.guest_id ? guestMap.get(pledge.guest_id) ?? null : null;
    const invitationRelation = guest ? Array.isArray(guest.invitations) ? guest.invitations[0] : guest.invitations : null;
    const invitationSent = Boolean(invitationRelation && (invitationRelation.viewed_at || !["", "pending"].includes(invitationRelation.invitation_status ?? "")));
    return { pledge, guest, invitation: invitationRelation, invitationSent };
  }), [active, guestMap]);
  const filtered = useMemo(() => rows.filter(({ pledge, guest, invitationSent }) => {
    const status = pledge.guest_eligibility_status ?? (guest ? guest.allowed_guests === 2 ? "double" : "single" : "not_linked");
    if (filter === "all") return true;
    if (filter === "eligible") return status === "single" || status === "double";
    if (filter === "linked") return Boolean(guest);
    if (filter === "not_linked") return !guest;
    if (filter === "invitation_sent") return invitationSent;
    if (filter === "invitation_not_sent") return !invitationSent;
    return status === filter;
  }), [rows, filter]);

  const count = (predicate: (row: typeof rows[number]) => boolean) => rows.filter(predicate).length;
  const metrics = [
    [t("eligibility.total"), rows.length], [t("eligibility.eligible"), count(({ pledge }) => ["single", "double"].includes(pledge.guest_eligibility_status))], [t("eligibility.belowMinimum"), count(({ pledge }) => pledge.guest_eligibility_status === "below_minimum")], [t("eligibility.single"), count(({ pledge }) => pledge.guest_eligibility_status === "single")], [t("eligibility.double"), count(({ pledge }) => pledge.guest_eligibility_status === "double")], [t("eligibility.linkedGuests"), count(({ guest }) => Boolean(guest))], [t("eligibility.needsReview"), count(({ pledge }) => pledge.guest_eligibility_status === "needs_review" || pledge.guest_eligibility_status === "sync_failed")], [t("eligibility.pendingGuests"), count(({ pledge }) => pledge.guest_eligibility_status === "pending_guest")],
  ] as const;
  async function recalculate(pledge: FinancialPledge) {
    try { setBusyId(pledge.id); setError(""); await recalculateContributorGuest(pledge.id); await onRefresh(); }
    catch (err) {
      console.error("Contributor guest eligibility recalculation error:", err);
      setError("Guest synchronization could not be completed. Please try again or contact the administrator.");
    }
    finally { setBusyId(null); }
  }

  return <div className="space-y-5">
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <section aria-labelledby="eligibility-summary-title">
      <div><h2 id="eligibility-summary-title" className="sep-section-title">{t("eligibility.title")}</h2><p className="sep-secondary mt-1">{t("eligibility.description")}</p></div>
      <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">{metrics.map(([label, value]) => <article key={label} className="sep-card p-4"><p className="text-xs font-semibold leading-5 text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums">{formatAppNumber(value, language)}</p><p className="mt-1 text-xs text-slate-500">{formatAppNumber(rows.length ? value / rows.length : 0, language, { style: "percent", maximumFractionDigits: 1 })}</p></article>)}</div>
    </section>
    <section className="sep-card p-4 sm:p-5" aria-labelledby="settings-summary-title"><div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-start"><div><h2 id="settings-summary-title" className="sep-card-title">{t("eligibility.currentSettings")}</h2><p className="sep-secondary mt-1">{settings.contributor_guest_sync_enabled ? t("eligibility.syncEnabled") : t("eligibility.syncDisabled")}</p></div><Link href={`/events/${eventId}/contributions?tab=settings`} className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[#e7e1d7] px-4 text-sm font-semibold">{t("eligibility.openSettings")}</Link></div><dl className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">{[
      [t("eligibility.basis"), settings.classification_basis === "paid_amount" ? t("settings.validPaid") : t("settings.pledged")],
      [t("eligibility.singleThreshold"), formatAppTzs(Number(settings.single_card_minimum), language)], [t("eligibility.doubleThreshold"), formatAppTzs(Number(settings.double_card_minimum), language)],
      [t("eligibility.autoUpgrade"), settings.auto_upgrade_guest_card ? t("common.enabled") : t("common.disabled")], [t("eligibility.autoDowngrade"), settings.auto_downgrade_guest_card ? t("common.enabled") : t("common.disabled")],
      [t("eligibility.belowMinimum"), settings.below_minimum_behavior === "no_guest" ? t("settings.noGuest") : t("settings.pendingGuest")],
    ].map(([label,value]) => <div key={label} className="rounded-xl bg-stone-50 p-3"><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-bold">{value}</dd></div>)}</dl></section>
    <section className="sep-card overflow-hidden">
      <div className="border-b border-[#e7e1d7] p-4"><label className="text-sm font-semibold">{t("eligibility.filter")}<select value={filter} onChange={(event) => setFilter(event.target.value as Filter)} className="mt-1 min-h-12 w-full rounded-xl border border-[#e7e1d7] px-3 md:max-w-xs">{[
        ["all",t("common.all")],["eligible",t("eligibility.eligible")],["single",t("eligibility.single")],["double",t("eligibility.double")],["below_minimum",t("eligibility.belowMinimum")],["needs_review",t("eligibility.needsReview")],["linked",t("eligibility.linkedGuests")],["not_linked",t("eligibility.notLinked")],["invitation_sent",t("queue.sent")],["invitation_not_sent",t("eligibility.notSent")],
      ].map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></label></div>
      <div className="hidden overflow-x-auto lg:block"><table className="w-full min-w-[1500px] text-left text-sm"><thead className="bg-stone-50 text-xs uppercase tracking-wide text-slate-500"><tr>{[t("eligibility.contributor"),t("common.phone"),t("eligibility.paidAmount"),t("eligibility.pledgedAmount"),t("eligibility.classificationBasis"),t("eligibility.status"),t("eligibility.cardType"),t("eligibility.allowedGuests"),t("eligibility.linkedGuest"),t("eligibility.invitationStatus"),t("common.actions")].map((heading) => <th key={heading} className="p-3">{heading}</th>)}</tr></thead><tbody className="divide-y divide-stone-200">{filtered.map((row) => <EligibilityTableRow key={row.pledge.id} row={row} settings={settings} busy={busyId === row.pledge.id} eventId={eventId} onEdit={onEdit} onUnlink={onUnlink} onRecalculate={recalculate} />)}</tbody></table></div>
      <div className="grid gap-3 p-3 lg:hidden">{filtered.map((row) => <EligibilityMobileCard key={row.pledge.id} row={row} settings={settings} busy={busyId === row.pledge.id} eventId={eventId} onEdit={onEdit} onUnlink={onUnlink} onRecalculate={recalculate} />)}</div>
      {!filtered.length && <p className="p-10 text-center text-sm text-slate-500">{t("eligibility.noMatches")}</p>}
    </section>
  </div>;
}

type Row = { pledge: FinancialPledge; guest: FinancialGuest | null; invitation: { id: number; invitation_status: string; rsvp_status: string; viewed_at: string | null } | null; invitationSent: boolean };
function EligibilityBadge({ value }: { value: string }) {
  const { t } = useAppLanguage();
  const tone = ["single","double","eligible"].includes(value) ? "bg-emerald-50 text-emerald-700" : ["needs_review","pending_guest","sync_failed"].includes(value) ? "bg-amber-50 text-amber-800" : "bg-red-50 text-red-700";
  const labels: Record<string,string> = { eligible:t("eligibility.eligible"), single:t("eligibility.single"), double:t("eligibility.double"), below_minimum:t("eligibility.belowMinimum"), needs_review:t("eligibility.needsReview"), pending_guest:t("eligibility.pendingGuests"), not_linked:t("eligibility.notLinked"), sync_failed:t("eligibility.needsReview") };
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${tone}`}>{labels[value] ?? value.replaceAll("_", " ")}</span>;
}
function Actions({ row, eventId, busy, onEdit, onUnlink, onRecalculate }: { row: Row; eventId: number; busy: boolean; onEdit: (pledge: FinancialPledge) => void; onUnlink: (pledge: FinancialPledge) => Promise<void>; onRecalculate: (pledge: FinancialPledge) => Promise<void> }) {
  const { t } = useAppLanguage();
  const button = "min-h-9 rounded-lg border border-[#e7e1d7] px-2.5 text-xs font-semibold hover:bg-stone-50 disabled:opacity-50";
  return <div className="flex flex-wrap gap-1.5"><button type="button" className={button} onClick={() => onEdit(row.pledge)}>{t("eligibility.viewContributor")}</button>{row.guest ? <><Link className={button} href={`/events/${eventId}/guests`}>{t("eligibility.viewGuest")}</Link><Link className={button} href="/invitations">{t("queue.openInvitation")}</Link><button type="button" className={button} disabled={busy} onClick={() => void onUnlink(row.pledge)}>{t("eligibility.unlinkGuest")}</button></> : <button type="button" className={button} onClick={() => onEdit(row.pledge)}>{t("eligibility.linkGuest")}</button>}<button type="button" className={button} disabled={busy} onClick={() => void onRecalculate(row.pledge)}>{busy ? t("common.loading") : t("eligibility.recalculate")}</button></div>;
}
function EligibilityTableRow({ row, settings, ...actions }: { row: Row; settings: ContributorGuestSettings; eventId: number; busy: boolean; onEdit: (pledge: FinancialPledge) => void; onUnlink: (pledge: FinancialPledge) => Promise<void>; onRecalculate: (pledge: FinancialPledge) => Promise<void> }) {
  const status = row.pledge.guest_eligibility_status ?? "not_linked";
  return <tr><td className="p-3 font-bold">{row.pledge.full_name}</td><td className="p-3">{row.pledge.phone}</td><td className="p-3 tabular-nums">{formatTzs(row.pledge.total_paid)}</td><td className="p-3 tabular-nums">{formatTzs(row.pledge.pledged_amount)}</td><td className="p-3 capitalize">{settings.classification_basis.replace("_"," ")}</td><td className="p-3"><EligibilityBadge value={status} /></td><td className="p-3 capitalize">{["single","double"].includes(status) ? status : "—"}</td><td className="p-3">{row.guest?.allowed_guests ?? "—"}</td><td className="p-3">{row.guest?.full_name ?? "Not linked"}</td><td className="p-3">{row.invitationSent ? "Sent" : row.invitation ? row.invitation.invitation_status : "Not sent"}</td><td className="p-3"><Actions row={row} {...actions} /></td></tr>;
}
function EligibilityMobileCard({ row, settings, ...actions }: { row: Row; settings: ContributorGuestSettings; eventId: number; busy: boolean; onEdit: (pledge: FinancialPledge) => void; onUnlink: (pledge: FinancialPledge) => Promise<void>; onRecalculate: (pledge: FinancialPledge) => Promise<void> }) {
  const status = row.pledge.guest_eligibility_status ?? "not_linked";
  return <article className="rounded-xl border border-[#e7e1d7] p-4"><div className="flex justify-between gap-3"><div><h3 className="font-bold">{row.pledge.full_name}</h3><p className="text-sm text-slate-500">{row.pledge.phone}</p></div><EligibilityBadge value={status} /></div><dl className="mt-4 grid grid-cols-2 gap-3 text-sm">{[["Paid",formatTzs(row.pledge.total_paid)],["Pledged",formatTzs(row.pledge.pledged_amount)],["Basis",settings.classification_basis.replace("_"," ")],["Card",["single","double"].includes(status) ? status : "—"],["Allowed",String(row.guest?.allowed_guests ?? "—")],["Invitation",row.invitationSent ? "Sent" : "Not sent"]].map(([label,value]) => <div key={label}><dt className="text-xs text-slate-500">{label}</dt><dd className="mt-1 font-semibold capitalize">{value}</dd></div>)}</dl><div className="mt-4"><Actions row={row} {...actions} /></div></article>;
}
