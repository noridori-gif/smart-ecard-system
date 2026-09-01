"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import AttendanceCards, { type AttendanceMetrics } from "@/components/check-in/AttendanceCards";
import CardTypeBreakdown from "@/components/check-in/CardTypeBreakdown";
import ManualEntryPanel from "@/components/check-in/ManualEntryPanel";
import ProgressCards from "@/components/check-in/ProgressCards";
import RecentActivity, { passLabel, type ActivityEntry, type ActivityStatus } from "@/components/check-in/RecentActivity";
import ScannerPanel from "@/components/check-in/ScannerPanel";
import StatStrip from "@/components/check-in/StatStrip";
import CheckInIcon from "@/components/check-in/CheckInIcons";
import EventSelector from "@/components/dashboard/EventSelector";
import { getEvents, type Event } from "@/services/eventService";
import {
  checkInGuest,
  checkInGuestByEventPassId,
  getGuestsByEvent,
  type CheckInResult,
  type Guest,
} from "@/services/guestService";
import { getInvitationsByEvent, type Invitation } from "@/services/invitationService";
import { getPledgesForEvent, type FinancialPledge } from "@/services/financialSuiteService";
import { classifyContribution, getContributorGuestSettings, type ContributorGuestSettings } from "@/services/contributorGuestService";

type CheckInMethod = "qr" | "event_pass";
type SecondaryTab = "activity" | "stats";

function describeCameraError(error: unknown): string {
  const name = error instanceof DOMException ? error.name : "";
  switch (name) {
    case "NotAllowedError":
    case "PermissionDeniedError":
      return "Camera access was denied. Allow camera permission for this site, or use manual entry below.";
    case "NotFoundError":
    case "DevicesNotFoundError":
      return "No camera was found on this device. Use manual entry below.";
    case "NotReadableError":
    case "TrackStartError":
      return "The camera is already in use by another app or browser tab. Close it and try again, or use manual entry below.";
    case "OverconstrainedError":
      return "This device's camera does not support the required settings. Use manual entry below.";
    default:
      return "The camera could not be started. Use manual entry below.";
  }
}

