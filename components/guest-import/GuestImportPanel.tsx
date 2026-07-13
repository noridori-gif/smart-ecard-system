"use client";

import {
  ChangeEvent,
  useMemo,
  useRef,
  useState,
} from "react";

import {
  downloadGuestImportTemplate,
  readGuestImportFile,
  type GuestImportRow,
} from "@/services/guestImportService";

export type GuestImportEventOption = {
  id: number;
  title: string;
};

type GuestImportPanelProps = {
  events: GuestImportEventOption[];
};

const PREVIEW_ROWS_LIMIT = 10;

function formatFileSize(sizeInBytes: number) {
  if (sizeInBytes < 1024) {
    return `${sizeInBytes} bytes`;
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${(sizeInBytes / 1024).toFixed(1)} KB`;
  }

  return `${(
    sizeInBytes /
    (1024 * 1024)
  ).toFixed(1)} MB`;
}

function isSupportedExcelFile(file: File) {
  const extension =
    file.name.split(".").pop()?.toLowerCase() ?? "";

  return ["xlsx", "xls", "csv"].includes(extension);
}

export default function GuestImportPanel({
  events,
}: GuestImportPanelProps) {
  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [selectedEventId, setSelectedEventId] =
    useState("");

  const [selectedFile, setSelectedFile] =
    useState<File | null>(null);

  const [previewRows, setPreviewRows] = useState<
    GuestImportRow[]
  >([]);

  const [isReadingFile, setIsReadingFile] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState("");

  const selectedEvent = useMemo(() => {
    return (
      events.find(
        (eventItem) =>
          String(eventItem.id) === selectedEventId
      ) ?? null
    );
  }, [events, selectedEventId]);

  const displayedRows = previewRows.slice(
    0,
    PREVIEW_ROWS_LIMIT
  );

  function handleDownloadTemplate() {
    setErrorMessage("");

    if (!selectedEvent) {
      setErrorMessage(
        "Chagua event kwanza kabla ya kupakua template."
      );

      return;
    }

    downloadGuestImportTemplate(selectedEvent.title);
  }

  function handleChooseFile() {
    setErrorMessage("");

    if (!selectedEvent) {
      setErrorMessage(
        "Chagua event kwanza kabla ya kuchagua Excel."
      );

      return;
    }

    fileInputRef.current?.click();
  }

  async function handleFileChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setErrorMessage("");
    setPreviewRows([]);
    setSelectedFile(null);

    if (!isSupportedExcelFile(file)) {
      setErrorMessage(
        "Chagua file la Excel lenye format ya .xlsx, .xls au .csv."
      );

      event.target.value = "";

      return;
    }

    const maximumFileSize = 5 * 1024 * 1024;

    if (file.size > maximumFileSize) {
      setErrorMessage(
        "Excel file ni kubwa kuliko 5 MB."
      );

      event.target.value = "";

      return;
    }

    try {
      setIsReadingFile(true);

      const rows = await readGuestImportFile(file);

      if (rows.length === 0) {
        throw new Error(
          "Excel haina guest details zinazoweza kusomeka."
        );
      }

      setSelectedFile(file);
      setPreviewRows(rows);
    } catch (error) {
      console.error(
        "Guest Excel reading error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Excel file haikuweza kusomeka."
      );

      event.target.value = "";
    } finally {
      setIsReadingFile(false);
    }
  }

  function handleClearFile() {
    setSelectedFile(null);
    setPreviewRows([]);
    setErrorMessage("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Import Guests from Excel
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Pakua template, jaza guest details, kisha
          upload Excel ili kuangalia preview.
        </p>
      </div>

      {errorMessage && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {errorMessage}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        <div>
          <label
            htmlFor="guest-import-event"
            className="mb-2 block text-sm font-semibold text-slate-700"
          >
            1. Select Event
          </label>

          <select
            id="guest-import-event"
            value={selectedEventId}
            onChange={(event) => {
              setSelectedEventId(event.target.value);
              handleClearFile();
            }}
            className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-100"
          >
            <option value="">
              Chagua event
            </option>

            {events.map((eventItem) => (
              <option
                key={eventItem.id}
                value={String(eventItem.id)}
              >
                {eventItem.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <p className="mb-2 block text-sm font-semibold text-slate-700">
            2. Download Template
          </p>

          <button
            type="button"
            onClick={handleDownloadTemplate}
            disabled={!selectedEvent}
            className="flex w-full items-center justify-center rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            Download Excel Template
          </button>
        </div>

        <div>
          <p className="mb-2 block text-sm font-semibold text-slate-700">
            3. Upload Completed Excel
          </p>

          <input
            ref={fileInputRef}
            type="file"
            accept=".xlsx,.xls,.csv"
            onChange={handleFileChange}
            className="hidden"
          />

          <button
            type="button"
            onClick={handleChooseFile}
            disabled={!selectedEvent || isReadingFile}
            className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            {isReadingFile
              ? "Reading Excel..."
              : "Choose Excel File"}
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm text-blue-800">
        <p className="font-semibold">
          Excel columns zinazotakiwa:
        </p>

        <p className="mt-1">
          Full Name, Phone, Email, Category, Allowed
          Guests na Event Pass ID.
        </p>
      </div>

      {selectedFile && (
        <div className="flex flex-col justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 sm:flex-row sm:items-center">
          <div>
            <p className="font-semibold text-slate-900">
              {selectedFile.name}
            </p>

            <p className="mt-1 text-xs text-slate-500">
              {formatFileSize(selectedFile.size)} ·{" "}
              {previewRows.length} rows found
            </p>
          </div>

          <button
            type="button"
            onClick={handleClearFile}
            className="rounded-lg border border-red-200 bg-white px-4 py-2 text-sm font-semibold text-red-600 transition hover:bg-red-50"
          >
            Remove File
          </button>
        </div>
      )}

      {previewRows.length > 0 && (
        <div className="space-y-4">
          <div className="flex flex-col justify-between gap-2 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Guest Preview
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Angalia data kabla ya validation na
                import.
              </p>
            </div>

            <div className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
              {previewRows.length} Guests
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-900">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                      Row
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                      Full Name
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                      Phone
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                      Email
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                      Category
                    </th>

                    <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-white">
                      Allowed
                    </th>

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                      Event Pass ID
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {displayedRows.map((row) => (
                    <tr
                      key={`${row.rowNumber}-${row.eventPassId}`}
                      className="hover:bg-slate-50"
                    >
                      <td className="px-4 py-3 text-sm text-slate-500">
                        {row.rowNumber}
                      </td>

                      <td className="px-4 py-3 text-sm font-semibold text-slate-900">
                        {row.fullName || "-"}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.phone || "-"}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.email || "-"}
                      </td>

                      <td className="px-4 py-3 text-sm text-slate-700">
                        {row.category || "-"}
                      </td>

                      <td className="px-4 py-3 text-center text-sm font-semibold text-slate-800">
                        {row.allowedGuests || "-"}
                      </td>

                      <td className="px-4 py-3 font-mono text-sm font-semibold text-blue-700">
                        {row.eventPassId || "-"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {previewRows.length >
            PREVIEW_ROWS_LIMIT && (
            <p className="text-center text-sm text-slate-500">
              Inaonyesha rows{" "}
              {PREVIEW_ROWS_LIMIT} za kwanza kati ya{" "}
              {previewRows.length}.
            </p>
          )}

          <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            Preview imekamilika. Hatua inayofuata
            itaangalia missing details, duplicate phone,
            duplicate Event Pass ID na invalid data kabla
            ya ku-import.
          </div>
        </div>
      )}
    </section>
  );
}