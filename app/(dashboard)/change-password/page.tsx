"use client";

import {
  type FormEvent,
  useState,
} from "react";

import {
  useRouter,
} from "next/navigation";

type PasswordForm = {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
};

const initialForm: PasswordForm = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

const MIN_PASSWORD_LENGTH = 8;

export default function ChangePasswordPage() {
  const router =
    useRouter();

  const [
    formData,
    setFormData,
  ] =
    useState<PasswordForm>(
      initialForm
    );

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

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] =
    useState(false);

  const [
    showNewPassword,
    setShowNewPassword,
  ] =
    useState(false);

  function updateField(
    field: keyof PasswordForm,
    value: string
  ) {
    setFormData(
      (currentData) => ({
        ...currentData,
        [field]: value,
      })
    );

    setErrorMessage("");
    setSuccessMessage("");
  }

  async function handleSubmit(
    event:
      FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setErrorMessage("");
    setSuccessMessage("");

    if (
      formData.newPassword.length <
      MIN_PASSWORD_LENGTH
    ) {
      setErrorMessage(
        `Password mpya lazima iwe na characters ${MIN_PASSWORD_LENGTH} au zaidi.`
      );

      return;
    }

    if (
      formData.newPassword !==
      formData.confirmPassword
    ) {
      setErrorMessage(
        "Password mpya na confirmation hazifanani."
      );

      return;
    }

    if (
      formData.currentPassword ===
      formData.newPassword
    ) {
      setErrorMessage(
        "Password mpya lazima iwe tofauti na password ya sasa."
      );

      return;
    }

    setIsSaving(true);

    try {
      const response=await fetch("/api/auth/change-password",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify({currentPassword:formData.currentPassword,newPassword:formData.newPassword})});
      const result=await response.json() as {success?:boolean;error?:string};
      if(!response.ok||!result.success)throw new Error(result.error??"Password haikuweza kubadilishwa.");

      setFormData(
        initialForm
      );

      setSuccessMessage(
        "Password imebadilishwa vizuri. Tumia password mpya utakapo-login tena."
      );
    } catch (error) {
      console.error(
        "Password change error:",
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

  return (
    <section className="mx-auto w-full max-w-3xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-8">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.2em] text-blue-600">
            Account Security
          </p>

          <h1 className="mt-2 text-3xl font-bold text-slate-900">
            Change Password
          </h1>

          <p className="mt-2 text-sm leading-6 text-slate-600">
            Badilisha temporary password au
            password ya sasa ya account yako.
          </p>
        </div>

        {errorMessage && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"
          >
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div
            role="status"
            className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
          >
            {successMessage}
          </div>
        )}

        <form
          onSubmit={
            handleSubmit
          }
          className="mt-8 space-y-6"
        >
          <PasswordField
            label="Current Password"
            value={
              formData
                .currentPassword
            }
            placeholder="Enter current password"
            showPassword={
              showCurrentPassword
            }
            disabled={
              isSaving
            }
            onChange={(
              value
            ) =>
              updateField(
                "currentPassword",
                value
              )
            }
            onToggleVisibility={() =>
              setShowCurrentPassword(
                (current) =>
                  !current
              )
            }
          />

          <PasswordField
            label="New Password"
            value={
              formData
                .newPassword
            }
            placeholder="At least 8 characters"
            showPassword={
              showNewPassword
            }
            disabled={
              isSaving
            }
            minLength={
              MIN_PASSWORD_LENGTH
            }
            onChange={(
              value
            ) =>
              updateField(
                "newPassword",
                value
              )
            }
            onToggleVisibility={() =>
              setShowNewPassword(
                (current) =>
                  !current
              )
            }
          />

          <PasswordField
            label="Confirm New Password"
            value={
              formData
                .confirmPassword
            }
            placeholder="Repeat new password"
            showPassword={
              showNewPassword
            }
            disabled={
              isSaving
            }
            minLength={
              MIN_PASSWORD_LENGTH
            }
            onChange={(
              value
            ) =>
              updateField(
                "confirmPassword",
                value
              )
            }
            onToggleVisibility={() =>
              setShowNewPassword(
                (current) =>
                  !current
              )
            }
          />

          <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm font-semibold text-blue-900">
              Password requirements
            </p>

            <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-blue-800">
              <li>
                Characters 8 au zaidi
              </li>

              <li>
                Iwe tofauti na password ya sasa
              </li>

              <li>
                Usimpe mtu mwingine password yako
              </li>
            </ul>
          </div>

          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:justify-end">
            <button
              type="button"
              disabled={
                isSaving
              }
              onClick={() =>
                router.back()
              }
              className="rounded-xl bg-slate-100 px-6 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-200 disabled:opacity-60"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={
                isSaving
              }
              className="rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Changing Password..."
                : "Change Password"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}

type PasswordFieldProps = {
  label: string;
  value: string;
  placeholder: string;
  showPassword: boolean;
  disabled: boolean;
  minLength?: number;
  onChange: (
    value: string
  ) => void;
  onToggleVisibility:
    () => void;
};

function PasswordField({
  label,
  value,
  placeholder,
  showPassword,
  disabled,
  minLength,
  onChange,
  onToggleVisibility,
}: PasswordFieldProps) {
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
          disabled={
            disabled
          }
          minLength={
            minLength
          }
          autoComplete={
            label ===
            "Current Password"
              ? "current-password"
              : "new-password"
          }
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
          className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 pr-24 text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
        />

        <button
          type="button"
          disabled={
            disabled
          }
          onClick={
            onToggleVisibility
          }
          className="absolute inset-y-0 right-0 px-4 text-sm font-semibold text-blue-600 hover:text-blue-700 disabled:opacity-60"
        >
          {showPassword
            ? "Hide"
            : "Show"}
        </button>
      </div>
    </div>
  );
}
