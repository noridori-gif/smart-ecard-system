"use client";
import { useEffect, useState } from "react";
import { useAppLanguage } from "@/lib/i18n/useAppLanguage";
import { getContributorGuestSettings, saveContributorGuestSettings, type ContributorGuestSettings } from "@/services/contributorGuestService";

export default function ContributorGuestEligibilitySettings({ eventId, onSaved }: { eventId: number; onSaved: () => Promise<void> }) {
  const { t } = useAppLanguage();
  const [settings, setSettings] = useState<ContributorGuestSettings | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  useEffect(() => { let active = true; void getContributorGuestSettings(eventId).then((value) => { if (active) setSettings(value); }).catch((cause) => { if (active) setError(cause instanceof Error ? cause.message : t("settings.syncError")); }); return () => { active = false; }; }, [eventId, t]);
  async function save() {
    if (!settings) return;
    const single = Number(settings.single_card_minimum); const double = Number(settings.double_card_minimum);
    if (!Number.isFinite(single) || single < 0 || !Number.isFinite(double) || double <= single) { setError(t("settings.validation")); return; }
    try { setBusy(true); setError(""); setNotice(""); setSettings(await saveContributorGuestSettings(settings)); setNotice(t("settings.saved")); await onSaved(); }
    catch (cause) { console.error("Contributor guest synchronization settings error:", cause); setError(t("settings.syncError")); }
    finally { setBusy(false); }
  }
  return <section className="rounded-2xl border border-[#e7e1d7] bg-white p-5 shadow-sm">
    <h2 className="text-xl font-bold">{t("settings.title")}</h2><p className="mt-1 text-sm text-slate-600">{t("settings.description")}</p>
    {error && <p role="alert" className="mt-4 rounded-xl bg-red-50 p-3 text-sm text-red-700">{error}</p>}{notice && <p role="status" className="mt-4 rounded-xl bg-emerald-50 p-3 text-sm text-emerald-700">{notice}</p>}
    {!settings ? <p className="mt-5 text-sm text-slate-500">{t("settings.loading")}</p> : <>
      <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        <Toggle label={t("settings.enableSync")} checked={settings.contributor_guest_sync_enabled} onChange={(value) => setSettings({...settings, contributor_guest_sync_enabled: value})} />
        <Select label={t("settings.classificationBasis")} value={settings.classification_basis} onChange={(value) => setSettings({...settings, classification_basis: value as ContributorGuestSettings["classification_basis"]})} options={[["paid_amount",t("settings.validPaid")],["pledged_amount",t("settings.pledged")]]} />
        <Select label={t("settings.belowMinimum")} value={settings.below_minimum_behavior} onChange={(value) => setSettings({...settings, below_minimum_behavior: value as ContributorGuestSettings["below_minimum_behavior"]})} options={[["no_guest",t("settings.noGuest")],["pending_guest",t("settings.pendingGuest")]]} />
        <Money label={t("settings.singleMinimum")} value={settings.single_card_minimum} onChange={(value) => setSettings({...settings, single_card_minimum: value})} />
        <Money label={t("settings.doubleMinimum")} value={settings.double_card_minimum} onChange={(value) => setSettings({...settings, double_card_minimum: value})} />
        <div className="space-y-2"><Toggle label={t("settings.autoUpgrade")} checked={settings.auto_upgrade_guest_card} onChange={(value) => setSettings({...settings, auto_upgrade_guest_card: value})} /><Toggle label={t("settings.autoDowngrade")} checked={settings.auto_downgrade_guest_card} onChange={(value) => setSettings({...settings, auto_downgrade_guest_card: value})} /></div>
      </div>
      <p className="mt-4 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">{t("settings.protectionNote")}</p>
      <button type="button" disabled={busy} onClick={() => void save()} className="mt-5 min-h-11 rounded-xl bg-emerald-700 px-5 font-bold text-white disabled:opacity-50">{busy ? t("common.saving") : t("settings.save")}</button>
    </>}
  </section>;
}
function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (value: boolean) => void }) { return <label className="flex min-h-11 items-center gap-3 text-sm font-semibold"><input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />{label}</label>; }
function Select({ label, value, options, onChange }: { label: string; value: string; options: string[][]; onChange: (value: string) => void }) { return <label className="text-sm font-semibold">{label}<select value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-12 w-full rounded-xl border border-[#e7e1d7] px-3 font-normal">{options.map(([key,text]) => <option key={key} value={key}>{text}</option>)}</select></label>; }
function Money({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) { return <label className="text-sm font-semibold">{label}<input type="number" min="0" step="0.01" value={value} onChange={(event) => onChange(event.target.value)} className="mt-1 min-h-12 w-full rounded-xl border border-[#e7e1d7] px-3 font-normal" /></label>; }
