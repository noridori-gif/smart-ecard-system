"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Input from "@/components/Input";
import Button from "@/components/Button";
import {
  checkInGuest,
  type Guest,
} from "@/services/guestService";

type VerificationResult = {
  success: boolean;
  status: string;
  message: string;
  guest: Guest | null;
};

export default function CheckInPage() {
  const [qrToken, setQrToken] = useState("");
  const [isChecking, setIsChecking] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [scannerReady, setScannerReady] = useState(false);

  const scanLockedRef = useRef(false);

  const verifyToken = useCallback(async (token: string) => {
    const cleanedToken = token.trim();

    if (!cleanedToken || scanLockedRef.current) {
      return;
    }

    scanLockedRef.current = true;
    setIsChecking(true);
    setErrorMessage("");
    setResult(null);
    setQrToken(cleanedToken);

    try {
      const verification = await checkInGuest(cleanedToken);
      setResult(verification);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "QR verification failed.";

      setErrorMessage(message);
    } finally {
      setIsChecking(false);
    }
  }, []);

  useEffect(() => {
    let scanner:
      | import("html5-qrcode").Html5QrcodeScanner
      | null = null;

    let componentActive = true;

    async function startScanner() {
      try {
        const { Html5QrcodeScanner } = await import("html5-qrcode");

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
            void verifyToken(decodedText);
          },
          () => {
            // Scan errors are ignored while the camera is searching.
          }
        );

        setScannerReady(true);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Camera scanner could not start.";

        setErrorMessage(message);
      }
    }

    void startScanner();

    return () => {
      componentActive = false;

      if (scanner) {
        scanner.clear().catch(() => {
          // Ignore cleanup errors.
        });
      }
    };
  }, [verifyToken]);

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQrToken(event.target.value);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    scanLockedRef.current = false;
    await verifyToken(qrToken);
  }

  function handleNextGuest() {
    setQrToken("");
    setResult(null);
    setErrorMessage("");
    scanLockedRef.current = false;
  }

  return (
    <section className="mx-auto max-w-3xl">
      <div className="rounded-xl bg-white p-8 shadow-md">
        <h1 className="text-3xl font-bold text-gray-800">
          Guest Check-In
        </h1>

        <p className="mt-2 text-gray-500">
          Scan the guest QR Code using the camera.
        </p>

        <div className="mt-8 rounded-xl border border-gray-200 p-4">
          <div id="qr-reader" className="w-full" />

          {!scannerReady && !errorMessage && (
            <p className="mt-4 text-center text-gray-500">
              Starting camera...
            </p>
          )}
        </div>

        <div className="my-8 flex items-center gap-4">
          <div className="h-px flex-1 bg-gray-200" />
          <span className="text-sm text-gray-500">
            OR ENTER TOKEN MANUALLY
          </span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Input
            label="QR Token"
            name="qr_token"
            value={qrToken}
            placeholder="Paste QR token here"
            required
            onChange={handleChange}
          />

          <Button
            text={isChecking ? "Checking..." : "Verify Guest"}
            type="submit"
            disabled={isChecking}
          />
        </form>

        {errorMessage && (
          <div className="mt-6 rounded-lg bg-red-50 p-4 text-red-700">
            {errorMessage}
          </div>
        )}

        {result && (
          <div
            className={`mt-8 rounded-xl p-6 ${
              result.success
                ? "bg-green-50 text-green-800"
                : result.status === "already_checked_in"
                  ? "bg-yellow-50 text-yellow-800"
                  : "bg-red-50 text-red-800"
            }`}
          >
            <h2 className="text-2xl font-bold">
              {result.message}
            </h2>

            {result.guest && (
              <div className="mt-4 space-y-2">
                <p>
                  <strong>Name:</strong> {result.guest.full_name}
                </p>

                <p>
                  <strong>Category:</strong>{" "}
                  {result.guest.category || "Normal"}
                </p>

                <p>
                  <strong>Allowed Guests:</strong>{" "}
                  {result.guest.allowed_guests}
                </p>

                <p>
                  <strong>Status:</strong> {result.guest.status}
                </p>

                {result.guest.checked_in_at && (
                  <p>
                    <strong>Checked In At:</strong>{" "}
                    {new Date(
                      result.guest.checked_in_at
                    ).toLocaleString()}
                  </p>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleNextGuest}
              className="mt-6 rounded-lg bg-gray-800 px-5 py-3 font-semibold text-white hover:bg-gray-900"
            >
              Scan Next Guest
            </button>
          </div>
        )}
      </div>
    </section>
  );
}