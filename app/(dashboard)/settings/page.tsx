"use client";

import {
  useEffect,
  useState,
  type FormEvent,
} from "react";

import {
  useRouter,
} from "next/navigation";

import {
  getWhatsAppConfigurationStatus,
  getUserSettingsProfile,
  logoutCurrentUser,
  updateAccountPassword,
  updateProfileName,
  type UserSettingsProfile,
  type WhatsAppConfigurationStatus,
} from "@/services/settingsService";

type MessageState = {
  type: "success" | "error";
  text: string;
} | null;

function formatDate(
  dateValue: string
) {
  const parsedDate =
    new Date(dateValue);

  if (
    Number.isNaN(
      parsedDate.getTime()
    )
  ) {
    return "-";
  }

  return new Intl.DateTimeFormat(
    "en-GB",
    {
      day: "2-digit",
      month: "long",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }
  ).format(parsedDate);
}

function getRoleLabel(
  role: string
) {
  switch (role) {
    case "admin":
    case "administrator":
      return "Administrator";

    case "scanner":
      return "Scanner";

    default:
      return role;
  }
}

export default function SettingsPage() {
  const router =
    useRouter();

  const [
    profile,
    setProfile,
  ] = useState<
    UserSettingsProfile | null
  >(null);

  const [
    fullName,
    setFullName,
  ] = useState("");

  const [
    newPassword,
    setNewPassword,
  ] = useState("");

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState("");

  const [
    showPassword,
    setShowPassword,
  ] = useState(false);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    savingProfile,
    setSavingProfile,
  ] = useState(false);

  const [
    savingPassword,
    setSavingPassword,
  ] = useState(false);

  const [
    loggingOut,
    setLoggingOut,
  ] = useState(false);

  const [
    profileMessage,
    setProfileMessage,
  ] = useState<MessageState>(
    null
  );

  const [
    passwordMessage,
    setPasswordMessage,
  ] = useState<MessageState>(
    null
  );

  const [
    pageError,
    setPageError,
  ] = useState("");

  const [
    whatsappStatus,
    setWhatsAppStatus,
  ] = useState<WhatsAppConfigurationStatus | null>(null);

  const [
    whatsappStatusError,
    setWhatsAppStatusError,
  ] = useState("");

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setPageError("");

      try {
        const userProfile =
          await getUserSettingsProfile();

        setProfile(userProfile);
        setFullName(
          userProfile.fullName
        );

        try {
          const integrationStatus =
            await getWhatsAppConfigurationStatus();

          setWhatsAppStatus(
            integrationStatus
          );
        } catch (statusError) {
          console.error(
            "Load WhatsApp configuration status error:",
            statusError
          );

          setWhatsAppStatusError(
            statusError instanceof Error
              ? statusError.message
              : "WhatsApp configuration status haikuweza kuthibitishwa."
          );
        }
      } catch (error) {
        console.error(
          "Load settings error:",
          error
        );

        setPageError(
          error instanceof Error
            ? error.message
            : "Settings hazikuweza kupatikana."
        );
      } finally {
        setLoading(false);
      }
    }

    loadProfile();
  }, []);

  async function handleProfileSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSavingProfile(true);
    setProfileMessage(null);

    try {
      const result =
        await updateProfileName(
          fullName
        );

      setProfile(
        (currentProfile) => {
          if (!currentProfile) {
            return currentProfile;
          }

          return {
            ...currentProfile,

            fullName:
              result.fullName,

            updatedAt:
              result.updatedAt,
          };
        }
      );

      setProfileMessage({
        type: "success",
        text: "Profile imesasishwa vizuri.",
      });
    } catch (error) {
      console.error(
        "Update profile error:",
        error
      );

      setProfileMessage({
        type: "error",

        text:
          error instanceof Error
            ? error.message
            : "Profile haikuweza kusasishwa.",
      });
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setSavingPassword(true);
    setPasswordMessage(null);

    try {
      await updateAccountPassword(
        newPassword,
        confirmPassword
      );

      setNewPassword("");
      setConfirmPassword("");

      setPasswordMessage({
        type: "success",
        text: "Password imebadilishwa vizuri.",
      });
    } catch (error) {
      console.error(
        "Update password error:",
        error
      );

      setPasswordMessage({
        type: "error",

        text:
          error instanceof Error
            ? error.message
            : "Password haikuweza kubadilishwa.",
      });
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleLogout() {
    if (loggingOut) {
      return;
    }

    setLoggingOut(true);

    try {
      await logoutCurrentUser();

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error(
        "Logout error:",
        error
      );

      setPageError(
        error instanceof Error
          ? error.message
          : "Logout haikuweza kukamilika."
      );

      setLoggingOut(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-100 border-t-emerald-700" />

          <p className="mt-4 font-semibold text-slate-600">
            Inapakia settings...
          </p>
        </div>
      </div>
    );
  }

  if (
    pageError &&
    !profile
  ) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-bold text-red-800">
          Settings Error
        </h1>

        <p className="mt-2 text-sm text-red-700">
          {pageError}
        </p>
      </div>
    );
  }

  const initial =
    profile?.fullName
      ?.trim()
      .charAt(0)
      .toUpperCase() || "U";

  const currentOrigin =
    typeof window !==
    "undefined"
      ? window.location.origin
      : "https://smart-ecard-system.vercel.app";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="sep-page-title">
          Settings
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Simamia profile, security na taarifa za mfumo.
        </p>
      </div>

      {pageError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-700">
          {pageError}
        </div>
      )}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="bg-gradient-to-r from-emerald-800 to-teal-800 px-6 py-8 text-white">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-2xl bg-white text-3xl font-bold text-emerald-800 shadow-lg">
              {initial}
            </div>

            <div>
              <h2 className="text-2xl font-bold">
                {profile?.fullName}
              </h2>

              <p className="mt-1 text-emerald-100">
                {profile?.email}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">
                <span className="rounded-full bg-white/15 px-3 py-1 text-xs font-bold">
                  {getRoleLabel(
                    profile?.role ??
                      ""
                  )}
                </span>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    profile?.isActive
                      ? "bg-emerald-400/20 text-emerald-100"
                      : "bg-red-400/20 text-red-100"
                  }`}
                >
                  {profile?.isActive
                    ? "Active"
                    : "Inactive"}
                </span>
              </div>
            </div>
          </div>
        </div>

        <form
          onSubmit={
            handleProfileSubmit
          }
          className="p-6"
        >
          <div className="mb-5">
            <h3 className="text-lg font-bold text-slate-900">
              Profile Information
            </h3>

            <p className="mt-1 text-sm text-slate-500">
              Badilisha jina litakaloonekana kwenye mfumo.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="full-name"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Full Name
              </label>

              <input
                id="full-name"
                type="text"
                value={fullName}
                required
                onChange={(event) =>
                  setFullName(
                    event.target.value
                  )
                }
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="email"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Email
              </label>

              <input
                id="email"
                type="email"
                value={
                  profile?.email ?? ""
                }
                disabled
                className="w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 py-3 text-slate-500"
              />
            </div>
          </div>

          {profileMessage && (
            <MessageBox
              message={profileMessage}
            />
          )}

          <button
            type="submit"
            disabled={savingProfile}
            className="mt-5 rounded-xl bg-emerald-700 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingProfile
              ? "Saving..."
              : "Save Profile"}
          </button>
        </form>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Security
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Badilisha password ya account yako.
          </p>
        </div>

        <form
          onSubmit={
            handlePasswordSubmit
          }
          className="mt-6"
        >
          <div className="grid gap-5 md:grid-cols-2">
            <div>
              <label
                htmlFor="new-password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                New Password
              </label>

              <input
                id="new-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={newPassword}
                required
                minLength={8}
                onChange={(event) =>
                  setNewPassword(
                    event.target.value
                  )
                }
                placeholder="Minimum characters 8"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>

            <div>
              <label
                htmlFor="confirm-password"
                className="mb-2 block text-sm font-semibold text-slate-700"
              >
                Confirm Password
              </label>

              <input
                id="confirm-password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                value={
                  confirmPassword
                }
                required
                minLength={8}
                onChange={(event) =>
                  setConfirmPassword(
                    event.target.value
                  )
                }
                placeholder="Rudia password"
                className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100"
              />
            </div>
          </div>

          <label className="mt-4 inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-600">
            <input
              type="checkbox"
              checked={showPassword}
              onChange={(event) =>
                setShowPassword(
                  event.target.checked
                )
              }
              className="h-4 w-4 rounded border-slate-300 text-emerald-700"
            />

            Show passwords
          </label>

          {passwordMessage && (
            <MessageBox
              message={
                passwordMessage
              }
            />
          )}

          <button
            type="submit"
            disabled={savingPassword}
            className="mt-5 rounded-xl bg-slate-900 px-6 py-3 text-sm font-bold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {savingPassword
              ? "Updating..."
              : "Update Password"}
          </button>
        </form>
      </section>

      <section className="grid gap-5 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            System Information
          </h2>

          <div className="mt-5 space-y-4">
            <SettingDetail
              label="Application"
              value="Smart Event Pass"
            />

            <SettingDetail
              label="App URL"
              value={currentOrigin}
            />

            <SettingDetail
              label="Database"
              value="Supabase"
            />

            <SettingDetail
              label="Hosting"
              value="Vercel"
            />

            <SettingDetail
              label="Member Since"
              value={formatDate(
                profile?.createdAt ??
                  ""
              )}
            />
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                WhatsApp Integration
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Cloud API configuration status.
              </p>
            </div>

            <span
              className={`rounded-full px-3 py-1 text-xs font-bold ${
                whatsappStatus
                  ?.sendConfigurationDetected
                  ? "bg-emerald-100 text-emerald-700"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {whatsappStatus
                ?.sendConfigurationDetected
                ? "Configuration detected"
                : "Not verified"}
            </span>
          </div>

          <div className="mt-5 space-y-4">
            <IntegrationStatus
              label="Send API Route"
              status="available"
            />

            <IntegrationStatus
              label="Webhook Route"
              status="available"
            />

            <IntegrationStatus
              label="Message Logs"
              status="available"
            />

            <IntegrationStatus
              label="Meta Verification"
              status="not_verified"
            />

            <IntegrationStatus
              label="Approved Templates"
              status={
                !whatsappStatus
                  ? "not_verified"
                  : whatsappStatus
                        .templateNamesConfigured
                    ? "not_verified"
                    : "not_configured"
              }
            />

            <IntegrationStatus
              label="Production Access Token"
              status={
                !whatsappStatus
                  ? "not_verified"
                  : whatsappStatus
                        .accessTokenConfigured
                    ? "configured"
                    : "not_configured"
              }
            />

            <IntegrationStatus
              label="Phone Number ID"
              status={
                !whatsappStatus
                  ? "not_verified"
                  : whatsappStatus
                        .phoneNumberConfigured
                    ? "configured"
                    : "not_configured"
              }
            />

            <IntegrationStatus
              label="Webhook Environment"
              status={
                !whatsappStatus
                  ? "not_verified"
                  : whatsappStatus
                        .webhookEnvironmentConfigured
                    ? "configured"
                    : "not_configured"
              }
            />
          </div>

          <p className="mt-5 rounded-xl bg-blue-50 p-4 text-sm leading-6 text-blue-800">
            Configured inaonyesha environment variable ipo bila
            kuonyesha thamani yake. Template approval na webhook
            verification lazima zithibitishwe kwenye Meta dashboard.
          </p>

          {whatsappStatusError && (
            <p className="mt-3 rounded-xl bg-slate-100 p-3 text-xs font-medium text-slate-600">
              {whatsappStatusError}
            </p>
          )}
        </div>
      </section>

      <section className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h2 className="text-lg font-bold text-red-800">
          Account Session
        </h2>

        <p className="mt-1 text-sm text-red-700">
          Logout itaondoa session ya account hii kwenye kifaa.
        </p>

        <button
          type="button"
          disabled={loggingOut}
          onClick={handleLogout}
          className="mt-5 rounded-xl bg-red-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loggingOut
            ? "Logging out..."
            : "Logout"}
        </button>
      </section>
    </div>
  );
}

