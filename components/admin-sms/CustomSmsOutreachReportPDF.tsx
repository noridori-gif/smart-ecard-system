import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// Same dark emerald gradient card family as OverviewSummaryPDF.tsx, reusing
// its exact fixed color values -- and deliberately avoiding the two
// @react-pdf/renderer bugs found while building that file:
//   1. Gradients don't render as a stroke -- flat hex only for any
//      ring/bar/line stroke (not applicable here, no strokes in this report,
//      but keeping the rule in mind for anything added later).
//   2. rgba() color strings get corrupted in borderColor -- every border
//      below is a flat hex, never rgba(), including the decorative ring
//      (OverviewSummaryPDF's decorRing still uses an rgba() border; that
//      spot is not reused here on purpose).
const PAGE_WIDTH = 600;
const PAGE_HEIGHT = 800;

const BRIGHT_EMERALD = "#34d399";
const MUTED_EMERALD = "#065f46";
const FAIL_RED = "#f87171";

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: "#07111f" },
  decorRing: { position: "absolute", top: -90, right: -90, width: 260, height: 260, borderRadius: 130, borderWidth: 2, borderColor: MUTED_EMERALD },
  content: { padding: 48 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8 },
  logo: { width: 34, height: 34, borderRadius: 8 },
  wordmark: { fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#5eead4" },
  eventTitle: { fontSize: 24, fontWeight: 700, color: "#ffffff", textAlign: "center", marginTop: 26, paddingHorizontal: 20 },
  campaignName: { fontSize: 13, color: "#5eead4", textAlign: "center", marginTop: 8, fontWeight: 700 },
  dateSent: { fontSize: 11, color: "#94a3b8", textAlign: "center", marginTop: 6 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 34, width: "100%" },
  statTile: { width: "48%", backgroundColor: "rgba(16,185,129,0.09)", borderWidth: 1, borderColor: "#1b6d55", borderRadius: 14, padding: 16, marginBottom: 14 },
  statLabel: { fontSize: 9, color: "#94a3b8", letterSpacing: 1 },
  statValue: { fontSize: 19, fontWeight: 700, color: "#ffffff", marginTop: 7 },
  sectionHeading: { fontSize: 12, fontWeight: 700, color: "#e2e8f0", letterSpacing: 1, marginTop: 20, marginBottom: 10 },
  allSentBanner: { backgroundColor: "rgba(16,185,129,0.09)", borderWidth: 1, borderColor: "#1b6d55", borderRadius: 12, padding: 16, alignItems: "center" },
  allSentText: { fontSize: 12, fontWeight: 700, color: BRIGHT_EMERALD },
  tableHeaderRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#1b6d55", paddingBottom: 7, marginBottom: 4 },
  tableRow: { flexDirection: "row", borderBottomWidth: 1, borderBottomColor: "#14273a", paddingVertical: 7 },
  tableHeaderCell: { fontSize: 8, fontWeight: 700, color: "#94a3b8", letterSpacing: 0.5 },
  tableCell: { fontSize: 9, color: "#e2e8f0" },
  cellName: { width: "30%" },
  cellPhone: { width: "22%" },
  cellReason: { width: "48%" },
  cellSentAt: { width: "48%" },
  emptyRow: { fontSize: 9, color: "#94a3b8" },
  moreRow: { fontSize: 9, color: "#94a3b8", marginTop: 6 },
  footer: { position: "absolute", bottom: 30, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "#64748b" },
});

