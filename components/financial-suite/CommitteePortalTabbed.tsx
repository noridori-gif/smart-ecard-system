"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import RecordPaymentDialog from "./RecordPaymentDialog";
import PaymentHistoryDialog from "./PaymentHistoryDialog";
import ReceiptDialog from "./ReceiptDialog";
import { PortalDetailsForm } from "./PortalDetailsForm";
import {
  CommitteePortalHeader,
  CommitteeTabNavigation,
} from "./committee/CommitteePortalHeader";
import {
  CommitteeEmptyState,
  CommitteeFilterChips,
  CommitteeSearchBar,
} from "./committee/CommitteeControls";
import { CommitteeFinancialCard } from "./committee/CommitteeFinancialCard";
import { CommitteeOverview } from "./committee/CommitteeOverview";
import { committeeTheme } from "./committee/theme";
import FinancialCommunicationDialog from "./FinancialCommunicationDialog";
import type { FinanceReceipt } from "@/services/receiptMessageService";
import type {
  FinanceSummary,
  FinancialPledge,
  PledgeInput,
  PledgePayment,
} from "@/services/financialSuiteService";
import { formatTzs } from "@/services/pledgeMessageService";
import type { CommunicationAdapter, CommunicationKind } from "@/services/financialAutomationService";

type Tab = "overview" | "contributors" | "payments" | "messages" | "reports";
type Dialog = "create" | "edit" | "payment" | "history" | null;
type FinancialStatus = "all" | "pledged" | "partial" | "completed";
type PaymentStatus = "all" | "outstanding" | "completed";
type DeliveryStatus =
  | "all"
  | "not_sent"
  | "sent"
  | "delivered"
  | "read"
  | "failed";

export type PortalData = {
  access_status: "active";
  event: {
    id: number;
    title: string;
    event_date: string;
    language: "sw" | "en";
  };
  permissions: Record<string, boolean>;
  summary: FinanceSummary;
  finance_target: Partial<FinanceSummary> | null;
  pledges: FinancialPledge[];
};

type Report = {
  validTransactions: number;
  trend: Array<{ date: string; amount: number; transactions: number }>;
  topContributors: Array<{ name: string; amount: string }>;
  outstanding: Array<{ name: string; amount: string }>;
};

type MessageStatus = {
  pledge_id: number;
  reminder_type: string;
  channel: "sms" | "whatsapp";
  delivery_status: string;
  created_at: string;
};

