"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import FinancialSummaryCards from "./FinancialSummaryCards";
import FinancialSummaryStrip from "./FinancialSummaryStrip";
import FinancialTabNavigation from "./FinancialTabNavigation";
import type { FinancialTab } from "@/lib/financialTabs";
import PledgeForm from "./PledgeForm";
import RecordPaymentDialog from "./RecordPaymentDialog";
import OrganiserAccessPanel from "./OrganiserAccessPanel";
import PaymentHistoryDialog from "./PaymentHistoryDialog";
import FinancialPaymentsTab from "./tabs/FinancialPaymentsTab";
import FinancialRemindersTab from "./tabs/FinancialRemindersTab";
import FinancialReportsTab from "./tabs/FinancialReportsTab";
import ReceiptDialog from "./ReceiptDialog";
import FinancialImportWizard from "./FinancialImportWizard";
import BudgetDeadlineEditor from "./BudgetDeadlineEditor";
import ContributionBulkActionsDialog from "./ContributionBulkActionsDialog";
import FinancialReminderDialog from "./FinancialReminderDialog";
import EditPaymentDialog from "./EditPaymentDialog";
import VoidPaymentDialog from "./VoidPaymentDialog";
import type { FinanceReceipt } from "@/services/receiptMessageService";
import { createClient } from "@/lib/supabase/client";
import {
  cancelPledge, correctPayment, createPledge, exportPledges, getFinancialSuite, getPayments, recordPayment,
  updatePledge, downloadPledgeTemplate, permanentlyDeletePledge, restorePledge, type FinancialPledge, type PledgeInput,
  type PledgePayment, voidPayment,
} from "@/services/financialSuiteService";
import { formatTzs } from "@/services/pledgeMessageService";

