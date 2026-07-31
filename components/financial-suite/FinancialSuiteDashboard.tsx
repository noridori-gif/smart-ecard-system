"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
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
import ContributorEligibilityDashboard from "./tabs/ContributorEligibilityDashboard";
import InvitationEligibilityQueue from "./tabs/InvitationEligibilityQueue";
import ReceiptDialog from "./ReceiptDialog";
import FinancialImportWizard from "./FinancialImportWizard";
import ContributorGuestEligibilitySettings from "./ContributorGuestEligibilitySettings";
import BudgetDeadlineEditor from "./BudgetDeadlineEditor";
import ContributionBulkActionsDialog from "./ContributionBulkActionsDialog";
import FinancialReminderDialog from "./FinancialReminderDialog";
import EditPaymentDialog from "./EditPaymentDialog";
import VoidPaymentDialog from "./VoidPaymentDialog";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import {
  FinancialDesktopHeader,
  FinancialOverviewContent,
  FinancialToolbarButton,
  financialDesktop,
} from "./desktop/FinancialDesktopUI";
import { FinancialContributorsWorkspace } from "./desktop/FinancialContributorsWorkspace";
import type { FinanceReceipt } from "@/services/receiptMessageService";
import { createClient } from "@/lib/supabase/client";
import { getContributorGuestSettings, type ContributorGuestSettings } from "@/services/contributorGuestService";
import {
  cancelPledge, correctPayment, createPledge, exportPledges, getFinancialSuite, getPayments, recordPayment,
  updatePledge, downloadPledgeTemplate, permanentlyDeletePledge, restorePledge, type FinancialPledge, type PledgeInput,
  type PledgePayment, voidPayment,
} from "@/services/financialSuiteService";

