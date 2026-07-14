"use client";

import { useState } from "react";

import { supabase } from "@/lib/supabase";

type Language = "sw" | "en";

type RsvpStatus =
  | "accepted"
  | "maybe"
  | "declined";

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
  const [
    selectedStatus,
    setSelectedStatus,
  ] = useState(currentStatus);

  const [
    isUpdating,
    setIsUpdating,
  ] = useState(false);

  const [message, setMessage] =
    useState("");

  const [isSuccess, setIsSuccess] =
    useState(false);

  const translations =
    language === "sw"
      ? {
          heading:
            "Thibitisha Ushiriki",
          title: "RSVP",
          accept: "Ndiyo",
          maybe: "Labda",
          decline: "Hapana",
          saving: "...",
          currentResponse:
            "Jibu lako",
          pending:
            "Bado hujajibu",
          accepted:
            "Utahudhuria",
          maybeStatus:
            "Huna uhakika",
          declined:
            "Hutahudhuria",
          successMessage:
            "Jibu limehifadhiwa.",
          errorMessage:
            "Jibu halikuweza kuhifadhiwa.",
        }
      : {
          heading:
            "Confirm Attendance",
          title: "RSVP",
          accept: "Yes",
          maybe: "Maybe",
          decline: "No",
          saving: "...",
          currentResponse:
            "Your response",
          pending:
            "Not answered",
          accepted:
            "Attending",
          maybeStatus:
            "Not sure",
          declined:
            "Not attending",
          successMessage:
            "Response saved.",
          errorMessage:
            "Response could not be saved.",
        };

  function getStatusLabel(
    status: string
  ) {
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
    if (isUpdating) {
      return;
    }

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
        throw new Error(
          error.message
        );
      }

      const response = data?.[0] as
        | RsvpResponse
        | undefined;

      if (
        !response ||
        !response.success
      ) {
        throw new Error(
          response?.message ||
            translations.errorMessage
        );
      }

      setSelectedStatus(
        response.rsvp_status ??
          status
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
    icon: string;
    value: RsvpStatus;
    className: string;
    selectedClassName: string;
  }[] = [
    {
      label:
        translations.accept,
      icon: "✓",
      value: "accepted",
      className:
        "border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
      selectedClassName:
        "ring-2 ring-emerald-500 ring-offset-1",
    },
    {
      label:
        translations.maybe,
      icon: "?",
      value: "maybe",
      className:
        "border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100",
      selectedClassName:
        "ring-2 ring-amber-500 ring-offset-1",
    },
    {
      label:
        translations.decline,
      icon: "×",
      value: "declined",
      className:
        "border-red-300 bg-red-50 text-red-700 hover:bg-red-100",
      selectedClassName:
        "ring-2 ring-red-500 ring-offset-1",
    },
  ];

  return (
    <section className="mt-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-500">
              {
                translations.heading
              }
            </p>

            <h3
              className={`mt-0.5 text-xl font-bold ${accentTextClass}`}
            >
              {translations.title}
            </h3>
          </div>

          <div className="text-2xl">
            ✉️
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {options.map(
            (option) => {
              const isSelected =
                selectedStatus ===
                option.value;

              return (
                <button
                  key={option.value}
                  type="button"
                  disabled={
                    isUpdating
                  }
                  onClick={() =>
                    updateRsvp(
                      option.value
                    )
                  }
                  className={`flex min-w-0 flex-col items-center justify-center rounded-xl border px-1 py-2.5 text-xs font-bold transition disabled:cursor-not-allowed disabled:opacity-60 sm:flex-row sm:gap-2 sm:text-sm ${option.className} ${
                    isSelected
                      ? option.selectedClassName
                      : ""
                  }`}
                >
                  <span className="text-base leading-none">
                    {option.icon}
                  </span>

                  <span className="mt-1 truncate sm:mt-0">
                    {isUpdating &&
                    isSelected
                      ? translations.saving
                      : option.label}
                  </span>
                </button>
              );
            }
          )}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2">
          <p className="text-xs text-slate-500">
            {
              translations.currentResponse
            }
          </p>

          <p
            className={`text-xs font-bold sm:text-sm ${accentTextClass}`}
          >
            {getStatusLabel(
              selectedStatus
            )}
          </p>
        </div>

        {message && (
          <div
            role="status"
            className={`mt-2 rounded-xl px-3 py-2 text-center text-xs font-semibold ${
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