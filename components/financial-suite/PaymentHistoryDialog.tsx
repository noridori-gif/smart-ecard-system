"use client";
import { useState } from "react";
import { formatTzs } from "@/services/pledgeMessageService";
import type { PledgePayment } from "@/services/financialSuiteService";
import ReceiptDialog from "./ReceiptDialog";
import type { FinanceReceipt } from "@/services/receiptMessageService";

export default function PaymentHistoryDialog({ payments, language="sw", issueReceipt, onClose }: {
  payments:PledgePayment[]; language?:"sw"|"en";
  issueReceipt:(receiptNumber:string)=>Promise<{receipt:FinanceReceipt;verificationUrl:string}>; onClose:()=>void;
}) {
  const [issued,setIssued]=useState<{receipt:FinanceReceipt;verificationUrl:string}|null>(null); const [busy,setBusy]=useState(""); const [error,setError]=useState("");
  if(issued)return <ReceiptDialog {...issued} language={language} onClose={()=>setIssued(null)}/>;
  return <div className="space-y-3">{!payments.length?<p className="text-slate-500">No payments recorded.</p>:payments.map((payment)=><article key={payment.id} className="rounded-xl border p-3"><div className="flex justify-between gap-3"><div><b>{formatTzs(payment.amount)}</b><p className="text-sm text-slate-500">{payment.payment_date} · {payment.payment_method.replaceAll("_"," ")}</p></div><div className="text-right"><p className={payment.voided_at?"font-semibold text-red-700":"font-semibold text-emerald-700"}>{payment.voided_at?"Voided":payment.receipt_number}</p><button disabled={busy===payment.receipt_number} onClick={async()=>{try{setBusy(payment.receipt_number);setError("");setIssued(await issueReceipt(payment.receipt_number));}catch(err){setError(err instanceof Error?err.message:"Receipt could not be opened.");}finally{setBusy("");}}} className="mt-1 text-sm font-semibold text-blue-700">{busy===payment.receipt_number?"Preparing...":"View Receipt"}</button></div></div></article>)}{error&&<p role="alert" className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}<button onClick={onClose} className="w-full rounded-xl border px-4 py-2">Close</button></div>;
}
