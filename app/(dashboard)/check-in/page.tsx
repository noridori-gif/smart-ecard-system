"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AttendanceCards, { type AttendanceMetrics } from "@/components/check-in/AttendanceCards";
import ManualEntryPanel from "@/components/check-in/ManualEntryPanel";
import ProgressCards from "@/components/check-in/ProgressCards";
import RecentCheckins from "@/components/check-in/RecentCheckins";
import ScannerPanel from "@/components/check-in/ScannerPanel";
import ValidationPanel from "@/components/check-in/ValidationPanel";
import { getEvents, type Event } from "@/services/eventService";
import {
  checkInGuest,
  checkInGuestByEventPassId,
  getGuestsByEvent,
  type CheckInResult,
  type Guest,
} from "@/services/guestService";
import { getInvitationsByEvent, type Invitation } from "@/services/invitationService";

type CheckInMethod = "qr" | "event_pass";

export default function CheckInPage() {
  const [eventPassId, setEventPassId] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [scannerReady, setScannerReady] = useState(false);
  const [checkInMethod, setCheckInMethod] = useState<CheckInMethod | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [duplicateAttempts, setDuplicateAttempts] = useState(0);
  const [rejectedPasses, setRejectedPasses] = useState(0);
  const scanLockedRef = useRef(false);

  useEffect(() => {
    let active = true;
    void getEvents().then((data) => {
      if (!active) return;
      setEvents(data);
      setSelectedEventId(data[0]?.id ?? null);
      if (!data.length) setDashboardLoading(false);
    }).catch((error) => {
      if (active) { setErrorMessage(error instanceof Error ? error.message : "Events could not be loaded."); setDashboardLoading(false); }
    });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (selectedEventId === null) return;
    let active = true;
    void Promise.all([getGuestsByEvent(selectedEventId), getInvitationsByEvent(selectedEventId)])
      .then(([guestData, invitationData]) => { if (active) { setGuests(guestData); setInvitations(invitationData); } })
      .catch((error) => { if (active) setErrorMessage(error instanceof Error ? error.message : "Attendance dashboard could not be loaded."); })
      .finally(() => { if (active) setDashboardLoading(false); });
    return () => { active = false; };
  }, [selectedEventId]);

  const applyVerification = useCallback((verification: CheckInResult) => {
    setResult(verification);
    if (verification.status === "already_checked_in") setDuplicateAttempts((value) => value + 1);
    if (verification.status === "invalid") setRejectedPasses((value) => value + 1);
    if (verification.status === "checked_in" && verification.guest) {
      setGuests((current) => verification.guest?.event_id === selectedEventId
        ? current.map((guest) => guest.id === verification.guest?.id ? verification.guest : guest)
        : current);
    }
  }, [selectedEventId]);

  const verifyQrToken = useCallback(async (token: string) => {
    const cleanedToken = token.trim();
    if (!cleanedToken || scanLockedRef.current) return;
    scanLockedRef.current = true;
    setIsChecking(true); setErrorMessage(""); setResult(null); setCheckInMethod("qr");
    try { applyVerification(await checkInGuest(cleanedToken)); }
    catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "QR verification failed.");
      setRejectedPasses((value) => value + 1);
      scanLockedRef.current = false;
    } finally { setIsChecking(false); }
  }, [applyVerification]);

  useEffect(() => {
    let scanner: import("html5-qrcode").Html5QrcodeScanner | null = null;
    let componentActive = true;
    async function startScanner() {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");
        if (!componentActive) return;
        scanner = new Html5QrcodeScanner("qr-reader", { fps: 10, qrbox: { width: 250, height: 250 }, rememberLastUsedCamera: true }, false);
        scanner.render((decodedText) => void verifyQrToken(decodedText), () => {});
        setScannerReady(true);
      } catch (error) {
        setErrorMessage(error instanceof Error ? error.message : "Camera scanner could not start.");
      }
    }
    void startScanner();
    return () => { componentActive = false; if (scanner) scanner.clear().catch(() => {}); };
  }, [verifyQrToken]);

  function normalizeEventPassId(value: string) {
    const cleanedValue = value.trim().toUpperCase().replace(/\s+/g, "");
    if (!cleanedValue) return "";
    if (cleanedValue.startsWith("SEP-")) return cleanedValue;
    if (cleanedValue.startsWith("SEP")) return `SEP-${cleanedValue.slice(3)}`;
    return `SEP-${cleanedValue}`;
  }

  async function handleManualCheckIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedPassId = normalizeEventPassId(eventPassId);
    if (!normalizedPassId) { setErrorMessage("Tafadhali ingiza Event Pass ID."); return; }
    setEventPassId(normalizedPassId);
    setIsChecking(true); setErrorMessage(""); setResult(null); setCheckInMethod("event_pass");
    scanLockedRef.current = true;
    try { applyVerification(await checkInGuestByEventPassId(normalizedPassId)); }
    catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Event Pass ID verification failed.");
      setRejectedPasses((value) => value + 1);
      scanLockedRef.current = false;
    } finally { setIsChecking(false); }
  }

  function handleNextGuest() {
    setEventPassId(""); setResult(null); setErrorMessage(""); setCheckInMethod(null); scanLockedRef.current = false;
  }

  const checkedGuests = useMemo(() => guests.filter((guest) => guest.status === "checked_in" || guest.checked_in_at), [guests]);
  const recentCheckins = useMemo(() => [...checkedGuests].sort((a, b) => new Date(b.checked_in_at ?? 0).getTime() - new Date(a.checked_in_at ?? 0).getTime()).slice(0, 10), [checkedGuests]);
  const metrics = useMemo<AttendanceMetrics>(() => {
    const invitedGuests = guests.reduce((sum, guest) => sum + guest.allowed_guests, 0);
    const checkedInGuests = checkedGuests.reduce((sum, guest) => sum + guest.allowed_guests, 0);
    return {
      invitations: invitations.length,
      invitedGuests,
      singlePasses: guests.filter((guest) => guest.allowed_guests === 1).length,
      doublePasses: guests.filter((guest) => guest.allowed_guests === 2).length,
      checkedInGuests,
      remainingGuests: Math.max(invitedGuests - checkedInGuests, 0),
    };
  }, [guests, invitations, checkedGuests]);
  const today = new Date().toDateString();
  const successfulToday = checkedGuests.filter((guest) => guest.checked_in_at && new Date(guest.checked_in_at).toDateString() === today).length;
  const singleChecked = checkedGuests.filter((guest) => guest.allowed_guests === 1).length;
  const doubleChecked = checkedGuests.filter((guest) => guest.allowed_guests === 2).length;
  const attendancePercentage = metrics.invitedGuests ? (metrics.checkedInGuests / metrics.invitedGuests) * 100 : 0;

  return <main className="mx-auto max-w-[1600px] space-y-8 pb-8">
    <header className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
      <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Attendance Operations</p><h1 className="sep-page-title mt-2">Guest Check-In</h1><p className="mt-2 max-w-2xl text-slate-600">Scan a guest QR code or verify an Event Pass ID while monitoring live attendance.</p></div>
      <label className="w-full text-sm font-semibold text-slate-700 lg:w-80">Event<select value={selectedEventId ?? ""} onChange={(event) => { setDashboardLoading(true); setSelectedEventId(Number(event.target.value)); handleNextGuest(); }} className="sep-control mt-1"><option value="" disabled>Select event</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label>
    </header>

    {dashboardLoading ? <div role="status" className="sep-card p-5 text-sm text-slate-600">Loading live attendance dashboard…</div> : <>
      <AttendanceCards metrics={metrics} />
      <ProgressCards total={{ current: metrics.checkedInGuests, maximum: metrics.invitedGuests }} single={{ current: singleChecked, maximum: metrics.singlePasses }} double={{ current: doubleChecked, maximum: metrics.doublePasses }} />
    </>}

    <section aria-labelledby="check-in-tools-title"><div className="mb-4"><h2 id="check-in-tools-title" className="sep-section-title">Check-In Tools</h2><p className="sep-secondary mt-1">Use the scanner for the fastest entry, with manual verification as a fallback.</p></div><div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1.85fr)_minmax(320px,1fr)]"><ScannerPanel scannerReady={scannerReady} checking={isChecking && checkInMethod === "qr"} /><ManualEntryPanel value={eventPassId} checking={isChecking && checkInMethod === "event_pass"} onChange={setEventPassId} onSubmit={handleManualCheckIn} /></div></section>

    <ValidationPanel result={result} errorMessage={errorMessage} checking={isChecking} onNext={handleNextGuest} />

    <section className="grid gap-5 xl:grid-cols-[minmax(0,1.5fr)_minmax(320px,1fr)]">
      <RecentCheckins guests={recentCheckins} />
      <aside className="sep-card p-4 sm:p-6" aria-labelledby="insights-title"><h2 id="insights-title" className="sep-card-title">Check-In Insights</h2><p className="sep-secondary mt-1">Event totals and validation activity for this session.</p><div className="mt-5 grid grid-cols-2 gap-3">{[["Duplicate Scan Attempts", duplicateAttempts], ["Rejected Passes", rejectedPasses], ["Successful Today", successfulToday], ["Attendance", `${attendancePercentage.toFixed(1)}%`]].map(([label, value]) => <div key={label} className="rounded-xl border border-[#e7e1d7] bg-stone-50 p-4"><p className="text-xs font-semibold leading-5 text-slate-500">{label}</p><p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p></div>)}</div></aside>
    </section>
  </main>;
}
