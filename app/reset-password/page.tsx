"use client";

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";

import Link from "next/link";

import {
  createClient,
} from "@/lib/supabase/client";

const MIN_PASSWORD_LENGTH = 8;

export default function ResetPasswordPage() {
  const supabase =
    useMemo(
      () => createClient(),
      []
    );

  const [
    newPassword,
    setNewPassword,
  ] =
    useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] =
    useState("");

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    isCheckingLink,
    setIsCheckingLink,
  ] =
    useState(true);

  const [
    isValidRecovery,
    setIsValidRecovery,
  ] =
    useState(false);

  const [
    isSaving,
    setIsSaving,
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

  useEffect(() => {
    let isMounted = true;

    async function prepareRecoverySession() {
      try {
        setIsCheckingLink(true);
        setErrorMessage("");

        const currentUrl =
          new URL(
            window.location.href
          );

        const recoveryCode =
          currentUrl
            .searchParams
            .get("code");

        if (recoveryCode) {
          const {
            error:
              exchangeError,
          } =
            await supabase
              .auth
              .exchangeCodeForSession(
                recoveryCode
              );

          if (exchangeError) {
            const {
              data: {
                session:
                  existingSession,
              },
            } =
              await supabase
                .auth
                .getSession();

            if (
              !existingSession
            ) {
              throw exchangeError;
            }
          }

          currentUrl
            .searchParams
            .delete("code");

          window.history
            .replaceState(
              {},
              document.title,
              `${currentUrl.pathname}${currentUrl.search}`
            );
        }

        const {
          data: {
            session,
          },
          error:
            sessionError,
        } =
          await supabase
            .auth
            .getSession();

        if (sessionError) {
          throw sessionError;
        }

        if (
          isMounted &&
          session
        ) {
          setIsValidRecovery(
            true
          );
        }
      } catch (error) {
        console.error(
          "Recovery session error:",
          error
        );

        if (isMounted) {
          setErrorMessage(
            "Reset link si sahihi au muda wake umeisha. Omba link mpya."
          );
        }
      } finally {
        if (isMounted) {
          setIsCheckingLink(
            false
          );
        }
      }
    }

    const {
      data: {
        subscription,
      },
    } =
      supabase.auth
        .onAuthStateChange(
          (
            event,
            session
          ) => {
            if (
              !isMounted
            ) {
              return;
            }

            if (
              event ===
                "PASSWORD_RECOVERY" ||
              (
                event ===
                  "SIGNED_IN" &&
                session
              )
            ) {
              setIsValidRecovery(
                true
              );

              setIsCheckingLink(
                false
              );

              setErrorMessage(
                ""
              );
            }
          }
        );

    prepareRecoverySession();

    return () => {
      isMounted = false;

      subscription
        .unsubscribe();
    };
  }, [supabase]);

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (
      isSaving ||
      !isValidRecovery
    ) {
      return;
    }

    setErrorMessage("");
    setSuccessMessage("");

    if (
      newPassword.length <
      MIN_PASSWORD_LENGTH
    ) {
      setErrorMessage(
        `Password lazima iwe na characters ${MIN_PASSWORD_LENGTH} au zaidi.`
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setErrorMessage(
        "Password mpya na confirmation hazifanani."
      );

      return;
    }

    try {
      setIsSaving(true);

      const {
        error,
      } =
        await supabase
          .auth
          .updateUser({
            password:
              newPassword,
          });

      if (error) {
        throw error;
      }

      setNewPassword("");
      setConfirmPassword("");

      setSuccessMessage(
        "Password mpya imehifadhiwa. Sasa unaweza kurudi Login."
      );

      setIsValidRecovery(
        false
      );

      await supabase
        .auth
        .signOut({
          scope: "local",
        });
    } catch (error) {
      console.error(
        "Reset password error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Password haikuweza kubadilishwa."
      );
    } finally {
      setIsSaving(false);
    }
  }

  if (isCheckingLink) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-emerald-50 to-teal-100 px-4">
        <div className="rounded-2xl bg-white p-8 text-center shadow-xl">
          <div className="mx-auto h-11 w-11 animate-spin rounded-full border-4 border-slate-200 border-t-emerald-700" />

          <p className="mt-4 font-semibold text-slate-600">
            Checking reset link...
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-emerald-50 to-teal-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-7 shadow-xl sm:p-10">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-2xl shadow-lg shadow-emerald-200">
            🔑
          </div>

          <h1 className="mt-5 text-3xl font-bold text-slate-900">
            Reset Password
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-500">
            Tengeneza password mpya ya
            Smart Event Pass account yako.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium leading-6 text-red-700"
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

        {isValidRecovery && (
          <form
            onSubmit={
              handleSubmit
            }
            className="mt-8 space-y-5"
          >
            <PasswordInput
              label="New Password"
              value={
                newPassword
              }
              placeholder="At least 8 characters"
              showPassword={
                showPassword
              }
              disabled={
                isSaving
              }
              onChange={
                setNewPassword
              }
              onToggleVisibility={() =>
                setShowPassword(
                  (
                    current
                  ) =>
                    !current
                )
              }
            />

            <PasswordInput
              label="Confirm New Password"
              value={
                confirmPassword
              }
              placeholder="Repeat new password"
              showPassword={
                showPassword
              }
              disabled={
                isSaving
              }
              onChange={
                setConfirmPassword
              }
              onToggleVisibility={() =>
                setShowPassword(
                  (
                    current
                  ) =>
                    !current
                )
              }
            />

            <button
              type="submit"
              disabled={
                isSaving
              }
              className="w-full rounded-xl bg-emerald-700 px-6 py-3 font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Saving Password..."
                : "Save New Password"}
            </button>
          </form>
        )}

        <div className="mt-6 text-center">
          <Link
            href="/login"
            className="text-sm font-semibold text-emerald-700 hover:text-emerald-800"
          >
            ← Back to Login
          </Link>
        </div>
      </div>
    </main>
  );
}

type PasswordInputProps = {
  label: string;
  value: string;
  placeholder: string;
  showPassword: boolean;
  disabled: boolean;
  onChange: (
    value: string
  ) => void;
  onToggleVisibility:
    () => void;
};

function PasswordInput({
  label,
  value,
  placeholder,
  showPassword,
  disabled,
  onChange,
  onToggleVisibility,
}: PasswordInputProps) {
  return (
    <div>
      <label className="mb-2 block text-sm font-semibold text-slate-700">
        {label}
      </label>

      <div className="relative">
        <input
          type={
            showPassword
              ? "text"
              : "password"
          }
          value={value}
          required
          minLength={
            MIN_PASSWORD_LENGTH
          }
          disabled={
            disabled
          }
          autoComplete="new-password"
          placeholder={
            placeholder
          }
          onChange={(
            event
          ) =>
            onChange(
              event.target.value
            )
          }
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-24 text-slate-900 outline-none placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 disabled:opacity-60"
        />

        <button
          type="button"
          disabled={
            disabled
          }
          onClick={
            onToggleVisibility
          }
          className="absolute inset-y-0 right-0 px-4 text-sm font-semibold text-emerald-700 hover:text-emerald-800 disabled:opacity-60"
        >
          {showPassword
            ? "Hide"
            : "Show"}
        </button>
      </div>
    </div>
  );
}