"use client";
import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const permissionLabels = {
  view_pledges: "View pledges", create_pledges: "Create pledges",
  edit_contributors: "Edit contributor details", record_payments: "Record payments",
  view_payment_history: "View payment history", send_reminders: "Send pledge reminders", send_thank_you: "Send completed thank-you messages", view_reports: "View financial reports", search: "Search and filter",
};
type Permissions = Record<keyof typeof permissionLabels, boolean>;
type AccessLink = { id: string; label: string | null; permissions: Permissions; expires_at: string | null; revoked_at: string | null; created_at: string; last_used_at: string | null };
const defaults = Object.fromEntries(Object.keys(permissionLabels).map((key) => [key, true])) as Permissions;

export default function OrganiserAccessPanel({ eventId }: { eventId: number }) {
  const [links, setLinks] = useState<AccessLink[]>([]); const [label, setLabel] = useState("");
  const [expiry, setExpiry] = useState(""); const [permissions, setPermissions] = useState(defaults);
  const [rawUrl, setRawUrl] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  const token = useCallback(async () => {
    const { data } = await createClient().auth.getSession();
    if (!data.session?.access_token) throw new Error("Your session has expired.");
    return data.session.access_token;
  }, []);
  const load = useCallback(async () => {
    try {
      const response = await fetch(`/api/contributions/access-links?eventId=${eventId}`, { headers: { Authorization: `Bearer ${await token()}` }, cache: "no-store" });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error);
      setLinks(payload.links);
    } catch (err) { setError(err instanceof Error ? err.message : "Links could not be loaded."); }
  }, [eventId, token]);
  useEffect(() => { const timer = window.setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);
  async function createLink(replaces?: AccessLink) {
    try {
      setBusy(true); setError(""); setRawUrl("");
      const accessToken = await token();
      const response = await fetch("/api/contributions/access-links", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ eventId, label: replaces?.label ?? label, permissions: replaces?.permissions ?? permissions, expiresAt: replaces?.expires_at ?? (expiry ? new Date(`${expiry}T23:59:59`).toISOString() : null) }),
      });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error);
      if (replaces) await revoke(replaces, false, accessToken);
      setRawUrl(payload.rawUrl); setLabel(""); setExpiry(""); await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Link could not be generated."); }
    finally { setBusy(false); }
  }
  async function revoke(link: AccessLink, confirmFirst = true, accessToken?: string) {
    if (confirmFirst && !window.confirm(`Revoke ${link.label || "this access link"}?`)) return;
    try {
      setBusy(true); const response = await fetch("/api/contributions/access-links", {
        method: "DELETE", headers: { "Content-Type": "application/json", Authorization: `Bearer ${accessToken ?? await token()}` },
        body: JSON.stringify({ linkId: link.id }),
      });
      const payload = await response.json(); if (!response.ok) throw new Error(payload.error);
      if (confirmFirst) await load();
    } catch (err) { setError(err instanceof Error ? err.message : "Link could not be revoked."); }
    finally { if (confirmFirst) setBusy(false); }
  }
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <div><h2 className="text-xl font-bold">Committee Access</h2><p className="mt-1 text-sm text-slate-600">Generate event-specific management links for trusted organisers.</p></div>
    <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Anyone with this link can perform the selected actions for this event. Share it only with trusted organisers.</p>
    <div className="mt-5 grid gap-4 lg:grid-cols-2">
      <div className="space-y-3"><label className="block text-sm font-semibold">Label<input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="e.g. Treasurer" className="mt-1 w-full rounded-xl border px-3 py-2" /></label><label className="block text-sm font-semibold">Expiry (optional)<input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} className="mt-1 w-full rounded-xl border px-3 py-2" /></label>
        <fieldset><legend className="text-sm font-semibold">Permissions</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{Object.entries(permissionLabels).map(([key,value]) => <label key={key} className="flex gap-2 text-sm"><input type="checkbox" checked={permissions[key as keyof Permissions]} onChange={(e) => setPermissions({ ...permissions, [key]: e.target.checked })} />{value}</label>)}</div></fieldset>
        <button disabled={busy || !permissions.view_pledges} onClick={() => void createLink()} className="rounded-xl bg-slate-900 px-4 py-2 font-semibold text-white disabled:opacity-50">Generate secure link</button>
      </div>
      <div>{rawUrl && <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4"><p className="font-semibold text-emerald-900">Copy this link now. It cannot be shown again.</p><div className="mt-2 flex gap-2"><input readOnly value={rawUrl} className="min-w-0 flex-1 rounded-lg border bg-white px-3 py-2 text-sm" /><button onClick={() => void navigator.clipboard.writeText(rawUrl)} className="rounded-lg bg-emerald-700 px-3 py-2 text-sm font-semibold text-white">Copy</button></div></div>}
        {error && <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}</div>
    </div>
    <div className="mt-6 space-y-2"><h3 className="font-bold">Existing links</h3>{!links.length ? <p className="text-sm text-slate-500">No committee links created.</p> : links.map((link) => <article key={link.id} className="flex flex-col justify-between gap-3 rounded-xl border p-4 sm:flex-row sm:items-center"><div><p className="font-semibold">{link.label || "Unlabelled link"} <span className={`ml-2 rounded-full px-2 py-1 text-xs ${link.revoked_at ? "bg-red-100 text-red-700" : "bg-emerald-100 text-emerald-700"}`}>{link.revoked_at ? "Revoked" : "Active"}</span></p><p className="mt-1 text-xs text-slate-500">Created {new Date(link.created_at).toLocaleString()} · Expires {link.expires_at ? new Date(link.expires_at).toLocaleString() : "never"} · Last used {link.last_used_at ? new Date(link.last_used_at).toLocaleString() : "never"}</p></div>{!link.revoked_at && <div className="flex gap-2"><button disabled={busy} onClick={() => void createLink(link)} className="rounded-lg border px-3 py-2 text-sm font-semibold">Regenerate</button><button disabled={busy} onClick={() => void revoke(link)} className="rounded-lg bg-red-50 px-3 py-2 text-sm font-semibold text-red-700">Revoke</button></div>}</article>)}</div>
  </section>;
}
