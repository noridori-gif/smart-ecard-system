"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  checkInGuest,
  checkInGuestByEventPassId,
  type CheckInResult,
} from "@/services/guestService";

type CheckInMethod = "qr" | "event_pass";

export default function CheckInPage() {
  const [eventPassId, setEventPassId] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] =
    useState<CheckInResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [scannerReady, setScannerReady] = useState(false);
  const [checkInMethod, setCheckInMethod] =
    useState<CheckInMethod | null>(null);

  const scanLockedRef = useRef(false);

  const verifyQrToken = useCallback(
    async (token: string) => {
      const cleanedToken = token.trim();

      if (!cleanedToken || scanLockedRef.current) {
        return;
      }

      scanLockedRef.current = true;
      setIsChecking(true);
      setErrorMessage("");
      setResult(null);
      setCheckInMethod("qr");

      try {
        const verification =
          await checkInGuest(cleanedToken);

        setResult(verification);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "QR verification failed."
        );

        scanLockedRef.current = false;
      } finally {
        setIsChecking(false);
      }
    },
    []
  );

  useEffect(() => {
    let scanner:
      | import("html5-qrcode").Html5QrcodeScanner
      | null = null;

    let componentActive = true;

    async function startScanner() {
      try {
        const { Html5QrcodeScanner } =
          await import("html5-qrcode");

        if (!componentActive) {
          return;
        }

        scanner = new Html5QrcodeScanner(
          "qr-reader",
          {
            fps: 10,
            qrbox: {
              width: 250,
              height: 250,
            },
            rememberLastUsedCamera: true,
          },
          false
        );

        scanner.render(
          (decodedText) => {
            void verifyQrToken(decodedText);
          },
          () => {
            // Errors za kawaida wakati camera
            // inatafuta QR zinaachwa kimya.
          }
        );

        setScannerReady(true);
      } catch (error) {
        setErrorMessage(
          error instanceof Error
            ? error.message
            : "Camera scanner could not start."
        );
      }
    }

    void startScanner();

    return () => {
      componentActive = false;

      if (scanner) {
        scanner.clear().catch(() => {
          // Cleanup errors zinaachwa kimya.
        });
      }
    };
  }, [verifyQrToken]);

  function normalizeEventPassId(value: string) {
    const cleanedValue = value
      .trim()
      .toUpperCase()
      .replace(/\s+/g, "");

    if (!cleanedValue) {
      return "";
    }

    if (cleanedValue.startsWith("SEP-")) {
      return cleanedValue;
    }

    if (cleanedValue.startsWith("SEP")) {
      return `SEP-${cleanedValue.slice(3)}`;
    }

    return `SEP-${cleanedValue}`;
  }

  function handleEventPassChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    setEventPassId(
      event.target.value.toUpperCase()
    );
  }

  async function handleManualCheckIn(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    const normalizedPassId =
      normalizeEventPassId(eventPassId);

    if (!normalizedPassId) {
      setErrorMessage(
        "Tafadhali ingiza Event Pass ID."
      );
      return;
    }

    setEventPassId(normalizedPassId);
    setIsChecking(true);
    setErrorMessage("");
    setResult(null);
    setCheckInMethod("event_pass");

    scanLockedRef.current = true;

    try {
      const verification =
        await checkInGuestByEventPassId(
          normalizedPassId
        );

      setResult(verification);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Event Pass ID verification failed."
      );

      scanLockedRef.current = false;
    } finally {
      setIsChecking(false);
    }
  }

  function handleNextGuest() {
    setEventPassId("");
    setResult(null);
    setErrorMessage("");
    setCheckInMethod(null);
    scanLockedRef.current = false;
  }

  function formatCheckInTime(
    checkedInAt: string | null
  ) {
    if (!checkedInAt) {
      return "-";
    }

    return new Intl.DateTimeFormat("en-TZ", {
      dateStyle: "medium",
      timeStyle: "medium",
    }).format(new Date(checkedInAt));
  }

  const isSuccessful =
    result?.status === "checked_in";

  const isAlreadyCheckedIn =
    result?.status === "already_checked_in";

  return (
    <section className="mx-auto max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold text-slate-900 sm:text-4xl">
          Guest Check-In
        </h1>

        <p className="mt-2 text-slate-500">
          Scan QR Code au ingiza Event Pass ID ya
          mgeni.
        </p>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl bg-white p-5 shadow-md sm:p-7">
          <div className="text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-emerald-50 text-emerald-700">
              <CheckInIcon name="camera" />
            </div>

            <h2 className="mt-3 text-2xl font-bold text-slate-900">
              Scan QR Code
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Elekeza camera kwenye QR Code ya
              mgeni.
            </p>
          </div>

          <div className="mt-6 overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div
              id="qr-reader"
              className="w-full"
            />

            {!scannerReady &&
              !errorMessage && (
                <p className="p-5 text-center text-slate-500">
                  Starting camera...
                </p>
              )}
          </div>
        </section>

        <section className="rounded-2xl bg-white p-5 shadow-md sm:p-7">
          <div className="text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-xl bg-blue-50 text-blue-700">
              <CheckInIcon name="pass" />
            </div>

            <h2 className="mt-3 text-2xl font-bold text-slate-900">
              Enter Event Pass ID
            </h2>

            <p className="mt-2 text-sm leading-6 text-slate-500">
              Tumia njia hii kwa mgeni mwenye SMS
              au asiye na smartphone.
            </p>
          </div>

          <form
            onSubmit={handleManualCheckIn}
            className="mt-7"
          >
            <label
              htmlFor="eventPassId"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Event Pass ID
            </label>

            <input
              id="eventPassId"
              name="eventPassId"
              type="text"
              value={eventPassId}
              disabled={isChecking}
              onChange={handleEventPassChange}
              placeholder="SEP-4UGK46"
              autoComplete="off"
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-4 font-mono text-lg font-bold uppercase tracking-wider text-slate-900 outline-none transition placeholder:font-sans placeholder:font-normal placeholder:tracking-normal focus:border-blue-500 focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100"
            />

            <p className="mt-2 text-xs text-slate-500">
              Unaweza kuandika `SEP-4UGK46` au
              `4UGK46`.
            </p>

            <button
              type="submit"
              disabled={isChecking}
              className="mt-6 w-full rounded-xl bg-blue-700 px-5 py-4 font-bold text-white transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-blue-300"
            >
              {isChecking &&
              checkInMethod === "event_pass"
                ? "Checking..."
                : "Verify and Check In"}
            </button>
          </form>

          <div className="mt-6 rounded-xl bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-800">
              Event Pass ID Example
            </p>

            <p className="mt-2 font-mono text-xl font-bold tracking-wider text-blue-700">
              SEP-4UGK46
            </p>
          </div>
        </section>
      </div>

      {isChecking &&
        checkInMethod === "qr" && (
          <div className="mt-6 rounded-2xl bg-blue-50 p-5 text-center text-blue-700">
            Verifying QR Code...
          </div>
        )}

      {errorMessage && (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700">
          <p className="font-bold">
            Verification Error
          </p>

          <p className="mt-1 text-sm">
            {errorMessage}
          </p>
        </div>
      )}

      {result && (
        <section
          className={`mt-8 overflow-hidden rounded-3xl border shadow-lg ${
            isSuccessful
              ? "border-emerald-200 bg-emerald-50"
              : isAlreadyCheckedIn
                ? "border-amber-200 bg-amber-50"
                : "border-red-200 bg-red-50"
          }`}
        >
          <div
            className={`px-6 py-8 text-center text-white ${
              isSuccessful
                ? "bg-emerald-600"
                : isAlreadyCheckedIn
                  ? "bg-amber-500"
                  : "bg-red-600"
            }`}
          >
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/15">
              <CheckInIcon
                name={
                  isSuccessful
                    ? "success"
                    : isAlreadyCheckedIn
                      ? "warning"
                      : "error"
                }
                className="h-9 w-9"
              />
            </div>

            <h2 className="mt-4 text-3xl font-bold">
              {isSuccessful
                ? "CHECK-IN SUCCESSFUL"
                : isAlreadyCheckedIn
                  ? "ALREADY CHECKED IN"
                  : "INVALID EVENT PASS"}
            </h2>

            <p className="mt-2 text-white/90">
              {result.message}
            </p>
          </div>

          {result.guest ? (
            <div className="bg-white p-6 sm:p-8">
              <div className="text-center">
                <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
                  Welcome
                </p>

                <h3 className="mt-3 text-3xl font-bold text-slate-900 sm:text-4xl">
                  {result.guest.full_name}
                </h3>
              </div>

              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Event Pass ID
                  </p>

                  <p className="mt-2 font-mono text-xl font-bold tracking-wider text-blue-700">
                    {result.guest.event_pass_id ??
                      "Not available"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Category
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {result.guest.category ||
                      "Normal"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Guests Allowed
                  </p>

                  <p className="mt-2 text-xl font-bold text-slate-900">
                    {
                      result.guest
                        .allowed_guests
                    }{" "}
                    {result.guest
                      .allowed_guests === 1
                      ? "Guest"
                      : "Guests"}
                  </p>
                </div>

                <div className="rounded-2xl bg-slate-50 p-5">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </p>

                  <p
                    className={`mt-2 text-xl font-bold ${
                      result.guest.status ===
                      "checked_in"
                        ? "text-emerald-700"
                        : "text-amber-700"
                    }`}
                  >
                    {result.guest.status ===
                    "checked_in"
                      ? "Checked In"
                      : result.guest.status}
                  </p>
                </div>

                {result.guest
                  .checked_in_at && (
                  <div className="rounded-2xl bg-slate-50 p-5 sm:col-span-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                      Checked In At
                    </p>

                    <p className="mt-2 text-lg font-bold text-slate-900">
                      {formatCheckInTime(
                        result.guest
                          .checked_in_at
                      )}
                    </p>
                  </div>
                )}
              </div>

              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={handleNextGuest}
                  className="w-full rounded-xl bg-slate-900 px-6 py-4 font-bold text-white transition hover:bg-slate-800 sm:w-auto"
                >
                  Check In Next Guest
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-white p-6 text-center sm:p-8">
              <p className="text-slate-600">
                QR Code au Event Pass ID
                haijatambuliwa.
              </p>

              <button
                type="button"
                onClick={handleNextGuest}
                className="mt-6 rounded-xl bg-slate-900 px-6 py-3 font-bold text-white hover:bg-slate-800"
              >
                Try Again
              </button>
            </div>
          )}
        </section>
      )}
    </section>
  );
}

function CheckInIcon({
  name,
  className = "h-7 w-7",
}: {
  name: "camera" | "pass" | "success" | "warning" | "error";
  className?: string;
}) {
  const paths = {
    camera: <><path d="M4 7h4l2-2h4l2 2h4v12H4z" /><circle cx="12" cy="13" r="4" /></>,
    pass: <><path d="M4 6h16v12H4z" /><path d="M8 10h8M8 14h5" /></>,
    success: <><circle cx="12" cy="12" r="9" /><path d="m8 12 3 3 5-6" /></>,
    warning: <><path d="M12 3 2.5 20h19z" /><path d="M12 9v5M12 17h.01" /></>,
    error: <><circle cx="12" cy="12" r="9" /><path d="m8 8 8 8M16 8l-8 8" /></>,
  };
  return <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
