"use client";

import {
  type ChangeEvent,
  type FormEvent,
  useState,
} from "react";

import Link from "next/link";

import {
  useRouter,
} from "next/navigation";

import Button from "@/components/ui/Button";
import QrVisual from "@/components/ui/QrVisual";

const valueProps = [
  { icon: "💌", label: "Personalized digital invitations" },
  { icon: "📱", label: "Secure QR check-in at the door" },
  { icon: "💳", label: "Contributions, expenses & reports" },
];


function getSafeRedirectPath() {
  if (
    typeof window ===
    "undefined"
  ) {
    return "/dashboard";
  }

  const searchParams =
    new URLSearchParams(
      window.location.search
    );

  const redirectTo =
    searchParams.get(
      "redirectTo"
    );

  if (
    !redirectTo ||
    !redirectTo.startsWith(
      "/"
    ) ||
    redirectTo.startsWith(
      "//"
    )
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
  const router =
    useRouter();

  const [
    formData,
    setFormData,
  ] =
    useState({
      identity: "",
      password: "",
    });

  const [
    showPassword,
    setShowPassword,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState("");

  const [
    isLoading,
    setIsLoading,
  ] =
    useState(false);

  function handleChange(
    event:
      ChangeEvent<HTMLInputElement>
  ) {
    const {
      name,
      value,
    } =
      event.target;

    setFormData(
      (currentData) => ({
        ...currentData,
        [name]: value,
      })
    );

    setErrorMessage("");
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (isLoading) {
      return;
    }

    const identity=formData.identity.trim();
    const password =
      formData.password;

    if (
      !identity ||
      !password
    ) {
      setErrorMessage(
        "Weka email au namba halali ya simu pamoja na password."
      );

      return;
    }

    try {
      setErrorMessage("");
      setIsLoading(true);

      const response=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify({identity,password})});
      const result=await response.json() as {success?:boolean;mustChangePassword?:boolean;redirectTo?:string;error?:string};
      if(!response.ok||!result.success){setErrorMessage(getLoginErrorMessage(result.error??"Taarifa za kuingia si sahihi."));return;}
      const requestedPath=getSafeRedirectPath();
      const redirectPath=result.mustChangePassword?"/change-password":requestedPath!=="/dashboard"?requestedPath:result.redirectTo??"/dashboard";

      router.replace(
        redirectPath
      );

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
    <main className="flex min-h-screen flex-col lg:flex-row">
      <div className="flex flex-1 items-center justify-center bg-gradient-to-br from-slate-100 via-emerald-50 to-teal-100 px-4 py-10">
      <div className="w-full max-w-md rounded-2xl border border-white/70 bg-white p-7 shadow-xl sm:p-10">
        <div className="text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-700 text-2xl font-bold text-white shadow-lg shadow-emerald-200">
            S
          </div>

          <h1 className="mt-5 text-3xl font-bold text-emerald-700">
            Smart Event Pass
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            Sign in to manage your events
          </p>
        </div>

        <form
          onSubmit={
            handleSubmit
          }
          className="mt-8 space-y-5"
        >
          <div className="space-y-2">
            <label htmlFor="identity" className="sep-label block">Username, phone or email</label>
            <input
              id="identity"
              name="identity"
              type="text"
              value={formData.identity}
              placeholder="elia, 0715631284 or elia@example.com"
              required
              onChange={handleChange}
              className="sep-control"
            />
          </div>

          <div>
            <div className="space-y-2">
              <label htmlFor="password" className="sep-label block">Password</label>
              <input
                id="password"
                name="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                placeholder="Enter your password"
                required
                onChange={handleChange}
                className="sep-control"
              />
            </div>

            <div className="mt-3 flex items-center justify-between gap-4">
              <Link
                href="/forgot-password"
                className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
              >
                Forgot Password?
              </Link>

              <button
                type="button"
                onClick={() =>
                  setShowPassword(
                    (
                      currentValue
                    ) =>
                      !currentValue
                  )
                }
                className="text-sm font-semibold text-emerald-700 transition hover:text-emerald-800"
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

          <Button type="submit" loading={isLoading} className="w-full">
            {isLoading ? "Signing in..." : "Login"}
          </Button>
        </form>

        <p className="mt-7 text-center text-xs text-slate-400">
          Secure event management system
        </p>
      </div>
      </div>

      <div className="relative hidden overflow-hidden bg-gradient-to-br from-emerald-950 via-slate-950 to-teal-950 px-10 py-12 text-white lg:flex lg:w-[42%] lg:flex-col lg:justify-center xl:w-[38%]">
        <div className="absolute -left-16 top-16 h-64 w-64 rounded-full bg-emerald-500/20 blur-3xl" aria-hidden="true" />
        <div className="absolute -right-10 bottom-10 h-72 w-72 rounded-full bg-teal-500/20 blur-3xl" aria-hidden="true" />

        <div className="absolute -right-14 top-1/2 h-56 w-56 -translate-y-1/2 rotate-12 opacity-10" aria-hidden="true">
          <QrVisual />
        </div>

        <div className="relative">
          <p className="text-2xl font-bold tracking-tight">Smart Event Pass</p>

          <p className="mt-5 max-w-sm text-lg leading-8 text-slate-300">
            Manage your event guests, contributions, and check-ins — all in
            one place.
          </p>

          <ul className="mt-9 space-y-4">
            {valueProps.map((item) => (
              <li key={item.label} className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/15 bg-white/10 text-xl backdrop-blur">
                  {item.icon}
                </span>
                <span className="text-sm font-medium text-slate-200">
                  {item.label}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </main>
  );
}