const statusLabels = { pledged: "Ameahidi", partial: "Amepunguza", completed: "Amekamilisha", cancelled: "Imefutwa" };
export default function FinancialSuiteDashboard({ eventId: eventIdParam, initialTab }: { eventId: string; initialTab: FinancialTab }) {
  const { t } = useAppLanguage();
  const eventId = Number(eventIdParam);
  const validEventId = Number.isSafeInteger(eventId) && eventId > 0;
  const router=useRouter();const pathname=usePathname();const activeTab=initialTab;
  const [data, setData] = useState<Awaited<ReturnType<typeof getFinancialSuite>> | null>(null);
  const [eligibilitySettings, setEligibilitySettings] = useState<ContributorGuestSettings | null>(null);
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
    try {
      setLoading(true); setError("");
      const [suite, settings] = await Promise.all([getFinancialSuite(eventId), getContributorGuestSettings(eventId)]);
      setData(suite); setEligibilitySettings(settings);
    }
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
  async function unlinkGuest(pledge: FinancialPledge) {
    if (!window.confirm(`Unlink ${pledge.full_name} from the current guest? The guest and invitation will be preserved.`)) return;
    await updatePledge(pledge.id, {
      eventId: pledge.event_id, guestId: null, fullName: pledge.full_name, phone: pledge.phone,
      email: pledge.email ?? undefined, pledgedAmount: pledge.pledged_amount, notes: pledge.notes ?? undefined,
    }, pledge.total_paid);
    setNotice("Guest link removed. Guest and invitation records were preserved.");
    await load();
  }
  function changeTab(tab:FinancialTab){router.push(`${pathname}?tab=${tab}`,{scroll:false});}
  if (loading) {
    return (
      <div
        role="status"
        className={`p-10 text-center text-[15px] text-slate-500 ${financialDesktop.card}`}
      >
        Loading Financial Suite...
      </div>
    );
  }

  if (!data) {
    return (
      <div role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
        {error || "Financial data could not be loaded."}
      </div>
    );
  }

  return (
    <section className="mx-auto max-w-[1500px] space-y-6">
      <FinancialDesktopHeader
        eventTitle={data.event.title}
        summary={data.summary}
        back={
          <Link
            href="/events"
            className="inline-flex min-h-10 items-center text-sm font-semibold text-emerald-700 hover:text-emerald-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700"
          >
            ← Back to Events
          </Link>
        }
      />

      {error && (
        <div role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-700">
          {error}
        </div>
      )}
      {notice && (
        <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-700">
          {notice}
        </div>
      )}

      <FinancialSummaryStrip summary={data.summary} />
      <FinancialTabNavigation active={activeTab} onChange={changeTab} />

      {activeTab === "overview" && (
        <FinancialOverviewContent
          summary={data.summary}
          actions={
            <>
              <FinancialToolbarButton
                icon="plus"
                tone="primary"
                onClick={() => {
                  setSelected(null);
                  setMode("pledge");
                }}
              >
                {t("overview.createPledge")}
              </FinancialToolbarButton>
              <FinancialToolbarButton icon="upload" onClick={() => setMode("import")}>
                {t("overview.importExcel")}
              </FinancialToolbarButton>
              <FinancialToolbarButton icon="report" onClick={() => changeTab("reports")}>
                {t("overview.generateReport")}
              </FinancialToolbarButton>
              <FinancialToolbarButton icon="users" onClick={() => changeTab("contributors")}>
                {t("overview.openContributors")}
              </FinancialToolbarButton>
              <FinancialToolbarButton icon="history" onClick={() => changeTab("payments")}>
                {t("overview.recentPayments")}
              </FinancialToolbarButton>
            </>
          }
        />
      )}

      {activeTab === "contributors" && (
        <FinancialContributorsWorkspace
          eventTitle={data.event.title}
          pledges={data.pledges}
          visible={visible}
          query={query}
          status={status}
          page={page}
          pages={pages}
          total={filtered.length}
          actionPledgeId={actionPledgeId}
          onQuery={(value) => {
            setQuery(value);
            setPage(1);
          }}
          onStatus={(value) => {
            setStatus(value);
            setPage(1);
          }}
          onPage={setPage}
          onCreate={() => {
            setSelected(null);
            setMode("pledge");
          }}
          onImport={() => setMode("import")}
          onBulk={() => setMode("bulk")}
          onExport={exportPledges}
          onTemplate={downloadPledgeTemplate}
          onPay={(pledge) => {
            setSelected(pledge);
            setMode("payment");
          }}
          onRemind={(pledge) => {
            setSelected(pledge);
            setMode("reminder");
          }}
          onHistory={(pledge) => void openHistory(pledge)}
          onEdit={(pledge) => {
            setSelected(pledge);
            setMode("pledge");
          }}
          onCancel={(pledge) => void cancel(pledge)}
          onRestore={(pledge) => void restore(pledge)}
          onDelete={(pledge) => void permanentlyDelete(pledge)}
        />
      )}

      {activeTab === "eligibility" && eligibilitySettings && (
        <ContributorEligibilityDashboard
          eventId={eventId}
          pledges={data.pledges}
          guests={data.guests}
          settings={eligibilitySettings}
          onRefresh={load}
          onEdit={(pledge) => {
            setSelected(pledge);
            setMode("pledge");
          }}
          onUnlink={unlinkGuest}
        />
      )}

      {activeTab === "invitation_queue" && (
        <InvitationEligibilityQueue
          eventId={eventId}
          eventTitle={data.event.title}
          language={data.event.language}
          template={data.event.invitation_template}
          pledges={data.pledges}
          guests={data.guests}
          onRefresh={load}
        />
      )}

      {activeTab === "payments" && (
        <TabSection
          title="Payments"
          description="Review transactions, receipts, corrections, voids and daily collection summaries."
        >
          <FinancialPaymentsTab
            eventId={eventId}
            pledges={data.pledges}
            issueReceipt={issueReceipt}
            onViewReceipt={setNewReceipt}
            onEdit={(pledge, payment) => {
              setSelected(pledge);
              setSelectedPayment(payment);
              setMode("correct-payment");
            }}
            onVoid={(pledge, payment) => {
              setSelected(pledge);
              setSelectedPayment(payment);
              setMode("void-payment");
            }}
          />
        </TabSection>
      )}

      {activeTab === "reminders" && (
        <TabSection
          title="Reminders"
          description="Configure automation, preview recipients and review delivery operations."
        >
          <FinancialRemindersTab
            eventId={eventId}
            eventDate={data.event.event_date}
            deadline={data.summary.contribution_deadline}
            pledges={data.pledges}
          />
        </TabSection>
      )}

      {activeTab === "reports" && (
        <TabSection
          title="Reports"
          description="Analyse collections and produce the financial closing package."
        >
          <FinancialReportsTab eventId={eventId} />
        </TabSection>
      )}

      {activeTab === "settings" && (
        <div className="space-y-6 [&>section]:border-[#e7e1d7] [&>section]:shadow-[0_8px_24px_rgba(39,34,25,0.05)]">
          <BudgetDeadlineEditor eventId={eventId} summary={data.summary} onSaved={load} />
          <ContributorGuestEligibilitySettings eventId={eventId} onSaved={load} />
          <OrganiserAccessPanel eventId={eventId} />
          <section className={`p-5 ${financialDesktop.card}`}>
            <h2 className="text-xl font-bold">Notification provider readiness</h2>
            <p className="mt-1 text-sm text-slate-600">
              Provider readiness is checked safely in reminder previews. Secret credentials are never displayed.
            </p>
            <button
              type="button"
              onClick={() => changeTab("reminders")}
              className={`mt-4 ${financialDesktop.secondary}`}
            >
              Check provider readiness
            </button>
          </section>
        </div>
      )}

      {mode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true">
          <div
            className={`max-h-[90vh] w-full overflow-y-auto rounded-2xl bg-white p-6 ${
              mode === "import"
                ? "max-w-5xl"
                : mode === "bulk"
                  ? "max-w-3xl"
                  : "max-w-xl"
            }`}
          >
            {mode === "import" ? (
              <FinancialImportWizard eventId={eventId} onClose={() => setMode(null)} onImported={load} />
            ) : mode === "bulk" ? (
              <ContributionBulkActionsDialog eventId={eventId} onClose={() => setMode(null)} onCompleted={load} />
            ) : mode === "reminder" && selected ? (
              <FinancialReminderDialog eventId={eventId} pledge={selected} onClose={() => setMode(null)} onSent={load} />
            ) : mode === "correct-payment" && selected && selectedPayment ? (
              <EditPaymentDialog
                payment={selectedPayment}
                pledge={selected}
                onSave={saveCorrection}
                onClose={() => {
                  setSelectedPayment(null);
                  setMode("history");
                }}
              />
            ) : mode === "void-payment" && selected && selectedPayment ? (
              <VoidPaymentDialog
                payment={selectedPayment}
                pledge={selected}
                onVoid={saveVoid}
                onClose={() => {
                  setSelectedPayment(null);
                  setMode("history");
                }}
              />
            ) : (
              <>
                <h2 className="mb-4 text-xl font-bold">
                  {mode === "payment"
                    ? `Record payment · ${selected?.full_name}`
                    : mode === "history"
                      ? `Payment history · ${selected?.full_name}`
                      : selected
                        ? "Hariri ahadi"
                        : "Tengeneza ahadi"}
                </h2>
                {mode === "pledge" ? (
                  <PledgeForm
                    eventId={eventId}
                    guests={data.guests}
                    pledge={selected}
                    onSave={savePledge}
                    onClose={() => setMode(null)}
                  />
                ) : mode === "history" ? (
                  <PaymentHistoryDialog
                    payments={payments}
                    language={data.event.language}
                    issueReceipt={issueReceipt}
                    editPayment={(payment) => {
                      setSelectedPayment(payment);
                      setMode("correct-payment");
                    }}
                    voidPayment={(payment) => {
                      setSelectedPayment(payment);
                      setMode("void-payment");
                    }}
                    onClose={() => setMode(null)}
                  />
                ) : selected ? (
                  <RecordPaymentDialog
                    pledge={selected}
                    onSave={savePayment}
                    onClose={() => setMode(null)}
                  />
                ) : null}
              </>
            )}
          </div>
        </div>
      )}

      {newReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4" role="dialog" aria-modal="true">
          <div className="max-h-[90vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-6">
            <ReceiptDialog
              {...newReceipt}
              language={data.event.language}
              onClose={() => setNewReceipt(null)}
            />
          </div>
        </div>
      )}
    </section>
  );
}

function TabSection({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-4 [&_section]:border-[#e7e1d7] [&_section]:shadow-[0_8px_24px_rgba(39,34,25,0.05)]">
      <div>
        <h2 className="text-[22px] font-bold text-slate-950">{title}</h2>
        <p className="mt-1 text-sm text-slate-600">{description}</p>
      </div>
      {children}
    </div>
  );
}