function MessageBox({
  message,
}: {
  message: Exclude<
    MessageState,
    null
  >;
}) {
  return (
    <div
      className={`mt-5 rounded-xl p-4 text-sm font-medium ${
        message.type ===
        "success"
          ? "bg-emerald-50 text-emerald-700"
          : "bg-red-50 text-red-700"
      }`}
    >
      {message.text}
    </div>
  );
}

function SettingDetail({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="flex flex-col gap-1 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm font-semibold text-slate-500">
        {label}
      </p>

      <p className="break-all text-sm font-bold text-slate-900">
        {value}
      </p>
    </div>
  );
}

function IntegrationStatus({
  label,
  status,
}: {
  label: string;
  status:
    | "available"
    | "configured"
    | "not_configured"
    | "not_verified";
}) {
  const statusStyles = {
    available:
      "bg-emerald-100 text-emerald-700",
    configured:
      "bg-blue-100 text-blue-700",
    not_configured:
      "bg-red-100 text-red-700",
    not_verified:
      "bg-slate-100 text-slate-600",
  };

  const statusLabels = {
    available: "Available",
    configured: "Configured",
    not_configured:
      "Not configured",
    not_verified:
      "Not verified",
  };

  return (
    <div className="flex items-center justify-between gap-3">
      <p className="text-sm font-semibold text-slate-700">
        {label}
      </p>

      <span
        className={`rounded-full px-3 py-1 text-xs font-bold ${statusStyles[status]}`}
      >
        {statusLabels[status]}
      </span>
    </div>
  );
}
