import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import type { ClosingReport, ClosingReportPayment, ReminderHistoryRow } from "@/services/financialAutomationService";
import { formatTzs } from "@/services/pledgeMessageService";
import { cardClassificationLabel, classifyContribution } from "@/services/contributorGuestService";

// Same dark navy/emerald family as OverviewSummaryPDF.tsx and
// CustomSmsOutreachReportPDF.tsx, reusing their exact fixed color values and
// deliberately avoiding the two @react-pdf/renderer bugs documented there:
//   1. Gradients don't render as a stroke -- flat hex only for any
//      ring/bar/line stroke or border (no LinearGradient except as a fill).
//   2. rgba() color strings get corrupted in borderColor -- every border
//      below is a flat hex, never rgba() (OverviewSummaryPDF's decorRing
//      still uses an rgba() border; that is not reused here, on purpose).
const BRIGHT_EMERALD = "#34d399";
const INFO_BLUE = "#60a5fa";
const WARNING_AMBER = "#fbbf24";
const FAIL_RED = "#f87171";
const TEXT_LIGHT = "#e2e8f0";
const TEXT_MUTED = "#94a3b8";
const BORDER_MUTED = "#1b6d55";
const BORDER_ROW = "#14273a";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: "#07111f", fontSize: 8.5, color: TEXT_LIGHT, padding: 36 },
  decorRing: { position: "absolute", top: -90, right: -90, width: 260, height: 260, borderRadius: 130, borderWidth: 2, borderColor: BORDER_MUTED },
  header: { flexDirection: "row", alignItems: "center", gap: 10 },
  wordmark: { fontSize: 10, fontWeight: 700, letterSpacing: 3, color: "#5eead4" },
  title: { fontSize: 21, fontWeight: 700, color: "#ffffff", marginTop: 10 },
  subtitle: { fontSize: 10, color: TEXT_MUTED, marginTop: 4 },
  section: { marginTop: 22 },
  heading: { fontSize: 11, fontWeight: 700, color: TEXT_LIGHT, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" },
  captionText: { fontSize: 8, color: TEXT_MUTED, marginBottom: 10, lineHeight: 1.5 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  tile: { width: "31%", backgroundColor: "rgba(16,185,129,0.09)", borderWidth: 1, borderColor: BORDER_MUTED, borderRadius: 10, padding: 10 },
  tileLabel: { fontSize: 6.5, color: TEXT_MUTED, letterSpacing: 0.5, textTransform: "uppercase" },
  tileValue: { fontSize: 11, fontWeight: 700, color: "#ffffff", marginTop: 5 },
  row: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER_ROW, paddingVertical: 6 },
  headerRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: BORDER_MUTED, paddingBottom: 6, marginBottom: 2 },
  headerCell: { fontSize: 7, fontWeight: 700, color: TEXT_MUTED, letterSpacing: 0.5, textTransform: "uppercase" },
  cell: { fontSize: 8, color: TEXT_LIGHT },
  empty: { marginTop: 6, color: TEXT_MUTED, fontSize: 8.5 },
  moreRow: { fontSize: 8, color: TEXT_MUTED, marginTop: 6 },
  footer: { position: "absolute", bottom: 20, left: 36, right: 36, textAlign: "center", fontSize: 7, color: TEXT_MUTED },
});

const RECIPIENT_ROWS_LIMIT = 80;

const REMINDER_TYPE_LABELS: Record<string, string> = {
  pledge_reminder: "Pledge Reminder",
  pledge_thank_you: "Thank You",
  partial_thank_you: "Partial Thank You",
  completed_thank_you: "Completed Thank You",
  pledge_acknowledgement: "Pledge Confirmation",
  payment_received: "Payment Received",
  receipt_message: "Receipt Message",
  daily_summary: "Daily Summary",
  meeting_invitation: "Meeting Invitation",
  custom: "Custom Message",
};

function typeLabel(reminderType: string) {
  return REMINDER_TYPE_LABELS[reminderType] ?? reminderType.replaceAll("_", " ");
}

