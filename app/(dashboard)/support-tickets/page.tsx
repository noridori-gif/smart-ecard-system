"use client";

import { useEffect, useState, type FormEvent } from "react";

import Link from "next/link";

import {
  createTicket,
  getStatusLabel,
  listTickets,
  type SupportTicket,
  type TicketStatus,
} from "@/services/ticketService";

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

export default function SupportTicketsPage() {
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState("");

  useEffect(() => {
    loadTickets();
  }, []);

  async function loadTickets() {
    try {
      setIsLoading(true);
      setErrorMessage("");

      const data = await listTickets();

      setTickets(data);
    } catch (error) {
      console.error("Support tickets loading error:", error);

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Tickets hazikuweza kupatikana."
      );
    } finally {
      setIsLoading(false);
    }
  }

  async function handleCreateTicket(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting || !subject.trim() || !message.trim()) {
      return;
    }

    try {
      setIsSubmitting(true);
      setFormError("");

      await createTicket({
        subject: subject.trim(),
        message: message.trim(),
      });

      setSubject("");
      setMessage("");
      setIsFormOpen(false);

      await loadTickets();
    } catch (error) {
      console.error("Support ticket creation error:", error);

      setFormError(
        error instanceof Error
          ? error.message
          : "Ticket haikuweza kutengenezwa."
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h1 className="sep-page-title">Support Tickets</h1>

          <p className="mt-2 text-sm text-slate-600">
            Fungua ticket kwa admin timu, fuatilia majibu na status ya
            tatizo lako.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            setIsFormOpen((open) => !open);
            setFormError("");
          }}
          className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800"
        >
          {isFormOpen ? "Cancel" : "New Ticket"}
        </button>
      </div>

      {isFormOpen && (
        <form
          onSubmit={handleCreateTicket}
          className="space-y-4 rounded-2xl border border-[#e7e1d7] bg-white p-5 shadow-sm"
        >
          {formError && (
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
              {formError}
            </div>
          )}

          <div>
            <label
              htmlFor="ticket-subject"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Subject
            </label>

            <input
              id="ticket-subject"
              type="text"
              value={subject}
              onChange={(event) => setSubject(event.target.value)}
              maxLength={200}
              required
              placeholder="Fupisha tatizo lako..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <div>
            <label
              htmlFor="ticket-message"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Message
            </label>

            <textarea
              id="ticket-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              required
              rows={4}
              placeholder="Eleza tatizo lako kwa undani..."
              className="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-emerald-700 px-5 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isSubmitting ? "Sending..." : "Submit Ticket"}
          </button>
        </form>
      )}

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      {isLoading ? (
        <div className="flex min-h-[280px] items-center justify-center rounded-2xl border border-[#e7e1d7] bg-white shadow-sm">
          <div className="text-center">
            <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-700" />

            <p className="mt-4 text-sm text-slate-600">
              Inapakua tickets...
            </p>
          </div>
        </div>
      ) : tickets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-slate-900">
            Hakuna tickets bado
          </h2>

          <p className="mt-2 text-sm text-slate-600">
            Bofya &quot;New Ticket&quot; kufungua ticket ya kwanza.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {tickets.map((ticket) => (
            <Link
              key={ticket.id}
              href={`/support-tickets/${ticket.id}`}
              className="flex flex-col justify-between gap-3 rounded-2xl border border-[#e7e1d7] bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md sm:flex-row sm:items-center"
            >
              <div className="min-w-0">
                <p className="truncate font-bold text-slate-900">
                  {ticket.subject}
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  Updated {formatDateTime(ticket.updated_at)}
                </p>
              </div>

              <span
                className={`inline-flex w-fit shrink-0 rounded-full px-3 py-1 text-xs font-bold ${statusBadgeClass(
                  ticket.status
                )}`}
              >
                {getStatusLabel(ticket.status)}
              </span>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}
