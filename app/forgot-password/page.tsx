"use client";

import {
  type FormEvent,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  createClient,
} from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const [
    email,
    setEmail,
  ] =
    useState("");

  const [
    isSending,
    setIsSending,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState("");

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isSending) {
      return;
    }

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    if (
      !normalizedEmail ||
      !normalizedEmail.includes(
        "@"
      )
    ) {
      setErrorMessage(
        "Weka email sahihi."
      );

      return;
    }

    try {
      setIsSending(true);
      setErrorMessage("");
      setSuccessMessage("");

      const redirectTo =
        `${window.location.origin}/reset-password`;

      const {
        error,
      } =
        await supabase
          .auth
          .resetPasswordForEmail(
            normalizedEmail,
            {
              redirectTo,
            }
          );

      if (error) {
        const normalizedError =
          error.message.toLowerCase();

        if (
          normalizedError.includes(
            "rate limit"
          ) ||
          normalizedError.includes(
            "too many"
          )
        ) {
          throw new Error(
            "Reset link imeombwa mara nyingi. Subiri kidogo kisha ujaribu tena."
          );
        }

        throw error;
      }

      setSuccessMessage(
        "Ikiwa email hiyo imesajiliwa, tumetuma password-reset link. Angalia Inbox na Spam."
      );

      setEmail("");
    } catch (error) {
      console.error(
        "Password reset request error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Reset link haikuweza kutumwa."
      );
    } finally {
      setIsSending(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-7 shadow-xl sm:p-10">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl shadow-lg shadow-blue-200">
            🔐
          </div>

          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            Forgot Password
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Weka email yako ili upokee link
            ya kutengeneza password mpya.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700"
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-medium leading-6 text-emerald-700"
          >
            {successMessage}
          </div>
        )}

        <form
          onSubmit={
            handleSubmit
          }
          className="mt-8 space-y-5"
        >
          <div>
            <label
              htmlFor="reset-email"
              className="mb-2 block text-sm font-semibold text-slate-700"
            >
              Email Address
            </label>

            <input
              id="reset-email"
              type="email"
              value={email}
              required
              disabled={
                isSending
              }
              autoComplete="email"
              placeholder="Enter your registered email"
              onChange={(event) => {
                setEmail(
                  event.target.value
                );

                setErrorMessage("");
                setSuccessMessage("");
              }}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
            />
          </div>

          <button
            type="submit"
            disabled={
              isSending
            }
            className="w-full rounded-xl bg-blue-600 px-6 py-3 font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSending
              ? "Sending Reset Link..."
              : "Send Reset Link"}
          </button>
        </form>

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm font-semibold text-blue-600 hover:text-blue-800"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}