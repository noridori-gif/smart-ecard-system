"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import SendWhatsAppCloudButton from "@/components/invitation/SendWhatsAppCloudButton";
import Badge from "@/components/ui/Badge";
import { buttonClassName } from "@/components/ui/Button";

import {
  getAllInvitations,
  type InvitationWithDetails,
} from "@/services/invitationService";
import { formatPassIdForDisplay } from "@/lib/passId";

import {
  buildWhatsAppMessage,
  formatGuestPhoneNumber,
} from "@/services/invitationMessageService";
import { sendSmsInvitation } from "@/services/smsService";

type NotificationType =
  | "success"
  | "error";

type NotificationState = {
  message: string;
  type: NotificationType;
} | null;

type InvitationActionHandlers = {
  onSMS: (
    invitation:
      InvitationWithDetails
  ) => void;

  onCopy: (
    invitation:
      InvitationWithDetails
  ) => void;
};

type InvitationActionsProps =
  InvitationActionHandlers & {
    invitation:
      InvitationWithDetails;
    sendingInvitationId: number | null;
  };

const INVITATIONS_PER_PAGE = 10;

export default function InvitationsPage() {
  const [
    invitations,
    setInvitations,
  ] = useState<
    InvitationWithDetails[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    notification,
    setNotification,
  ] =
    useState<NotificationState>(
      null
    );

  const [
    searchTerm,
    setSearchTerm,
  ] = useState("");

  const [
    selectedEventId,
    setSelectedEventId,
  ] = useState("all");

  const [
    selectedLanguage,
    setSelectedLanguage,
  ] = useState("all");

  const [
    currentPage,
    setCurrentPage,
  ] = useState(1);

  const [
    sendingInvitationId,
    setSendingInvitationId,
  ] = useState<number | null>(null);

  const showNotification = useCallback((
    message: string,
    type: NotificationType =
      "success"
  ) => {
    setNotification({
      message,
      type,
    });

    window.setTimeout(() => {
      setNotification(null);
    }, 3500);
  }, []);

  const loadInvitations = useCallback(async () => {
    try {
      setLoading(true);

      const invitationData =
        await getAllInvitations();

      setInvitations(
        invitationData ?? []
      );
    } catch (error) {
      console.error(
        "Error loading invitations:",
        error
      );

      showNotification(
        error instanceof Error
          ? error.message
          : "Imeshindikana kupakua invitations.",
        "error"
      );
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    const timer = window.setTimeout(
      () => void loadInvitations(),
      0
    );
    return () => window.clearTimeout(timer);
  }, [loadInvitations]);

  async function handleSMS(
    invitation:
      InvitationWithDetails
  ) {
    if (
      sendingInvitationId ===
      invitation.id
    ) {
      return;
    }

    const phoneNumber =
      formatGuestPhoneNumber(
        invitation.guests?.phone
      );

    if (!phoneNumber) {
      showNotification(
        "Mgeni huyu hana namba ya simu.",
        "error"
      );

      return;
    }

    setSendingInvitationId(
      invitation.id
    );

    try {
      const result =
        await sendSmsInvitation(
          invitation.id
        );

      showNotification(
        result.message ||
          "SMS invitation accepted by BEEM Africa.",
        "success"
      );
    } catch (error) {
      console.error(
        "Send SMS invitation error:",
        error
      );

      showNotification(
        error instanceof Error
          ? error.message
          : "SMS invitation haikuweza kutumwa.",
        "error"
      );
    } finally {
      setSendingInvitationId(null);
    }
  }

  async function handleCopyMessage(
    invitation:
      InvitationWithDetails
  ) {
    const message =
      buildWhatsAppMessage(
        invitation,
        window.location.origin
      );

    try {
      if (
        navigator.clipboard &&
        window.isSecureContext
      ) {
        await navigator.clipboard.writeText(
          message
        );
      } else {
        const textArea =
          document.createElement(
            "textarea"
          );

        textArea.value = message;

        textArea.style.position =
          "fixed";

        textArea.style.left =
          "-9999px";

        document.body.appendChild(
          textArea
        );

        textArea.focus();
        textArea.select();

        const copied =
          document.execCommand(
            "copy"
          );

        document.body.removeChild(
          textArea
        );

        if (!copied) {
          throw new Error(
            "Copy failed."
          );
        }
      }

      showNotification(
        "Ujumbe umenakiliwa vizuri.",
        "success"
      );
    } catch (error) {
      console.error(
        "Copy message error:",
        error
      );

      showNotification(
        "Imeshindikana kunakili ujumbe.",
        "error"
      );
    }
  }

  const eventOptions =
    useMemo(() => {
      const eventMap =
        new Map<number, string>();

      invitations.forEach(
        (invitation) => {
          if (
            invitation.event_id &&
            invitation.events?.title
          ) {
            eventMap.set(
              invitation.event_id,
              invitation.events.title
            );
          }
        }
      );

      return Array.from(
        eventMap.entries()
      ).map(
        ([id, title]) => ({
          id,
          title,
        })
      );
    }, [invitations]);

  const filteredInvitations =
    useMemo(() => {
      const normalizedSearch =
        searchTerm
          .trim()
          .toLowerCase();

      return invitations.filter(
        (invitation) => {
          const guestName =
            invitation.guests
              ?.full_name
              ?.toLowerCase() ??
            "";

          const phone =
            invitation.guests
              ?.phone
              ?.toLowerCase() ??
            "";

          const eventTitle =
            invitation.events
              ?.title
              ?.toLowerCase() ??
            "";

          const eventPassId =
            invitation.event_pass_id
              ?.toLowerCase() ??
            "";

          const matchesSearch =
            !normalizedSearch ||
            guestName.includes(
              normalizedSearch
            ) ||
            phone.includes(
              normalizedSearch
            ) ||
            eventTitle.includes(
              normalizedSearch
            ) ||
            eventPassId.includes(
              normalizedSearch
            );

          const matchesEvent =
            selectedEventId ===
              "all" ||
            String(
              invitation.event_id
            ) === selectedEventId;

          const matchesLanguage =
            selectedLanguage ===
              "all" ||
            invitation.language ===
              selectedLanguage;

          return (
            matchesSearch &&
            matchesEvent &&
            matchesLanguage
          );
        }
      );
    }, [
      invitations,
      searchTerm,
      selectedEventId,
      selectedLanguage,
    ]);

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredInvitations.length /
        INVITATIONS_PER_PAGE
    )
  );

  const safeCurrentPage =
    Math.min(
      currentPage,
      totalPages
    );

  const pageStart =
    (safeCurrentPage - 1) *
    INVITATIONS_PER_PAGE;

  const paginatedInvitations =
    filteredInvitations.slice(
      pageStart,
      pageStart +
        INVITATIONS_PER_PAGE
    );

  if (loading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center rounded-2xl border border-[#e7e1d7] bg-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-700" />

          <p className="mt-4 text-sm text-slate-600">
            Inapakua
            invitations...
          </p>
        </div>
      </div>
    );
  }

  return (
    <section className="space-y-6">
      {notification && (
        <div
          className={`fixed right-4 top-4 z-50 max-w-sm rounded-xl px-5 py-4 text-sm font-semibold text-white shadow-lg ${
            notification.type ===
            "success"
              ? "bg-emerald-600"
              : "bg-red-600"
          }`}
        >
          {notification.message}
        </div>
      )}

      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <h1 className="text-[32px] font-bold leading-tight text-slate-950 sm:text-4xl">
            Invitations
          </h1>

          <p className="mt-2 text-[15px] text-slate-600">
            Tuma na usimamie
            mialiko ya wageni.
          </p>
        </div>

        <div className="min-w-52 rounded-2xl border border-[#e7e1d7] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(39,34,25,0.05)]">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Invitations
          </p>

          <p className="mt-1 text-3xl font-bold tabular-nums text-slate-950">
            {
              filteredInvitations.length
            }
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-[#e7e1d7] bg-white p-5 shadow-[0_8px_24px_rgba(39,34,25,0.05)]">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <label
              htmlFor="invitation-search"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Search
            </label>

            <input
              id="invitation-search"
              type="search"
              value={searchTerm}
              onChange={(event) =>
                {
                  setSearchTerm(event.target.value);
                  setCurrentPage(1);
                }
              }
              placeholder="Jina, simu, event au Pass ID..."
              className="min-h-12 w-full rounded-xl border border-[#ddd7cc] bg-white px-4 text-[15px] text-slate-900 caret-emerald-700 outline-none placeholder:text-slate-400 focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 [color-scheme:light]"
            />
          </div>

          <div>
            <label
              htmlFor="event-filter"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Event
            </label>

            <select
              id="event-filter"
              value={
                selectedEventId
              }
              onChange={(event) =>
                {
                  setSelectedEventId(event.target.value);
                  setCurrentPage(1);
                }
              }
              className="min-h-12 w-full rounded-xl border border-[#ddd7cc] bg-white px-4 text-[15px] text-slate-900 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 [color-scheme:light]"
            >
              <option value="all">
                Events zote
              </option>

              {eventOptions.map(
                (eventItem) => (
                  <option
                    key={
                      eventItem.id
                    }
                    value={String(
                      eventItem.id
                    )}
                  >
                    {
                      eventItem.title
                    }
                  </option>
                )
              )}
            </select>
          </div>

          <div>
            <label
              htmlFor="language-filter"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Language
            </label>

            <select
              id="language-filter"
              value={
                selectedLanguage
              }
              onChange={(event) =>
                {
                  setSelectedLanguage(event.target.value);
                  setCurrentPage(1);
                }
              }
              className="min-h-12 w-full rounded-xl border border-[#ddd7cc] bg-white px-4 text-[15px] text-slate-900 outline-none focus:border-emerald-700 focus:ring-4 focus:ring-emerald-100 [color-scheme:light]"
            >
              <option value="all">
                Languages zote
              </option>

              <option value="sw">
                Kiswahili
              </option>

              <option value="en">
                English
              </option>
            </select>
          </div>
        </div>
      </section>

      {paginatedInvitations.length ===
      0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Hakuna invitation
            iliyopatikana
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Badilisha search au
            filters kisha ujaribu
            tena.
          </p>
        </div>
      ) : (
        <>
          <DesktopInvitationsTable
            invitations={
              paginatedInvitations
            }
            onSMS={handleSMS}
            onCopy={
              handleCopyMessage
            }
            sendingInvitationId={sendingInvitationId}
          />

          <MobileInvitationsList
            invitations={
              paginatedInvitations
            }
            onSMS={handleSMS}
            onCopy={
              handleCopyMessage
            }
            sendingInvitationId={sendingInvitationId}
          />

          <Pagination
            currentPage={
              safeCurrentPage
            }
            totalPages={
              totalPages
            }
            start={
              pageStart + 1
            }
            end={Math.min(
              pageStart +
                INVITATIONS_PER_PAGE,
              filteredInvitations.length
            )}
            total={
              filteredInvitations.length
            }
            onPrevious={() =>
              setCurrentPage(
                (page) =>
                  Math.max(
                    1,
                    page - 1
                  )
              )
            }
            onNext={() =>
              setCurrentPage(
                (page) =>
                  Math.min(
                    totalPages,
                    page + 1
                  )
              )
            }
          />
        </>
      )}
    </section>
  );
}