function statusColor(status: string) {
  if (status === "failed") return FAIL_RED;
  if (status === "delivered" || status === "read") return BRIGHT_EMERALD;
  if (status === "sent") return INFO_BLUE;
  if (status === "queued" || status === "processing") return WARNING_AMBER;
  return TEXT_MUTED;
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

function contributorName(row: ReminderHistoryRow) {
  const relation = Array.isArray(row.event_pledges) ? row.event_pledges[0] : row.event_pledges;
  return relation?.full_name ?? "Contributor";
}

function paidAfterReminderLabel(row: ReminderHistoryRow, payments: ClosingReportPayment[]) {
  if (row.reminder_type !== "pledge_reminder") return "—";
  if (!row.sent_at) return "Not sent yet";
  const sentAtMs = Date.parse(row.sent_at);
  const laterPayments = payments.filter(
    (payment) => payment.pledge_id === row.pledge_id && !payment.voided_at && Date.parse(payment.created_at) > sentAtMs
  );
  if (!laterPayments.length) return "Not yet paid";
  const earliest = laterPayments.reduce((earliestSoFar, candidate) =>
    Date.parse(candidate.created_at) < Date.parse(earliestSoFar.created_at) ? candidate : earliestSoFar
  );
  const days = Math.max(0, Math.round((Date.parse(earliest.created_at) - sentAtMs) / 86_400_000));
  return days === 0 ? "Paid same day" : `Paid in ${days} day${days === 1 ? "" : "s"}`;
}

function Table({ title, rows }: { title: string; rows: { name: string; paid: number; balance: number; status: string; cardType: string }[] }) {
  return (
    <View style={s.section} wrap>
      <Text style={s.heading}>{title}</Text>
      <View style={s.headerRow}>
        <Text style={[s.headerCell, { width: "32%" }]}>Contributor</Text>
        <Text style={[s.headerCell, { width: "17%" }]}>Paid</Text>
        <Text style={[s.headerCell, { width: "17%" }]}>Balance</Text>
        <Text style={[s.headerCell, { width: "17%" }]}>Status</Text>
        <Text style={[s.headerCell, { width: "17%" }]}>Card Type</Text>
      </View>
      {rows.length ? rows.slice(0, 15).map((r, i) => (
        <View key={`${r.name}-${i}`} style={s.row} wrap={false}>
          <Text style={[s.cell, { width: "32%" }]}>{r.name}</Text>
          <Text style={[s.cell, { width: "17%" }]}>{formatTzs(r.paid)}</Text>
          <Text style={[s.cell, { width: "17%" }]}>{formatTzs(r.balance)}</Text>
          <Text style={[s.cell, { width: "17%" }]}>{r.status}</Text>
          <Text style={[s.cell, { width: "17%" }]}>{r.cardType}</Text>
        </View>
      )) : <Text style={s.empty}>No data.</Text>}
    </View>
  );
}

function PaymentLog({ title, rows, columns, empty }: { title: string; rows: { key: string; cells: string[] }[]; columns: string[]; empty: string }) {
  const width = `${100 / columns.length}%`;
  return (
    <View style={s.section} wrap>
      <Text style={s.heading}>{title}</Text>
      <View style={s.headerRow}>{columns.map((c) => <Text key={c} style={[s.headerCell, { width }]}>{c}</Text>)}</View>
      {rows.length
        ? rows.map((r) => (
          <View key={r.key} style={s.row} wrap={false}>
            {r.cells.map((cell, i) => <Text key={i} style={[s.cell, { width }]}>{cell}</Text>)}
          </View>
        ))
        : <Text style={s.empty}>{empty}</Text>}
    </View>
  );
}

function RemindersSection({ reminders, payments }: { reminders: ReminderHistoryRow[]; payments: ClosingReportPayment[] }) {
  const sorted = [...reminders].sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at));
  const delivered = sorted.filter((r) => ["delivered", "read"].includes(r.delivery_status)).length;
  const sentOnly = sorted.filter((r) => r.delivery_status === "sent").length;
  const failed = sorted.filter((r) => r.delivery_status === "failed").length;
  const paidAfter = sorted.filter((r) => paidAfterReminderLabel(r, payments).startsWith("Paid")).length;
  const stats: Array<[string, string | number]> = [
    ["Total Communications", sorted.length],
    ["Delivered / Read", delivered],
    ["Sent (No Receipt Yet)", sentOnly],
    ["Failed", failed],
    ["Paid After Reminder", paidAfter],
  ];
  const visibleRows = sorted.slice(0, RECIPIENT_ROWS_LIMIT);

  return (
    <View style={s.section} wrap>
      <Text style={s.heading}>Reminders &amp; Communications</Text>
      <Text style={s.captionText}>
        WhatsApp reminders may show as Delivered or Read once the recipient&apos;s phone confirms it. SMS reminders currently
        only show as Sent — SMS delivery confirmations are not available yet and are being worked on separately, so a
        contributor may well have received an SMS reminder that still shows as &quot;Sent&quot; here.
      </Text>
      <View style={[s.grid, { marginBottom: 14 }]}>
        {stats.map(([label, value]) => (
          <View key={label} style={s.tile}>
            <Text style={s.tileLabel}>{label}</Text>
            <Text style={s.tileValue}>{value}</Text>
          </View>
        ))}
      </View>
      <Text style={s.captionText}>
        &quot;Paid After Reminder&quot; shows the number of days between a pledge reminder and the contributor&apos;s next
        payment, for pledge reminders only — it is an inferred signal based on payment timing, not a delivery or read
        confirmation.
      </Text>
      {visibleRows.length ? (
        <View>
          <View style={s.headerRow}>
            <Text style={[s.headerCell, { width: "18%" }]}>Recipient</Text>
            <Text style={[s.headerCell, { width: "14%" }]}>Phone</Text>
            <Text style={[s.headerCell, { width: "10%" }]}>Channel</Text>
            <Text style={[s.headerCell, { width: "16%" }]}>Type</Text>
            <Text style={[s.headerCell, { width: "16%" }]}>Date Sent</Text>
            <Text style={[s.headerCell, { width: "12%" }]}>Status</Text>
            <Text style={[s.headerCell, { width: "14%" }]}>Paid After</Text>
          </View>
          {visibleRows.map((row) => (
            <View key={`${row.channel}-${row.id}`} style={s.row} wrap={false}>
              <Text style={[s.cell, { width: "18%" }]}>{contributorName(row)}</Text>
              <Text style={[s.cell, { width: "14%" }]}>{row.recipient_phone ?? "—"}</Text>
              <Text style={[s.cell, { width: "10%" }]}>{row.channel === "whatsapp" ? "WhatsApp" : "SMS"}</Text>
              <Text style={[s.cell, { width: "16%" }]}>{typeLabel(row.reminder_type)}</Text>
              <Text style={[s.cell, { width: "16%" }]}>{formatDateTime(row.sent_at ?? row.created_at)}</Text>
              <Text style={[{ ...s.cell, color: statusColor(row.delivery_status), fontWeight: 700 }, { width: "12%" }]}>
                {row.delivery_status.charAt(0).toUpperCase() + row.delivery_status.slice(1)}
              </Text>
              <Text style={[s.cell, { width: "14%" }]}>{paidAfterReminderLabel(row, payments)}</Text>
            </View>
          ))}
          {sorted.length > RECIPIENT_ROWS_LIMIT && (
            <Text style={s.moreRow}>...and {sorted.length - RECIPIENT_ROWS_LIMIT} more not shown.</Text>
          )}
        </View>
      ) : (
        <Text style={s.empty}>No reminders or communications have been sent for this event yet.</Text>
      )}
    </View>
  );
}

