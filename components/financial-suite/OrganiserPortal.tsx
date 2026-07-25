"use client";
import { useMemo, useState } from "react";
import FinancialSummaryCards from "./FinancialSummaryCards";
import RecordPaymentDialog from "./RecordPaymentDialog";
import { buildPledgeMessage, formatTzs, type PledgeMessageType } from "@/services/pledgeMessageService";
import type { FinanceSummary, FinancialPledge, PledgeInput, PledgePayment } from "@/services/financialSuiteService";

export type PortalData = {
  access_status: "active"; event: { id: number; title: string; event_date: string; language: "sw" | "en" };
  permissions: Record<string, boolean>; summary: FinanceSummary; pledges: FinancialPledge[];
};
const labels = { pledged: "Ameahidi", partial: "Amepunguza", completed: "Amekamilisha", cancelled: "Imefutwa" };
async function request(token: string, body: Record<string, unknown>) {
  const response = await fetch("/api/contributions/organiser", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token, ...body }), cache: "no-store" });
  const payload = await response.json(); if (!response.ok) throw new Error(payload.error || "Request failed."); return payload;
}

export default function OrganiserPortal({ token, initialData }: { token: string; initialData: PortalData }) {
  const [data, setData] = useState(initialData); const [query, setQuery] = useState(""); const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<FinancialPledge | null>(null); const [dialog, setDialog] = useState<"create"|"edit"|"payment"|"history"|"reminder"|null>(null);
  const [history, setHistory] = useState<PledgePayment[]>([]); const [error, setError] = useState(""); const [notice, setNotice] = useState("");
  const visible = useMemo(() => data.pledges.filter((p) => (status === "all" || p.calculated_status === status) && `${p.full_name} ${p.phone}`.toLowerCase().includes(query.toLowerCase())), [data, query, status]);
  async function refresh(message?: string) {
    const next = await request(token, { action: "refresh" }); if (next.access_status !== "active") throw new Error("This access link is no longer active.");
    setData(next); if (message) setNotice(message);
  }
  async function saveDetails(values: PledgeInput) {
    await request(token, { action: dialog === "edit" ? "edit_pledge" : "create_pledge", pledgeId: selected?.id, fullName: values.fullName, phone: values.phone, email: values.email, pledgedAmount: values.pledgedAmount, notes: values.notes });
    setDialog(null); await refresh(dialog === "edit" ? "Contributor updated." : "Pledge created.");
  }
  async function historyFor(pledge: FinancialPledge) {
    try { setSelected(pledge); const result = await request(token, { action: "payment_history", pledgeId: pledge.id }); setHistory(result.payments ?? []); setDialog("history"); }
    catch (err) { setError(err instanceof Error ? err.message : "History could not be loaded."); }
  }
  return <main className="min-h-screen bg-slate-100">
    <header className="bg-slate-950 px-4 py-6 text-white"><div className="mx-auto max-w-6xl"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-400">Smart Event Pass · Committee Portal</p><h1 className="mt-2 text-2xl font-bold">{data.event.title}</h1><p className="text-sm text-slate-300">{data.event.event_date}</p></div></header>
    <div className="mx-auto max-w-6xl space-y-5 p-4 sm:p-6">
      {notice && <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}{error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      <FinancialSummaryCards summary={{ ...data.summary, active_pledge_count: data.pledges.filter((p) => p.calculated_status !== "cancelled").length, pledged_count: data.pledges.filter((p) => p.calculated_status === "pledged").length, partial_count: data.pledges.filter((p) => p.calculated_status === "partial").length, completed_count: data.pledges.filter((p) => p.calculated_status === "completed").length, cancelled_count: data.pledges.filter((p) => p.calculated_status === "cancelled").length }} />
      <section className="rounded-2xl border bg-white shadow-sm"><div className="flex flex-col gap-3 border-b p-4 sm:flex-row">{data.permissions.search && <><input aria-label="Search contributors" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name or phone" className="flex-1 rounded-xl border px-3 py-2" /><select aria-label="Status filter" value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border px-3 py-2"><option value="all">All statuses</option>{Object.entries(labels).map(([key,value]) => <option key={key} value={key}>{value}</option>)}</select></>}{data.permissions.create_pledges && <button onClick={() => { setSelected(null); setDialog("create"); }} className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white">+ New pledge</button>}</div>
        <div className="grid gap-3 p-3">{visible.length === 0 && <p className="p-8 text-center text-slate-500">No pledges found.</p>}{visible.map((p) => <article key={p.id} className="rounded-xl border p-4"><div className="flex justify-between gap-3"><div><h2 className="font-bold">{p.full_name}</h2><p className="text-sm text-slate-500">{p.phone}</p></div><span className="h-fit rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{labels[p.calculated_status]}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div>Pledged<br/><b>{formatTzs(p.pledged_amount)}</b></div><div>Paid<br/><b className="text-emerald-700">{formatTzs(p.total_paid)}</b></div><div>Balance<br/><b>{formatTzs(p.balance)}</b></div></div><div className="mt-4 flex flex-wrap gap-4 text-sm font-semibold">{data.permissions.record_payments && p.calculated_status !== "completed" && p.calculated_status !== "cancelled" && <button onClick={() => { setSelected(p); setDialog("payment"); }} className="text-emerald-700">Record payment</button>}{data.permissions.edit_contributors && <button onClick={() => { setSelected(p); setDialog("edit"); }} className="text-blue-700">Edit details</button>}{data.permissions.view_payment_history && <button onClick={() => void historyFor(p)} className="text-slate-700">Payment history</button>}{data.permissions.send_reminders && <button onClick={() => { setSelected(p); setDialog("reminder"); }} className="text-amber-700">Reminder preview</button>}</div></article>)}</div>
      </section>
    </div>
    <footer className="p-6 text-center text-sm text-slate-500">Managed securely by Smart Event Pass</footer>
    {dialog && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-6"><h2 className="mb-4 text-xl font-bold">{dialog === "create" ? "Create pledge" : dialog === "edit" ? "Edit contributor" : dialog === "payment" ? "Record payment" : dialog === "history" ? "Payment history" : "Reminder preview"}</h2>
      {(dialog === "create" || dialog === "edit") && <PortalDetailsForm pledge={selected} onSave={saveDetails} onClose={() => setDialog(null)} />}
      {dialog === "payment" && selected && <RecordPaymentDialog pledge={selected} onClose={() => setDialog(null)} onSave={async (values) => { const result = await request(token, { action: "record_payment", pledgeId: selected.id, ...values }); setDialog(null); await refresh(`Payment recorded. Receipt ${result.receipt_number}.`); }} />}
      {dialog === "history" && <div className="space-y-3">{!history.length ? <p className="text-slate-500">No payments recorded.</p> : history.map((p) => <div key={p.id} className="rounded-xl border p-3"><div className="flex justify-between"><b>{formatTzs(p.amount)}</b><span className={p.voided_at ? "text-red-700" : "text-emerald-700"}>{p.voided_at ? "Voided" : p.receipt_number}</span></div><p className="text-sm text-slate-500">{p.payment_date} · {p.payment_method}</p></div>)}<button onClick={() => setDialog(null)} className="rounded-xl border px-4 py-2">Close</button></div>}
      {dialog === "reminder" && selected && <ReminderPreview pledge={selected} event={data.event} onClose={() => setDialog(null)} />}
    </div></div>}
  </main>;
}

function PortalDetailsForm({ pledge, onSave, onClose }: { pledge: FinancialPledge | null; onSave: (values: PledgeInput) => Promise<void>; onClose: () => void }) {
  const [form,setForm]=useState({ fullName:pledge?.full_name??"",phone:pledge?.phone??"",email:pledge?.email??"",amount:pledge?.pledged_amount??"",notes:pledge?.notes??"" }); const [busy,setBusy]=useState(false); const [error,setError]=useState("");
  return <form className="space-y-3" onSubmit={async(e)=>{e.preventDefault();try{setBusy(true);await onSave({eventId:pledge?.event_id??0,fullName:form.fullName,phone:form.phone,email:form.email,pledgedAmount:form.amount,notes:form.notes});}catch(err){setError(err instanceof Error?err.message:"Could not save.");}finally{setBusy(false);}}}><label className="block text-sm font-semibold">Full name<input required value={form.fullName} onChange={(e)=>setForm({...form,fullName:e.target.value})} className="mt-1 w-full rounded-xl border px-3 py-2"/></label><label className="block text-sm font-semibold">Phone<input required value={form.phone} onChange={(e)=>setForm({...form,phone:e.target.value})} className="mt-1 w-full rounded-xl border px-3 py-2"/></label><label className="block text-sm font-semibold">Email<input type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} className="mt-1 w-full rounded-xl border px-3 py-2"/></label>{!pledge&&<label className="block text-sm font-semibold">Pledged amount<input required inputMode="decimal" value={form.amount} onChange={(e)=>setForm({...form,amount:e.target.value.replace(/,/g,"")})} className="mt-1 w-full rounded-xl border px-3 py-2"/></label>}<label className="block text-sm font-semibold">Notes<textarea value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} className="mt-1 w-full rounded-xl border px-3 py-2"/></label>{error&&<p className="text-sm text-red-700">{error}</p>}<div className="flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-xl border px-4 py-2">Cancel</button><button disabled={busy} className="rounded-xl bg-emerald-600 px-4 py-2 font-semibold text-white">{busy?"Saving...":"Save"}</button></div></form>;
}
function ReminderPreview({ pledge,event,onClose }:{pledge:FinancialPledge;event:PortalData["event"];onClose:()=>void}) {
  const [type,setType]=useState<PledgeMessageType>(pledge.calculated_status==="completed"?"completed_thank_you":pledge.calculated_status==="partial"?"partial_thank_you":"pledge_reminder");
  const message=buildPledgeMessage(type,event.language,{guestName:pledge.full_name,eventTitle:event.title,pledgedAmount:pledge.pledged_amount,totalPaid:pledge.total_paid,balance:pledge.balance});
  return <div className="space-y-3"><select value={type} onChange={(e)=>setType(e.target.value as PledgeMessageType)} className="w-full rounded-xl border px-3 py-2"><option value="pledge_reminder">Pledge reminder</option><option value="partial_thank_you">Partial thank-you</option><option value="completed_thank_you">Completion thank-you</option></select><pre className="whitespace-pre-wrap rounded-xl bg-slate-50 p-4 text-sm">{message}</pre><p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Provider sending is pending configuration. No message has been sent or recorded.</p><div className="flex justify-end gap-2"><button onClick={onClose} className="rounded-xl border px-4 py-2">Close</button><button disabled className="rounded-xl bg-slate-300 px-4 py-2 font-semibold text-white">Send unavailable</button></div></div>;
}
