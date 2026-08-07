"use client";

import {
  useState,
} from "react";

type ShareInvitationCardButtonProps = {
  invitationToken: string;
  guestName: string;

  eventPassId:
    | string
    | null;

  compact?: boolean;
  mobile?: boolean;
  onActionComplete?: () => void;
};

function createSafeFileName(
  guestName: string,

  eventPassId:
    | string
    | null,

  extension: string
) {
  const safeGuestName =
    guestName
      .trim()
      .replace(
        /[^a-zA-Z0-9]+/g,
        "-"
      )
      .replace(
        /^-+|-+$/g,
        ""
      )
      .toLowerCase();

  const safePassId =
    eventPassId
      ?.trim()
      .replace(
        /[^a-zA-Z0-9-]+/g,
        ""
      )
      .toLowerCase() ||
    "invitation";

  return (
    `smart-event-pass-` +
    `${safeGuestName || "guest"}-` +
    `${safePassId}.${extension}`
  );
}

function extensionForContentType(
  contentType: string
) {
  return contentType === "image/png"
    ? "png"
    : "jpg";
}

function downloadCardFile(
  file: File
) {
  const fileUrl =
    URL.createObjectURL(file);

  const downloadLink =
    document.createElement("a");

  downloadLink.href =
    fileUrl;

  downloadLink.download =
    file.name;

  document.body.appendChild(
    downloadLink
  );

  downloadLink.click();

  document.body.removeChild(
    downloadLink
  );

  window.setTimeout(() => {
    URL.revokeObjectURL(
      fileUrl
    );
  }, 1000);
}

export default function ShareInvitationCardButton({
  invitationToken,
  guestName,
  eventPassId,
  compact = false,
  mobile = false,
  onActionComplete,
}: ShareInvitationCardButtonProps) {
  const [
    isPreparing,
    setIsPreparing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState("");

  async function handleShareCard() {
    if (isPreparing) {
      return;
    }

    setIsPreparing(true);
    setErrorMessage("");

    try {
      const cardUrl =
        `/api/invitations/` +
        `${invitationToken}/card`;

      const response =
        await fetch(cardUrl, {
          method: "GET",
          cache: "no-store",
        });

      if (!response.ok) {
        const errorText =
          await response.text();

        throw new Error(
          errorText ||
            "Kadi haikuweza kutengenezwa."
        );
      }

      const cardBlob =
        await response.blob();

      const contentType =
        cardBlob.type ||
        "image/jpeg";

      const fileName =
        createSafeFileName(
          guestName,
          eventPassId,
          extensionForContentType(
            contentType
          )
        );

      const cardFile =
        new File(
          [cardBlob],
          fileName,
          {
            type:
              contentType,
          }
        );

      const shareData = {
        files: [cardFile],

        title:
          "Smart Event Pass",

        text:
          `Mwaliko maalumu kwa ${guestName}`,
      };

      const canShareCard =
        typeof navigator.share ===
          "function" &&
        typeof navigator.canShare ===
          "function" &&
        navigator.canShare(
          shareData
        );

      if (canShareCard) {
        try {
          await navigator.share(
            shareData
          );

          return;
        } catch (error) {
          if (
            error instanceof
              DOMException &&
            error.name ===
              "AbortError"
          ) {
            return;
          }

          throw error;
        }
      }

      downloadCardFile(
        cardFile
      );
    } catch (error) {
      console.error(
        "Share invitation card error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Kadi haikuweza kushare."
      );
    } finally {
      setIsPreparing(false);
      onActionComplete?.();
    }
  }

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
        disabled={isPreparing}
        onClick={handleShareCard}
        className={`w-full rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-60 ${
          mobile
            ? "min-h-11"
            : "py-2"
        }`}
      >
        {isPreparing
          ? "Preparing Card..."
          : "Share Card"}
      </button>

      {errorMessage && (
        <p className="mt-2 max-w-xs text-xs font-medium text-red-600">
          {errorMessage}
        </p>
      )}
    </div>
  );
}
