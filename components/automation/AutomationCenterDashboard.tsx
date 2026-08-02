"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import {
  getAutomationCenterData,
  retryWorkflowEvent,
  type AutomationCenterData,
  type TimelineItem,
  type WorkflowRow,
} from "@/services/automationCenterService";

const copy = {
  en: {
    title: "Automation Center", subtitle: "Monitor every event workflow from one operational workspace.", refresh: "Refresh", healthy: "Healthy", degraded: "Needs attention", health: "System Health", queue: "Workflow Queue", jobs: "Upcoming Jobs", active: "Active Automations", stats: "Processing Statistics", timeline: "Timeline", retry: "Retry Center", details: "Workflow Details", allEvents: "All events", allStatuses: "All statuses", pending: "Pending", processing: "Processing", processed: "Processed", failed: "Failed", successRate: "Success rate", avgAttempts: "Average attempts", dueSoon: "Due in 24 hours", noData: "No activity matches these filters.", retryNow: "Retry now", retrying: "Retrying…", close: "Close", attempts: "Attempts", available: "Available", source: "Source", entity: "Entity", lastError: "Last error", queueClear: "Queue is operating normally", activities: "activities", activity: "activity", expand: "Show records", collapse: "Hide records", loadMore: "Load more", search: "Search person, workflow, or activity", showing: "Showing", of: "of", timelineFilters: ["All", "Pledges", "Reminders", "Invitations", "Payments", "Check-in", "Failed"], automations: ["Pledge capture", "Payment lifecycle", "Reminder scheduling", "Invitation delivery", "RSVP tracking", "Event check-in"],
  },
  sw: {
    title: "Kituo cha Automation", subtitle: "Fuatilia workflow zote za matukio katika sehemu moja ya uendeshaji.", refresh: "Onyesha upya", healthy: "Mfumo uko sawa", degraded: "Inahitaji uangalizi", health: "Afya ya Mfumo", queue: "Foleni ya Workflow", jobs: "Kazi Zijazo", active: "Automation Zinazotumika", stats: "Takwimu za Uchakataji", timeline: "Mfululizo wa Matukio", retry: "Kituo cha Majaribio Tena", details: "Maelezo ya Workflow", allEvents: "Matukio yote", allStatuses: "Hali zote", pending: "Inasubiri", processing: "Inachakatwa", processed: "Imekamilika", failed: "Imeshindikana", successRate: "Asilimia ya mafanikio", avgAttempts: "Wastani wa majaribio", dueSoon: "Ndani ya saa 24", noData: "Hakuna shughuli zinazolingana na vichujio hivi.", retryNow: "Jaribu tena", retrying: "Inajaribu…", close: "Funga", attempts: "Majaribio", available: "Itapatikana", source: "Chanzo", entity: "Rekodi", lastError: "Hitilafu ya mwisho", queueClear: "Foleni inaendelea vizuri", activities: "shughuli", activity: "shughuli", expand: "Onyesha rekodi", collapse: "Ficha rekodi", loadMore: "Onyesha zaidi", search: "Tafuta mtu, workflow, au shughuli", showing: "Inaonyesha", of: "kati ya", timelineFilters: ["Zote", "Ahadi", "Vikumbusho", "Mialiko", "Malipo", "Kuingia", "Zilizoshindikana"], automations: ["Ahadi za michango", "Mzunguko wa malipo", "Ratiba za vikumbusho", "Utumaji wa mialiko", "Ufuatiliaji wa RSVP", "Kuingia tukioni"],
  },
} as const;

const filterKeys = ["all", "pledges", "reminders", "invitations", "payments", "checkin", "failed"] as const;
type TimelineFilter = (typeof filterKeys)[number];
type TimelineGroup = { key: string; dateKey: string; label: string; items: TimelineItem[] };
const relation = <T,>(value: T | T[] | null) => Array.isArray(value) ? value[0] ?? null : value;
const badge = (status: string) => status === "failed" ? "bg-red-100 text-red-800" : ["processing", "queued", "pending", "recommended"].includes(status) ? "bg-amber-100 text-amber-900" : ["processed", "sent", "delivered", "completed"].includes(status) ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-700";