function formatDateSent(value: string | null) {
  if (!value) return "Not sent yet";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

const FAILED_ROWS_LIMIT = 40;

export type CustomSmsOutreachReportFailedRow = { name: string; phone: string; reason: string };
export type CustomSmsOutreachReportSentRow = { name: string; phone: string; sentAt: string | null };

export type CustomSmsOutreachReportPDFProps = {
  eventTitle: string;
  campaignName: string;
  dateSent: string | null;
  totalRecipients: number;
  sentCount: number;
  failedCount: number;
  segmentsPerMessage: number;
  totalSegmentsUsed: number;
  sentRows: CustomSmsOutreachReportSentRow[];
  failedRows: CustomSmsOutreachReportFailedRow[];
};

export default function CustomSmsOutreachReportPDF({
  eventTitle,
  campaignName,
  dateSent,
  totalRecipients,
  sentCount,
  failedCount,
  segmentsPerMessage,
  totalSegmentsUsed,
  sentRows,
  failedRows,
}: CustomSmsOutreachReportPDFProps) {
  const stats: Array<[string, string | number]> = [
    ["Total Recipients", totalRecipients],
    ["Sent", sentCount],
    ["Failed", failedCount],
    ["SMS Segments Per Message", segmentsPerMessage],
    ["Total Segments Used", totalSegmentsUsed],
  ];
  const visibleFailedRows = failedRows.slice(0, FAILED_ROWS_LIMIT);

  return (
    <Document title={`${eventTitle} - ${campaignName} SMS Outreach Report`} author="Smart Event Pass">
      <Page size={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }} style={s.page}>
        <View style={s.decorRing} />
        <View style={s.content}>
          <View style={s.header}>
            <Image src="/logo.png" style={s.logo} />
            <Text style={s.wordmark}>SMART EVENT PASS</Text>
          </View>
          <Text style={s.eventTitle}>{eventTitle}</Text>
          <Text style={s.campaignName}>{campaignName}</Text>
          <Text style={s.dateSent}>Sent {formatDateSent(dateSent)}</Text>

          <View style={s.statGrid}>
            {stats.map(([label, value]) => (
              <View key={label} style={s.statTile}>
                <Text style={s.statLabel}>{label.toUpperCase()}</Text>
                <Text style={s.statValue}>{value}</Text>
              </View>
            ))}
          </View>

          <Text style={s.sectionHeading}>SENT SUCCESSFULLY ({sentRows.length})</Text>
          {sentRows.length === 0 ? (
            <Text style={s.emptyRow}>No recipients have been sent this message yet.</Text>
          ) : (
            <View>
              <View style={s.tableHeaderRow}>
                <Text style={[s.tableHeaderCell, s.cellName]}>NAME</Text>
                <Text style={[s.tableHeaderCell, s.cellPhone]}>PHONE</Text>
                <Text style={[s.tableHeaderCell, s.cellSentAt]}>DATE/TIME SENT</Text>
              </View>
              {sentRows.map((row, index) => (
                <View key={`${row.phone}-${index}`} style={s.tableRow} wrap={false}>
                  <Text style={[s.tableCell, s.cellName]}>{row.name}</Text>
                  <Text style={[s.tableCell, s.cellPhone]}>{row.phone}</Text>
                  <Text style={[s.tableCell, s.cellSentAt]}>{formatDateSent(row.sentAt)}</Text>
                </View>
              ))}
            </View>
          )}

          <Text style={s.sectionHeading}>FAILED SENDS ({failedRows.length}) -- NEED MANUAL FOLLOW-UP</Text>
          {failedRows.length === 0 ? (
            <View style={s.allSentBanner}>
              <Text style={s.allSentText}>All messages sent successfully</Text>
            </View>
          ) : (
            <View>
              <View style={s.tableHeaderRow}>
                <Text style={[s.tableHeaderCell, s.cellName]}>NAME</Text>
                <Text style={[s.tableHeaderCell, s.cellPhone]}>PHONE</Text>
                <Text style={[s.tableHeaderCell, s.cellReason]}>FAILURE REASON</Text>
              </View>
              {visibleFailedRows.map((row, index) => (
                <View key={`${row.phone}-${index}`} style={s.tableRow} wrap={false}>
                  <Text style={[s.tableCell, s.cellName]}>{row.name}</Text>
                  <Text style={[s.tableCell, s.cellPhone]}>{row.phone}</Text>
                  <Text style={[{ ...s.tableCell, color: FAIL_RED }, s.cellReason]}>{row.reason}</Text>
                </View>
              ))}
              {failedRows.length > FAILED_ROWS_LIMIT && (
                <Text style={s.moreRow}>...and {failedRows.length - FAILED_ROWS_LIMIT} more failed sends not shown.</Text>
              )}
            </View>
          )}
        </View>
        <Text style={s.footer}>Generated by Smart Event Pass · {new Date().toLocaleString()}</Text>
      </Page>
    </Document>
  );
}
