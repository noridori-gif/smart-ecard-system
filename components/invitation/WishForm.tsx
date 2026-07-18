"use client";

import {
  type FormEvent,
  useMemo,
  useState,
} from "react";

import {
  createClient,
} from "@/lib/supabase/client";

type Language =
  | "sw"
  | "en";

type WishFormProps = {
  invitationToken: string;
  guestName: string;
  language?: Language;
};

const MAX_MESSAGE_LENGTH =
  500;

export default function WishForm({
  invitationToken,
  guestName,
  language = "sw",
}: WishFormProps) {
  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [
    message,
    setMessage,
  ] = useState("");

  const [
    isSubmitting,
    setIsSubmitting,
  ] = useState(false);

  const [
    isSubmitted,
    setIsSubmitted,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const translation =
    language === "sw"
      ? {
          eyebrow:
            "Salamu za Mgeni",

          title:
            "Acha ujumbe kwa wenye event",

          description:
            "Shiriki salamu, baraka au maneno mazuri kwa wenye event.",

          name: "Jina Lako",

          message:
            "Ujumbe Wako",

          placeholder:
            "Andika salamu zako hapa...",

          send:
            "Tuma Salamu",

          sending:
            "Inatuma...",

          successTitle:
            "Salamu zimepokelewa",

          successMessage:
            "Ujumbe wako umehifadhiwa vizuri.",

          edit:
            "Badilisha Salamu",

          required:
            "Andika ujumbe wenye characters 2 au zaidi.",

          failed:
            "Salamu hazikuweza kutumwa. Tafadhali jaribu tena.",
        }
      : {
          eyebrow:
            "Guest Wishes",

          title:
            "Leave a message for the hosts",

          description:
            "Share your wishes and kind words with the event hosts.",

          name: "Your Name",

          message:
            "Your Message",

          placeholder:
            "Write your message here...",

          send:
            "Send Wishes",

          sending:
            "Sending...",

          successTitle:
            "Wishes received",

          successMessage:
            "Your message has been saved successfully.",

          edit:
            "Edit Wishes",

          required:
            "Enter a message containing at least 2 characters.",

          failed:
            "Your message could not be sent. Please try again.",
        };

  const remainingCharacters =
    MAX_MESSAGE_LENGTH -
    message.length;

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const normalizedMessage =
      message.trim();

    if (
      normalizedMessage.length < 2
    ) {
      setErrorMessage(
        translation.required
      );

      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMessage("");

      const {
        error,
      } = await supabase.rpc(
        "submit_event_wish",
        {
          token_input:
            invitationToken,

          message_input:
            normalizedMessage,
        }
      );

      if (error) {
        throw error;
      }

      setMessage(
        normalizedMessage
      );

      setIsSubmitted(true);
    } catch (error) {
      console.error(
        "Submit event wish error:",
        error
      );

      setErrorMessage(
        error instanceof Error &&
          error.message
        ? error.message
        : translation.failed
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <section className="rounded-[2rem] border border-[var(--theme-accent)] bg-white/75 px-6 py-10 text-center shadow-[0_18px_45px_rgba(30,41,59,0.08)] sm:px-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-[var(--theme-accent)] bg-[var(--theme-secondary)] text-3xl text-[var(--theme-accent)]">
          ♡
        </div>

        <p className="mt-6 text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--theme-accent)]">
          {translation.eyebrow}
        </p>

        <h3 className="mt-3 font-serif text-3xl text-[var(--theme-primary)]">
          {
            translation
              .successTitle
          }
        </h3>

        <p className="mt-3 text-sm leading-6 text-slate-500">
          {
            translation
              .successMessage
          }
        </p>

        <button
          type="button"
          onClick={() => {
            setIsSubmitted(
              false
            );

            setErrorMessage(
              ""
            );
          }}
          className="mt-6 rounded-full border border-[var(--theme-primary)] px-6 py-3 text-xs font-bold uppercase tracking-[0.15em] text-[var(--theme-primary)] transition hover:bg-[var(--theme-primary)] hover:text-white"
        >
          {translation.edit}
        </button>
      </section>
    );
  }

  return (
    <section className="overflow-hidden rounded-[2rem] bg-[var(--theme-primary)] p-1 shadow-[0_22px_55px_rgba(15,23,42,0.18)]">
      <div className="rounded-[1.8rem] bg-[var(--theme-secondary)] px-5 py-8 sm:px-8 sm:py-10">
        <div className="text-center">
          <p className="text-[10px] font-bold uppercase tracking-[0.3em] text-[var(--theme-accent)]">
            {translation.eyebrow}
          </p>

          <h3 className="mt-3 font-serif text-3xl leading-tight text-[var(--theme-primary)]">
            {translation.title}
          </h3>

          <p className="mx-auto mt-3 max-w-sm text-sm leading-6 text-slate-500">
            {
              translation
                .description
            }
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-7"
        >
          <div>
            <label className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--theme-accent)]">
              {translation.name}
            </label>

            <div className="mt-2 rounded-xl border border-[var(--theme-accent)]/40 bg-white px-4 py-3 font-serif text-lg text-[var(--theme-primary)]">
              {guestName}
            </div>
          </div>

          <div className="mt-5">
            <div className="flex items-center justify-between gap-3">
              <label
                htmlFor="event-wish-message"
                className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--theme-accent)]"
              >
                {
                  translation
                    .message
                }
              </label>

              <span
                className={`text-xs font-semibold ${
                  remainingCharacters <
                  50
                    ? "text-amber-600"
                    : "text-slate-400"
                }`}
              >
                {
                  remainingCharacters
                }
              </span>
            </div>

            <textarea
              id="event-wish-message"
              value={message}
              rows={6}
              maxLength={
                MAX_MESSAGE_LENGTH
              }
              disabled={
                isSubmitting
              }
              placeholder={
                translation
                  .placeholder
              }
              onChange={(event) => {
                setMessage(
                  event.target.value
                );

                setErrorMessage(
                  ""
                );
              }}
              className="mt-2 w-full resize-y rounded-xl border border-[var(--theme-accent)]/40 bg-white px-4 py-3 text-base leading-7 text-slate-800 outline-none placeholder:text-slate-400 focus:border-[var(--theme-accent)] focus:ring-2 focus:ring-[var(--theme-accent)]/20 disabled:opacity-60"
            />
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
            >
              {errorMessage}
            </div>
          )}

          <button
            type="submit"
            disabled={
              isSubmitting
            }
            className="mt-5 w-full rounded-full bg-[var(--theme-primary)] px-6 py-4 text-sm font-bold uppercase tracking-[0.15em] text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting
              ? translation.sending
              : translation.send}
          </button>
        </form>
      </div>
    </section>
  );
}