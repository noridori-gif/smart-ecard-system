import { hashOrganiserToken, publicFinanceClient, safeTokenShape } from "@/lib/financePortalServer";
import OrganiserPortal, { type PortalData } from "@/components/financial-suite/OrganiserPortal";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function Denied({ status }: { status: string }) {
  const message = status === "expired" ? "This access link has expired." : status === "revoked" ? "This access link is no longer active." : "Invalid access link";
  return <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4"><div className="w-full max-w-md rounded-2xl border bg-white p-8 text-center shadow-sm"><div className="text-4xl">🔐</div><h1 className="mt-4 text-2xl font-bold">{message}</h1><p className="mt-2 text-slate-600">Contact the event administrator for a new committee access link.</p><p className="mt-8 text-sm text-slate-500">Managed securely by Smart Event Pass</p></div></main>;
}
export default async function ManageContributionsPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!safeTokenShape(token)) return <Denied status="invalid" />;
  const { data, error } = await publicFinanceClient().rpc("get_organiser_finance_portal", { supplied_token_hash: hashOrganiserToken(token) });
  if (error || !data || data.access_status !== "active") return <Denied status={data?.access_status ?? "invalid"} />;
  return <OrganiserPortal token={token} initialData={data as PortalData} />;
}
