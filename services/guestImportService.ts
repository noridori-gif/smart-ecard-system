import * as XLSX from "xlsx";

export type GuestImportRow = {
  rowNumber: number;
  fullName: string;
  phone: string;
  email: string;
  category: string;
  allowedGuests: number;
  eventPassId: string;
};

export type GuestImportError = {
  rowNumber: number;
  field: string;
  message: string;
};

export type GuestImportValidationResult = {
  validRows: GuestImportRow[];
  invalidRows: GuestImportRow[];
  errors: GuestImportError[];
};

export const GUEST_IMPORT_HEADERS = [
  "Full Name",
  "Phone",
  "Email",
  "Category",
  "Allowed Guests",
  "Event Pass ID",
] as const;

function sanitizeFileName(value: string) {
  return value
    .trim()
    .replace(/[<>:"/\\|?*]/g, "")
    .replace(/\s+/g, "_");
}

/**
 * Inatengeneza na kupakua Excel template
 * ya kuingiza guests wengi kwa pamoja.
 */
export function downloadGuestImportTemplate(
  eventTitle?: string
) {
  const workbook = XLSX.utils.book_new();

  const sampleRows = [
    {
      "Full Name": "John Peter",
      Phone: "0712345678",
      Email: "john@example.com",
      Category: "Normal",
      "Allowed Guests": 1,
      "Event Pass ID": "SEP-000001",
    },
    {
      "Full Name": "Mary Joseph",
      Phone: "0754321098",
      Email: "",
      Category: "VIP",
      "Allowed Guests": 2,
      "Event Pass ID": "SEP-VIP-002",
    },
  ];

  const instructionsRows = [
    {
      Field: "Full Name",
      Required: "Yes",
      Instructions:
        "Andika jina kamili la mgeni.",
      Example: "John Peter",
    },
    {
      Field: "Phone",
      Required: "Yes",
      Instructions:
        "Andika namba ya simu. Mfano 0712345678 au 255712345678.",
      Example: "0712345678",
    },
    {
      Field: "Email",
      Required: "No",
      Instructions:
        "Email inaweza kuachwa wazi.",
      Example: "john@example.com",
    },
    {
      Field: "Category",
      Required: "No",
      Instructions:
        "Mfano Normal, VIP, Family au Special Guest.",
      Example: "Normal",
    },
    {
      Field: "Allowed Guests",
      Required: "Yes",
      Instructions:
        "Lazima iwe namba kamili kuanzia 1.",
      Example: "1",
    },
    {
      Field: "Event Pass ID",
      Required: "Yes",
      Instructions:
        "Lazima iwe ya kipekee. Format inayopendekezwa ni SEP-000001.",
      Example: "SEP-000001",
    },
  ];

  const guestWorksheet =
    XLSX.utils.json_to_sheet(sampleRows);

  guestWorksheet["!cols"] = [
    { wch: 28 },
    { wch: 18 },
    { wch: 30 },
    { wch: 18 },
    { wch: 18 },
    { wch: 20 },
  ];

  const instructionsWorksheet =
    XLSX.utils.json_to_sheet(instructionsRows);

  instructionsWorksheet["!cols"] = [
    { wch: 22 },
    { wch: 12 },
    { wch: 60 },
    { wch: 25 },
  ];

  XLSX.utils.book_append_sheet(
    workbook,
    guestWorksheet,
    "Guest Import"
  );

  XLSX.utils.book_append_sheet(
    workbook,
    instructionsWorksheet,
    "Instructions"
  );

  const filePrefix = eventTitle
    ? sanitizeFileName(eventTitle)
    : "Smart_Event_Pass";

  const fileName =
    `${filePrefix}_Guest_Import_Template.xlsx`;

  XLSX.writeFile(workbook, fileName, {
    compression: true,
  });
}

/**
 * Inasafisha jina la column ili Excel yenye
 * tofauti ndogo za spacing bado iweze kusomeka.
 */
function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function getCellValue(
  row: Record<string, unknown>,
  possibleHeaders: string[]
) {
  const normalizedEntries = Object.entries(row).map(
    ([key, value]) => [
      normalizeHeader(key),
      value,
    ] as const
  );

  for (const possibleHeader of possibleHeaders) {
    const normalizedHeader =
      normalizeHeader(possibleHeader);

    const matchingEntry = normalizedEntries.find(
      ([key]) => key === normalizedHeader
    );

    if (matchingEntry) {
      return matchingEntry[1];
    }
  }

  return undefined;
}

function textValue(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function numberValue(value: unknown) {
  const convertedNumber = Number(value);

  if (!Number.isFinite(convertedNumber)) {
    return 0;
  }

  return Math.trunc(convertedNumber);
}

/**
 * Inasoma file ya Excel na kuigeuza kuwa rows
 * zitakazotumika kwenye preview na validation.
 */
export async function readGuestImportFile(
  file: File
): Promise<GuestImportRow[]> {
  const fileBuffer = await file.arrayBuffer();

  const workbook = XLSX.read(fileBuffer, {
    type: "array",
  });

  const firstSheetName = workbook.SheetNames[0];

  if (!firstSheetName) {
    throw new Error(
      "Excel file haina worksheet."
    );
  }

  const worksheet =
    workbook.Sheets[firstSheetName];

  const rawRows =
    XLSX.utils.sheet_to_json<
      Record<string, unknown>
    >(worksheet, {
      defval: "",
      raw: false,
    });

  return rawRows
    .map((row, index) => {
      const fullName = textValue(
        getCellValue(row, [
          "Full Name",
          "Name",
          "Guest Name",
        ])
      );

      const phone = textValue(
        getCellValue(row, [
          "Phone",
          "Phone Number",
          "Mobile",
        ])
      );

      const email = textValue(
        getCellValue(row, ["Email"])
      );

      const category = textValue(
        getCellValue(row, [
          "Category",
          "Guest Category",
        ])
      );

      const allowedGuests = numberValue(
        getCellValue(row, [
          "Allowed Guests",
          "Allowed Guest",
          "Number of Guests",
        ])
      );

      const eventPassId = textValue(
        getCellValue(row, [
          "Event Pass ID",
          "Event Pass",
          "Pass ID",
        ])
      ).toUpperCase();

      return {
        rowNumber: index + 2,
        fullName,
        phone,
        email,
        category,
        allowedGuests,
        eventPassId,
      };
    })
    .filter((row) => {
      return Boolean(
        row.fullName ||
          row.phone ||
          row.email ||
          row.category ||
          row.eventPassId
      );
    });
}