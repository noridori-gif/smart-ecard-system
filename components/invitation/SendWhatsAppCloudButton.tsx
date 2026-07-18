"use client";

import {
  useState,
} from "react";

import {
  supabase,
} from "@/lib/supabase";

type SendWhatsAppCloudButtonProps = {
  invitationToken: string;
  disabled?: boolean;
  compact?: boolean;
};

type SendWhatsAppResponse = {
  success: boolean;
  message: string;
  messageId?: string;
  recipient?: string;
  acceptanceStatus?: string;
};

export default function SendWhatsAppCloudButton({
  invitationToken,
  disabled = false,
  compact = false,
}: SendWhatsAppCloudButtonProps) {
  const [
    isSending,
    setIsSending,
  ] = useState(false);

  const [
    successMessage,
    setSuccessMessage,
  ] = useState("");

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  async function handleSend() {
    if (
      disabled ||
      isSending
    ) {
      return;
    }

    setIsSending(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          sessionError.message
        );
      }

      const accessToken =
        sessionData.session
          ?.access_token;

      if (!accessToken) {
        throw new Error(
          "Session yako imeisha. Ingia tena."
        );
      }

      const response = await fetch(
        "/api/whatsapp/send-invitation",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${accessToken}`,
          },

          body: JSON.stringify({
            invitationToken,
          }),
        }
      );

      let responseData:
        SendWhatsAppResponse;

      try {
        responseData =
          (await response.json()) as
            SendWhatsAppResponse;
      } catch {
        throw new Error(
          "Server imerudisha response isiyo sahihi."
        );
      }

      if (
        !response.ok ||
        !responseData.success
      ) {
        throw new Error(
          responseData.message ||
            "WhatsApp invitation haikuweza kutumwa."
        );
      }

      setSuccessMessage(
        responseData.message ||
          "Meta imepokea ombi la WhatsApp. Fuatilia hali ya delivery kwenye WhatsApp Logs."
      );
    } catch (error) {
      console.error(
        "Send WhatsApp invitation error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "WhatsApp invitation haikuweza kutumwa."
      );
    } finally {
      setIsSending(false);
    }
  }

  const buttonText =
    isSending
      ? "Sending..."
      : "Send via API";

  return (
    <div
      className={
        compact
          ? "relative"
          : "col-span-2"
      }
    >
      <button
        type="button"
        disabled={
          disabled ||
          isSending
        }
        onClick={handleSend}
        className="w-full rounded-lg bg-emerald-700 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {buttonText}
      </button>

      {disabled && (
        <p className="mt-2 text-xs font-medium text-amber-700">
          Mgeni hana namba ya simu.
        </p>
      )}

      {successMessage && (
        <div
          role="status"
          className="mt-2 rounded-lg bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
        >
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div
          role="alert"
          className="mt-2 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}