export default function CheckInPage() {
  const [eventPassId, setEventPassId] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [pageError, setPageError] = useState("");
  const [scannerReady, setScannerReady] = useState(false);
  const [checkInMethod, setCheckInMethod] = useState<CheckInMethod | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<number | null>(null);
  const [guests, setGuests] = useState<Guest[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [pledges, setPledges] = useState<FinancialPledge[]>([]);
  const [guestEligibilitySettings, setGuestEligibilitySettings] = useState<ContributorGuestSettings | null>(null);
  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [duplicateAttempts, setDuplicateAttempts] = useState(0);
  const [rejectedPasses, setRejectedPasses] = useState(0);
  const [scanLog, setScanLog] = useState<ActivityEntry[]>([]);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [secondaryTab, setSecondaryTab] = useState<SecondaryTab>("activity");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannerRetryToken, setScannerRetryToken] = useState(0);
  const scanLockedRef = useRef(false);

  const loadEvents = useCallback(async () => {
    try {
      setPageError("");
      const data = await getEvents();
      setEvents(data);
      return data;
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Events could not be loaded.");
      return [];
    }
  }, []);

  const loadAttendance = useCallback(async (eventId: number) => {
    try {
      const [guestData, invitationData, pledgeData, settingsData] = await Promise.all([
        getGuestsByEvent(eventId),
        getInvitationsByEvent(eventId),
        getPledgesForEvent(eventId),
        getContributorGuestSettings(eventId),
      ]);
      setGuests(guestData);
      setInvitations(invitationData);
      setPledges(pledgeData);
      setGuestEligibilitySettings(settingsData);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : "Attendance dashboard could not be loaded.");
    }
  }, []);

  useEffect(() => {
    let active = true;
    void loadEvents().then((data) => {
      if (!active) return;
      setSelectedEventId(data[0]?.id ?? null);
      if (!data.length) setDashboardLoading(false);
    });
    return () => { active = false; };
  }, [loadEvents]);

  useEffect(() => {
    if (selectedEventId === null) return;
    let active = true;
    void loadAttendance(selectedEventId).finally(() => { if (active) setDashboardLoading(false); });
    return () => { active = false; };
  }, [selectedEventId, loadAttendance]);

  const pushScanLog = useCallback((entry: { status: Exclude<ActivityStatus, "checked_in">; guestName: string | null; passId: string | null; detail: string }) => {
    setScanLog((current) => [
      { ...entry, id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, occurredAt: new Date().toISOString() },
      ...current,
    ].slice(0, 25));
  }, []);

  const applyVerification = useCallback((verification: CheckInResult, method: CheckInMethod, rawInput?: string) => {
    setResult(verification);
    if (verification.status === "already_checked_in") {
      setDuplicateAttempts((value) => value + 1);
      pushScanLog({ status: "already_checked_in", guestName: verification.guest?.full_name ?? null, passId: verification.guest?.event_pass_id ?? rawInput ?? null, detail: verification.message });
    }
    if (verification.status === "invalid") {
      setRejectedPasses((value) => value + 1);
      pushScanLog({ status: "invalid", guestName: verification.guest?.full_name ?? null, passId: verification.guest?.event_pass_id ?? rawInput ?? null, detail: verification.message });
    }
    if ((verification.status === "checked_in" || verification.status === "partially_checked_in") && verification.guest) {
      setGuests((current) => verification.guest?.event_id === selectedEventId
        ? current.map((guest) => guest.id === verification.guest?.id ? verification.guest : guest)
        : current);
    }
  }, [selectedEventId, pushScanLog]);

  const verifyQrToken = useCallback(async (token: string) => {
    const cleanedToken = token.trim();
    if (!cleanedToken || scanLockedRef.current) return;
    scanLockedRef.current = true;
    setIsChecking(true); setErrorMessage(""); setResult(null); setCheckInMethod("qr");
    try { applyVerification(await checkInGuest(cleanedToken), "qr"); }
    catch (error) {
      const message = error instanceof Error ? error.message : "QR verification failed.";
      setErrorMessage(message);
      setRejectedPasses((value) => value + 1);
      pushScanLog({ status: "invalid", guestName: null, passId: null, detail: message });
      scanLockedRef.current = false;
    } finally { setIsChecking(false); }
  }, [applyVerification, pushScanLog]);

  const handleRetryCamera = useCallback(() => {
    setScannerRetryToken((value) => value + 1);
  }, []);

  useEffect(() => {
    let scanner: import("html5-qrcode").Html5QrcodeScanner | null = null;
    let preflightStream: MediaStream | null = null;
    let componentActive = true;

    async function startScanner() {
      setCameraError(null);
      setScannerReady(false);

      if (!navigator.mediaDevices?.getUserMedia) {
        if (componentActive) { setCameraError("This browser does not support camera scanning. Use manual entry below."); setShowManualEntry(true); }
        return;
      }

      // Pre-flight our own getUserMedia call so we control error messaging instead of
      // letting Html5QrcodeScanner's internal UI surface a raw technical error to staff.
      try {
        preflightStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      } catch (error) {
        if (componentActive) { setCameraError(describeCameraError(error)); setShowManualEntry(true); }
        return;
      } finally {
        preflightStream?.getTracks().forEach((track) => track.stop());
        preflightStream = null;
      }

      if (!componentActive) return;

      try {
        const { Html5QrcodeScanner, Html5QrcodeSupportedFormats } = await import("html5-qrcode");
        if (!componentActive) return;
        scanner = new Html5QrcodeScanner("qr-reader", {
          fps: 15,
          qrbox: { width: 250, height: 250 },
          rememberLastUsedCamera: true,
          // Guests' passes are always plain QR codes — skipping other barcode
          // formats keeps every decode attempt focused on that alone.
          formatsToSupport: [Html5QrcodeSupportedFormats.QR_CODE],
          // Prefer the browser's native (hardware-accelerated) barcode detector
          // where available — generally more robust against screen glare/contrast
          // than the pure-JS decoder, which matters when scanning a QR code off
          // another phone's screen rather than a printed code.
          experimentalFeatures: { useBarCodeDetectorIfSupported: true },
        }, false);
        scanner.render((decodedText) => void verifyQrToken(decodedText), () => {});
        setScannerReady(true);
      } catch (error) {
        setPageError(error instanceof Error ? error.message : "Camera scanner could not start.");
        setShowManualEntry(true);
      }
    }

    void startScanner();
    return () => {
      componentActive = false;
      preflightStream?.getTracks().forEach((track) => track.stop());
      if (scanner) scanner.clear().catch(() => {});
    };
  }, [verifyQrToken, scannerRetryToken]);

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
    try { applyVerification(await checkInGuestByEventPassId(normalizedPassId), "event_pass", normalizedPassId); }
    catch (error) {
      const message = error instanceof Error ? error.message : "Event Pass ID verification failed.";
      setErrorMessage(message);
      setRejectedPasses((value) => value + 1);
      pushScanLog({ status: "invalid", guestName: null, passId: normalizedPassId, detail: message });
      scanLockedRef.current = false;
    } finally { setIsChecking(false); }
  }

  function handleNextGuest() {
    setEventPassId(""); setResult(null); setErrorMessage(""); setCheckInMethod(null); scanLockedRef.current = false;
  }

  function handleEventChange(eventId: number) {
    setDashboardLoading(true);
    setSelectedEventId(eventId);
    handleNextGuest();
  }

  const handleRefresh = useCallback(async () => {
    setDashboardLoading(true);
    const data = await loadEvents();
    const eventId = selectedEventId ?? data[0]?.id ?? null;
    if (eventId !== null) await loadAttendance(eventId);
    setDashboardLoading(false);
  }, [loadEvents, loadAttendance, selectedEventId]);

  // A guest record with any check-in activity — includes both fully and partially
  // checked-in passes (checked_in_at is set on first arrival and stays set).
  const checkedGuests = useMemo(() => guests.filter((guest) => guest.status === "checked_in" || guest.status === "partially_checked_in" || guest.checked_in_at), [guests]);
  const recentCheckins = useMemo(() => [...checkedGuests].sort((a, b) => new Date(b.last_checked_in_at ?? b.checked_in_at ?? 0).getTime() - new Date(a.last_checked_in_at ?? a.checked_in_at ?? 0).getTime()).slice(0, 10), [checkedGuests]);

  // Card type (Single/Double) is sourced from the same Contributor Guest Eligibility
  // classification used in the Financial Suite Overview and Michango closing report,
  // not guessed from allowed_guests — falling back to allowed_guests only for guests
  // with no linked pledge (e.g. manually added guests outside the contributor sync).
  // Each bucket tracks pass/card count (for "how many passes were issued") separately
  // from capacity and checked-in headcount (for "how many people"), since a Double
  // pass can now be partially checked in — 1 of its 2 allowed guests present.
  const cardTypeStats = useMemo(() => {
    const classificationByGuestId = new Map<number, "single" | "double">();
    if (guestEligibilitySettings) {
      for (const pledge of pledges) {
        if (pledge.calculated_status === "cancelled" || pledge.guest_id === null) continue;
        const classification = classifyContribution(pledge, guestEligibilitySettings);
        if (classification === "single" || classification === "double") {
          classificationByGuestId.set(pledge.guest_id, classification);
        }
      }
    }
    const single = { passCount: 0, capacity: 0, checkedIn: 0 };
    const double = { passCount: 0, capacity: 0, checkedIn: 0 };
    for (const guest of guests) {
      const type = classificationByGuestId.get(guest.id)
        ?? (guest.allowed_guests === 1 ? "single" : guest.allowed_guests === 2 ? "double" : null);
      if (!type) continue;
      const bucket = type === "single" ? single : double;
      bucket.passCount += 1;
      bucket.capacity += guest.allowed_guests;
      bucket.checkedIn += guest.checked_in_count;
    }
    return { single, double };
  }, [guests, pledges, guestEligibilitySettings]);

  const metrics = useMemo<AttendanceMetrics>(() => {
    const invitedGuests = guests.reduce((sum, guest) => sum + guest.allowed_guests, 0);
    const checkedInGuests = guests.reduce((sum, guest) => sum + guest.checked_in_count, 0);
    return {
      invitations: invitations.length,
      invitedGuests,
      singlePasses: cardTypeStats.single.passCount,
      doublePasses: cardTypeStats.double.passCount,
      checkedInGuests,
      remainingGuests: Math.max(invitedGuests - checkedInGuests, 0),
    };
  }, [guests, invitations, cardTypeStats]);
  const today = new Date().toDateString();
  const successfulToday = checkedGuests.filter((guest) => guest.checked_in_at && new Date(guest.checked_in_at).toDateString() === today).length;

  // The top Event Overview strip is deliberately scoped to guests classified as
  // Single or Double (cardTypeStats), not the full guest list, so "Total Guests"
  // always reconciles exactly with the Single/Double cards shown right below it —
  // single.capacity + double.capacity, never a separately-computed record count.
  const classifiedTotalGuests = cardTypeStats.single.capacity + cardTypeStats.double.capacity;
  const classifiedCheckedIn = cardTypeStats.single.checkedIn + cardTypeStats.double.checkedIn;
  const classifiedRemaining = Math.max(classifiedTotalGuests - classifiedCheckedIn, 0);
  const classifiedAttendancePercentage = classifiedTotalGuests ? (classifiedCheckedIn / classifiedTotalGuests) * 100 : 0;

  const activityEntries = useMemo<ActivityEntry[]>(() => {
    const successEntries: ActivityEntry[] = recentCheckins.map((guest) => ({
      id: `guest-${guest.id}`,
      status: guest.status === "partially_checked_in" ? "partially_checked_in" : "checked_in",
      guestName: guest.full_name,
      passId: guest.event_pass_id,
      detail: guest.allowed_guests > 1 ? `${guest.checked_in_count} of ${guest.allowed_guests} checked in` : passLabel(guest.allowed_guests),
      occurredAt: guest.last_checked_in_at ?? guest.checked_in_at ?? new Date(0).toISOString(),
    }));
    return [...successEntries, ...scanLog]
      .sort((a, b) => new Date(b.occurredAt).getTime() - new Date(a.occurredAt).getTime())
      .slice(0, 15);
  }, [recentCheckins, scanLog]);

  return <main className="mx-auto max-w-[1600px] space-y-6 pb-8">
    <header className="flex flex-col gap-1">
      <p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-700">Attendance Operations</p>
      <h1 className="sep-page-title">Guest Check-In</h1>
      <p className="hidden text-sm text-slate-600 sm:block">Scan a guest QR code or verify an Event Pass ID.</p>
    </header>

    <EventSelector events={events} selectedEventId={selectedEventId} isLoading={dashboardLoading} onRefresh={handleRefresh} onChange={handleEventChange} />

    {pageError && (
      <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">{pageError}</div>
    )}

    {!dashboardLoading && events.length === 0 ? (
      <div className="sep-card p-6 text-center text-sm text-slate-600">No events found. Create an event first to start checking in guests.</div>
    ) : dashboardLoading ? (
      <div role="status" className="sep-card p-5 text-sm text-slate-600">Loading live attendance dashboard…</div>
    ) : (
      <>
        <StatStrip
          totalGuests={classifiedTotalGuests}
          checkedIn={classifiedCheckedIn}
          remaining={classifiedRemaining}
          attendancePercentage={classifiedAttendancePercentage}
        />

        <CardTypeBreakdown single={cardTypeStats.single} double={cardTypeStats.double} />

        <section aria-labelledby="check-in-tools-title">
          <div className="mb-4">
            <h2 id="check-in-tools-title" className="sep-section-title">Check-In Tools</h2>
            <p className="sep-secondary mt-1">Use the scanner for the fastest entry, with manual verification as a fallback.</p>
          </div>
          <div className="mx-auto flex w-full max-w-2xl min-w-0 flex-col gap-4">
            <ScannerPanel
              scannerReady={scannerReady}
              checking={isChecking}
              cameraError={cameraError}
              onRetry={handleRetryCamera}
              result={result}
              errorMessage={errorMessage}
              onNext={handleNextGuest}
            />

            <button
              type="button"
              onClick={() => setShowManualEntry((value) => !value)}
              aria-expanded={showManualEntry}
              aria-controls="manual-entry-panel"
              className="sep-card flex min-h-11 w-full items-center justify-between gap-3 p-4 text-left transition hover:bg-stone-50 sm:p-5"
            >
              <span className="flex items-center gap-3 text-sm font-semibold text-slate-700">
                <CheckInIcon name="pass" className="h-5 w-5 text-slate-500" />
                {showManualEntry ? "Hide manual entry" : "Trouble scanning? Enter the Event Pass ID manually"}
              </span>
              <svg viewBox="0 0 24 24" className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${showManualEntry ? "rotate-180" : ""}`} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </button>

            {showManualEntry && (
              <div id="manual-entry-panel">
                <ManualEntryPanel value={eventPassId} checking={isChecking && checkInMethod === "event_pass"} onChange={setEventPassId} onSubmit={handleManualCheckIn} />
              </div>
            )}
          </div>
        </section>

        <section aria-labelledby="secondary-title">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 id="secondary-title" className="sep-section-title">Event Overview</h2>
              <p className="sep-secondary mt-1">Detailed stats and scan activity for this event.</p>
            </div>
            <div className="inline-flex gap-1 rounded-2xl border border-[#e7e1d7] bg-white p-1.5 shadow-sm" role="tablist" aria-label="Event overview sections">
              <button type="button" role="tab" aria-selected={secondaryTab === "activity"} onClick={() => setSecondaryTab("activity")} className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${secondaryTab === "activity" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-stone-100"}`}>Recent Activity</button>
              <button type="button" role="tab" aria-selected={secondaryTab === "stats"} onClick={() => setSecondaryTab("stats")} className={`min-h-11 rounded-xl px-4 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-700 ${secondaryTab === "stats" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-stone-100"}`}>Live Statistics</button>
            </div>
          </div>

          {secondaryTab === "activity" ? (
            <div className="space-y-5">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {[["Duplicate Scan Attempts", duplicateAttempts], ["Rejected Passes", rejectedPasses], ["Successful Today", successfulToday]].map(([label, value]) => (
                  <div key={label} className="rounded-xl border border-[#e7e1d7] bg-stone-50 p-4">
                    <p className="text-xs font-semibold leading-5 text-slate-500">{label}</p>
                    <p className="mt-2 text-2xl font-bold tabular-nums text-slate-900">{value}</p>
                  </div>
                ))}
              </div>
              <RecentActivity entries={activityEntries} />
            </div>
          ) : (
            <div className="space-y-5">
              <AttendanceCards metrics={metrics} />
              <ProgressCards total={{ current: metrics.checkedInGuests, maximum: metrics.invitedGuests }} single={{ current: cardTypeStats.single.checkedIn, maximum: cardTypeStats.single.capacity }} double={{ current: cardTypeStats.double.checkedIn, maximum: cardTypeStats.double.capacity }} />
            </div>
          )}
        </section>
      </>
    )}
  </main>;
}
