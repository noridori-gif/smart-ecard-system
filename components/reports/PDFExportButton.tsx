"use client";

import { useState } from "react";
import { pdf } from "@react-pdf/renderer";

import type {
  EventReportSummary,
  ReportEvent,
  ReportGuest,
  ReportInvitation,
  ReportWish,
} from "@/services/reportService";

import EventReportPDF from "./EventReportPDF";

type PDFExportButtonProps = {
  event: ReportEvent | null;
  summary: EventReportSummary;
  guests: ReportGuest[];
  invitations: ReportInvitation[];
  wishes: ReportWish[];
  disabled?: boolean;
};

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_");
}

export default function PDFExportButton({
  event,
  summary,
  guests,
  invitations,
  wishes,
  disabled = false,
}: PDFExportButtonProps) {
  const [isGenerating, setIsGenerating] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  async function handleExportPDF() {
    if (!event) {
      setErrorMessage(
        "Chagua event kwanza kabla ya kutengeneza PDF."
      );

      return;
    }

    try {
      setIsGenerating(true);
      setErrorMessage("");

      const pdfDocument = (
        <EventReportPDF
          event={event}
          summary={summary}
          guests={guests}
          invitations={invitations}
          wishes={wishes}
        />
      );

      const blob =
        await pdf(pdfDocument).toBlob();

      const downloadUrl =
        URL.createObjectURL(blob);

      const downloadLink =
        document.createElement("a");

      const eventName =
        sanitizeFileName(event.title);

      const eventDate =
        event.event_date || "report";

      downloadLink.href = downloadUrl;

      downloadLink.download =
        `${eventName}_${eventDate}_Report.pdf`;

      document.body.appendChild(
        downloadLink
      );

      downloadLink.click();
      downloadLink.remove();

      window.setTimeout(() => {
        URL.revokeObjectURL(
          downloadUrl
        );
      }, 1000);
    } catch (error) {
      console.error(
        "PDF generation error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "PDF report haikuweza kutengenezwa."
      );
    } finally {
      setIsGenerating(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleExportPDF}
        disabled={
          disabled ||
          !event ||
          isGenerating
        }
        className="flex w-full items-center justify-center gap-2 rounded-xl bg-red-600 px-5 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-red-700 disabled:cursor-not-allowed disabled:bg-slate-300"
      >
        <span aria-hidden="true">
          📄
        </span>

        <span>
          {isGenerating
            ? "Preparing PDF..."
            : "Export Complete PDF Report"}
        </span>
      </button>

      {errorMessage && (
        <div
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
        >
          {errorMessage}
        </div>
      )}
    </div>
  );
}