"use client";

import { FormEvent, useState } from "react";
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

  function handleChange(event: React.ChangeEvent<HTMLInputElement>) {
    setQrToken(event.target.value);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setIsChecking(true);
    setErrorMessage("");
    setResult(null);

    try {
      const verification = await checkInGuest(qrToken.trim());
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
  }

  return (
    <section className="mx-auto max-w-2xl">
      <div className="rounded-xl bg-white p-8 shadow-md">
        <h1 className="text-3xl font-bold text-gray-800">
          Guest Check-In
        </h1>

        <p className="mt-2 text-gray-500">
          Enter or scan the guest QR token.
        </p>

        <form onSubmit={handleSubmit} className="mt-8 space-y-6">
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
          </div>
        )}
      </div>
    </section>
  );
}