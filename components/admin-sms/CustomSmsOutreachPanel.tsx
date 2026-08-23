"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { pdf } from "@react-pdf/renderer";
import Button from "@/components/ui/Button";
import MessagePreviewDialog from "@/components/financial-suite/reminders/MessagePreviewDialog";
import CustomSmsOutreachReportPDF from "@/components/admin-sms/CustomSmsOutreachReportPDF";
import { analyzeSms, CUSTOM_SMS_TEMPLATE_PLACEHOLDERS, renderCustomSmsTemplate, type PledgeMessageValues } from "@/services/pledgeMessageService";
import {
  downloadRecipientImportTemplate,
  readRecipientImportFile,
  validateRecipientRows,
  type RecipientImportError,
  type RecipientImportRow,
  type RecipientImportValidation,
} from "@/services/customSmsRecipientImportService";
import {
  addRecipient,
  listCampaigns,
  listDeliveries,
  listRecipients,
  previewCampaign,
  saveCampaign,
  sendCampaign,
  uploadRecipients,
  type CustomSmsCampaign,
  type CustomSmsDeliveryRow,
  type CustomSmsPreview,
  type CustomSmsRecipientListRow,
  type CustomSmsRecipientRow,
} from "@/services/customSmsCampaignClientService";

const DEFAULT_TEMPLATE = `Habari Ndugu {name}
Hongera na pole kwa majukumu.
Familia ya Dr. Godwin Munuo na Dr. Lucy Shirima kwa kushirikiana Kamati ya Harusi ya
Dr. Elia Godwin Munuo.
Kwa upendo tunakukumbusha kuwa tumebakiwa na siku {days_left} tu kuelekea kilele tarehe 17/10/2026, hivyo tunaomba mchango wako ili tushirikiane pamoja.
Tuma Mchango wako kupitia:
0766960140 (M-PESA) - Dkt. Godwin Munuo
0786497230 (AIRTEL)- Dkt. Lucy Shirima
0772792088 (MIX BY YAS)- Dkt. Elia Munuo
0152843349600 (CRDB Akaunti) - Elisha Munuo
MUNGU AKUBARIKI
AHSANTE SANA`;

const skipLabels: Record<string, string> = {
  provider_unavailable: "Provider Unavailable",
  already_sent: "Already Sent",
  in_progress: "In Progress",
};

function statusBadgeStyle(value: string) {
  const lower = value.toLowerCase();
  if (lower.includes("failed") || lower.includes("invalid")) return "bg-red-50 text-red-700";
  if (lower.includes("sent") || lower.includes("ready")) return "bg-emerald-50 text-emerald-700";
  if (lower.includes("missing") || lower.includes("provider") || lower.includes("progress")) return "bg-amber-50 text-amber-800";
  return "bg-stone-100 text-slate-700";
}

