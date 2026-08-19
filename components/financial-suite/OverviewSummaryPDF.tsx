import { Circle, Defs, Document, Image, LinearGradient, Page, Rect, Stop, StyleSheet, Svg, Text, View } from "@react-pdf/renderer";
import { formatTzs } from "@/services/pledgeMessageService";

const PAGE_WIDTH = 600;
const PAGE_HEIGHT = 800;
const RING_SIZE = 240;
const RING_RADIUS = 100;
const RING_STROKE = 18;
const RING_CENTER = RING_SIZE / 2;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const s = StyleSheet.create({
  page: { fontFamily: "Helvetica", backgroundColor: "#07111f" },
  bg: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0 },
  decorRing: { position: "absolute", top: -90, right: -90, width: 260, height: 260, borderRadius: 130, borderWidth: 2, borderColor: "rgba(45,212,191,0.35)" },
  content: { padding: 48, alignItems: "center" },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10, marginTop: 8 },
  logo: { width: 34, height: 34, borderRadius: 8 },
  wordmark: { fontSize: 11, fontWeight: 700, letterSpacing: 3, color: "#5eead4" },
  eventTitle: { fontSize: 26, fontWeight: 700, color: "#ffffff", textAlign: "center", marginTop: 30, paddingHorizontal: 20 },
  eventDate: { fontSize: 13, color: "#94a3b8", textAlign: "center", marginTop: 8 },
  ringWrap: { width: RING_SIZE, height: RING_SIZE, alignItems: "center", justifyContent: "center", marginTop: 30 },
  ringSvg: { position: "absolute", top: 0, left: 0 },
  ringLabel: { alignItems: "center" },
  ringPercentage: { fontSize: 44, fontWeight: 700, color: "#ffffff" },
  ringCaption: { fontSize: 10, color: "#94a3b8", marginTop: 4, letterSpacing: 2 },
  statGrid: { flexDirection: "row", flexWrap: "wrap", justifyContent: "space-between", marginTop: 36, width: "100%" },
  statTile: { width: "48%", backgroundColor: "rgba(255,255,255,0.06)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", borderRadius: 14, padding: 16, marginBottom: 14 },
  statLabel: { fontSize: 9, color: "#94a3b8", letterSpacing: 1 },
  statValue: { fontSize: 19, fontWeight: 700, color: "#ffffff", marginTop: 7 },
  footer: { position: "absolute", bottom: 30, left: 0, right: 0, textAlign: "center", fontSize: 9, color: "#64748b" },
});

function formatSummaryEventDate(value: string) {
  if (!value) return "Date not set";
  return new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric" }).format(new Date(`${value}T00:00:00`));
}

export type OverviewSummaryPDFProps = {
  eventTitle: string;
  eventDate: string;
  financial: {
    totalContributors: number;
    totalPledged: number;
    totalCollected: number;
    outstanding: number;
    percentage: number;
  };
};

export default function OverviewSummaryPDF({ eventTitle, eventDate, financial }: OverviewSummaryPDFProps) {
  const clampedPercentage = Math.min(100, Math.max(0, financial.percentage));
  const progressLength = RING_CIRCUMFERENCE * (clampedPercentage / 100);
  const stats: Array<[string, string | number]> = [
    ["Contributors", financial.totalContributors],
    ["Total Pledged", formatTzs(financial.totalPledged)],
    ["Total Collected", formatTzs(financial.totalCollected)],
    ["Remaining Balance", formatTzs(financial.outstanding)],
  ];

  return (
    <Document title={`${eventTitle} Overview Summary`} author="Smart Event Pass">
      <Page size={{ width: PAGE_WIDTH, height: PAGE_HEIGHT }} style={s.page}>
        <Svg style={s.bg} viewBox={`0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}`}>
          <Defs>
            <LinearGradient id="pageBg" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#022c22" />
              <Stop offset="1" stopColor="#07111f" />
            </LinearGradient>
          </Defs>
          <Rect x={0} y={0} width={PAGE_WIDTH} height={PAGE_HEIGHT} fill="url(#pageBg)" />
        </Svg>
        <View style={s.decorRing} />
        <View style={s.content}>
          <View style={s.header}>
            <Image src="/logo.png" style={s.logo} />
            <Text style={s.wordmark}>SMART EVENT PASS</Text>
          </View>
          <Text style={s.eventTitle}>{eventTitle}</Text>
          <Text style={s.eventDate}>{formatSummaryEventDate(eventDate)}</Text>

          <View style={s.ringWrap}>
            <Svg width={RING_SIZE} height={RING_SIZE} viewBox={`0 0 ${RING_SIZE} ${RING_SIZE}`} style={s.ringSvg}>
              <Defs>
                <LinearGradient id="ringGradient" x1="0" y1="0" x2="1" y2="1">
                  <Stop offset="0" stopColor="#047857" />
                  <Stop offset="1" stopColor="#065f46" />
                </LinearGradient>
              </Defs>
              <Circle cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS} stroke="#ffffff" strokeOpacity={0.15} strokeWidth={RING_STROKE} fill="none" />
              <Circle
                cx={RING_CENTER} cy={RING_CENTER} r={RING_RADIUS}
                stroke="url(#ringGradient)" strokeWidth={RING_STROKE} strokeLinecap="round" fill="none"
                strokeDasharray={`${progressLength} ${RING_CIRCUMFERENCE}`}
                transform={`rotate(-90 ${RING_CENTER} ${RING_CENTER})`}
              />
            </Svg>
            <View style={s.ringLabel}>
              <Text style={s.ringPercentage}>{Math.round(clampedPercentage)}%</Text>
              <Text style={s.ringCaption}>COMPLETED</Text>
            </View>
          </View>

          <View style={s.statGrid}>
            {stats.map(([label, value]) => (
              <View key={label} style={s.statTile}>
                <Text style={s.statLabel}>{label.toUpperCase()}</Text>
                <Text style={s.statValue}>{value}</Text>
              </View>
            ))}
          </View>
        </View>
        <Text style={s.footer}>Generated by Smart Event Pass · {new Date().toLocaleString()}</Text>
      </Page>
    </Document>
  );
}
