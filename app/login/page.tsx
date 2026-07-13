"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useMemo,
  useState,
} from "react";

import { useRouter } from "next/navigation";

import Button from "@/components/Button";
import Input from "@/components/Input";
import { createClient } from "@/lib/supabase/client";

function getSafeRedirectPath() {
  if (typeof window === "undefined") {
    return "/dashboard";
  }

  const searchParams = new URLSearchParams(
    window.location.search
  );

  const redirectTo =
    searchParams.get("redirectTo");

  if (
    !redirectTo ||
    !redirectTo.startsWith("/") ||
    redirectTo.startsWith("//")
  ) {
    return "/dashboard";
  }

  return redirectTo;
}

function getLoginErrorMessage(
  message: string
) {
  const normalizedMessage =
    message.toLowerCase();

  if (
    normalizedMessage.includes(
      "invalid login credentials"
    )
  ) {
    return "Email au password si sahihi.";
  }

  if (
    normalizedMessage.includes(
      "email not confirmed"
    )
  ) {
    return "Email yako bado haijathibitishwa.";
  }

  if (
    normalizedMessage.includes(
      "too many requests"
    )
  ) {
    return "Umejaribu mara nyingi. Tafadhali subiri kidogo kisha ujaribu tena.";
  }

  return message;
}

export default function LoginPage() {
  const router = useRouter();

  const supabase = useMemo(
    () => createClient(),
    []
  );

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  const [
    isLoading,
    setIsLoading,
  ] = useState(false);

  function handleChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const { name, value } = event.target;

    setFormData((currentData) => ({
      ...currentData,
      [name]: value,
    }));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    const email = formData.email
      .trim()
      .toLowerCase();

    const password = formData.password;

    if (!email || !password) {
      setErrorMessage(
        "Weka email na password."
      );

      return;
    }

    try {
      setErrorMessage("");
      setIsLoading(true);

      const { error } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (error) {
        setErrorMessage(
          getLoginErrorMessage(error.message)
        );

        return;
      }

      const redirectPath =
        getSafeRedirectPath();

      router.replace(redirectPath);
      router.refresh();
    } catch (error) {
      console.error(
        "Login error:",
        error
      );

      setErrorMessage(
        "Login haikufanikiwa. Tafadhali jaribu tena."
      );
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-100 via-blue-50 to-indigo-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-7 shadow-xl sm:p-10">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-600 text-2xl font-bold text-white shadow-lg shadow-blue-200">
            S
          </div>

          <h1 className="mt-5 text-3xl font-bold text-blue-700">
            Smart Event Pass
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to manage your events
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="mt-8 space-y-5"
        >
          <Input
            label="Email"
            name="email"
            type="email"
            value={formData.email}
            placeholder="Enter your email"
            required
            onChange={handleChange}
          />

          <div>
            <Input
              label="Password"
              name="password"
              type={
                showPassword
                  ? "text"
                  : "password"
              }
              value={formData.password}
              placeholder="Enter your password"
              required
              onChange={handleChange}
            />

            <div className="mt-2 flex justify-end">
              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (currentValue) =>
                      !currentValue
                  )
                }
                className="text-sm font-semibold text-blue-600 transition hover:text-blue-800"
              >
                {showPassword
                  ? "Hide password"
                  : "Show password"}
              </button>
            </div>
          </div>

          {errorMessage && (
            <div
              role="alert"
              className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700"
            >
              {errorMessage}
            </div>
          )}

          <div
            className={
              isLoading
                ? "pointer-events-none opacity-60"
                : ""
            }
          >
            <Button
              text={
                isLoading
                  ? "Signing in..."
                  : "Login"
              }
              type="submit"
            />
          </div>
        </form>

        <p className="mt-7 text-center text-xs text-slate-400">
          Secure event management system
        </p>
      </div>
    </main>
  );
}