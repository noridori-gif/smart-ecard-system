"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import GuestImportPanel, { type GuestImportEventOption } from "@/components/guest-import/GuestImportPanel";
import CustomSmsOutreachPanel from "@/components/admin-sms/CustomSmsOutreachPanel";
import { supabase } from "@/lib/supabase";

type EventOption = { id: number; title: string; event_date: string };
type GuestOption = { id: number; full_name: string; phone: string | null };

export default function SmsOutreachPage() {
  const [events, setEvents] = useState<EventOption[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [guests, setGuests] = useState<GuestOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEvents = useCallback(async () => {
    const { data, error: loadError } = await supabase
      .from("events")
      .select("id, title, event_date")
      .is("archived_at", null)
      .order("event_date", { ascending: false });
    if (loadError) throw new Error(loadError.message);
    return (data ?? []) as EventOption[];
  }, []);

  const loadGuests = useCallback(async (eventId: number) => {
    const { data, error: loadError } = await supabase
      .from("guests")
      .select("id, full_name, phone")
      .eq("event_id", eventId)
      .order("full_name", { ascending: true });
    if (loadError) throw new Error(loadError.message);
    return (data ?? []) as GuestOption[];
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      void (async () => {
        try {
          setLoading(true);
          setError("");
          const rows = await loadEvents();
          setEvents(rows);
          if (rows.length) setSelectedEventId(rows[0].id);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Events could not be loaded.");
        } finally {
          setLoading(false);
        }
      })();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadEvents]);

  const refreshGuests = useCallback(async () => {
    if (!selectedEventId) return;
    try {
      setError("");
      setGuests(await loadGuests(selectedEventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Guests could not be loaded.");
    }
  }, [selectedEventId, loadGuests]);

  useEffect(() => {
    const timer = setTimeout(() => void refreshGuests(), 0);
    return () => clearTimeout(timer);
  }, [refreshGuests]);

  const selectedEvent = useMemo(() => events.find((event) => event.id === selectedEventId) ?? null, [events, selectedEventId]);
  const importEventOptions: GuestImportEventOption[] = useMemo(() => events.map((event) => ({ id: event.id, title: event.title })), [events]);

  if (loading) {
    return (
      <div className="flex min-h-[350px] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-700" />
          <p className="mt-4 text-sm text-slate-600">Loading events...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="sep-page-title">SMS Outreach</h1>
        <p className="mt-1 text-sm text-slate-600">Import guests, write a custom SMS, preview it per recipient, then send with explicit confirmation.</p>
      </div>

      {error && <p role="alert" className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">{error}</p>}

      <div className="rounded-2xl border border-[#e7e1d7] bg-white p-4 shadow-sm">
        <label className="text-sm font-semibold text-slate-700">
          Event
          <select
            value={selectedEventId ?? ""}
            onChange={(event) => setSelectedEventId(event.target.value ? Number(event.target.value) : null)}
            className="mt-1 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none transition focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
          >
            <option value="">Choose event</option>
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.title} ({event.event_date})
              </option>
            ))}
          </select>
        </label>
      </div>

      {selectedEvent && (
        <>
          <GuestImportPanel key={selectedEvent.id} events={importEventOptions} defaultEventId={selectedEvent.id} onImportCompleted={refreshGuests} />
          <CustomSmsOutreachPanel eventId={selectedEvent.id} eventTitle={selectedEvent.title} eventDate={selectedEvent.event_date} guests={guests} />
        </>
      )}

      {!selectedEvent && !events.length && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <h2 className="text-lg font-semibold text-slate-900">No events found</h2>
          <p className="mt-2 text-sm text-slate-600">Create an event first, then come back here to run SMS outreach.</p>
        </div>
      )}
    </div>
  );
}