export default function AutomationCenterDashboard() {
  const { language } = useAppLanguage();
  const t = copy[language];
  const [data, setData] = useState<AutomationCenterData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [eventId, setEventId] = useState("all");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState<WorkflowRow | null>(null);
  const [retrying, setRetrying] = useState<number | null>(null);
  const [observedAt, setObservedAt] = useState(0);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { setData(await getAutomationCenterData()); setObservedAt(Date.now()); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Automation Center could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { const timer = setTimeout(() => void load(), 0); return () => clearTimeout(timer); }, [load]);

  const workflows = useMemo(() => data?.workflows.filter((item) => (eventId === "all" || item.event_id === Number(eventId)) && (status === "all" || item.status === status)) ?? [], [data, eventId, status]);
  const jobs = useMemo(() => data?.jobs.filter((item) => eventId === "all" || item.event_id === Number(eventId)) ?? [], [data, eventId]);
  const timeline = useMemo(() => data?.timeline.filter((item) => eventId === "all" || item.eventId === Number(eventId)) ?? [], [data, eventId]);
  const counts = { pending: workflows.filter((x) => x.status === "pending").length, processing: workflows.filter((x) => x.status === "processing").length, processed: workflows.filter((x) => x.status === "processed").length, failed: workflows.filter((x) => x.status === "failed").length };
  const finished = counts.processed + counts.failed;
  const success = finished ? Math.round(counts.processed / finished * 100) : 100;
  const average = workflows.length ? (workflows.reduce((sum, item) => sum + item.attempt_count, 0) / workflows.length).toFixed(1) : "0.0";
  const stale = workflows.filter((item) => item.status === "processing" && observedAt - new Date(item.created_at).getTime() > 15 * 60_000).length;
  const unhealthy = Boolean(data?.sourceErrors.length || counts.failed || stale);

  async function retry(item: WorkflowRow) {
    setRetrying(item.id);
    try { await retryWorkflowEvent(item.id); await load(); setSelected(null); }
    catch (cause) { setError(cause instanceof Error ? cause.message : "Retry failed."); }
    finally { setRetrying(null); }
  }

  return <div className="space-y-6">
    <header className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-xs font-black uppercase tracking-[.2em] text-emerald-700">Smart Event Pass</p><h1 className="mt-2 text-3xl font-black text-slate-950">{t.title}</h1><p className="mt-2 text-sm text-slate-600">{t.subtitle}</p></div><button disabled={loading} onClick={() => void load()} className="min-h-12 rounded-xl bg-slate-950 px-5 font-bold text-white disabled:opacity-50">{loading ? "…" : t.refresh}</button></header>
    {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-red-800">{error}</p>}
    <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-bold">{t.allEvents}<select value={eventId} onChange={(e) => setEventId(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border bg-white px-3 font-normal"><option value="all">{t.allEvents}</option>{data?.events.map((event) => <option key={event.id} value={event.id}>{event.title}</option>)}</select></label><label className="text-sm font-bold">{t.allStatuses}<select value={status} onChange={(e) => setStatus(e.target.value)} className="mt-2 min-h-12 w-full rounded-xl border bg-white px-3 font-normal"><option value="all">{t.allStatuses}</option>{["pending", "processing", "processed", "failed"].map((value) => <option key={value} value={value}>{t[value as "pending" | "processing" | "processed" | "failed"]}</option>)}</select></label></div>
    <section className={`rounded-2xl border p-5 ${unhealthy ? "border-amber-200 bg-amber-50" : "border-emerald-200 bg-emerald-50"}`}><div className="flex items-center justify-between gap-4"><div><h2 className="text-lg font-black">{t.health}</h2><p className="mt-1 text-sm">{unhealthy ? t.degraded : t.healthy} · {data?.sourceErrors.length ? `${data.sourceErrors.join(", ")} unavailable` : t.queueClear}</p></div><span className={`size-4 rounded-full ${unhealthy ? "bg-amber-500" : "bg-emerald-500"}`} /></div></section>
    <section><h2 className="text-xl font-black">{t.stats}</h2><div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-6">{[[t.pending, counts.pending], [t.processing, counts.processing], [t.processed, counts.processed], [t.failed, counts.failed], [t.successRate, `${success}%`], [t.avgAttempts, average]].map(([label, value]) => <Stat key={String(label)} label={String(label)} value={value} />)}</div></section>
    <div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]"><section className="rounded-2xl border bg-white shadow-sm"><div className="border-b p-5"><h2 className="text-xl font-black">{t.queue}</h2></div><div className="max-h-[560px] overflow-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="sticky top-0 bg-slate-50 text-xs uppercase text-slate-500"><tr>{["Workflow", "Event", "Created", t.attempts, "Status"].map((x) => <th key={String(x)} className="p-3">{x}</th>)}</tr></thead><tbody>{workflows.map((item) => <tr key={item.id} onClick={() => setSelected(item)} className="cursor-pointer border-t hover:bg-slate-50"><td className="p-3 font-bold">{item.event_type}</td><td className="p-3">{relation(item.events)?.title ?? "Event"}</td><td className="p-3">{new Date(item.created_at).toLocaleString()}</td><td className="p-3">{item.attempt_count}/5</td><td className="p-3"><Badge value={item.status} /></td></tr>)}</tbody></table>{!workflows.length && <Empty text={t.noData} />}</div></section><section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-xl font-black">{t.retry}</h2><div className="mt-4 space-y-3">{workflows.filter((item) => item.status === "failed" && item.attempt_count < 5).map((item) => <article key={item.id} className="rounded-xl border border-red-100 bg-red-50 p-4"><p className="font-bold">{item.event_type}</p><p className="mt-1 line-clamp-2 text-xs text-red-800">{item.last_error || "Processing failed."}</p><button disabled={retrying === item.id} onClick={() => void retry(item)} className="mt-3 min-h-11 rounded-xl bg-red-700 px-4 text-sm font-bold text-white disabled:opacity-50">{retrying === item.id ? t.retrying : t.retryNow}</button></article>)}{!workflows.some((item) => item.status === "failed" && item.attempt_count < 5) && <Empty text={t.queueClear} />}</div></section></div>
    <div className="grid gap-6 xl:grid-cols-2"><section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-xl font-black">{t.jobs}</h2><p className="mt-1 text-sm text-slate-500">{jobs.filter((item) => new Date(item.scheduled_for).getTime() < observedAt + 86400000 && new Date(item.scheduled_for).getTime() > observedAt).length} {t.dueSoon.toLowerCase()}</p><div className="mt-4 space-y-3">{jobs.filter((item) => ["scheduled", "recommended", "queued"].includes(item.status)).slice(0, 12).map((item) => <article key={item.id} className="flex justify-between gap-3 rounded-xl border p-3"><div><p className="font-bold">{relation(item.event_pledges)?.full_name ?? item.schedule_type}</p><p className="mt-1 text-xs text-slate-500">{relation(item.events)?.title} · {new Date(item.scheduled_for).toLocaleString()}</p></div><Badge value={item.status} /></article>)}{!jobs.length && <Empty text={t.noData} />}</div></section><section className="rounded-2xl border bg-white p-5 shadow-sm"><h2 className="text-xl font-black">{t.active}</h2><div className="mt-4 grid gap-3 sm:grid-cols-2">{t.automations.map((label, index) => <article key={label} className="rounded-xl border p-4"><span className={`inline-block size-2 rounded-full ${index < 3 || timeline.some((item) => item.kind === (index === 3 ? "invitation" : index === 4 ? "rsvp" : "checkin")) ? "bg-emerald-500" : "bg-slate-300"}`} /><h3 className="mt-2 font-bold">{label}</h3><p className="mt-1 text-xs text-slate-500">{index < 3 ? workflows.filter((item) => index === 0 ? item.event_type.startsWith("pledge.") : index === 1 ? item.event_type.startsWith("payment.") : item.event_type.includes("reminder")).length : timeline.filter((item) => item.kind === (index === 3 ? "invitation" : index === 4 ? "rsvp" : "checkin")).length} events</p></article>)}</div></section></div>
    <TimelinePanel items={timeline} workflows={data?.workflows ?? []} language={language} onWorkflow={setSelected} />
    {selected && <WorkflowDialog item={selected} t={t} retrying={retrying === selected.id} onClose={() => setSelected(null)} onRetry={() => void retry(selected)} />}
  </div>;
}

