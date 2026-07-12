"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Language = "sw" | "en";

type RsvpStatus = "accepted" | "maybe" | "declined";

type RsvpButtonsProps = {
  invitationToken: string;
  currentStatus: string;
  language?: Language;
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
  language = "sw",
  accentTextClass = "text-blue-700",
}: RsvpButtonsProps) {
  const [selectedStatus, setSelectedStatus] =
    useState(currentStatus);

  const [isUpdating, setIsUpdating] =
    useState(false);

  const [message, setMessage] =
    useState("");

  const [isSuccess, setIsSuccess] =
    useState(false);

  const translations =
    language === "sw"
      ? {
          heading:
            "Tafadhali Thibitisha Ushiriki Wako",
          title: "RSVP",
          accept: "Nitahudhuria",
          maybe: "Sina Uhakika",
          decline: "Sitaweza Kuhudhuria",
          saving: "Inahifadhi...",
          currentResponse: "Jibu lako la sasa:",
          pending: "Bado Hujajibu",
          accepted: "Nitahudhuria",
          maybeStatus: "Sina Uhakika",
          declined: "Sitaweza Kuhudhuria",
          successMessage:
            "Jibu lako limehifadhiwa vizuri.",
          errorMessage:
            "Jibu lako halikuweza kuhifadhiwa.",
        }
      : {
          heading:
            "Kindly Confirm Your Attendance",
          title: "RSVP",
          accept: "Accept",
          maybe: "Maybe",
          decline: "Decline",
          saving: "Saving...",
          currentResponse: "Current response:",
          pending: "Pending",
          accepted: "Accepted",
          maybeStatus: "Maybe",
          declined: "Declined",
          successMessage:
            "Your RSVP has been updated successfully.",
          errorMessage:
            "Your RSVP could not be saved.",
        };

  function getStatusLabel(status: string) {
    switch (status) {
      case "accepted":
        return translations.accepted;

      case "maybe":
        return translations.maybeStatus;

      case "declined":
        return translations.declined;

      default:
        return translations.pending;
    }
  }

  async function updateRsvp(
    status: RsvpStatus
  ) {
    setIsUpdating(true);
    setMessage("");
    setIsSuccess(false);

    try {
      const { data, error } =
        await supabase.rpc(
          "update_public_rsvp",
          {
            token_input:
              invitationToken,
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
          language === "sw"
            ? translations.errorMessage
            : response?.message ??
                translations.errorMessage
        );
      }

      setSelectedStatus(
        response.rsvp_status ?? status
      );

      setMessage(
        translations.successMessage
      );

      setIsSuccess(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : translations.errorMessage
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
      label: translations.accept,
      value: "accepted",
      className:
        "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
    },
    {
      label: translations.maybe,
      value: "maybe",
      className:
        "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
    },
    {
      label: translations.decline,
      value: "declined",
      className:
        "border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
    },
  ];

  return (
    <section className="mt-9">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 text-center shadow-sm sm:p-8">
        <p className="text-xs font-bold uppercase tracking-[0.25em] text-slate-500">
          {translations.heading}
        </p>

        <h3
          className={`mt-3 text-3xl font-bold ${accentTextClass}`}
        >
          {translations.title}
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
                  updateRsvp(
                    option.value
                  )
                }
                className={`rounded-xl border px-4 py-4 text-sm font-bold transition disabled:cursor-not-allowed disabled:opacity-60 ${option.className} ${
                  isSelected
                    ? "ring-2 ring-offset-2"
                    : ""
                }`}
              >
                {isUpdating &&
                isSelected
                  ? translations.saving
                  : option.label}
              </button>
            );
          })}
        </div>

        <p className="mt-6 text-sm text-slate-500">
          {translations.currentResponse}
        </p>

        <p
          className={`mt-2 text-lg font-bold ${accentTextClass}`}
        >
          {getStatusLabel(
            selectedStatus
          )}
        </p>

        {message && (
          <div
            className={`mt-5 rounded-xl p-4 text-sm font-medium ${
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