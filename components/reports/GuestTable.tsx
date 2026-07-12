import { Text, View } from "@react-pdf/renderer";

import type { ReportGuest } from "@/services/reportService";
import { pdfStyles } from "./PdfStyles";

type GuestTableProps = {
  guests: ReportGuest[];
};

function getGuestStatusLabel(status: string) {
  return status === "checked_in"
    ? "Checked In"
    : "Pending";
}

export default function GuestTable({
  guests,
}: GuestTableProps) {
  return (
    <View style={pdfStyles.section}>
      <Text style={pdfStyles.sectionTitle}>
        Guest List
      </Text>

      <Text style={pdfStyles.sectionSubtitle}>
        Complete guest information for the selected event.
      </Text>

      {guests.length === 0 ? (
        <View style={pdfStyles.emptyState}>
          <Text style={pdfStyles.emptyStateTitle}>
            No guest records
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
                pdfStyles.columnEmail,
              ]}
            >
              Email
            </Text>

            <Text
              style={[
                pdfStyles.tableHeaderCell,
                pdfStyles.columnCategory,
              ]}
            >
              Category
            </Text>

            <Text
              style={[
                pdfStyles.tableHeaderCell,
                pdfStyles.columnAllowed,
              ]}
            >
              Allowed
            </Text>

            <Text
              style={[
                pdfStyles.tableHeaderCell,
                pdfStyles.columnPassId,
              ]}
            >
              Pass ID
            </Text>
          </View>

          {guests.map((guest, index) => (
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
                  pdfStyles.tableCell,
                  pdfStyles.columnEmail,
                ]}
              >
                {guest.email ?? "-"}
              </Text>

              <Text
                style={[
                  pdfStyles.tableCell,
                  pdfStyles.columnCategory,
                ]}
              >
                {guest.category ?? "-"}
              </Text>

              <Text
                style={[
                  pdfStyles.tableCellBold,
                  pdfStyles.columnAllowed,
                ]}
              >
                {guest.allowed_guests ?? 1}
              </Text>

              <View
                style={[
                  pdfStyles.columnPassId,
                  {
                    paddingHorizontal: 6,
                    paddingVertical: 6,
                  },
                ]}
              >
                <Text style={pdfStyles.tableCellBold}>
                  {guest.event_pass_id ?? "-"}
                </Text>

                <Text
                  style={[
                    pdfStyles.tableCell,
                    {
                      marginTop: 2,
                      paddingHorizontal: 0,
                      paddingVertical: 0,
                    },
                  ]}
                >
                  {getGuestStatusLabel(guest.status)}
                </Text>
              </View>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}