function DesktopInvitationsTable({
  invitations,
  onSMS,
  onCopy,
  sendingInvitationId,
}: InvitationActionHandlers & {
  invitations:
    InvitationWithDetails[];
  sendingInvitationId: number | null;
}) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-[#e7e1d7] bg-white shadow-[0_8px_24px_rgba(39,34,25,0.05)] md:block">
      <div className="overflow-x-auto">
        <table className="min-w-[1040px] divide-y divide-[#e8e2d9] text-[15px]">
          <thead className="bg-[#faf8f4]">
            <tr>
              <TableHeading>
                Guest
              </TableHeading>

              <TableHeading>
                Event
              </TableHeading>

              <TableHeading>
                Pass ID
              </TableHeading>

              <TableHeading center>
                Guests
              </TableHeading>

              <TableHeading center>
                Language
              </TableHeading>

              <TableHeading right>
                Actions
              </TableHeading>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {invitations.map(
              (invitation) => (
                <tr
                  key={invitation.id}
                  className="transition hover:bg-slate-50"
                >
                  <td className="px-5 py-4">
                    <p className="font-semibold text-slate-900">
                      {invitation
                        .guests
                        ?.full_name ??
                        "Guest"}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {invitation
                        .guests
                        ?.phone ??
                        "No phone"}
                    </p>
                  </td>

                  <td className="px-5 py-4 text-sm text-slate-700">
                    {invitation
                      .events?.title ??
                      "Unknown event"}
                  </td>

                  <td className="px-5 py-4">
                    <span className="font-mono text-sm font-semibold text-slate-800">
                      {invitation.event_pass_id
                        ? formatPassIdForDisplay(invitation.event_pass_id)
                        : "-"}
                    </span>
                  </td>

                  <td className="px-5 py-4 text-center text-sm font-semibold text-slate-800">
                    {invitation.allowed_guests ??
                      1}
                  </td>

                  <td className="px-5 py-4 text-center">
                    <LanguageBadge
                      language={
                        invitation.language
                      }
                    />
                  </td>

                  <td className="px-5 py-4">
                    <InvitationActions
                      invitation={
                        invitation
                      }
                      onSMS={onSMS}
                      onCopy={onCopy}
                      compact
                      sendingInvitationId={sendingInvitationId}
                    />
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function MobileInvitationsList({
  invitations,
  onSMS,
  onCopy,
  sendingInvitationId,
}: InvitationActionHandlers & {
  invitations:
    InvitationWithDetails[];
  sendingInvitationId: number | null;
}) {
  return (
    <div className="grid gap-3 md:hidden">
      {invitations.map(
        (invitation) => {
          const guestName =
            invitation.guests
              ?.full_name ??
            "Guest";

          return (
          <article
            key={invitation.id}
            className="rounded-2xl border border-[#e7e1d7] bg-white p-4 shadow-[0_8px_24px_rgba(39,34,25,0.05)]"
          >
            <div className="flex min-w-0 items-start justify-between gap-2">
              <div className="min-w-0">
                <h2
                  className="truncate text-sm font-semibold text-slate-900"
                  title={guestName}
                >
                  {guestName}
                </h2>

                <p className="mt-0.5 truncate text-xs text-slate-500">
                  {invitation.guests
                    ?.phone ??
                    "No phone"}
                </p>
              </div>

              <LanguageBadge
                language={
                  invitation.language
                }
              />
            </div>

            <div className="mt-2 grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,0.85fr)] gap-2">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Event
                </p>

                <p
                  className="truncate text-xs font-medium text-slate-800"
                  title={
                    invitation.events
                      ?.title ??
                    "Unknown event"
                  }
                >
                  {invitation.events
                    ?.title ??
                    "Unknown event"}
                </p>
              </div>

              <div>
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Allowed
                </p>

                <p className="text-xs font-semibold text-slate-800">
                  {invitation.allowed_guests ??
                    1}
                </p>
              </div>

              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                  Pass ID
                </p>

                <p
                  className="truncate font-mono text-xs font-semibold text-slate-800"
                  title={
                    invitation.event_pass_id
                      ? formatPassIdForDisplay(invitation.event_pass_id)
                      : "Not available"
                  }
                >
                  {invitation.event_pass_id
                    ? formatPassIdForDisplay(invitation.event_pass_id)
                    : "-"}
                </p>
              </div>
            </div>

            <InvitationActions
              invitation={invitation}
              onSMS={onSMS}
              onCopy={onCopy}
              sendingInvitationId={sendingInvitationId}
            />
          </article>
          );
        }
      )}
    </div>
  );
}

function InvitationActions({
  invitation,
  onSMS,
  onCopy,
  compact = false,
  sendingInvitationId,
}: InvitationActionsProps & {
  compact?: boolean;
}) {
  return (
    <div
      className={
        compact
          ? "flex flex-wrap justify-end gap-2"
          : "mt-4 grid grid-cols-2 gap-2"
      }
    >
      <Link
        href={`/invite/${invitation.invitation_token}`}
        target="_blank"
        rel="noopener noreferrer"
        className={buttonClassName({ variant: "dark", size: "sm" })}
      >
        View
      </Link>

      <button
        type="button"
        disabled={
          !invitation.guests?.phone ||
          sendingInvitationId === invitation.id
        }
        onClick={() =>
          onSMS(invitation)
        }
        className={buttonClassName({ variant: "info", size: "sm" })}
      >
        {sendingInvitationId === invitation.id ? "Sending..." : "SMS"}
      </button>

      <button
        type="button"
        onClick={() =>
          onCopy(invitation)
        }
        className={buttonClassName({ variant: "secondary", size: "sm" })}
      >
        Copy
      </button>

      <SendWhatsAppCloudButton
        invitationToken={
          invitation.invitation_token
        }
        disabled={
          !invitation.guests?.phone
        }
        compact={compact}
      />
    </div>
  );
}

function LanguageBadge({
  language,
}: {
  language: string;
}) {
  return (
    <Badge variant="info" className="uppercase">
      {language}
    </Badge>
  );
}

function TableHeading({
  children,
  center = false,
  right = false,
}: {
  children: ReactNode;
  center?: boolean;
  right?: boolean;
}) {
  return (
    <th
      className={`px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500 ${
        right
          ? "text-right"
          : center
            ? "text-center"
            : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

function Pagination({
  currentPage,
  totalPages,
  start,
  end,
  total,
  onPrevious,
  onNext,
}: {
  currentPage: number;
  totalPages: number;
  start: number;
  end: number;
  total: number;
  onPrevious: () => void;
  onNext: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-[#e7e1d7] bg-white px-5 py-4 shadow-[0_8px_24px_rgba(39,34,25,0.05)] sm:flex-row">
      <p className="text-sm text-slate-600">
        Showing{" "}
        <span className="font-semibold">
          {start}
        </span>{" "}
        to{" "}
        <span className="font-semibold">
          {end}
        </span>{" "}
        of{" "}
        <span className="font-semibold">
          {total}
        </span>
      </p>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={
            currentPage === 1
          }
          onClick={onPrevious}
          className="min-h-11 rounded-xl border border-[#ddd7cc] px-4 text-sm font-semibold text-slate-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <span className="px-2 text-sm font-medium tabular-nums text-slate-700">
          Page {currentPage} of{" "}
          {totalPages}
        </span>

        <button
          type="button"
          disabled={
            currentPage ===
            totalPages
          }
          onClick={onNext}
          className="min-h-11 rounded-xl border border-[#ddd7cc] px-4 text-sm font-semibold text-slate-700 transition hover:bg-stone-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
