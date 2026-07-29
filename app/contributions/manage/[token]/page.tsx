import { hashOrganiserToken, publicFinanceClient, safeTokenShape } from "@/lib/financePortalServer";
import CommitteePortalTabbed from "@/components/financial-suite/CommitteePortalTabbed";
import type { PortalData } from "@/components/financial-suite/CommitteePortalTabbed";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Denied({ status }: { status: string }) {
  const message = status === "expired" ? "This access link has expired." : status === "revoked" ? "This access link is no longer active." : "Invalid access link";
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4"><div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm"><div className="text-4xl">🔐</div><h1 className="mt-4 text-2xl font-bold">{message}</h1><p className="mt-2 text-slate-600">Contact the event administrator for a new committee access link.</p><p className="mt-8 text-sm text-slate-500">Managed securely by Smart Event Pass</p></div></main>;
}
export default async function ManageContributionsPage({ params,searchParams }: { params: Promise<{ token: string }>;searchParams:Promise<{tab?:string|string[];lang?:string|string[]}> }) {
  const { token } = await params;
  if (!safeTokenShape(token)) return <Denied status="invalid" />;
  const { data, error } = await publicFinanceClient().rpc("get_organiser_finance_portal", { supplied_token_hash: hashOrganiserToken(token) });
  if (error || !data || data.access_status !== "active") return <Denied status={data?.access_status ?? "invalid"} />;
  const portal=data as PortalData;const resolvedSearchParams=await searchParams;const raw=resolvedSearchParams.tab;const requested=Array.isArray(raw)?raw[0]:raw;
  const rawLanguage=resolvedSearchParams.lang;const requestedLanguage=Array.isArray(rawLanguage)?rawLanguage[0]:rawLanguage;
  const initialLanguage=requestedLanguage==="sw"||requestedLanguage==="en"?requestedLanguage:portal.event.language==="sw"?"sw":"en";
  const allowed=["overview","contributors",...(portal.permissions.record_payments||portal.permissions.view_payment_history?["payments"]:[]),...(portal.permissions.send_reminders||portal.permissions.send_thank_you?["messages"]:[]),...(portal.permissions.view_reports?["reports"]:[])];
  const initialTab=requested&&allowed.includes(requested)?requested:allowed[0];
  return <CommitteePortalTabbed token={token} initialData={portal} initialTab={initialTab} initialLanguage={initialLanguage}/>;
}
