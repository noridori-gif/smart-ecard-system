"use client";
import { useState } from "react";
import type { FinancialPledge, PledgeInput } from "@/services/financialSuiteService";

type Guest = { id: number; full_name: string; phone: string | null; email: string | null };
export default function PledgeForm({ eventId, guests, pledge, onSave, onClose }: {
  eventId: number; guests: Guest[]; pledge?: FinancialPledge | null;
  onSave: (input: PledgeInput) => Promise<void>; onClose: () => void;
}) {
  const [form, setForm] = useState(() => pledge ? {
    guestId: String(pledge.guest_id ?? ""), fullName: pledge.full_name, phone: pledge.phone,
    email: pledge.email ?? "", amount: pledge.pledged_amount, notes: pledge.notes ?? "",
  } : { guestId: "", fullName: "", phone: "", email: "", amount: "", notes: "" });
  const [saving, setSaving] = useState(false); const [error, setError] = useState("");
  function chooseGuest(value: string) {
    const guest = guests.find((item) => item.id === Number(value));
    setForm((old) => ({ ...old, guestId: value, ...(guest ? { fullName: guest.full_name, phone: guest.phone ?? "", email: guest.email ?? "" } : {}) }));
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setError("");
    if (!form.fullName.trim() || !form.phone.trim() || !/^\d+(\.\d{1,2})?$/.test(form.amount) || Number(form.amount) <= 0) {
      setError("Jina, simu na kiasi chanya vinahitajika."); return;
    }
    try { setSaving(true); await onSave({ eventId, guestId: form.guestId ? Number(form.guestId) : null, fullName: form.fullName, phone: form.phone, email: form.email, pledgedAmount: form.amount, notes: form.notes }); }
    catch (err) { setError(err instanceof Error ? err.message : "Ahadi haikuhifadhiwa."); }
    finally { setSaving(false); }
  }
  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block text-sm font-semibold">Existing guest (optional)
        <select value={form.guestId} onChange={(e) => chooseGuest(e.target.value)} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2"><option value="">Standalone contributor</option>{guests.map((g) => <option key={g.id} value={g.id}>{g.full_name}</option>)}</select>
      </label>
      <label className="block text-sm font-semibold">Full name<input required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block text-sm font-semibold">Phone<input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
        <label className="block text-sm font-semibold">Email (optional)<input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
      </div>
      <label className="block text-sm font-semibold">Pledged amount (TZS)<input required inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value.replace(/,/g, "") })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
      <label className="block text-sm font-semibold">Notes (optional)<textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="mt-1 w-full rounded-xl border border-slate-300 px-3 py-2" /></label>
      {error && <p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">Cancel</button><button disabled={saving} className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{saving ? "Saving..." : "Save pledge"}</button></div>
    </form>
  );
}
