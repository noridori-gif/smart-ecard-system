"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";

type Language = "sw" | "en";
type RsvpStatus = "accepted" | "maybe" | "declined";
type DisplayStatus = RsvpStatus | "pending";

type RsvpButtonsProps = {
  invitationToken: string;
  currentStatus: string;
  language?: Language;
  accentTextClass?: string;
  variant?: "default" | "classic" | "dark";
};

type RsvpResponse = {
  success: boolean;
  message: string;
  rsvp_status: string | null;
};

type RsvpOption = {
  label: string;
  statusLabel: string;
  icon: string;
  value: RsvpStatus;
  defaultClassName: string;
  selectedClassName: string;
};

function normalizeRsvpStatus(status: string): DisplayStatus {
  if (
    status === "accepted" ||
    status === "maybe" ||
    status === "declined"
  ) {
    return status;
  }

  return "pending";
}

export default function RsvpButtons({
  invitationToken,
  currentStatus,
  language = "sw",
  accentTextClass = "text-blue-700",
  variant = "default",
}: RsvpButtonsProps) {
  const [selectedStatus, setSelectedStatus] =
    useState<DisplayStatus>(
      normalizeRsvpStatus(currentStatus)
    );

  const [updatingStatus, setUpdatingStatus] =
    useState<RsvpStatus | null>(null);

  const [message, setMessage] = useState("");
  const [isSuccess, setIsSuccess] = useState(false);

  const isUpdating = updatingStatus !== null;

  const translations =
    language === "sw"
      ? {
          heading: "Thibitisha Ushiriki",
          title: "RSVP",
          accept: "Ndiyo",
          maybe: "Labda",
          decline: "Hapana",
          saving: "Inahifadhi...",
          currentResponse: "Jibu lako",
          pending: "Bado hujajibu",
          accepted: "Utahudhuria",
          maybeStatus: "Huna uhakika",
          declined: "Hutahudhuria",
          successMessage: "Jibu lako limehifadhiwa.",
          errorMessage: "Jibu halikuweza kuhifadhiwa.",
          instruction: "Tafadhali chagua jibu lako",
        }
      : {
          heading: "Confirm Attendance",
          title: "RSVP",
          accept: "Yes",
          maybe: "Maybe",
          decline: "No",
          saving: "Saving...",
          currentResponse: "Your response",
          pending: "Not answered",
          accepted: "Attending",
          maybeStatus: "Not sure",
          declined: "Not attending",
          successMessage: "Your response has been saved.",
          errorMessage: "Response could not be saved.",
          instruction: "Please select your response",
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

  async function updateRsvp(status: RsvpStatus) {
    if (isUpdating) {
      return;
    }

    setUpdatingStatus(status);
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
          response?.message || translations.errorMessage
        );
      }

      setSelectedStatus(
        normalizeRsvpStatus(
          response.rsvp_status ?? status
        )
      );

      setMessage(translations.successMessage);
      setIsSuccess(true);
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : translations.errorMessage
      );

      setIsSuccess(false);
    } finally {
      setUpdatingStatus(null);
    }
  }

  const options: RsvpOption[] = [
    {
      label: translations.accept,
      statusLabel: translations.accepted,
      icon: "✓",
      value: "accepted",
      defaultClassName:
        "bg-emerald-50 text-emerald-700 hover:bg-emerald-100",
      selectedClassName:
        "bg-emerald-600 text-white shadow-md",
    },
    {
      label: translations.maybe,
      statusLabel: translations.maybeStatus,
      icon: "?",
      value: "maybe",
      defaultClassName:
        "bg-amber-50 text-amber-700 hover:bg-amber-100",
      selectedClassName:
        "bg-amber-500 text-white shadow-md",
    },
    {
      label: translations.decline,
      statusLabel: translations.declined,
      icon: "×",
      value: "declined",
      defaultClassName:
        "bg-red-50 text-red-700 hover:bg-red-100",
      selectedClassName:
        "bg-red-600 text-white shadow-md",
    },
  ];

  const selectedOption = options.find(
    (option) => option.value === selectedStatus
  );

  /*
   * CLASSIC PHOTO NA ROYAL DARK
   */
  if (variant === "classic" || variant === "dark") {
    const isDark = variant === "dark";

    return (
      <section
        className={`mt-10 border-y py-10 ${
          isDark
            ? "border-white/15 bg-transparent"
            : "border-black/10"
        }`}
      >
        <div className="text-center">
          <p className="text-[10px] font-black uppercase tracking-[0.32em] text-[var(--theme-accent)]">
            {translations.title}
          </p>

          <h3
            className={`mt-3 font-serif text-3xl sm:text-4xl ${
              isDark ? "text-white" : "text-slate-950"
            }`}
          >
            {translations.heading}
          </h3>

          <p
            className={`mt-3 text-sm ${
              isDark ? "text-white/60" : "text-slate-500"
            }`}
          >
            {translations.instruction}
          </p>
        </div>

        <div className="mt-8 grid grid-cols-3 gap-2 sm:gap-4">
          {options.map((option) => {
            const isSelected =
              selectedStatus === option.value;

            const isThisUpdating =
              updatingStatus === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                aria-label={option.statusLabel}
                disabled={isUpdating}
                onClick={() => updateRsvp(option.value)}
                className={`min-w-0 border px-2 py-5 text-center transition duration-200 disabled:cursor-not-allowed disabled:opacity-60 sm:px-4 ${
                  isSelected
                    ? isDark
                      ? "border-[var(--theme-accent)] bg-[var(--theme-accent)] text-[#080b12]"
                      : "border-[var(--theme-primary)] bg-[var(--theme-primary)] text-white"
                    : isDark
                      ? "border-white/20 bg-white/[0.04] text-white hover:border-[var(--theme-accent)] hover:text-[var(--theme-accent)]"
                      : "border-black/15 bg-transparent text-slate-800 hover:border-[var(--theme-primary)] hover:text-[var(--theme-primary)]"
                }`}
              >
                <span className="block font-serif text-2xl leading-none sm:text-3xl">
                  {isThisUpdating ? "…" : option.icon}
                </span>

                <span className="mt-3 block truncate text-[10px] font-black uppercase tracking-[0.15em] sm:text-xs">
                  {isThisUpdating
                    ? translations.saving
                    : option.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mt-6 flex items-center justify-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[var(--theme-accent)]" />

          <p
            className={`text-xs ${
              isDark ? "text-white/60" : "text-slate-500"
            }`}
          >
            {translations.currentResponse}:

            <span
              className={`ml-1 font-bold ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              {selectedOption?.statusLabel ??
                getStatusLabel(selectedStatus)}
            </span>
          </p>
        </div>

        {message && (
          <p
            role="status"
            aria-live="polite"
            className={`mt-5 text-center text-xs font-semibold ${
              isSuccess
                ? "text-[var(--theme-accent)]"
                : "text-red-400"
            }`}
          >
            {message}
          </p>
        )}
      </section>
    );
  }

  /*
   * DEFAULT TEMPLATE
   */
  return (
    <section className="mt-4">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between gap-3 px-4 pb-3 pt-4">
          <div className="flex min-w-0 items-center gap-2">
            <h3
              className={`text-lg font-bold ${accentTextClass}`}
            >
              {translations.title}
            </h3>

            <span className="h-1 w-1 rounded-full bg-slate-300" />

            <p className="truncate text-[10px] font-bold uppercase tracking-[0.15em] text-slate-500">
              {translations.heading}
            </p>
          </div>

          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-50 text-lg">
            ✉️
          </div>
        </div>

        <div className="mx-4 grid grid-cols-3 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 p-1">
          {options.map((option) => {
            const isSelected =
              selectedStatus === option.value;

            const isThisUpdating =
              updatingStatus === option.value;

            return (
              <button
                key={option.value}
                type="button"
                aria-pressed={isSelected}
                aria-label={option.statusLabel}
                disabled={isUpdating}
                onClick={() => updateRsvp(option.value)}
                className={`flex min-w-0 items-center justify-center gap-1 rounded-lg px-1 py-2.5 text-xs font-bold transition disabled:opacity-60 sm:gap-2 sm:text-sm ${
                  isSelected
                    ? option.selectedClassName
                    : option.defaultClassName
                }`}
              >
                <span className="text-base leading-none">
                  {isThisUpdating ? "…" : option.icon}
                </span>

                <span className="truncate">
                  {isThisUpdating
                    ? translations.saving
                    : option.label}
                </span>
              </button>
            );
          })}
        </div>

        <div className="mx-4 mb-4 mt-3 flex items-center justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
          <div className="flex items-center gap-2">
            <span
              className={`h-2 w-2 rounded-full ${
                selectedStatus === "accepted"
                  ? "bg-emerald-500"
                  : selectedStatus === "maybe"
                    ? "bg-amber-500"
                    : selectedStatus === "declined"
                      ? "bg-red-500"
                      : "bg-slate-300"
              }`}
            />

            <p className="text-xs text-slate-500">
              {translations.currentResponse}
            </p>
          </div>

          <p
            className={`text-right text-xs font-bold sm:text-sm ${accentTextClass}`}
          >
            {selectedOption?.statusLabel ??
              getStatusLabel(selectedStatus)}
          </p>
        </div>

        {message && (
          <div
            role="status"
            aria-live="polite"
            className={`border-t px-4 py-2.5 text-center text-xs font-semibold ${
              isSuccess
                ? "border-emerald-100 bg-emerald-50 text-emerald-700"
                : "border-red-100 bg-red-50 text-red-700"
            }`}
          >
            {message}
          </div>
        )}
      </div>
    </section>
  );
}