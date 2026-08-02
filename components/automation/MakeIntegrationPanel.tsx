"use client";

import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";

type EventOption = { id: number; title: string };
type Connector = { id: number; display_name: string; webhook_url_masked: string; is_active: boolean; allowed_event_types: string[]; last_success_at: string | null; last_failure_at: string | null; pendingDeliveries: number };
const supportedEvents = ["pledge.submitted", "message.acknowledgement.requested", "pledge.reminder.send_requested", "payment.completed", "invitation.sent", "rsvp.accepted", "guest.checked_in"];
const text = {
  en: { title: "Integrations → Make", event: "Event", add: "Add Connector", empty: "No Make connector is configured for this event.", connected: "Connected", active: "Active", paused: "Paused", webhook: "Webhook URL", status: "Connector status", allowed: "Allowed event types", lastDelivery: "Last delivery", pending: "Pending deliveries", test: "Test Connection", pause: "Pause", resume: "Resume", rotate: "Rotate Secret", disconnect: "Disconnect", cancel: "Cancel", save: "Add Connector", secret: "Copy this signing secret now. It will not be shown again.", guide: "Pledge acknowledgement setup guide", chooseEvent: "Choose an event to manage its Make connector.", guideSteps: ["Create a Make Webhooks → Custom webhook module.", "Validate required payload fields and deduplicate the idempotency key.", "Route recipient phone present versus missing.", "Send through the approved channel without changing pledge state.", "POST a signed completed callback to Smart Event Pass.", "Add an error handler that posts failed."], success: "Last success", failure: "Last failure" },
  sw: { title: "Miunganisho → Make", event: "Tukio", add: "Ongeza Connector", empty: "Hakuna connector ya Make iliyowekwa kwa tukio hili.", connected: "Imeunganishwa", active: "Inatumika", paused: "Imesitishwa", webhook: "Anwani ya Webhook", status: "Hali ya connector", allowed: "Aina za matukio zinazoruhusiwa", lastDelivery: "Utumaji wa mwisho", pending: "Utumaji unaosubiri", test: "Jaribu Muunganisho", pause: "Sitisha", resume: "Endelea", rotate: "Badilisha Siri", disconnect: "Ondoa Muunganisho", cancel: "Ghairi", save: "Ongeza Connector", secret: "Nakili siri hii sasa. Haitaonyeshwa tena.", guide: "Mwongozo wa kuthibitisha ahadi", chooseEvent: "Chagua tukio ili kudhibiti connector yake ya Make.", guideSteps: ["Unda moduli ya Make Webhooks → Custom webhook.", "Thibitisha sehemu zinazohitajika na uzuie idempotency key kurudiwa.", "Gawanya njia ya simu iliyopo dhidi ya inayokosekana.", "Tuma kupitia njia iliyoidhinishwa bila kubadilisha hali ya ahadi.", "Tuma callback iliyosainiwa ya completed kwa Smart Event Pass.", "Weka error handler inayotuma failed."], success: "Mafanikio ya mwisho", failure: "Hitilafu ya mwisho" },
} as const;

