import * as XLSX from "xlsx";

// Pure validation + file-parsing helpers for SMS Outreach recipient upload.
// Deliberately client-safe (no "server-only", no DB calls) so both the
// browser panel (parse + preview) and the server route (re-validate,
// never trust the client) import the exact same logic -- same shape as
// guestImportService.ts's validateGuestImportRows, but scoped to a
// campaign's recipients: full name + phone only, phone mandatory (you
// can't SMS someone without a number).

export type RecipientImportRow = { rowNumber: number; fullName: string; phone: string };
export type RecipientImportError = { rowNumber: number; field: string; message: string };
export type RecipientImportValidation = { validRows: RecipientImportRow[]; invalidRows: RecipientImportRow[]; errors: RecipientImportError[] };

export const RECIPIENT_IMPORT_HEADERS = ["Full Name", "Phone"] as const;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
}

function getCellValue(row: Record<string, unknown>, possibleHeaders: string[]) {
  const normalizedEntries = Object.entries(row).map(([key, value]) => [normalizeHeader(key), value] as const);
  for (const possibleHeader of possibleHeaders) {
    const normalizedHeader = normalizeHeader(possibleHeader);
    const matchingEntry = normalizedEntries.find(([key]) => key === normalizedHeader);
    if (matchingEntry) return matchingEntry[1];
  }
  return undefined;
}

function textValue(value: unknown) {
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

export function normalizeRecipientPhone(phone: string): string | null {
  let value = phone.trim().replace(/\D/g, "");
  if (!value) return null;
  if (value.startsWith("2550")) value = `255${value.slice(4)}`;
  else if (value.startsWith("0")) value = `255${value.slice(1)}`;
  else if (/^[67]\d{8}$/.test(value)) value = `255${value}`;
  return /^255[67]\d{8}$/.test(value) ? value : null;
}

export async function readRecipientImportFile(file: File): Promise<RecipientImportRow[]> {
  const fileBuffer = await file.arrayBuffer();
  const workbook = XLSX.read(fileBuffer, { type: "array" });
  const firstSheetName = workbook.SheetNames[0];
  if (!firstSheetName) throw new Error("Excel file has no worksheet.");
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) throw new Error("The worksheet could not be read.");

  const rawRows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, { defval: "", raw: false });
  return rawRows
    .map((row, index) => ({
      rowNumber: index + 2,
      fullName: textValue(getCellValue(row, ["Full Name", "Name", "Guest Name"])),
      phone: textValue(getCellValue(row, ["Phone", "Phone Number", "Mobile"])),
    }))
    .filter((row) => Boolean(row.fullName || row.phone));
}

export function downloadRecipientImportTemplate(campaignName?: string) {
  const workbook = XLSX.utils.book_new();
  const sampleRows = [
    { "Full Name": "John Peter", Phone: "0712345678" },
    { "Full Name": "Mary Joseph", Phone: "0754321098" },
  ];
  const worksheet = XLSX.utils.json_to_sheet(sampleRows);
  worksheet["!cols"] = [{ wch: 28 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(workbook, worksheet, "Recipients");
  const filePrefix = campaignName ? campaignName.trim().replace(/[<>:"/\\|?*]/g, "").replace(/\s+/g, "_") : "SMS_Outreach";
  XLSX.writeFile(workbook, `${filePrefix}_Recipients_Template.xlsx`, { compression: true });
}

export function validateRecipientRows(rows: RecipientImportRow[]): RecipientImportValidation {
  const errors: RecipientImportError[] = [];
  const normalizedRows: RecipientImportRow[] = [];
  const seenPhones = new Set<string>();

  for (const row of rows) {
    const fullName = row.fullName.trim();
    const phone = row.phone.trim();
    const normalizedRow: RecipientImportRow = { rowNumber: row.rowNumber, fullName, phone };

    if (!fullName) errors.push({ rowNumber: row.rowNumber, field: "Full Name", message: "Full name is required." });
    if (!phone) {
      errors.push({ rowNumber: row.rowNumber, field: "Phone", message: "Phone is required -- a recipient can't be sent an SMS without one." });
    } else {
      const normalizedPhone = normalizeRecipientPhone(phone);
      if (!normalizedPhone) {
        errors.push({ rowNumber: row.rowNumber, field: "Phone", message: "Phone number is not a valid Tanzanian number." });
      } else if (seenPhones.has(normalizedPhone)) {
        errors.push({ rowNumber: row.rowNumber, field: "Phone", message: "This phone number is duplicated within the file." });
      } else {
        seenPhones.add(normalizedPhone);
      }
    }

    normalizedRows.push(normalizedRow);
  }

  const rowsWithErrors = new Set(errors.map((error) => error.rowNumber));
  return {
    validRows: normalizedRows.filter((row) => !rowsWithErrors.has(row.rowNumber)),
    invalidRows: normalizedRows.filter((row) => rowsWithErrors.has(row.rowNumber)),
    errors,
  };
}
