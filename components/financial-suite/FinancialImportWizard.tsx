"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import {
  downloadFinancialImportErrors, downloadFinancialImportTemplate, readFinancialImportFile,
  type FinancialImportOptions, type FinancialImportPreview, type FinancialImportResult,
  type FinancialImportRow,
} from "@/services/financialImportService";
import { formatTzs } from "@/services/pledgeMessageService";

async function accessToken() {
  const { data } = await createClient().auth.getSession();
  if (!data.session?.access_token) throw new Error("Your session has expired.");
  return data.session.access_token;
}

export default function FinancialImportWizard({ eventId, onClose, onImported }: {
  eventId: number; onClose: () => void; onImported: () => Promise<void>;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<FinancialImportRow[]>([]);
  const [preview, setPreview] = useState<FinancialImportPreview | null>(null);
  const [result, setResult] = useState<FinancialImportResult | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [options, setOptions] = useState<FinancialImportOptions>({
    includeGuests: false, createInitialPayments: true, skipDuplicates: true,
  });
  const unresolvedNames = useMemo(() => preview?.rows.filter((row) =>
    row.duplicateType === "name" && !row.nameDuplicateAction) ?? [], [preview]);

  async function call(action: "preview" | "import", importRows = rows) {
    const response = await fetch(`/api/contributions/import/${eventId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${await accessToken()}` },
      body: JSON.stringify({ action, rows: importRows, options, fileName: file?.name }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Excel import could not be processed.");
    return payload;
  }
  async function chooseFile(selected: File | null) {
    setError(""); setPreview(null); setResult(null); setFile(selected);
    if (!selected) { setRows([]); return; }
    try { setBusy(true); setRows(await readFinancialImportFile(selected)); }
    catch (err) { setRows([]); setError(err instanceof Error ? err.message : "Excel file could not be read."); }
    finally { setBusy(false); }
  }
  async function buildPreview(nextRows = rows) {
    try { setBusy(true); setError(""); setPreview(await call("preview", nextRows)); }
    catch (err) { setError(err instanceof Error ? err.message : "Preview failed."); }
    finally { setBusy(false); }
  }
  async function resolveName(rowNumber: number, action: "skip" | "create") {
    const nextRows = rows.map((row) => row.rowNumber === rowNumber ? { ...row, nameDuplicateAction: action } : row);
    setRows(nextRows); await buildPreview(nextRows);
  }
  async function runImport() {
    try {
      setBusy(true); setError("");
      const imported = await call("import") as FinancialImportResult;
      setResult(imported); await onImported();
    } catch (err) { setError(err instanceof Error ? err.message : "Import failed."); }
    finally { setBusy(false); }
  }

  const stats = preview?.totals;
  return <div className="space-y-5">
    <div className="flex items-start justify-between gap-4">
      <div><h2 className="text-xl font-bold">Import Excel</h2><p className="text-sm text-slate-600">Preview, resolve duplicates, then import event contributions safely.</p></div>
      <button type="button" onClick={onClose} aria-label="Close import wizard" className="text-2xl text-slate-500">×</button>
    </div>
    {!result && <><div className="rounded-xl border border-dashed p-4">
      <input type="file" accept=".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        onChange={(event) => void chooseFile(event.target.files?.[0] ?? null)} />
      <button type="button" onClick={downloadFinancialImportTemplate} className="mt-3 block text-sm font-semibold text-emerald-700">Download Excel template</button>
      {file && <p className="mt-2 text-xs text-slate-500">{file.name} · {rows.length} data row(s)</p>}
    </div>
    <fieldset className="space-y-3 rounded-xl bg-slate-50 p-4 text-sm">
      <legend className="font-bold">Import options</legend>
      <label className="flex gap-2"><input type="radio" checked={!options.includeGuests} onChange={() => { setOptions({ ...options, includeGuests: false }); setPreview(null); }} />Import into Contributions only</label>
      <label className="flex gap-2"><input type="radio" checked={options.includeGuests} onChange={() => { setOptions({ ...options, includeGuests: true }); setPreview(null); }} />Import into Contributions and Guest List</label>
      <label className="flex gap-2"><input type="checkbox" checked={options.createInitialPayments} onChange={(e) => { setOptions({ ...options, createInitialPayments: e.target.checked }); setPreview(null); }} />Create initial payments from Paid Amount</label>
      <label className="flex gap-2"><input type="checkbox" checked={options.skipDuplicates} onChange={(e) => { setOptions({ ...options, skipDuplicates: e.target.checked }); setPreview(null); }} />Skip duplicates</label>
      <label className="flex gap-2"><input type="checkbox" checked readOnly />Preview before import (required)</label>
    </fieldset>
    {!preview && <button disabled={busy || !rows.length} onClick={() => void buildPreview()} className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Checking..." : "Preview import"}</button>}
    {stats && <><div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3">
      {[
        ["Total rows", stats.totalRows], ["Valid rows", stats.validRows], ["Invalid rows", stats.invalidRows],
        ["Possible duplicates", stats.possibleDuplicates], ["Guests to create", stats.guestsToCreate],
        ["Guests to link", stats.guestsToLink], ["Pledges to create", stats.pledgesToCreate],
        ["Initial payments", stats.initialPaymentsToRecord], ["Total pledged", formatTzs(stats.totalPledged)],
        ["Total already paid", formatTzs(stats.totalAlreadyPaid)],
      ].map(([label, value]) => <div key={String(label)} className="rounded-lg border p-3"><span className="block text-xs text-slate-500">{label}</span><b>{value}</b></div>)}
    </div>
    <div className="max-h-64 overflow-auto rounded-xl border">
      <table className="w-full min-w-[700px] text-left text-xs"><thead className="sticky top-0 bg-slate-100"><tr>{["Row","Name","Phone","Pledged","Paid","Guest","Validation"].map((item) => <th key={item} className="p-2">{item}</th>)}</tr></thead>
        <tbody className="divide-y">{preview.rows.map((row) => <tr key={row.rowNumber} className={!row.valid ? "bg-red-50" : row.duplicateType ? "bg-amber-50" : ""}>
          <td className="p-2">{row.rowNumber}</td><td className="p-2 font-semibold">{row.fullName || "—"}</td><td className="p-2">{row.phone || "—"}</td>
          <td className="p-2">{row.pledgedAmount}</td><td className="p-2">{row.paidAmount}</td><td className="p-2">{row.guestAction}</td>
          <td className="p-2">{row.errors.join(" ") || (row.duplicateType === "name" ? <span>Possible name match: {row.duplicateName}. <button onClick={() => void resolveName(row.rowNumber, "skip")} className="font-bold text-amber-800 underline">Skip</button>{" / "}<button onClick={() => void resolveName(row.rowNumber, "create")} className="font-bold text-emerald-700 underline">Create separately</button></span> : row.duplicateType ? `Duplicate ${row.duplicateType.replace("_", " ")}: ${row.duplicateName ?? ""}` : "Ready")}</td>
        </tr>)}</tbody>
      </table>
    </div>
    <button disabled={busy || stats.validRows === 0 || unresolvedNames.length > 0} onClick={() => void runImport()} className="w-full rounded-xl bg-slate-900 px-4 py-3 font-semibold text-white disabled:opacity-50">{busy ? "Importing..." : unresolvedNames.length ? `Resolve ${unresolvedNames.length} name warning(s)` : "Import contributions"}</button></>}
    </>}
    {result && <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-center"><div className="rounded-xl bg-emerald-50 p-4"><b className="text-2xl text-emerald-700">{result.importedRows}</b><span className="block text-sm">Imported rows</span></div><div className="rounded-xl bg-slate-100 p-4"><b className="text-2xl">{result.skippedRows}</b><span className="block text-sm">Skipped rows</span></div><div className="rounded-xl bg-amber-50 p-4"><b className="text-2xl text-amber-700">{result.duplicateRows}</b><span className="block text-sm">Duplicate rows</span></div><div className="rounded-xl bg-red-50 p-4"><b className="text-2xl text-red-700">{result.failedRows.length}</b><span className="block text-sm">Failed rows</span></div></div>
      {result.failedRows.length > 0 && <><ul className="max-h-40 overflow-auto rounded-xl border p-3 text-sm">{result.failedRows.map((row) => <li key={row.rowNumber}>Row {row.rowNumber} · {row.fullName}: {row.reason}</li>)}</ul><button onClick={() => downloadFinancialImportErrors(result)} className="font-semibold text-red-700 underline">Download error report</button></>}
      <button onClick={onClose} className="w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white">Done</button>
    </div>}
    {error && <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}
  </div>;
}
