import { Text, View } from "@react-pdf/renderer";

import type { ReportInvitation } from "@/services/reportService";
import { pdfStyles } from "./PdfStyles";

type InvitationTableProps = {
  invitations: ReportInvitation[];
};

function formatViewedDate(value: string | null) {
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

function formatStatusLabel(
  status: string | null | undefined
) {
  if (status === "viewed") {
    return "Viewed";
  }

  if (status === "accepted") {
    return "Accepted";
  }

  if (status === "maybe") {
    return "Maybe";
  }

  if (status === "declined") {
    return "Declined";
  }

  if (status === "created") {
    return "Created";
  }

  return "Pending";
}

function getStatusBadgeStyle(
  status: string | null | undefined
) {
  if (
    status === "viewed" ||
    status === "accepted"
  ) {
    return pdfStyles.statusBadgeSuccess;
  }

  if (status === "maybe") {
    return pdfStyles.statusBadgeWarning;
  }

  if (status === "declined") {
    return pdfStyles.statusBadgeDanger;
  }

  return pdfStyles.statusBadge;
}

function getStatusTextStyle(
  status: string | null | undefined
) {
  if (
    status === "viewed" ||
    status === "accepted"
  ) {
    return pdfStyles.statusTextSuccess;
  }

  if (status === "maybe") {
    return pdfStyles.statusTextWarning;
  }

  if (status === "declined") {
    return pdfStyles.statusTextDanger;
  }

  return pdfStyles.statusText;
}

export default function InvitationTable({
  invitations,
}: InvitationTableProps) {
  return (
    <View style={pdfStyles.section}>
      <Text style={pdfStyles.sectionTitle}>
        Invitation & RSVP Report
      </Text>

      <Text style={pdfStyles.sectionSubtitle}>
        Invitation activity and guest RSVP responses.
      </Text>

      {invitations.length === 0 ? (
        <View style={pdfStyles.emptyState}>
          <Text style={pdfStyles.emptyStateTitle}>
            No invitation records
          </Text>

          <Text style={pdfStyles.emptyStateText}>
            Hakuna invitation zilizopatikana kwenye event hii.
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
                pdfStyles.columnInvitation,
              ]}
            >
              Invitation
            </Text>

            <Text
              style={[
                pdfStyles.tableHeaderCell,
                pdfStyles.columnRsvp,
              ]}
            >
              RSVP
            </Text>

            <Text
              style={[
                pdfStyles.tableHeaderCell,
                pdfStyles.columnDate,
              ]}
            >
              Viewed At
            </Text>
          </View>

          {invitations.map((invitation, index) => (
            <View
              key={invitation.id}
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
                {invitation.guests?.full_name ?? "Guest"}
              </Text>

              <Text
                style={[
                  pdfStyles.tableCell,
                  pdfStyles.columnPhone,
                ]}
              >
                {invitation.guests?.phone ?? "-"}
              </Text>

              <Text
                style={[
                  pdfStyles.tableCellBold,
                  pdfStyles.columnPassId,
                ]}
              >
                {invitation.guests?.event_pass_id ?? "-"}
              </Text>

              <View
                style={[
                  pdfStyles.columnInvitation,
                  {
                    paddingHorizontal: 6,
                    paddingVertical: 6,
                  },
                ]}
              >
                <View
                  style={getStatusBadgeStyle(
                    invitation.invitation_status
                  )}
                >
                  <Text
                    style={getStatusTextStyle(
                      invitation.invitation_status
                    )}
                  >
                    {formatStatusLabel(
                      invitation.invitation_status
                    )}
                  </Text>
                </View>
              </View>

              <View
                style={[
                  pdfStyles.columnRsvp,
                  {
                    paddingHorizontal: 6,
                    paddingVertical: 6,
                  },
                ]}
              >
                <View
                  style={getStatusBadgeStyle(
                    invitation.rsvp_status
                  )}
                >
                  <Text
                    style={getStatusTextStyle(
                      invitation.rsvp_status
                    )}
                  >
                    {formatStatusLabel(
                      invitation.rsvp_status
                    )}
                  </Text>
                </View>
              </View>

              <Text
                style={[
                  pdfStyles.tableCell,
                  pdfStyles.columnDate,
                ]}
              >
                {formatViewedDate(
                  invitation.viewed_at
                )}
              </Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
}