"use client";

import { useDeferredValue, useMemo, useState } from "react";
import Button from "@/components/ui/Button";
import Dialog from "@/components/ui/Dialog";
import { formatPassIdForDisplay } from "@/lib/passId";
import { MIN_GUEST_SEARCH_LENGTH, searchGuests } from "@/lib/guestSearch";
import type { Guest } from "@/services/guestService";
import CheckInIcon from "./CheckInIcons";
import { passLabel } from "./RecentActivity";

export type CardType = "single" | "double" | null;

function cardTypeLabel(guest: Guest, cardType: CardType) {
  if (cardType === "single") return "Single";
  if (cardType === "double") return "Double";
  return passLabel(guest.allowed_guests).replace(" Pass", "");
}

function statusBadge(guest: Guest) {
  if (guest.checked_in_count >= guest.allowed_guests) return { label: "Checked In", className: "bg-emerald-100 text-emerald-800" };
  if (guest.checked_in_count > 0) return { label: `${guest.checked_in_count} of ${guest.allowed_guests} In`, className: "bg-sky-100 text-sky-800" };
  return { label: "Not Arrived", className: "bg-slate-100 text-slate-700" };
}

function maskedPhone(phone: string | null) {
  const digits = phone?.replace(/\D/g, "") ?? "";
  return digits.length >= 4 ? `•••${digits.slice(-4)}` : null;
}

export default function NameSearchPanel({
  guests,
  cardTypeOf,
  checking,
  onCheckIn,
}: {
  guests: Guest[];
  cardTypeOf: (guest: Guest) => CardType;
  checking: boolean;
  onCheckIn: (guest: Guest) => Promise<void>;
}) {
  const [query, setQuery] = useState("");
  const [confirmGuestId, setConfirmGuestId] = useState<number | null>(null);
  const deferredQuery = useDeferredValue(query);
  const { results, total } = useMemo(() => searchGuests(guests, deferredQuery), [guests, deferredQuery]);
  // Looked up from the live list so the dialog reflects a count that changed while it was open.
  const confirmGuest = confirmGuestId === null ? null : guests.find((guest) => guest.id === confirmGuestId) ?? null;
  const tooShort = query.trim().length < MIN_GUEST_SEARCH_LENGTH;

  async function handleConfirm() {
    if (!confirmGuest) return;
    const guest = confirmGuest;
    setConfirmGuestId(null);
    await onCheckIn(guest);
  }

  return (
    <div>
      <label htmlFor="guestSearch" className="sep-label block">Guest name, phone or Pass ID</label>
      <input
        id="guestSearch"
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="e.g. John Mwita"
        autoComplete="off"
        className="sep-control mt-2 text-lg"
      />
      <p className="sep-caption mt-2">Type at least {MIN_GUEST_SEARCH_LENGTH} characters. Pick the right person from the list, then confirm.</p>

      {!tooShort && (
        <div className="mt-5" aria-live="polite">
          {results.length ? (
            <>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                {total > results.length ? `Showing ${results.length} of ${total} matches — type more to narrow down` : `${total} match${total === 1 ? "" : "es"}`}
              </p>
              <ul className="mt-2 space-y-2">
                {results.map((guest) => {
                  const badge = statusBadge(guest);
                  const fullyIn = guest.checked_in_count >= guest.allowed_guests;
                  const phone = maskedPhone(guest.phone);
                  return (
                    <li key={guest.id} className="flex flex-col gap-3 rounded-xl border border-[#e7e1d7] bg-stone-50 p-3.5 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <p className="truncate font-bold text-slate-900">{guest.full_name}</p>
                        <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-slate-600">
                          <span className="font-mono text-xs font-bold text-slate-500">{guest.event_pass_id ? formatPassIdForDisplay(guest.event_pass_id) : "No Pass ID"}</span>
                          {phone && <span className="tabular-nums">{phone}</span>}
                          {guest.category && <span>{guest.category}</span>}
                        </p>
                        <p className="mt-2 flex flex-wrap gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 text-xs font-bold text-slate-700 ring-1 ring-[#e7e1d7]">
                            <CheckInIcon name="users" className="h-3.5 w-3.5" />{cardTypeLabel(guest, cardTypeOf(guest))}
                          </span>
                          <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-bold ${badge.className}`}>{badge.label}</span>
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant={fullyIn ? "secondary" : "primary"}
                        disabled={fullyIn || checking}
                        onClick={() => setConfirmGuestId(guest.id)}
                        className="shrink-0 sm:min-w-32"
                      >
                        {fullyIn ? "Checked In" : guest.allowed_guests > 1 ? `Check in (${guest.checked_in_count + 1} of ${guest.allowed_guests})` : "Check in"}
                      </Button>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="rounded-xl border border-[#e7e1d7] bg-stone-50 p-4 text-sm text-slate-600">No guest in this event matches “{query.trim()}”.</p>
          )}
        </div>
      )}

      {confirmGuest && (
        <Dialog titleId="confirm-name-check-in-title" onClose={() => setConfirmGuestId(null)} className="sm:max-w-md">
          <h2 id="confirm-name-check-in-title" className="sep-card-title">Confirm check-in</h2>
          <p className="mt-3 text-lg font-bold text-slate-900">
            Check in {confirmGuest.full_name}
            {confirmGuest.event_pass_id ? `, ${formatPassIdForDisplay(confirmGuest.event_pass_id)}` : ""}?
          </p>
          <p className="sep-secondary mt-2">
            {cardTypeLabel(confirmGuest, cardTypeOf(confirmGuest))} pass
            {confirmGuest.allowed_guests > 1 && ` — this will be guest ${confirmGuest.checked_in_count + 1} of ${confirmGuest.allowed_guests}`}
            {maskedPhone(confirmGuest.phone) && ` · Phone ${maskedPhone(confirmGuest.phone)}`}
          </p>
          <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm font-medium text-amber-800">
            Make sure this is the right person — names can repeat within an event.
          </p>
          <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="secondary" onClick={() => setConfirmGuestId(null)}>Cancel</Button>
            <Button onClick={() => void handleConfirm()} disabled={checking || confirmGuest.checked_in_count >= confirmGuest.allowed_guests}>Confirm Check In</Button>
          </div>
        </Dialog>
      )}
    </div>
  );
}