const copy = {
  en: {
    portal: "Committee Portal",
    tabs: {
      overview: "Overview",
      contributors: "Contributors",
      payments: "Payments",
      messages: "Messages",
      reports: "Reports",
    },
    contributors: "Total Contributors",
    completed: "Completed",
    partial: "Partial",
    pending: "Pending",
    cancelled: "Cancelled",
    pledged: "Total Pledged",
    paid: "Paid",
    collected: "Total Collected",
    outstanding: "Outstanding",
    percentage: "Collection Percentage",
    budget: "Event Budget",
    remainingBudget: "Remaining budget",
    deadline: "Contribution deadline",
    days: "Days remaining",
    deadlineStatus: "Deadline status",
    pledgeProgress: "Collection progress",
    budgetProgress: "Budget progress",
    search: "Search by name or phone",
    searchLabel: "Search contributors by name or phone",
    all: "All",
    record: "Record Payment",
    history: "Payment History",
    edit: "Edit",
    newPledge: "New pledge",
    paymentsIntro:
      "Record new payments and review payment history and receipts.",
    messagesIntro:
      "Preview and send the correct message for each contributor’s current financial status.",
    financialStatus: "Financial status",
    deliveryStatus: "Message status",
    channel: "Channel",
    notSent: "Not sent",
    sent: "Sent",
    delivered: "Delivered",
    read: "Read",
    failed: "Failed",
    preview: "Preview Reminder",
    send: "Send Reminder",
    thankPreview: "Preview Thank You",
    thankSend: "Send Thank You",
    confirm: "I explicitly confirm this send.",
    close: "Close",
    report: "Read-only Financial Report",
    trend: "Collection Trend",
    top: "Top contributors",
    balances: "Largest outstanding balances",
    transactions: "Valid transactions",
    noContributors: "No contributors found.",
    noPayments: "No matching payments.",
    noMessages: "No matching messages.",
    loading: "Loading…",
    managed: "Managed securely by Smart Event Pass",
    outstandingChip: "Outstanding",
    expand: "Expand",
    collapse: "Collapse",
    messageType: "Message type",
    selectedLanguage: "Language",
    providerReadiness: "Provider readiness",
    providerChecking: "Checking provider readiness…",
    invalidPhone: "A valid phone number is required.",
    notEligible: "The contributor is not currently eligible.",
    filters: "Filters",
  },
  sw: {
    portal: "Tovuti ya Kamati",
    tabs: {
      overview: "Muhtasari",
      contributors: "Wachangiaji",
      payments: "Malipo",
      messages: "Ujumbe",
      reports: "Ripoti",
    },
    contributors: "Jumla ya Wachangiaji",
    completed: "Waliokamilisha",
    partial: "Wanaoendelea",
    pending: "Bado Hawajaanza",
    cancelled: "Imefutwa",
    pledged: "Jumla ya Ahadi",
    paid: "Imepokelewa",
    collected: "Jumla Iliyopokelewa",
    outstanding: "Salio",
    percentage: "Asilimia Iliyokusanywa",
    budget: "Bajeti ya Tukio",
    remainingBudget: "Salio la bajeti",
    deadline: "Mwisho wa michango",
    days: "Siku zilizobaki",
    deadlineStatus: "Hali ya mwisho",
    pledgeProgress: "Maendeleo ya michango",
    budgetProgress: "Maendeleo ya bajeti",
    search: "Tafuta kwa jina au simu",
    searchLabel: "Tafuta wachangiaji kwa jina au simu",
    all: "Zote",
    record: "Rekodi Malipo",
    history: "Historia ya Malipo",
    edit: "Hariri",
    newPledge: "Ahadi mpya",
    paymentsIntro:
      "Rekodi malipo mapya, angalia historia ya malipo na risiti za wachangiaji.",
    messagesIntro:
      "Hakiki na tuma ujumbe sahihi kulingana na hali ya sasa ya mchango.",
    financialStatus: "Hali ya mchango",
    deliveryStatus: "Hali ya ujumbe",
    channel: "Njia",
    notSent: "Haijatumwa",
    sent: "Imetumwa",
    delivered: "Imewasilishwa",
    read: "Imesomwa",
    failed: "Imeshindikana",
    preview: "Hakiki Kikumbusho",
    send: "Tuma Kikumbusho",
    thankPreview: "Hakiki Shukrani",
    thankSend: "Tuma Shukrani",
    confirm: "Ninathibitisha kutuma ujumbe huu.",
    close: "Funga",
    report: "Ripoti ya Fedha ya Kusoma",
    trend: "Mwenendo wa Makusanyo",
    top: "Wachangiaji wakuu",
    balances: "Salio kubwa zaidi",
    transactions: "Miamala halali",
    noContributors: "Hakuna wachangiaji waliopatikana.",
    noPayments: "Hakuna malipo yanayolingana na utafutaji.",
    noMessages: "Hakuna ujumbe unaolingana na vichujio.",
    loading: "Inapakia…",
    managed: "Inasimamiwa kwa usalama na Smart Event Pass",
    outstandingChip: "Kuna salio",
    expand: "Panua",
    collapse: "Funga maelezo",
    messageType: "Aina ya ujumbe",
    selectedLanguage: "Lugha",
    providerReadiness: "Utayari wa huduma",
    providerChecking: "Inakagua utayari wa huduma…",
    invalidPhone: "Namba ya simu si sahihi.",
    notEligible: "Mchangiaji hastahiki kwa ujumbe huu.",
    filters: "Vichujio",
  },
} as const;

type Translation = (typeof copy)["en"] | (typeof copy)["sw"];