function Badge({ value }: { value: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${statusBadgeStyle(value)}`}>{value}</span>;
}

export default function CustomSmsOutreachPanel({
  eventId,
  eventTitle,
  eventDate,
}: {
  eventId: number;
  eventTitle: string;
  eventDate: string;
}) {
  const [campaigns, setCampaigns] = useState<CustomSmsCampaign[]>([]);
  const [campaignId, setCampaignId] = useState<number | null>(null);
  const [name, setName] = useState(`${eventTitle} outreach`);
  const [template, setTemplate] = useState(DEFAULT_TEMPLATE);
  const [templateDirty, setTemplateDirty] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileRows, setFileRows] = useState<RecipientImportRow[]>([]);
  const [fileValidation, setFileValidation] = useState<RecipientImportValidation | null>(null);
  const [fileName, setFileName] = useState("");

  const [manualName, setManualName] = useState("");
  const [manualPhone, setManualPhone] = useState("");
  const [manualErrors, setManualErrors] = useState<RecipientImportError[]>([]);

  const [recipients, setRecipients] = useState<CustomSmsRecipientListRow[]>([]);
  const [selectedRecipientIds, setSelectedRecipientIds] = useState<Set<number>>(new Set());
  const [recipientQuery, setRecipientQuery] = useState("");

  const [preview, setPreview] = useState<CustomSmsPreview | null>(null);
  const [previewRow, setPreviewRow] = useState<CustomSmsRecipientRow | null>(null);
  const [confirmed, setConfirmed] = useState(false);

  const [deliveries, setDeliveries] = useState<CustomSmsDeliveryRow[] | null>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [warning, setWarning] = useState("");

  const loadCampaigns = useCallback(async () => {
    const rows = await listCampaigns(eventId);
    setCampaigns(rows);
    return rows;
  }, [eventId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadCampaigns().catch((err) => setError(err instanceof Error ? err.message : "Campaigns could not be loaded."));
    }, 0);
    return () => clearTimeout(timer);
  }, [loadCampaigns]);

  const loadRecipients = useCallback(async (id: number) => {
    setRecipients(await listRecipients(id));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (campaignId) void loadRecipients(campaignId).catch((err) => setError(err instanceof Error ? err.message : "Recipients could not be loaded."));
      else setRecipients([]);
    }, 0);
    return () => clearTimeout(timer);
  }, [campaignId, loadRecipients]);

  function chooseCampaign(id: number | null) {
    setCampaignId(id);
    setPreview(null);
    setConfirmed(false);
    setSelectedRecipientIds(new Set());
    resetFileState();
    setManualName("");
    setManualPhone("");
    setManualErrors([]);
    if (id === null) {
      setName(`${eventTitle} outreach`);
      setTemplate(DEFAULT_TEMPLATE);
      setTemplateDirty(false);
      return;
    }
    const campaign = campaigns.find((item) => item.id === id);
    if (campaign) {
      setName(campaign.name);
      setTemplate(campaign.message_template);
      setTemplateDirty(false);
    }
  }

  function updateTemplate(value: string) {
    setTemplate(value);
    setTemplateDirty(true);
    setPreview(null);
    setConfirmed(false);
  }

  function insertPlaceholder(token: string) {
    const el = textareaRef.current;
    const start = el?.selectionStart ?? template.length;
    const end = el?.selectionEnd ?? template.length;
    const next = `${template.slice(0, start)}{${token}}${template.slice(end)}`;
    updateTemplate(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + token.length + 2, start + token.length + 2);
    });
  }

  async function persistCampaign() {
    if (!name.trim()) {
      setError("Campaign name is required.");
      return null;
    }
    if (!template.trim()) {
      setError("Message template is required.");
      return null;
    }
    try {
      setBusy(true);
      setError("");
      const saved = await saveCampaign({ eventId, name: name.trim(), messageTemplate: template, campaignId: campaignId ?? undefined });
      await loadCampaigns();
      setCampaignId(saved.id);
      setTemplateDirty(false);
      setNotice(campaignId ? "Template updated." : "Campaign saved -- you can now upload recipients below.");
      return saved;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Template could not be saved.");
      return null;
    } finally {
      setBusy(false);
    }
  }

  function resetFileState() {
    setFileRows([]);
    setFileValidation(null);
    setFileName("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setError("");
    setNotice("");
    try {
      const rows = await readRecipientImportFile(file);
      if (!rows.length) throw new Error("The file has no readable recipient rows.");
      setFileRows(rows);
      setFileValidation(validateRecipientRows(rows));
      setFileName(file.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "The file could not be read.");
      resetFileState();
    }
  }

  async function confirmUploadRecipients() {
    if (!campaignId || !fileValidation?.validRows.length) return;
    try {
      setBusy(true);
      setError("");
      const result = await uploadRecipients({ campaignId, rows: fileValidation.validRows });
      setRecipients(result.recipients);
      setNotice(`${result.inserted} recipient${result.inserted === 1 ? "" : "s"} added.${result.duplicates ? ` ${result.duplicates} already in this campaign, skipped.` : ""}`);
      resetFileState();
      setPreview(null);
      setConfirmed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recipients could not be uploaded.");
    } finally {
      setBusy(false);
    }
  }

  async function addManualRecipient() {
    if (!campaignId) return;
    // Same validateRecipientRows() call the Excel path uses, so a bad phone format or empty
    // name is caught here -- before the API is ever hit -- with the identical error text.
    const validation = validateRecipientRows([{ rowNumber: 1, fullName: manualName, phone: manualPhone }]);
    if (validation.errors.length) {
      setManualErrors(validation.errors);
      return;
    }
    setManualErrors([]);
    try {
      setBusy(true);
      setError("");
      const result = await addRecipient({ campaignId, fullName: manualName.trim(), phone: manualPhone.trim() });
      if (result.status === "duplicate") {
        setManualErrors([{ rowNumber: 1, field: "Phone", message: "This number is already in the recipient list for this campaign." }]);
        return;
      }
      if (result.status === "invalid") {
        setManualErrors(result.errors);
        return;
      }
      await loadRecipients(campaignId);
      setNotice(`${manualName.trim()} added to recipients.`);
      setManualName("");
      setManualPhone("");
      setPreview(null);
      setConfirmed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recipient could not be added.");
    } finally {
      setBusy(false);
    }
  }

  const recipientsById = useMemo(() => new Map(recipients.map((recipient) => [recipient.id, recipient])), [recipients]);
  const visibleRecipients = useMemo(
    () => recipients.filter((recipient) => `${recipient.full_name} ${recipient.phone}`.toLowerCase().includes(recipientQuery.toLowerCase())),
    [recipients, recipientQuery]
  );

  function toggleRecipient(id: number) {
    setSelectedRecipientIds((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setPreview(null);
    setConfirmed(false);
  }
  function selectVisible() {
    setSelectedRecipientIds((current) => new Set([...current, ...visibleRecipients.map((recipient) => recipient.id)]));
    setPreview(null);
    setConfirmed(false);
  }
  function selectAll() {
    setSelectedRecipientIds(new Set(recipients.map((recipient) => recipient.id)));
    setPreview(null);
    setConfirmed(false);
  }
  function clearSelection() {
    setSelectedRecipientIds(new Set());
    setPreview(null);
    setConfirmed(false);
  }

  const sampleValues: PledgeMessageValues = useMemo(
    () => ({ guestName: "Jane Doe", eventTitle, pledgedAmount: "0", totalPaid: "0", balance: "0", eventDate }),
    [eventTitle, eventDate]
  );
  const templatePreview = template.trim() ? renderCustomSmsTemplate(template, sampleValues) : "";
  const templateAnalysis = analyzeSms(templatePreview);

  async function loadPreview() {
    let activeCampaignId = campaignId;
    if (!activeCampaignId || templateDirty) {
      const saved = await persistCampaign();
      if (!saved) return;
      activeCampaignId = saved.id;
    }
    if (!selectedRecipientIds.size) {
      setError("Select at least one recipient.");
      return;
    }
    try {
      setBusy(true);
      setError("");
      setWarning("");
      const result = await previewCampaign({ campaignId: activeCampaignId, recipientIds: [...selectedRecipientIds] });
      setPreview(result);
      setConfirmed(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recipients could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  async function loadDeliveryHistory() {
    try {
      setBusy(true);
      setDeliveries(await listDeliveries(eventId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send history could not be loaded.");
    } finally {
      setBusy(false);
    }
  }

  const campaignDeliveries = useMemo(
    () => (campaignId ? (deliveries ?? []).filter((delivery) => delivery.campaign_id === campaignId) : []),
    [deliveries, campaignId]
  );

  async function downloadReport() {
    const campaign = campaigns.find((item) => item.id === campaignId);
    if (!campaign || !campaignDeliveries.length) return;
    try {
      setBusy(true);
      setError("");
      const sentRows = campaignDeliveries.filter((delivery) => delivery.delivery_status === "sent");
      const failedRows = campaignDeliveries.filter((delivery) => delivery.delivery_status === "failed");
      const latestSentAt = sentRows.map((delivery) => delivery.sent_at).filter((value): value is string => Boolean(value)).sort().at(-1) ?? null;
      const reportSampleValues: PledgeMessageValues = { guestName: "Recipient", eventTitle, pledgedAmount: "0", totalPaid: "0", balance: "0", eventDate };
      const segmentsPerMessage = analyzeSms(renderCustomSmsTemplate(campaign.message_template, reportSampleValues)).segments;
      const blob = await pdf(
        <CustomSmsOutreachReportPDF
          eventTitle={eventTitle}
          campaignName={campaign.name}
          dateSent={latestSentAt}
          totalRecipients={campaignDeliveries.length}
          sentCount={sentRows.length}
          failedCount={failedRows.length}
          segmentsPerMessage={segmentsPerMessage}
          totalSegmentsUsed={segmentsPerMessage * sentRows.length}
          sentRows={sentRows
            .map((delivery) => ({ name: delivery.full_name, phone: delivery.recipient_phone, sentAt: delivery.sent_at }))
            .sort((a, b) => a.name.localeCompare(b.name))}
          failedRows={failedRows.map((delivery) => ({ name: delivery.full_name, phone: delivery.recipient_phone, reason: delivery.error_message ?? "Unknown error" }))}
        />
      ).toBlob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${campaign.name.replace(/\W+/g, "_")}_SMS_Outreach_Report.pdf`;
      anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Report could not be generated.");
    } finally {
      setBusy(false);
    }
  }

  async function send() {
    if (!preview) return;
    try {
      setBusy(true);
      setError("");
      setNotice("");
      setWarning("");
      const result = await sendCampaign({ campaignId: preview.campaign.id, recipientIds: preview.rows.map((row) => row.recipientId) });
      const totals = `${result.sent} sent, ${result.failed} failed, ${result.skipped} skipped.`;
      if (result.failed > 0) setError(`Send result: ${totals} ${result.errors.join(" ")}`);
      else if (result.sent > 0) setNotice(`Send result: ${totals}`);
      else setWarning(`Nothing was sent: ${result.errors.join(" ") || totals}`);
      setConfirmed(false);
      await loadPreview();
      await loadDeliveryHistory();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Send failed.");
      setConfirmed(false);
    } finally {
      setBusy(false);
    }
  }

  const eligibleRows = preview?.rows.filter((row) => row.eligible) ?? [];
  const totalSegments = eligibleRows.reduce((sum, row) => sum + row.smsSegments, 0);
  const alreadySentCount = preview?.rows.filter((row) => row.skippedReason === "already_sent").length ?? 0;

  return (
    <section className="space-y-5 rounded-2xl border border-[#e7e1d7] bg-white p-4 shadow-sm sm:p-6">
      <div>
        <h2 className="text-xl font-bold text-slate-950">Custom SMS Outreach</h2>
        <p className="mt-1 text-sm text-slate-600">
          Write a fully custom SMS, upload recipients (Full Name + Phone) for this campaign, preview the exact message per person, then confirm
          before sending. Recipients are scoped to this campaign only -- nothing here creates or touches an event Guest record.
        </p>
      </div>

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
      {warning && <p role="status" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">{warning}</p>}

      <div>
        <label className="text-sm font-semibold text-slate-700">
          Campaign
          <select
            value={campaignId ?? ""}
            onChange={(event) => chooseCampaign(event.target.value ? Number(event.target.value) : null)}
            className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 font-normal"
          >
            <option value="">Create new campaign</option>
            {campaigns.map((campaign) => (
              <option key={campaign.id} value={campaign.id}>
                {campaign.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="rounded-xl border border-[#e7e1d7] bg-stone-50/70 p-4">
        <label className="text-sm font-semibold text-slate-700">
          Campaign name
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="mt-1 min-h-11 w-full rounded-xl border border-stone-300 px-3 font-normal"
          />
        </label>

        <div className="mt-3 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-700">Message template</p>
          {template !== DEFAULT_TEMPLATE && (
            <button type="button" onClick={() => updateTemplate(DEFAULT_TEMPLATE)} className="text-xs font-bold text-emerald-700 underline underline-offset-2">
              Reset to default template
            </button>
          )}
        </div>
        <textarea
          ref={textareaRef}
          value={template}
          onChange={(event) => updateTemplate(event.target.value)}
          rows={8}
          className="mt-2 w-full rounded-xl border border-stone-300 px-3 py-2 font-normal"
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {CUSTOM_SMS_TEMPLATE_PLACEHOLDERS.map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => insertPlaceholder(token)}
              className="rounded-full border border-[#e7e1d7] bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-700"
            >
              {`{${token}}`}
            </button>
          ))}
        </div>
        <p className={`mt-2 text-xs font-semibold ${templateAnalysis.segments > 1 ? "text-amber-700" : "text-slate-500"}`}>
          {templateAnalysis.units}/{templateAnalysis.singleLimit} characters &middot; {templateAnalysis.segments} SMS segment
          {templateAnalysis.segments === 1 ? "" : "s"} per recipient ({templateAnalysis.encoding})
        </p>
        <div className="mt-3 rounded-lg border border-[#e7e1d7] bg-white p-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Preview (sample: Jane Doe)</p>
          <p className="mt-1 whitespace-pre-wrap text-sm text-slate-700">{templatePreview}</p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={() => void persistCampaign()}
          className="mt-3 min-h-10 rounded-lg border border-[#e7e1d7] bg-white px-4 text-sm font-bold text-slate-700 shadow-sm transition hover:bg-stone-50 disabled:opacity-40"
        >
          {campaignId ? "Save Template Changes" : "Save Campaign"}
        </button>
      </div>

      <div className="rounded-xl border border-[#e7e1d7] bg-stone-50/70 p-4">
        <p className="text-sm font-semibold text-slate-700">Recipients</p>
        {!campaignId ? (
          <p className="mt-2 text-sm text-slate-500">Save the campaign above first, then upload recipients here.</p>
        ) : (
          <>
            <p className="mt-1 text-xs text-slate-500">
              Upload an Excel/CSV with Full Name and Phone columns. These recipients belong only to this campaign -- no event Guest record is
              created or touched.
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={(event) => void handleFileChange(event)} className="hidden" />
              <button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-lg bg-emerald-700 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-emerald-800">
                Choose File
              </button>
              <button type="button" onClick={() => downloadRecipientImportTemplate(name)} className="rounded-lg border border-stone-300 bg-white px-4 py-2.5 text-sm font-bold text-slate-700">
                Download Template
              </button>
              {fileName && <span className="text-xs text-slate-500">{fileName}</span>}
            </div>

            <div className="mt-3 rounded-lg border border-[#e7e1d7] bg-white p-3">
              <p className="sep-label">Add recipient manually</p>
              <div className="mt-1.5 flex flex-wrap items-end gap-2">
                <label className="sep-label min-w-[10rem] flex-1">
                  Full Name
                  <input
                    value={manualName}
                    onChange={(event) => setManualName(event.target.value)}
                    placeholder="e.g. John Peter"
                    className="sep-control mt-1.5 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
                <label className="sep-label min-w-[10rem] flex-1">
                  Phone
                  <input
                    value={manualPhone}
                    onChange={(event) => setManualPhone(event.target.value)}
                    placeholder="e.g. 0712345678"
                    className="sep-control mt-1.5 focus:border-emerald-600 focus:ring-4 focus:ring-emerald-100"
                  />
                </label>
                <Button type="button" size="md" disabled={busy} onClick={() => void addManualRecipient()}>
                  Add
                </Button>
              </div>
              {manualErrors.length > 0 && (
                <div className="mt-2 space-y-1">
                  {manualErrors.map((err, index) => (
                    <p key={`${err.field}-${index}`} className="text-xs text-red-700">
                      {err.field}: {err.message}
                    </p>
                  ))}
                </div>
              )}
            </div>

            {fileValidation && (
              <div className="mt-3 rounded-lg border border-stone-200 bg-white p-3">
                <p className="text-sm font-semibold text-slate-700">
                  {fileRows.length} row{fileRows.length === 1 ? "" : "s"} found &middot;{" "}
                  <span className="text-emerald-700">{fileValidation.validRows.length} valid</span> &middot;{" "}
                  <span className="text-red-700">{fileValidation.invalidRows.length} invalid</span>
                </p>
                {fileValidation.errors.length > 0 && (
                  <div className="mt-2 max-h-32 space-y-1 overflow-y-auto">
                    {fileValidation.errors.slice(0, 20).map((rowError, index) => (
                      <p key={`${rowError.rowNumber}-${rowError.field}-${index}`} className="text-xs text-red-700">
                        Row {rowError.rowNumber} &mdash; {rowError.field}: {rowError.message}
                      </p>
                    ))}
                    {fileValidation.errors.length > 20 && <p className="text-xs text-slate-500">...and {fileValidation.errors.length - 20} more.</p>}
                  </div>
                )}
                <button
                  type="button"
                  disabled={busy || !fileValidation.validRows.length}
                  onClick={() => void confirmUploadRecipients()}
                  className="mt-3 min-h-10 rounded-lg bg-emerald-700 px-4 text-sm font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
                >
                  Upload {fileValidation.validRows.length} Valid Recipient{fileValidation.validRows.length === 1 ? "" : "s"}
                </button>
              </div>
            )}

            <div className="mt-4 flex flex-wrap items-center gap-2">
              <input
                value={recipientQuery}
                onChange={(event) => setRecipientQuery(event.target.value)}
                placeholder="Search name or phone"
                className="min-h-10 flex-1 rounded-lg border border-stone-300 px-3 text-sm"
              />
              <button type="button" onClick={selectAll} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold">
                Select all ({recipients.length})
              </button>
              <button type="button" onClick={selectVisible} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold">
                Select visible
              </button>
              <button type="button" onClick={clearSelection} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold">
                Clear
              </button>
            </div>
            <p className="mt-2 text-xs font-semibold text-slate-600">{selectedRecipientIds.size} recipient{selectedRecipientIds.size === 1 ? "" : "s"} selected</p>
            <div className="mt-2 max-h-64 overflow-auto rounded-lg border border-stone-200 bg-white">
              {visibleRecipients.map((recipient) => (
                <label key={recipient.id} className="flex items-center gap-2 border-t border-stone-100 px-3 py-2 text-sm first:border-t-0">
                  <input type="checkbox" checked={selectedRecipientIds.has(recipient.id)} onChange={() => toggleRecipient(recipient.id)} />
                  <span className="flex-1">{recipient.full_name}</span>
                  <span className="text-xs text-slate-500">{recipient.phone}</span>
                </label>
              ))}
              {!visibleRecipients.length && (
                <p className="p-4 text-center text-sm text-slate-500">
                  {recipients.length ? "No recipients match this search." : "No recipients uploaded yet."}
                </p>
              )}
            </div>
          </>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={busy || !selectedRecipientIds.size}
          onClick={() => void loadPreview()}
          className="min-h-11 rounded-xl border border-stone-300 px-4 font-bold disabled:opacity-40"
        >
          Preview Recipients
        </button>
      </div>

      {preview && (
        <>
          <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
            {[
              ["Selected", preview.rows.length],
              ["Ready to Send", eligibleRows.length],
              ["Already Sent", alreadySentCount],
              ["Total SMS Segments", totalSegments],
            ].map(([label, value]) => (
              <article key={label} className="rounded-xl border bg-stone-50 p-3">
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-bold tabular-nums">{value}</p>
              </article>
            ))}
          </div>

          <p className={`rounded-xl p-3 text-sm ${preview.providerReady ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
            <b>SMS provider:</b> {preview.providerMessage}
          </p>

          <div className="overflow-hidden rounded-xl border">
            <div className="hidden grid-cols-[1.3fr_1fr_1fr_1fr_auto] gap-2 bg-stone-100 p-3 text-xs font-bold lg:grid">
              {["Recipient", "Phone", "Segments", "Status", "Action"].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            {preview.rows.map((row) => (
              <article key={row.recipientId} className="border-t p-3 first:border-t-0 lg:grid lg:grid-cols-[1.3fr_1fr_1fr_1fr_auto] lg:items-center lg:gap-2">
                <div>
                  <b>{row.name}</b>
                  <p className="text-xs text-slate-500 lg:hidden">{row.phone ?? recipientsById.get(row.recipientId)?.phone ?? "No phone"}</p>
                </div>
                <span className="hidden text-sm lg:block">{row.phone ?? recipientsById.get(row.recipientId)?.phone ?? "No phone"}</span>
                <span className="hidden text-sm tabular-nums lg:block">{row.smsSegments}</span>
                <div className="mt-2 lg:mt-0">
                  <Badge value={row.eligible ? "Ready" : skipLabels[row.skippedReason ?? ""] ?? row.deliveryStatus ?? "Not Sent"} />
                </div>
                <button
                  type="button"
                  onClick={() => setPreviewRow(row)}
                  className="mt-2 min-h-8 rounded-lg border px-3 text-xs font-bold lg:mt-0"
                >
                  Preview
                </button>
              </article>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="flex min-h-11 items-center gap-2 rounded-xl border border-stone-300 px-3 text-sm">
              <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} />
              I confirm sending to {eligibleRows.length} people ({totalSegments} SMS segments total)
            </label>
            <button
              type="button"
              disabled={busy || !confirmed || !eligibleRows.length || !preview.providerReady}
              onClick={() => void send()}
              className="min-h-11 rounded-xl bg-emerald-700 px-4 font-bold text-white hover:bg-emerald-800 disabled:opacity-40"
            >
              Send SMS
            </button>
          </div>
        </>
      )}

      {!preview && (
        <div className="rounded-xl border border-dashed bg-stone-50 p-6 text-center text-sm text-slate-600">
          Upload and select recipients, then choose Preview Recipients. Previewing never sends messages.
        </div>
      )}

      <div className="border-t border-[#e7e1d7] pt-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-bold text-slate-950">Send History</h3>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              disabled={busy || !campaignDeliveries.length}
              onClick={() => void downloadReport()}
              className="rounded-lg bg-emerald-700 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              Download Report
            </button>
            <button type="button" disabled={busy} onClick={() => void loadDeliveryHistory()} className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-bold">
              {deliveries ? "Refresh" : "Load Send History"}
            </button>
          </div>
        </div>
        {deliveries && (
          <div className="mt-3 overflow-hidden rounded-xl border">
            <div className="hidden grid-cols-[1fr_1fr_1fr_1fr_auto] gap-2 bg-stone-100 p-3 text-xs font-bold lg:grid">
              {["Recipient", "Phone", "Status", "Sent At", "Error"].map((label) => (
                <span key={label}>{label}</span>
              ))}
            </div>
            {deliveries.map((delivery) => (
              <article key={delivery.id} className="border-t p-3 first:border-t-0 lg:grid lg:grid-cols-[1fr_1fr_1fr_1fr_auto] lg:items-center lg:gap-2">
                <b>{delivery.full_name}</b>
                <span className="text-sm">{delivery.recipient_phone}</span>
                <Badge value={delivery.delivery_status} />
                <span className="text-xs text-slate-500">{delivery.sent_at ? new Date(delivery.sent_at).toLocaleString() : "-"}</span>
                <span className="max-w-xs truncate text-xs text-red-700">{delivery.error_message ?? ""}</span>
              </article>
            ))}
            {!deliveries.length && <p className="p-6 text-center text-sm text-slate-500">No SMS outreach has been sent for this event yet.</p>}
          </div>
        )}
      </div>

      <MessagePreviewDialog
        open={Boolean(previewRow)}
        title={previewRow ? `SMS preview for ${previewRow.name}` : "SMS preview"}
        channel="SMS"
        message={previewRow?.message ?? ""}
        providerMessage={preview?.providerMessage ?? ""}
        providerReady={Boolean(preview?.providerReady)}
        confirmed={false}
        busy={busy}
        canSend={false}
        previewDetails={
          previewRow && (
            <div className={`mt-3 rounded-xl p-3 text-sm ${previewRow.smsSegments === 1 ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-900"}`}>
              <p>
                <b>{previewRow.smsEncoding} usage:</b> {previewRow.smsUnits} {previewRow.smsEncoding === "GSM-7" ? "septets" : "code units"}
              </p>
              <p className="mt-1">
                <b>Estimated SMS segments: {previewRow.smsSegments}</b>
              </p>
            </div>
          )
        }
        confirmationLabel={`Estimated SMS segments: ${previewRow?.smsSegments ?? 0}`}
        sendLabel="Use bulk confirmation to send"
        onConfirmedChange={() => {}}
        onClose={() => setPreviewRow(null)}
        onSend={() => {}}
      />
    </section>
  );
}