export default function FinancialClosingPDF({ report, generatedBy }: { report: ClosingReport; generatedBy: string }) {
  const cards: Array<[string, string | number]> = [
    ["Total Contributors", report.financial.totalContributors],
    ["Event Budget", report.financial.target.budget === null ? "Not set" : formatTzs(report.financial.target.budget)],
    ["Total Collected", formatTzs(report.financial.totalCollected)],
    ["Remaining to Budget", report.financial.target.remaining === null ? "—" : formatTzs(report.financial.target.remaining)],
    ["Budget Progress", report.financial.target.progress === null ? "—" : `${report.financial.target.progress.toFixed(1)}%`],
    ["Contribution Deadline", report.financial.target.deadline ?? "No deadline"],
    ["Deadline Status", report.financial.target.deadlineStatus],
    ["Total Guests", report.guestStats.totalGuests],
    ["Total Invitations", report.guestStats.totalInvitations],
    ["Checked In", report.guestStats.checkedIn],
    ["Total Pledged", formatTzs(report.financial.totalPledged)],
    ["Outstanding", formatTzs(report.financial.outstanding)],
    ["Pledge Collection", `${report.financial.percentage.toFixed(1)}%`],
    ["Valid Transactions", report.financial.validTransactions],
    ["Voided Transactions", report.financial.voidedTransactions],
  ];
  const rows = report.pledges.map((p) => ({ name: p.full_name, paid: Number(p.total_paid), balance: Number(p.balance), status: p.calculated_status, cardType: cardClassificationLabel[classifyContribution(p, report.guestEligibilitySettings)] }));
  const contributorNameFor = (pledgeId: number) => report.pledges.find((p) => p.id === pledgeId)?.full_name ?? "Contributor";
  const paymentRow = (p: ClosingReportPayment) => ({
    key: String(p.id),
    cells: [p.payment_date, contributorNameFor(p.pledge_id), formatTzs(p.amount), p.provider ? `${p.payment_method.replaceAll("_", " ")} (${p.provider})` : p.payment_method.replaceAll("_", " "), p.received_by ?? "—", p.recorded_by_name],
  });
  const validPayments = [...report.payments].filter((p) => !p.voided_at).sort((a, b) => b.created_at.localeCompare(a.created_at)).map(paymentRow);
  const voidedPayments = [...report.payments].filter((p) => p.voided_at).sort((a, b) => b.created_at.localeCompare(a.created_at)).map((p) => ({
    key: String(p.id),
    cells: [p.payment_date, contributorNameFor(p.pledge_id), formatTzs(p.amount), p.payment_method.replaceAll("_", " "), p.void_reason ?? "—"],
  }));

  return (
    <Document title={`${report.event.title} Financial Closing Report`}>
      <Page size="A4" style={s.page} wrap>
        <View style={s.decorRing} />
        <View style={s.header}>
          <Text style={s.wordmark}>SMART EVENT PASS</Text>
        </View>
        <Text style={s.title}>Financial Closing Report</Text>
        <Text style={s.subtitle}>{report.event.title} · {report.event.event_date} · {report.event.venue}</Text>

        <View style={s.section}>
          <Text style={s.heading}>Closing Summary</Text>
          <View style={s.grid}>
            {cards.map(([label, value]) => (
              <View key={label} style={s.tile}>
                <Text style={s.tileLabel}>{label}</Text>
                <Text style={s.tileValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>

        <Table title="Top Contributors" rows={[...rows].sort((a, b) => b.paid - a.paid)} />
        <Table title="Largest Outstanding Balances" rows={[...rows].filter((r) => r.balance > 0).sort((a, b) => b.balance - a.balance)} />

        <View style={s.section}>
          <Text style={s.heading}>Payment Methods</Text>
          {report.paymentMethods.map((m) => (
            <View key={m.method} style={s.row}>
              <Text style={[s.cell, { width: "50%" }]}>{m.method}</Text>
              <Text style={[s.cell, { width: "50%" }]}>{formatTzs(m.amount)}</Text>
            </View>
          ))}
        </View>

        <PaymentLog title="Payment Transaction Log" columns={["Date", "Contributor", "Amount", "Method", "Collected By", "Recorded By"]} rows={validPayments} empty="No valid payments recorded." />
        <PaymentLog title="Voided Payments" columns={["Date", "Contributor", "Amount", "Method", "Void Reason"]} rows={voidedPayments} empty="No voided payments." />

        <RemindersSection reminders={report.reminders} payments={report.payments} />

        <Text style={s.footer}>
          Generated {new Date().toLocaleString()} by {generatedBy}. This report reflects guest, invitation, contribution and
          communication records stored in Smart Event Pass at the time of generation.
        </Text>
      </Page>
    </Document>
  );
}
