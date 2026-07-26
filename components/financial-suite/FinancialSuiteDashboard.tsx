"use client";
import { use, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FinancialSummaryCards from "./FinancialSummaryCards";
import PledgeForm from "./PledgeForm";
import RecordPaymentDialog from "./RecordPaymentDialog";
import OrganiserAccessPanel from "./OrganiserAccessPanel";
import PaymentHistoryDialog from "./PaymentHistoryDialog";
import AutomationAndClosingPanel from "./AutomationAndClosingPanel";
import ReceiptDialog from "./ReceiptDialog";
import type { FinanceReceipt } from "@/services/receiptMessageService";
import { createClient } from "@/lib/supabase/client";
import {
  cancelPledge, createPledge, exportPledges, getFinancialSuite, getPayments, recordPayment,
  updatePledge, downloadPledgeTemplate, type FinancialPledge, type PledgeInput,
  type PledgePayment,
} from "@/services/financialSuiteService";
import { formatTzs } from "@/services/pledgeMessageService";

const statusLabels = { pledged: "Ameahidi", partial: "Amepunguza", completed: "Amekamilisha", cancelled: "Imefutwa" };
export default function FinancialSuiteDashboard({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params); const eventId = Number(id);
  const [data, setData] = useState<Awaited<ReturnType<typeof getFinancialSuite>> | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [notice, setNotice] = useState(""); const [mode, setMode] = useState<"pledge" | "payment" | "history" | null>(null);
  const [selected, setSelected] = useState<FinancialPledge | null>(null);
  const [payments,setPayments]=useState<PledgePayment[]>([]);
  const [newReceipt,setNewReceipt]=useState<{receipt:FinanceReceipt;verificationUrl:string}|null>(null);
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1); const pageSize = 10;
  const load = useCallback(async () => {
    try { setLoading(true); setError(""); setData(await getFinancialSuite(eventId)); }
    catch (err) { setError(err instanceof Error ? err.message : "Financial data could not be loaded."); }
    finally { setLoading(false); }
  }, [eventId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  const filtered = useMemo(() => (data?.pledges ?? []).filter((p) =>
    (status === "all" || p.calculated_status === status) &&
    (`${p.full_name} ${p.phone} ${p.normalized_phone}`.toLowerCase().includes(query.toLowerCase()))
  ), [data, query, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)); const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  async function savePledge(input: PledgeInput) {
    if (selected) await updatePledge(selected.id, input, selected.total_paid); else await createPledge(input);
    setMode(null); setSelected(null); setNotice("Pledge saved successfully."); await load();
  }
  async function savePayment(values: Parameters<typeof recordPayment>[1]) {
    if (!selected) return; const result = await recordPayment(selected.id, values);
    setMode(null); setSelected(null); setNewReceipt({receipt:result.receipt,verificationUrl:result.verificationUrl});setNotice(`Payment recorded. Receipt ${result.receipt.receipt_number}. Status: ${statusLabels[result.pledge.calculated_status]}.`); await load();
  }
  async function cancel(item: FinancialPledge) {
    const reason = window.prompt(`Reason for cancelling ${item.full_name}'s pledge:`);
    if (!reason) return;
    try { await cancelPledge(item.id, reason); setNotice("Pledge cancelled; its history was preserved."); await load(); }
    catch (err) { setError(err instanceof Error ? err.message : "Cancellation failed."); }
  }
  async function openHistory(item:FinancialPledge){try{setSelected(item);setPayments(await getPayments(item.id));setMode("history");}catch(err){setError(err instanceof Error?err.message:"Payment history could not be loaded.");}}
  async function issueReceipt(receiptNumber:string){
    const {data}=await createClient().auth.getSession(); if(!data.session?.access_token)throw new Error("Your session has expired.");
    const response=await fetch("/api/contributions/receipts",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({receiptNumber})});
    const payload=await response.json();if(!response.ok)throw new Error(payload.error||"Receipt could not be issued.");return payload;
  }
  if (loading) return <div role="status" className="rounded-2xl bg-white p-8 text-center">Loading Financial Suite...</div>;
  return <section className="space-y-6">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><Link href="/events" className="text-sm font-semibold text-emerald-700">← Events</Link><h1 className="mt-2 text-3xl font-bold text-slate-900">Michango &amp; Ahadi</h1><p className="text-slate-600">{data?.event.title ?? "Financial Suite"} · Contributions &amp; Pledges</p></div>
      <div className="flex flex-wrap gap-2"><button onClick={downloadPledgeTemplate} className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">Import template</button><button disabled={!data} onClick={() => data && exportPledges(data.event.title, data.pledges)} className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">Export Excel</button><button onClick={() => { setSelected(null); setMode("pledge"); }} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">+ Create pledge</button></div>
    </div>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{notice}</div>}
    {data && <FinancialSummaryCards summary={data.summary} />}
    <OrganiserAccessPanel eventId={eventId} />
    {data&&<AutomationAndClosingPanel eventId={eventId} eventDate={data.event.event_date} pledges={data.pledges}/>}
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row"><label className="sr-only" htmlFor="pledge-search">Search contributors</label><input id="pledge-search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search by name or phone..." className="flex-1 rounded-xl border px-3 py-2" /><select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border px-3 py-2"><option value="all">All statuses</option>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      {!visible.length ? <div className="p-10 text-center text-slate-500">No pledges match this view.</div> :
      <><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[980px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{["Contributor","Phone","Pledged","Paid","Balance","Status","Last Payment","Actions"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y">{visible.map((p) => <tr key={p.id}><td className="px-4 py-3 font-semibold">{p.full_name}</td><td className="px-4 py-3">{p.phone}</td><td className="px-4 py-3">{formatTzs(p.pledged_amount)}</td><td className="px-4 py-3 text-emerald-700">{formatTzs(p.total_paid)}</td><td className="px-4 py-3">{formatTzs(p.balance)}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{statusLabels[p.calculated_status]}</span></td><td className="px-4 py-3">{p.last_payment_at ? new Date(p.last_payment_at).toLocaleDateString() : "—"}</td><td className="px-4 py-3"><div className="flex gap-2"><button onClick={() => { setSelected(p); setMode("payment"); }} disabled={p.calculated_status === "cancelled" || p.calculated_status === "completed"} className="font-semibold text-emerald-700 disabled:text-slate-300">Pay</button><button onClick={() =>void openHistory(p)} className="font-semibold text-slate-700">History</button><button onClick={() => { setSelected(p); setMode("pledge"); }} className="font-semibold text-blue-700">Edit</button><button onClick={() => void cancel(p)} disabled={p.calculated_status === "cancelled"} className="font-semibold text-red-700 disabled:text-slate-300">Cancel</button></div></td></tr>)}</tbody></table></div>
      <div className="grid gap-3 p-3 md:hidden">{visible.map((p) => <article key={p.id} className="rounded-xl border p-4"><div className="flex justify-between"><div><h2 className="font-bold">{p.full_name}</h2><p className="text-sm text-slate-500">{p.phone}</p></div><span className="text-xs font-bold">{statusLabels[p.calculated_status]}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div>Pledged<br/><b>{formatTzs(p.pledged_amount)}</b></div><div>Paid<br/><b>{formatTzs(p.total_paid)}</b></div><div>Balance<br/><b>{formatTzs(p.balance)}</b></div></div><div className="mt-4 flex gap-4"><button onClick={() => { setSelected(p); setMode("payment"); }} className="font-semibold text-emerald-700">Record payment</button><button onClick={() => { setSelected(p); setMode("pledge"); }} className="font-semibold text-blue-700">Edit</button></div></article>)}</div></>}
      <div className="flex items-center justify-between border-t p-4 text-sm"><span>{filtered.length} contributor(s)</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">Previous</button><span className="px-2 py-1">{page}/{pages}</span><button disabled={page === pages} onClick={() => setPage(page + 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">Next</button></div></div>
    </div>
    {mode && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6"><h2 className="mb-4 text-xl font-bold">{mode === "payment" ? `Record payment · ${selected?.full_name}` : mode==="history" ? `Payment history · ${selected?.full_name}` : selected ? "Edit pledge" : "Create pledge"}</h2>{mode === "pledge" && data ? <PledgeForm eventId={eventId} guests={data.guests} pledge={selected} onSave={savePledge} onClose={() => setMode(null)} /> : mode==="history" ? <PaymentHistoryDialog payments={payments} language={data?.event.language} issueReceipt={issueReceipt} onClose={()=>setMode(null)}/> : selected ? <RecordPaymentDialog pledge={selected} onSave={savePayment} onClose={() => setMode(null)} /> : null}</div></div>}
    {newReceipt&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6"><ReceiptDialog {...newReceipt} language={data?.event.language} onClose={()=>setNewReceipt(null)}/></div></div>}
  </section>;
}
