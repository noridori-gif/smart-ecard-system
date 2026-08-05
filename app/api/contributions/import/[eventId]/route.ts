import {
  authenticatedFinanceClient, bearerToken, generateReceiptToken, hashOrganiserToken,
  noStoreHeaders, sameOrigin,
} from "@/lib/financePortalServer";
import { normalizeTanzanianPhone } from "@/services/pledgeMessageService";
import type { FinancialImportOptions, FinancialImportRow } from "@/services/financialImportService";
import { serviceDatabase } from "@/lib/makeConnectorServer";
import { processWorkflowByIdempotencyKey } from "@/services/financialWorkflowProcessor";

const moneyPattern = /^\d+(\.\d{1,2})?$/;
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const cleanName = (value: string) => value.trim().toLocaleLowerCase().replace(/\s+/g, " ");
function normalizedPhone(value: string) {
  if (!value.trim()) return null;
  try { return normalizeTanzanianPhone(value); } catch { return null; }
}
function response(data: unknown, status = 200) {
  return Response.json(data, { status, headers: noStoreHeaders });
}

export async function POST(request: Request, context: { params: Promise<{ eventId: string }> }) {
  if (!sameOrigin(request)) return response({ error: "Origin not allowed." }, 403);
  const token = bearerToken(request);
  if (!token) return response({ error: "Not authorized." }, 401);
  const eventId = Number((await context.params).eventId);
  if (!Number.isInteger(eventId) || eventId <= 0) return response({ error: "Invalid event." }, 400);
  const client = authenticatedFinanceClient(token);
  const { data: auth } = await client.auth.getUser(token);
  if (!auth.user) return response({ error: "Not authorized." }, 401);
  const { data: profile } = await client.from("profiles").select("role,is_active").eq("id", auth.user.id).maybeSingle();
  if (!profile?.is_active || !["admin", "administrator", "organizer"].includes(profile.role)) {
    return response({ error: "Financial imports are restricted to authorized administrators and event organizers." }, 403);
  }
  const { data: authorized } = await client.rpc("can_manage_event_finance", { target_event_id: eventId });
  if (!authorized) return response({ error: "You cannot manage this event." }, 403);

  const body = await request.json().catch(() => null) as {
    action?: string; rows?: FinancialImportRow[]; options?: FinancialImportOptions; fileName?: string;
  } | null;
  if (!body || !Array.isArray(body.rows) || body.rows.length === 0 || body.rows.length > 2_000) {
    return response({ error: "Import rows are missing or exceed the 2,000-row limit." }, 400);
  }
  const options: FinancialImportOptions = {
    includeGuests: body.options?.includeGuests === true,
    createInitialPayments: body.options?.createInitialPayments === true,
    skipDuplicates: body.options?.skipDuplicates !== false,
  };
  const rows = body.rows.map((row) => ({
    rowNumber: Number(row.rowNumber), fullName: String(row.fullName ?? "").trim(),
    phone: String(row.phone ?? "").trim(), email: String(row.email ?? "").trim().toLowerCase(),
    category: String(row.category ?? "").trim() || "Normal",
    pledgedAmount: String(row.pledgedAmount ?? "").replace(/[,\s]/g, ""),
    paidAmount: String(row.paidAmount ?? "0").replace(/[,\s]/g, "") || "0",
    notes: String(row.notes ?? "").trim(), nameDuplicateAction: row.nameDuplicateAction,
  }));

  if (body.action === "preview") {
    const [{ data: guests, error: guestError }, { data: pledges, error: pledgeError }, { data: setting, error: settingError }] = await Promise.all([
      client.from("guests").select("id,full_name,phone,allowed_guests").eq("event_id", eventId),
      client.from("event_pledges").select("id,full_name,normalized_phone,guest_id").eq("event_id", eventId).is("cancelled_at", null),
      client.from("event_contributor_guest_settings").select("*").eq("event_id", eventId).maybeSingle(),
    ]);
    if (guestError || pledgeError || settingError) return response({ error: guestError?.message || pledgeError?.message || settingError?.message }, 400);
    type GuestMatch = { id: number; full_name: string; phone: string | null; allowed_guests: number };
    type PledgeMatch = { id: number; full_name: string; normalized_phone: string | null; guest_id: number | null };
    const guestRows = (guests ?? []) as GuestMatch[];
    const pledgeRows = (pledges ?? []) as PledgeMatch[];
    const guestPhones = new Map<string, GuestMatch[]>(guestRows.flatMap((guest) => {
      const phone = normalizedPhone(guest.phone ?? "");
      return phone ? [[phone, guestRows.filter((item) => normalizedPhone(item.phone ?? "") === phone)] as const] : [];
    }));
    const guestNames = new Map<string, GuestMatch[]>(guestRows.map((guest) => [cleanName(guest.full_name), guestRows.filter((item) => cleanName(item.full_name) === cleanName(guest.full_name))] as const));
    const pledgePhones = new Map<string, PledgeMatch>(pledgeRows.flatMap((pledge) =>
      pledge.normalized_phone ? [[pledge.normalized_phone, pledge] as const] : []));
    const seenPhones = new Set<string>();
    const seenPhoneLessNames = new Set<string>();
    const previewRows = rows.map((row) => {
      const errors: string[] = [];
      const phone = normalizedPhone(row.phone);
      if (!row.fullName) errors.push("Full Name is required.");
      if (row.phone && !phone) errors.push("Phone must be a valid Tanzanian mobile number.");
      if (row.email && !emailPattern.test(row.email)) errors.push("Email is invalid.");
      if (!moneyPattern.test(row.pledgedAmount) || Number(row.pledgedAmount) <= 0) errors.push("Pledged Amount must be greater than zero.");
      if (!moneyPattern.test(row.paidAmount) || Number(row.paidAmount) < 0) errors.push("Paid Amount is invalid.");
      if (Number(row.paidAmount) > Number(row.pledgedAmount)) errors.push("Paid Amount cannot exceed Pledged Amount.");
      let duplicateType: "phone" | "name" | "file_phone" | "file_name" | null = null;
      let duplicateName: string | null = null;
      if (phone && seenPhones.has(phone)) { duplicateType = "file_phone"; duplicateName = "another Excel row"; }
      else if (phone && pledgePhones.has(phone)) { duplicateType = "phone"; duplicateName = pledgePhones.get(phone)?.full_name ?? null; }
      else if (!phone && seenPhoneLessNames.has(cleanName(row.fullName))) {
        duplicateType = "file_name"; duplicateName = "another Excel row";
      }
      else if (!phone && ((options.includeGuests && guestNames.has(cleanName(row.fullName))) || pledgeRows.some((p) => cleanName(p.full_name) === cleanName(row.fullName)))) {
        duplicateType = "name"; duplicateName = (options.includeGuests ? guestNames.get(cleanName(row.fullName))?.[0]?.full_name : null) ?? row.fullName;
      }
      if (phone) seenPhones.add(phone);
      else if (row.fullName) seenPhoneLessNames.add(cleanName(row.fullName));
      const linkedGuest = phone ? guestPhones.get(phone) : undefined;
      const candidates = linkedGuest ?? (!phone ? guestNames.get(cleanName(row.fullName)) ?? [] : []);
      const basis = setting?.classification_basis === "pledged_amount"
        ? Number(row.pledgedAmount) : options.createInitialPayments ? Number(row.paidAmount) : 0;
      const singleMinimum = Number(setting?.single_card_minimum ?? 50000);
      const doubleMinimum = Number(setting?.double_card_minimum ?? 120000);
      const allowedGuests = basis >= doubleMinimum ? 2 : basis >= singleMinimum ? 1 : null;
      const ambiguous = candidates.length > 1;
      const existingGuest = candidates.length === 1 ? candidates[0] : undefined;
      const cardType = ambiguous ? "Needs review" : allowedGuests === 2 ? "Double" : allowedGuests === 1 ? "Single"
        : setting?.below_minimum_behavior === "pending_guest" ? "Pending" : "None";
      const guestResult = !options.includeGuests ? "Guest sync not selected"
        : ambiguous ? "Needs review"
        : !allowedGuests ? (setting?.below_minimum_behavior === "pending_guest" ? "Pending guest" : "Below minimum — no guest")
        : existingGuest ? existingGuest.allowed_guests < allowedGuests ? `Upgrade to ${cardType}` : "Existing classification unchanged"
        : `Create ${cardType} Guest`;
      return {
        ...row, valid: errors.length === 0, errors, duplicateType, duplicateName,
        guestAction: options.includeGuests ? ambiguous ? "review" : existingGuest ? "link" : allowedGuests ? "create" : "none" : "none",
        basisAmount: basis, guestResult, cardType, allowedGuests,
        existingGuestMatch: existingGuest?.full_name ?? null,
        guestCandidates: candidates.map((guest) => ({ id: guest.id, fullName: guest.full_name, phone: guest.phone })),
      };
    });
    const actionable = previewRows.filter((row) =>
      row.valid
      && !["phone", "file_phone"].includes(row.duplicateType ?? "")
      && !(["name", "file_name"].includes(row.duplicateType ?? "") && !row.nameDuplicateAction)
      && row.nameDuplicateAction !== "skip"
    );
    return response({ rows: previewRows, totals: {
      totalRows: previewRows.length, validRows: previewRows.filter((r) => r.valid).length,
      invalidRows: previewRows.filter((r) => !r.valid).length,
      possibleDuplicates: previewRows.filter((r) => r.duplicateType !== null).length,
      guestsToCreate: actionable.filter((r) => r.guestAction === "create").length,
      guestsToLink: actionable.filter((r) => r.guestAction === "link").length,
      singleGuests: actionable.filter((r) => r.allowedGuests === 1).length,
      doubleGuests: actionable.filter((r) => r.allowedGuests === 2).length,
      belowMinimum: actionable.filter((r) => r.allowedGuests === null && r.cardType !== "Needs review").length,
      needsReview: previewRows.filter((r) => r.cardType === "Needs review").length,
      pledgesToCreate: actionable.length,
      initialPaymentsToRecord: options.createInitialPayments ? actionable.filter((r) => Number(r.paidAmount) > 0).length : 0,
      totalPledged: actionable.reduce((sum, r) => sum + Number(r.pledgedAmount), 0),
      totalAlreadyPaid: options.createInitialPayments ? actionable.reduce((sum, r) => sum + Number(r.paidAmount), 0) : 0,
    } });
  }
  if (body.action !== "import") return response({ error: "Unsupported import action." }, 400);
  const rowsWithTokens = rows.map((row) => {
    const raw = options.createInitialPayments && Number(row.paidAmount) > 0 ? generateReceiptToken() : null;
    return { ...row, receiptToken: raw, receiptTokenHash: raw ? hashOrganiserToken(raw) : null };
  });
  const { data, error } = await client.rpc("import_event_financial_rows_with_guest_sync", {
    target_event_id: eventId,
    import_rows: rowsWithTokens.map((row) => ({
      rowNumber: row.rowNumber, fullName: row.fullName, phone: row.phone, email: row.email,
      category: row.category, pledgedAmount: row.pledgedAmount, paidAmount: row.paidAmount,
      notes: row.notes, nameDuplicateAction: row.nameDuplicateAction,
      receiptTokenHash: row.receiptTokenHash,
    })),
    include_guests: options.includeGuests,
    create_initial_payments: options.createInitialPayments,
    skip_duplicates: options.skipDuplicates,
    source_file_name: String(body.fileName ?? "Excel Import").slice(0, 255),
  });
  if (error) return response({ error: error.message }, 400);
  const result = data as { receipts?: { rowNumber: number; receiptNumber: string }[] } & Record<string, unknown>;
  const origin = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || new URL(request.url).origin;
  const acknowledgementResults:{status:string;message:string}[]=[];
  try{const db=serviceDatabase(),receipts=(result.receipts??[]).slice(0,100),numbers=receipts.map(item=>item.receiptNumber);if(numbers.length){const {data:payments}=await db.from("pledge_payments").select("id,receipt_number").in("receipt_number",numbers);for(const payment of payments??[])acknowledgementResults.push(await processWorkflowByIdempotencyKey(db,`payment-message:${payment.id}`,origin));}}catch{}
  return response({
    ...result,
    acknowledgementProcessing:{processed:acknowledgementResults.length,sent:acknowledgementResults.filter(item=>item.status==="sent").length,queued:acknowledgementResults.filter(item=>item.status!=="sent").length,limited:(result.receipts?.length??0)>100},
    receipts: (result.receipts ?? []).map((receipt) => ({
      ...receipt,
      verificationUrl: `${origin}/r/${rowsWithTokens.find((row) => row.rowNumber === receipt.rowNumber)?.receiptToken ?? ""}`,
    })),
  }, 201);
}
