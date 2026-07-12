import { Text, View } from "@react-pdf/renderer";

import type { ReportGuest } from "@/services/reportService";
import { pdfStyles } from "./PdfStyles";

type AttendanceTableProps = {
  guests: ReportGuest[];
};

function formatCheckedInDate(value: string | null) {
  if (!value) {
    return "-";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function getStatusLabel(status: string) {
  return status === "checked_in"
    ? "Checked In"
    : "Pending";
}

export default function AttendanceTable({
  guests,
}: AttendanceTableProps) {
  return (
    <View style={pdfStyles.section}>
      <Text style={pdfStyles.sectionTitle}>
        Attendance Report
      </Text>

      <Text style={pdfStyles.sectionSubtitle}>
        Complete guest check-in status and attendance time.
      </Text>

      {guests.length === 0 ? (
        <View style={pdfStyles.emptyState}>
          <Text style={pdfStyles.emptyStateTitle}>
            No attendance records
          </Text>

          <Text style={pdfStyles.emptyStateText}>
            Hakuna wageni waliopatikana kwenye event hii.
          </Text>
        </View>
      ) : (
        <View style={pdfStyles.table}>
          <View style={pdfStyles.tableHeader} fixed>
            <Text
              style={[
                pdfStyles.tableHeaderCell,
                pdfStyles.columnNumber,
              ]}
            >
              No.
            </Text>

            <Text
              style={[
                pdfStyles.tableHeaderCell,
                pdfStyles.columnGuest,
              ]}
            >
              Guest
            </Text>

            <Text
              style={[
                pdfStyles.tableHeaderCell,
                pdfStyles.columnPhone,
              ]}
            >
              Phone
            </Text>

            <Text
              style={[
                pdfStyles.tableHeaderCell,
                pdfStyles.columnPassId,
              ]}
            >
              Pass ID
            </Text>

            <Text
              style={[
                pdfStyles.tableHeaderCell,
                pdfStyles.columnStatus,
              ]}
            >
              Status
            </Text>

            <Text
              style={[
                pdfStyles.tableHeaderCell,
                pdfStyles.columnDate,
              ]}
            >
              Checked In At
            </Text>
          </View>

          {guests.map((guest, index) => {
            const isCheckedIn =
              guest.status === "checked_in";

            return (
              <View
                key={guest.id}
                wrap={false}
                style={
                  index % 2 === 0
                    ? pdfStyles.tableRow
                    : pdfStyles.tableRowAlternate
                }
              >
                <Text
                  style={[
                    pdfStyles.tableCell,
                    pdfStyles.columnNumber,
                  ]}
                >
                  {index + 1}
                </Text>

                <Text
                  style={[
                    pdfStyles.tableCellBold,
                    pdfStyles.columnGuest,
                  ]}
                >
                  {guest.full_name}
                </Text>

                <Text
                  style={[
                    pdfStyles.tableCell,
                    pdfStyles.columnPhone,
                  ]}
                >
                  {guest.phone ?? "-"}
                </Text>

                <Text
                  style={[
                    pdfStyles.tableCellBold,
                    pdfStyles.columnPassId,
                  ]}
                >
                  {guest.event_pass_id ?? "-"}
                </Text>

                <View
                  style={[
                    pdfStyles.columnStatus,
                    {
                      paddingHorizontal: 6,
                      paddingVertical: 6,
                    },
                  ]}
                >
                  <View
                    style={
                      isCheckedIn
                        ? pdfStyles.statusBadgeSuccess
                        : pdfStyles.statusBadgeWarning
                    }
                  >
                    <Text
                      style={
                        isCheckedIn
                          ? pdfStyles.statusTextSuccess
                          : pdfStyles.statusTextWarning
                      }
                    >
                      {getStatusLabel(guest.status)}
                    </Text>
                  </View>
                </View>

                <Text
                  style={[
                    pdfStyles.tableCell,
                    pdfStyles.columnDate,
                  ]}
                >
                  {formatCheckedInDate(
                    guest.checked_in_at
                  )}
                </Text>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}