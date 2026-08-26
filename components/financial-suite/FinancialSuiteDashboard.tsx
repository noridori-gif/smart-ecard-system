"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import FinancialSummaryStrip from "./FinancialSummaryStrip";
import FinancialTabNavigation from "./FinancialTabNavigation";
import PublicPledgeLinksPanel from "./PublicPledgeLinksPanel";
import type { FinancialTab } from "@/lib/financialTabs";
import PledgeForm from "./PledgeForm";
import RecordPaymentDialog from "./RecordPaymentDialog";
import OrganiserAccessPanel from "./OrganiserAccessPanel";
import PaymentHistoryDialog from "./PaymentHistoryDialog";
import FinancialPaymentsTab from "./tabs/FinancialPaymentsTab";
import FinancialExpensesTab from "./tabs/FinancialExpensesTab";
import FinancialRemindersTab from "./tabs/FinancialRemindersTab";
import FinancialReportsTab from "./tabs/FinancialReportsTab";
import ContributorEligibilityDashboard from "./tabs/ContributorEligibilityDashboard";
import InvitationEligibilityQueue from "./tabs/InvitationEligibilityQueue";
import ReceiptDialog from "./ReceiptDialog";
import FinancialImportWizard from "./FinancialImportWizard";
import ContributorGuestEligibilitySettings from "./ContributorGuestEligibilitySettings";
import BudgetDeadlineEditor from "./BudgetDeadlineEditor";
import ContributionBulkActionsDialog from "./ContributionBulkActionsDialog";
import FinancialCommunicationDialog from "./FinancialCommunicationDialog";
import EditPaymentDialog from "./EditPaymentDialog";
import VoidPaymentDialog from "./VoidPaymentDialog";
import ContributorPermanentDeleteDialog from "./ContributorPermanentDeleteDialog";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import {
  FinancialDesktopHeader,
  FinancialOverviewContent,
  FinancialToolbarButton,
} from "./desktop/FinancialDesktopUI";
import { FinancialContributorsWorkspace } from "./desktop/FinancialContributorsWorkspace";
import type { FinanceReceipt } from "@/services/receiptMessageService";
import { createClient } from "@/lib/supabase/client";
import { getContributorGuestSettings, type ContributorGuestSettings } from "@/services/contributorGuestService";
import { getCurrentUserProfile } from "@/services/profileService";
import { buildAdminCommunicationAdapter, getReminderHistory, type ReminderHistoryRow } from "@/services/financialAutomationService";
import {
  cancelPledge, correctPayment, createPledge, exportPledges, getFinancialSuite, getPayments, recordPayment,
  updatePledge, downloadPledgeTemplate, restorePledge, type FinancialPledge, type PledgeInput,
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
  const [communicationHistory, setCommunicationHistory] = useState<ReminderHistoryRow[]>([]);
  const [loading, setLoading] = useState(true); const [error, setError] = useState("");
  const [notice, setNotice] = useState(""); const [mode, setMode] = useState<"pledge" | "payment" | "history" | "correct-payment" | "void-payment" | "import" | "bulk" | "communication" | null>(null);
  const [communication, setCommunication] = useState<{kind:"reminder"|"thank-you";channel?:"sms"|"whatsapp"}>({kind:"reminder"});
  const [selected, setSelected] = useState<FinancialPledge | null>(null);
  const [payments,setPayments]=useState<PledgePayment[]>([]);
  const [selectedPayment,setSelectedPayment]=useState<PledgePayment|null>(null);
  const [actionPledgeId,setActionPledgeId]=useState<number|null>(null);
  const [newReceipt,setNewReceipt]=useState<{receipt:FinanceReceipt;verificationUrl:string}|null>(null);
  const [permanentDeletePledge,setPermanentDeletePledge]=useState<FinancialPledge|null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [query, setQuery] = useState(""); const [status, setStatus] = useState("all"); const [guestFilter, setGuestFilter] = useState("all");
  const [page, setPage] = useState(1); const pageSize = 10;
  const load = useCallback(async () => {
    if (!validEventId) {
      setError("Invalid event ID.");
      setLoading(false);
      return;
    }
    try {
      setLoading(true); setError("");
      const [suite, settings, history] = await Promise.all([getFinancialSuite(eventId), getContributorGuestSettings(eventId), getReminderHistory(eventId)]);
      setData(suite); setEligibilitySettings(settings); setCommunicationHistory(history);
    }
    catch (err) { setError(err instanceof Error ? err.message : "Financial data could not be loaded."); }
    finally { setLoading(false); }
  }, [eventId, validEventId]);
  useEffect(() => {
    const timer = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timer);
  }, [load]);
  useEffect(() => {
    void getCurrentUserProfile().then((profile) => setIsAdmin(profile?.role === "admin")).catch(() => {});
  }, []);
  // event_pledge_financial_summary is now fetched oldest-first so each contributor's
  // rank is a stable chronological position; reverse it back to newest-first for display
  // so the on-screen order matches the previous default.
  const pledgesNewestFirst = useMemo(() => (data ? [...data.pledges].reverse() : []), [data]);
  const pledgeRank = useMemo(() => {
    const map = new Map<number, number>();
    (data?.pledges ?? []).forEach((p, i) => map.set(p.id, i + 1));
    return map;
  }, [data]);
  const filtered = useMemo(() => pledgesNewestFirst.filter((p) =>
    (status === "all" || p.calculated_status === status) &&
    (guestFilter === "all" || (guestFilter === "none" ? !["single", "double", "pending_guest"].includes(p.guest_eligibility_status) : guestFilter === p.guest_eligibility_status)) &&
    (`${p.full_name} ${p.phone} ${p.normalized_phone}`.toLowerCase().includes(query.toLowerCase()))
  ), [pledgesNewestFirst, guestFilter, query, status]);
  const pages = Math.max(1, Math.ceil(filtered.length / pageSize)); const visible = filtered.slice((page - 1) * pageSize, page * pageSize);
  async function savePledge(input: PledgeInput) {
    const acknowledgement=selected?null:await createPledge(input); if(selected)await updatePledge(selected.id,input,selected.total_paid);
    setMode(null); setSelected(null); setNotice(acknowledgement?.message??"Pledge saved successfully."); await load();
  }
  async function savePayment(values: Parameters<typeof recordPayment>[1]) {
    if (!selected) return; const result = await recordPayment(selected.id, values);
    setMode(null); setSelected(null); setNewReceipt({receipt:result.receipt,verificationUrl:result.verificationUrl});setNotice(result.acknowledgement?.message??`Payment recorded. Receipt ${result.receipt.receipt_number}. Status: ${statusLabels[result.pledge.calculated_status]}.`); await load();
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
      eventId: pledge.event_id, guestId: null, fullName: pledge.full_name, phone: pledge.phone ?? "",
      email: pledge.email ?? undefined, pledgedAmount: pledge.pledged_amount, notes: pledge.notes ?? undefined,
    }, pledge.total_paid);
    setNotice("Guest link removed. Guest and invitation records were preserved.");
    await load();
  }
  function changeTab(tab:FinancialTab){router.push(`${pathname}?tab=${tab}`,{scroll:false});}
  function openContributorsByStatus(value:string){setStatus(value);setPage(1);changeTab("contributors");}
  if (loading) {
    return (
      <div
        role="status"
        className="sep-card p-10 text-center text-[15px] text-slate-500"
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
          onStatusCardClick={openContributorsByStatus}
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
          pledges={pledgesNewestFirst}
          serialByPledgeId={pledgeRank}
          isAdmin={isAdmin}
          visible={visible}
          query={query}
          status={status}
          guestFilter={guestFilter}
          page={page}
          pages={pages}
          total={filtered.length}
          actionPledgeId={actionPledgeId}
          communicationHistory={communicationHistory}
          onQuery={(value) => {
            setQuery(value);
            setPage(1);
          }}
          onStatus={(value) => {
            setStatus(value);
            setPage(1);
          }}
          onGuestFilter={(value) => { setGuestFilter(value); setPage(1); }}
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
          onCommunicate={(pledge, kind, channel) => {
            setSelected(pledge);
            setCommunication({kind,channel});
            setMode("communication");
          }}
          onHistory={(pledge) => void openHistory(pledge)}
          onEdit={(pledge) => {
            setSelected(pledge);
            setMode("pledge");
          }}
          onCancel={(pledge) => void cancel(pledge)}
          onRestore={(pledge) => void restore(pledge)}
          onDelete={(pledge) => setPermanentDeletePledge(pledge)}
          onOpenGuest={() => router.push(`/events/${eventId}/guests`)}
          onGenerateInvitation={() => changeTab("invitation_queue")}
        />
      )}

      {activeTab === "eligibility" && eligibilitySettings && (
        <ContributorEligibilityDashboard
          eventId={eventId}
          pledges={pledgesNewestFirst}
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
          pledges={pledgesNewestFirst}
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
            pledges={pledgesNewestFirst}
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

      {activeTab === "expenses" && (
        <TabSection
          title="Expenses"
          description="Track event spending, optional receipts, and compare against the expense budget."
        >
          <FinancialExpensesTab eventId={eventId} />
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
            pledges={pledgesNewestFirst}
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

      {activeTab === "pledge_links" && (
        <TabSection title="Pledge Link" description="Manage secure public pledge capture and review its automation timeline.">
          <PublicPledgeLinksPanel eventId={eventId} eventName={data.event.title} />
        </TabSection>
      )}

      {activeTab === "settings" && (
        <div className="space-y-6 [&>section]:border-[#e7e1d7] [&>section]:shadow-[0_8px_24px_rgba(39,34,25,0.05)]">
          <BudgetDeadlineEditor eventId={eventId} summary={data.summary} onSaved={load} />
          <ContributorGuestEligibilitySettings eventId={eventId} onSaved={load} />
          <OrganiserAccessPanel eventId={eventId} />
          <section className="sep-card p-5">
            <h2 className="text-xl font-bold">Notification provider readiness</h2>
            <p className="mt-1 text-sm text-slate-600">
              Provider readiness is checked safely in reminder previews. Secret credentials are never displayed.
            </p>
            <Button
              type="button"
              variant="secondary"
              className="mt-4"
              onClick={() => changeTab("reminders")}
            >
              Check provider readiness
            </Button>
          </section>
        </div>
      )}

      {mode && (
        <Dialog
          titleId={mode === "communication" ? "communication-dialog-title" : "financial-mode-dialog-title"}
          onClose={() => setMode(null)}
          className={
            mode === "import"
              ? "max-w-5xl"
              : mode === "bulk"
                ? "max-w-3xl"
                : "max-w-xl"
          }
        >
          {mode === "import" ? (
            <>
              <h2 id="financial-mode-dialog-title" className="sr-only">Import contributions</h2>
              <FinancialImportWizard eventId={eventId} onClose={() => setMode(null)} onImported={load} />
            </>
          ) : mode === "bulk" ? (
            <>
              <h2 id="financial-mode-dialog-title" className="sr-only">Bulk actions</h2>
              <ContributionBulkActionsDialog eventId={eventId} onClose={() => setMode(null)} onCompleted={load} />
            </>
          ) : mode === "communication" && selected ? (
            <FinancialCommunicationDialog pledge={selected} kind={communication.kind} initialChannel={communication.channel} language={data.event.language} adapter={buildAdminCommunicationAdapter(eventId)} onClose={() => setMode(null)} onSent={load} />
          ) : mode === "correct-payment" && selected && selectedPayment ? (
            <>
              <h2 id="financial-mode-dialog-title" className="sr-only">Correct payment</h2>
              <EditPaymentDialog
                payment={selectedPayment}
                pledge={selected}
                onSave={saveCorrection}
                onClose={() => {
                  setSelectedPayment(null);
                  setMode("history");
                }}
              />
            </>
          ) : mode === "void-payment" && selected && selectedPayment ? (
            <>
              <h2 id="financial-mode-dialog-title" className="sr-only">Void payment</h2>
              <VoidPaymentDialog
                payment={selectedPayment}
                pledge={selected}
                onVoid={saveVoid}
                onClose={() => {
                  setSelectedPayment(null);
                  setMode("history");
                }}
              />
            </>
          ) : (
            <>
              <h2 id="financial-mode-dialog-title" className="mb-4 text-xl font-bold">
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
        </Dialog>
      )}

      {newReceipt && (
        <Dialog titleId="new-receipt-dialog-title" onClose={() => setNewReceipt(null)} className="max-w-xl">
          <h2 id="new-receipt-dialog-title" className="sr-only">Contribution receipt</h2>
          <ReceiptDialog
            {...newReceipt}
            language={data.event.language}
            onClose={() => setNewReceipt(null)}
          />
        </Dialog>
      )}

      {permanentDeletePledge && (
        <ContributorPermanentDeleteDialog
          pledge={permanentDeletePledge}
          onClose={() => setPermanentDeletePledge(null)}
          onDeleted={() => {
            setPermanentDeletePledge(null);
            setNotice("Contributor permanently deleted. The linked guest was preserved.");
            void load();
          }}
        />
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
