"use client";
import { useState } from "react";
import Button from "@/components/ui/Button";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import { normalizeOptionalPledgePhone, type FinancialPledge, type PledgeInput } from "@/services/financialSuiteService";

type Guest = { id: number; full_name: string; phone: string | null; email: string | null };
export default function PledgeForm({ eventId, guests, pledge, onSave, onClose }: { eventId: number; guests: Guest[]; pledge?: FinancialPledge | null; onSave: (input: PledgeInput) => Promise<void>; onClose: () => void }) {
  const { t } = useAppLanguage();
  const [form, setForm] = useState(() => pledge ? { guestId: String(pledge.guest_id ?? ""), fullName: pledge.full_name, phone: pledge.phone ?? "", email: pledge.email ?? "", amount: pledge.pledged_amount, notes: pledge.notes ?? "", expectedDate:pledge.expected_completion_date??"" } : { guestId: "", fullName: "", phone: "", email: "", amount: "", notes: "", expectedDate:"" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  function chooseGuest(value: string) { const guest = guests.find((item) => item.id === Number(value)); setForm((old) => ({ ...old, guestId: value, ...(guest ? { fullName: guest.full_name, phone: guest.phone ?? "", email: guest.email ?? "" } : {}) })); }
  async function submit(event: React.FormEvent) {
    event.preventDefault(); setError("");
    if (!form.fullName.trim() || !/^\d+(\.\d{1,2})?$/.test(form.amount) || Number(form.amount) <= 0) { setError(t("pledge.validation")); return; }
    try {
      normalizeOptionalPledgePhone(form.phone);
      setSaving(true);
      await onSave({ eventId, guestId: form.guestId ? Number(form.guestId) : null, fullName: form.fullName, phone: form.phone, email: form.email, pledgedAmount: form.amount, notes: form.notes, expectedCompletionDate:form.expectedDate||null });
    }
    catch (cause) {
      if (cause instanceof Error && cause.message === "INVALID_TZ_PHONE") setError(t("pledge.invalidPhone"));
      else if (cause instanceof Error && cause.message !== "PLEDGE_SAVE_FAILED") setError(cause.message);
      else setError(t("pledge.saveError"));
    }
    finally { setSaving(false); }
  }
  const field = "mt-1 w-full rounded-xl border border-slate-300 px-3 py-2";
  return <form onSubmit={submit} className="space-y-4">
    <label className="block text-sm font-semibold">{t("pledge.linkGuest")}<select value={form.guestId} onChange={(event) => chooseGuest(event.target.value)} className={field}><option value="">{t("pledge.standalone")}</option>{guests.map((guest) => <option key={guest.id} value={guest.id}>{guest.full_name}</option>)}</select></label>
    <label className="block text-sm font-semibold">{t("pledge.fullName")}<input required value={form.fullName} onChange={(event) => setForm({ ...form, fullName: event.target.value })} className={field} /></label>
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="block text-sm font-semibold">{t("pledge.phone")}<input value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value })} className={field} /><span className="mt-1 block text-xs font-normal text-slate-500">{t("pledge.phoneHelper")}</span></label>
      <label className="block text-sm font-semibold">{t("pledge.email")}<input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className={field} /></label>
    </div>
    <label className="block text-sm font-semibold">{t("pledge.amount")}<input required inputMode="decimal" value={form.amount} onChange={(event) => setForm({ ...form, amount: event.target.value.replace(/,/g, "") })} className={field} /></label>
    <label className="block text-sm font-semibold">{t("pledge.expectedDate")}<input type="date" value={form.expectedDate} onChange={(event)=>setForm({...form,expectedDate:event.target.value})} className={field}/><span className="mt-1 block text-xs font-normal text-slate-500">{t("pledge.expectedDateHelper")}</span></label>
    <label className="block text-sm font-semibold">{t("pledge.notes")}<textarea value={form.notes} onChange={(event) => setForm({ ...form, notes: event.target.value })} className={field} /></label>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
    <div className="flex justify-end gap-2"><Button type="button" variant="secondary" onClick={onClose}>{t("common.cancel")}</Button><Button type="submit" variant="primary" loading={saving} disabled={saving}>{saving ? t("common.saving") : t("pledge.save")}</Button></div>
  </form>;
}