function TimelinePanel({ items, workflows, language, onWorkflow }: { items: TimelineItem[]; workflows: WorkflowRow[]; language: "en" | "sw"; onWorkflow: (item: WorkflowRow) => void }) {
  const t = copy[language];
  const [filter, setFilter] = useState<TimelineFilter>("all");
  const [search, setSearch] = useState("");
  const [visible, setVisible] = useState(20);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const groups = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    const filtered = items.filter((item) => matchesFilter(item, filter) && (!query || [item.label, item.detail, item.eventTitle, item.kind, item.status].some((value) => value?.toLocaleLowerCase().includes(query))));
    const grouped = new Map<string, TimelineGroup>();
    for (const item of filtered) {
      const dateKey = localDateKey(item.occurredAt);
      const key = `${dateKey}|${item.kind}|${item.label.toLocaleLowerCase()}`;
      const group = grouped.get(key);
      if (group) group.items.push(item); else grouped.set(key, { key, dateKey, label: item.label, items: [item] });
    }
    return [...grouped.values()].sort((a, b) => new Date(b.items[0].occurredAt).getTime() - new Date(a.items[0].occurredAt).getTime());
  }, [filter, items, search]);
  const shown = groups.slice(0, visible);
  const changeFilter = (key: TimelineFilter) => { setFilter(key); setVisible(20); setExpanded(new Set()); };
  const changeSearch = (value: string) => { setSearch(value); setVisible(20); setExpanded(new Set()); };

  return <section className="rounded-2xl border bg-white shadow-sm"><div className="border-b p-5"><h2 className="text-xl font-black">{t.timeline}</h2><div className="mt-4 flex gap-2 overflow-x-auto pb-2">{filterKeys.map((key, index) => <button key={key} onClick={() => changeFilter(key)} className={`min-h-10 shrink-0 rounded-full px-4 text-sm font-bold ${filter === key ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-700"}`}>{t.timelineFilters[index]}</button>)}</div><label className="mt-3 block"><span className="sr-only">{t.search}</span><input type="search" value={search} onChange={(event) => changeSearch(event.target.value)} placeholder={t.search} className="min-h-12 w-full rounded-xl border px-4 text-sm" /></label><p className="mt-3 text-xs text-slate-500">{t.showing} {Math.min(visible, groups.length)} {t.of} {groups.length}</p></div><div className="p-4 lg:max-h-[620px] lg:overflow-y-auto">{shown.map((group, index) => { const showDate = index === 0 || group.dateKey !== shown[index - 1].dateKey; const isExpanded = expanded.has(group.key); return <div key={group.key}>{showDate && <h3 className="sticky top-0 z-10 mb-2 mt-4 bg-white/95 py-2 text-sm font-black text-slate-700 backdrop-blur first:mt-0">{formatDate(group.items[0].occurredAt, language)}</h3>}<article className="mb-2 rounded-xl border border-slate-200"><button onClick={() => group.items.length > 1 ? setExpanded((current) => toggleSet(current, group.key)) : openWorkflow(group.items[0], workflows, onWorkflow)} className="flex min-h-16 w-full items-center justify-between gap-3 p-4 text-left"><div><p className="font-bold capitalize">{group.label.replaceAll("_", " ")}{group.items.length > 1 ? ` — ${group.items.length} ${t.activities}` : ""}</p><p className="mt-1 text-xs text-slate-500">{group.items[0].eventTitle} · {group.items[0].kind} · {new Date(group.items[0].occurredAt).toLocaleTimeString()}</p></div><div className="flex shrink-0 items-center gap-2"><Badge value={group.items.some((item) => item.status === "failed") ? "failed" : group.items[0].status} />{group.items.length > 1 && <span aria-label={isExpanded ? t.collapse : t.expand} className="text-lg">{isExpanded ? "−" : "+"}</span>}</div></button>{isExpanded && <div className="border-t bg-slate-50 p-2">{group.items.map((item) => <TimelineRecord key={item.id} item={item} workflows={workflows} onWorkflow={onWorkflow} />)}</div>}</article></div>; })}{!groups.length && <Empty text={t.noData} />}{visible < groups.length && <button onClick={() => setVisible((count) => count + 20)} className="mt-4 min-h-12 w-full rounded-xl border border-slate-300 bg-white font-bold hover:bg-slate-50">{t.loadMore}</button>}</div></section>;
}