export default function MakeIntegrationPanel({ eventId, events }: { eventId: number | null; events: EventOption[] }) {
  const { language } = useAppLanguage();
  const t = text[language];
  const [managedEventId, setManagedEventId] = useState<number | null>(eventId ?? events[0]?.id ?? null);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [url, setUrl] = useState("");
  const [selected, setSelected] = useState<string[]>(["pledge.submitted", "message.acknowledgement.requested"]);
  const [secret, setSecret] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const effectiveEventId = managedEventId ?? eventId ?? events[0]?.id ?? null;

  const request = useCallback(async (path: string, init?: RequestInit) => {
    const { data } = await supabase.auth.getSession();
    if (!data.session) throw new Error("Session expired.");
    const response = await fetch(path, { ...init, headers: { "Content-Type": "application/json", Authorization: `Bearer ${data.session.access_token}`, ...init?.headers } });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Request failed.");
    return payload;
  }, []);

  const load = useCallback(async () => {
    if (!effectiveEventId) { setConnectors([]); return; }
    setLoading(true);
    try { const payload = await request(`/api/automation/make/connectors?eventId=${effectiveEventId}`); setConnectors(payload.connectors); setMessage(""); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Request failed."); }
    finally { setLoading(false); }
  }, [effectiveEventId, request]);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  function chooseEvent(value: string) { setManagedEventId(value ? Number(value) : null); setShowForm(false); setSecret(""); setMessage(""); }
  async function create() {
    if (!effectiveEventId) return;
    try { const payload = await request("/api/automation/make/connectors", { method: "POST", body: JSON.stringify({ eventId: effectiveEventId, webhookUrl: url, allowedEventTypes: selected }) }); setSecret(payload.signingSecret); setUrl(""); setShowForm(false); await load(); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Request failed."); }
  }
  async function action(connector: Connector, name: string) {
    if (!effectiveEventId) return;
    try { const path = name === "test" ? "/api/automation/make/deliveries" : "/api/automation/make/connectors", payload = await request(path, { method: name === "test" ? "POST" : "PATCH", body: JSON.stringify({ eventId: effectiveEventId, connectorId: connector.id, action: name }) }); if (payload.signingSecret) setSecret(payload.signingSecret); setMessage(name === "test" ? `Delivery ${payload.deliveryId} · ${payload.durationMs}ms` : ""); await load(); }
    catch (cause) { setMessage(cause instanceof Error ? cause.message : "Request failed."); }
  }

  return <section className="rounded-2xl border bg-white p-5 shadow-sm" aria-labelledby="make-integration-title">
    <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-wider text-violet-700">Make.com</p><h2 id="make-integration-title" className="mt-1 text-xl font-black">{t.title}</h2></div><label className="text-sm font-bold">{t.event}<select value={effectiveEventId ?? ""} onChange={(event) => chooseEvent(event.target.value)} className="mt-1 min-h-11 w-full rounded-xl border bg-white px-3 font-normal sm:w-64"><option value="">{t.chooseEvent}</option>{events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label></div>
    {message && <p className="mt-4 rounded-lg bg-slate-100 p-3 text-sm">{message}</p>}
    {secret && <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4"><p className="text-sm font-bold">{t.secret}</p><code className="mt-2 block break-all text-xs">{secret}</code></div>}
    {!effectiveEventId && <div className="mt-4 rounded-xl border border-dashed p-8 text-center"><p className="text-sm text-slate-600">{t.chooseEvent}</p><button disabled className="mt-4 min-h-11 rounded-xl bg-slate-300 px-5 font-bold text-white">{t.add}</button></div>}
    {effectiveEventId && loading && !connectors.length && <p className="mt-4 p-6 text-center text-sm text-slate-500">…</p>}
    {effectiveEventId && !loading && !connectors.length && !showForm && <div className="mt-4 rounded-xl border border-dashed p-8 text-center"><span className="inline-flex size-12 items-center justify-center rounded-full bg-violet-100 text-xl text-violet-700">↗</span><p className="mt-3 text-sm text-slate-600">{t.empty}</p><button onClick={() => setShowForm(true)} className="mt-4 min-h-11 rounded-xl bg-slate-950 px-5 font-bold text-white">{t.add}</button></div>}
    {effectiveEventId && showForm && <div className="mt-4 rounded-xl border p-4"><h3 className="font-black">{t.add}</h3><label className="mt-3 block text-sm font-bold">{t.webhook}<input type="url" value={url} onChange={(event) => setUrl(event.target.value)} placeholder="https://hook.make.com/…" className="mt-2 min-h-12 w-full rounded-xl border px-3 font-normal" /></label><fieldset className="mt-4"><legend className="text-sm font-bold">{t.allowed}</legend><div className="mt-2 grid gap-2 sm:grid-cols-2">{supportedEvents.map((value) => <label key={value} className="flex gap-2 text-sm"><input type="checkbox" checked={selected.includes(value)} onChange={() => setSelected((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value])} />{value}</label>)}</div></fieldset><div className="mt-5 flex gap-2"><button onClick={() => void create()} className="min-h-11 rounded-xl bg-slate-950 px-5 font-bold text-white">{t.save}</button><button onClick={() => setShowForm(false)} className="min-h-11 rounded-xl border px-5 font-bold">{t.cancel}</button></div></div>}
    {connectors.map((connector) => <ConnectorCard key={connector.id} connector={connector} t={t} action={action} />)}
    {effectiveEventId && connectors.length > 0 && <button onClick={() => setShowForm((value) => !value)} className="mt-4 min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-bold">{t.add}</button>}
    <details className="mt-5 rounded-xl bg-slate-50 p-4"><summary className="cursor-pointer font-bold">{t.guide}</summary><ol className="mt-3 list-decimal space-y-2 pl-5 text-sm">{t.guideSteps.map((step) => <li key={step}>{step}</li>)}</ol></details>
  </section>;
}

function ConnectorCard({ connector, t, action }: { connector: Connector; t: typeof text.en | typeof text.sw; action: (connector: Connector, name: string) => Promise<void> }) {
  const success = connector.last_success_at ? new Date(connector.last_success_at).getTime() : 0, failure = connector.last_failure_at ? new Date(connector.last_failure_at).getTime() : 0;
  const lastDelivery = Math.max(success, failure);
  return <article className="mt-4 rounded-xl border p-4"><div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-black">{connector.display_name}</h3><span className={`rounded-full px-3 py-1 text-xs font-bold ${connector.is_active ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-900"}`}>{t.connected} · {connector.is_active ? t.active : t.paused}</span></div><dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-3"><Info label={t.webhook} value={connector.webhook_url_masked} /><Info label={t.status} value={connector.is_active ? t.active : t.paused} /><Info label={t.pending} value={String(connector.pendingDeliveries)} /><Info label={t.lastDelivery} value={lastDelivery ? new Date(lastDelivery).toLocaleString() : "—"} /><Info label={t.success} value={connector.last_success_at ? new Date(connector.last_success_at).toLocaleString() : "—"} /><Info label={t.failure} value={connector.last_failure_at ? new Date(connector.last_failure_at).toLocaleString() : "—"} /></dl><div className="mt-4"><p className="text-xs font-bold text-slate-500">{t.allowed}</p><div className="mt-2 flex flex-wrap gap-2">{connector.allowed_event_types.map((eventType) => <span key={eventType} className="rounded-full bg-slate-100 px-3 py-1 text-xs">{eventType}</span>)}</div></div><div className="mt-5 flex flex-wrap gap-2"><Button onClick={() => void action(connector, "test")}>{t.test}</Button><Button onClick={() => void action(connector, connector.is_active ? "pause" : "resume")}>{connector.is_active ? t.pause : t.resume}</Button><Button onClick={() => void action(connector, "rotate")}>{t.rotate}</Button><Button danger onClick={() => void action(connector, "disconnect")}>{t.disconnect}</Button></div></article>;
}
function Info({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-bold text-slate-500">{label}</dt><dd className="mt-1 break-all">{value}</dd></div>; }
function Button({ children, onClick, danger = false }: { children: string; onClick: () => void; danger?: boolean }) { return <button onClick={onClick} className={`min-h-10 rounded-lg px-3 text-sm font-bold ${danger ? "bg-red-50 text-red-700" : "bg-slate-100 text-slate-800"}`}>{children}</button>; }
