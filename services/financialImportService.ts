import * as XLSX from "xlsx";

export type FinancialImportRow = {
  rowNumber: number;
  fullName: string;
  phone: string;
  email: string;
  category: string;
  pledgedAmount: string;
  paidAmount: string;
  notes: string;
  nameDuplicateAction?: "skip" | "create";
};

export type FinancialImportOptions = {
  includeGuests: boolean;
  createInitialPayments: boolean;
  skipDuplicates: boolean;
};

export type FinancialImportPreviewRow = FinancialImportRow & {
  valid: boolean;
  errors: string[];
  duplicateType: "phone" | "name" | "file_phone" | "file_name" | null;
  duplicateName: string | null;
  guestAction: "create" | "link" | "update" | "none" | "review";
  basisAmount: number;
  guestResult: string;
  cardType: "Single" | "Double" | "None" | "Pending" | "Needs review";
  allowedGuests: number | null;
  existingGuestMatch: string | null;
  guestCandidates: { id: number; fullName: string; phone: string | null }[];
};

export type FinancialImportPreview = {
  rows: FinancialImportPreviewRow[];
  totals: {
    totalRows: number;
    validRows: number;
    invalidRows: number;
    possibleDuplicates: number;
    guestsToCreate: number;
    guestsToLink: number;
    singleGuests: number;
    doubleGuests: number;
    belowMinimum: number;
    needsReview: number;
    pledgesToCreate: number;
    initialPaymentsToRecord: number;
    totalPledged: number;
    totalAlreadyPaid: number;
  };
};

export type FinancialImportResult = {
  importedRows: number;
  skippedRows: number;
  duplicateRows: number;
  failedRows: { rowNumber: number; fullName: string; reason: string }[];
  receipts: { rowNumber: number; receiptNumber: string; verificationUrl: string }[];
};

export const FINANCIAL_IMPORT_HEADERS = [
  "Full Name", "Phone", "Email", "Category", "Pledged Amount", "Paid Amount", "Notes",
] as const;

const text = (value: unknown) => value == null ? "" : String(value).trim();
const header = (value: string) => value.trim().toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ");
function cell(row: Record<string, unknown>, name: string) {
  const wanted = header(name);
  return Object.entries(row).find(([key]) => header(key) === wanted)?.[1];
}
function money(value: unknown) {
  return text(value).replace(/[,\s]/g, "");
}

export async function readFinancialImportFile(file: File): Promise<FinancialImportRow[]> {
  if (!file.name.toLowerCase().endsWith(".xlsx")) throw new Error("Choose an .xlsx Excel file.");
  if (file.size > 5 * 1024 * 1024) throw new Error("Excel file must be 5 MB or smaller.");
  const workbook = XLSX.read(await file.arrayBuffer(), { type: "array" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!sheet) throw new Error("The Excel workbook has no readable worksheet.");
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: "", raw: false });
  const headerRowIndex = matrix.findIndex((row) => row.some((value) => text(value) !== ""));
  const firstPopulatedRow = matrix[headerRowIndex];
  if (!firstPopulatedRow) throw new Error("The Excel worksheet is empty.");
  const suppliedHeaders = new Set(firstPopulatedRow.map((value) => header(text(value))).filter(Boolean));
  const missingHeaders = FINANCIAL_IMPORT_HEADERS.filter((name) => !suppliedHeaders.has(header(name)));
  if (missingHeaders.length) throw new Error(`Missing required column${missingHeaders.length === 1 ? "" : "s"}: ${missingHeaders.join(", ")}.`);
  type WorksheetRow = Record<string, unknown> & { __rowNum__?: number };
  const rows = XLSX.utils.sheet_to_json<WorksheetRow>(sheet, { defval: "", raw: false, range: headerRowIndex })
    .filter((row) => Object.values(row).some((value) => text(value) !== ""));
  if (rows.length > 2_000) throw new Error("A single import is limited to 2,000 rows.");
  return rows.map((row, index) => ({
    rowNumber: typeof row.__rowNum__ === "number" ? row.__rowNum__ + 1 : headerRowIndex + index + 2,
    fullName: text(cell(row, "Full Name")),
    phone: text(cell(row, "Phone")),
    email: text(cell(row, "Email")).toLowerCase(),
    category: text(cell(row, "Category")) || "Normal",
    pledgedAmount: money(cell(row, "Pledged Amount")),
    paidAmount: money(cell(row, "Paid Amount")) || "0",
    notes: text(cell(row, "Notes")),
  }));
}

export function downloadFinancialImportTemplate() {
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.aoa_to_sheet([
    [...FINANCIAL_IMPORT_HEADERS],
    ["Amina Juma", "0712345678", "amina@example.com", "VIP", "250000", "50000", "Opening contribution"],
  ]);
  sheet["!cols"] = [{ wch: 28 }, { wch: 18 }, { wch: 30 }, { wch: 18 }, { wch: 20 }, { wch: 18 }, { wch: 40 }];
  XLSX.utils.book_append_sheet(book, sheet, "Contributions");
  XLSX.writeFile(book, "Smart_Event_Pass_Financial_Import.xlsx", { compression: true });
}

export function downloadFinancialImportErrors(result: FinancialImportResult) {
  if (!result.failedRows.length) throw new Error("There are no failed rows to download.");
  const book = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(result.failedRows.map((row) => ({
    "Excel Row": row.rowNumber, "Full Name": row.fullName, Reason: row.reason,
  })));
  sheet["!cols"] = [{ wch: 14 }, { wch: 30 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(book, sheet, "Import Errors");
  XLSX.writeFile(book, "Financial_Import_Errors.xlsx", { compression: true });
}