async function request(token: string, body: Record<string, unknown>) {
  const response = await fetch("/api/contributions/organiser", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token, ...body }),
    cache: "no-store",
  });
  const text = await response.text();
  const payload = text ? JSON.parse(text) : {};
  if (!response.ok) throw new Error(payload.error || "Request failed.");
  return payload;
}

function buildOrganiserCommunicationAdapter(token: string, language: "sw" | "en"): CommunicationAdapter {
  return {
    preview: (kind: CommunicationKind, channels, pledgeId) =>
      request(token, {
        action: kind === "thank-you" ? "thank_you_preview" : "reminder_preview",
        pledgeId, channel: channels[0], language,
      }),
    send: (kind: CommunicationKind, channels, pledgeId) =>
      request(token, {
        action: kind === "thank-you" ? "thank_you_send" : "send_reminder",
        pledgeId, channel: channels[0], language, confirmed: true,
      }),
  };
}

function derivedStatus(item: FinancialPledge) {
  if (
    Number(item.balance) === 0 &&
    Number(item.total_paid) >= Number(item.pledged_amount)
  ) {
    return "completed" as const;
  }
  return Number(item.total_paid) > 0 ? ("partial" as const) : ("pledged" as const);
}

function statusLabel(item: FinancialPledge, t: Translation) {
  if (item.calculated_status === "cancelled") return t.cancelled;
  const status = derivedStatus(item);
  return status === "completed"
    ? t.completed
    : status === "partial"
      ? t.partial
      : t.pending;
}

