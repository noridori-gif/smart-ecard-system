import { StyleSheet } from "@react-pdf/renderer";

export const pdfColors = {
  primary: "#1D4ED8",
  primaryDark: "#1E3A8A",
  primaryLight: "#DBEAFE",

  success: "#059669",
  successLight: "#D1FAE5",

  warning: "#D97706",
  warningLight: "#FEF3C7",

  danger: "#DC2626",
  dangerLight: "#FEE2E2",

  violet: "#7C3AED",
  violetLight: "#EDE9FE",

  dark: "#0F172A",
  text: "#334155",
  muted: "#64748B",

  border: "#E2E8F0",
  light: "#F8FAFC",
  white: "#FFFFFF",
};

export const pdfStyles = StyleSheet.create({
  page: {
    paddingTop: 34,
    paddingBottom: 46,
    paddingHorizontal: 34,
    backgroundColor: pdfColors.white,
    color: pdfColors.text,
    fontSize: 9,
    fontFamily: "Helvetica",
  },

  coverPage: {
    padding: 0,
    backgroundColor: pdfColors.white,
    color: pdfColors.text,
    fontFamily: "Helvetica",
  },

  coverHero: {
    minHeight: 250,
    paddingTop: 45,
    paddingHorizontal: 40,
    paddingBottom: 38,
    backgroundColor: pdfColors.primaryDark,
  },

  brandSmall: {
    fontSize: 10,
    letterSpacing: 3,
    color: pdfColors.primaryLight,
    textTransform: "uppercase",
    marginBottom: 8,
  },

  brandTitle: {
    fontSize: 26,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.white,
    marginBottom: 6,
  },

  reportLabel: {
    fontSize: 11,
    color: pdfColors.primaryLight,
    textTransform: "uppercase",
    letterSpacing: 1.5,
  },

  coverEventSection: {
    paddingHorizontal: 40,
    paddingTop: 32,
    paddingBottom: 20,
  },

  coverEventType: {
    fontSize: 10,
    color: pdfColors.primary,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    marginBottom: 8,
  },

  coverEventTitle: {
    fontSize: 24,
    lineHeight: 1.25,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.dark,
    marginBottom: 12,
  },

  coverMetaGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 18,
    borderTopWidth: 1,
    borderTopColor: pdfColors.border,
    paddingTop: 18,
  },

  coverMetaItem: {
    width: "50%",
    marginBottom: 16,
    paddingRight: 12,
  },

  metaLabel: {
    fontSize: 8,
    color: pdfColors.muted,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 4,
  },

  metaValue: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.dark,
    lineHeight: 1.35,
  },

  coverSummary: {
    marginHorizontal: 40,
    marginTop: 8,
    padding: 20,
    borderRadius: 8,
    backgroundColor: pdfColors.light,
    borderWidth: 1,
    borderColor: pdfColors.border,
  },

  coverSummaryTitle: {
    fontSize: 13,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.dark,
    marginBottom: 14,
  },

  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  summaryCard: {
    width: "25%",
    paddingRight: 8,
    marginBottom: 10,
  },

  summaryCardLabel: {
    fontSize: 7,
    color: pdfColors.muted,
    textTransform: "uppercase",
    marginBottom: 4,
  },

  summaryCardValue: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.primaryDark,
  },

  summaryCardValueSuccess: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.success,
  },

  summaryCardValueWarning: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.warning,
  },

  summaryCardValueDanger: {
    fontSize: 17,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.danger,
  },

  generatedSection: {
    marginHorizontal: 40,
    marginTop: 22,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: pdfColors.border,
  },

  generatedText: {
    fontSize: 8,
    color: pdfColors.muted,
    marginBottom: 4,
  },

  generatedBrand: {
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.primaryDark,
  },

  pageHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: pdfColors.border,
  },

  pageHeaderBrand: {
    fontSize: 12,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.primaryDark,
  },

  pageHeaderEvent: {
    maxWidth: "65%",
    fontSize: 8,
    color: pdfColors.muted,
    textAlign: "right",
  },

  section: {
    marginBottom: 20,
  },

  sectionTitle: {
    fontSize: 15,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.dark,
    marginBottom: 5,
  },

  sectionSubtitle: {
    fontSize: 8,
    color: pdfColors.muted,
    marginBottom: 12,
  },

  statisticRow: {
    flexDirection: "row",
    marginBottom: 12,
  },

  statisticBox: {
    flex: 1,
    marginRight: 8,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: pdfColors.border,
    backgroundColor: pdfColors.light,
  },

  statisticBoxLast: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: pdfColors.border,
    backgroundColor: pdfColors.light,
  },

  statisticLabel: {
    fontSize: 7,
    color: pdfColors.muted,
    textTransform: "uppercase",
    marginBottom: 5,
  },

  statisticValue: {
    fontSize: 16,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.dark,
  },

  progressContainer: {
    marginTop: 8,
    padding: 13,
    borderRadius: 6,
    backgroundColor: pdfColors.light,
    borderWidth: 1,
    borderColor: pdfColors.border,
  },

  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 7,
  },

  progressLabel: {
    fontSize: 8,
    color: pdfColors.text,
  },

  progressValue: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.success,
  },

  progressTrack: {
    height: 7,
    borderRadius: 4,
    backgroundColor: pdfColors.border,
    overflow: "hidden",
  },

  progressFill: {
    height: 7,
    borderRadius: 4,
    backgroundColor: pdfColors.success,
  },

  table: {
    width: "100%",
    borderWidth: 1,
    borderColor: pdfColors.border,
    borderRadius: 4,
    overflow: "hidden",
  },

  tableHeader: {
    flexDirection: "row",
    backgroundColor: pdfColors.primaryDark,
    minHeight: 28,
    alignItems: "center",
  },

  tableHeaderCell: {
    paddingHorizontal: 6,
    paddingVertical: 7,
    fontSize: 7,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.white,
    textTransform: "uppercase",
  },

  tableRow: {
    flexDirection: "row",
    minHeight: 28,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: pdfColors.border,
    backgroundColor: pdfColors.white,
  },

  tableRowAlternate: {
    flexDirection: "row",
    minHeight: 28,
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: pdfColors.border,
    backgroundColor: pdfColors.light,
  },

  tableCell: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 7.5,
    color: pdfColors.text,
    lineHeight: 1.3,
  },

  tableCellBold: {
    paddingHorizontal: 6,
    paddingVertical: 6,
    fontSize: 7.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.dark,
    lineHeight: 1.3,
  },

  columnNumber: {
    width: "6%",
  },

  columnGuest: {
    width: "25%",
  },

  columnPhone: {
    width: "17%",
  },

  columnPassId: {
    width: "18%",
  },

  columnStatus: {
    width: "15%",
  },

  columnDate: {
    width: "19%",
  },

  columnEmail: {
    width: "23%",
  },

  columnCategory: {
    width: "14%",
  },

  columnAllowed: {
    width: "10%",
  },

  columnInvitation: {
    width: "16%",
  },

  columnRsvp: {
    width: "14%",
  },

  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: pdfColors.light,
  },

  statusBadgeSuccess: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: pdfColors.successLight,
  },

  statusBadgeWarning: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: pdfColors.warningLight,
  },

  statusBadgeDanger: {
    alignSelf: "flex-start",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: pdfColors.dangerLight,
  },

  statusText: {
    fontSize: 6.5,
    color: pdfColors.text,
  },

  statusTextSuccess: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.success,
  },

  statusTextWarning: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.warning,
  },

  statusTextDanger: {
    fontSize: 6.5,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.danger,
  },

  emptyState: {
    padding: 24,
    textAlign: "center",
    backgroundColor: pdfColors.light,
    borderWidth: 1,
    borderColor: pdfColors.border,
    borderRadius: 6,
  },

  emptyStateTitle: {
    fontSize: 10,
    fontFamily: "Helvetica-Bold",
    color: pdfColors.dark,
    marginBottom: 4,
  },

  emptyStateText: {
    fontSize: 8,
    color: pdfColors.muted,
  },

  footer: {
    position: "absolute",
    left: 34,
    right: 34,
    bottom: 20,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: pdfColors.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  footerText: {
    fontSize: 7,
    color: pdfColors.muted,
  },

  pageNumber: {
    fontSize: 7,
    color: pdfColors.muted,
  },
});