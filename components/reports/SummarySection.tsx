import { View, Text } from "@react-pdf/renderer";
import { pdfStyles } from "./PdfStyles";

type SummarySectionProps = {
  totalGuests: number;
  checkedIn: number;
  pending: number;
  attendancePercentage: number;

  viewed: number;
  accepted: number;
  maybe: number;
  declined: number;
};

export default function SummarySection({
  totalGuests,
  checkedIn,
  pending,
  attendancePercentage,
  viewed,
  accepted,
  maybe,
  declined,
}: SummarySectionProps) {
  return (
    <View style={pdfStyles.section}>
      <Text style={pdfStyles.sectionTitle}>
        Event Summary
      </Text>

      <Text style={pdfStyles.sectionSubtitle}>
        Attendance statistics and RSVP overview.
      </Text>

      <View style={pdfStyles.statisticRow}>
        <View style={pdfStyles.statisticBox}>
          <Text style={pdfStyles.statisticLabel}>
            Total Guests
          </Text>

          <Text style={pdfStyles.statisticValue}>
            {totalGuests}
          </Text>
        </View>

        <View style={pdfStyles.statisticBox}>
          <Text style={pdfStyles.statisticLabel}>
            Checked In
          </Text>

          <Text style={pdfStyles.statisticValue}>
            {checkedIn}
          </Text>
        </View>

        <View style={pdfStyles.statisticBox}>
          <Text style={pdfStyles.statisticLabel}>
            Pending
          </Text>

          <Text style={pdfStyles.statisticValue}>
            {pending}
          </Text>
        </View>

        <View style={pdfStyles.statisticBoxLast}>
          <Text style={pdfStyles.statisticLabel}>
            Attendance
          </Text>

          <Text style={pdfStyles.statisticValue}>
            {attendancePercentage}%
          </Text>
        </View>
      </View>

      <View style={pdfStyles.statisticRow}>
        <View style={pdfStyles.statisticBox}>
          <Text style={pdfStyles.statisticLabel}>
            Viewed
          </Text>

          <Text style={pdfStyles.statisticValue}>
            {viewed}
          </Text>
        </View>

        <View style={pdfStyles.statisticBox}>
          <Text style={pdfStyles.statisticLabel}>
            Accepted
          </Text>

          <Text style={pdfStyles.statisticValue}>
            {accepted}
          </Text>
        </View>

        <View style={pdfStyles.statisticBox}>
          <Text style={pdfStyles.statisticLabel}>
            Maybe
          </Text>

          <Text style={pdfStyles.statisticValue}>
            {maybe}
          </Text>
        </View>

        <View style={pdfStyles.statisticBoxLast}>
          <Text style={pdfStyles.statisticLabel}>
            Declined
          </Text>

          <Text style={pdfStyles.statisticValue}>
            {declined}
          </Text>
        </View>
      </View>

      <View style={pdfStyles.progressContainer}>
        <View style={pdfStyles.progressHeader}>
          <Text style={pdfStyles.progressLabel}>
            Attendance Progress
          </Text>

          <Text style={pdfStyles.progressValue}>
            {attendancePercentage}%
          </Text>
        </View>

        <View style={pdfStyles.progressTrack}>
          <View
            style={[
              pdfStyles.progressFill,
              {
                width: `${attendancePercentage}%`,
              },
            ]}
          />
        </View>
      </View>
    </View>
  );
}