export default function CommitteePortalTabbed({
  token,
  initialData,
  initialTab,
  initialLanguage,
}: {
  token: string;
  initialData: PortalData;
  initialTab: string;
  initialLanguage: "sw" | "en";
}) {
  const [data, setData] = useState(initialData);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<FinancialStatus>("all");
  const [paymentQuery, setPaymentQuery] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("all");
  const [messageQuery, setMessageQuery] = useState("");
  const [messageStatus, setMessageStatus] =
    useState<FinancialStatus>("all");
  const [delivery, setDelivery] = useState<DeliveryStatus>("all");
  const [expandedContributor, setExpandedContributor] = useState<number | null>(
    null
  );
  const [expandedPayment, setExpandedPayment] = useState<number | null>(null);
  const [expandedMessage, setExpandedMessage] = useState<number | null>(null);
  const [selected, setSelected] = useState<FinancialPledge | null>(null);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [messageType, setMessageType] = useState<
    "reminder" | "thank_you" | null
  >(null);
  const [history, setHistory] = useState<PledgePayment[]>([]);
  const [receipt, setReceipt] = useState<{
    receipt: FinanceReceipt;
    verificationUrl: string;
  } | null>(null);
  const [report, setReport] = useState<Report | null>(null);
  const [messageStatuses, setMessageStatuses] = useState<MessageStatus[]>([]);
  const [error, setError] = useState("");
  const router = useRouter();
  const pathname = usePathname();
  const language = initialLanguage;
  const t = copy[language];

  const allowed: Tab[] = [
    "overview",
    "contributors",
    ...(data.permissions.record_payments ||
    data.permissions.view_payment_history
      ? (["payments"] as const)
      : []),
    ...(data.permissions.send_reminders || data.permissions.send_thank_you
      ? (["messages"] as const)
      : []),
    ...(data.permissions.view_reports ? (["reports"] as const) : []),
  ];
  const active = allowed.includes(initialTab as Tab)
    ? (initialTab as Tab)
    : allowed[0];
  const activePledges = data.pledges.filter(
    (item) => item.calculated_status !== "cancelled"
  );
  const summary: FinanceSummary = {
    ...data.summary,
    ...data.finance_target,
    budget_amount: data.finance_target?.budget_amount ?? null,
    contribution_deadline:
      data.finance_target?.contribution_deadline ?? null,
    budget_progress_percentage:
      data.finance_target?.budget_progress_percentage ?? null,
    remaining_to_budget: data.finance_target?.remaining_to_budget ?? null,
    days_remaining: data.finance_target?.days_remaining ?? null,
    deadline_status:
      data.finance_target?.deadline_status ??
      (language === "sw" ? "Hakuna tarehe" : "No deadline"),
    active_pledge_count: activePledges.length,
    total_contributors: activePledges.length,
    pledged_count: activePledges.filter(
      (item) => item.calculated_status === "pledged"
    ).length,
    partial_count: activePledges.filter(
      (item) => item.calculated_status === "partial"
    ).length,
    completed_count: activePledges.filter(
      (item) => item.calculated_status === "completed"
    ).length,
    cancelled_count: data.pledges.filter(
      (item) => item.calculated_status === "cancelled"
    ).length,
  };

  const contributors = activePledges.filter(
    (item) =>
      (status === "all" || derivedStatus(item) === status) &&
      `${item.full_name} ${item.phone}`
        .toLowerCase()
        .includes(query.toLowerCase())
  );

  const payments = activePledges.filter(
    (item) =>
      (paymentStatus === "all" ||
        (paymentStatus === "outstanding"
          ? Number(item.balance) > 0
          : derivedStatus(item) === "completed")) &&
      `${item.full_name} ${item.phone}`
        .toLowerCase()
        .includes(paymentQuery.toLowerCase())
  );

  function latestByChannel(item: FinancialPledge) {
    const type =
      derivedStatus(item) === "completed"
        ? "pledge_thank_you"
        : "pledge_reminder";
    const forChannel = (targetChannel: "sms" | "whatsapp") =>
      messageStatuses.find(
        (row) =>
          row.pledge_id === item.id &&
          row.reminder_type === type &&
          row.channel === targetChannel
      )?.delivery_status ?? "not_sent";
    return { whatsapp: forChannel("whatsapp"), sms: forChannel("sms") };
  }

  const messages = activePledges.filter((item) => {
    const financial = derivedStatus(item);
    const states = latestByChannel(item);
    const matchesState = (state: string) =>
      state === delivery || (delivery === "sent" && ["delivered", "read"].includes(state));
    const deliveryMatches =
      delivery === "all" || matchesState(states.whatsapp) || matchesState(states.sms);
    return (
      (messageStatus === "all" || financial === messageStatus) &&
      deliveryMatches &&
      `${item.full_name} ${item.phone}`
        .toLowerCase()
        .includes(messageQuery.toLowerCase())
    );
  });

  useEffect(() => {
    if (active !== "reports" || report) return;
    const timer = setTimeout(
      () =>
        void request(token, { action: "portal_report" })
          .then(setReport)
          .catch((reason) => setError(String(reason))),
      0
    );
    return () => clearTimeout(timer);
  }, [active, report, token]);

  useEffect(() => {
    if (active !== "messages") return;
    const timer = setTimeout(
      () =>
        void request(token, { action: "message_statuses", language })
          .then((result) => {
            setMessageStatuses(result.statuses ?? []);
          })
          .catch((reason) => setError(String(reason))),
      0
    );
    return () => clearTimeout(timer);
  }, [active, language, token]);

  function navigate(tab: Tab, nextLanguage = language) {
    router.push(`${pathname}?tab=${tab}&lang=${nextLanguage}`, {
      scroll: false,
    });
  }

  async function refresh() {
    setData(await request(token, { action: "refresh" }));
  }

  async function saveDetails(values: PledgeInput) {
    await request(token, {
      action: dialog === "edit" ? "edit_pledge" : "create_pledge",
      pledgeId: selected?.id,
      fullName: values.fullName,
      phone: values.phone,
      email: values.email,
      pledgedAmount: values.pledgedAmount,
      notes: values.notes,
    });
    setDialog(null);
    await refresh();
  }

  async function openHistory(item: FinancialPledge) {
    setSelected(item);
    const result = await request(token, {
      action: "payment_history",
      pledgeId: item.id,
    });
    setHistory(result.payments ?? []);
    setDialog("history");
  }

  function act(
    item: FinancialPledge,
    next: "edit" | "payment" | "history" | "message"
  ) {
    if (next === "history") {
      void openHistory(item);
      return;
    }
    setSelected(item);
    if (next === "message") {
      setMessageType(
        derivedStatus(item) === "completed" ? "thank_you" : "reminder"
      );
    } else {
      setDialog(next);
    }
  }

  const tabs = allowed.map((key) => ({ key, label: t.tabs[key] }));
  const date = new Intl.DateTimeFormat(
    language === "sw" ? "sw-TZ" : "en-GB",
    { dateStyle: "medium" }
  ).format(new Date(`${data.event.event_date}T00:00:00`));

  return (
    <main
      className={`min-h-screen overflow-x-hidden text-slate-950 ${committeeTheme.page}`}
    >
      <CommitteePortalHeader
        portalLabel={t.portal}
        eventTitle={data.event.title}
        eventDate={date}
        language={language}
        collectedLabel={t.collected}
        collected={formatTzs(summary.total_collected)}
        pledged={formatTzs(summary.total_pledged)}
        percentage={Number(summary.completion_percentage || 0)}
        activeTab={active}
        onLanguage={navigate}
      />
      <CommitteeTabNavigation
        tabs={tabs}
        active={active}
        onChange={navigate}
      />

      <div className="mx-auto max-w-6xl space-y-4 px-3 py-4 sm:px-5 sm:py-6">
        {error && (
          <p
            className="rounded-2xl border border-red-200 bg-red-50 p-4 text-[15px] text-red-800"
            role="alert"
          >
            {error}
          </p>
        )}

        {active === "overview" && (
          <CommitteeOverview summary={summary} labels={t} />
        )}

        {active === "contributors" && (
          <section className="space-y-3">
            <h2 className="text-xl font-bold">{t.tabs.contributors}</h2>
            <CommitteeSearchBar
              value={query}
              onChange={setQuery}
              placeholder={t.search}
              label={t.searchLabel}
            />
            <CommitteeFilterChips
              label={t.filters}
              value={status}
              onChange={setStatus}
              options={[
                { value: "all", label: t.all },
                { value: "partial", label: t.partial },
                { value: "completed", label: t.completed },
                { value: "pledged", label: t.pending },
              ]}
            />
            {data.permissions.create_pledges && (
              <Button
                type="button"
                variant="primary"
                size="lg"
                className="w-full"
                onClick={() => {
                  setSelected(null);
                  setDialog("create");
                }}
              >
                + {t.newPledge}
              </Button>
            )}
            <div className="grid gap-3 lg:grid-cols-2">
              {contributors.map((item) => (
                <CommitteeFinancialCard
                  key={item.id}
                  item={item}
                  status={derivedStatus(item)}
                  statusLabel={statusLabel(item, t)}
                  paidLabel={t.paid}
                  pledgedLabel={t.pledged}
                  balanceLabel={t.outstanding}
                  progressLabel={`${item.full_name}: ${t.pledgeProgress}`}
                  expanded={expandedContributor === item.id}
                  expandLabel={t.expand}
                  collapseLabel={t.collapse}
                  onToggle={() =>
                    setExpandedContributor((current) =>
                      current === item.id ? null : item.id
                    )
                  }
                >
                  <div className="mt-3 grid gap-2 min-[380px]:grid-cols-2">
                    {data.permissions.record_payments &&
                      Number(item.balance) > 0 && (
                        <ActionButton
                          tone="green"
                          onClick={() => act(item, "payment")}
                        >
                          + {t.record}
                        </ActionButton>
                      )}
                    {data.permissions.view_payment_history && (
                      <ActionButton
                        tone="neutral"
                        onClick={() => act(item, "history")}
                      >
                        {t.history}
                      </ActionButton>
                    )}
                    {data.permissions.edit_contributors && (
                      <ActionButton
                        tone="blue"
                        onClick={() => act(item, "edit")}
                      >
                        {t.edit}
                      </ActionButton>
                    )}
                  </div>
                </CommitteeFinancialCard>
              ))}
            </div>
            {!contributors.length && (
              <CommitteeEmptyState message={t.noContributors} />
            )}
          </section>
        )}

        {active === "payments" && (
          <section className="space-y-3">
            <div>
              <h2 className="text-xl font-bold">{t.tabs.payments}</h2>
              <p className="mt-1 text-[15px] leading-6 text-slate-600">
                {t.paymentsIntro}
              </p>
            </div>
            <CommitteeSearchBar
              value={paymentQuery}
              onChange={setPaymentQuery}
              placeholder={t.search}
              label={t.searchLabel}
            />
            <CommitteeFilterChips
              label={t.filters}
              value={paymentStatus}
              onChange={setPaymentStatus}
              options={[
                { value: "all", label: t.all },
                { value: "outstanding", label: t.outstandingChip },
                { value: "completed", label: t.completed },
              ]}
            />
            <div className="grid gap-3 lg:grid-cols-2">
              {payments.map((item) => (
                <CommitteeFinancialCard
                  key={item.id}
                  item={item}
                  status={derivedStatus(item)}
                  statusLabel={statusLabel(item, t)}
                  paidLabel={t.paid}
                  pledgedLabel={t.pledged}
                  balanceLabel={t.outstanding}
                  progressLabel={`${item.full_name}: ${t.pledgeProgress}`}
                  expanded={expandedPayment === item.id}
                  expandLabel={t.expand}
                  collapseLabel={t.collapse}
                  onToggle={() =>
                    setExpandedPayment((current) =>
                      current === item.id ? null : item.id
                    )
                  }
                >
                  <div className="mt-3 grid gap-2 min-[380px]:grid-cols-2">
                    {data.permissions.record_payments &&
                      Number(item.balance) > 0 && (
                        <ActionButton
                          tone="green"
                          onClick={() => act(item, "payment")}
                        >
                          + {t.record}
                        </ActionButton>
                      )}
                    {data.permissions.view_payment_history && (
                      <ActionButton
                        tone="neutral"
                        onClick={() => act(item, "history")}
                      >
                        {t.history}
                      </ActionButton>
                    )}
                  </div>
                </CommitteeFinancialCard>
              ))}
            </div>
            {!payments.length && (
              <CommitteeEmptyState message={t.noPayments} />
            )}
          </section>
        )}

        {active === "messages" && (
          <section className="space-y-3">
            <div>
              <h2 className="text-xl font-bold">{t.tabs.messages}</h2>
              <p className="mt-1 text-[15px] leading-6 text-slate-600">
                {t.messagesIntro}
              </p>
            </div>
            <CommitteeSearchBar
              value={messageQuery}
              onChange={setMessageQuery}
              placeholder={t.search}
              label={t.searchLabel}
            />
            <CommitteeFilterChips
              label={t.deliveryStatus}
              value={delivery}
              onChange={setDelivery}
              options={[
                { value: "all", label: t.all },
                { value: "not_sent", label: t.notSent },
                { value: "sent", label: t.sent },
                { value: "failed", label: t.failed },
              ]}
            />
            <CommitteeFilterChips
              label={t.financialStatus}
              value={messageStatus}
              onChange={setMessageStatus}
              options={[
                { value: "all", label: t.all },
                { value: "pledged", label: t.pending },
                { value: "partial", label: t.partial },
                { value: "completed", label: t.completed },
              ]}
            />
            <div className="grid gap-3 lg:grid-cols-2">
              {messages.map((item) => {
                const kind = derivedStatus(item);
                const permitted =
                  kind === "completed"
                    ? data.permissions.send_thank_you
                    : data.permissions.send_reminders;
                const validPhone = /^255[67]\d{8}$/.test(
                  item.normalized_phone ?? ""
                );
                const eligible =
                  kind === "completed"
                    ? Number(item.balance) === 0 &&
                      Number(item.total_paid) >= Number(item.pledged_amount)
                    : Number(item.balance) > 0;
                const reason = !validPhone ? t.invalidPhone : !eligible ? t.notEligible : "";
                const states = latestByChannel(item);
                return (
                  <CommitteeFinancialCard
                    key={item.id}
                    item={item}
                    status={kind}
                    statusLabel={statusLabel(item, t)}
                    paidLabel={t.paid}
                    pledgedLabel={t.pledged}
                    balanceLabel={t.outstanding}
                    progressLabel={`${item.full_name}: ${t.pledgeProgress}`}
                    expanded={expandedMessage === item.id}
                    expandLabel={t.expand}
                    collapseLabel={t.collapse}
                    onToggle={() =>
                      setExpandedMessage((current) =>
                        current === item.id ? null : item.id
                      )
                    }
                  >
                    <dl className="mt-3 grid gap-2 text-[14px]">
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">{t.deliveryStatus}</dt>
                        <dd className="font-semibold">
                          WhatsApp: {deliveryLabel(states.whatsapp, t)} · SMS: {deliveryLabel(states.sms, t)}
                        </dd>
                      </div>
                      <div className="flex justify-between gap-3">
                        <dt className="text-slate-500">{t.messageType}</dt>
                        <dd className="break-all text-right font-semibold">
                          {kind === "completed"
                            ? "pledge_thank_you"
                            : "pledge_reminder"}
                        </dd>
                      </div>
                    </dl>
                    {permitted && (
                      <Button
                        type="button"
                        variant="success"
                        className="mt-3 w-full"
                        onClick={() => act(item, "message")}
                      >
                        ✉{" "}
                        {kind === "completed" ? t.thankPreview : t.preview}
                      </Button>
                    )}
                    {permitted && (!validPhone || !eligible) && (
                      <p className="mt-2 text-sm leading-5 text-amber-800">
                        {reason}
                      </p>
                    )}
                  </CommitteeFinancialCard>
                );
              })}
            </div>
            {!messages.length && <CommitteeEmptyState message={t.noMessages} />}
          </section>
        )}

        {active === "reports" && (
          <Reports summary={summary} report={report} t={t} />
        )}
      </div>

      <footer className="px-4 py-6 text-center text-sm text-slate-500">
        {t.managed}
      </footer>

      {dialog && (
        <Modal onClose={() => setDialog(null)} closeLabel={t.close} titleId="committee-dialog-title">
          <h2 id="committee-dialog-title" className="mb-4 text-xl font-bold">
            {dialog === "payment"
              ? t.record
              : dialog === "history"
                ? t.history
                : dialog === "create"
                  ? t.newPledge
                  : t.edit}
          </h2>
          {(dialog === "create" || dialog === "edit") && (
            <PortalDetailsForm
              pledge={selected}
              onSave={saveDetails}
              onClose={() => setDialog(null)}
            />
          )}
          {dialog === "payment" && selected && (
            <RecordPaymentDialog
              pledge={selected}
              onClose={() => setDialog(null)}
              onSave={async (values) => {
                const result = await request(token, {
                  action: "record_payment",
                  pledgeId: selected.id,
                  ...values,
                });
                setReceipt(
                  await request(token, {
                    action: "issue_receipt",
                    pledgeId: selected.id,
                    receiptNumber: result.receipt_number,
                  })
                );
                setDialog(null);
                await refresh();
              }}
            />
          )}
          {dialog === "history" && (
            <PaymentHistoryDialog
              payments={history}
              language={language}
              issueReceipt={(receiptNumber) =>
                request(token, {
                  action: "issue_receipt",
                  pledgeId: selected?.id,
                  receiptNumber,
                })
              }
              onClose={() => setDialog(null)}
            />
          )}
        </Modal>
      )}

      {selected && messageType && (
        <Modal onClose={() => { setSelected(null); setMessageType(null); }} closeLabel={t.close} titleId="communication-dialog-title">
          <FinancialCommunicationDialog
            pledge={selected}
            kind={messageType === "thank_you" ? "thank-you" : "reminder"}
            initialChannel="whatsapp"
            language={language}
            adapter={buildOrganiserCommunicationAdapter(token, language)}
            allowBothChannel={false}
            requireExplicitConfirmation
            onClose={() => { setSelected(null); setMessageType(null); }}
            onSent={refresh}
          />
        </Modal>
      )}

      {receipt && (
        <Modal onClose={() => setReceipt(null)} closeLabel={t.close} titleId="committee-receipt-dialog-title">
          <h2 id="committee-receipt-dialog-title" className="sr-only">
            Contribution receipt
          </h2>
          <ReceiptDialog
            {...receipt}
            language={language}
            onClose={() => setReceipt(null)}
          />
        </Modal>
      )}
    </main>
  );
}

