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
  validateGuestImportRows,
  type GuestImportRow,
  type GuestImportValidationResult,
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

  const [validationResult, setValidationResult] =
    useState<GuestImportValidationResult | null>(null);

  const [isReadingFile, setIsReadingFile] =
    useState(false);

  const [isValidating, setIsValidating] =
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

  const rowsForDisplay =
    validationResult?.validRows.length ||
    validationResult?.invalidRows.length
      ? [
          ...validationResult.validRows,
          ...validationResult.invalidRows,
        ].sort(
          (firstRow, secondRow) =>
            firstRow.rowNumber - secondRow.rowNumber
        )
      : previewRows;

  const displayedRows = rowsForDisplay.slice(
    0,
    PREVIEW_ROWS_LIMIT
  );

  const invalidRowNumbers = useMemo(() => {
    if (!validationResult) {
      return new Set<number>();
    }

    return new Set(
      validationResult.invalidRows.map(
        (row) => row.rowNumber
      )
    );
  }, [validationResult]);

  function resetValidation() {
    setValidationResult(null);
  }

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
    resetValidation();

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
    resetValidation();

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  function handleValidate() {
    if (previewRows.length === 0) {
      setErrorMessage(
        "Chagua na upload Excel kwanza kabla ya validation."
      );

      return;
    }

    try {
      setIsValidating(true);
      setErrorMessage("");

      const result =
        validateGuestImportRows(previewRows);

      setValidationResult(result);
    } catch (error) {
      console.error(
        "Guest validation error:",
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Guest data haikuweza kufanyiwa validation."
      );
    } finally {
      setIsValidating(false);
    }
  }

  function getRowErrors(rowNumber: number) {
    if (!validationResult) {
      return [];
    }

    return validationResult.errors.filter(
      (error) => error.rowNumber === rowNumber
    );
  }

  function handleImportGuests() {
    setErrorMessage(
      "Supabase import itaongezwa kwenye hatua inayofuata."
    );
  }

  return (
    <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div>
        <h2 className="text-xl font-bold text-slate-900">
          Import Guests from Excel
        </h2>

        <p className="mt-1 text-sm text-slate-600">
          Pakua template, jaza guest details, upload
          Excel, kisha fanya validation kabla ya
          ku-import.
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
          Excel columns:
        </p>

        <p className="mt-1">
          Full Name ni lazima. Phone, Email, Category,
          Allowed Guests na Event Pass ID ni optional.
        </p>

        <p className="mt-2 text-xs text-blue-700">
          Category ikiwa wazi itawekwa Normal, Allowed
          Guests itawekwa 1, na Event Pass ID
          itatengenezwa automatically.
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
        <div className="space-y-5">
          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
            <div>
              <h3 className="text-lg font-bold text-slate-900">
                Guest Preview
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Angalia data kabla ya validation na
                import.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <div className="rounded-full bg-blue-100 px-4 py-2 text-sm font-bold text-blue-700">
                {previewRows.length} Guests
              </div>

              {validationResult && (
                <>
                  <div className="rounded-full bg-emerald-100 px-4 py-2 text-sm font-bold text-emerald-700">
                    {validationResult.validRows.length} Valid
                  </div>

                  <div className="rounded-full bg-red-100 px-4 py-2 text-sm font-bold text-red-700">
                    {validationResult.invalidRows.length} Invalid
                  </div>
                </>
              )}
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

                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white">
                      Validation
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100 bg-white">
                  {displayedRows.map((row) => {
                    const rowIsInvalid =
                      invalidRowNumbers.has(row.rowNumber);

                    const rowErrors = getRowErrors(
                      row.rowNumber
                    );

                    return (
                      <tr
                        key={`${row.rowNumber}-${row.eventPassId}`}
                        className={
                          rowIsInvalid
                            ? "bg-red-50"
                            : "hover:bg-slate-50"
                        }
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
                          {row.category || "Normal"}
                        </td>

                        <td className="px-4 py-3 text-center text-sm font-semibold text-slate-800">
                          {row.allowedGuests || 1}
                        </td>

                        <td className="px-4 py-3 font-mono text-sm font-semibold text-blue-700">
                          {row.eventPassId ||
                            "Will be generated"}
                        </td>

                        <td className="px-4 py-3">
                          {!validationResult ? (
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                              Not validated
                            </span>
                          ) : rowIsInvalid ? (
                            <div className="space-y-1">
                              <span className="inline-flex rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                                Invalid
                              </span>

                              {rowErrors.map(
                                (rowError, index) => (
                                  <p
                                    key={`${rowError.field}-${index}`}
                                    className="text-xs text-red-600"
                                  >
                                    {rowError.field}:{" "}
                                    {rowError.message}
                                  </p>
                                )
                              )}
                            </div>
                          ) : (
                            <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">
                              Valid
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {rowsForDisplay.length >
            PREVIEW_ROWS_LIMIT && (
            <p className="text-center text-sm text-slate-500">
              Inaonyesha rows{" "}
              {PREVIEW_ROWS_LIMIT} za kwanza kati ya{" "}
              {rowsForDisplay.length}.
            </p>
          )}

          {!validationResult && (
            <div className="flex flex-col justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 sm:flex-row sm:items-center">
              <div>
                <p className="font-semibold text-amber-900">
                  Preview imekamilika
                </p>

                <p className="mt-1 text-sm text-amber-800">
                  Fanya validation ili kuangalia
                  missing details, duplicate phone,
                  duplicate Event Pass ID na invalid
                  data.
                </p>
              </div>

              <button
                type="button"
                onClick={handleValidate}
                disabled={isValidating}
                className="rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-white transition hover:bg-amber-600 disabled:cursor-not-allowed disabled:bg-slate-300"
              >
                {isValidating
                  ? "Validating..."
                  : "Validate Guest Data"}
              </button>
            </div>
          )}

          {validationResult && (
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm font-medium text-slate-500">
                    Total Rows
                  </p>

                  <p className="mt-2 text-3xl font-bold text-slate-900">
                    {previewRows.length}
                  </p>
                </div>

                <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
                  <p className="text-sm font-medium text-emerald-700">
                    Valid Guests
                  </p>

                  <p className="mt-2 text-3xl font-bold text-emerald-700">
                    {validationResult.validRows.length}
                  </p>
                </div>

                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-medium text-red-700">
                    Invalid Guests
                  </p>

                  <p className="mt-2 text-3xl font-bold text-red-700">
                    {validationResult.invalidRows.length}
                  </p>
                </div>
              </div>

              {validationResult.errors.length > 0 ? (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <h4 className="font-bold text-red-800">
                    Validation Errors
                  </h4>

                  <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
                    {validationResult.errors.map(
                      (validationError, index) => (
                        <div
                          key={`${validationError.rowNumber}-${validationError.field}-${index}`}
                          className="rounded-lg border border-red-100 bg-white px-3 py-2 text-sm text-red-700"
                        >
                          <span className="font-bold">
                            Row{" "}
                            {validationError.rowNumber}
                          </span>

                          {" — "}

                          <span className="font-semibold">
                            {validationError.field}:
                          </span>{" "}

                          {validationError.message}
                        </div>
                      )
                    )}
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-emerald-800">
                  <p className="font-bold">
                    Validation imekamilika vizuri.
                  </p>

                  <p className="mt-1 text-sm">
                    Wageni wote wako tayari
                    ku-import.
                  </p>
                </div>
              )}

              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={handleValidate}
                  disabled={isValidating}
                  className="rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                >
                  Validate Again
                </button>

                <button
                  type="button"
                  onClick={handleImportGuests}
                  disabled={
                    validationResult.validRows.length ===
                    0
                  }
                  className="rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Import{" "}
                  {validationResult.validRows.length}{" "}
                  Valid Guests
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </section>
  );
}