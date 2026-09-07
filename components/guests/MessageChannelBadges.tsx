import type { GuestMessageStatus, MessageChannelStatus } from "@/services/guestMessageStatusService";

function formatBadgeDate(value: string | null) {
  if (!value) {
    return "";
  }

  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
  }).format(new Date(value));
}

function channelLabel(channel: MessageChannelStatus): string {
  if (channel.state === "sent") {
    const date = formatBadgeDate(channel.at);
    return date ? `Imetumwa (${date})` : "Imetumwa";
  }

  if (channel.state === "failed") {
    return "Ilishindwa";
  }

  return "Bado";
}

function channelClassName(channel: MessageChannelStatus): string {
  if (channel.state === "sent") {
    return "bg-emerald-100 text-emerald-700";
  }

  if (channel.state === "failed") {
    return "bg-red-100 text-red-700";
  }

  return "bg-slate-100 text-slate-500";
}

/** Two small per-channel badges for a guest row -- WhatsApp and SMS send status are tracked completely separately (a guest can have one, both, or neither), so this never collapses them into one combined indicator. */
export default function MessageChannelBadges({
  status,
}: {
  status: GuestMessageStatus | undefined;
}) {
  const whatsapp = status?.whatsapp ?? { state: "not_sent" as const, at: null };
  const sms = status?.sms ?? { state: "not_sent" as const, at: null };

  return (
    <div className="flex flex-col gap-1">
      <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${channelClassName(whatsapp)}`}>
        WhatsApp: {channelLabel(whatsapp)}
      </span>

      <span className={`inline-flex w-fit items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${channelClassName(sms)}`}>
        SMS: {channelLabel(sms)}
      </span>
    </div>
  );
}