function ActionButton({
  tone,
  onClick,
  children,
}: {
  tone: "green" | "neutral" | "blue";
  onClick: () => void;
  children: React.ReactNode;
}) {
  const variant = tone === "green" ? "success" : tone === "blue" ? "info" : "secondary";
  return (
    <Button type="button" variant={variant} onClick={onClick}>
      {children}
    </Button>
  );
}

function deliveryLabel(value: string, t: Translation) {
  if (value === "not_sent") return t.notSent;
  if (value === "sent") return t.sent;
  if (value === "delivered") return t.delivered;
  if (value === "read") return t.read;
  return t.failed;
}

function Modal({
  children,
  onClose,
  closeLabel,
  titleId,
}: {
  children: React.ReactNode;
  onClose: () => void;
  closeLabel: string;
  titleId: string;
}) {
  return (
    <Dialog titleId={titleId} onClose={onClose} className="max-w-lg">
      <div className="mb-2 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="grid h-11 w-11 place-items-center rounded-full text-xl text-slate-500 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-600"
          aria-label={closeLabel}
        >
          ×
        </button>
      </div>
      {children}
    </Dialog>
  );
}

function Reports({
  summary,
  report,
  t,
}: {
  summary: FinanceSummary;
  report: Report | null;
  t: Translation;
}) {
  const metrics = [
    [t.contributors, summary.total_contributors],
    [t.pledged, formatTzs(summary.total_pledged)],
    [t.collected, formatTzs(summary.total_collected)],
    [t.outstanding, formatTzs(summary.remaining_balance)],
    [t.percentage, `${summary.completion_percentage}%`],
    [t.transactions, report?.validTransactions ?? t.loading],
  ];
  return (
    <div className="space-y-3">
      <section className={`sep-card p-4`}>
        <h2 className="text-xl font-bold">{t.report}</h2>
        <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {metrics.map(([label, value]) => (
            <div key={label} className="rounded-xl bg-[#faf8f3] p-3">
              <dt className="text-[13px] text-slate-500">{label}</dt>
              <dd className="mt-1 break-words text-[16px] font-bold">
                {value}
              </dd>
            </div>
          ))}
        </dl>
      </section>
      {report && (
        <>
          <section className={`sep-card p-4`}>
            <h2 className="text-lg font-bold">{t.trend}</h2>
            <div className="mt-3 h-56">
              {report.trend.length ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={report.trend}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis
                      tickFormatter={(value) =>
                        `${Math.round(Number(value) / 1000)}k`
                      }
                    />
                    <Tooltip
                      formatter={(value) => formatTzs(String(value))}
                    />
                    <Area
                      dataKey="amount"
                      stroke="#047857"
                      fill="#d1fae5"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <CommitteeEmptyState message={t.noPayments} />
              )}
            </div>
          </section>
          <div className="grid gap-3 sm:grid-cols-2">
            <Rank title={t.top} rows={report.topContributors} />
            <Rank title={t.balances} rows={report.outstanding} />
          </div>
        </>
      )}
    </div>
  );
}

function Rank({
  title,
  rows,
}: {
  title: string;
  rows: Array<{ name: string; amount: string }>;
}) {
  return (
    <section className={`sep-card p-4`}>
      <h2 className="text-lg font-bold">{title}</h2>
      <div className="mt-3 space-y-2">
        {rows.map((row, index) => (
          <div
            key={`${row.name}-${index}`}
            className="flex justify-between gap-3 rounded-xl bg-[#faf8f3] p-3 text-[15px]"
          >
            <span className="min-w-0 break-words">
              {index + 1}. {row.name}
            </span>
            <b className="shrink-0">{formatTzs(row.amount)}</b>
          </div>
        ))}
      </div>
    </section>
  );
}
