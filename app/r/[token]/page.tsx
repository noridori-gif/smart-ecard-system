import { hashOrganiserToken, publicFinanceClient, safeTokenShape } from "@/lib/financePortalServer";
import { formatTzs } from "@/services/pledgeMessageService";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Verification = {
  verification_status: "verified" | "invalid"; receipt_number?: string; contributor?: string;
  event?: string; amount_paid?: string; currency_code?: string; payment_date?: string;
  payment_method?: string; status?: "valid" | "voided";
};
export default async function ReceiptVerificationPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  let receipt: Verification = { verification_status: "invalid" };
  if (safeTokenShape(token)) {
    const result = await publicFinanceClient().rpc("verify_finance_receipt", { supplied_token_hash: hashOrganiserToken(token) });
    if (!result.error && result.data) receipt = result.data as Verification;
  }
  if (receipt.verification_status !== "verified") {
    return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4"><div className="max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm"><div className="text-4xl">🔎</div><h1 className="mt-4 text-2xl font-bold">Receipt not found or invalid</h1><p className="mt-2 text-slate-600">Check the verification link or contact the event organiser.</p></div></main>;
  }
  const voided = receipt.status === "voided";
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4"><article className="w-full max-w-lg overflow-hidden rounded-2xl border bg-white shadow-lg"><header className="bg-slate-950 p-6 text-white"><p className="text-xs font-bold uppercase tracking-[.2em] text-emerald-400">Smart Event Pass</p><h1 className="mt-2 text-2xl font-bold">Receipt Verified</h1></header><dl className="grid grid-cols-2 gap-x-4 gap-y-5 p-6 text-sm"><div className="col-span-2"><dt className="text-slate-500">Receipt Number</dt><dd className="font-bold">{receipt.receipt_number}</dd></div><div><dt className="text-slate-500">Contributor</dt><dd className="font-semibold">{receipt.contributor}</dd></div><div><dt className="text-slate-500">Event</dt><dd className="font-semibold">{receipt.event}</dd></div><div><dt className="text-slate-500">Amount Paid</dt><dd className="font-bold text-emerald-700">{formatTzs(receipt.amount_paid ?? "0")}</dd></div><div><dt className="text-slate-500">Payment Date</dt><dd>{receipt.payment_date}</dd></div><div><dt className="text-slate-500">Payment Method</dt><dd className="capitalize">{receipt.payment_method?.replaceAll("_"," ")}</dd></div><div><dt className="text-slate-500">Status</dt><dd className={`font-bold ${voided ? "text-red-700" : "text-emerald-700"}`}>{voided ? "Voided" : "Valid"}</dd></div></dl><footer className="border-t bg-slate-50 p-4 text-center text-xs text-slate-500">Verified securely by Smart Event Pass</footer></article></main>;
}
