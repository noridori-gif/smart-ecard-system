"use client";

import Link from "next/link";
import {
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import ShareInvitationCardButton from "@/components/invitation/ShareInvitationCardButton";
import SendWhatsAppCloudButton from "@/components/invitation/SendWhatsAppCloudButton";

import {
  getAllInvitations,
  type InvitationWithDetails,
} from "@/services/invitationService";

import {
  buildDeviceSmsUrl,
  buildSmsMessage,
  buildWhatsAppMessage,
  buildWhatsAppUrl,
  formatGuestPhoneNumber,
} from "@/services/invitationMessageService";

type NotificationType =
  | "success"
  | "error";

type NotificationState = {
  message: string;
  type: NotificationType;
} | null;

type InvitationActionHandlers = {
  onWhatsApp: (
    invitation:
      InvitationWithDetails
  ) => void;

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

  useEffect(() => {
    loadInvitations();
  }, []);

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedEventId,
    selectedLanguage,
  ]);

  async function loadInvitations() {
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
  }

  function showNotification(
    message: string,
    type: NotificationType =
      "success"
  ) {
    setNotification({
      message,
      type,
    });

    window.setTimeout(() => {
      setNotification(null);
    }, 3500);
  }

  function handleWhatsApp(
    invitation:
      InvitationWithDetails
  ) {
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

    const message =
      buildWhatsAppMessage(
        invitation,
        window.location.origin
      );

    const whatsappUrl =
      buildWhatsAppUrl(
        phoneNumber,
        message
      );

    window.open(
      whatsappUrl,
      "_blank",
      "noopener,noreferrer"
    );
  }

  function handleSMS(
    invitation:
      InvitationWithDetails
  ) {
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

    const message =
      buildSmsMessage(
        invitation,
        window.location.origin
      );

    const smsUrl =
      buildDeviceSmsUrl(
        phoneNumber,
        message
      );

    window.location.href =
      smsUrl;
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
      <div className="flex min-h-[350px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-blue-600" />

          <p className="mt-4 text-sm text-slate-600">
            Inapakua
            invitations...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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

      <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Invitations
          </h1>

          <p className="mt-1 text-sm text-slate-600">
            Tuma na usimamie
            mialiko ya wageni.
          </p>
        </div>

        <div className="rounded-xl border border-slate-200 bg-white px-5 py-3 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Total Invitations
          </p>

          <p className="mt-1 text-2xl font-bold text-slate-900">
            {
              filteredInvitations.length
            }
          </p>
        </div>
      </header>

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="grid gap-4 lg:grid-cols-3">
          <div>
            <label
              htmlFor="invitation-search"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Search
            </label>

            <input
              id="invitation-search"
              type="search"
              value={searchTerm}
              onChange={(event) =>
                setSearchTerm(
                  event.target.value
                )
              }
              placeholder="Jina, simu, event au Pass ID..."
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 caret-blue-600 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 [color-scheme:light]"
            />
          </div>

          <div>
            <label
              htmlFor="event-filter"
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Event
            </label>

            <select
              id="event-filter"
              value={
                selectedEventId
              }
              onChange={(event) =>
                setSelectedEventId(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 [color-scheme:light]"
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
              className="mb-2 block text-sm font-medium text-slate-700"
            >
              Language
            </label>

            <select
              id="language-filter"
              value={
                selectedLanguage
              }
              onChange={(event) =>
                setSelectedLanguage(
                  event.target.value
                )
              }
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100 [color-scheme:light]"
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
            onWhatsApp={
              handleWhatsApp
            }
            onSMS={handleSMS}
            onCopy={
              handleCopyMessage
            }
          />

          <MobileInvitationsList
            invitations={
              paginatedInvitations
            }
            onWhatsApp={
              handleWhatsApp
            }
            onSMS={handleSMS}
            onCopy={
              handleCopyMessage
            }
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
    </div>
  );
}

function DesktopInvitationsTable({
  invitations,
  onWhatsApp,
  onSMS,
  onCopy,
}: InvitationActionHandlers & {
  invitations:
    InvitationWithDetails[];
}) {
  return (
    <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-slate-200">
          <thead className="bg-slate-50">
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
                      {invitation.event_pass_id ??
                        "-"}
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
                      onWhatsApp={
                        onWhatsApp
                      }
                      onSMS={onSMS}
                      onCopy={onCopy}
                      compact
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
  onWhatsApp,
  onSMS,
  onCopy,
}: InvitationActionHandlers & {
  invitations:
    InvitationWithDetails[];
}) {
  const [
    openInvitationId,
    setOpenInvitationId,
  ] = useState<number | null>(
    null
  );

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm md:hidden">
      {invitations.map(
        (invitation) => {
          const isMoreOpen =
            openInvitationId ===
            invitation.id;

          const morePanelId =
            `invitation-more-${invitation.id}`;

          const guestName =
            invitation.guests
              ?.full_name ??
            "Guest";

          const closeMore = () =>
            setOpenInvitationId(
              null
            );

          return (
          <article
            key={invitation.id}
            className="border-b border-slate-200 px-3 py-3 last:border-b-0"
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
                    invitation.event_pass_id ??
                    "Not available"
                  }
                >
                  {invitation.event_pass_id ??
                    "-"}
                </p>
              </div>
            </div>

            <div className="mt-2 grid grid-cols-[minmax(0,0.8fr)_minmax(0,1.25fr)_44px] gap-2">
              <Link
                href={`/invite/${invitation.invitation_token}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-h-11 min-w-0 items-center justify-center rounded-lg bg-slate-900 px-2 text-xs font-semibold text-white transition hover:bg-slate-700"
              >
                View
              </Link>

              <SendWhatsAppCloudButton
                invitationToken={
                  invitation.invitation_token
                }
                disabled={
                  !invitation.guests
                    ?.phone
                }
                mobile
              />

              <button
                type="button"
                aria-label={`More actions for ${guestName}`}
                aria-expanded={
                  isMoreOpen
                }
                aria-controls={
                  morePanelId
                }
                onClick={() =>
                  setOpenInvitationId(
                    isMoreOpen
                      ? null
                      : invitation.id
                  )
                }
                className="flex min-h-11 items-center justify-center rounded-lg border border-slate-300 bg-white text-slate-700 transition hover:bg-slate-100"
              >
                <svg
                  aria-hidden="true"
                  viewBox="0 0 24 24"
                  className="h-5 w-5"
                  fill="currentColor"
                >
                  <circle cx="5" cy="12" r="2" />
                  <circle cx="12" cy="12" r="2" />
                  <circle cx="19" cy="12" r="2" />
                </svg>
              </button>
            </div>

            {isMoreOpen && (
              <div
                id={morePanelId}
                aria-label={`More actions for ${guestName}`}
                className="mt-2 grid grid-cols-2 gap-2 rounded-lg bg-slate-50 p-2"
              >
                <button
                  type="button"
                  onClick={() => {
                    onWhatsApp(
                      invitation
                    );
                    closeMore();
                  }}
                  className="min-h-11 rounded-lg bg-emerald-600 px-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                >
                  WhatsApp
                </button>

                <button
                  type="button"
                  onClick={() => {
                    onSMS(invitation);
                    closeMore();
                  }}
                  className="min-h-11 rounded-lg bg-blue-600 px-2 text-xs font-semibold text-white transition hover:bg-blue-700"
                >
                  SMS
                </button>

                <button
                  type="button"
                  onClick={() => {
                    void onCopy(
                      invitation
                    );
                    closeMore();
                  }}
                  className="min-h-11 rounded-lg border border-slate-300 bg-white px-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Copy
                </button>

                <ShareInvitationCardButton
                  invitationToken={
                    invitation.invitation_token
                  }
                  guestName={guestName}
                  eventPassId={
                    invitation.event_pass_id
                  }
                  compact
                  mobile
                  onActionComplete={
                    closeMore
                  }
                />
              </div>
            )}
          </article>
          );
        }
      )}
    </div>
  );
}

function InvitationActions({
  invitation,
  onWhatsApp,
  onSMS,
  onCopy,
  compact = false,
}: InvitationActionsProps & {
  compact?: boolean;
}) {
  const guestName =
    invitation.guests
      ?.full_name ?? "Guest";

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
        className="flex items-center justify-center rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-slate-700"
      >
        View
      </Link>

      <button
        type="button"
        onClick={() =>
          onWhatsApp(invitation)
        }
        className="rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
      >
        WhatsApp
      </button>

      <button
        type="button"
        onClick={() =>
          onSMS(invitation)
        }
        className="rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-blue-700"
      >
        SMS
      </button>

      <button
        type="button"
        onClick={() =>
          onCopy(invitation)
        }
        className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
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

      <ShareInvitationCardButton
        invitationToken={
          invitation.invitation_token
        }
        guestName={guestName}
        eventPassId={
          invitation.event_pass_id
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
    <span className="inline-flex rounded-full bg-blue-100 px-3 py-1 text-xs font-semibold uppercase text-blue-700">
      {language}
    </span>
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
    <div className="flex flex-col items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm sm:flex-row">
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
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Previous
        </button>

        <span className="px-2 text-sm font-medium text-slate-700">
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
          className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Next
        </button>
      </div>
    </div>
  );
}
