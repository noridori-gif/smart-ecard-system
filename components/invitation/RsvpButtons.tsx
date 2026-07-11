"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type RsvpStatus = "accepted" | "maybe" | "declined";

type RsvpButtonsProps = {
  invitationToken: string;
  currentStatus: string;
  accentTextClass?: string;
};

type RsvpResponse = {
  success: boolean;
  message: string;
  rsvp_status: string | null;
};

export default function RsvpButtons({
  invitationToken,
  currentStatus,
  accentTextClass = "text-blue-700",
}: RsvpButtonsProps) {
  const [selectedStatus, setSelectedStatus] =
    useState(currentStatus);

  const [isUpdating, setIsUpdating] = useState(false);
  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  async function updateRsvp(status: RsvpStatus) {
    setIsUpdating(true);
    setMessage("");
    setIsSuccess(false);

    try {
      const { data, error } = await supabase.rpc(
        "update_public_rsvp",
        {
          token_input: invitationToken,
          rsvp_input: status,
        }
      );

      if (error) {
        throw new Error(error.message);
      }

      const response = data?.[0] as
        | RsvpResponse
        | undefined;

      if (!response || !response.success) {
        throw new Error(
          response?.message ?? "RSVP haikuweza kuhifadhiwa."
        );
      }

      setSelectedStatus(response.rsvp_status ?? status);
      setMessage(response.message);
      setIsSuccess(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "RSVP haikuweza kuhifadhiwa."
      );

      setIsSuccess(false);
    } finally {
      setIsUpdating(false);
    }
  }

  const options: {
    label: string;
    value: RsvpStatus;
    className: string;
  }[] = [
    {
      label: "Accept",
      value: "accepted",
      className:
        "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    },
    {
      label: "Maybe",
      value: "maybe",
      className:
        "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
    },
    {
      label: "Decline",
      value: "declined",
      className:
        "border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
    },
  ];

  return (
    <section className="mt-9">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
          Kindly Confirm Your Attendance
        </p>

        <h3
          className={`mt-3 text-2xl font-bold ${accentTextClass}`}
        >
          RSVP
        </h3>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {options.map((option) => {
            const isSelected =
              selectedStatus === option.value;

            return (
              <button
                key={option.value}
                type="button"
                disabled={isUpdating}
                onClick={() =>
                  updateRsvp(option.value)
                }
                className={`rounded-xl border px-4 py-3 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${option.className} ${
                  isSelected
                    ? "ring-2 ring-offset-2"
                    : ""
                }`}
              >
                {isUpdating && isSelected
                  ? "Saving..."
                  : option.label}
              </button>
            );
          })}
        </div>

        <p className="mt-5 text-sm text-slate-500">
          Current response:
        </p>

        <p
          className={`mt-1 text-lg font-bold capitalize ${accentTextClass}`}
        >
          {selectedStatus}
        </p>

        {message && (
          <div
            className={`mt-5 rounded-xl p-4 text-sm ${
              isSuccess
                ? "bg-emerald-50 text-emerald-700"
                : "bg-red-50 text-red-700"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </section>
  );
}