"use client";

import { useEffect, useState, type FormEvent } from "react";

import Link from "next/link";
import { useParams } from "next/navigation";

import { getCurrentUserProfile } from "@/services/profileService";
import {
  getStatusLabel,
  getTicket,
  listTicketMessages,
  postTicketMessage,
  updateTicketStatus,
  type SupportTicket,
  type SupportTicketMessage,
  type TicketStatus,
} from "@/services/ticketService";

const STATUS_OPTIONS: TicketStatus[] = [
  "open",
  "in_progress",
  "resolved",
];

function formatDateTime(dateValue: string) {
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(dateValue));
}

function statusBadgeClass(status: TicketStatus) {
  if (status === "in_progress") {
    return "bg-sky-100 text-sky-700";
  }

  if (status === "resolved") {
    return "bg-emerald-100 text-emerald-700";
  }

  return "bg-amber-100 text-amber-700";
}

export default function SupportTicketDetailPage() {
  const params = useParams();
  const ticketId = Number(params.id);

  const [ticket, setTicket] = useState<SupportTicket | null>(null);
  const [messages, setMessages] = useState<SupportTicketMessage[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [loadFailed, setLoadFailed] = useState(false);

  const [replyBody, setReplyBody] = useState("");
  const [isReplying, setIsReplying] = useState(false);
  const [replyError, setReplyError] = useState("");

  const [isStatusSaving, setIsStatusSaving] = useState(false);
  const [statusError, setStatusError] = useState("");

  useEffect(() => {
    loadTicket();
  }, [ticketId]);

  async function loadTicket() {
    try {
      setIsLoading(true);
      setLoadFailed(false);

      if (!Number.isInteger(ticketId)) {
        throw new Error("Invalid ticket.");
      }

      const [loadedTicket, loadedMessages, profile] = await Promise.all([
        getTicket(ticketId),
        listTicketMessages(ticketId),
        getCurrentUserProfile(),
      ]);

      setTicket(loadedTicket);
      setMessages(loadedMessages);
      setIsAdmin(profile?.role === "admin");
    } catch (error) {
      console.error("Support ticket loading error:", error);
      setLoadFailed(true);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleReply(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isReplying || !replyBody.trim() || !ticket) {
      return;
    }

    try {
      setIsReplying(true);
      setReplyError("");

      const newMessage = await postTicketMessage({
        ticketId: ticket.id,
        organizerId: ticket.organizer_id,
        body: replyBody.trim(),
      });

      setMessages((current) => [...current, newMessage]);
      setReplyBody("");
    } catch (error) {
      console.error("Support ticket reply error:", error);

      setReplyError(
        error instanceof Error
          ? error.message
          : "Reply haikuweza kutumwa."
      );
    } finally {
      setIsReplying(false);
    }
  }

  async function handleStatusChange(nextStatus: TicketStatus) {
    if (isStatusSaving || !ticket || nextStatus === ticket.status) {
      return;
    }

    try {
      setIsStatusSaving(true);
      setStatusError("");

      const updated = await updateTicketStatus(ticket.id, nextStatus);

      setTicket(updated);
    } catch (error) {
      console.error("Support ticket status update error:", error);

      setStatusError(
        error instanceof Error
          ? error.message
          : "Status haikuweza kubadilishwa."
      );
    } finally {
      setIsStatusSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section aria-busy="true" className="mx-auto max-w-3xl">
        <div className="animate-pulse space-y-4 motion-reduce:animate-none">
          <div className="h-24 rounded-2xl bg-stone-200" />
          <div className="h-64 rounded-2xl bg-stone-200" />
        </div>
      </section>
    );
  }

  if (loadFailed || !ticket) {
    return (
      <section className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-red-200 bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">
            Ticket haipatikani
          </h1>

          <p className="mt-2 text-red-700">
            Ticket haikupatikana au huna ruhusa ya kuiona.
          </p>

          <Link
            href="/support-tickets"
            className="mt-5 inline-flex min-h-11 items-center rounded-xl bg-slate-900 px-5 font-bold text-white"
          >
            Back to Support Tickets
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/support-tickets"
        className="text-sm font-semibold text-emerald-700 hover:underline"
      >
        &larr; Back to Support Tickets
      </Link>

      <div className="rounded-2xl border border-[#e7e1d7] bg-white p-5 shadow-sm">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div className="min-w-0">
            <h1 className="text-xl font-bold text-slate-900">
              {ticket.subject}
            </h1>

            <p className="mt-1 text-xs text-slate-500">
              Opened {formatDateTime(ticket.created_at)}
            </p>
          </div>

          {isAdmin ? (
            <select
              value={ticket.status}
              onChange={(event) =>
                handleStatusChange(event.target.value as TicketStatus)
              }
              disabled={isStatusSaving}
              className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100 disabled:opacity-60"
            >
              {STATUS_OPTIONS.map((status) => (
                <option key={status} value={status}>
                  {getStatusLabel(status)}
                </option>
              ))}
            </select>
          ) : (
            <span
              className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(
                ticket.status
              )}`}
            >
              {getStatusLabel(ticket.status)}
            </span>
          )}
        </div>

        {statusError && (
          <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {statusError}
          </div>
        )}
      </div>

      <div className="space-y-3">
        {messages.map((ticketMessage) => (
          <div
            key={ticketMessage.id}
            className={`max-w-[85%] rounded-2xl border p-4 shadow-sm ${
              ticketMessage.sender_type === "admin"
                ? "ml-auto border-emerald-200 bg-emerald-50"
                : "border-[#e7e1d7] bg-white"
            }`}
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {ticketMessage.sender_type === "admin"
                  ? "Admin"
                  : "You"}
              </span>

              <span className="text-xs text-slate-400">
                {formatDateTime(ticketMessage.created_at)}
              </span>
            </div>

            <p className="mt-2 whitespace-pre-wrap text-sm text-slate-800">
              {ticketMessage.body}
            </p>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleReply}
        className="space-y-3 rounded-2xl border border-[#e7e1d7] bg-white p-5 shadow-sm"
      >
        {replyError && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {replyError}
          </div>
        )}

        <label
          htmlFor="ticket-reply"
          className="block text-sm font-semibold text-slate-700"
        >
          Reply
        </label>

        <textarea
          id="ticket-reply"
          value={replyBody}
          onChange={(event) => setReplyBody(event.target.value)}
          required
          rows={3}
          placeholder="Andika jibu lako..."
          className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
        />

        <button
          type="submit"
          disabled={isReplying}
          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
        >
          {isReplying ? "Sending..." : "Send Reply"}
        </button>
      </form>
    </section>
  );
}
