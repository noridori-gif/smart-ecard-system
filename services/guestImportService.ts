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

function generateRandomCode(length = 6) {
  const characters = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let result = "";

  for (let index = 0; index < length; index += 1) {
    const randomIndex = Math.floor(
      Math.random() * characters.length
    );

    result += characters[randomIndex];
  }

  return result;
}

function generateEventPassId(
  existingEventPassIds: Set<string>
) {
  let eventPassId = "";

  do {
    eventPassId = `SEP-${generateRandomCode(6)}`;
  } while (existingEventPassIds.has(eventPassId));

  existingEventPassIds.add(eventPassId);

  return eventPassId;
}

export function downloadGuestImportTemplate(
  eventTitle?: string
) {
  const workbook = XLSX.utils.book_new();

  const sampleRows = [
    {
      "Full Name": "John Peter",
      Phone: "0712345678",
      Email: "",
      Category: "",
      "Allowed Guests": "",
      "Event Pass ID": "",
    },
    {
      "Full Name": "Mary Joseph",
      Phone: "0754321098",
      Email: "mary@example.com",
      Category: "VIP",
      "Allowed Guests": 2,
      "Event Pass ID": "SEP-VIP002",
    },
  ];

  const instructionsRows = [
    {
      Field: "Full Name",
      Required: "Yes",
      Instructions:
        "Jina la mgeni lazima liwepo.",
      Default: "-",
      Example: "John Peter",
    },
    {
      Field: "Phone",
      Required: "No",
      Instructions:
        "Inaweza kuachwa wazi. Ikiwepo, iwe namba sahihi.",
      Default: "Blank",
      Example: "0712345678",
    },
    {
      Field: "Email",
      Required: "No",
      Instructions:
        "Inaweza kuachwa wazi. Ikiwepo, iwe email sahihi.",
      Default: "Blank",
      Example: "john@example.com",
    },
    {
      Field: "Category",
      Required: "No",
      Instructions:
        "Mfano Normal, VIP, Family au Special Guest.",
      Default: "Normal",
      Example: "VIP",
    },
    {
      Field: "Allowed Guests",
      Required: "No",
      Instructions:
        "Lazima iwe namba kuanzia 1 ikiwa imejazwa.",
      Default: "1",
      Example: "2",
    },
    {
      Field: "Event Pass ID",
      Required: "No",
      Instructions:
        "Ikiwa wazi, mfumo utatengeneza automatically.",
      Default: "Auto-generated",
      Example: "SEP-ABC123",
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
    { wch: 62 },
    { wch: 20 },
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
    ([key, value]) =>
      [normalizeHeader(key), value] as const
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
  if (
    value === null ||
    value === undefined ||
    String(value).trim() === ""
  ) {
    return 0;
  }

  const convertedNumber = Number(value);

  if (!Number.isFinite(convertedNumber)) {
    return 0;
  }

  return Math.trunc(convertedNumber);
}

function normalizePhone(phone: string) {
  return phone
    .trim()
    .replace(/\s+/g, "")
    .replace(/[()-]/g, "");
}

function isValidPhone(phone: string) {
  if (!phone) {
    return true;
  }

  const normalizedPhone =
    normalizePhone(phone).replace(/^\+/, "");

  return /^\d{7,15}$/.test(normalizedPhone);
}

function isValidEmail(email: string) {
  if (!email) {
    return true;
  }

  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidEventPassId(eventPassId: string) {
  if (!eventPassId) {
    return true;
  }

  return /^[A-Z0-9-]{4,30}$/.test(eventPassId);
}

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

      const phone = normalizePhone(
        textValue(
          getCellValue(row, [
            "Phone",
            "Phone Number",
            "Mobile",
          ])
        )
      );

      const email = textValue(
        getCellValue(row, ["Email"])
      ).toLowerCase();

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
    .filter((row) =>
      Boolean(
        row.fullName ||
          row.phone ||
          row.email ||
          row.category ||
          row.eventPassId
      )
    );
}

export function validateGuestImportRows(
  rows: GuestImportRow[]
): GuestImportValidationResult {
  const errors: GuestImportError[] = [];

  const normalizedRows: GuestImportRow[] = [];

  const eventPassIds = new Set<string>();
  const phones = new Set<string>();

  for (const row of rows) {
    const normalizedRow: GuestImportRow = {
      rowNumber: row.rowNumber,
      fullName: row.fullName.trim(),
      phone: normalizePhone(row.phone),
      email: row.email.trim().toLowerCase(),
      category: row.category.trim() || "Normal",
      allowedGuests:
        row.allowedGuests >= 1
          ? row.allowedGuests
          : 1,
      eventPassId: row.eventPassId
        .trim()
        .toUpperCase(),
    };

    if (!normalizedRow.fullName) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "Full Name",
        message: "Jina la mgeni linahitajika.",
      });
    }

    if (
      normalizedRow.phone &&
      !isValidPhone(normalizedRow.phone)
    ) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "Phone",
        message:
          "Namba ya simu si sahihi. Tumia digits 7 hadi 15.",
      });
    }

    if (
      normalizedRow.email &&
      !isValidEmail(normalizedRow.email)
    ) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "Email",
        message: "Email address si sahihi.",
      });
    }

    if (
      row.allowedGuests !== 0 &&
      row.allowedGuests < 1
    ) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "Allowed Guests",
        message:
          "Allowed Guests lazima iwe 1 au zaidi.",
      });
    }

    if (
      normalizedRow.eventPassId &&
      !isValidEventPassId(
        normalizedRow.eventPassId
      )
    ) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "Event Pass ID",
        message:
          "Event Pass ID itumie herufi, namba na dash pekee.",
      });
    }

    if (!normalizedRow.eventPassId) {
      normalizedRow.eventPassId =
        generateEventPassId(eventPassIds);
    } else if (
      eventPassIds.has(
        normalizedRow.eventPassId
      )
    ) {
      errors.push({
        rowNumber: row.rowNumber,
        field: "Event Pass ID",
        message:
          "Event Pass ID imejirudia ndani ya Excel.",
      });
    } else {
      eventPassIds.add(
        normalizedRow.eventPassId
      );
    }

    if (normalizedRow.phone) {
      if (phones.has(normalizedRow.phone)) {
        errors.push({
          rowNumber: row.rowNumber,
          field: "Phone",
          message:
            "Namba ya simu imejirudia ndani ya Excel.",
        });
      } else {
        phones.add(normalizedRow.phone);
      }
    }

    normalizedRows.push(normalizedRow);
  }

  const rowsWithErrors = new Set(
    errors.map((error) => error.rowNumber)
  );

  const validRows = normalizedRows.filter(
    (row) => !rowsWithErrors.has(row.rowNumber)
  );

  const invalidRows = normalizedRows.filter(
    (row) => rowsWithErrors.has(row.rowNumber)
  );

  return {
    validRows,
    invalidRows,
    errors,
  };
}