function TimelineRecord({ item, workflows, onWorkflow }: { item: TimelineItem; workflows: WorkflowRow[]; onWorkflow: (item: WorkflowRow) => void }) {
  const workflow = item.kind === "workflow" ? workflows.find((row) => `w-${row.id}` === item.id) : undefined;
  return <button disabled={!workflow} onClick={() => workflow && onWorkflow(workflow)} className="grid min-h-14 w-full gap-2 rounded-lg p-3 text-left hover:bg-white disabled:cursor-default sm:grid-cols-[1fr_auto]"><div><p className="text-sm font-semibold capitalize">{item.label.replaceAll("_", " ")}</p><p className="mt-1 text-xs text-slate-500">{item.eventTitle} · {item.kind}{item.detail ? ` · ${item.detail}` : ""}</p></div><div className="text-xs text-slate-500 sm:text-right"><Badge value={item.status} /><p className="mt-1">{new Date(item.occurredAt).toLocaleString()}</p></div></button>;
}

function matchesFilter(item: TimelineItem, filter: TimelineFilter) { const text = `${item.kind} ${item.label}`.toLocaleLowerCase(); if (filter === "all") return true; if (filter === "failed") return item.status === "failed"; if (filter === "pledges") return text.includes("pledge"); if (filter === "reminders") return item.kind === "delivery" || text.includes("reminder"); if (filter === "invitations") return item.kind === "invitation" || item.kind === "rsvp"; if (filter === "payments") return text.includes("payment"); return item.kind === "checkin"; }
function localDateKey(value: string) { const date = new Date(value); return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`; }
function formatDate(value: string, language: "en" | "sw") { return new Intl.DateTimeFormat(language === "sw" ? "sw-KE" : "en-KE", { weekday: "long", year: "numeric", month: "long", day: "numeric" }).format(new Date(value)); }
function toggleSet(current: Set<string>, key: string) { const next = new Set(current); if (next.has(key)) next.delete(key); else next.add(key); return next; }
function openWorkflow(item: TimelineItem, workflows: WorkflowRow[], onWorkflow: (item: WorkflowRow) => void) { if (item.kind !== "workflow") return; const workflow = workflows.find((row) => `w-${row.id}` === item.id); if (workflow) onWorkflow(workflow); }
function WorkflowDialog({ item, t, retrying, onClose, onRetry }: { item: WorkflowRow; t: typeof copy.en | typeof copy.sw; retrying: boolean; onClose: () => void; onRetry: () => void }) { return <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/60 p-4" role="dialog" aria-modal="true" aria-labelledby="workflow-title"><div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"><div className="flex justify-between gap-3"><div><p className="text-xs font-black uppercase text-emerald-700">{t.details}</p><h2 id="workflow-title" className="mt-1 text-xl font-black">{item.event_type}</h2></div><button onClick={onClose} aria-label={t.close} className="size-11 rounded-xl border text-xl">×</button></div><dl className="mt-5 grid gap-4 sm:grid-cols-2"><Detail label="Event" value={relation(item.events)?.title ?? "Event"} /><Detail label="Status" value={item.status} /><Detail label={t.source} value={item.source} /><Detail label={t.entity} value={`${item.entity_type}${item.entity_id ? ` · ${item.entity_id}` : ""}`} /><Detail label={t.attempts} value={`${item.attempt_count}/5`} /><Detail label={t.available} value={new Date(item.available_at).toLocaleString()} /></dl>{item.last_error && <div className="mt-5 rounded-xl bg-red-50 p-4"><p className="text-xs font-bold uppercase text-red-700">{t.lastError}</p><p className="mt-2 break-words text-sm text-red-900">{item.last_error}</p></div>}{item.status === "failed" && item.attempt_count < 5 && <button disabled={retrying} onClick={onRetry} className="mt-5 min-h-12 w-full rounded-xl bg-red-700 font-bold text-white">{retrying ? t.retrying : t.retryNow}</button>}</div></div>; }
function Stat({ label, value }: { label: string; value: string | number }) { return <article className="rounded-2xl border bg-white p-4 shadow-sm"><p className="text-xs font-bold text-slate-500">{label}</p><p className="mt-2 text-2xl font-black tabular-nums">{value}</p></article>; }
function Badge({ value }: { value: string }) { return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold capitalize ${badge(value)}`}>{value.replaceAll("_", " ")}</span>; }
function Empty({ text }: { text: string }) { return <p className="p-8 text-center text-sm text-slate-500">{text}</p>; }
function Detail({ label, value }: { label: string; value: string }) { return <div><dt className="text-xs font-bold uppercase text-slate-400">{label}</dt><dd className="mt-1 break-words font-semibold capitalize">{value}</dd></div>; }
