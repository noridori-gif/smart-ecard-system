"use client";

import { useState } from "react";
import type { Event } from "@/services/eventService";
import { getRoleLabel, type CurrentUserProfile } from "@/services/profileService";
import CheckInIcon from "./CheckInIcons";

function formatEventDate(value: string) {
  try {
    return new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", year: "numeric" }).format(new Date(value));
  } catch {
    return value;
  }
}

export default function ScannerTopBar({
  events,
  selectedEventId,
  onEventChange,
  profile,
  profileLoading,
  onLogout,
  isLoggingOut,
}: {
  events: Event[];
  selectedEventId: number | null;
  onEventChange: (eventId: number) => void;
  profile: CurrentUserProfile | null;
  profileLoading: boolean;
  onLogout: () => void;
  isLoggingOut: boolean;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const selectedEvent = events.find((event) => event.id === selectedEventId) ?? null;
  const displayName = profile?.full_name?.trim() || profile?.email?.split("@")[0] || "User";
  const initial = (displayName.charAt(0) || "U").toUpperCase();
  const roleLabel = profile ? getRoleLabel(profile.role) : "Scanner";

  return (
    <header className="relative z-30 bg-[var(--sep-sidebar)] px-4 py-3 text-white shadow-[0_8px_24px_rgba(15,23,42,0.25)] sm:px-6">
      <div className="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 shrink-0 items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-emerald-600 text-white"><CheckInIcon name="pass" className="h-5 w-5" /></span>
          <div className="min-w-0 leading-tight">
            <p className="truncate text-[15px] font-bold">Smart <span className="text-emerald-400">Event Pass</span></p>
            <p className="truncate text-[11px] font-medium text-white/60">Events Made Easier</p>
          </div>
        </div>

        {selectedEvent && (
          <div className="order-3 min-w-0 flex-1 basis-full text-center sm:order-none sm:basis-auto">
            {events.length > 1 ? (
              <select
                value={selectedEventId ?? ""}
                onChange={(event) => onEventChange(Number(event.target.value))}
                className="mx-auto max-w-full appearance-none bg-transparent text-center text-sm font-bold text-white focus-visible:outline-none sm:text-base"
                aria-label="Switch event"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id} className="text-slate-900">{event.title}</option>
                ))}
              </select>
            ) : (
              <p className="truncate text-sm font-bold sm:text-base">{selectedEvent.title}</p>
            )}
            <p className="mt-0.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-0.5 text-[11px] font-medium text-white/60 sm:text-xs">
              <span className="inline-flex items-center gap-1"><CheckInIcon name="calendar" className="h-3.5 w-3.5" />{formatEventDate(selectedEvent.event_date)}</span>
              {selectedEvent.venue && <span className="inline-flex items-center gap-1"><CheckInIcon name="pin" className="h-3.5 w-3.5" />{selectedEvent.venue}</span>}
            </p>
          </div>
        )}

        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setMenuOpen((value) => !value)}
            className="flex items-center gap-2 rounded-full py-1 pl-1 pr-2 transition hover:bg-white/10"
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-500 text-sm font-bold text-white">{profileLoading ? "…" : initial}</span>
            <span className="hidden text-left leading-tight sm:block">
              <span className="block max-w-32 truncate text-sm font-bold">{profileLoading ? "Loading…" : displayName}</span>
              <span className="block text-[11px] text-white/60">{roleLabel}</span>
            </span>
            <CheckInIcon name="chevronDown" className={`h-3.5 w-3.5 shrink-0 text-white/60 transition-transform ${menuOpen ? "rotate-180" : ""}`} />
          </button>

          {menuOpen && (
            <>
              <button type="button" aria-hidden="true" tabIndex={-1} onClick={() => setMenuOpen(false)} className="fixed inset-0 z-30 cursor-default" />
              <div role="menu" className="absolute right-0 top-full z-40 mt-2 w-48 overflow-hidden rounded-xl border border-white/10 bg-[#182430] py-1 shadow-xl">
                <div className="border-b border-white/10 px-3 py-2 sm:hidden">
                  <p className="truncate text-sm font-bold text-white">{profileLoading ? "Loading…" : displayName}</p>
                  <p className="text-[11px] text-white/60">{roleLabel}</p>
                </div>
                <button
                  type="button"
                  role="menuitem"
                  onClick={onLogout}
                  disabled={isLoggingOut}
                  className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm font-semibold text-red-300 transition hover:bg-white/5 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <CheckInIcon name="logout" className="h-4 w-4" />
                  {isLoggingOut ? "Logging out…" : "Log out"}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