const statusLabels = { pledged: "Ameahidi", partial: "Amepunguza", completed: "Amekamilisha", cancelled: "Imefutwa" };
export default function FinancialSuiteDashboard({ eventId: eventIdParam, initialTab }: { eventId: string; initialTab: FinancialTab }) {
  const eventId = Number(eventIdParam);
  const validEventId = Number.isSafeInteger(eventId) && eventId > 0;
  const router=useRouter();const pathname=usePathname();const activeTab=initialTab;
  const [data, setData] = useState<Awaited<ReturnType<typeof getFinancialSuite>> | null>(null);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [notice, setNotice] = useState(""); const [mode, setMode] = useState<"pledge" | "payment" | "history" | "correct-payment" | "void-payment" | "import" | "bulk" | "reminder" | null>(null);
  const [selected, setSelected] = useState<FinancialPledge | null>(null);
  const [payments,setPayments]=useState<PledgePayment[]>([]);
  const [selectedPayment,setSelectedPayment]=useState<PledgePayment|null>(null);
  const [actionPledgeId,setActionPledgeId]=useState<number|null>(null);
  const [newReceipt,setNewReceipt]=useState<{receipt:FinanceReceipt;verificationUrl:string}|null>(null);
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1); const pageSize = 10;
  const load = useCallback(async () => {
    if (!validEventId) {
      setError("Invalid event ID.");
      setLoading(false);
      return;
    }
    try { setLoading(true); setError(""); setData(await getFinancialSuite(eventId)); }
    catch (err) { setError(err instanceof Error ? err.message : "Financial data could not be loaded."); }
    finally { setLoading(false); }
  }, [eventId, validEventId]);
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
  async function restore(item: FinancialPledge) {
    if (!window.confirm(`Restore ${item.full_name}'s pledge? Its status will be recalculated from its payment history.`)) return;
    try {
      setActionPledgeId(item.id); setError("");
      const restored = await restorePledge(item.id);
      setNotice(`Pledge restored. Status: ${statusLabels[restored.calculated_status]}.`);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Restore failed.");
    } finally {
      setActionPledgeId(null);
    }
  }
  async function permanentlyDelete(item: FinancialPledge) {
    const confirmation = window.prompt(
      `Permanently delete ${item.full_name}'s cancelled pledge? This cannot be undone.\n\nType the contributor's full name to confirm:`,
    );
    if (confirmation === null) return;
    try {
      setActionPledgeId(item.id); setError("");
      await permanentlyDeletePledge(item.id, confirmation);
      setNotice("Cancelled pledge permanently deleted. The linked guest was preserved.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Permanent deletion failed.");
    } finally {
      setActionPledgeId(null);
    }
  }
  async function openHistory(item:FinancialPledge){try{setSelected(item);setPayments(await getPayments(item.id));setMode("history");}catch(err){setError(err instanceof Error?err.message:"Payment history could not be loaded.");}}
  async function saveCorrection(values:Parameters<typeof correctPayment>[1]){
    if(!selected||!selectedPayment)return;
    await correctPayment(selectedPayment.id,values);
    setPayments(await getPayments(selected.id));
    setSelectedPayment(null);setMode("history");setNotice("Payment corrected. Financial totals and reports have been refreshed.");
    await load();
  }
  async function saveVoid(reason:string){
    if(!selected||!selectedPayment)return;
    const result=await voidPayment(selectedPayment.id,reason);
    setPayments(await getPayments(selected.id));
    setSelectedPayment(null);setMode("history");
    setNotice(`Payment voided. Receipt ${selectedPayment.receipt_number} remains in history. Status: ${statusLabels[result.calculated_status]}.`);
    await load();
  }
  async function issueReceipt(receiptNumber:string){
    const {data}=await createClient().auth.getSession(); if(!data.session?.access_token)throw new Error("Your session has expired.");
    const response=await fetch("/api/contributions/receipts",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${data.session.access_token}`},body:JSON.stringify({receiptNumber})});
    const payload=await response.json();if(!response.ok)throw new Error(payload.error||"Receipt could not be issued.");return payload;
  }
  function changeTab(tab:FinancialTab){router.push(`${pathname}?tab=${tab}`,{scroll:false});}
  if (loading) return <div role="status" className="rounded-2xl bg-white p-8 text-center">Loading Financial Suite...</div>;
  return <section className="space-y-5">
    <header><Link href="/events" className="text-sm font-semibold text-emerald-700">← Back to Events</Link><h1 className="mt-2 text-3xl font-bold text-slate-900">Michango &amp; Ahadi</h1><p className="mt-1 text-slate-600"><span className="font-medium text-slate-800">{data?.event.title ?? "Financial Suite"}</span> · Manage contributions, payments, reminders and reports.</p></header>
    {error && <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>}
    {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">{notice}</div>}
    {data&&<FinancialSummaryStrip summary={data.summary}/>}
    <FinancialTabNavigation active={activeTab} onChange={changeTab}/>
    {activeTab==="overview"&&data&&<div className="space-y-6"><div className="flex flex-wrap gap-2"><button onClick={()=>{setSelected(null);setMode("pledge");}} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">+ Create pledge</button><button onClick={()=>setMode("import")} className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">Import Excel</button><button onClick={()=>changeTab("reports")} className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">Generate report</button><button onClick={()=>changeTab("contributors")} className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">Open contributors</button></div><FinancialSummaryCards summary={data.summary}/><section className="rounded-2xl border border-dashed border-slate-300 bg-white p-6"><h2 className="text-lg font-bold">Recent activity</h2><p className="mt-1 text-sm text-slate-500">Latest finance activity is available in the focused Payments workspace.</p><button onClick={()=>changeTab("payments")} className="mt-4 rounded-xl border px-4 py-2 text-sm font-semibold">View recent payments</button></section></div>}
    {activeTab==="contributors"&&data&&<div className="space-y-4"><div className="flex flex-wrap gap-2"><button onClick={()=>{setSelected(null);setMode("pledge");}} className="rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">+ Create pledge</button><button onClick={()=>setMode("import")} className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">Import Excel</button><button onClick={()=>setMode("bulk")} className="rounded-xl border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-700">Bulk Actions</button><button onClick={()=>exportPledges(data.event.title,data.pledges)} className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">Export contributors</button><button onClick={downloadPledgeTemplate} className="rounded-xl border bg-white px-4 py-2 text-sm font-semibold">Import template</button></div><div className="rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row"><label className="sr-only" htmlFor="pledge-search">Search contributors</label><input id="pledge-search" value={query} onChange={(e) => { setQuery(e.target.value); setPage(1); }} placeholder="Search by name or phone..." className="flex-1 rounded-xl border px-3 py-2" /><select aria-label="Filter by status" value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="rounded-xl border px-3 py-2"><option value="all">All statuses</option>{Object.entries(statusLabels).map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select></div>
      {!visible.length ? <div className="p-10 text-center text-slate-500">No pledges match this view.</div> :
      <><div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[1100px] text-left text-sm"><thead className="bg-slate-50 text-slate-600"><tr>{["Contributor","Phone","Pledged","Paid","Balance","Status","Last Payment","Actions"].map((h) => <th key={h} className="px-4 py-3">{h}</th>)}</tr></thead><tbody className="divide-y">{visible.map((p) => <tr key={p.id}><td className="px-4 py-3 font-semibold">{p.full_name}</td><td className="px-4 py-3">{p.phone}</td><td className="px-4 py-3">{formatTzs(p.pledged_amount)}</td><td className="px-4 py-3 text-emerald-700">{formatTzs(p.total_paid)}</td><td className="px-4 py-3">{formatTzs(p.balance)}</td><td className="px-4 py-3"><span className="rounded-full bg-slate-100 px-2 py-1 text-xs font-bold">{statusLabels[p.calculated_status]}</span></td><td className="px-4 py-3">{p.last_payment_at ? new Date(p.last_payment_at).toLocaleDateString() : "—"}</td><td className="px-4 py-3">{p.calculated_status === "cancelled" ? <div className="flex min-w-[430px] flex-wrap items-center gap-x-3 gap-y-2"><button disabled={actionPledgeId === p.id} onClick={() => void restore(p)} className="font-semibold text-emerald-700 disabled:opacity-50">Restore</button><button onClick={() =>void openHistory(p)} className="font-semibold text-slate-700">Payment History</button><button onClick={() => { setSelected(p); setMode("pledge"); }} className="font-semibold text-blue-700">Edit details</button>{p.payment_row_count === 0 && !p.has_protected_financial_history ? <button disabled={actionPledgeId === p.id} onClick={() => void permanentlyDelete(p)} className="font-semibold text-red-700 disabled:opacity-50">Delete Permanently</button> : <span title="Cannot permanently delete because payment history exists." className="cursor-not-allowed font-semibold text-slate-400" aria-disabled="true">Delete Permanently <span className="font-normal">— Cannot permanently delete because payment history exists.</span></span>}</div> : <div className="flex gap-2"><button onClick={() => { setSelected(p); setMode("payment"); }} disabled={p.calculated_status === "completed"} className="font-semibold text-emerald-700 disabled:text-slate-300">Pay</button><button onClick={() => { setSelected(p); setMode("reminder"); }} disabled={p.calculated_status === "completed"} className="font-semibold text-amber-700 disabled:text-slate-300">Remind</button><button onClick={() =>void openHistory(p)} className="font-semibold text-slate-700">History</button><button onClick={() => { setSelected(p); setMode("pledge"); }} className="font-semibold text-blue-700">Edit</button><button onClick={() => void cancel(p)} className="font-semibold text-red-700">Cancel</button></div>}</td></tr>)}</tbody></table></div>
      <div className="grid gap-3 p-3 md:hidden">{visible.map((p) => <article key={p.id} className="rounded-xl border p-4"><div className="flex justify-between gap-3"><div><h2 className="font-bold">{p.full_name}</h2><p className="text-sm text-slate-500">{p.phone}</p></div><span className="shrink-0 text-xs font-bold">{statusLabels[p.calculated_status]}</span></div><div className="mt-4 grid grid-cols-3 gap-2 text-xs"><div>Pledged<br/><b>{formatTzs(p.pledged_amount)}</b></div><div>Paid<br/><b>{formatTzs(p.total_paid)}</b></div><div>Balance<br/><b>{formatTzs(p.balance)}</b></div></div>{p.calculated_status === "cancelled" ? <div className="mt-4 grid grid-cols-2 gap-2 text-sm"><button disabled={actionPledgeId === p.id} onClick={() => void restore(p)} className="rounded-lg border border-emerald-200 px-3 py-2 font-semibold text-emerald-700 disabled:opacity-50">Restore</button><button onClick={() => void openHistory(p)} className="rounded-lg border px-3 py-2 font-semibold text-slate-700">Payment History</button><button onClick={() => { setSelected(p); setMode("pledge"); }} className="rounded-lg border border-blue-200 px-3 py-2 font-semibold text-blue-700">Edit details</button>{p.payment_row_count === 0 && !p.has_protected_financial_history ? <button disabled={actionPledgeId === p.id} onClick={() => void permanentlyDelete(p)} className="rounded-lg border border-red-300 px-3 py-2 font-semibold text-red-700 disabled:opacity-50">Delete Permanently</button> : <div title="Cannot permanently delete because payment history exists." aria-disabled="true" className="col-span-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-center font-semibold text-slate-400"><span>Delete Permanently — disabled</span><span className="mt-1 block text-xs font-normal">Cannot permanently delete because payment history exists.</span></div>}</div> : <div className="mt-4 flex flex-wrap gap-4"><button disabled={p.calculated_status==="completed"} onClick={() => { setSelected(p); setMode("payment"); }} className="font-semibold text-emerald-700 disabled:text-slate-300">Record payment</button><button disabled={p.calculated_status==="completed"} onClick={() => { setSelected(p); setMode("reminder"); }} className="font-semibold text-amber-700 disabled:text-slate-300">Reminder</button><button onClick={() => void openHistory(p)} className="font-semibold text-slate-700">History</button><button onClick={() => { setSelected(p); setMode("pledge"); }} className="font-semibold text-blue-700">Edit</button></div>}</article>)}</div></>}
      <div className="flex items-center justify-between border-t p-4 text-sm"><span>{filtered.length} contributor(s)</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">Previous</button><span className="px-2 py-1">{page}/{pages}</span><button disabled={page === pages} onClick={() => setPage(page + 1)} className="rounded-lg border px-3 py-1 disabled:opacity-40">Next</button></div></div>
    </div></div>}
    {activeTab==="payments"&&data&&<div className="space-y-3"><div><h2 className="text-2xl font-bold">Payments</h2><p className="text-sm text-slate-600">Review transactions, receipts, corrections, voids and daily collection summaries.</p></div><FinancialPaymentsTab eventId={eventId} pledges={data.pledges} issueReceipt={issueReceipt} onViewReceipt={setNewReceipt} onEdit={(pledge,payment)=>{setSelected(pledge);setSelectedPayment(payment);setMode("correct-payment");}} onVoid={(pledge,payment)=>{setSelected(pledge);setSelectedPayment(payment);setMode("void-payment");}}/></div>}
    {activeTab==="reminders"&&data&&<div className="space-y-3"><div><h2 className="text-2xl font-bold">Reminders</h2><p className="text-sm text-slate-600">Configure automation, preview recipients and review delivery operations.</p></div><FinancialRemindersTab eventId={eventId} eventDate={data.event.event_date} deadline={data.summary.contribution_deadline} pledges={data.pledges}/></div>}
    {activeTab==="reports"&&data&&<div className="space-y-3"><div><h2 className="text-2xl font-bold">Reports</h2><p className="text-sm text-slate-600">Analyse collections and produce the financial closing package.</p></div><FinancialReportsTab eventId={eventId}/></div>}
    {activeTab==="settings"&&data&&<div className="space-y-6"><BudgetDeadlineEditor eventId={eventId} summary={data.summary} onSaved={load}/><OrganiserAccessPanel eventId={eventId}/><section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="text-xl font-bold">Notification provider readiness</h2><p className="mt-1 text-sm text-slate-600">Provider readiness is checked safely in reminder previews. Secret credentials are never displayed.</p><button onClick={()=>changeTab("reminders")} className="mt-4 rounded-xl border px-4 py-2 text-sm font-semibold">Check provider readiness</button></section></div>}
    {mode && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><div className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 ${mode === "import" ? "max-w-5xl" : mode === "bulk" ? "max-w-3xl" : "max-w-xl"}`}>{mode === "import" ? <FinancialImportWizard eventId={eventId} onClose={() => setMode(null)} onImported={load} /> : mode === "bulk" ? <ContributionBulkActionsDialog eventId={eventId} onClose={() => setMode(null)} onCompleted={load} /> : mode === "reminder" && selected ? <FinancialReminderDialog eventId={eventId} pledge={selected} onClose={() => setMode(null)} onSent={load} /> : mode==="correct-payment"&&selected&&selectedPayment?<EditPaymentDialog payment={selectedPayment} pledge={selected} onSave={saveCorrection} onClose={()=>{setSelectedPayment(null);setMode("history");}}/> : mode==="void-payment"&&selected&&selectedPayment?<VoidPaymentDialog payment={selectedPayment} pledge={selected} onVoid={saveVoid} onClose={()=>{setSelectedPayment(null);setMode("history");}}/> : <><h2 className="mb-4 text-xl font-bold">{mode === "payment" ? `Record payment · ${selected?.full_name}` : mode==="history" ? `Payment history · ${selected?.full_name}` : selected ? "Edit pledge" : "Create pledge"}</h2>{mode === "pledge" && data ? <PledgeForm eventId={eventId} guests={data.guests} pledge={selected} onSave={savePledge} onClose={() => setMode(null)} /> : mode==="history" ? <PaymentHistoryDialog payments={payments} language={data?.event.language} issueReceipt={issueReceipt} editPayment={(payment)=>{setSelectedPayment(payment);setMode("correct-payment");}} voidPayment={(payment)=>{setSelectedPayment(payment);setMode("void-payment");}} onClose={()=>setMode(null)}/> : selected ? <RecordPaymentDialog pledge={selected} onSave={savePayment} onClose={() => setMode(null)} /> : null}</>}</div></div>}
    {newReceipt&&<div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6"><ReceiptDialog {...newReceipt} language={data?.event.language} onClose={()=>setNewReceipt(null)}/></div></div>}
  </section>;
}
